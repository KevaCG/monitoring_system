import React, { useState } from 'react';
import { LayoutDashboard, Folder, ChevronDown, ChevronRight, LogOut, MessageSquare, Briefcase, Zap, UserCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';

interface SidebarProps {
    filterContext: { type: string, value: string };
    onSelectFilter: (filter: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ filterContext, onSelectFilter }) => {
    const navigate = useNavigate();

    const [expandedItems, setExpandedItems] = useState<string[]>(['Parly', 'Comultrasan']);

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const isActive = (val: string) => filterContext.value === val;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.appName}>MonitorApp</h2>
            </div>

            <nav className={styles.nav}>
                <div>
                    <p className={styles.sectionTitle} style={{ marginTop: 0 }}>PRINCIPAL</p>
                    <div
                        className={`${styles.menuItem} ${filterContext.type === 'global' ? styles.menuItemActive : ''}`}
                        onClick={() => onSelectFilter({ type: 'global', value: 'Dashboard' })}
                    >
                        <div className={styles.menuContent}>
                            <LayoutDashboard size={20} />
                            <span>Dashboard Global</span>
                        </div>
                    </div>
                </div>

                <div>
                    <p className={styles.sectionTitle}>PROYECTOS</p>

                    {/* === PROYECTO: ATOMIC === */}
                    <div
                        className={`${styles.menuItem} ${isActive('Atomic') ? styles.menuItemActive : ''}`}
                        onClick={() => onSelectFilter({ type: 'project', value: 'Atomic' })}
                    >
                        <div className={styles.menuContent}>
                            <Folder size={18} color="#6366f1" />
                            <span>Atomic</span>
                        </div>
                    </div>

                    {/* === PROYECTO: PARLY (Con Jerarquía) === */}
                    <div>
                        <div
                            className={`${styles.menuItem} ${isActive('Parly') ? styles.menuItemActive : ''}`}
                            onClick={() => onSelectFilter({ type: 'project', value: 'Parly' })}
                        >
                            <div className={styles.menuContent}>
                                <Folder size={18} color="#22c55e" />
                                <span>Parly</span>
                            </div>
                            <div onClick={(e) => toggleExpand('Parly', e)} style={{ padding: 4 }}>
                                {expandedItems.includes('Parly') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </div>
                        </div>

                        {/* NIVEL 2: CLIENTES */}
                        <div className={`${styles.subMenuWrapper} ${expandedItems.includes('Parly') ? styles.subMenuOpen : ''}`}>
                            <div className={styles.subMenuContainer}>

                                {/* Cliente: Comultrasan */}
                                <div>
                                    <div
                                        className={`${styles.subMenuItem} ${isActive('Comultrasan') ? styles.subMenuItemActive : ''}`}
                                        onClick={() => onSelectFilter({ type: 'client', value: 'Comultrasan' })}
                                    >
                                        <div className={styles.menuContent} style={{ fontSize: '0.85rem' }}>
                                            {isActive('Comultrasan') && <div className={styles.activeIndicator} />}
                                            <Briefcase size={15} />
                                            <span>Comultrasan</span>
                                        </div>
                                        <div onClick={(e) => toggleExpand('Comultrasan', e)} style={{ padding: 2 }}>
                                            {expandedItems.includes('Comultrasan') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </div>
                                    </div>

                                    {/* NIVEL 3: CANALES */}
                                    <div className={`${styles.subMenuWrapper} ${expandedItems.includes('Comultrasan') ? styles.subMenuOpen : ''}`}>
                                        <div className={styles.subMenuContainer} style={{ borderLeft: '1px solid #e2e8f0', marginLeft: '12px' }}>

                                            {/* Canal: Fibotclientes */}
                                            <div>
                                                <div
                                                    className={`${styles.subMenuItem} ${isActive('Fibotclientes') ? styles.subMenuItemActive : ''}`}
                                                    onClick={() => onSelectFilter({ type: 'canal', value: 'Fibotclientes' })}
                                                >
                                                    <div className={styles.menuContent} style={{ fontSize: '0.85rem' }}>
                                                        <MessageSquare size={14} />
                                                        <span>Fibotclientes</span>
                                                    </div>
                                                    <div onClick={(e) => toggleExpand('Fibotclientes', e)}>
                                                        {expandedItems.includes('Fibotclientes') ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                    </div>
                                                </div>

                                                {/* NIVEL 4: FLUJOS FIBOTCLIENTES */}
                                                <div className={`${styles.subMenuWrapper} ${expandedItems.includes('Fibotclientes') ? styles.subMenuOpen : ''}`}>
                                                    <div style={{ paddingLeft: '25px' }}>
                                                        <FlowItem
                                                            label="Solicitud Crédito"
                                                            active={isActive('Solicitud Crédito')}
                                                            onClick={() => onSelectFilter({ type: 'flow', value: 'Solicitud Crédito' })}
                                                        />
                                                        <FlowItem
                                                            label="Clave Registro"
                                                            active={isActive('Clave Registro')}
                                                            onClick={() => onSelectFilter({ type: 'flow', value: 'Clave Registro' })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Canal: Operaciones */}
                                            <div>
                                                <div
                                                    className={`${styles.subMenuItem} ${isActive('Operaciones') ? styles.subMenuItemActive : ''}`}
                                                    onClick={() => onSelectFilter({ type: 'canal', value: 'Operaciones' })}
                                                >
                                                    <div className={styles.menuContent} style={{ fontSize: '0.85rem' }}>
                                                        <Zap size={14} />
                                                        <span>Operaciones</span>
                                                    </div>
                                                    <div onClick={(e) => toggleExpand('Operaciones', e)}>
                                                        {expandedItems.includes('Operaciones') ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                    </div>
                                                </div>

                                                {/* NIVEL 4: FLUJOS OPERACIONES */}
                                                <div className={`${styles.subMenuWrapper} ${expandedItems.includes('Operaciones') ? styles.subMenuOpen : ''}`}>
                                                    <div style={{ paddingLeft: '25px' }}>
                                                        <FlowItem
                                                            label="Olvide Clave"
                                                            active={isActive('Olvide Clave')}
                                                            onClick={() => onSelectFilter({ type: 'flow', value: 'Olvide Clave' })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Canal: Gestión Humana */}
                                            <div>
                                                <div
                                                    className={`${styles.subMenuItem} ${isActive('Gestión Humana') ? styles.subMenuItemActive : ''}`}
                                                    onClick={() => onSelectFilter({ type: 'canal', value: 'Gestión Humana' })}
                                                >
                                                    <div className={styles.menuContent} style={{ fontSize: '0.85rem' }}>
                                                        <UserCheck size={14} />
                                                        <span>Gestión Humana</span>
                                                    </div>
                                                    <div onClick={(e) => toggleExpand('GH', e)}>
                                                        {expandedItems.includes('GH') ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                    </div>
                                                </div>

                                                {/* NIVEL 4: FLUJOS GESTIÓN HUMANA */}
                                                <div className={`${styles.subMenuWrapper} ${expandedItems.includes('GH') ? styles.subMenuOpen : ''}`}>
                                                    <div style={{ paddingLeft: '25px' }}>
                                                        <FlowItem
                                                            label="Portal Empleado"
                                                            active={isActive('Portal Empleado')}
                                                            onClick={() => onSelectFilter({ type: 'flow', value: 'Portal Empleado' })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                                {/* Fin Cliente Comultrasan */}

                            </div>
                        </div>
                    </div>

                    {/* Otros Proyectos */}
                    <div className={styles.menuItem} onClick={() => onSelectFilter({ type: 'project', value: 'Discos' })}>
                        <div className={styles.menuContent}>
                            <Folder size={18} color="#3b82f6" />
                            <span>Discos</span>
                        </div>
                    </div>
                    <div className={styles.menuItem} onClick={() => onSelectFilter({ type: 'project', value: 'Backup' })}>
                        <div className={styles.menuContent}>
                            <Folder size={18} color="#a855f7" />
                            <span>Backup</span>
                        </div>
                    </div>

                </div>
            </nav>

            <button onClick={handleLogout} className={styles.logoutBtn}>
                <LogOut size={20} />
                <span>Cerrar Sesión</span>
            </button>
        </div>
    );
};

const FlowItem = ({ label, onClick, active }: any) => (
    <div
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        style={{
            padding: '6px 0', cursor: 'pointer', fontSize: '0.8rem',
            color: active ? '#22c55e' : '#94a3b8',
            fontWeight: active ? 600 : 400,
            display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'color 0.2s'
        }}
    >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#22c55e' : '#cbd5e1' }}></div>
        {label}
    </div>
);

export default Sidebar;