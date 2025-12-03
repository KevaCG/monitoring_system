import React from 'react';
import { Mail, Lock, User, LayoutGrid, Chrome, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../controllers/useAuth';
import styles from './Auth.module.css';

const AuthPage: React.FC = () => {
    const {
        mode, toggleMode, formData, handleChange, handleSubmit,
        showPassword, togglePassword,
        modal, closeModal,
        loading,
        handleSocialLogin,
        showOtpModal, otpCode, handleOtpChange, verifyOtp, timer, canResend, setShowOtpModal
    } = useAuth();

    return (
        <>
            <div className={`${styles.container} ${mode === 'register' ? styles.activeRegister : ''}`}>

                {/* --- REGISTER FORM (Resumen) --- */}
                <div className={`${styles.formContainer} ${styles.signUpContainer}`}>
                    {/* ... código del registro ... */}
                    <h1 className={styles.title}>Crear Cuenta</h1>
                    {/* ... inputs ... */}
                    <div className={styles.socialContainer}>
                        <div className={styles.socialIcon} onClick={() => handleSocialLogin('google')}><Chrome size={22} /><span className={styles.tooltipText}>Google</span></div>
                        <div className={styles.socialIcon} onClick={() => handleSocialLogin('azure')}><LayoutGrid size={22} /><span className={styles.tooltipText}>Microsoft</span></div>
                    </div>
                    <span className={styles.subtitle}>o usa tu email para registrarte</span>

                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        {/* ... inputs de usuario, email, password ... */}
                        <div className={styles.inputGroup}>
                            <User size={20} className={styles.inputIcon} />
                            <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder=" " autoComplete="off" />
                            <label className={styles.floatingLabel}>Nombre de usuario</label>
                        </div>
                        <div className={styles.inputGroup}>
                            <Mail size={20} className={styles.inputIcon} />
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder=" " autoComplete="off" />
                            <label className={styles.floatingLabel}>Email corporativo</label>
                        </div>
                        <div className={styles.inputGroup}>
                            <Lock size={20} className={styles.inputIcon} />
                            <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder=" " />
                            <label className={styles.floatingLabel}>Contraseña</label>
                            <button type="button" onClick={togglePassword} className={styles.passwordToggle}>{showPassword ? <Eye size={20} /> : <EyeOff size={20} />}</button>
                        </div>
                        <button className={styles.button} disabled={loading}>{loading ? 'Procesando...' : 'Registrarse'}</button>
                    </form>
                </div>

                {/* --- LOGIN FORM (Resumen) --- */}
                <div className={`${styles.formContainer} ${styles.signInContainer}`}>
                    {/* ... código del login ... */}
                    <h1 className={styles.title}>Iniciar Sesión</h1>
                    {/* ... social buttons ... */}
                    <div className={styles.socialContainer}>
                        <div className={styles.socialIcon} onClick={() => handleSocialLogin('google')}><Chrome size={22} /><span className={styles.tooltipText}>Google</span></div>
                        <div className={styles.socialIcon} onClick={() => handleSocialLogin('azure')}><LayoutGrid size={22} /><span className={styles.tooltipText}>Microsoft</span></div>
                    </div>
                    <span className={styles.subtitle}>o usa tu cuenta de email</span>
                    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                        {/* ... inputs email, password ... */}
                        <div className={styles.inputGroup}>
                            <Mail size={20} className={styles.inputIcon} />
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder=" " />
                            <label className={styles.floatingLabel}>Email</label>
                        </div>
                        <div className={styles.inputGroup}>
                            <Lock size={20} className={styles.inputIcon} />
                            <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder=" " />
                            <label className={styles.floatingLabel}>Contraseña</label>
                            <button type="button" onClick={togglePassword} className={styles.passwordToggle}>{showPassword ? <Eye size={20} /> : <EyeOff size={20} />}</button>
                        </div>
                        <button className={styles.button} disabled={loading}>{loading ? 'Ingresando...' : 'Entrar'}</button>
                    </form>
                </div>

                <div className={styles.overlayContainer}>
                    <div className={styles.overlay}>
                        <div className={`${styles.overlayPanel} ${styles.overlayLeft}`}>
                            <h1 className={styles.title} style={{ color: 'white' }}>¡Bienvenido!</h1>
                            <p className={styles.subtitle} style={{ color: 'white' }}>Si ya tienes cuenta, conéctate.</p>
                            <button className={styles.ghostButton} onClick={toggleMode} disabled={loading}>Iniciar Sesión</button>
                        </div>
                        <div className={`${styles.overlayPanel} ${styles.overlayRight}`}>
                            <h1 className={styles.title} style={{ color: 'white' }}>¡Hola, Amigo!</h1>
                            <p className={styles.subtitle} style={{ color: 'white' }}>Comienza tu viaje con nosotros.</p>
                            <button className={styles.ghostButton} onClick={toggleMode} disabled={loading}>Registrarse</button>
                        </div>
                    </div>
                </div>
            </div>

            {modal.isOpen && (
                <div className={styles.modalOverlay} onClick={closeModal}>
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
                                onChange={handleOtpChange}
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
                                onClick={() => alert("Función de reenviar pendiente de configurar")}
                            >
                                Reenviar código
                            </button>
                        </div>

                        <button className={styles.button} onClick={verifyOtp} disabled={loading || otpCode.length < 6}>
                            {loading ? 'Verificando...' : 'Confirmar Código'}
                        </button>

                        <button
                            style={{ marginTop: '15px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                            onClick={() => setShowOtpModal(false)}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default AuthPage;