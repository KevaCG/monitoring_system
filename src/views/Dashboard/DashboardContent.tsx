import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// --- VISTAS ---
import StatusPage from './Status/StatusPage';
import ServerDiskView from './Disks/ServerDiskView';
import DashboardUI from './Overview/DashboardOverview'; // Vista Detallada (Tabla, Gráficas específicas)
import { GlobalOverview } from './Overview/GlobalOverview'; // Torre de Control
import { ServerMonitor } from './ServerMonitor/ServerMonitor'; // Zabbix
import { KubernetesMonitor } from './KubernetesMonitor/KubernetesMonitor'; // <--- NUEVO KUBERNETES

// --- MODALES Y TIPOS ---
import CorrectionModal from './Overview/CorrectionModal';
import type { FilterContextType } from '../../models/monitor.model';

interface MainContentProps {
    filterContext: FilterContextType;
    // Prop para permitir navegación desde el GlobalOverview
    onFilterChange: (newFilter: FilterContextType) => void;
}

const MainContent: React.FC<MainContentProps> = ({ filterContext, onFilterChange }) => {

    // --------------------------------------------------------
    // 1. ROUTER DE VISTAS PRINCIPALES
    // --------------------------------------------------------

    // A) Vista de Discos Específicos
    if (filterContext.type === 'server') {
        return <ServerDiskView serverIp={filterContext.value} />;
    }

    // B) Estatus Operacional
    if (filterContext.type === 'status') {
        return <StatusPage />;
    }

    // C) Monitoreo Zabbix (CPU/RAM)
    if (filterContext.type === 'server_monitor' || filterContext.value === 'ServerMonitor') {
        return <ServerMonitor />;
    }

    // D) Monitoreo Kubernetes (NUEVO)
    if (filterContext.type === 'k8s_monitor' || filterContext.value === 'KubernetesMonitor') {
        return <KubernetesMonitor />;
    }

    // E) TORRE DE CONTROL (Global Dashboard)
    // Si estamos en la raíz "Dashboard", mostramos el resumen ejecutivo
    if (filterContext.type === 'global' && filterContext.value === 'Dashboard') {
        return (
            <GlobalOverview
                onNavigate={(view) => {
                    // Lógica de navegación desde las tarjetas del resumen
                    if (view === 'ServerMonitor') onFilterChange({ type: 'server_monitor', value: 'ServerMonitor' });
                    else if (view === 'KubernetesMonitor') onFilterChange({ type: 'k8s_monitor', value: 'KubernetesMonitor' });
                    else if (view === 'Backup') onFilterChange({ type: 'project', value: 'Backup' });
                    else if (view === 'Discos') onFilterChange({ type: 'server', value: '10.94.96.106' }); // O abrir menú discos
                    else if (view === 'Dashboard') onFilterChange({ type: 'global', value: 'TestsList' }); // Ver lista detallada
                }}
            />
        );
    }

    // --------------------------------------------------------
    // 2. LÓGICA DE VISTA DETALLADA (DashboardUI - Cypress/Backups/Logs)
    // --------------------------------------------------------

    const [data, setData] = useState<any[]>([]);
    const [, setRawDataGlobal] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, ok: 0, error: 0, avgTimeLast4: '0s' });
    const [chartData, setChartData] = useState<any[]>([]);
    const [barData, setBarData] = useState<any[]>([]);
    const [pieData, setPieData] = useState<any[]>([]);

    const [selectedRun, setSelectedRun] = useState<any>(null);
    const [selectedErrorToEdit, setSelectedErrorToEdit] = useState<any>(null);
    const [correctionComment, setCorrectionComment] = useState('');
    const [isSavingCorrection, setIsSavingCorrection] = useState(false);

    // Procesamiento de estadísticas
    const processStats = (allData: any[]) => {
        let filtered = allData.map(d => {
            let displayStatus = d.estado;
            if (d.estado === 'ERROR' && d.estado_correccion === 'CORREGIDO') {
                displayStatus = 'OK';
            }
            return { ...d, displayStatus };
        });

        // Aplicar filtros según el contexto
        switch (filterContext.type) {
            case 'project': filtered = filtered.filter((d) => d.proyecto === filterContext.value); break;
            case 'client': filtered = filtered.filter((d) => d.cliente === filterContext.value); break;
            case 'canal': filtered = filtered.filter((d) => d.canal === filterContext.value); break;
            case 'flow': filtered = filtered.filter((d) => d.sistema === filterContext.value); break;
            case 'backup_detail':
                filtered = filtered.filter((d) => d.sistema === filterContext.value);
                break;
            default: break;
        }

        setData(filtered);

        const now = new Date();
        const todayString = now.toLocaleDateString('en-CA');
        const todayData = filtered.filter((d: any) => new Date(d.created_at).toLocaleDateString('en-CA') === todayString);

        const totalOk = todayData.filter((d: any) => d.displayStatus?.toUpperCase() === 'OK').length;
        const totalError = todayData.filter((d: any) => d.displayStatus?.toUpperCase() === 'ERROR').length;

        const last4 = filtered.slice(0, 4);
        let avgTimeFormatted = '0s';
        if (last4.length > 0) {
            const totalDuration = last4.reduce((acc: number, curr: any) => acc + (Number(curr.duracion_ms) || 0), 0);
            const avgMs = totalDuration / last4.length;
            avgTimeFormatted = (avgMs / 1000).toFixed(2) + 's';
        }
        setStats({ total: todayData.length, ok: totalOk, error: totalError, avgTimeLast4: avgTimeFormatted });

        const chartSource = [...filtered].reverse().slice(-20);
        const visualChartData = chartSource.map((d: any) => ({
            name: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            visualHeight: d.displayStatus === 'ERROR' ? 0 : Number((d.duracion_ms / 1000).toFixed(2)),
            realTime: Number((d.duracion_ms / 1000).toFixed(2)),
            status: d.displayStatus
        }));
        setChartData(visualChartData);

        const groupedBySystem: any = {};
        filtered.forEach((d: any) => {
            const systemName = d.sistema || 'Desconocido';
            if (!groupedBySystem[systemName]) groupedBySystem[systemName] = 0;
            groupedBySystem[systemName]++;
        });
        setBarData(Object.keys(groupedBySystem).map(sys => ({ name: sys, val: groupedBySystem[sys] })));

        const globalOk = filtered.filter((d: any) => d.displayStatus?.toUpperCase() === 'OK').length;
        const globalError = filtered.filter((d: any) => d.displayStatus?.toUpperCase() === 'ERROR').length;
        setPieData([{ name: 'Exitosos', value: globalOk }, { name: 'Fallidos', value: globalError }]);
    };

    const fetchData = async () => {
        // Determinamos qué tabla consultar
        let tableName = 'monitoreos'; // Por defecto Cypress

        if (filterContext.value === 'Backup' || filterContext.type === 'backup_detail') {
            tableName = 'backup_history';
        }

        const { data: result, error } = await supabase
            .from(tableName)
            .select(tableName === 'monitoreos' ? '*, estado_correccion, comentario_correccion' : '*')
            .order('created_at', { ascending: false });

        if (error || !result) return;

        // Normalización básica
        // Usamos (r: any) para evitar errores de TS al mezclar tipos de tablas
        const normalizedResult = result.map((r: any) => ({
            ...r,
            sistema: r.sistema || r.db_name,
            // Lógica unificada de estado
            estado: r.estado ? r.estado : (r.status === 'EXITOSO' ? 'OK' : 'ERROR'),
            duracion_ms: r.duracion_ms || 0
        }));

        setRawDataGlobal(normalizedResult);
        processStats(normalizedResult);
    };

    const handleCorrection = async () => {
        if (!selectedErrorToEdit || isSavingCorrection) return;
        setIsSavingCorrection(true);
        const { error } = await supabase
            .from('monitoreos')
            .update({
                estado_correccion: 'CORREGIDO',
                comentario_correccion: correctionComment,
            })
            .eq('id', selectedErrorToEdit.id);
        setIsSavingCorrection(false);
        if (error) {
            console.error("Error updating:", error);
            alert("Error al guardar.");
        } else {
            fetchData();
            setSelectedErrorToEdit(null);
            setCorrectionComment('');
        }
    };

    useEffect(() => {
        // Solo hacemos fetch si NO estamos en una vista especial
        const isSpecialView = ['server', 'status', 'server_monitor', 'k8s_monitor'].includes(filterContext.type) ||
            (filterContext.type === 'global' && filterContext.value === 'Dashboard');

        if (!isSpecialView) {
            fetchData();
        }

        const channel = supabase.channel('dashboard-main-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'monitoreos' }, () => fetchData())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [filterContext]);

    return (
        <>
            <DashboardUI
                filterContext={filterContext}
                data={data}
                stats={stats}
                chartData={chartData}
                barData={barData}
                pieData={pieData}
                setSelectedRun={setSelectedRun}
                setSelectedErrorToEdit={setSelectedErrorToEdit}
                selectedRun={selectedRun}
            />

            <CorrectionModal
                selectedErrorToEdit={selectedErrorToEdit}
                setSelectedErrorToEdit={setSelectedErrorToEdit}
                correctionComment={correctionComment}
                setCorrectionComment={setCorrectionComment}
                isSavingCorrection={isSavingCorrection}
                handleCorrection={handleCorrection}
            />
        </>
    );
};

export default MainContent;