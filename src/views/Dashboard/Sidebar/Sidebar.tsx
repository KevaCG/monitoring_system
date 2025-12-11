import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Folder, ChevronDown, ChevronRight, LogOut,
    MessageSquare, Briefcase, Zap, UserCheck, Users
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';

// --- Interfaces ---

interface FilterContext {
    type: string;
    value: string;
}

interface SidebarProps {
    filterContext: FilterContext;
    onSelectFilter: (filter: FilterContext) => void;
    onOpenUsersModal?: () => void; // <--- NUEVA PROP PARA EL MODAL
}

interface SidebarItemProps {
    icon?: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
    hasSubmenu?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: (e: React.MouseEvent<HTMLDivElement>) => void;
    iconColor?: string;
}

interface SubMenuItemProps {
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
    isExpanded?: boolean;
    onToggle?: (e: React.MouseEvent<HTMLDivElement>) => void;
    paddingLeft?: string;
}

interface FlowItemProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

// --- Componentes Auxiliares ---

const SidebarItem: React.FC<SidebarItemProps> = ({
    icon: Icon,
    label,
    isActive,
    onClick,
    hasSubmenu = false,
    isExpanded = false,
    onToggleExpand,
    iconColor
}) => (
    <div
        className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`}
        onClick={onClick}
    >
        <div className={styles.menuContent}>
            {Icon && <Icon size={18} color={iconColor} />}
            <span>{label}</span>
        </div>
        {hasSubmenu && onToggleExpand && (
            <div onClick={onToggleExpand} style={{ padding: 4 }}>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
        )}
    </div>
);

const SubMenuItem: React.FC<SubMenuItemProps> = ({
    icon: Icon,
    label,
    isActive,
    onClick,
    isExpanded,
    onToggle,
    paddingLeft = '12px'
}) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 0', paddingLeft }}>
        <div
            className={`${styles.subMenuItem} ${isActive ? styles.subMenuItemActive : ''}`}
            onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}
        >
            <div className={styles.menuContent} style={{ fontSize: '0.85rem' }}>
                {isActive && <div className={styles.activeIndicator} />}
                <Icon size={15} />
                <span>{label}</span>
            </div>
        </div>
        {onToggle && (
            <div onClick={onToggle} style={{ padding: 2 }}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
        )}
    </div>
);

const FlowItem: React.FC<FlowItemProps> = ({ label, active, onClick }) => (
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

// --- Componente Principal ---

const Sidebar: React.FC<SidebarProps> = ({ filterContext, onSelectFilter, onOpenUsersModal }) => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState<string>("Usuario");
    const [userRole, setUserRole] = useState<string>("Usuario");
    const [expandedItems, setExpandedItems] = useState<string[]>(['Parly', 'Comultrasan']);

    useEffect(() => {
        const getUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const name = user.user_metadata?.username || user.email?.split('@')[0] || "Usuario";
                setUserName(name.charAt(0).toUpperCase() + name.slice(1));

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role) setUserRole(profile.role);
            }
        };
        getUserData();
    }, []);

    const initial = userName.charAt(0).toUpperCase();
    const isAdmin = userRole === 'Administrador';
    const canViewProjects = isAdmin || userRole === 'Usuario';

    const toggleExpand = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setExpandedItems(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const isExp = (id: string) => expandedItems.includes(id);
    const isAct = (val: string) => filterContext.value === val;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.userProfile}>
                    <div className={styles.userAvatar}>{initial}</div>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{userName}</span>
                        <span className={styles.userRole}>{userRole}</span>
                    </div>
                </div>
            </div>

            <nav className={styles.nav}>

                {/* PRINCIPAL */}
                <div>
                    <p className={styles.sectionTitle} style={{ marginTop: 0 }}>PRINCIPAL</p>
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Dashboard Global"
                        isActive={filterContext.type === 'global'}
                        onClick={() => onSelectFilter({ type: 'global', value: 'Dashboard' })}
                    />
                </div>

                {/* ADMIN - Ahora abre el Modal */}
                {isAdmin && (
                    <div className="mt-4">
                        <p className={styles.sectionTitle}>ADMINISTRACIÓN</p>
                        <SidebarItem
                            icon={Users}
                            label="Usuarios"
                            isActive={false} // No lo marcamos activo porque es un modal flotante
                            onClick={() => {
                                if (onOpenUsersModal) onOpenUsersModal();
                            }}
                        />
                    </div>
                )}

                {/* PROYECTOS */}
                {canViewProjects && (
                    <div className="mt-4">
                        <p className={styles.sectionTitle}>PROYECTOS</p>

                        <SidebarItem
                            icon={Folder} label="Atomic" iconColor="#6366f1"
                            isActive={isAct('Atomic')}
                            onClick={() => onSelectFilter({ type: 'project', value: 'Atomic' })}
                        />

                        {/* Parly */}
                        <div>
                            <SidebarItem
                                icon={Folder} label="Parly" iconColor="#22c55e"
                                isActive={isAct('Parly')}
                                onClick={() => onSelectFilter({ type: 'project', value: 'Parly' })}
                                hasSubmenu={true}
                                isExpanded={isExp('Parly')}
                                onToggleExpand={(e) => toggleExpand('Parly', e)}
                            />

                            <div className={`${styles.subMenuWrapper} ${isExp('Parly') ? styles.subMenuOpen : ''}`}>
                                <div className={styles.subMenuContainer}>

                                    {/* Comultrasan */}
                                    <div>
                                        <SubMenuItem
                                            icon={Briefcase} label="Comultrasan"
                                            isActive={isAct('Comultrasan')}
                                            onClick={() => onSelectFilter({ type: 'client', value: 'Comultrasan' })}
                                            isExpanded={isExp('Comultrasan')}
                                            onToggle={(e) => { e.stopPropagation(); toggleExpand('Comultrasan'); }}
                                        />

                                        <div className={`${styles.subMenuWrapper} ${isExp('Comultrasan') ? styles.subMenuOpen : ''}`}>
                                            <div className={styles.subMenuContainer} style={{ borderLeft: '1px solid #e2e8f0', marginLeft: '12px' }}>

                                                {/* Fibotclientes */}
                                                <div>
                                                    <SubMenuItem
                                                        icon={MessageSquare} label="Fibotclientes"
                                                        isActive={isAct('Fibotclientes')}
                                                        onClick={() => onSelectFilter({ type: 'canal', value: 'Fibotclientes' })}
                                                        isExpanded={isExp('Fibotclientes')}
                                                        onToggle={(e) => { e.stopPropagation(); toggleExpand('Fibotclientes'); }}
                                                    />
                                                    <div className={`${styles.subMenuWrapper} ${isExp('Fibotclientes') ? styles.subMenuOpen : ''}`}>
                                                        <div style={{ paddingLeft: '25px' }}>
                                                            <FlowItem label="Solicitud Crédito" active={isAct('Solicitud Crédito')} onClick={() => onSelectFilter({ type: 'flow', value: 'Solicitud Crédito' })} />
                                                            <FlowItem label="Clave Registro" active={isAct('Clave Registro')} onClick={() => onSelectFilter({ type: 'flow', value: 'Clave Registro' })} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Operaciones */}
                                                <div>
                                                    <SubMenuItem
                                                        icon={Zap} label="Operaciones"
                                                        isActive={isAct('Operaciones')}
                                                        onClick={() => onSelectFilter({ type: 'canal', value: 'Operaciones' })}
                                                        isExpanded={isExp('Operaciones')}
                                                        onToggle={(e) => { e.stopPropagation(); toggleExpand('Operaciones'); }}
                                                    />
                                                    <div className={`${styles.subMenuWrapper} ${isExp('Operaciones') ? styles.subMenuOpen : ''}`}>
                                                        <div style={{ paddingLeft: '25px' }}>
                                                            <FlowItem label="Olvide Clave" active={isAct('Olvide Clave')} onClick={() => onSelectFilter({ type: 'flow', value: 'Olvide Clave' })} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* GH */}
                                                <div>
                                                    <SubMenuItem
                                                        icon={UserCheck} label="Gestión Humana"
                                                        isActive={isAct('Gestión Humana')}
                                                        onClick={() => onSelectFilter({ type: 'canal', value: 'Gestión Humana' })}
                                                        isExpanded={isExp('GH')}
                                                        onToggle={(e) => { e.stopPropagation(); toggleExpand('GH'); }}
                                                    />
                                                    <div className={`${styles.subMenuWrapper} ${isExp('GH') ? styles.subMenuOpen : ''}`}>
                                                        <div style={{ paddingLeft: '25px' }}>
                                                            <FlowItem label="Portal Empleado" active={isAct('Portal Empleado')} onClick={() => onSelectFilter({ type: 'flow', value: 'Portal Empleado' })} />
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <SidebarItem
                            icon={Folder} label="Discos" iconColor="#3b82f6"
                            isActive={isAct('Discos')}
                            onClick={() => onSelectFilter({ type: 'project', value: 'Discos' })}
                        />

                        <SidebarItem
                            icon={Folder} label="Backup" iconColor="#a855f7"
                            isActive={isAct('Backup')}
                            onClick={() => onSelectFilter({ type: 'project', value: 'Backup' })}
                        />
                    </div>
                )}
            </nav>

            <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className={styles.logoutBtn}>
                <LogOut size={20} />
                <span>Cerrar Sesión</span>
            </button>
        </div>
    );
};

export default Sidebar;