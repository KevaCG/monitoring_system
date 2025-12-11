import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, Server, Clock, Database, Calendar, BarChart2, Filter, FileText, Download } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import styles from './ServerDiskView.module.css';
import DiskAnalysis from './DiskAnalysis';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface ServerDiskViewProps {
    serverIp: string;
}

const ServerDiskView: React.FC<ServerDiskViewProps> = ({ serverIp }) => {
    const [disks, setDisks] = useState<DiskData[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<string | null>(null);
    const [showAnalysis, setShowAnalysis] = useState(false);

    // Filtros
    const [allMounts, setAllMounts] = useState<string[]>([]);
    const [selectedMounts, setSelectedMounts] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchDiskData = async () => {
        setLoading(true);
        try {
            // 1. Obtener el ÚLTIMO batch_id registrado
            const { data: latestRecord, error: latestError } = await supabase
                .from('server_disks')
                .select('batch_id, created_at')
                .eq('server_ip', serverIp)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (latestError) throw latestError;

            if (latestRecord && latestRecord.batch_id) {
                // 2. Traer TODOS los discos que pertenezcan a ESE PAQUETE
                const { data: batchData, error: batchError } = await supabase
                    .from('server_disks')
                    .select('*')
                    .eq('batch_id', latestRecord.batch_id);

                if (batchError) throw batchError;

                if (batchData) {
                    batchData.sort((a: DiskData, b: DiskData) => b.use_percent - a.use_percent);
                    setDisks(batchData);
                    setLastUpdate(new Date(latestRecord.created_at).toLocaleString('es-CO'));

                    const mounts = Array.from(new Set(batchData.map(d => d.mount_point)));
                    setAllMounts(mounts);

                    if (selectedMounts.length === 0) {
                        const cleanMounts = mounts.filter(m => !m.includes('/snap') && !m.includes('/loop'));
                        setSelectedMounts(cleanMounts.length > 0 ? cleanMounts : mounts);
                    }
                }
            } else {
                setDisks([]);
                setLastUpdate(null);
            }

        } catch (err) {
            console.error("Error al obtener discos:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setDisks([]);
        setSelectedMounts([]);
        setAllMounts([]);
        fetchDiskData();
        setShowAnalysis(false);
    }, [serverIp]);

    const toggleMount = (mount: string) => {
        setSelectedMounts(prev => prev.includes(mount) ? prev.filter(m => m !== mount) : [...prev, mount]);
    };
    const toggleAll = (select: boolean) => setSelectedMounts(select ? allMounts : []);
    const hideSnaps = () => setSelectedMounts(allMounts.filter(m => !m.includes('/snap') && !m.includes('/loop')));
    const displayedDisks = disks.filter(d => selectedMounts.includes(d.mount_point));

    const getStatusColor = (percent: number) => {
        if (percent >= 90) return '#ef4444';
        if (percent >= 75) return '#f59e0b';
        return '#22c55e';
    };

    const formatRunDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('es-CO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // --- NUEVAS FUNCIONES DE EXPORTACIÓN ---

    const exportToPDF = () => {
        const doc = new jsPDF();
        const dateDisplay = lastUpdate || formatRunDate(new Date().toISOString());

        doc.setFontSize(14);
        doc.text(`Reporte de Estado de Discos: ${serverIp}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Fecha del reporte: ${dateDisplay}`, 14, 27);

        // Preparar datos para la tabla PDF
        const pdfData = displayedDisks.map(d => [
            formatRunDate(d.created_at),
            d.filesystem,
            d.size,
            d.used,
            d.avail,
            `${d.use_percent}%`,
            d.mount_point
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Fecha Ejecución', 'Filesystem', 'Tamaño', 'Usado', 'Disponible', 'Uso %', 'Montaje']],
            body: pdfData,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [63, 66, 241], fontStyle: 'bold' }, // Indigo 500
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        doc.save(`Estado_Discos_${serverIp}_${dateDisplay.replace(/[/ :]/g, '_')}.pdf`);
    };

    const exportToCSV = () => {
        const dateDisplay = lastUpdate || formatRunDate(new Date().toISOString());

        const rows = displayedDisks.map(d => [
            d.created_at, // ISO string para datos sin formato
            d.server_ip,
            d.batch_id,
            d.filesystem,
            d.size,
            d.used,
            d.avail,
            d.use_percent,
            d.mount_point
        ]);

        const header = ['Fecha (ISO)', 'IP Servidor', 'ID Paquete', 'Filesystem', 'Tamaño', 'Usado', 'Disponible', 'Uso %', 'Montaje'];

        const csvContent = "data:text/csv;charset=utf-8,"
            + header.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `Estado_Discos_${serverIp}_${dateDisplay.replace(/[/ :]/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleContainer}>
                    <h2><div className={styles.iconWrapper}><Server size={24} color="#6366f1" /></div>{serverIp}</h2>
                    <div className={styles.metaInfo}>
                        <Clock size={14} color="#64748b" />
                        <p className={styles.metaText}>{lastUpdate ? `Último reporte: ${lastUpdate}` : 'Sin datos recientes'}</p>
                    </div>
                </div>

                <div className={styles.actionsContainer}>
                    {/* BOTONES DE EXPORTACIÓN */}
                    {!showAnalysis && (
                        <>
                            <button className={`${styles.actionBtn} ${styles.btnExcel}`} onClick={exportToCSV} title="Exportar datos actuales a Excel (CSV)">
                                <FileText size={18} /> Excel
                            </button>
                            <button className={`${styles.actionBtn} ${styles.btnPdf}`} onClick={exportToPDF} title="Generar reporte PDF del estado actual">
                                <Download size={18} /> PDF
                            </button>
                        </>
                    )}

                    {/* FILTROS (Solo en vista normal) */}
                    {!showAnalysis && (
                        <div className={styles.filterWrapper} ref={filterRef}>
                            <button className={styles.filterBtn} onClick={() => setIsFilterOpen(!isFilterOpen)}>
                                <Filter size={18} /><span>Filtros ({selectedMounts.length})</span>
                            </button>
                            {isFilterOpen && (
                                <div className={styles.filterMenu}>
                                    <div className={styles.filterHeader}>
                                        <span className={styles.filterTitle}>Puntos de Montaje</span>
                                        <div className={styles.filterActions}>
                                            <button onClick={hideSnaps} className={styles.tinyBtn}>No Snaps</button>
                                            <button onClick={() => toggleAll(true)} className={styles.tinyBtn}>Todos</button>
                                            <button onClick={() => toggleAll(false)} className={styles.tinyBtn}>Nada</button>
                                        </div>
                                    </div>
                                    <div className={styles.filterList}>
                                        {allMounts.map(mount => (
                                            <label key={mount} className={styles.checkboxLabel}>
                                                <input type="checkbox" checked={selectedMounts.includes(mount)} onChange={() => toggleMount(mount)} />
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{mount}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* BOTÓN DE ANÁLISIS */}
                    <button onClick={() => setShowAnalysis(!showAnalysis)} className={`${styles.actionBtn} ${showAnalysis ? styles.activeBtn : ''}`}>
                        <BarChart2 size={18} />{showAnalysis ? 'Ver Actual' : 'Comparar / Histórico'}
                    </button>

                    {/* BOTÓN DE REFRESCAR */}
                    <button onClick={fetchDiskData} disabled={loading} className={styles.refreshBtn}>
                        <RefreshCw size={18} className={loading ? styles.spin : ''} /> Refrescar
                    </button>
                </div>
            </div>

            {!showAnalysis ? (
                <div className={styles.contentCard}>
                    {loading && disks.length === 0 ? (
                        <div className={styles.loadingState}><RefreshCw size={30} className={styles.spin} style={{ marginBottom: 10, opacity: 0.5 }} /><p>Buscando último paquete...</p></div>
                    ) : disks.length === 0 ? (
                        <div className={styles.emptyState}><Database size={40} style={{ marginBottom: 15, opacity: 0.4 }} /><p className={styles.emptyTitle}>Sin datos</p><p className={styles.emptyDesc}>Ejecuta el script actualizado en <b>{serverIp}</b>.</p></div>
                    ) : (
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead className={styles.tableHead}>
                                    <tr>
                                        <th style={{ width: '15%' }}>Fecha Ejecución</th>
                                        <th style={{ width: '20%' }}>Filesystem</th>
                                        <th style={{ width: '10%' }}>Tamaño</th>
                                        <th style={{ width: '10%' }}>Usado</th>
                                        <th style={{ width: '10%' }}>Disponible</th>
                                        <th style={{ width: '25%' }}>Uso %</th>
                                        <th style={{ width: '10%' }}>Montaje</th>
                                    </tr>
                                </thead>
                                <tbody className={styles.tableBody}>
                                    {displayedDisks.length === 0 ? (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Filtros activos ocultan todo. Revisa los filtros.</td></tr>
                                    ) : displayedDisks.map((disk) => {
                                        const color = getStatusColor(disk.use_percent);
                                        return (
                                            <tr key={disk.id}>
                                                <td className={styles.dateCell}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} color="#94a3b8" />{formatRunDate(disk.created_at)}</div></td>
                                                <td className={styles.filesystemCell}>{disk.filesystem}</td>
                                                <td>{disk.size}</td>
                                                <td className={styles.usedCell}>{disk.used}</td>
                                                <td className={styles.availCell}>{disk.avail}</td>
                                                <td>
                                                    <div className={styles.progressWrapper}>
                                                        <div className={styles.progressTrack}><div className={styles.progressBar} style={{ width: `${disk.use_percent}%`, backgroundColor: color }} /></div>
                                                        <span className={styles.percentText} style={{ color: color }}>{disk.use_percent}%</span>
                                                    </div>
                                                </td>
                                                <td><span className={styles.mountBadge}>{disk.mount_point}</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <DiskAnalysis serverIp={serverIp} />
            )}
        </div>
    );
};

export default ServerDiskView;