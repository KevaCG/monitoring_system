import React, { useState } from 'react';
import styles from './MainLayout.module.css';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';

// Importamos las páginas de los módulos
import DashboardPage from '../../features/dashboard/pages/DashboardPage';
import ServerDiskPage from '../../features/disks/pages/ServerDiskPage';
import StatusPage from '../../features/status/pages/StatusPage';

import type { FilterContextType } from '../../core/types/monitor.types';

const MainLayout: React.FC = () => {
    // Estado inicial del filtro
    const [filterContext, setFilterContext] = useState<FilterContextType>({
        type: 'global',
        value: 'Dashboard'
    });

    const handleFilterSelect = (newFilter: { type: string; value: string }) => {
        // Aseguramos que el tipo coincida
        setFilterContext(newFilter as FilterContextType);
    };

    // Lógica de Renderizado de Contenido
    const renderContent = () => {
        if (filterContext.type === 'server') {
            return <ServerDiskPage serverIp={filterContext.value} />;
        }
        if (filterContext.type === 'status') {
            return <StatusPage />;
        }
        // Por defecto: Dashboard Principal
        return <DashboardPage filterContext={filterContext} />;
    };

    return (
        <div className={styles.layout}>
            {/* Sidebar Izquierdo */}
            <div className={styles.sidebarContainer}>
                <Sidebar
                    filterContext={filterContext}
                    onSelectFilter={handleFilterSelect}
                />
            </div>

            {/* Contenido Principal */}
            <main className={styles.mainContent}>
                {renderContent()}
            </main>

            {/* Panel Derecho */}
            <div className={styles.rightPanelContainer}>
                <RightPanel />
            </div>
        </div>
    );
};

export default MainLayout;