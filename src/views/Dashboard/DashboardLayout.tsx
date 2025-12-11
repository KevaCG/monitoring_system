import React, { useState } from 'react';
import Sidebar from './Sidebar/Sidebar';
import RightPanel from './RightPanel/RightPanel';
import MainContent from './MainContent/MainContent';
import { UsersModal } from '../../components/UsersModal/UsersModal';
import styles from './DashboardLayout.module.css';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';

// 1. ACTUALIZACIÓN: Agregamos 'server' a los tipos permitidos para que el dashboard sepa manejar las IPs
export type FilterType = 'flow' | 'global' | 'project' | 'client' | 'canal' | 'server';

interface FilterContextState {
    type: FilterType;
    value: string;
}

const DashboardLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

    // Inicializamos con el Dashboard Global por defecto
    const [filterContext, setFilterContext] = useState<FilterContextState>({
        type: 'global',
        value: 'Dashboard'
    });

    // Calcula el grid dinámicamente según si los paneles están abiertos o cerrados
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
                        // Actualizamos el contexto cuando el usuario hace clic en el menú
                        onSelectFilter={(val) => setFilterContext(val as FilterContextState)}
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
                    <MainContent filterContext={filterContext} />
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
        </div>
    );
};

export default DashboardLayout;