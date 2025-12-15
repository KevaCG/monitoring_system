import React, { useState } from 'react';
import { Mail, Lock, User, LayoutGrid, Chrome, Eye, EyeOff, AlertCircle, CheckCircle, KeyRound, Timer } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import styles from './Login.module.css';

const AuthPage: React.FC = () => {
    // Estado local para ver la contraseña EN EL MODAL de recuperación
    const [showRecoverPass, setShowRecoverPass] = useState(false);

    // Extraemos todas las funciones y estados del controlador real
    const {
        mode, toggleMode, formData, handleChange, handleSubmit,
        showPassword, togglePassword,
        modal, closeModal, setModal,
        loading,
        handleSocialLogin,
        showOtpModal, otpCode, handleOtpChange, verifyOtp, timer, canResend, setShowOtpModal,
        // Props de Recuperación
        showRecoverModal, setShowRecoverModal,
        recoverStep, recoverEmail, setRecoverEmail,
        recoverOtp, setRecoverOtp,
        newPassword, setNewPassword,
        sendRecoveryCode, verifyRecoveryOtp, resetPasswordFinal
    } = useAuth();

    // Función para manejar el cambio de contraseña con validación local y ejecución real
    const handlePasswordResetClick = async () => {
        // 1. Validar longitud (MÍNIMO 6 CARACTERES)
        if (newPassword.length < 6) {
            if (setModal) {
                setModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Contraseña Insegura',
                    message: 'La contraseña es demasiado corta. Debe tener al menos 6 caracteres.'
                });
            } else {
                alert("La contraseña debe tener al menos 6 caracteres.");
            }
            return;
        }

        // 2. Si es válida, ejecutamos la lógica real del hook
        // Usamos await por si resetPasswordFinal es asíncrona (llamada a Supabase)
        await resetPasswordFinal();
    };

    return (
        <>
            <div className={`${styles.container} ${mode === 'register' ? styles.activeRegister : ''}`}>

                {/* --- REGISTER FORM --- */}
                <div className={`${styles.formContainer} ${styles.signUpContainer}`}>
                    <h1 className={styles.title}>Crear Cuenta</h1>

                    <div className={styles.socialContainer}>
                        <div className={styles.socialIcon} onClick={() => handleSocialLogin('google')}>
                            <Chrome size={22} />
                            <span className={styles.tooltipText}>Google</span>
                        </div>
                        <div className={styles.socialIcon} onClick={() => handleSocialLogin('azure')}>
                            <LayoutGrid size={22} />
                            <span className={styles.tooltipText}>Microsoft</span>
                        </div>
                    </div>

                    <span className={styles.subtitle}>o usa tu email para registrarte</span>

                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <div className={styles.inputGroup}>
                            <User size={20} className={styles.inputIcon} />
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder=" "
                                autoComplete="off"
                            />
                            <label className={styles.floatingLabel}>Nombre de usuario</label>
                        </div>

                        <div className={styles.inputGroup}>
                            <Mail size={20} className={styles.inputIcon} />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder=" "
                                autoComplete="off"
                            />
                            <label className={styles.floatingLabel}>Email corporativo</label>
                        </div>

                        <div className={styles.inputGroup}>
                            <Lock size={20} className={styles.inputIcon} />
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder=" "
                            />
                            <label className={styles.floatingLabel}>Contraseña</label>

                            <button type="button" onClick={togglePassword} className={styles.passwordToggle}>
                                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                            </button>
                        </div>

                        <button className={styles.button} disabled={loading}>
                            {loading ? 'Registrando...' : 'Registrarse'}
                        </button>
                    </form>
                </div>

                {/* --- LOGIN FORM --- */}
                <div className={`${styles.formContainer} ${styles.signInContainer}`}>
                    <h1 className={styles.title}>Iniciar Sesión</h1>

                    <div className={styles.socialContainer}>
                        <div className={styles.socialIcon} onClick={() => handleSocialLogin('google')}>
                            <Chrome size={22} />
                            <span className={styles.tooltipText}>Google</span>
                        </div>
                        <div className={styles.socialIcon} onClick={() => handleSocialLogin('azure')}>
                            <LayoutGrid size={22} />
                            <span className={styles.tooltipText}>Microsoft</span>
                        </div>
                    </div>

                    <span className={styles.subtitle}>o usa tu cuenta de email</span>

                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        <div className={styles.inputGroup}>
                            <Mail size={20} className={styles.inputIcon} />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder=" "
                            />
                            <label className={styles.floatingLabel}>Email</label>
                        </div>

                        <div className={styles.inputGroup}>
                            <Lock size={20} className={styles.inputIcon} />
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder=" "
                            />
                            <label className={styles.floatingLabel}>Contraseña</label>

                            <button type="button" onClick={togglePassword} className={styles.passwordToggle}>
                                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                            </button>
                        </div>

                        {/* ENLACE OLVIDÉ MI CONTRASEÑA */}
                        <div style={{ width: '100%', textAlign: 'right', marginTop: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setShowRecoverModal(true)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>

                        <button className={styles.button} disabled={loading}>
                            {loading ? 'Ingresando...' : 'Entrar'}
                        </button>
                    </form>
                </div>

                {/* --- OVERLAY --- */}
                <div className={styles.overlayContainer}>
                    <div className={styles.overlay}>
                        <div className={`${styles.overlayPanel} ${styles.overlayLeft}`}>
                            <h1 className={styles.title} style={{ color: 'white' }}>¡Bienvenido!</h1>
                            <p className={styles.subtitle} style={{ color: 'white' }}>Si ya tienes cuenta, conéctate.</p>
                            <button className={styles.ghostButton} onClick={toggleMode} disabled={loading}>
                                Iniciar Sesión
                            </button>
                        </div>
                        <div className={`${styles.overlayPanel} ${styles.overlayRight}`}>
                            <h1 className={styles.title} style={{ color: 'white' }}>¡Hola, Amigo!</h1>
                            <p className={styles.subtitle} style={{ color: 'white' }}>Comienza tu viaje con nosotros.</p>
                            <button className={styles.ghostButton} onClick={toggleMode} disabled={loading}>
                                Registrarse
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODAL DE OTP (REGISTRO) --- */}
            {showOtpModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ width: '450px' }}>
                        <div className={styles.modalIcon} style={{ background: '#e0e7ff', color: '#6366f1' }}>
                            <Mail size={32} />
                        </div>
                        <h2 className={styles.modalTitle}>Verifica tu correo</h2>
                        <p className={styles.subtitle}>
                            Hemos enviado un código de 6 dígitos a <strong>{formData.email}</strong>.
                        </p>

                        <div className={styles.otpInputContainer}>
                            <input
                                type="text"
                                className={styles.otpInput}
                                placeholder="000000"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => handleOtpChange(e, false)} // false = registro
                                autoFocus
                            />
                        </div>

                        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className={styles.timerText}>
                                Expira en: <span className={styles.timerCount}>{timer}</span>
                            </div>
                            <button
                                className={styles.resendLink}
                                disabled={!canResend}
                                onClick={() => alert("Función de reenviar pendiente")}
                            >
                                Reenviar código
                            </button>
                        </div>

                        <button className={styles.button} onClick={verifyOtp} disabled={loading || otpCode.length < 6}>
                            {loading ? 'Verificando...' : 'Confirmar Código'}
                        </button>

                        <button style={{ marginTop: '15px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }} onClick={() => setShowOtpModal(false)}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* --- MODAL DE RECUPERACIÓN (FLUJO MULTI-PASO) --- */}
            {showRecoverModal && (
                <div className={styles.modalOverlay} style={{ zIndex: 50 }}>
                    <div className={styles.modalContent} style={{ width: '450px' }}>

                        {/* PASO 1: SOLICITAR EMAIL */}
                        {recoverStep === 'email' && (
                            <>
                                <div className={styles.modalIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
                                    <KeyRound size={32} />
                                </div>
                                <h2 className={styles.modalTitle}>Recuperar Contraseña</h2>
                                <p className={styles.subtitle}>Ingresa tu correo para recibir un código de acceso.</p>
                                <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                                    <div className={styles.inputGroup} style={{ border: '1px solid #e2e8f0' }}>
                                        <Mail size={20} className={styles.inputIcon} />
                                        <input
                                            type="email"
                                            placeholder=" "
                                            value={recoverEmail}
                                            onChange={(e) => setRecoverEmail(e.target.value)}
                                        />
                                        <label className={styles.floatingLabel}>Tu correo registrado</label>
                                    </div>
                                </div>
                                <button className={styles.button} onClick={sendRecoveryCode} disabled={loading || !recoverEmail}>
                                    {loading ? 'Enviando...' : 'Enviar Código'}
                                </button>
                            </>
                        )}

                        {/* PASO 2: INGRESAR CÓDIGO (OTP) */}
                        {recoverStep === 'otp' && (
                            <>
                                <div className={styles.modalIcon} style={{ background: '#e0e7ff', color: '#6366f1' }}>
                                    <Mail size={32} />
                                </div>
                                <h2 className={styles.modalTitle}>Código de Verificación</h2>
                                <p className={styles.subtitle}>Hemos enviado un código a <strong>{recoverEmail}</strong></p>

                                <div className={styles.otpInputContainer}>
                                    <input
                                        type="text"
                                        className={styles.otpInput}
                                        placeholder="000000"
                                        maxLength={6}
                                        value={recoverOtp}
                                        onChange={(e) => handleOtpChange(e, true)} // true = recuperación
                                        autoFocus
                                    />
                                </div>
                                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                                    <Timer size={16} color="#ef4444" />
                                    <div className={styles.timerText}>Vence en: <span className={styles.timerCount}>{timer}</span></div>
                                </div>
                                <button className={styles.button} onClick={verifyRecoveryOtp} disabled={loading || recoverOtp.length < 6}>
                                    {loading ? 'Verificando...' : 'Verificar e Ingresar'}
                                </button>
                            </>
                        )}

                        {/* PASO 3: NUEVA CONTRASEÑA */}
                        {recoverStep === 'password' && (
                            <>
                                <div className={styles.modalIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
                                    <KeyRound size={32} />
                                </div>
                                <h2 className={styles.modalTitle}>Restablecer Contraseña</h2>
                                <p className={styles.subtitle}>Crea una nueva contraseña segura.</p>

                                <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                                    {/* Input Group completo con toggle de contraseña */}
                                    <div className={styles.inputGroup} style={{ border: '1px solid #e2e8f0' }}>
                                        <Lock size={20} className={styles.inputIcon} />
                                        <input
                                            type={showRecoverPass ? "text" : "password"}
                                            placeholder=" "
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                        <label className={styles.floatingLabel}>Nueva Contraseña</label>

                                        {/* Botón de Ojo específico para este modal */}
                                        <button
                                            type="button"
                                            onClick={() => setShowRecoverPass(!showRecoverPass)}
                                            className={styles.passwordToggle}
                                        >
                                            {showRecoverPass ? <Eye size={20} /> : <EyeOff size={20} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Botón usa la nueva función handlePasswordResetClick */}
                                <button
                                    className={styles.button}
                                    onClick={handlePasswordResetClick}
                                    disabled={loading}
                                >
                                    {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                                </button>
                            </>
                        )}

                        <button
                            style={{ marginTop: '15px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                            onClick={() => { setShowRecoverModal(false); setRecoverEmail(''); setRecoverOtp(''); setNewPassword(''); }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* --- MODAL DE ALERTAS (zIndex alto para asegurar visibilidad) --- */}
            {modal.isOpen && (
                <div className={styles.modalOverlay} onClick={closeModal} style={{ zIndex: 9999 }}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={`${styles.modalIcon} ${modal.type === 'error' ? styles.error : styles.success}`}>
                            {modal.type === 'error' ? <AlertCircle size={32} /> : <CheckCircle size={32} />}
                        </div>
                        <h2 className={styles.modalTitle}>{modal.title}</h2>
                        <p className={styles.modalMessage}>{modal.message}</p>
                        <button className={styles.modalButton} onClick={closeModal}>Entendido</button>
                    </div>
                </div>
            )}
        </>
    );
};

export default AuthPage;