import React, { useEffect, useState } from 'react';
import { fetchServerMetrics, getExecutionHistory, type ExecutionRecord } from '../../../services/monitoringService';
import type { ZabbixDashboardResponse, ServerNode } from '../../../models/zabbix.types';
import { X, Server, Activity, Cpu, Calendar, ChevronDown } from 'lucide-react'; // Iconos actualizados
import './ServerMonitor.css';

export const ServerMonitor: React.FC = () => {
    const [data, setData] = useState<ZabbixDashboardResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [history, setHistory] = useState<ExecutionRecord[]>([]);
    const [selectedExecution, setSelectedExecution] = useState<string>(''); // '' = Última
    const [selectedServer, setSelectedServer] = useState<ServerNode | null>(null); // Para el Modal

    // Estado para la fecha que se muestra en el header
    const [displayDate, setDisplayDate] = useState<string>('');

    // 1. Cargar Historial e Inicializar
    useEffect(() => {
        loadHistory();
        loadData(); // Carga la última por defecto

        // Solo auto-refrescamos si estamos viendo "Lo último"
        const interval = setInterval(() => {
            if (selectedExecution === '') loadData();
        }, 30000);
        return () => clearInterval(interval);
    }, [selectedExecution]);

    const loadHistory = async () => {
        const recs = await getExecutionHistory();
        setHistory(recs);
    };

    const loadData = async () => {
        setLoading(true);
        // Si selectedExecution es '', fetchServerMetrics buscará la última auto.
        const metrics = await fetchServerMetrics(selectedExecution || undefined);

        if (metrics) {
            setData(metrics);

            // --- LÓGICA PARA OBTENER LA FECHA REAL ---
            // Tomamos la fecha del primer servidor del primer grupo que encontremos
            // Esto es seguro porque todos los registros de una ejecución tienen la misma fecha
            const firstGroupKey = Object.keys(metrics)[0];
            const firstGroup = metrics[firstGroupKey];

            if (firstGroup && firstGroup.length > 0 && firstGroup[0].createdAt) {
                const dateObj = new Date(firstGroup[0].createdAt);
                // Formato amigable: "19 ene, 10:30 a.m."
                const formattedDate = dateObj.toLocaleString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                setDisplayDate(formattedDate);
            }
        }
        setLoading(false);
    };

    // --- RENDER DEL MODAL ---
    const renderModal = () => {
        if (!selectedServer) return null;
        const m = selectedServer.metrics;

        return (
            <div className="modal-overlay" onClick={() => setSelectedServer(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div>
                            <h2 className="modal-title">{selectedServer.name}</h2>
                            <span className="modal-subtitle">{m.techName}</span>
                        </div>
                        <button className="close-btn" onClick={() => setSelectedServer(null)}><X size={24} /></button>
                    </div>

                    <div className="modal-body">
                        {/* Grid de Detalles */}
                        <div className="modal-grid">
                            <div className="detail-card">
                                <div className="detail-icon cpu"><Cpu size={20} /></div>
                                <div>
                                    <span className="detail-label">CPU Load (1m)</span>
                                    <span className="detail-value">{m.load1}</span>
                                </div>
                            </div>
                            <div className="detail-card">
                                <div className="detail-icon mem"><Activity size={20} /></div>
                                <div>
                                    <span className="detail-label">Procesos</span>
                                    <span className="detail-value">{m.processes}</span>
                                </div>
                            </div>
                            <div className="detail-card">
                                <div className="detail-icon disk"><Server size={20} /></div>
                                <div>
                                    <span className="detail-label">Memoria Total</span>
                                    <span className="detail-value">{m.memTotal}</span>
                                </div>
                            </div>
                        </div>

                        {/* Detalles Técnicos JSON */}
                        <div className="raw-data-box">
                            <h4>Detalles Técnicos</h4>
                            <pre>{JSON.stringify(m, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="monitor-container">
            {/* Header con Filtro */}
            <div className="monitor-header">
                <div>
                    <h2>Estado de Servidores</h2>
                    {/* Indicador de Estado Actualizado */}
                    <div className="live-indicator">
                        <div className={`status-dot ${selectedExecution === '' ? 'pulse' : ''}`}
                            style={{ backgroundColor: selectedExecution === '' ? '#22c55e' : '#f59e0b' }}></div>
                        <span>
                            {selectedExecution === '' ? 'En Vivo • Último registro: ' : 'Histórico • Registro del: '}
                            <strong style={{ color: '#334155', fontWeight: 600 }}>{displayDate || 'Cargando...'}</strong>
                        </span>
                    </div>
                </div>

                {/* SELECTOR DE HISTORIAL ESTILIZADO */}
                <div className="filter-wrapper">
                    <div className="custom-select-container">
                        <Calendar size={16} className="select-icon" />
                        <select
                            value={selectedExecution}
                            onChange={(e) => setSelectedExecution(e.target.value)}
                            className="modern-select"
                        >
                            <option value="">⚡ Ahora (Tiempo Real)</option>
                            {history.map(h => (
                                <option key={h.execution_id} value={h.execution_id}>
                                    {new Date(h.created_at).toLocaleString('es-CO')}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="select-arrow" />
                    </div>
                </div>
            </div>

            {loading && <div className="monitor-loading">Cargando datos...</div>}

            {!loading && data && Object.entries(data).map(([groupName, servers]) => {
                if (!servers || servers.length === 0) return null;
                return (
                    <div key={groupName} className="server-group">
                        <h3 className="group-title"><span className="group-dot"></span> {groupName}</h3>
                        <div className="servers-grid">
                            {servers.map((server) => {
                                const cpuVal = parseFloat(server.metrics.cpu);
                                const ramVal = parseFloat(server.metrics.memPused);

                                // Colores dinámicos
                                let cpuColor = '#22c55e'; if (cpuVal > 60) cpuColor = '#f59e0b'; if (cpuVal > 85) cpuColor = '#ef4444';
                                let ramColor = '#3b82f6'; if (ramVal > 75) ramColor = '#f59e0b'; if (ramVal > 90) ramColor = '#ef4444';

                                return (
                                    <div
                                        key={server.metrics.techName}
                                        className="server-card clickable"
                                        onClick={() => setSelectedServer(server)} // <--- ABRIR MODAL
                                    >
                                        <div className="card-header">
                                            <span className="server-name">{server.name}</span>
                                            <span className={`status-badge ${server.status}`}>{server.status.toUpperCase()}</span>
                                        </div>
                                        <div className="card-body">
                                            {/* CPU */}
                                            <div className="metric-block">
                                                <div className="metric-row"><span>CPU</span><span className="metric-value">{server.metrics.cpu}%</span></div>
                                                <div className="progress-bg"><div className="progress-fill" style={{ width: `${Math.min(cpuVal, 100)}%`, backgroundColor: cpuColor }}></div></div>
                                            </div>
                                            {/* RAM */}
                                            <div className="metric-block">
                                                <div className="metric-row"><span>RAM ({server.metrics.memPused}%)</span><span className="metric-value small">{server.metrics.memAvail} / {server.metrics.memTotal}</span></div>
                                                <div className="progress-bg"><div className="progress-fill" style={{ width: `${Math.min(ramVal, 100)}%`, backgroundColor: ramColor }}></div></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {renderModal()}
        </div>
    );
};