import React, { useState } from 'react';
import Sidebar from './Sidebar/Sidebar';
import RightPanel from './RightPanel/RightPanel';
import MainContent from './MainContent/MainContent';
import styles from './DashboardLayout.module.css';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';

interface FilterContextState {
    type: 'global' | 'project' | 'client' | 'canal' | 'flow';
    value: string;
}

const DashboardLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

    const [filterContext, setFilterContext] = useState<FilterContextState>({
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

            <aside className={styles.sidebarArea}>
                <div style={{ width: '260px', height: '100%' }}>
                    <Sidebar
                        filterContext={filterContext}
                        onSelectFilter={setFilterContext}
                    />
                </div>
            </aside>

            <main className={styles.mainArea}>
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

                <div className={styles.contentWrapper}>
                    <MainContent filterContext={filterContext} />
                </div>
            </main>

            <aside className={styles.rightArea}>
                <div style={{ width: '100%', minWidth: '250px' }}><RightPanel /></div>
            </aside>
        </div>
    );
};

export default DashboardLayout;