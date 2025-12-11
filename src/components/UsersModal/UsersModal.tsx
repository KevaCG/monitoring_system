import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Edit2, Trash2 } from 'lucide-react';
import styles from './UsersModal.module.css';

interface UserProfile {
    id: string;
    nombre: string;
    email: string;
    role: 'administrador' | 'usuario' | 'moderador' | string;
    created_at?: string;
    last_sign_in_at?: string;
}

interface UsersModalProps {
    onClose: () => void;
}

export const UsersModal: React.FC<UsersModalProps> = ({ onClose }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    // Estado para el SUB-MODAL de edición
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState({ role: '', password: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        // NOTA: .select('*') trae TODAS las columnas y TODAS las filas.
        // Si la tabla sale vacía, revisa tus políticas RLS en Supabase (ver abajo).
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setUsers(data as UserProfile[]);
        } else if (error) {
            console.error("Error cargando usuarios:", error.message);
        }
        setLoading(false);
    };

    const filteredUsers = users.filter(user =>
        (user.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (!error) fetchUsers();
    };

    const handleEditClick = (user: UserProfile) => {
        setEditingUser(user);
        setFormData({ role: user.role || 'usuario', password: '' });
        setIsEditModalOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        // Actualizamos el rol en la tabla profiles
        const { error } = await supabase
            .from('profiles')
            .update({ role: formData.role })
            .eq('id', editingUser.id);

        if (!error) {
            console.log("Usuario actualizado correctamente");
            setIsEditModalOpen(false);
            fetchUsers();
        } else {
            alert("Error al actualizar: " + error.message);
        }
    };

    return (
        // Overlay Principal
        <div className={styles.overlay}>

            {/* Contenedor del Modal */}
            <div className={styles.modalContainer}>

                {/* Cabecera (Ahora contiene el buscador Y el botón cerrar para evitar superposición) */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Gestión de Usuarios</h2>

                    {/* Contenedor derecho: Buscador + Botón Cerrar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Buscar usuario..."
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <button onClick={onClose} className={styles.closeBtn} title="Cerrar">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Cuerpo con Scroll y Tabla */}
                <div className={styles.contentArea}>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead className={styles.tableHead}>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Correo</th>
                                    <th>Rol</th>
                                    <th style={{ textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody className={styles.tableBody}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                                            Cargando usuarios...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                                            {users.length === 0
                                                ? "No hay usuarios en la base de datos."
                                                : "No se encontraron coincidencias con la búsqueda."}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td style={{ fontWeight: 500 }}>{user.nombre}</td>
                                            <td style={{ color: '#64748b' }}>{user.email}</td>
                                            <td>
                                                <span className={`${styles.badge} ${user.role === 'administrador' ? styles.badgeAdmin : styles.badgeUser}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    className={`${styles.actionBtn} ${styles.editBtn}`}
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- SUB-MODAL: Editar Usuario --- */}
                {isEditModalOpen && editingUser && (
                    <div className={styles.editOverlay}>
                        <div className={styles.editCard}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1e293b' }}>
                                Editar Usuario
                            </h3>
                            <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                                Editando a: <strong>{editingUser.nombre}</strong>
                            </p>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Rol</label>
                                <select
                                    className={styles.select}
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="usuario">Usuario</option>
                                    <option value="administrador">Administrador</option>
                                    <option value="moderador">Moderador</option>
                                </select>
                            </div>

                            <div className={styles.modalFooter}>
                                <button onClick={() => setIsEditModalOpen(false)} className={styles.cancelBtn}>
                                    Cancelar
                                </button>
                                <button onClick={handleSaveUser} className={styles.saveBtn}>
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};