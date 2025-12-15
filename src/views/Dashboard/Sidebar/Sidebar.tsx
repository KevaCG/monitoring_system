import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Folder, ChevronDown, ChevronRight, LogOut,
    MessageSquare, Briefcase, Users, Layers, HardDrive, Activity
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
    statusColor?: 'green' | 'red' | 'gray';
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
    iconColor,
    statusColor
}) => (
    <div className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`} onClick={onClick}>
        <div className={styles.menuContent}>
            {Icon && <Icon size={18} style={{ color: isActive ? 'currentColor' : (iconColor || 'currentColor') }} strokeWidth={2} />}
            <span>{label}</span>
        </div>

        {/* Indicador de estado (Bolita) */}
        {statusColor && (
            <div
                className={styles.statusDot}
                data-status={statusColor}
                title={statusColor === 'green' ? 'Sistema Operacional' : statusColor === 'red' ? 'Atención Requerida' : 'Cargando...'}
            />
        )}

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
        <div className={`${styles.subMenuItem} ${isActive ? styles.subMenuItemActive : ''}`} onClick={onClick} style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={16} style={{ color: isActive ? 'currentColor' : (iconColor || '#94a3b8') }} />
                <span>{label}</span>
            </div>
        </div>
        {onToggle && (
            <div onClick={onToggle} style={{ padding: '6px', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
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
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    // Estado para la salud operativa (bolita de color)
    const [operationalHealth, setOperationalHealth] = useState<'gray' | 'green' | 'red'>('gray');

    // --- Lógica de Estado Operacional (Realtime) ---
    const fetchOperationalStatus = async () => {
        try {
            // Consultamos las últimas ejecuciones para determinar la salud del sistema
            const { data, error } = await supabase
                .from('monitoreos')
                .select('estado, estado_correccion')
                .order('created_at', { ascending: false })
                .limit(10); // Aumentamos el límite un poco para tener mejor contexto

            if (error) throw error;

            if (data && data.length > 0) {
                // Lógica de Semáforo:
                // Rojo: Si hay algún error reciente que NO ha sido corregido.
                // Verde: Si todo está OK o los errores ya fueron corregidos.
                const hasUnresolvedError = data.some(d => d.estado === 'ERROR' && d.estado_correccion !== 'CORREGIDO');
                setOperationalHealth(hasUnresolvedError ? 'red' : 'green');
            } else {
                setOperationalHealth('gray'); // Sin datos aún
            }
        } catch (error) {
            console.error("Error fetching status:", error);
            setOperationalHealth('gray');
        }
    };

    useEffect(() => {
        // 1. Carga de datos de usuario
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

        // 2. Carga inicial del estado
        fetchOperationalStatus();

        // 3. Suscripción Realtime para actualizar la bolita al instante
        const channel = supabase
            .channel('sidebar-health-update')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'monitoreos' },
                () => {
                    // Al detectar cualquier cambio (nuevo error o corrección), recalculamos el estado
                    fetchOperationalStatus();
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
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
                {/* Dashboard y Estatus */}
                <div>
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Dashboard Global"
                        isActive={filterContext.type === 'global'}
                        onClick={() => onSelectFilter({ type: 'global', value: 'Dashboard' })}
                    />
                    <SidebarItem
                        icon={Activity}
                        label="Estatus Operacional"
                        isActive={filterContext.type === 'status'}
                        onClick={() => onSelectFilter({ type: 'status', value: 'StatusPage' })}
                        iconColor="#10b981"
                        statusColor={operationalHealth} // <--- Aquí se pasa el color dinámico
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

                                <SubMenuItem
                                    icon={Folder} label="Parly"
                                    isActive={isAct('Parly')}
                                    onClick={() => onSelectFilter({ type: 'project', value: 'Parly' })}
                                    isExpanded={isExp('Parly')}
                                    onToggle={(e) => { e.stopPropagation(); toggleExpand('Parly'); }}
                                />

                                <div className={`${styles.subMenuWrapper} ${isExp('Parly') ? styles.subMenuOpen : ''}`}>
                                    <div className={styles.subMenuContainer}>
                                        <SubMenuItem
                                            icon={Briefcase} label="Comultrasan"
                                            isActive={isAct('Comultrasan')}
                                            onClick={() => onSelectFilter({ type: 'client', value: 'Comultrasan' })}
                                            isExpanded={isExp('Comultrasan')}
                                            onToggle={(e) => { e.stopPropagation(); toggleExpand('Comultrasan'); }}
                                        />

                                        <div className={`${styles.subMenuWrapper} ${isExp('Comultrasan') ? styles.subMenuOpen : ''}`}>
                                            <div className={styles.subMenuContainer}>
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
                            isActive={isExp('Discos')}
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
                                <SubMenuItem icon={HardDrive} label="10.94.84.135" isActive={filterContext.type === 'server' && filterContext.value === '10.94.84.135'} onClick={() => onSelectFilter({ type: 'server', value: '10.94.84.135' })} />
                                <SubMenuItem icon={HardDrive} label="10.94.84.158" isActive={filterContext.type === 'server' && filterContext.value === '10.94.84.158'} onClick={() => onSelectFilter({ type: 'server', value: '10.94.84.158' })} />
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