import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Edit2, Trash2, Search, User, Shield, CheckCircle } from 'lucide-react';
import styles from './UsersModal.module.css';

interface UserProfile {
    id: string;
    nombre: string;
    email: string;
    role: 'administrador' | 'usuario' | 'moderador' | string;
    created_at?: string;
}

interface UsersModalProps {
    onClose: () => void;
}

export const UsersModal: React.FC<UsersModalProps> = ({ onClose }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState({ role: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setUsers(data as UserProfile[]);
        }
        setLoading(false);
    };

    // --- NUEVA LÓGICA: Igual que en tu Sidebar ---
    // Si el usuario no tiene nombre en la BD, tomamos lo que está antes del @ en el email
    const getDisplayName = (user: UserProfile) => {
        if (user.nombre && user.nombre.trim() !== "") return user.nombre;

        // Lógica de respaldo de la Sidebar:
        if (user.email) {
            const nameFromEmail = user.email.split('@')[0];
            // Capitalizar la primera letra (ej: "kcstrillon" -> "Kcastrillon")
            return nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
        }
        return "Usuario";
    };

    // Helpers visuales que usan el nombre calculado
    const getInitials = (displayName: string) => {
        return displayName.substring(0, 2).toUpperCase();
    };

    const getAvatarColor = (displayName: string) => {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];
        let hash = 0;
        for (let i = 0; i < displayName.length; i++) {
            hash = displayName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const filteredUsers = users.filter(user => {
        const displayName = getDisplayName(user);
        return (displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()));
    });

    const handleDelete = async (id: string) => {
        if (!window.confirm("¿Confirmas que deseas eliminar este usuario permanentemente?")) return;
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (!error) fetchUsers();
    };

    const handleEditClick = (user: UserProfile) => {
        setEditingUser(user);
        setFormData({ role: user.role || 'usuario' });
        setIsEditModalOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        const { error } = await supabase
            .from('profiles')
            .update({ role: formData.role })
            .eq('id', editingUser.id);

        if (!error) {
            setIsEditModalOpen(false);
            fetchUsers();
        } else {
            alert("Error: " + error.message);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modalContainer}>

                {/* --- HEADER --- */}
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Equipo</h2>
                        <p className={styles.subtitle}>Gestiona los miembros y permisos de tu organización.</p>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                {/* --- TOOLBAR --- */}
                <div className={styles.toolbar}>
                    <div className={styles.searchWrapper}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o correo..."
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={styles.statsBadge}>
                        <User size={14} />
                        <span>{users.length} Usuarios</span>
                    </div>
                </div>

                {/* --- CONTENIDO --- */}
                <div className={styles.contentArea}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft: '24px' }}>Usuario</th>
                                    <th>Rol / Permisos</th>
                                    <th>Fecha Registro</th>
                                    <th style={{ textAlign: 'right', paddingRight: '24px' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className={styles.loadingCell}>Cargando datos...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={4} className={styles.emptyCell}>No se encontraron usuarios.</td></tr>
                                ) : (
                                    filteredUsers.map((user) => {
                                        // Calculamos el nombre UNA vez por fila para usarlo en avatar y texto
                                        const displayName = getDisplayName(user);

                                        return (
                                            <tr key={user.id}>
                                                <td style={{ paddingLeft: '24px' }}>
                                                    <div className={styles.userInfo}>
                                                        <div
                                                            className={styles.avatar}
                                                            style={{ backgroundColor: getAvatarColor(displayName) }}
                                                        >
                                                            {getInitials(displayName)}
                                                        </div>
                                                        <div className={styles.userDetails}>
                                                            {/* Aquí mostramos el nombre calculado o el fallback */}
                                                            <span className={styles.userName}>{displayName}</span>
                                                            <span className={styles.userEmail}>{user.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`${styles.badge} ${user.role === 'administrador' ? styles.badgeAdmin : styles.badgeUser}`}>
                                                        {user.role === 'administrador' ? <Shield size={12} /> : <User size={12} />}
                                                        {user.role || 'Sin Rol'}
                                                    </span>
                                                </td>
                                                <td className={styles.dateCell}>
                                                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                                </td>
                                                <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                                    <div className={styles.actions}>
                                                        <button onClick={() => handleEditClick(user)} className={styles.iconBtn} title="Editar Rol">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(user.id)} className={`${styles.iconBtn} ${styles.dangerBtn}`} title="Eliminar">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- MODAL EDITAR --- */}
                {isEditModalOpen && editingUser && (
                    <div className={styles.editOverlay}>
                        <div className={styles.editCard}>
                            <div className={styles.editHeader}>
                                <div className={styles.editIconBg}><Shield size={24} color="#4f46e5" /></div>
                                <div>
                                    <h3>Editar Rol</h3>
                                    <p>Modifica los permisos de acceso.</p>
                                </div>
                            </div>

                            <div className={styles.editBody}>
                                <label>Usuario</label>
                                <div className={styles.readOnlyField}>
                                    {getDisplayName(editingUser)}
                                </div>

                                <label style={{ marginTop: '15px' }}>Asignar Rol</label>
                                <div className={styles.radioGroup}>
                                    {['usuario', 'administrador', 'moderador'].map((roleOption) => (
                                        <label key={roleOption} className={`${styles.radioOption} ${formData.role === roleOption ? styles.radioSelected : ''}`}>
                                            <input
                                                type="radio"
                                                name="role"
                                                value={roleOption}
                                                checked={formData.role === roleOption}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            />
                                            <span style={{ textTransform: 'capitalize' }}>{roleOption}</span>
                                            {formData.role === roleOption && <CheckCircle size={16} color="#4f46e5" />}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.editFooter}>
                                <button onClick={() => setIsEditModalOpen(false)} className={styles.cancelBtn}>Cancelar</button>
                                <button onClick={handleSaveUser} className={styles.saveBtn}>Guardar Cambios</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};