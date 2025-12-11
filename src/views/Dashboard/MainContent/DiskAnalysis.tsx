import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Calendar, Search, BarChart2, Table, ArrowRight, Filter,
    FileText, Download // <--- NUEVOS ICONOS
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import styles from './DiskAnalysis.module.css';
import jsPDF from 'jspdf'; // <--- IMPORTAR
import autoTable from 'jspdf-autotable'; // <--- IMPORTAR

interface DiskData {
    id: string;
    server_ip: string;
    batch_id: string;
    filesystem: string;
    size: string;
    used: string;
    avail: string;
    use_percent: number;
    mount_point: string;
    created_at: string;
}

interface BatchInfo {
    batch_id: string;
    created_at: string;
}

interface DiskAnalysisProps {
    serverIp: string;
}

const DiskAnalysis: React.FC<DiskAnalysisProps> = ({ serverIp }) => {

    // --- ESTADOS DE COMPARACIÓN ---
    const [availableBatches, setAvailableBatches] = useState<BatchInfo[]>([]);
    const [selectedBatchA, setSelectedBatchA] = useState<string>('');
    const [selectedBatchB, setSelectedBatchB] = useState<string>('');

    const [dataA, setDataA] = useState<DiskData[]>([]);
    const [dataB, setDataB] = useState<DiskData[]>([]);

    const [activeTab, setActiveTab] = useState<'charts' | 'tables'>('charts');
    const [loading, setLoading] = useState(false);

    // --- ESTADOS DE UI/FILTROS ---
    const [dateFilter, setDateFilter] = useState('');
    const [allMounts, setAllMounts] = useState<string[]>([]);
    const [selectedMounts, setSelectedMounts] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    // Helpers
    const formatDate = (iso: string) => {
        if (!iso) return 'Seleccionar...';
        return new Date(iso).toLocaleString('es-CO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getBatchDisplayDate = (batchId: string) => {
        const batch = availableBatches.find(b => b.batch_id === batchId);
        return batch ? formatDate(batch.created_at) : 'Seleccionar...';
    };


    // 1. Efecto para obtener historial de Paquetes
    useEffect(() => {
        const fetchHistory = async () => {
            const { data } = await supabase
                .from('server_disks')
                .select('batch_id, created_at')
                .eq('server_ip', serverIp)
                .order('created_at', { ascending: false });

            if (data) {
                const uniqueBatchesMap = new Map<string, BatchInfo>();
                data.forEach(d => {
                    if (d.batch_id && !uniqueBatchesMap.has(d.batch_id)) {
                        uniqueBatchesMap.set(d.batch_id, {
                            batch_id: d.batch_id,
                            created_at: d.created_at
                        });
                    }
                });

                const uniqueBatches = Array.from(uniqueBatchesMap.values()).sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );

                setAvailableBatches(uniqueBatches);

                if (uniqueBatches.length > 0) setSelectedBatchA(uniqueBatches[0].batch_id);
                if (uniqueBatches.length > 1) setSelectedBatchB(uniqueBatches[1].batch_id);
            }
        };
        fetchHistory();
    }, [serverIp]);

    // 2. Efecto para cargar datos de comparación
    useEffect(() => {
        const loadComparison = async () => {
            setLoading(true);

            const fetchA = selectedBatchA ? supabase.from('server_disks').select('*').eq('server_ip', serverIp).eq('batch_id', selectedBatchA) : Promise.resolve({ data: [] });
            const fetchB = selectedBatchB ? supabase.from('server_disks').select('*').eq('server_ip', serverIp).eq('batch_id', selectedBatchB) : Promise.resolve({ data: [] });

            const [resA, resB] = await Promise.all([fetchA, fetchB]);

            const loadedA = (resA.data as DiskData[]) || [];
            const loadedB = (resB.data as DiskData[]) || [];

            setDataA(loadedA);
            setDataB(loadedB);

            const mounts = Array.from(new Set([
                ...loadedA.map(d => d.mount_point),
                ...loadedB.map(d => d.mount_point)
            ]));
            setAllMounts(mounts);

            if (selectedMounts.length === 0 || !selectedMounts.every(m => mounts.includes(m))) {
                const clean = mounts.filter(m => !m.includes('/snap') && !m.includes('/loop'));
                setSelectedMounts(clean.length > 0 ? clean : mounts);
            }

            setLoading(false);
        };

        if (selectedBatchA || selectedBatchB) loadComparison();
    }, [selectedBatchA, selectedBatchB, serverIp]);

    // --- LOGICA FILTRO UI ---
    useEffect(() => {
        function handleClickOutside(event: any) {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleMount = (mount: string) => {
        setSelectedMounts(prev => prev.includes(mount) ? prev.filter(m => m !== mount) : [...prev, mount]);
    };
    const toggleAll = (select: boolean) => setSelectedMounts(select ? allMounts : []);
    const hideSnaps = () => setSelectedMounts(allMounts.filter(m => !m.includes('/snap') && !m.includes('/loop')));

    // --- DATOS FILTRADOS ---
    const filteredA = dataA.filter(d => selectedMounts.includes(d.mount_point));
    const filteredB = dataB.filter(d => selectedMounts.includes(d.mount_point));

    const filteredBatches = availableBatches.filter(b => getBatchDisplayDate(b.batch_id).includes(dateFilter));

    const chartData = filteredA.map(diskA => {
        const diskB = filteredB.find(d => d.mount_point === diskA.mount_point);
        const dateA_display = getBatchDisplayDate(selectedBatchA);
        const dateB_display = getBatchDisplayDate(selectedBatchB);
        return {
            name: diskA.mount_point,
            [dateA_display]: diskA.use_percent,
            [dateB_display]: diskB ? diskB.use_percent : 0,
        };
    });

    // --- FUNCIONES DE EXPORTACIÓN ---

    const exportToPDF = () => {
        const doc = new jsPDF();
        const dateA_display = getBatchDisplayDate(selectedBatchA);
        const dateB_display = getBatchDisplayDate(selectedBatchB);

        doc.setFontSize(14);
        doc.text(`Análisis Comparativo: ${serverIp}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Fecha A (Referencia): ${dateA_display}`, 14, 27);
        doc.text(`Fecha B (Comparación): ${dateB_display}`, 14, 32);

        // Preparar datos para la tabla PDF
        const pdfData = filteredA.map(diskA => {
            const diskB = filteredB.find(d => d.mount_point === diskA.mount_point);
            const usageDiff = diskA.use_percent - (diskB?.use_percent || 0);

            let diffText = '';
            if (usageDiff > 0) {
                diffText = `▲ +${usageDiff}%`;
            } else if (usageDiff < 0) {
                diffText = `▼ ${usageDiff}%`;
            } else {
                diffText = `- 0%`;
            }

            return [
                diskA.mount_point,
                diskA.size,
                `${diskA.use_percent}%`,
                diskB ? `${diskB.use_percent}%` : 'N/A',
                diffText
            ];
        });

        autoTable(doc, {
            startY: 40,
            head: [['Montaje', 'Tamaño', `Uso ${dateA_display}`, `Uso ${dateB_display}`, 'Diferencia']],
            body: pdfData,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] } // f8fafc
        });

        doc.save(`Analisis_Discos_${serverIp}_${dateA_display.replace(/[/ :]/g, '_')}.pdf`);
    };

    const exportToCSV = () => {
        const dateA_display = getBatchDisplayDate(selectedBatchA);
        const dateB_display = getBatchDisplayDate(selectedBatchB);

        // Crear las filas del CSV
        const rows = filteredA.map(diskA => {
            const diskB = filteredB.find(d => d.mount_point === diskA.mount_point);
            const usageDiff = diskA.use_percent - (diskB?.use_percent || 0);

            return [
                diskA.mount_point,
                diskA.filesystem,
                diskA.size,
                diskA.used,
                diskA.avail,
                diskA.use_percent,
                diskB ? diskB.use_percent : 'N/A',
                usageDiff
            ];
        });

        // Encabezado del CSV
        const header = ['Montaje', 'Filesystem', 'Tamaño', 'Usado (A)', 'Disponible (A)', `Uso % (${dateA_display})`, `Uso % (${dateB_display})`, 'Diferencia %'];

        // Unir encabezado y filas
        const csvContent = "data:text/csv;charset=utf-8,"
            + header.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        // Crear enlace de descarga
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `Analisis_Discos_${serverIp}_${dateA_display.replace(/[/ :]/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles.container}>
            <div className={styles.controlsCard}>
                <div className={styles.headerControl}>
                    <h3 className={styles.controlTitle}>Configurar Comparativa</h3>

                    <div style={{ display: 'flex', gap: 12 }}>
                        {/* BOTONES DE EXPORTACIÓN */}
                        <button className={`${styles.actionBtn} ${styles.btnExcel}`} onClick={exportToCSV} title="Exportar a Excel (CSV)">
                            <FileText size={18} /> Excel
                        </button>
                        <button className={`${styles.actionBtn} ${styles.btnPdf}`} onClick={exportToPDF} title="Generar Reporte PDF">
                            <Download size={18} /> PDF
                        </button>

                        {/* FILTRO EN ANALISIS */}
                        <div className={styles.selectWrapper} ref={filterRef}>
                            <button
                                className={styles.select}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: 'auto' }}
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                            >
                                <Filter size={16} />
                                Discos ({selectedMounts.length})
                            </button>
                            {isFilterOpen && (
                                <div style={{
                                    position: 'absolute', top: '110%', right: 0, width: 280,
                                    background: 'white', border: '1px solid #e2e8f0', borderRadius: 12,
                                    boxShadow: '0 10px 15px rgba(0,0,0,0.1)', zIndex: 50, padding: 12
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, borderBottom: '1px solid #eee', paddingBottom: 5 }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>Montajes</span>
                                        <div style={{ display: 'flex', gap: 5 }}>
                                            <button onClick={hideSnaps} style={{ fontSize: '0.7rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>No Snaps</button>
                                            <button onClick={() => toggleAll(true)} style={{ fontSize: '0.7rem', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>Todos</button>
                                        </div>
                                    </div>
                                    <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        {allMounts.map(m => (
                                            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={selectedMounts.includes(m)} onChange={() => toggleMount(m)} />
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{m}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.searchBox}>
                            <Search size={14} color="#64748b" />
                            <input
                                type="text" placeholder="Buscar fecha..."
                                value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.selectorsGrid}>
                    <div className={styles.selectorGroup}>
                        <label className={styles.label}>Paquete A</label>
                        <div className={styles.selectWrapper}>
                            <Calendar size={16} className={styles.icon} />
                            <select value={selectedBatchA} onChange={(e) => setSelectedBatchA(e.target.value)} className={styles.select}>
                                {filteredBatches.map(b => <option key={b.batch_id} value={b.batch_id}>{getBatchDisplayDate(b.batch_id)}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className={styles.vsBadge}>VS</div>
                    <div className={styles.selectorGroup}>
                        <label className={styles.label}>Paquete B</label>
                        <div className={styles.selectWrapper}>
                            <Calendar size={16} className={styles.icon} />
                            <select value={selectedBatchB} onChange={(e) => setSelectedBatchB(e.target.value)} className={styles.select}>
                                <option value="">Ninguna</option>
                                {filteredBatches.map(b => <option key={b.batch_id} value={b.batch_id}>{getBatchDisplayDate(b.batch_id)}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.tabsContainer}>
                <button className={`${styles.tab} ${activeTab === 'charts' ? styles.activeTab : ''}`} onClick={() => setActiveTab('charts')}>
                    <BarChart2 size={18} /> Gráficas
                </button>
                <button className={`${styles.tab} ${activeTab === 'tables' ? styles.activeTab : ''}`} onClick={() => setActiveTab('tables')}>
                    <Table size={18} /> Tablas
                </button>
            </div>

            <div className={styles.contentArea}>
                {loading ? (
                    <div className={styles.loading}>Cargando...</div>
                ) : activeTab === 'charts' ? (
                    <div className={styles.chartCard}>
                        <h4 className={styles.cardTitle}>Comparativa</h4>
                        <div style={{ width: '100%', height: 400 }}>
                            <ResponsiveContainer>
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                                    <YAxis unit="%" tick={{ fill: '#64748b' }} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{ fill: '#f8fafc' }} />
                                    <Legend />
                                    <Bar dataKey={getBatchDisplayDate(selectedBatchA)} fill="#6366f1" name={`Paquete A (${getBatchDisplayDate(selectedBatchA)})`} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey={getBatchDisplayDate(selectedBatchB)} fill="#cbd5e1" name={`Paquete B (${getBatchDisplayDate(selectedBatchB)})`} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <div className={styles.tablesGrid}>
                        <DiskTable data={filteredA} title={getBatchDisplayDate(selectedBatchA)} color="#6366f1" />
                        <div className={styles.arrowSeparator}><ArrowRight size={24} color="#94a3b8" /></div>
                        <DiskTable data={filteredB} title={getBatchDisplayDate(selectedBatchB)} color="#64748b" />
                    </div>
                )}
            </div>
        </div>
    );
};

// Subcomponente Tabla (sin cambios)
const DiskTable = ({ data, title, color }: { data: DiskData[], title: string, color: string }) => (
    <div className={styles.tableCard} style={{ borderTop: `4px solid ${color}` }}>
        <div className={styles.tableHeader}>
            <span className={styles.tableDate}>{title}</span>
            <span className={styles.badge}>{data.length} Discos</span>
        </div>
        <div className={styles.tableWrapper}>
            <table className={styles.miniTable}>
                <thead>
                    <tr><th>Montaje</th><th>Tamaño</th><th>Uso</th><th>%</th></tr>
                </thead>
                <tbody>
                    {data.map(d => (
                        <tr key={d.id}>
                            <td style={{ fontWeight: 600 }}>{d.mount_point}</td>
                            <td>{d.size}</td>
                            <td>{d.used}</td>
                            <td><span style={{ fontWeight: 'bold', color: d.use_percent > 90 ? '#ef4444' : '#1e293b' }}>{d.use_percent}%</span></td>
                        </tr>
                    ))}
                    {data.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>Sin datos</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
);

export default DiskAnalysis;