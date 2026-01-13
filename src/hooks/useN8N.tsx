import { useState } from 'react';

export const useN8N = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const WEBHOOK_URL = 'http://localhost:5678/webhook-test/chat';

    const sendMessage = async (message: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ chatInput: message }),
            });

            if (!response.ok) {
                throw new Error(`Error en la petición: ${response.statusText}`);
            }

            const data = await response.json();
            return data.output || data.text || data.message || JSON.stringify(data);

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