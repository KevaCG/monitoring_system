import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
// Asegúrate de crear este archivo CSS o usar clases de Tailwind si lo prefieres
import styles from './UsersPage.module.css';

// Definición de la estructura de tu usuario (basada en la tabla que hablamos)
interface UserProfile {
    id: string;
    nombre: string;
    email: string;
    role: 'administrador' | 'usuario' | 'moderador' | string; // Puedes ajustar los roles exactos
    created_at?: string;
    last_sign_in_at?: string;
}

export const UsersPage: React.FC = () => {
    // Tipado de estados
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    // Estado para el Modal
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState({ role: '', password: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        // Recuerda que esta consulta asume que tienes la tabla 'profiles'
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Forzamos el tipado si la DB devuelve estructura correcta
            setUsers(data as UserProfile[]);
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
        setIsModalOpen(true);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;

        // Aquí iría tu lógica real de update
        // await supabase.from('profiles').update({ role: formData.role }).eq('id', editingUser.id);
        console.log("Guardando...", formData);

        setIsModalOpen(false);
        fetchUsers();
    };

    const getLastAccess = (dateString?: string) => {
        if (!dateString) return 'Nunca';
        return new Date(dateString).toLocaleDateString();
    }

    return (
        <div className="p-6 bg-gray-50 h-full">

            {/* --- Cabecera y Buscador --- */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex justify-between items-center">
                <input
                    type="text"
                    placeholder="Buscar usuario..."
                    className="border border-gray-300 rounded-md p-2 w-1/3 outline-none focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex gap-2">
                    <button className="text-green-600 border border-green-600 px-4 py-1 rounded hover:bg-green-50">Excel</button>
                    <button className="text-red-600 border border-red-600 px-4 py-1 rounded hover:bg-red-50">PDF</button>
                </div>
            </div>

            {/* --- Tabla --- */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                    <h3 className="font-semibold text-gray-600">Mostrando {filteredUsers.length} resultados</h3>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Nombre</th>
                            <th className="p-4">Correo</th>
                            <th className="p-4">Rol</th>
                            <th className="p-4">Último Acceso</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="p-4 text-center">Cargando...</td></tr>
                        ) : filteredUsers.map((user) => (
                            <tr key={user.id} className="border-t hover:bg-gray-50 text-sm text-gray-700">
                                <td className="p-4">#{user.id.substring(0, 4)}...</td>
                                <td className="p-4 font-medium">{user.nombre}</td>
                                <td className="p-4">{user.email}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs ${user.role === 'administrador' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">{getLastAccess(user.last_sign_in_at)}</td>
                                <td className="p-4 flex justify-center gap-2">
                                    <button
                                        onClick={() => handleEditClick(user)}
                                        className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100" title="Editar">
                                        ✎
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Eliminar">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- Modal --- */}
            {isModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                        <h2 className="text-xl font-bold mb-4">Editar Usuario</h2>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Rol</label>
                            <select
                                className="w-full border p-2 rounded"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="usuario">Usuario</option>
                                <option value="administrador">Administrador</option>
                                <option value="moderador">Moderador</option>
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-1">Nueva Contraseña</label>
                            <input
                                type="password"
                                placeholder="Dejar en blanco para no cambiar"
                                className="w-full border p-2 rounded"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveUser}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;