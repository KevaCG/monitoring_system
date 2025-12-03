import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { AuthCredentials, AuthMode } from '../models/auth.types';
import type { Provider } from '@supabase/supabase-js';

interface ModalState {
    isOpen: boolean;
    type: 'error' | 'success';
    title: string;
    message: string;
}

export const useAuth = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<AuthMode>('login');
    const [formData, setFormData] = useState<AuthCredentials>({ email: '', password: '', username: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: 'success', title: '', message: '' });
    const [loading, setLoading] = useState(false);

    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [timer, setTimer] = useState(600);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        let interval: any;
        if (showOtpModal && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [showOtpModal, timer]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const toggleMode = () => setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    const togglePassword = () => setShowPassword(!showPassword);

    const closeModal = () => {
        setModal({ ...modal, isOpen: false });
        if (modal.type === 'success' && mode === 'login') {
            navigate('/dashboard');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
        setOtpCode(val);
    };

    const validatePassword = (password: string): boolean => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;
        return regex.test(password);
    };

    const handleSocialLogin = async (provider: Provider) => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: { redirectTo: window.location.origin + '/dashboard' },
            });
            if (error) throw error;
        } catch (error: any) {
            setModal({ isOpen: true, type: 'error', title: 'Error', message: error.message });
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (otpCode.length !== 6) {
            alert("El código debe tener 6 dígitos");
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: formData.email,
                token: otpCode,
                type: 'signup'
            });

            if (error) throw error;

            setShowOtpModal(false);
            setModal({
                isOpen: true,
                type: 'success',
                title: '¡Cuenta Verificada!',
                message: 'Has completado el registro exitosamente. Bienvenido.'
            });
            setMode('login');

        } catch (error: any) {
            setModal({ isOpen: true, type: 'error', title: 'Código Inválido', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.email || !formData.password || (mode === 'register' && !formData.username)) {
            setModal({ isOpen: true, type: 'error', title: 'Campos Incompletos', message: 'Por favor, llena todos los campos.' });
            return;
        }

        if (mode === 'register' && !validatePassword(formData.password)) {
            setModal({ isOpen: true, type: 'error', title: 'Contraseña Insegura', message: 'Mínimo 6 caracteres, 1 mayúscula, 1 minúscula y 1 número.' });
            return;
        }

        setLoading(true);

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                });
                if (error) throw error;
                navigate('/dashboard');
            } else {
                // --- REGISTRO CON OTP ---
                const { error } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: { username: formData.username },
                    },
                });

                if (error) throw error;

                setShowOtpModal(true);
                setTimer(600);
                setCanResend(false);
            }
        } catch (error: any) {
            let msg = error.message;
            if (msg === 'Invalid login credentials') msg = 'Correo o contraseña incorrectos.';
            if (msg.includes('already registered')) msg = 'Este correo ya está registrado.';
            setModal({ isOpen: true, type: 'error', title: 'Ocurrió un error', message: msg });
        } finally {
            setLoading(false);
        }
    };

    return {
        mode, toggleMode, formData, handleChange, handleSubmit,
        showPassword, togglePassword, modal, closeModal, loading, handleSocialLogin,
        showOtpModal, otpCode, handleOtpChange, verifyOtp, timer: formatTime(timer), canResend, setShowOtpModal
    };
};