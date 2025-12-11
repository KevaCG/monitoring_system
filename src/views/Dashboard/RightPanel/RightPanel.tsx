import React, { useEffect, useState } from 'react';
import { Bell, AlertTriangle, Play, Zap, User, Briefcase, Key, Activity, CheckCircle, ChevronDown, ChevronRight, Loader } from 'lucide-react';
import styles from './RightPanel.module.css';
import { supabase } from '../../../lib/supabase';

const RightPanel: React.FC = () => {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [isAlertsOpen, setIsAlertsOpen] = useState(true);

    const [liveRun, setLiveRun] = useState<any>(null);
    const [showExecutionModal, setShowExecutionModal] = useState(false);

    // Nuevo estado para el rol
    const [userRole, setUserRole] = useState("Usuario");

    // 1. Efecto para obtener el Rol del usuario
    useEffect(() => {
        const getUserRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile && profile.role) {
                    setUserRole(profile.role);
                }
            }
        };
        getUserRole();
    }, []);

    // 2. Efecto para datos iniciales y suscripción en tiempo real
    useEffect(() => {
        const fetchInitialData = async () => {
            const { data } = await supabase.from('monitoreos').select('*').eq('estado', 'ERROR').order('created_at', { ascending: false }).limit(5);
            if (data) setAlerts(data);

            const { data: running } = await supabase.from('monitoreos').select('*').eq('estado', 'RUNNING').limit(1).single();
            if (running) {
                setLiveRun(running);
                setShowExecutionModal(true);
            }
        };
        fetchInitialData();

        const channel = supabase
            .channel('realtime-alerts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'monitoreos' }, (payload: any) => {
                const newData = payload.new;

                if (newData.estado === 'ERROR') {
                    setAlerts((prev) => [newData, ...prev]);
                    if (liveRun?.id === newData.id || liveRun?.id === 'temp') {
                        setLiveRun(null);
                        setShowExecutionModal(false);
                    }
                }
                else if (newData.estado === 'OK') {
                    if (liveRun?.id === newData.id || liveRun?.id === 'temp') {
                        setLiveRun(null);
                        setShowExecutionModal(false);
                    }
                }
                else if (newData.estado === 'RUNNING') {
                    setLiveRun(newData);
                    setShowExecutionModal(true);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [liveRun]);

    const triggerTest = async (testId: string) => {
        if (loadingAction || liveRun) return;

        setLoadingAction(testId);

        setLiveRun({
            id: 'temp',
            sistema: `Iniciando ${testId}...`,
            mensaje: "🚀 Conectando con el servidor de pruebas...",
            estado: 'RUNNING'
        });
        setShowExecutionModal(true);

        console.log(`🚀 Contactando a GitHub Actions para: ${testId}`);

        const token = import.meta.env.VITE_GITHUB_TOKEN;
        const owner = import.meta.env.VITE_REPO_OWNER;
        const repo = import.meta.env.VITE_REPO_NAME;

        try {
            if (!token) throw new Error("Falta Token GitHub");

            await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${token}`,
                },
                body: JSON.stringify({
                    event_type: 'run-cypress',
                    client_payload: { test_suite: testId }
                })
            });
        } catch (error) {
            console.error("Error trigger:", error);
            alert("No se pudo iniciar la prueba. Revisa la consola.");
            setLiveRun(null);
            setShowExecutionModal(false);
        } finally {
            setLoadingAction(null);
        }
    };

    const getTimeAgo = (dateString: string) => {
        const diff = Date.now() - new Date(dateString).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Justo ahora';
        if (mins < 60) return `Hace ${mins} min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `Hace ${hours} h`;
        return 'Hace días';
    };

    const isBusy = loadingAction !== null || liveRun !== null;
    const isAdmin = userRole === 'Administrador';

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Centro de Control</h3>
                <div className={styles.bellIcon}>
                    <Bell size={18} color="#64748b" />
                    {alerts.length > 0 && <div className={styles.badge} />}
                </div>
            </div>

            {showExecutionModal && liveRun && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                            <div style={{ background: '#dcfce7', padding: 15, borderRadius: '50%' }}>
                                <Activity size={32} color="#16a34a" />
                            </div>
                        </div>

                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
                            Ejecutando Prueba
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{liveRun.sistema}</p>

                        <div className={styles.loaderContainer}>
                            <Loader size={40} className={styles.animateSpin} color="#6366f1" />
                        </div>

                        <div className={styles.runStep}>
                            {liveRun.mensaje}
                        </div>

                        <button
                            className={styles.closeButton}
                            onClick={() => setShowExecutionModal(false)}
                            title="Minimizar ventana (la prueba continuará)"
                        >
                            Minimizar ventana
                        </button>
                    </div>
                </div>
            )}

            <div
                className={styles.sectionTitle}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <AlertTriangle size={14} color="#ef4444" />
                    <span>Alertas Recientes</span>
                </div>
                {isAlertsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            {isAlertsOpen && (
                <div className={styles.alertsList}>
                    {alerts.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '20px' }}>
                            <CheckCircle size={24} style={{ marginBottom: 5, color: '#22c55e' }} />
                            <p>Todo opera normal</p>
                        </div>
                    ) : (
                        alerts.map((alert) => (
                            <div key={alert.id} className={`${styles.notifItem} ${styles.notifError}`}>
                                <div className={styles.iconBox} style={{ background: '#fee2e2' }}>
                                    <AlertTriangle size={16} color="#ef4444" />
                                </div>
                                <div className={styles.notifContent}>
                                    <h4 className={styles.notifTitle}>{alert.sistema}</h4>
                                    <p className={styles.notifDesc}>
                                        {alert.mensaje?.replace('FALLO EN: ', '').substring(0, 50)}...
                                    </p>
                                    <span className={styles.time}>{getTimeAgo(alert.created_at)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* SECCIÓN DE EJECUCIÓN MANUAL: Solo visible para Administradores */}
            {isAdmin && (
                <>
                    <div className={styles.sectionTitle} style={{ marginTop: isAlertsOpen ? '0' : '20px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Zap size={14} color="#6366f1" />
                            <span>Ejecución Manual</span>
                        </div>
                    </div>

                    <div className={styles.actionGrid}>

                        <button className={`${styles.actionButton} ${loadingAction === 'Atomic' ? styles.btnLoading : ''}`} onClick={() => triggerTest('Atomic')} disabled={isBusy}>
                            <div className={styles.btnIcon}>
                                <Activity size={16} color={isBusy ? '#94a3b8' : '#6366f1'} />
                                <span>Suite Atomic (Global)</span>
                            </div>
                            {loadingAction !== 'Atomic' && <Play size={12} fill={isBusy ? '#94a3b8' : '#6366f1'} stroke="none" />}
                        </button>

                        <button className={`${styles.actionButton} ${loadingAction === 'Credito' ? styles.btnLoading : ''}`} onClick={() => triggerTest('Credito')} disabled={isBusy}>
                            <div className={styles.btnIcon}>
                                <Briefcase size={16} color={isBusy ? '#94a3b8' : '#22c55e'} />
                                <span>Flujo Solicitud Crédito</span>
                            </div>
                            {loadingAction !== 'Credito' && <Play size={12} fill={isBusy ? '#94a3b8' : '#22c55e'} stroke="none" />}
                        </button>

                        <button className={`${styles.actionButton} ${loadingAction === 'Clave' ? styles.btnLoading : ''}`} onClick={() => triggerTest('Clave')} disabled={isBusy}>
                            <div className={styles.btnIcon}>
                                <Key size={16} color={isBusy ? '#94a3b8' : '#eab308'} />
                                <span>Flujo Clave Registro</span>
                            </div>
                            {loadingAction !== 'Clave' && <Play size={12} fill={isBusy ? '#94a3b8' : '#eab308'} stroke="none" />}
                        </button>

                        <button className={`${styles.actionButton} ${loadingAction === 'Operaciones' ? styles.btnLoading : ''}`} onClick={() => triggerTest('Operaciones')} disabled={isBusy}>
                            <div className={styles.btnIcon}>
                                <Zap size={16} color={isBusy ? '#94a3b8' : '#f97316'} />
                                <span>Canal Operaciones</span>
                            </div>
                            {loadingAction !== 'Operaciones' && <Play size={12} fill={isBusy ? '#94a3b8' : '#f97316'} stroke="none" />}
                        </button>

                        <button className={`${styles.actionButton} ${loadingAction === 'GH' ? styles.btnLoading : ''}`} onClick={() => triggerTest('GH')} disabled={isBusy}>
                            <div className={styles.btnIcon}>
                                <User size={16} color={isBusy ? '#94a3b8' : '#ec4899'} />
                                <span>Gestión Humana</span>
                            </div>
                            {loadingAction !== 'GH' && <Play size={12} fill={isBusy ? '#94a3b8' : '#ec4899'} stroke="none" />}
                        </button>

                    </div>
                </>
            )}
        </div>
    );
};

export default RightPanel;