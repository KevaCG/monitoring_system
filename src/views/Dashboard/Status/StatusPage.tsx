import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { CheckCircle, AlertTriangle, Loader, RefreshCw, Activity, X, FileText, Download, Clock } from 'lucide-react';
import styles from './StatusPage.module.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Interfaces ---
import type { StatusRun, StatusItem } from '../../../models/monitor.model';

// --- TIPO LOCAL EXTENDIDO (Para corregir el error TS2367) ---
// Esto permite que el estado acepte "EN PROGRESO" sin cambiar tu archivo monitor.model.ts
type UIStatus = 'OPERACIONAL' | 'ERROR' | 'CARGANDO' | 'EN PROGRESO';

interface UIStatusItem extends Omit<StatusItem, 'status'> {
    status: UIStatus;
}

// --- Configuración Inicial ---
const INITIAL_STATUS_CHECKS: UIStatusItem[] = [
    // 1. Atomic
    { label: "Ingreso clientes Atomic", dependencies: ["Consulta Prueba"], status: 'CARGANDO', lastRun: null },
    { label: "Listar busquedas", dependencies: ["Consulta Prueba"], status: 'CARGANDO', lastRun: null },
    { label: "Busqueda y apertura de documentos", dependencies: ["Consulta Prueba"], status: 'CARGANDO', lastRun: null },

    // 2. Parly
    { label: "Carga y apertura de Parly", dependencies: ["Solicitud Crédito"], status: 'CARGANDO', lastRun: null },
    { label: "Inicio conversaciones Parly", dependencies: ["Solicitud Crédito"], status: 'CARGANDO', lastRun: null },

    // 3. Clave Registro
    { label: "VPN Comultrasan", dependencies: ["Clave Registro"], status: 'CARGANDO', lastRun: null },
    { label: "Clave registro", dependencies: ["Clave Registro"], status: 'CARGANDO', lastRun: null },

    // 4. Backups
    { label: "Ejecución General de Respaldos", dependencies: ["BACKUP_SYSTEM"], status: 'CARGANDO', lastRun: null },
];

const StatusPage: React.FC = () => {
    // Usamos el tipo extendido UIStatusItem aquí
    const [statusChecks, setStatusChecks] = useState<UIStatusItem[]>(INITIAL_STATUS_CHECKS);
    const [loading, setLoading] = useState(false);
    const [selectedError, setSelectedError] = useState<StatusRun | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // --- Helper para mapear categorías ---
    const getCategory = (checkLabel: string) => {
        if (checkLabel.includes("Atomic") || checkLabel.includes("busquedas") || checkLabel.includes("documentos")) return "1. Atomic";
        if (checkLabel.includes("Parly") || checkLabel.includes("VPN") || checkLabel.includes("Clave")) return "2. Parly / Otros";
        if (checkLabel.includes("Respaldos")) return "3. Centro de Backups";
        return "Otros";
    };

    const fetchLatestStatus = async () => {
        setLoading(true);

        // 1. Consultar Monitoreos
        const { data: monitorData } = await supabase
            .from('monitoreos')
            .select('id, sistema, estado, created_at, mensaje, estado_correccion')
            .order('created_at', { ascending: false })
            .limit(50);

        // 2. Consultar Backups
        const { data: backupData } = await supabase
            .from('backup_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (monitorData) {
            const latestStatusMap = new Map<string, StatusRun>();
            const requiredSystems = ["Consulta Prueba", "Solicitud Crédito", "Clave Registro"];

            monitorData.forEach((d: any) => {
                if (requiredSystems.includes(d.sistema) && !latestStatusMap.has(d.sistema)) {
                    latestStatusMap.set(d.sistema, d);
                }
            });

            // --- LÓGICA DE BACKUPS ---
            let backupStatus: UIStatus = 'OPERACIONAL';
            let backupLastRun: any = null;

            if (backupData && backupData.length > 0) {
                backupLastRun = {
                    id: backupData[0].id,
                    sistema: "Centro de Backups",
                    created_at: backupData[0].created_at,
                    estado: backupData[0].status,
                    mensaje: `Último backup registrado: ${backupData[0].db_name} (${backupData[0].status})`
                };

                const hasFailures = backupData.some(b => b.status.includes('FAIL'));
                const hasRunning = backupData.some(b => b.status.includes('RUNNING'));

                if (hasFailures) {
                    backupStatus = 'ERROR';
                    const failedBackup = backupData.find(b => b.status.includes('FAIL'));
                    if (failedBackup) {
                        backupLastRun.mensaje = `FALLO EN BACKUP: ${failedBackup.db_name} en ${failedBackup.server_name}.`;
                        backupLastRun.estado = 'ERROR';
                    }
                } else if (hasRunning) {
                    backupStatus = 'EN PROGRESO';
                    backupLastRun.mensaje = "Respaldos en ejecución actualmente.";
                }
            }

            // --- UNIFICAR ESTADOS ---
            const updatedChecks = INITIAL_STATUS_CHECKS.map(check => {

                // Caso Especial: BACKUPS
                if (check.dependencies.includes("BACKUP_SYSTEM")) {
                    return {
                        ...check,
                        status: backupStatus,
                        lastRun: backupLastRun
                    };
                }

                // Caso Normal: Monitoreos
                let finalStatus: UIStatus = 'OPERACIONAL';
                let foundRun = false;
                let latestRunForCheck: StatusRun | null = null;

                check.dependencies.forEach(dep => {
                    const latestRun = latestStatusMap.get(dep);
                    if (latestRun) {
                        foundRun = true;
                        latestRunForCheck = latestRun;

                        if (latestRun.estado === 'ERROR' && latestRun.estado_correccion !== 'CORREGIDO') {
                            finalStatus = 'ERROR';
                        }
                    }
                });

                if (!foundRun) finalStatus = 'ERROR';

                return { ...check, status: finalStatus, lastRun: latestRunForCheck };
            });

            setStatusChecks(updatedChecks);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLatestStatus();

        const channelMonitor = supabase.channel('status-monitor')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'monitoreos' }, () => fetchLatestStatus())
            .subscribe();

        const channelBackup = supabase.channel('status-backup')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'backup_history' }, () => fetchLatestStatus())
            .subscribe();

        return () => {
            supabase.removeChannel(channelMonitor);
            supabase.removeChannel(channelBackup);
        };
    }, []);

    // --- EXPORTACIÓN ---
    const exportToCSV = () => {
        setIsExporting(true);
        const todayStr = new Date().toLocaleDateString('es-CO');

        const rows = statusChecks.map(item => {
            const lastRunDate = item.lastRun ? new Date(item.lastRun.created_at) : null;

            // --- CORRECCIÓN DEL ERROR ---
            // Como ahora 'item' es de tipo 'UIStatusItem', Typescript ya sabe que 
            // 'status' puede ser 'EN PROGRESO', así que esta comparación ya es válida.
            let estadoTexto = item.status as string;
            if (item.status === 'EN PROGRESO') estadoTexto = 'BACKUP EN PROGRESO';

            return [
                todayStr,
                getCategory(item.label),
                item.label,
                estadoTexto,
                item.dependencies.join(', ').replace('BACKUP_SYSTEM', 'Sistema de Archivos'),
                lastRunDate ? lastRunDate.toLocaleTimeString('es-CO') : 'N/A',
                item.status === 'ERROR' && item.lastRun?.mensaje
                    ? `"${item.lastRun.mensaje.replace(/"/g, '""').substring(0, 100)}..."`
                    : 'Sin errores'
            ];
        });

        const header = ["Fecha Reporte", "Categoría", "Verificación Operativa", "Estado Actual", "Dependencia Técnica", "Hora Última Ejecución", "Detalle del Error"];
        const csvContent = "\uFEFF" + header.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");

        const link = document.createElement("a");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Reporte_Estado_Operacional_${todayStr.replace(/\//g, '-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExporting(false);
    };

    const exportToPDF = () => {
        setIsExporting(true);
        const doc = new jsPDF();
        const todayStr = new Date().toLocaleDateString('es-CO');

        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text(`Reporte de Estatus Operacional`, 14, 13);

        const tableBody = statusChecks.map(item => [
            getCategory(item.label),
            item.label,
            item.status === 'EN PROGRESO' ? 'EN EJECUCIÓN' : item.status,
            item.lastRun ? new Date(item.lastRun.created_at).toLocaleTimeString('es-CO') : '-',
            item.status === 'ERROR' ? 'Ver detalle' : 'OK'
        ]);

        autoTable(doc, {
            startY: 30,
            head: [['Categoría', 'Verificación', 'Estado', 'Hora', 'Obs']],
            body: tableBody,
            headStyles: { fillColor: [79, 70, 229] },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            styles: { fontSize: 8 },
        });

        doc.save(`Reporte_Estado_${todayStr.replace(/\//g, '-')}.pdf`);
        setIsExporting(false);
    };

    const getSectionStatus = (items: UIStatusItem[]) => {
        if (items.some(i => i.status === 'ERROR')) return 'ERROR';
        if (items.some(i => i.status === 'EN PROGRESO')) return 'EN PROGRESO';
        return 'OPERACIONAL';
    };

    const getOverallStatus = () => {
        if (statusChecks.some(i => i.status === 'ERROR')) return 'ERROR';
        if (statusChecks.some(i => i.status === 'EN PROGRESO')) return 'EN PROGRESO';
        return 'OPERACIONAL';
    };

    const getStatusIcon = (status: string) => {
        if (status === 'OPERACIONAL') return <CheckCircle size={18} color="#22c55e" />;
        if (status === 'ERROR') return <AlertTriangle size={18} color="#ef4444" />;
        if (status === 'EN PROGRESO') return <Clock size={18} color="#f59e0b" className={styles.pulse} />;
        return <Loader size={18} className={styles.spin} color="#64748b" />;
    };

    const sections = {
        '1. Atomic': statusChecks.filter(i => getCategory(i.label) === "1. Atomic"),
        '2. Parly / Otros': statusChecks.filter(i => getCategory(i.label) === "2. Parly / Otros"),
        '3. Centro de Backups': statusChecks.filter(i => getCategory(i.label) === "3. Centro de Backups"),
    };

    return (
        <div className={styles.statusContainer}>
            <div className={styles.header}>
                <div className={styles.headerTitleWrapper}>
                    <Activity size={28} color="#1e293b" />
                    <h1 className={styles.mainTitle}>Estatus Operacional</h1>
                    <div className={styles.statusIndicator} data-overall={getOverallStatus()} />
                </div>

                <div className={styles.actionsWrapper}>
                    <button className={`${styles.actionBtn} ${styles.btnExcel}`} onClick={exportToCSV} disabled={isExporting}>
                        <FileText size={16} /> Excel
                    </button>
                    <button className={`${styles.actionBtn} ${styles.btnPdf}`} onClick={exportToPDF} disabled={isExporting}>
                        <Download size={16} /> PDF
                    </button>
                    <button onClick={fetchLatestStatus} className={styles.refreshBtn} disabled={loading}>
                        <RefreshCw size={16} className={loading ? styles.spin : ''} />
                        Actualizar
                    </button>
                </div>
            </div>

            <div className={styles.statusGrid}>
                {Object.entries(sections).map(([title, items]) => {
                    const isBackupSection = title.includes("Backups");
                    return (
                        <div
                            key={title}
                            className={`${styles.sectionCard} ${isBackupSection ? styles.fullWidthCard : ''}`}
                        >
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>{title}</h2>
                                <span className={styles.overallBadge} data-status={getSectionStatus(items)}>
                                    {getSectionStatus(items)}
                                </span>
                            </div>
                            <ul className={styles.checkList}>
                                {items.map((item, index) => (
                                    <li
                                        key={index}
                                        className={styles.checkItem}
                                        data-status={item.status}
                                        onClick={item.status === 'ERROR' ? () => setSelectedError(item.lastRun) : undefined}
                                        style={{ cursor: item.status === 'ERROR' ? 'pointer' : 'default' }}
                                    >
                                        <div className={styles.checkContent}>
                                            {getStatusIcon(item.status)}
                                            <span>{item.label}</span>
                                        </div>
                                        <span className={styles.checkStatus} data-status={item.status}>
                                            {item.status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>

            <p className={styles.footer}>El reporte incluye todas las ejecuciones del día actual.</p>

            {selectedError && (
                <div className={styles.errorModalOverlay} onClick={() => setSelectedError(null)}>
                    <div className={styles.errorModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.errorTitle}>
                                <AlertTriangle size={24} /> Detalle de Evento
                            </h3>
                            <button className={styles.modalCloseBtn} onClick={() => setSelectedError(null)}><X size={24} /></button>
                        </div>

                        <div className={styles.errorDetailBox}>
                            <p className={styles.errorTitle} style={{ fontSize: '1rem' }}>Mensaje del Sistema:</p>
                            <pre className={styles.errorLog}>
                                {selectedError.mensaje || "No hay información detallada disponible."}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusPage;