import { useState } from 'react';

const SESSION_ID = 'session-' + Math.random().toString(36).substr(2, 9);

export const useN8N = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const WEBHOOK_URL = 'http://localhost:5679/webhook-test/ops-chat-input';

    const sendMessage = async (message: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatInput: message,
                    sessionId: SESSION_ID
                }),
            });

            if (!response.ok) {
                throw new Error(`Error en la petición: ${response.statusText}`);
            }

            const data = await response.json();

            // Priorizamos 'text' porque así lo configuramos en el nodo "Respond to Webhook"
            return data.text || data.output || JSON.stringify(data);

        } catch (err) {
            console.error("Error conectando con n8n:", err);
            setError('No se pudo conectar con el asistente.');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { sendMessage, loading, error };
};