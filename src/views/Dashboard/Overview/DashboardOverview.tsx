import React, { useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, YAxis } from 'recharts';
import { Eye, X, Calendar, Clock, Timer, AlertTriangle, CheckCircle, FileText, Download, Search, Edit2 } from 'lucide-react';
import styles from './Overview.module.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FilterContextType } from '../../../models/monitor.model';

// 1. IMPORTAR COMPONENTE DE MONITOREO
// Ajusta la ruta si tu componente ServerMonitor está en otra carpeta
import { ServerMonitor } from '../../../views/Dashboard/ServerMonitor/ServerMonitor';

interface DashboardUIProps {
    filterContext: FilterContextType;
    data: any[];
    stats: { total: number, ok: number, error: number, avgTimeLast4: string };
    chartData: any[];
    barData: any[];
    pieData: any[];
    setSelectedRun: (run: any | null) => void;
    setSelectedErrorToEdit: (error: any | null) => void;
    selectedRun: any;
}

const COLORS = ['#22c55e', '#ef4444'];

const getErrorDetails = (msg: string) => {
    if (!msg) return { step: "N/A", type: "Unknown", category: "N/A", component: "N/A", severity: "N/A" };
    const stepMatch = msg.match(/DETENIDO EN: \[(.*?)\]|FALLO EN: \[(.*?)\]/);
    const step = stepMatch ? (stepMatch[1] || stepMatch[2]) : "Ejecución general";
    return { step, type: msg.includes('AssertionError') ? 'AssertionError' : 'TimeoutError', category: 'Frontend Test', component: 'Web Client', severity: 'Media' };
};

// --- UTILS FORMATO ---

const formatDuration = (ms: number) => {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const getExcelDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
};

const getExcelTime = (dateObj: Date) => {
    return dateObj.toLocaleTimeString('es-CO', {
        timeZone: 'America/Bogota',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
};

const DashboardUI: React.FC<DashboardUIProps> = ({
    filterContext,
    data,
    stats,
    chartData,
    barData,
    pieData,
    setSelectedRun,
    setSelectedErrorToEdit,
    selectedRun
}) => {

    // ---------------------------------------------------------
    // 2. INTERCEPTAR PARA MOSTRAR MONITOR ZABBIX
    // ---------------------------------------------------------
    if (filterContext.value === 'ServerMonitor') {
        return <ServerMonitor />;
    }

    // ---------------------------------------------------------
    // VISTA NORMAL (CYPRESS)
    // ---------------------------------------------------------

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('');

    const filteredDataUI = data.filter((item) => {
        const matchesSearch = item.sistema?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.cliente && item.cliente.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'ALL' || item.displayStatus === statusFilter;
        const matchesDate = dateFilter === '' || item.created_at.startsWith(dateFilter);
        return matchesSearch && matchesStatus && matchesDate;
    });

    // --- Helpers de Recharts ---
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            return (
                <div style={{ background: 'white', padding: '10px', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px' }}>{label}</p>
                    <p style={{ color: dataPoint.status === 'ERROR' ? '#ef4444' : '#6366f1', fontWeight: 'bold' }}>{dataPoint.status === 'ERROR' ? '❌ FALLO' : '✅ ÉXITO'}</p>
                    <p style={{ fontSize: '0.9rem', color: '#334155' }}>Duración: <strong>{dataPoint.realTime}s</strong></p>
                </div>
            );
        } return null;
    };

    const CustomDot = (props: any) => {
        const { cx, cy, payload } = props;
        if (payload.status === 'ERROR') return <circle cx={cx} cy={cy} r={5} stroke="white" strokeWidth={2} fill="#ef4444" />;
        return <circle cx={cx} cy={cy} r={4} stroke="white" strokeWidth={2} fill="#6366f1" />;
    };

    // --- Helpers de Exportación ---
    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18); doc.text(`Reporte - ${filterContext.value}`, 14, 20);
        autoTable(doc, {
            startY: 35,
            head: [["ID", "Fecha", "Cliente", "Flujo", "Estado", "Duración", "Corrección"]],
            body: filteredDataUI.map(d => [
                d.id,
                new Date(d.created_at).toLocaleString(),
                d.cliente || '-',
                d.sistema,
                d.displayStatus,
                `${(d.duracion_ms / 1000).toFixed(2)}s`,
                d.estado_correccion || 'PENDIENTE'
            ]),
            styles: { fontSize: 8 }, headStyles: { fillColor: [99, 102, 241] }
        });
        doc.save(`reporte.pdf`);
    };

    // --- EXPORTAR A CSV (Lógica ---
    const exportToCSV = () => {
        const rows = filteredDataUI.map(d => {
            // 1. Fechas y Horas (Calculadas UTC-5)
            const startDate = new Date(d.created_at);
            // Sumamos duración a la fecha de inicio
            const endDate = new Date(startDate.getTime() + (d.duracion_ms || 0));

            // 2. Lógica de Corrección
            let estadoCorreccionText = "Sin Error";

            // Solo evaluamos si hubo un error original
            if (d.displayStatus === 'ERROR' || d.estado === 'ERROR') {
                const rawCorrection = d.estado_correccion ? d.estado_correccion.toUpperCase() : '';

                // Si la BD dice "CORREGIDO", ponemos texto limpio
                if (rawCorrection.includes('CORREGIDO')) {
                    estadoCorreccionText = 'Corregido';
                } else {
                    estadoCorreccionText = 'Pendiente';
                }
            }

            return [
                d.id,
                getExcelDate(d.created_at),  // Fecha (DD/MM/YYYY)
                getExcelTime(startDate),     // Hora Inicio (HH:MM:SS)
                getExcelTime(endDate),       // Hora Fin (Calculada)
                d.cliente || 'N/A',
                d.sistema,
                d.displayStatus,             // Estado (OK/ERROR)
                d.mensaje ? `"${d.mensaje.replace(/"/g, '""')}"` : '', // Mensaje limpio
                estadoCorreccionText,        // Texto limpio: "Corregido", "Pendiente" o "Sin Error"
                formatDuration(d.duracion_ms)// Duración formateada
            ];
        });

        // Cabeceras
        const header = [
            "ID",
            "Fecha",
            "Hora Inicio",
            "Hora Fin",
            "Cliente",
            "Flujo",
            "Estado",
            "Mensaje",
            "Estado Corrección",
            "Duración"
        ];

        // Generación del CSV con BOM para tildes
        const csvContent = "\uFEFF" + header.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");

        const link = document.createElement("a");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", `Reporte_General_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            {/* Header */}
            <header className={styles.header}>
                <div><h1 className={styles.title}>{filterContext.type === 'global' ? 'Dashboard Global' : `Dashboard - ${filterContext.value}`}</h1><p className={styles.subtitle}>Resumen de ejecuciones de Cypress</p></div>
                <div className={styles.dateBadge}>{new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} 📅</div>
            </header>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.cardIndigo}`}><span className={styles.cardTitle}>Ejecuciones (Hoy)</span><span className={styles.cardValue}>{stats.total}</span></div>
                <div className={`${styles.statCard} ${styles.cardGreen}`}><span className={styles.cardTitle}>Exitosas</span><span className={styles.cardValue}>{stats.ok}</span></div>
                <div className={`${styles.statCard} ${styles.cardRed}`}><span className={styles.cardTitle}>Fallidas</span><span className={styles.cardValue}>{stats.error}</span></div>
                <div className={`${styles.statCard} ${styles.cardGray}`}><span className={styles.cardTitle} style={{ fontSize: '0.8rem' }}>Tiempo Promedio (Últimas 4)</span><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Clock size={24} color="#64748b" /><span className={styles.cardValue}>{stats.avgTimeLast4}</span></div></div>
            </div>

            {/* Gráfico Principal */}
            <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>Rendimiento en Tiempo Real (Duración en Segundos)</h3>
                <div className={styles.chartBox}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs><linearGradient id="colorVisual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} unit="s" />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="visualHeight" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVisual)" dot={<CustomDot />} activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Gráficos Inferiores */}
            <div className={styles.bottomGrid}>
                <div className={styles.chartContainer}>
                    <h3 className={styles.chartTitle}>Ejecuciones por Flujo</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={barData}>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '10px' }} />
                            <Bar dataKey="val" fill="#6366f1" radius={[10, 10, 10, 10]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className={`${styles.chartContainer} ${styles.pieChartWrapper}`}>
                    <div>
                        <h3 className={styles.chartTitle}>Tasa de Éxito</h3>
                        <div style={{ height: '180px', width: '180px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {pieData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div>
                        {pieData.map((entry, index) => (
                            <div key={index} className={styles.legendItem}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                                <span>{entry.name}</span>
                                <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Barra de Filtros */}
            <div className={styles.filterBar}>
                <div className={styles.filterGroup}>
                    <div style={{ position: 'relative' }}>
                        <input type="text" placeholder="Buscar..." className={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        <Search size={16} style={{ position: 'absolute', right: 10, top: 12, color: '#94a3b8' }} />
                    </div>
                    <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="ALL">Todos los estados</option>
                        <option value="OK">Exitosos</option>
                        <option value="ERROR">Fallidos</option>
                    </select>
                    <input type="date" className={styles.dateInput} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                </div>
                <div className={styles.filterGroup}>
                    <button className={`${styles.exportBtn} ${styles.btnExcel}`} onClick={exportToCSV}><FileText size={18} /> Excel</button>
                    <button className={`${styles.exportBtn} ${styles.btnPdf}`} onClick={exportToPDF}><Download size={18} /> PDF</button>
                </div>
            </div>

            {/* --- TABLA DE RESULTADOS --- */}
            <div className={styles.tableContainer}>
                <div className={styles.tableHeader}><span style={{ color: '#64748b', fontSize: '0.9rem' }}>Mostrando {filteredDataUI.length} resultados</span></div>
                <div className={styles.tableScrollWrapper}>
                    <table className={styles.dataTable}>
                        <thead><tr><th>ID</th><th>Fecha / Hora</th><th>Flujo / Sistema</th><th>Cliente</th><th>Canal</th><th>Estado</th><th>Corrección</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {filteredDataUI.map((row) => {
                                const correctionStatus = row.estado_correccion || 'PENDIENTE';
                                const correctionText = row.displayStatus === 'OK' ? 'N/A' : (correctionStatus === 'CORREGIDO' ? 'CORREGIDO' : 'PENDIENTE');
                                let correctionBadgeStyle = styles.statusGray;
                                if (correctionText === 'CORREGIDO') correctionBadgeStyle = styles.statusWarning;
                                else if (correctionText === 'PENDIENTE') correctionBadgeStyle = styles.statusError;
                                const statusBadgeStyle = row.displayStatus === 'OK' ? styles.statusOk : styles.statusError;

                                return (
                                    <tr key={row.id}>
                                        <td>#{row.id}</td>
                                        <td>{new Date(row.created_at).toLocaleString('es-ES')}</td>
                                        <td style={{ fontWeight: 600 }}>{row.sistema}</td>
                                        <td>{row.cliente || '-'}</td>
                                        <td><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', color: '#475569' }}>{row.canal || '-'}</span></td>
                                        <td><span className={`${styles.statusBadge} ${statusBadgeStyle}`}>{row.displayStatus}</span></td>
                                        <td><span className={`${styles.statusBadge} ${correctionBadgeStyle}`}>{correctionText}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 5 }}>
                                                <button className={styles.actionButton} onClick={() => setSelectedRun(row)}><Eye size={18} /></button>
                                                {row.estado === 'ERROR' && correctionStatus !== 'CORREGIDO' && (
                                                    <button className={`${styles.actionButton} ${styles.actionEdit}`} onClick={() => setSelectedErrorToEdit(row)} title="Marcar como Corregido"><Edit2 size={18} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODAL DE VISUALIZACIÓN --- */}
            {selectedRun && (
                <div className={styles.modalOverlay} onClick={() => setSelectedRun(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>SISTEMA / ESTADO</span>
                                <h2 className={styles.modalTitle}>{selectedRun.sistema}</h2>
                                <span className={`${styles.statusTagLarge} ${selectedRun.displayStatus === 'OK' ? styles.statusOk : styles.statusError}`} style={{ marginTop: '5px' }}>
                                    {selectedRun.displayStatus === 'OK' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} {selectedRun.displayStatus}
                                </span>
                            </div>
                            <button className={styles.closeButton} onClick={() => setSelectedRun(null)}><X size={24} /></button>
                        </div>
                        <h4 className={styles.modalSectionTitle}>TIEMPOS DE EJECUCIÓN</h4>
                        <div className={styles.detailRow}>
                            <div className={styles.detailItem}><Calendar size={16} /> {new Date(selectedRun.created_at).toLocaleDateString()}</div>
                            <div className={styles.detailItem}><Clock size={16} /> {new Date(selectedRun.created_at).toLocaleTimeString()}</div>
                            <div className={styles.detailItem}><Timer size={16} /> Duración: <strong style={{ color: selectedRun.estado === 'ERROR' ? '#ef4444' : '#22c55e', marginLeft: 5 }}>{(selectedRun.duracion_ms / 1000).toFixed(2)}s</strong></div>
                        </div>
                        <h4 className={styles.modalSectionTitle}>RESULTADO / LOGS</h4>
                        <div className={`${styles.resultBox} ${selectedRun.estado === 'OK' ? styles.boxSuccess : styles.boxError}`}>
                            <span className={`${styles.resultTitle} ${selectedRun.estado === 'OK' ? styles.textSuccess : styles.textError}`}>{selectedRun.estado === 'OK' ? 'Confirmación de Éxito:' : 'Reporte de Fallo:'}</span>
                            <p className={`${styles.resultText} ${selectedRun.estado === 'OK' ? styles.textSuccess : styles.textError}`}>{selectedRun.mensaje}</p>
                        </div>
                        {selectedRun.estado_correccion === 'CORREGIDO' && (
                            <>
                                <h4 className={styles.modalSectionTitle} style={{ marginTop: 20 }}>SOLUCIÓN APLICADA</h4>
                                <div className={`${styles.resultBox} ${styles.boxWarning}`}>
                                    <p className={styles.resultTitle} style={{ color: '#d97706' }}>Comentario de Corrección:</p>
                                    <p className={styles.resultText} style={{ color: '#d97706', whiteSpace: 'pre-wrap' }}>{selectedRun.comentario_correccion || 'No se proporcionó descripción de la solución.'}</p>
                                </div>
                            </>
                        )}
                        {selectedRun.estado === 'ERROR' && (
                            <>
                                <h4 className={styles.modalSectionTitle}>CLASIFICACIÓN TÉCNICA</h4>
                                <div className={styles.technicalGrid}>
                                    <span className={styles.techLabel}>Tipo de error</span><div><span className={styles.errorTypeTag}>{getErrorDetails(selectedRun.mensaje).type}</span></div>
                                    <span className={styles.techLabel}>Categoría</span><span className={styles.techValue}>{getErrorDetails(selectedRun.mensaje).category}</span>
                                    <span className={styles.techLabel}>Componente</span><span className={styles.techValue}>🖥️ {getErrorDetails(selectedRun.mensaje).component}</span>
                                    <span className={styles.techLabel}>Severidad</span><span className={styles.techValue} style={{ color: '#059669' }}>● {getErrorDetails(selectedRun.mensaje).severity}</span>
                                    <span className={styles.techLabel}>Paso donde ocurrió</span><span className={styles.techValue}>{getErrorDetails(selectedRun.mensaje).step}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardUI;