import React, { useEffect, useState } from 'react';
import { fetchGlobalStats } from '../../../services/globalDashboardService';
import type { GlobalStats } from '../../../models/dashboard.types';
import {
    Activity, Server, Database, HardDrive,
    TrendingUp, CheckCircle, AlertTriangle,
    Calendar, HelpCircle, Clock, Box
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import styles from './GlobalOverview.module.css';

interface Props {
    onNavigate: (viewName: string) => void;
}

export const GlobalOverview: React.FC<Props> = ({ onNavigate }) => {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
    const [showScoreHelp, setShowScoreHelp] = useState(false);

    useEffect(() => {
        fetchGlobalStats().then(data => {
            setStats(data);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className={styles.loading}>Cargando panel de control...</div>;
    if (!stats) return <div className={styles.error}>No se pudieron cargar los datos.</div>;

    // --- 1. CÁLCULO DE SALUD (GRANULAR) ---
    const calculateHealth = () => {
        const penaltyTests = stats.tests.failedToday * 2;
        const penaltyServers = stats.servers.critical * 10;
        const penaltyBackups = stats.backups.failed24h * 5;
        // Penalización por pods caídos
        const penaltyK8s = stats.kubernetes.failed * 5;

        const totalPenalty = penaltyTests + penaltyServers + penaltyBackups + penaltyK8s;
        const score = Math.max(0, 100 - totalPenalty);

        let status = 'Desconocido';
        let color = '#94a3b8';

        if (score >= 95) { status = 'Excelente'; color = '#10b981'; }
        else if (score >= 80) { status = 'Estable'; color = '#3b82f6'; }
        else if (score >= 60) { status = 'Lento'; color = '#f59e0b'; }
        else if (score >= 40) { status = 'Inestable'; color = '#f97316'; }
        else { status = 'Crítico'; color = '#ef4444'; }

        return { score, status, color, penaltyTests, penaltyServers, penaltyBackups, penaltyK8s };
    };

    const { score, status, color, penaltyTests, penaltyServers, penaltyBackups, penaltyK8s } = calculateHealth();

    const gaugeData = [
        { name: 'Score', value: score, color: color },
        { name: 'Rest', value: 100 - score, color: '#f1f5f9' }
    ];

    // --- 2. PARSEO INTELIGENTE DE ALERTAS ---
    const parseAlertContent = (alert: any) => {
        if (alert.type === 'server') {
            const cpuMatch = alert.message.match(/CPU: ([\d.]+)%/);
            const ramMatch = alert.message.match(/RAM: ([\d.]+)%/);
            const hostMatch = alert.message.match(/en (.*?) \(/);

            return {
                isParsed: true,
                cpu: cpuMatch ? cpuMatch[1] : null,
                ram: ramMatch ? ramMatch[1] : null,
                host: hostMatch ? hostMatch[1] : 'Servidor',
                raw: alert.message
            };
        }
        return { isParsed: false, raw: alert.message };
    };

    return (
        <div className={styles.container}>

            {/* HEADER */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Panel de Control</h1>
                    <p className={styles.subtitle}>Resumen ejecutivo de operaciones</p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.datePill}>
                        <Calendar size={14} />
                        <span style={{ textTransform: 'capitalize' }}>
                            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* KPI GRID (5 Tarjetas) */}
            <div className={styles.kpiGrid}>
                {/* 1. Tests */}
                <div className={styles.card} onClick={() => onNavigate('Dashboard')}>
                    <div className={styles.cardTop}>
                        <div className={`${styles.iconCircle} ${styles.blue}`}><Activity size={20} /></div>
                        <span className={styles.cardLabel}>Pruebas E2E</span>
                    </div>
                    <div className={styles.cardMain}>
                        <span className={styles.bigValue}>{stats.tests.totalToday}</span>
                    </div>
                    <div className={styles.cardFooter}>
                        <span className={stats.tests.failedToday > 0 ? styles.textRed : styles.textGreen}>
                            {stats.tests.failedToday > 0 ? `${stats.tests.failedToday} Fallidas` : '100% Éxito'}
                        </span>
                    </div>
                </div>

                {/* 2. Servers */}
                <div className={styles.card} onClick={() => onNavigate('ServerMonitor')}>
                    <div className={styles.cardTop}>
                        <div className={`${styles.iconCircle} ${styles.green}`}><Server size={20} /></div>
                        <span className={styles.cardLabel}>Servidores</span>
                    </div>
                    <div className={styles.cardMain}>
                        <span className={styles.bigValue}>{stats.servers.total}</span>
                        <span className={styles.unit}>Activos</span>
                    </div>
                    <div className={styles.cardFooter}>
                        {stats.servers.critical > 0
                            ? <span className={styles.textRed}>{stats.servers.critical} Críticos</span>
                            : <span className={styles.textGreen}>Carga estable</span>}
                    </div>
                </div>

                {/* 3. Backups */}
                <div className={styles.card} onClick={() => onNavigate('Backup')}>
                    <div className={styles.cardTop}>
                        <div className={`${styles.iconCircle} ${styles.purple}`}><Database size={20} /></div>
                        <span className={styles.cardLabel}>Backups 24h</span>
                    </div>
                    <div className={styles.cardMain}>
                        <span className={styles.bigValue}>{stats.backups.total24h}</span>
                        <span className={styles.unit}>Total</span>
                    </div>
                    <div className={styles.cardFooter}>
                        {stats.backups.failed24h > 0
                            ? <span className={styles.textRed}>{stats.backups.failed24h} Fallidos</span>
                            : <span className={styles.textGreen}>Todo OK</span>}
                    </div>
                </div>

                {/* 4. Storage */}
                <div className={styles.card} onClick={() => onNavigate('Discos')}>
                    <div className={styles.cardTop}>
                        <div className={`${styles.iconCircle} ${styles.gray}`}><HardDrive size={20} /></div>
                        <span className={styles.cardLabel}>Almacenamiento</span>
                    </div>
                    <div className={styles.cardMain}>
                        <span className={styles.bigValue}>{stats.disks.total}</span>
                        <span className={styles.unit}>Vols. Clave</span>
                    </div>
                    <div className={styles.cardFooter}>
                        {stats.disks.critical > 0
                            ? <span className={styles.textRed}>{stats.disks.critical} Críticos ({'>'}90%)</span>
                            : <span className={styles.textGreen}>Espacio saludable</span>}
                    </div>
                </div>

                {/* 5. KUBERNETES */}
                <div className={styles.card} onClick={() => onNavigate('KubernetesMonitor')}>
                    <div className={styles.cardTop}>
                        <div className={styles.iconCircle} style={{ background: '#e0f2fe', color: '#0ea5e9' }}>
                            <Box size={20} />
                        </div>
                        <span className={styles.cardLabel}>Kubernetes</span>
                    </div>
                    <div className={styles.cardMain}>
                        <span className={styles.bigValue}>{stats.kubernetes.total}</span>
                        <span className={styles.unit}>Pods</span>
                    </div>
                    <div className={styles.cardFooter}>
                        {stats.kubernetes.failed > 0
                            ? <span className={styles.textRed}>{stats.kubernetes.failed} Problemas</span>
                            : <span className={styles.textGreen}>Cluster Saludable</span>}
                    </div>
                </div>
            </div>

            {/* SECCIÓN PRINCIPAL: GRÁFICAS */}
            <div className={styles.mainSection}>

                {/* 1. GRÁFICA TRIPLE (Tests, CPU, Pods) */}
                <div className={`${styles.card} ${styles.chartCard}`}>
                    <div className={styles.cardHeader}>
                        <h3>Actividad del Sistema (Hoy)</h3>
                        <div className={styles.legend}>
                            <span className={styles.legendItem}><span className={styles.dotBlue}></span>Tests</span>
                            <span className={styles.legendItem}><span className={styles.dotPurple}></span>CPU %</span>
                            <span className={styles.legendItem}><span className={styles.dotCyan} style={{ background: '#06b6d4' }}></span>Pods Activos</span>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={stats.chartHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTests" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPods" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.1} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />

                                {/* EJE IZQUIERDO: Tests y Pods */}
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />

                                {/* EJE DERECHO: CPU % */}
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} unit="%" />

                                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />

                                <Area yAxisId="left" type="monotone" dataKey="tests" name="Tests" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTests)" />
                                <Area yAxisId="right" type="monotone" dataKey="cpu" name="CPU" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorLoad)" />
                                <Area yAxisId="left" type="monotone" dataKey="pods" name="Pods" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorPods)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. SALUD OPERATIVA */}
                <div className={`${styles.card} ${styles.scoreCard}`}>
                    <div className={styles.cardHeader}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <h3>Salud Operativa</h3>
                            <HelpCircle
                                size={18}
                                className={styles.helpIcon}
                                onClick={() => setShowScoreHelp(true)}
                            />
                        </div>
                    </div>
                    <div className={styles.gaugeContainer}>
                        <div className={styles.gaugeChart}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={gaugeData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="none"
                                        paddingAngle={5}
                                        cornerRadius={10}
                                    >
                                        {gaugeData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className={styles.gaugeCenter}>
                                <span className={styles.scoreNum} style={{ color: color }}>{score}</span>
                                <span className={styles.scoreText}>/ 100</span>
                            </div>
                        </div>
                        <div className={styles.scoreSummary}>
                            <p>El sistema se encuentra <strong style={{ color: color }}>{status}</strong>.</p>

                            <div className={styles.miniBar}>
                                <span>Carga Máx (Srv)</span>
                                <div className={styles.barBg}>
                                    <div
                                        style={{
                                            width: `${Math.min(stats.servers.topConsumerValue, 100)}%`,
                                            background: stats.servers.topConsumerValue > 90 ? '#ef4444' : '#3b82f6'
                                        }}
                                        className={styles.barFill}>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ALERTAS */}
            <div className={styles.sectionHeader}>Alertas Recientes</div>
            <div className={styles.alertsGrid}>
                {stats.alerts.length === 0 ? (
                    <div className={styles.emptyAlert}>
                        <CheckCircle size={24} color="#10b981" /><span>Todo opera con normalidad.</span>
                    </div>
                ) : (
                    stats.alerts.slice(0, 10).map(alert => (
                        <div
                            key={alert.id}
                            className={`${styles.alertCard} ${alert.severity === 'critical' ? styles.critical : styles.warning}`}
                            onClick={() => setSelectedAlert(alert)}
                        >
                            <div className={`${styles.alertIconBox} ${alert.severity === 'critical' ? styles.bgRed : styles.bgOrange}`}>
                                {alert.type === 'server' && <Server size={24} />}
                                {alert.type === 'backup' && <Database size={24} />}
                                {alert.type === 'test' && <Activity size={24} />}
                                {alert.type === 'k8s' && <Box size={24} />}
                                {alert.type === 'disk' && <HardDrive size={24} />}
                            </div>
                            <div className={styles.alertContent}>
                                <div className={styles.alertHeaderRow}>
                                    <span className={styles.alertTypeLabel}>{alert.type === 'test' ? 'E2E TEST' : alert.type}</span>
                                    <span className={styles.alertTime}>
                                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <span className={styles.alertMsg}>{alert.message}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODALES (Detalle y Score) */}
            {selectedAlert && (
                <div className={styles.modalOverlay} onClick={() => setSelectedAlert(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <div className={`${styles.modalIconBig} ${selectedAlert.severity === 'critical' ? styles.bgRed : styles.bgOrange}`}>
                                <AlertTriangle size={32} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 className={styles.modalTitle}>Detalle de Alerta</h2>
                                <span className={styles.modalDate}>
                                    <Clock size={14} style={{ marginRight: 5 }} />
                                    {new Date(selectedAlert.timestamp).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'medium' })}
                                </span>
                            </div>
                        </div>

                        {(() => {
                            const parsed = parseAlertContent(selectedAlert);
                            if (parsed.isParsed) {
                                return (
                                    <div className={styles.statsRow}>
                                        <div className={styles.statBox}>
                                            <span className={styles.statLabel}>Servidor</span>
                                            <strong className={styles.statValue} style={{ fontSize: '1rem' }}>{parsed.host}</strong>
                                        </div>
                                        {parsed.cpu && (
                                            <div className={styles.statBox}>
                                                <span className={styles.statLabel}>CPU</span>
                                                <strong className={styles.statValue} style={{ color: '#ef4444' }}>{parsed.cpu}%</strong>
                                            </div>
                                        )}
                                        {parsed.ram && (
                                            <div className={styles.statBox}>
                                                <span className={styles.statLabel}>RAM</span>
                                                <strong className={styles.statValue} style={{ color: '#f59e0b' }}>{parsed.ram}%</strong>
                                            </div>
                                        )}
                                    </div>
                                );
                            } else {
                                return <div className={styles.modalBody}>{selectedAlert.message}</div>;
                            }
                        })()}

                        <div className={styles.rawMessage}>
                            <strong>Mensaje del sistema:</strong>
                            <p>{selectedAlert.message}</p>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 5 }}>ID: {selectedAlert.id}</p>
                        </div>
                        <button className={styles.closeBtn} onClick={() => setSelectedAlert(null)}>Cerrar</button>
                    </div>
                </div>
            )}

            {showScoreHelp && (
                <div className={styles.scoreModalOverlay} onClick={() => setShowScoreHelp(false)}>
                    <div className={styles.scoreModal} onClick={e => e.stopPropagation()}>
                        <h3><TrendingUp size={20} /> Cálculo de Salud</h3>
                        <p>El puntaje inicia en <strong>100</strong> y se reduce según incidentes:</p>

                        <div className={styles.scoreRow}><span className={styles.scoreLabel}>Base Inicial</span><span className={`${styles.scoreValue} ${styles.base}`}>100 Pts</span></div>
                        <div className={styles.scoreRow}><span className={styles.scoreLabel}>Tests Fallidos (-2 c/u)</span><span className={styles.scoreValue}>-{penaltyTests}</span></div>
                        <div className={styles.scoreRow}><span className={styles.scoreLabel}>Srv Críticos (-10 c/u)</span><span className={styles.scoreValue}>-{penaltyServers}</span></div>
                        <div className={styles.scoreRow}><span className={styles.scoreLabel}>Backups Fallidos (-5 c/u)</span><span className={styles.scoreValue}>-{penaltyBackups}</span></div>
                        <div className={styles.scoreRow}><span className={styles.scoreLabel}>Pods Caídos (-5 c/u)</span><span className={styles.scoreValue}>-{penaltyK8s}</span></div>

                        <div style={{ marginTop: 15, paddingTop: 10, borderTop: '2px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                            <strong>Estado: <span style={{ color: color }}>{status}</span></strong>
                            <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>{score}</strong>
                        </div>
                        <button className={styles.closeScoreBtn} onClick={() => setShowScoreHelp(false)}>Entendido</button>
                    </div>
                </div>
            )}
        </div>
    );
};