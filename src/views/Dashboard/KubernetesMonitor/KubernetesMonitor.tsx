import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Search, RefreshCw, Box, Clock, Layers
} from 'lucide-react';
import styles from './KubernetesMonitor.module.css';

interface Pod {
    id: string;
    pod_name: string;
    namespace: string;
    status: string;
    restarts: number;
    node_ip: string;
    updated_at: string;
    last_restart_at: string | null;
}

export const KubernetesMonitor: React.FC = () => {
    const [pods, setPods] = useState<Pod[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedNamespace, setSelectedNamespace] = useState('ALL'); // <--- NUEVO ESTADO
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [batchId, setBatchId] = useState<string | null>(null);

    const fetchPods = async () => {
        setLoading(true);

        // 1. Obtener ID del lote más reciente
        const { data: latest } = await supabase
            .from('k8s_pods')
            .select('last_batch_id, created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (latest) {
            setBatchId(latest.last_batch_id);

            // 2. Traer solo los pods de ese lote
            const { data } = await supabase
                .from('k8s_pods')
                .select('*')
                .eq('last_batch_id', latest.last_batch_id)
                .order('restarts', { ascending: false });

            if (data) setPods(data);
        }

        setLastUpdate(new Date());
        setLoading(false);
    };

    useEffect(() => {
        fetchPods();
        const interval = setInterval(fetchPods, 60000);
        return () => clearInterval(interval);
    }, []);

    // --- LÓGICA DE FILTRADO ---

    // 1. Obtener lista única de namespaces para el dropdown
    const uniqueNamespaces = Array.from(new Set(pods.map(p => p.namespace))).sort();

    // 2. Filtrar pods
    const filteredPods = pods.filter(p => {
        const matchesSearch = p.pod_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesNamespace = selectedNamespace === 'ALL' || p.namespace === selectedNamespace;
        return matchesSearch && matchesNamespace;
    });

    const getStatusColor = (status: string) => {
        if (['Running', 'Succeeded'].includes(status)) return styles.badgeSuccess;
        if (status === 'Pending') return styles.badgeWarning;
        return styles.badgeError;
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Monitor de Kubernetes</h1>
                    <p className={styles.subtitle}>
                        {batchId ? `Visualizando lote: ${batchId}` : 'Cargando datos del clúster...'}
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <span className={styles.lastUpdate}>
                        <Clock size={14} /> {lastUpdate.toLocaleTimeString()}
                    </span>
                    <button className={styles.refreshBtn} onClick={fetchPods} disabled={loading}>
                        <RefreshCw size={18} className={loading ? styles.spin : ''} />
                    </button>
                </div>
            </div>

            {/* Stats Rápidos */}
            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Pods</span>
                    <strong className={styles.statValue}>{filteredPods.length}</strong> {/* Muestra el total filtrado */}
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Activos</span>
                    <strong className={styles.statValue} style={{ color: '#10b981' }}>
                        {filteredPods.filter(p => ['Running', 'Succeeded'].includes(p.status)).length}
                    </strong>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Problemas</span>
                    <strong className={styles.statValue} style={{ color: '#ef4444' }}>
                        {filteredPods.filter(p => !['Running', 'Succeeded'].includes(p.status)).length}
                    </strong>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Reinicios (Vista)</span>
                    <strong className={styles.statValue} style={{ color: '#f59e0b' }}>
                        {filteredPods.reduce((acc, curr) => acc + curr.restarts, 0)}
                    </strong>
                </div>
            </div>

            {/* Tabla y Filtros */}
            <div className={styles.tableCard}>
                <div className={styles.toolbar}>

                    {/* FILTRO 1: BUSCADOR */}
                    <div className={styles.searchBox}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Buscar pod..."
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* FILTRO 2: SELECTOR DE NAMESPACE (NUEVO) */}
                    <div className={styles.filterBox}>
                        <Layers size={18} className={styles.filterIcon} />
                        <select
                            className={styles.namespaceSelect}
                            value={selectedNamespace}
                            onChange={(e) => setSelectedNamespace(e.target.value)}
                        >
                            <option value="ALL">Todos los Namespaces</option>
                            {uniqueNamespaces.map(ns => (
                                <option key={ns} value={ns}>{ns}</option>
                            ))}
                        </select>
                    </div>

                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Estado</th>
                                <th>Nombre del Pod</th>
                                <th>Namespace</th>
                                <th>Reinicios</th>
                                <th>Último Reinicio</th>
                                <th>IP Nodo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPods.length > 0 ? (
                                filteredPods.map(pod => (
                                    <tr key={pod.id} className={!['Running', 'Succeeded'].includes(pod.status) ? styles.rowError : ''}>
                                        <td><span className={`${styles.badge} ${getStatusColor(pod.status)}`}>{pod.status}</span></td>
                                        <td className={styles.podName}><Box size={16} className={styles.podIcon} />{pod.pod_name}</td>
                                        <td><span className={styles.namespaceTag}>{pod.namespace}</span></td>
                                        <td>
                                            {pod.restarts > 0 ? <span className={styles.textRed}>{pod.restarts}</span> : <span className={styles.textGray}>0</span>}
                                        </td>
                                        <td className={styles.textSm}>
                                            {pod.last_restart_at ? new Date(pod.last_restart_at).toLocaleString() : '-'}
                                        </td>
                                        <td className={styles.mono}>{pod.node_ip}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className={styles.emptyState}>
                                        No se encontraron pods con estos filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};