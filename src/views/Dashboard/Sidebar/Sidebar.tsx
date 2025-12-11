import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Folder, ChevronDown, ChevronRight, LogOut,
    MessageSquare, Briefcase, Users, Layers,
    HardDrive
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
    onOpenUsersModal?: () => void;
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
    iconColor?: string;
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
            {Icon && <Icon size={18} style={{ color: isActive ? 'currentColor' : (iconColor || 'currentColor') }} strokeWidth={2} />}
            <span>{label}</span>
        </div>
        {hasSubmenu && onToggleExpand && (
            <div onClick={onToggleExpand} style={{ display: 'flex', alignItems: 'center' }}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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
    iconColor
}) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
            className={`${styles.subMenuItem} ${isActive ? styles.subMenuItemActive : ''}`}
            onClick={onClick}
            style={{ flex: 1 }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={16} style={{ color: isActive ? 'currentColor' : (iconColor || '#94a3b8') }} />
                <span>{label}</span>
            </div>
        </div>
        {onToggle && (
            <div
                onClick={onToggle}
                style={{ padding: '6px', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
            >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </div>
        )}
    </div>
);

const FlowItem: React.FC<FlowItemProps> = ({ label, active, onClick }) => (
    <div
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        style={{
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            color: active ? '#4f46e5' : '#64748b',
            fontWeight: active ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.2s',
            borderRadius: '6px',
            backgroundColor: active ? '#eff6ff' : 'transparent',
            marginTop: '2px'
        }}
    >
        <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: active ? '#4f46e5' : '#cbd5e1',
            flexShrink: 0
        }}></div>
        {label}
    </div>
);

// --- Componente Principal ---

const Sidebar: React.FC<SidebarProps> = ({ filterContext, onSelectFilter, onOpenUsersModal }) => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState<string>("Usuario");
    const [userRole, setUserRole] = useState<string>("Usuario");

    // CAMBIO: Iniciamos con un array vacío para que todo esté colapsado al principio
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    useEffect(() => {
        const getUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const name = user.user_metadata?.username || user.email?.split('@')[0] || "Usuario";
                setUserName(name.charAt(0).toUpperCase() + name.slice(1));
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
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
            {/* Header / Perfil */}
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

                {/* Dashboard */}
                <div>
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Dashboard Global"
                        isActive={filterContext.type === 'global'}
                        onClick={() => onSelectFilter({ type: 'global', value: 'Dashboard' })}
                    />
                </div>

                {/* Administración */}
                {isAdmin && (
                    <div>
                        <p className={styles.sectionTitle}>Administración</p>
                        <SidebarItem
                            icon={Users}
                            label="Usuarios"
                            isActive={false}
                            onClick={() => onOpenUsersModal && onOpenUsersModal()}
                        />
                    </div>
                )}

                {/* Proyectos */}
                {canViewProjects && (
                    <div>
                        <p className={styles.sectionTitle}>Proyectos</p>

                        {/* Plataformas (Carpeta Madre) */}
                        <SidebarItem
                            icon={Layers}
                            label="Plataformas"
                            isActive={false}
                            hasSubmenu={true}
                            isExpanded={isExp('Plataformas')}
                            onToggleExpand={(e) => toggleExpand('Plataformas', e)}
                            onClick={() => toggleExpand('Plataformas')}
                        />

                        <div className={`${styles.subMenuWrapper} ${isExp('Plataformas') ? styles.subMenuOpen : ''}`}>
                            <div className={styles.subMenuContainer}>
                                <SubMenuItem
                                    icon={Folder} label="Atomic"
                                    isActive={isAct('Atomic')}
                                    onClick={() => onSelectFilter({ type: 'project', value: 'Atomic' })}
                                />

                                {/* Parly */}
                                <SubMenuItem
                                    icon={Folder} label="Parly"
                                    isActive={isAct('Parly')}
                                    onClick={() => onSelectFilter({ type: 'project', value: 'Parly' })}
                                    isExpanded={isExp('Parly')}
                                    onToggle={(e) => { e.stopPropagation(); toggleExpand('Parly'); }}
                                />

                                {/* Nivel 3: Dentro de Parly */}
                                <div className={`${styles.subMenuWrapper} ${isExp('Parly') ? styles.subMenuOpen : ''}`}>
                                    <div className={styles.subMenuContainer}>
                                        <SubMenuItem
                                            icon={Briefcase} label="Comultrasan"
                                            isActive={isAct('Comultrasan')}
                                            onClick={() => onSelectFilter({ type: 'client', value: 'Comultrasan' })}
                                            isExpanded={isExp('Comultrasan')}
                                            onToggle={(e) => { e.stopPropagation(); toggleExpand('Comultrasan'); }}
                                        />

                                        {/* Nivel 4: Dentro de Comultrasan */}
                                        <div className={`${styles.subMenuWrapper} ${isExp('Comultrasan') ? styles.subMenuOpen : ''}`}>
                                            <div className={styles.subMenuContainer}>

                                                {/* Fibotclientes */}
                                                <SubMenuItem
                                                    icon={MessageSquare} label="Fibotclientes"
                                                    isActive={isAct('Fibotclientes')}
                                                    onClick={() => onSelectFilter({ type: 'canal', value: 'Fibotclientes' })}
                                                    isExpanded={isExp('Fibotclientes')}
                                                    onToggle={(e) => { e.stopPropagation(); toggleExpand('Fibotclientes'); }}
                                                />
                                                <div className={`${styles.subMenuWrapper} ${isExp('Fibotclientes') ? styles.subMenuOpen : ''}`}>
                                                    <div className={styles.subMenuContainer}>
                                                        <FlowItem label="Solicitud Crédito" active={isAct('Solicitud Crédito')} onClick={() => onSelectFilter({ type: 'flow', value: 'Solicitud Crédito' })} />
                                                        <FlowItem label="Clave Registro" active={isAct('Clave Registro')} onClick={() => onSelectFilter({ type: 'flow', value: 'Clave Registro' })} />
                                                    </div>
                                                </div>

                                                {/* Operaciones */}
                                                {/* <SubMenuItem
                                                    icon={Zap} label="Operaciones"
                                                    isActive={isAct('Operaciones')}
                                                    onClick={() => onSelectFilter({ type: 'canal', value: 'Operaciones' })}
                                                    isExpanded={isExp('Operaciones')}
                                                    onToggle={(e) => { e.stopPropagation(); toggleExpand('Operaciones'); }}
                                                />
                                                <div className={`${styles.subMenuWrapper} ${isExp('Operaciones') ? styles.subMenuOpen : ''}`}>
                                                    <div className={styles.subMenuContainer}>
                                                        <FlowItem label="Olvide Clave" active={isAct('Olvide Clave')} onClick={() => onSelectFilter({ type: 'flow', value: 'Olvide Clave' })} />
                                                    </div>
                                                </div> */}

                                                {/* Gestión Humana */}
                                                {/* <SubMenuItem
                                                    icon={UserCheck} label="Gestión Humana"
                                                    isActive={isAct('Gestión Humana')}
                                                    onClick={() => onSelectFilter({ type: 'canal', value: 'Gestión Humana' })}
                                                    isExpanded={isExp('GH')}
                                                    onToggle={(e) => { e.stopPropagation(); toggleExpand('GH'); }}
                                                />
                                                <div className={`${styles.subMenuWrapper} ${isExp('GH') ? styles.subMenuOpen : ''}`}>
                                                    <div className={styles.subMenuContainer}>
                                                        <FlowItem label="Portal Empleado" active={isAct('Portal Empleado')} onClick={() => onSelectFilter({ type: 'flow', value: 'Portal Empleado' })} />
                                                    </div>
                                                </div> */}

                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Discos */}
                        <SidebarItem
                            icon={HardDrive}
                            label="Discos"
                            isActive={false}
                            hasSubmenu={true}
                            isExpanded={isExp('Discos')}
                            onToggleExpand={(e) => toggleExpand('Discos', e)}
                            onClick={() => toggleExpand('Discos')}
                        />
                        <div className={`${styles.subMenuWrapper} ${isExp('Discos') ? styles.subMenuOpen : ''}`}>
                            <div className={styles.subMenuContainer}>
                                <SubMenuItem icon={HardDrive} label="10.94.96.106" isActive={filterContext.type === 'server' && filterContext.value === '10.94.96.106'} onClick={() => onSelectFilter({ type: 'server', value: '10.94.96.106' })} />
                                <SubMenuItem icon={HardDrive} label="10.240.64.9" isActive={filterContext.type === 'server' && filterContext.value === '10.240.64.9'} onClick={() => onSelectFilter({ type: 'server', value: '10.240.64.9' })} />
                                <SubMenuItem icon={HardDrive} label="10.94.96.6" isActive={filterContext.type === 'server' && filterContext.value === '10.94.96.6'} onClick={() => onSelectFilter({ type: 'server', value: '10.94.96.6' })} />
                            </div>
                        </div>

                        {/* Backup */}
                        <SidebarItem
                            icon={Folder}
                            label="Backup"
                            isActive={isAct('Backup')}
                            onClick={() => onSelectFilter({ type: 'project', value: 'Backup' })}
                        />
                    </div>
                )}
            </nav>

            <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className={styles.logoutBtn}>
                <LogOut size={18} />
                <span>Cerrar Sesión</span>
            </button>
        </div>
    );
};

export default Sidebar;