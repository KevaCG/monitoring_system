import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const useAuth = () => {
    // --- ESTADOS ---
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const featureFlags = {
        tests: {
            atomic: true,
            parly: false
        }
    };

    const [modal, setModal] = useState({ isOpen: false, type: 'success' as 'success' | 'error', title: '', message: '' });

    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState('');

    const [timer] = useState('02:00');
    const [canResend] = useState(false);

    const [showRecoverModal, setShowRecoverModal] = useState(false);
    const [recoverStep, setRecoverStep] = useState<'email' | 'otp' | 'password'>('email');
    const [recoverEmail, setRecoverEmail] = useState('');
    const [recoverOtp, setRecoverOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const navigate = useNavigate();

    // --- HANDLERS ---
    const toggleMode = () => setMode(prev => prev === 'login' ? 'register' : 'login');
    const togglePassword = () => setShowPassword(!showPassword);

    const closeModal = () => setModal({ ...modal, isOpen: false });

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleOtpChange = (e: ChangeEvent<HTMLInputElement>, isRecovery: boolean) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
        if (isRecovery) {
            setRecoverOtp(val);
        } else {
            setOtpCode(val);
        }
    };

    // --- LÓGICA ---
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === 'register') {
                const { error } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: { username: formData.username }
                    }
                });
                if (error) throw error;

                setShowOtpModal(true);
                setModal({ isOpen: true, type: 'success', title: 'Registro Iniciado', message: 'Revisa tu correo para el código de verificación.' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                });
                if (error) throw error;

                navigate('/dashboard');
            }
        } catch (error: any) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Error de Autenticación',
                message: error.message || 'Hubo un problema al procesar tu solicitud.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider: string) => {
        console.log(`Login con ${provider}`);
    };

    const verifyOtp = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: formData.email,
                token: otpCode,
                type: 'signup'
            });

            if (error) throw error;

            setShowOtpModal(false);
            setModal({ isOpen: true, type: 'success', title: '¡Bienvenido!', message: 'Tu cuenta ha sido verificada correctamente.' });
            navigate('/dashboard');

        } catch (error: any) {
            setModal({ isOpen: true, type: 'error', title: 'Código Inválido', message: error.message || 'El código ingresado es incorrecto.' });
        } finally {
            setLoading(false);
        }
    };

    const sendRecoveryCode = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(recoverEmail);

            if (error) throw error;

            setRecoverStep('otp');
            setModal({
                isOpen: true,
                type: 'success',
                title: 'Correo Enviado',
                message: `Si existe una cuenta con ${recoverEmail}, recibirás un código.`
            });

        } catch (error: any) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Error al enviar',
                message: error.message || 'No se pudo enviar el correo de recuperación.'
            });
        } finally {
            setLoading(false);
        }
    };

    const verifyRecoveryOtp = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email: recoverEmail,
                token: recoverOtp,
                type: 'recovery'
            });

            if (error) throw error;

            setRecoverStep('password');

        } catch (error: any) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Código Inválido',
                message: 'El código ingresado es incorrecto o ha expirado.'
            });
        } finally {
            setLoading(false);
        }
    };

    const resetPasswordFinal = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) throw error;

            setShowRecoverModal(false);
            setRecoverStep('email');
            setNewPassword('');

            setModal({
                isOpen: true,
                type: 'success',
                title: 'Contraseña Actualizada',
                message: 'Ya puedes iniciar sesión con tu nueva clave.'
            });

        } catch (error: any) {
            setModal({
                isOpen: true,
                type: 'error',
                title: 'Error al actualizar',
                message: error.message || 'No se pudo cambiar la contraseña.'
            });
        } finally {
            setLoading(false);
        }
    };

    return {
        featureFlags,
        mode,
        formData,
        showPassword,
        loading,
        modal,
        showOtpModal,
        otpCode,
        timer,
        canResend,
        showRecoverModal,
        recoverStep,
        recoverEmail,
        recoverOtp,
        newPassword,
        toggleMode,
        handleChange,
        handleSubmit,
        togglePassword,
        closeModal,
        setModal,
        setShowOtpModal,
        handleOtpChange,
        verifyOtp,
        handleSocialLogin,
        setShowRecoverModal,
        setRecoverEmail,
        setRecoverOtp,
        setNewPassword,
        sendRecoveryCode,
        verifyRecoveryOtp,
        resetPasswordFinal
    };
};