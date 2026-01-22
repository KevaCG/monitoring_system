import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Minus, Lock, Zap } from 'lucide-react';
import { useN8N } from '../../hooks/useN8N'; // Verifica que tu ruta sea correcta
import './OpsChatbot.css';

interface Message {
    id: string;
    role: 'bot' | 'user';
    text: string;
    timestamp: Date;
}

// --- CONFIGURACIÓN DE LÍMITES ---
const MAX_WORDS = 15;      // Límite de palabras por mensaje
const LIMIT_DAILY = 20;    // Límite diario de consultas (Ajústalo a 1500 si usas Gemini 1.5 Flash)

const OpsChatbot: React.FC = () => {
    // --- LÓGICA DE ALMACENAMIENTO LOCAL (QUOTA) ---
    const getDailyCount = () => {
        const storedDate = localStorage.getItem('chat_usage_date');
        const today = new Date().toDateString();

        // Si cambió el día, reseteamos el contador
        if (storedDate !== today) {
            localStorage.setItem('chat_usage_date', today);
            localStorage.setItem('chat_usage_count', '0');
            return 0;
        }
        return parseInt(localStorage.getItem('chat_usage_count') || '0', 10);
    };

    // --- ESTADOS ---
    const [isOpen, setIsOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [input, setInput] = useState('');
    const [usageCount, setUsageCount] = useState(getDailyCount());

    // Hook de conexión n8n
    const { sendMessage, loading } = useN8N();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Mensaje Inicial
    const INITIAL_MESSAGE: Message = {
        id: '1',
        role: 'bot',
        text: 'Hola. Soy OpsChat. Puedo consultar el estado de los servidores, backups y monitoreos.\n\n🔒 Ingresa la clave para iniciar.',
        timestamp: new Date()
    };

    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);

    // --- EFECTOS (Scroll automático) ---
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen, loading]);

    // --- HELPERS ---
    const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
    const isOverWordLimit = wordCount > MAX_WORDS;
    const isOverDailyLimit = usageCount >= LIMIT_DAILY;

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const incrementUsage = () => {
        const newCount = usageCount + 1;
        setUsageCount(newCount);
        localStorage.setItem('chat_usage_count', newCount.toString());
    };

    // --- MANEJADORES DE VENTANA ---
    const handleMinimize = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false); // Solo oculta
    };

    const handleCloseAndReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
        // Delay para animación antes de borrar
        setTimeout(() => {
            setMessages([INITIAL_MESSAGE]);
            setIsAuthenticated(false);
            setInput('');
        }, 300);
    };

    // --- ENVÍO DE MENSAJES ---
    const handleSend = async () => {
        // Validaciones estrictas
        if (!input.trim() || isOverWordLimit || isOverDailyLimit) return;

        const currentInput = input.trim();

        // 1. Mensaje Usuario
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: currentInput,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // 2. Autenticación Local
        if (!isAuthenticated) {
            setTimeout(() => {
                if (currentInput.toLowerCase() === 'kevak') {
                    setIsAuthenticated(true);
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'bot',
                        text: '🔓 Acceso concedido. Sistema en línea. ¿En qué puedo ayudarte hoy?',
                        timestamp: new Date()
                    }]);
                } else {
                    setMessages(prev => [...prev, {
                        id: (Date.now() + 1).toString(),
                        role: 'bot',
                        text: '❌ Palabra clave incorrecta.',
                        timestamp: new Date()
                    }]);
                }
            }, 600);
            return;
        }

        // 3. Envío a n8n
        try {
            // Aumentamos el contador antes de enviar
            incrementUsage();

            const responseText = await sendMessage(currentInput);

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                text: responseText,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                text: '⚠️ Error de conexión con el núcleo de IA.',
                timestamp: new Date()
            }]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // --- RENDERIZADO (TRIGGER) ---
    if (!isOpen) {
        return (
            <button className="chatbot-trigger" onClick={() => setIsOpen(true)}>
                <Bot size={28} />
                {isAuthenticated && <span className="status-dot-trigger"></span>}
            </button>
        );
    }

    // --- RENDERIZADO (VENTANA) ---
    return (
        <div className="chatbot-window">
            {/* HEADER */}
            <div className="chat-header">
                <div className="chat-header-info">
                    <div className="bot-avatar-container">
                        <Bot size={20} color="#10b981" />
                        {!isAuthenticated && (
                            <div className="lock-badge">
                                <Lock size={10} color="#94a3b8" />
                            </div>
                        )}
                    </div>
                    <div className="chat-title">
                        <h3>OpsChat</h3>
                        <span className={`chat-status ${isAuthenticated ? 'status-online' : 'status-locked'}`}>
                            {isAuthenticated ? '● En línea' : '● Bloqueado'}
                        </span>
                    </div>
                </div>

                <div className="header-actions">
                    {/* Badge de Usos Diarios */}
                    {isAuthenticated && (
                        <div className="usage-badge" title={`Te quedan ${LIMIT_DAILY - usageCount} consultas hoy`}>
                            <Zap size={12} fill="#fcd34d" />
                            <span>{LIMIT_DAILY - usageCount}</span>
                        </div>
                    )}

                    <button className="header-btn" onClick={handleMinimize} title="Minimizar">
                        <Minus size={20} />
                    </button>
                    <button className="header-btn close" onClick={handleCloseAndReset} title="Cerrar y Resetear">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* MENSAJES */}
            <div className="chat-messages">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-row ${msg.role}`}>
                        {msg.role === 'bot' && (
                            <div className="msg-avatar">
                                <Bot size={16} color="#10b981" />
                            </div>
                        )}
                        <div className="message-bubble">
                            {msg.text.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    {i < msg.text.split('\n').length - 1 && <br />}
                                </React.Fragment>
                            ))}
                            <span className="message-time">{formatTime(msg.timestamp)}</span>
                        </div>
                    </div>
                ))}

                {/* ANIMACIÓN DE CARGA */}
                {loading && (
                    <div className="loading-container">
                        <div className="msg-avatar">
                            <Bot size={16} color="#10b981" />
                        </div>
                        <div className="loading-indicator">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className="chat-input-area">
                {/* Overlay de Límite Diario */}
                {isOverDailyLimit && (
                    <div className="limit-warning-overlay">
                        ⛔ Límite de consultas diarias alcanzado
                    </div>
                )}

                {/* Contador de Palabras */}
                {input.length > 0 && !isOverDailyLimit && (
                    <span className={`word-counter ${isOverWordLimit ? 'limit-reached' : ''}`}>
                        {wordCount}/{MAX_WORDS}
                    </span>
                )}

                <textarea
                    className="chat-textarea"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isAuthenticated ? "Escribe tu consulta..." : "Ingresa clave..."}
                    rows={1}
                    disabled={loading || isOverDailyLimit}
                />

                <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={loading || !input.trim() || isOverWordLimit || isOverDailyLimit}
                    style={{ opacity: (loading || isOverWordLimit || isOverDailyLimit) ? 0.5 : 1 }}
                >
                    {isAuthenticated ? <Send size={20} /> : <Lock size={20} />}
                </button>
            </div>
        </div>
    );
};

export default OpsChatbot;