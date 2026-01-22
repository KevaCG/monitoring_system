import { supabase } from '../lib/supabase';
import type { GlobalStats } from '../models/dashboard.types';

export const fetchGlobalStats = async (): Promise<GlobalStats | null> => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();
        const yesterdayISO = new Date(Date.now() - 86400000).toISOString();

        // 1. OBTENER EL ÚLTIMO BATCH ID (Para saber el estado ACTUAL real de K8s)
        const { data: latestBatch } = await supabase
            .from('k8s_pods')
            .select('last_batch_id, created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const currentBatchId = latestBatch?.last_batch_id;

        const [testsRes, serversRes, backupsRes, disksRes, k8sCurrentRes, k8sHistoryRes, recentErrorsRes, recentBackupsNonSuccessRes] = await Promise.all([
            // A. Tests
            supabase.from('monitoreos').select('estado, created_at').gte('created_at', todayISO),
            // B. Zabbix
            supabase.from('zabbix_metrics').select('*').order('created_at', { ascending: false }).limit(1000),
            // C. Backups (Historial 24h para KPI)
            supabase.from('backup_history').select('status, size_bytes').gte('created_at', yesterdayISO),
            // D. Discos
            supabase.from('server_disks').select('server_ip, mount_point, use_percent, created_at').order('created_at', { ascending: false }).limit(1000),

            // E. KUBERNETES ACTUAL (Usamos el ID del lote más reciente)
            currentBatchId
                ? supabase.from('k8s_pods').select('*').eq('last_batch_id', currentBatchId)
                : Promise.resolve({ data: [] }),

            // F. KUBERNETES HISTORIA (Para la gráfica de hoy)
            supabase.from('k8s_pods').select('created_at, pod_name').gte('created_at', todayISO),

            // G. ALERTAS (Monitoreos Fallidos Recientes)
            supabase.from('monitoreos').select('id, sistema, mensaje, created_at').eq('estado', 'ERROR').neq('estado_correccion', 'CORREGIDO').order('created_at', { ascending: false }).limit(5),

            // H. ALERTAS (Backups NO Exitosos Recientes - Incluye RUNNING y FAILED)
            supabase.from('backup_history').select('id, db_name, status, created_at').neq('status', 'SUCCESS').order('created_at', { ascending: false }).limit(5)
        ]);

        // --- PROCESAMIENTO ---

        // 1. Chart Data (Tests + CPU + Pods)
        const chartDataMap: { [hour: string]: { tests: number; cpuSum: number; cpuCount: number; podsCount: Set<string> } } = {};

        for (let i = 0; i < 24; i++) {
            const h = i.toString().padStart(2, '0') + ':00';
            chartDataMap[h] = { tests: 0, cpuSum: 0, cpuCount: 0, podsCount: new Set() };
        }

        testsRes.data?.forEach(t => {
            const h = new Date(t.created_at).getHours().toString().padStart(2, '0') + ':00';
            if (chartDataMap[h]) chartDataMap[h].tests++;
        });

        serversRes.data?.forEach(s => {
            const date = new Date(s.created_at);
            if (date >= todayStart) {
                const h = date.getHours().toString().padStart(2, '0') + ':00';
                if (chartDataMap[h]) {
                    const cpu = typeof s.cpu_usage === 'string' ? parseFloat(s.cpu_usage.replace('%', '')) : s.cpu_usage;
                    if (!isNaN(cpu)) { chartDataMap[h].cpuSum += cpu; chartDataMap[h].cpuCount++; }
                }
            }
        });

        k8sHistoryRes.data?.forEach(k => {
            const h = new Date(k.created_at).getHours().toString().padStart(2, '0') + ':00';
            if (chartDataMap[h]) chartDataMap[h].podsCount.add(k.pod_name);
        });

        const chartHistory = Object.keys(chartDataMap).sort().map(h => ({
            time: h,
            tests: chartDataMap[h].tests,
            cpu: chartDataMap[h].cpuCount > 0 ? parseFloat((chartDataMap[h].cpuSum / chartDataMap[h].cpuCount).toFixed(1)) : 0,
            pods: chartDataMap[h].podsCount.size
        }));

        // 2. Servers & Disks
        const uniqueServers = new Map();
        serversRes.data?.forEach((r: any) => { if (!uniqueServers.has(r.tech_name)) uniqueServers.set(r.tech_name, r); });
        const servers = Array.from(uniqueServers.values());

        const criticalServers = servers.filter(s => {
            const cpu = parseFloat(s.cpu_usage || '0');
            const totalRam = parseFloat(s.ram_total || '0');
            const availRam = parseFloat(s.ram_available || '0');
            let ramPercent = 0;
            if (totalRam > 0) ramPercent = ((totalRam - availRam) / totalRam) * 100;
            return cpu > 90 || ramPercent > 90;
        });

        const topServer = servers.sort((a, b) => parseFloat(b.cpu_usage) - parseFloat(a.cpu_usage))[0];

        // 3. KUBERNETES (Data del Batch Actual)
        const k8sData = (k8sCurrentRes as any).data || [];
        const runningPods = k8sData.filter((p: any) => ['Running', 'Succeeded'].includes(p.status)).length;
        const failedPods = k8sData.length - runningPods;
        const totalRestarts = k8sData.reduce((acc: number, curr: any) => acc + (curr.restarts || 0), 0);

        // 4. Backups & Disks
        const totalBackups = backupsRes.data?.length || 0;
        const failedBackups = backupsRes.data?.filter(b => b.status !== 'SUCCESS' && b.status !== 'RUNNING').length || 0;
        const totalSizeGB = ((backupsRes.data?.reduce((a, c) => a + (c.size_bytes || 0), 0) || 0) / (1024 ** 3)).toFixed(1);
        const uniqueDisks = new Map();
        const importantPaths = ['backup', 'opt', 'db2logs', 'disco'];
        disksRes.data?.forEach((d: any) => {
            const key = `${d.server_ip}-${d.mount_point}`;
            if (!uniqueDisks.has(key) && importantPaths.some(p => d.mount_point?.toLowerCase().includes(p))) uniqueDisks.set(key, d);
        });
        const monitoredDisks = Array.from(uniqueDisks.values());
        const criticalDisks = monitoredDisks.filter((d: any) => parseFloat(d.use_percent?.toString().replace('%', '') || '0') > 90).length;

        // 5. ALERTAS (Aquí corregimos para que aparezcan TODAS)
        const alerts: GlobalStats['alerts'] = [];

        // Alertas de Tests Fallidos
        recentErrorsRes.data?.forEach((t: any) => alerts.push({ id: `t-${t.id}`, type: 'test', severity: 'critical', timestamp: t.created_at, message: `${t.sistema}: ${t.mensaje}` }));

        // Alertas de Backups (Running o Failed)
        recentBackupsNonSuccessRes.data?.forEach((b: any) => {
            alerts.push({
                id: `b-${b.id}`,
                type: 'backup',
                severity: b.status === 'RUNNING' ? 'warning' : 'critical', // Amarillo si corre, Rojo si falló
                timestamp: b.created_at,
                message: `${b.status === 'RUNNING' ? 'En curso' : 'Fallido'}: ${b.db_name}`
            });
        });

        // Alertas de Servidores (Sobrecarga)
        criticalServers.forEach(s => {
            const cpu = parseFloat(s.cpu_usage || '0');
            const totalRam = parseFloat(s.ram_total || '0');
            const availRam = parseFloat(s.ram_available || '0');
            let ramPercent = 0;
            if (totalRam > 0) ramPercent = ((totalRam - availRam) / totalRam) * 100;
            alerts.push({ id: `s-${s.id}`, type: 'server', severity: 'critical', timestamp: s.created_at, message: `Sobrecarga en ${s.host_name} (CPU: ${cpu.toFixed(1)}% | RAM: ${ramPercent.toFixed(1)}%)` });
        });

        // Alertas de Discos
        monitoredDisks.forEach((d: any) => {
            const p = parseFloat(d.use_percent?.toString().replace('%', '') || '0');
            if (p > 90) alerts.push({ id: `d-${d.id}`, type: 'disk', severity: 'critical', timestamp: d.created_at, message: `Disco lleno ${p}% en ${d.server_ip} (${d.mount_point})` });
        });

        // Alertas K8s (Pods Caídos o Inestables del Lote Actual)
        k8sData.forEach((p: any) => {
            if (!['Running', 'Succeeded'].includes(p.status)) {
                alerts.push({ id: `k-${p.id}`, type: 'k8s', severity: 'critical', timestamp: p.updated_at, message: `Pod Caído: ${p.pod_name} (${p.status})` });
            } else if (p.restarts > 5) {
                // Validación de 24h para reinicios
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const lastRestart = p.last_restart_at ? new Date(p.last_restart_at) : null;
                // Si hay fecha de reinicio reciente, mostramos alerta. Si NO hay fecha (es null) pero tiene muchos reinicios, asumimos alerta también por seguridad.
                if (!lastRestart || lastRestart > oneDayAgo) {
                    alerts.push({ id: `kr-${p.id}`, type: 'k8s', severity: 'warning', timestamp: p.updated_at, message: `Inestabilidad: ${p.pod_name} (${p.restarts} reinicios)` });
                }
            }
        });

        const sortedAlerts = alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return {
            tests: { totalToday: testsRes.data?.length || 0, failedToday: testsRes.data?.filter(t => t.estado === 'ERROR').length || 0, successRate: 0 },
            servers: { total: servers.length, critical: criticalServers.length, topConsumerName: topServer?.host_name || 'N/A', topConsumerValue: topServer ? parseFloat(topServer.cpu_usage) : 0 },
            backups: { total24h: totalBackups, failed24h: failedBackups, totalSizeGB },
            disks: { total: monitoredDisks.length, critical: criticalDisks },
            kubernetes: { total: k8sData.length, running: runningPods, failed: failedPods, restarts: totalRestarts },
            alerts: sortedAlerts,
            chartHistory
        };
    } catch (error) { console.error(error); return null; }
};