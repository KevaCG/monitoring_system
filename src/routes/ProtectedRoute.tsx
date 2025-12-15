import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const ProtectedRoute = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Verificar sesión actual al cargar
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };

        checkSession();

        // 2. Escuchar cambios en la autenticación (ej: si cierra sesión en otra pestaña)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Mientras verificamos, mostramos un "Cargando..." para evitar parpadeos
    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                Cargando sesión...
            </div>
        );
    }

    // Si no hay sesión, redirigir al Login (suponiendo que la ruta raíz "/" es el login)
    if (!session) {
        return <Navigate to="/" replace />;
    }

    // Si hay sesión, permitir el acceso a las rutas hijas (El Dashboard)
    return <Outlet />;
};