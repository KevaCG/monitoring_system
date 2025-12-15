import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import DashboardView from '../components/DashboardView'; // Antes DashboardUI
import CorrectionModal from '../components/CorrectionModal';
import type { FilterContextType } from '../../../core/types/monitor.types';

interface DashboardPageProps {
    filterContext: FilterContextType;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ filterContext }) => {

    // NOTA: Se eliminó la lógica de redirección a ServerDiskView/StatusPage.
    // Esa responsabilidad ahora pertenece a MainLayout.tsx.

    const [data, setData] = useState<any[]>([]);
    const [rawDataGlobal, setRawDataGlobal] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, ok: 0, error: 0, avgTimeLast4: '0s' });
    const [chartData, setChartData] = useState<any[]>([]);
    const [barData, setBarData] = useState<any[]>([]);
    const [pieData, setPieData] = useState<any[]>([]);

    const [selectedRun, setSelectedRun] = useState<any>(null);
    const [selectedErrorToEdit, setSelectedErrorToEdit] = useState<any>(null);
    const [correctionComment, setCorrectionComment] = useState('');
    const [isSavingCorrection, setIsSavingCorrection] = useState(false);

    // --- Lógica de Procesamiento ---
    const processStats = (allData: any[]) => {
        let filtered = allData.map(d => {
            let displayStatus = d.estado;
            // Si es error pero está corregido, visualmente es OK
            if (d.estado === 'ERROR' && d.estado_correccion === 'CORREGIDO') {
                displayStatus = 'OK';
            }
            return { ...d, displayStatus };
        });

        switch (filterContext.type) {
            case 'project': filtered = filtered.filter((d) => d.proyecto === filterContext.value); break;
            case 'client': filtered = filtered.filter((d) => d.cliente === filterContext.value); break;
            case 'canal': filtered = filtered.filter((d) => d.canal === filterContext.value); break;
            case 'flow': filtered = filtered.filter((d) => d.sistema === filterContext.value); break;
            default: break;
        }

        setData(filtered);

        const now = new Date();
        const todayString = now.toLocaleDateString('en-CA');
        const todayData = filtered.filter((d: any) => new Date(d.created_at).toLocaleDateString('en-CA') === todayString);

        const totalOk = todayData.filter((d: any) => d.displayStatus?.toUpperCase() === 'OK').length;
        const totalError = todayData.filter((d: any) => d.displayStatus?.toUpperCase() === 'ERROR').length;

        const last4 = filtered.slice(0, 4);
        let avgTimeFormatted = '0s';
        if (last4.length > 0) {
            const totalDuration = last4.reduce((acc: number, curr: any) => acc + (Number(curr.duracion_ms) || 0), 0);
            const avgMs = totalDuration / last4.length;
            avgTimeFormatted = (avgMs / 1000).toFixed(2) + 's';
        }
        setStats({ total: todayData.length, ok: totalOk, error: totalError, avgTimeLast4: avgTimeFormatted });

        const chartSource = [...filtered].reverse().slice(-20);
        const visualChartData = chartSource.map((d: any) => ({
            name: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            visualHeight: d.displayStatus === 'ERROR' ? 0 : Number((d.duracion_ms / 1000).toFixed(2)),
            realTime: Number((d.duracion_ms / 1000).toFixed(2)),
            status: d.displayStatus
        }));
        setChartData(visualChartData);

        const groupedBySystem: any = {};
        filtered.forEach((d: any) => {
            const systemName = d.sistema || 'Desconocido';
            if (!groupedBySystem[systemName]) groupedBySystem[systemName] = 0;
            groupedBySystem[systemName]++;
        });
        setBarData(Object.keys(groupedBySystem).map(sys => ({ name: sys, val: groupedBySystem[sys] })));

        const globalOk = filtered.filter((d: any) => d.displayStatus?.toUpperCase() === 'OK').length;
        const globalError = filtered.filter((d: any) => d.displayStatus?.toUpperCase() === 'ERROR').length;
        setPieData([{ name: 'Exitosos', value: globalOk }, { name: 'Fallidos', value: globalError }]);
    };

    // --- Fetching ---
    const fetchData = async () => {
        const { data: result, error } = await supabase
            .from('monitoreos')
            .select('*, estado_correccion, comentario_correccion')
            .order('created_at', { ascending: false });

        if (error || !result) return;

        setRawDataGlobal(result);
        processStats(result);
    };

    // --- Corrección ---
    const handleCorrection = async () => {
        if (!selectedErrorToEdit || isSavingCorrection) return;

        setIsSavingCorrection(true);

        const { error } = await supabase
            .from('monitoreos')
            .update({
                estado_correccion: 'CORREGIDO',
                comentario_correccion: correctionComment,
            })
            .eq('id', selectedErrorToEdit.id);

        setIsSavingCorrection(false);

        if (error) {
            console.error("Error al actualizar corrección:", error);
            alert("No se pudo guardar la corrección.");
        } else {
            fetchData(); // Recarga forzada para actualizar UI
            setSelectedErrorToEdit(null);
            setCorrectionComment('');
        }
    };

    // --- Efectos ---
    useEffect(() => {
        // Carga inicial
        fetchData();

        // Suscripción Realtime (Para todo evento: INSERT, UPDATE)
        const channel = supabase.channel('dashboard-page-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'monitoreos'
                },
                (payload) => {
                    console.log('Cambio en tiempo real detectado:', payload);
                    fetchData();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [filterContext.type]); // Recargar si cambia el contexto mayor

    useEffect(() => {
        if (rawDataGlobal.length > 0) {
            processStats(rawDataGlobal);
        }
    }, [filterContext, rawDataGlobal]);

    return (
        <>
            <DashboardView
                filterContext={filterContext}
                data={data}
                stats={stats}
                chartData={chartData}
                barData={barData}
                pieData={pieData}
                setSelectedRun={setSelectedRun}
                setSelectedErrorToEdit={setSelectedErrorToEdit}
                selectedRun={selectedRun}
            />

            <CorrectionModal
                selectedErrorToEdit={selectedErrorToEdit}
                setSelectedErrorToEdit={setSelectedErrorToEdit}
                correctionComment={correctionComment}
                setCorrectionComment={setCorrectionComment}
                isSavingCorrection={isSavingCorrection}
                handleCorrection={handleCorrection}
            />
        </>
    );
};

export default DashboardPage;