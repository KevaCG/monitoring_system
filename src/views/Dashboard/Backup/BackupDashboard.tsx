import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Database, CheckCircle, Clock,
    HardDrive, Calendar, Activity, AlertTriangle, FileSpreadsheet, TrendingUp, ListFilter
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';
import './BackupDashboard.css';
import type { FilterContextType } from '../../../models/monitor.model';

interface BackupDashboardProps {
    filterContext: FilterContextType;
}

interface BackupRecord {
    id: string;
    server_name: string;
    db_name: string;
    status: string;
    created_at: string;
    start_time?: string;
    end_time?: string;
    duration_seconds: number;
    size_bytes: number;
}

export default function BackupDashboard({ filterContext }: BackupDashboardProps) {
    const [loading, setLoading] = useState(true);
    const [allBackups, setAllBackups] = useState<BackupRecord[]>([]);

    // --- FILTROS ---
    const [dateFilter, setDateFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    const isGlobalView = filterContext.type !== 'backup_detail';
    const selectedKey = isGlobalView ? null : filterContext.value;

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setDateFilter('');
        setStatusFilter('ALL');
    }, [filterContext]);

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('backup_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) throw error;
            if (data) setAllBackups(data);
        } catch (err) {
            console.error("Error fetching backups:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        let data = allBackups;

        if (!isGlobalView) {
            data = data.filter(b => `${b.server_name}-${b.db_name}` === selectedKey);
        }

        if (dateFilter) {
            data = data.filter(b => {
                const utcDateStr = b.start_time || b.created_at;
                if (!utcDateStr) return false;
                const dateObj = new Date(utcDateStr);
                const localYMD = dateObj.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
                return localYMD === dateFilter;
            });
        }

        if (statusFilter !== 'ALL') {
            data = data.filter(b => b.status.toUpperCase().includes(statusFilter));
        }

        return data;
    }, [allBackups, selectedKey, isGlobalView, dateFilter, statusFilter]);

    const chartData = useMemo(() => {
        const data = [...filteredData].reverse().slice(-30);
        return data.map(item => ({
            date: new Date(item.start_time || item.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }),
            durationMin: parseFloat((item.duration_seconds / 60).toFixed(1)),
            sizeGB: parseFloat((item.size_bytes / (1024 * 1024 * 1024)).toFixed(2)),
        }));
    }, [filteredData]);

    const currentEntity = useMemo(() => {
        if (!filteredData.length && !isGlobalView) return { db: 'Desconocido', server: 'Desconocido' };
        if (isGlobalView) return { db: 'Global', server: 'Todos los sistemas' };
        const ref = allBackups.find(b => `${b.server_name}-${b.db_name}` === selectedKey);
        return ref ? { db: ref.db_name, server: ref.server_name } : { db: '...', server: '...' };
    }, [filteredData, isGlobalView, allBackups, selectedKey]);

    const stats = useMemo(() => {
        const total = filteredData.length;
        const success = filteredData.filter(b => b.status.toUpperCase().includes('SUCCESS')).length;
        const failed = filteredData.filter(b => b.status.toUpperCase().includes('FAIL')).length;
        const running = filteredData.filter(b => b.status.toUpperCase().includes('RUNNING')).length;

        const latestRecord = filteredData.length > 0 ? filteredData[0] : null;
        let currentStatusLabel = "SIN DATOS";
        let currentStatusClass = "neutral";

        if (latestRecord) {
            const s = latestRecord.status.toUpperCase();
            if (s.includes('RUNNING')) { currentStatusLabel = "EJECUTANDO"; currentStatusClass = "running"; }
            else if (s.includes('FAIL')) { currentStatusLabel = "ERROR"; currentStatusClass = "failed"; }
            else { currentStatusLabel = "OPERATIVO"; currentStatusClass = "success"; }
        }
        return { total, success, failed, running, currentStatusLabel, currentStatusClass };
    }, [filteredData]);

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });
    };
    const formatTimeOnly = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true });
    };
    const getLocalDatePart = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
    };
    const getLocalTimePart = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };

    const formatBytes = (bytes: number) => {
        if (!bytes) return '-';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
    };
    const formatDuration = (seconds: number) => {
        if (!seconds) return '-';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };
    const getStatusBadge = (status: string) => {
        const s = status.toUpperCase();
        if (s.includes('SUCCESS')) return <span className="status-badge badge-success">EXITOSO</span>;
        if (s.includes('FAIL')) return <span className="status-badge badge-failed">FALLIDO</span>;
        if (s.includes('RUNNING')) return <span className="status-badge badge-running">EN CURSO</span>;
        return <span className="status-badge">{status}</span>;
    };

    const translateStatusForExcel = (status: string) => {
        const s = status.toUpperCase();
        if (s.includes('SUCCESS')) return 'Completado';
        if (s.includes('RUNNING')) return 'En ejecución';
        if (s.includes('FAIL')) return 'Fallido';
        return status;
    };

    const exportToExcel = () => {
        if (filteredData.length === 0) return;
        const headers = ["ID", "Servidor", "Base de Datos", "Estado", "Fecha", "Hora Inicio", "Hora Fin", "Duracion", "Tamaño"];

        const rows = filteredData.map(item => [
            item.id,
            item.server_name,
            item.db_name,
            translateStatusForExcel(item.status),
            getLocalDatePart(item.start_time || item.created_at),
            getLocalTimePart(item.start_time || item.created_at),
            getLocalTimePart(item.end_time),
            formatDuration(item.duration_seconds),
            formatBytes(item.size_bytes)
        ]);

        const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Reporte_Backups_${dateFilter || 'general'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div style={{ padding: 40 }}>Cargando datos...</div>;

    return (
        <div className="dashboard-container">
            {/* HEADER */}
            <div className="detail-header">
                <h2>
                    {isGlobalView ? (
                        <> <Activity color="#3b82f6" /> Visión Global de Backups </>
                    ) : (
                        <> <Database color="#3b82f6" /> {currentEntity.db} <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 400 }}> en {currentEntity.server} </span> </>
                    )}
                </h2>
                <p>Historial detallado de rendimiento y crecimiento de almacenamiento.</p>
            </div>

            <div className="kpi-row">
                <div className="kpi-card success"><span className="kpi-label">EXITOSOS</span><span className="kpi-number">{stats.success}</span></div>
                <div className="kpi-card failed"><span className="kpi-label">FALLIDOS</span><span className="kpi-number">{stats.failed}</span></div>
                <div className="kpi-card running"><span className="kpi-label">EN PROGRESO</span><span className="kpi-number">{stats.running}</span></div>
                <div className={`kpi-card ${stats.currentStatusClass}`}>
                    <span className="kpi-label">ESTADO ACTUAL</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {stats.currentStatusClass === 'running' && <Activity className="animate-spin" size={24} />}
                        {stats.currentStatusClass === 'failed' && <AlertTriangle size={24} />}
                        {stats.currentStatusClass === 'success' && <CheckCircle size={24} />}
                        <span className="kpi-number" style={{ fontSize: '1.4rem' }}>{stats.currentStatusLabel}</span>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-card">
                    <div className="chart-header"><h3><TrendingUp size={18} color="#3b82f6" /> Crecimiento de Tamaño (GB)</h3></div>
                    <div style={{ height: 250, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit=" GB" />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="sizeGB" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="chart-card">
                    <div className="chart-header"><h3><Clock size={18} color="#10b981" /> Tiempos de Ejecución (Min)</h3></div>
                    <div style={{ height: 250, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit=" min" />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="durationMin" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="full-table-container">
                <div className="table-header-controls">
                    <div className="table-title-simple">Registro de Ejecuciones</div>
                    <div className="table-actions">

                        {/* SELECTOR DE ESTADO */}
                        <div className="filter-wrapper">
                            <ListFilter size={14} color="#64748b" />
                            <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="ALL">Todos los Estados</option>
                                <option value="SUCCESS">Exitosos</option>
                                <option value="FAIL">Fallidos</option>
                                <option value="RUNNING">En Progreso</option>
                            </select>
                        </div>

                        {/* SELECTOR DE FECHA */}
                        <div className="filter-wrapper">
                            <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: 4 }}>Inicio:</span>
                            <input type="date" className="date-input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                        </div>

                        <button className="btn-excel" onClick={exportToExcel}><FileSpreadsheet size={16} /> Exportar</button>
                    </div>
                </div>
                <div className="table-responsive-wrapper">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                {isGlobalView && <th>Base de Datos / Servidor</th>}
                                <th>Estado</th>
                                <th>Fecha Inicio</th>
                                <th>Inicio / Fin</th>
                                <th>Duración</th>
                                <th>Peso</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((backup) => (
                                <tr key={backup.id}>
                                    {isGlobalView && (
                                        <td>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{backup.db_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{backup.server_name}</div>
                                        </td>
                                    )}
                                    <td>{getStatusBadge(backup.status)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Calendar size={14} color="#94a3b8" />
                                            {formatDateTime(backup.start_time || backup.created_at).split(',')[0]}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            {formatTimeOnly(backup.start_time || backup.created_at)} <br />
                                            {formatTimeOnly(backup.end_time)}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Clock size={14} color="#94a3b8" />
                                            {formatDuration(backup.duration_seconds)}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <HardDrive size={14} color="#94a3b8" />
                                            {formatBytes(backup.size_bytes)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredData.length === 0 && (
                                <tr>
                                    <td colSpan={isGlobalView ? 6 : 5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                        No se encontraron registros con los filtros actuales.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}