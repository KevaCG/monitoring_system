import React, { useState } from 'react';
import Sidebar from './Sidebar/Sidebar';
import RightPanel from './RightPanel/RightPanel';
import MainContent from '../DashboardContent'; // Tu Router inteligente
import { UsersModal } from '../../../components/UsersModal/UsersModal';
import styles from './DashboardLayout.module.css';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import BackupDashboard from '../Backup/BackupDashboard';
import OpsChatbot from '../../../components/Chatbot/OpsChatbot';

import type { FilterContextType } from '../../../models/monitor.model';

const DashboardLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

    const [filterContext, setFilterContext] = useState<FilterContextType>({
        type: 'global',
        value: 'Dashboard'
    });

    const getGridTemplate = () => {
        const left = isSidebarOpen ? '260px' : '0px';
        const right = isRightPanelOpen ? '300px' : '0px';
        return `${left} 1fr ${right}`;
    };

    return (
        <div className={styles.dashboardContainer} style={{ gridTemplateColumns: getGridTemplate() }}>

            {/* --- PANEL IZQUIERDO (SIDEBAR) --- */}
            <aside className={styles.sidebarArea}>
                <div style={{ width: '260px', height: '100%' }}>
                    <Sidebar
                        filterContext={filterContext}
                        onSelectFilter={(val) => setFilterContext(val as FilterContextType)}
                        onOpenUsersModal={() => setIsUsersModalOpen(true)}
                    />
                </div>
            </aside>

            {/* --- ÁREA CENTRAL (CONTENIDO) --- */}
            <main className={styles.mainArea}>
                {/* Barra superior de control de paneles */}
                <div className={styles.toggleBar}>
                    <button className={styles.toggleButton} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                    </button>

                    <span style={{ fontWeight: 'bold', color: '#64748b', fontSize: '0.9rem' }}>
                        VISTA: <span style={{ color: '#6366f1', textTransform: 'uppercase' }}>{filterContext.value}</span>
                    </span>

                    <button className={styles.toggleButton} onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}>
                        {isRightPanelOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                    </button>
                </div>

                {/* Contenedor principal donde se renderizan las vistas */}
                <div className={styles.contentWrapper}>
                    {(filterContext.value === 'Backup' || filterContext.type === 'backup_detail') ? (
                        <BackupDashboard filterContext={filterContext} />
                    ) : (
                        // 👇 AQUÍ ESTÁ EL CAMBIO IMPORTANTE 👇
                        <MainContent
                            filterContext={filterContext}
                            onFilterChange={setFilterContext} // <--- ¡ESTO ES LO QUE FALTABA!
                        />
                    )}
                </div>
            </main>

            {/* --- PANEL DERECHO (MONITOREO) --- */}
            <aside className={styles.rightArea}>
                <div style={{ width: '100%', minWidth: '250px' }}>
                    <RightPanel />
                </div>
            </aside>

            {/* --- MODAL DE USUARIOS --- */}
            {isUsersModalOpen && (
                <UsersModal onClose={() => setIsUsersModalOpen(false)} />
            )}

            {/* --- CHATBOT FLOTANTE --- */}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 9999
            }}>
                <OpsChatbot />
            </div>

        </div>
    );
};

export default DashboardLayout;