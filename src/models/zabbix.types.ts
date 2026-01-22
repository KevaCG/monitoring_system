export interface ServerMetrics {
    techName: string;
    cpu: string;
    memPused: string;
    memAvail: string;
    memTotal: string;
    load1: string;
    load5: string;
    load15: string;
    processes: string;
}

export interface ServerNode {
    name: string;
    metrics: ServerMetrics;
    status: 'ok' | 'critical';
    createdAt: string;
}

export interface ZabbixDashboardResponse {
    [groupName: string]: ServerNode[];
}