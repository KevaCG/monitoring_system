import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { CheckCircle, AlertTriangle, Loader, RefreshCw, Activity, X, FileText, Download } from 'lucide-react';
import styles from './StatusPage.module.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Interfaces ---
interface StatusRun {
    id: string;
    sistema: string;
    estado: 'OK' | 'ERROR' | 'RUNNING' | string;
    created_at: string;
    mensaje: string;
    estado_correccion?: string;
    duracion_ms?: number;
}

interface StatusItem {
    label: string;
    dependencies: string[];
    status: 'OPERACIONAL' | 'ERROR' | 'CARGANDO';
    lastRun: StatusRun | null;
}

// --- Configuración Inicial ---
const INITIAL_STATUS_CHECKS: StatusItem[] = [
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
];

const StatusPage: React.FC = () => {
    const [statusChecks, setStatusChecks] = useState<StatusItem[]>(INITIAL_STATUS_CHECKS);
    const [, setLastUpdated] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [selectedError, setSelectedError] = useState<StatusRun | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const getErrorDetails = (msg: string) => {
        if (!msg) return { step: "N/A", type: "Unknown", category: "N/A", component: "N/A", severity: "N/A" };
        const stepMatch = msg.match(/DETENIDO EN: \[(.*?)\]|FALLO EN: \[(.*?)\]/);
        const step = stepMatch ? (stepMatch[1] || stepMatch[2]) : "Ejecución general";
        return { step, type: msg.includes('AssertionError') ? 'AssertionError' : 'TimeoutError', category: 'Frontend Test', component: 'Web Client', severity: 'Media' };
    };

    const fetchLatestStatus = async () => {
        setLoading(true);

        const { data } = await supabase
            .from('monitoreos')
            .select('id, sistema, estado, created_at, mensaje, estado_correccion')
            .order('created_at', { ascending: false })
            .limit(50);

        if (data) {
            const latestStatusMap = new Map<string, StatusRun>();
            const requiredSystems = ["Consulta Prueba", "Solicitud Crédito", "Clave Registro"];

            data.forEach((d: any) => {
                if (requiredSystems.includes(d.sistema) && !latestStatusMap.has(d.sistema)) {
                    latestStatusMap.set(d.sistema, d);
                }
            });

            const updatedChecks = INITIAL_STATUS_CHECKS.map(check => {
                let finalStatus: 'OPERACIONAL' | 'ERROR' | 'CARGANDO' = 'OPERACIONAL';
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
            setLastUpdated(new Date().toLocaleString('es-CO'));
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLatestStatus();
        const channel = supabase.channel('status-page-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'monitoreos' }, () => fetchLatestStatus())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const getDailyData = async () => {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { data, error } = await supabase
            .from('monitoreos')
            .select('*')
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching report data", error);
            return [];
        }
        return data || [];
    };

    const exportToPDF = async () => {
        setIsExporting(true);
        const reportData = await getDailyData();
        const doc = new jsPDF();
        const todayStr = new Date().toLocaleDateString('es-CO');

        // Cálculos
        const totalTests = reportData.length;
        const totalErrors = reportData.filter(d => d.estado === 'ERROR').length;
        const totalOk = reportData.filter(d => d.estado === 'OK').length;
        const successRate = totalTests > 0 ? ((totalOk / totalTests) * 100).toFixed(1) : '0';
        const totalDuration = reportData.reduce((acc, curr) => acc + (curr.duracion_ms || 0), 0);
        const avgDuration = totalTests > 0 ? (totalDuration / totalTests / 1000).toFixed(2) : '0';

        // Encabezado
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text(`Reporte de Estatus Operacional`, 14, 13);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Fecha del Reporte: ${todayStr}`, 14, 30);

        // Resumen
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(14, 35, 180, 25, 3, 3, 'F');
        doc.setFontSize(11);
        doc.text("Resumen Diario de Ejecución", 145, 30);
        doc.setFontSize(10);
        doc.text(`Total Pruebas: ${totalTests}`, 20, 48);
        doc.text(`Tasa de Éxito: ${successRate}%`, 20, 55);
        doc.text(`Exitosas: ${totalOk}`, 80, 48);
        doc.text(`Fallidas: ${totalErrors}`, 80, 55);
        doc.text(`Duración Promedio: ${avgDuration}s`, 140, 48);
        doc.text(`Estado General: ${totalErrors === 0 ? 'OPERACIONAL' : 'INCIDENTES DETECTADOS'}`, 140, 55);

        // Tabla
        const tableBody = reportData.map(row => [
            new Date(row.created_at).toLocaleTimeString('es-CO'),
            row.sistema,
            row.estado,
            row.estado === 'ERROR' && row.estado_correccion === 'CORREGIDO' ? 'CORREGIDO' : (row.estado === 'ERROR' ? 'PENDIENTE' : '-'),
            `${(row.duracion_ms / 1000).toFixed(2)}s`,
            row.mensaje ? row.mensaje.substring(0, 40) + '...' : '-'
        ]);

        autoTable(doc, {
            startY: 70,
            head: [['Hora', 'Flujo de Negocio', 'Estado', 'Gestión', 'Duración', 'Detalle']],
            body: tableBody,
            headStyles: { fillColor: [79, 70, 229] },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            styles: { fontSize: 8 },
            didParseCell: function (data) {
                const rawRow = data.row.raw as unknown as string[];

                if (data.section === 'body' && rawRow[2] === 'ERROR') {
                    if (rawRow[3] === 'CORREGIDO') {
                        data.cell.styles.fillColor = [254, 243, 199];
                    } else {
                        data.cell.styles.fillColor = [254, 226, 226];
                    }
                }
            }
        });

        doc.save(`Reporte_QA_${todayStr.replace(/\//g, '-')}.pdf`);
        setIsExporting(false);
    };

    const exportToCSV = async () => {
        setIsExporting(true);
        const reportData = await getDailyData();
        const todayStr = new Date().toLocaleDateString('es-CO');

        const rows = reportData.map(d => [
            d.id,
            d.created_at,
            d.sistema,
            d.cliente || 'N/A',
            d.estado,
            d.estado_correccion || 'N/A',
            (d.duracion_ms / 1000).toFixed(2),
            d.mensaje ? `"${d.mensaje.replace(/"/g, '""')}"` : ''
        ]);

        const header = ["ID", "Fecha/Hora", "Sistema", "Cliente", "Estado", "Gestión Corrección", "Duración (s)", "Mensaje/Log"];
        const csvContent = "data:text/csv;charset=utf-8," + header.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `Reporte_QA_${todayStr.replace(/\//g, '-')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExporting(false);
    };

    const getSectionStatus = (items: StatusItem[]) => items.some(i => i.status === 'ERROR') ? 'ERROR' : 'OPERACIONAL';
    const getOverallStatus = () => statusChecks.some(i => i.status === 'ERROR') ? 'ERROR' : 'OPERACIONAL';

    const getStatusIcon = (status: string) => {
        if (status === 'OPERACIONAL') return <CheckCircle size={18} color="#22c55e" />;
        if (status === 'ERROR') return <AlertTriangle size={18} color="#ef4444" />;
        return <Loader size={18} className={styles.spin} color="#64748b" />;
    };

    const sections = {
        '1. Atomic': statusChecks.slice(0, 3),
        '2. Parly': statusChecks.slice(3),
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
                {Object.entries(sections).map(([title, items]) => (
                    <div key={title} className={styles.sectionCard}>
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
                                    title={item.status === 'ERROR' ? "Clic para ver detalles del error" : ""}
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
                ))}
            </div>

            <p className={styles.footer}>El reporte incluye todas las ejecuciones del día actual. El estatus visual se basa en la última ejecución.</p>

            {selectedError && (
                <div className={styles.errorModalOverlay} onClick={() => setSelectedError(null)}>
                    <div className={styles.errorModalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.errorTitle}>
                                <AlertTriangle size={24} /> Detalle de Fallo: {selectedError.sistema}
                            </h3>
                            <button className={styles.modalCloseBtn} onClick={() => setSelectedError(null)}><X size={24} /></button>
                        </div>

                        <div className={styles.errorDetailBox}>
                            <p className={styles.errorTitle} style={{ fontSize: '1rem' }}>Mensaje de Error:</p>
                            <pre className={styles.errorLog}>
                                {selectedError.mensaje || "No hay un mensaje detallado registrado."}
                            </pre>
                        </div>

                        {selectedError.estado === 'ERROR' && (
                            <>
                                <h4 style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 10 }}>Clasificación Técnica</h4>
                                <div className={styles.techGrid}>
                                    <span className={styles.techLabel}>Tipo:</span><span className={styles.techValue}>{getErrorDetails(selectedError.mensaje).type}</span>
                                    <span className={styles.techLabel}>Paso:</span><span className={styles.techValue}>{getErrorDetails(selectedError.mensaje).step}</span>
                                    <span className={styles.techLabel}>Severidad:</span><span className={styles.techValue}>{getErrorDetails(selectedError.mensaje).severity}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatusPage;