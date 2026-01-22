
export interface FilterContextType {
    // Agrega 'server_monitor' al final de la lista
    type: 'global' | 'status' | 'project' | 'client' | 'canal' | 'flow' | 'server' | 'backup_detail' | 'server_monitor' | 'k8s_monitor';
    value: string;
}

export interface MonitorData {
    id: number;
    created_at: string;
    sistema: string;
    cliente?: string;
    canal?: string;
    proyecto?: string;
    estado: 'OK' | 'ERROR' | 'RUNNING' | string;
    duracion_ms: number;
    mensaje: string;

    estado_correccion?: 'PENDIENTE' | 'CORREGIDO' | string;
    comentario_correccion?: string;

    displayStatus?: string;
}

export interface StatusRun {
    id: string | number;
    sistema: string;
    estado: 'OK' | 'ERROR' | 'RUNNING' | string;
    created_at: string;
    mensaje: string;
    estado_correccion?: string;
    duracion_ms?: number;
}

export interface StatusItem {
    label: string;
    dependencies: string[];
    status: 'OPERACIONAL' | 'ERROR' | 'CARGANDO';
    lastRun: StatusRun | null;
}

export interface DiskData {
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

export interface BatchInfo {
    batch_id: string;
    created_at: string;
}