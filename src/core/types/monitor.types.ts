// 1. Contexto para los Filtros (Sidebar <-> MainLayout <-> Dashboard)
export interface FilterContextType {
    type: 'global' | 'project' | 'client' | 'canal' | 'flow' | 'server' | 'status';
    value: string;
}

// 2. Estructura de datos principal (Fila de la tabla 'monitoreos' en Supabase)
export interface MonitorData {
    id: number;
    created_at: string;
    sistema: string;        // Nombre del flujo o prueba
    cliente?: string;
    canal?: string;
    proyecto?: string;
    estado: 'OK' | 'ERROR' | 'RUNNING' | string;
    duracion_ms: number;
    mensaje: string;        // Log del error o éxito

    // Campos de Auditoría / Corrección
    estado_correccion?: 'PENDIENTE' | 'CORREGIDO' | string;
    comentario_correccion?: string;

    // Campo calculado en el Frontend (para mostrar OK si fue corregido)
    displayStatus?: string;
}

// 3. Interfaz simplificada para la lógica de StatusPage
export interface StatusRun {
    id: string | number;
    sistema: string;
    estado: 'OK' | 'ERROR' | 'RUNNING' | string;
    created_at: string;
    mensaje: string;
    estado_correccion?: string;
    duracion_ms?: number;
}

// 4. Interfaz para los items visuales en StatusPage (las tarjetas)
export interface StatusItem {
    label: string;
    dependencies: string[]; // Nombres de pruebas de las que depende este item
    status: 'OPERACIONAL' | 'ERROR' | 'CARGANDO';
    lastRun: StatusRun | null;
}