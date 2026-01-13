import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Loader2, Lock } from 'lucide-react';
import { useN8N } from '../../hooks/useN8N';
import './OpsChatbot.css';

interface Message {
    id: string;
    role: 'bot' | 'user';
    text: string;
    timestamp: Date;
}

const OpsChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [input, setInput] = useState('');
    const { sendMessage, loading } = useN8N();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'bot',
            text: 'Hola. Soy OpsChat. Puedo consultar el estado de los servidores, backups y monitoreos. ¿Qué necesitas saber?\n\n🚧 En este momento estoy en fase de prueba, ingresa la palabra clave para iniciar.',
            timestamp: new Date()
        }
    ]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const currentInput = input.trim();

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: currentInput,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

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
                        text: '❌ Palabra clave incorrecta. No puedo iniciar la conversación sin autorización.',
                        timestamp: new Date()
                    }]);
                }
            }, 600);
            return;
        }

        try {
            const response = await sendMessage(currentInput);
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                text: typeof response === 'string' ? response : JSON.stringify(response),
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                text: '⚠️ Error de conexión con el núcleo de IA. Intenta nuevamente.',
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


    if (!isOpen) {
        return (
            <button className="chatbot-trigger" onClick={() => setIsOpen(true)}>
                <Bot size={28} />
            </button>
        );
    }

    return (
        <div className="chatbot-window">
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
                        <h3>OpsChat Assistant</h3>
                        <span className={`chat-status ${isAuthenticated ? 'status-online' : 'status-locked'}`}>
                            {isAuthenticated ? '● En línea' : '● Esperando autorización'}
                        </span>
                    </div>
                </div>

                <button className="close-btn" onClick={() => setIsOpen(false)}>
                    <X size={20} />
                </button>
            </div>

            <div className="chat-messages">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-row ${msg.role}`}>
                        {msg.role === 'bot' && (
                            <div className="msg-avatar">
                                <Bot size={16} color="#10b981" />
                            </div>
                        )}
                        <div className="message-bubble">
                            {msg.text}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="loading-indicator">
                        <Loader2 size={16} className="animate-spin" /> Procesando...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <textarea
                    className="chat-textarea"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isAuthenticated ? "Pregunta sobre servidores..." : "Ingresa la clave de acceso..."}
                    rows={1}
                />
                <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                >
                    {isAuthenticated ? <Send size={20} /> : <Lock size={20} />}
                </button>
            </div>
        </div>
    );
};

export default OpsChatbot;