import { supabase } from '../lib/supabase';
import type { ZabbixDashboardResponse, ServerNode } from '../models/zabbix.types';

// Nueva interfaz para el historial
export interface ExecutionRecord {
    execution_id: string;
    created_at: string;
}

// 1. Obtener lista de ejecuciones pasadas (para el select)
export const getExecutionHistory = async (): Promise<ExecutionRecord[]> => {
    const { data, error } = await supabase
        .from('distinct_executions') // Usamos la Vista que creamos (o select distinct directo)
        .select('*')
        .limit(20); // Últimas 20 ejecuciones

    // Si no creaste la vista SQL, usa este query alternativo en JS:
    /*
    const { data } = await supabase
       .from('zabbix_metrics')
       .select('execution_id, created_at')
       .order('created_at', { ascending: false });
       // Aquí tendrías que filtrar duplicados manualmente en JS
    */

    if (error) {
        console.error("Error fetching history:", error);
        return [];
    }
    return data || [];
};

// 2. Obtener métricas (del presente o del pasado)
export const fetchServerMetrics = async (executionId?: string): Promise<ZabbixDashboardResponse | null> => {
    try {
        let query = supabase.from('zabbix_metrics').select('*');

        if (executionId) {
            // SI hay ID: Traemos ESE momento específico del pasado
            query = query.eq('execution_id', executionId);
        } else {
            // NO hay ID: Traemos la ÚLTIMA ejecución registrada
            // Primero averiguamos cuál es el último ID
            const { data: lastExec } = await supabase
                .from('zabbix_metrics')
                .select('execution_id')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (lastExec) {
                query = query.eq('execution_id', lastExec.execution_id);
            }
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data || data.length === 0) return null;

        // --- Transformación (Igual que antes) ---
        const groupedResponse: ZabbixDashboardResponse = {};

        data.forEach((row: any) => {
            const group = row.group_name || 'Sin Grupo';
            if (!groupedResponse[group]) groupedResponse[group] = [];

            // Cálculos de RAM
            const totalRAM = parseFloat(row.ram_total || "0");
            const availRAM = parseFloat(row.ram_available || "0");
            let ramUsagePercent = "0";
            if (totalRAM > 0) {
                const used = totalRAM - availRAM;
                ramUsagePercent = ((used / totalRAM) * 100).toFixed(2);
            }

            const serverNode: ServerNode = {
                name: row.host_name,
                status: row.status as 'ok' | 'critical',

                createdAt: row.created_at,

                metrics: {
                    techName: row.tech_name,
                    cpu: row.cpu_usage?.toString() || "0",
                    memPused: ramUsagePercent,
                    memAvail: row.ram_available ? `${row.ram_available} GB` : "0 GB",
                    memTotal: row.ram_total ? `${row.ram_total} GB` : "0 GB",
                    load1: row.load_1m?.toString() || "0",
                    load5: "0",
                    load15: "0",
                    processes: row.processes?.toString() || "0"
                }
            };
            groupedResponse[group].push(serverNode);
        });

        return groupedResponse;

    } catch (error) {
        console.error("Error conectando a Supabase:", error);
        return null;
    }
};