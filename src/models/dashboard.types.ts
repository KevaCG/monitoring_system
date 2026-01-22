export interface ChartDataPoint {
    time: string;
    tests: number;
    cpu: number;
}

export interface GlobalStats {
    tests: {
        totalToday: number;
        failedToday: number;
        successRate: number;
    };
    servers: {
        total: number;
        critical: number;
        topConsumerName: string;
        topConsumerValue: number;
    };
    backups: {
        total24h: number;
        failed24h: number;
        totalSizeGB: string;
    };
    disks: {
        total: number;
        critical: number;
    };
    // NUEVO: KUBERNETES
    kubernetes: {
        total: number;
        running: number;
        failed: number;
        restarts: number;
    };
    alerts: Array<{
        id: string;
        type: 'test' | 'server' | 'backup' | 'disk' | 'k8s';
        message: string;
        severity: 'critical' | 'warning';
        timestamp: string;
    }>;
    chartHistory: ChartDataPoint[];
}