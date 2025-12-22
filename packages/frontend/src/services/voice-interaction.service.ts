/**
 * Service for high-quality TTS and STT using Google Cloud / Gemini
 */
export class VoiceInteractionService {
    /**
     * Generates high-quality speech from text
     */
    async speak(text: string): Promise<ArrayBuffer> {
        const token = localStorage.getItem('authToken');
        const API_BASE_URL = import.meta.env.VITE_API_URL || '';

        try {
            const response = await fetch(`${API_BASE_URL}/api/ask/tts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ text })
            });
            if (!response.ok) throw new Error('TTS request failed');
            return await response.arrayBuffer();
        } catch (err) {
            console.error('TTS failed:', err);
            throw err;
        }
    }

    /**
     * Transcribes audio to text
     */
    async transcribe(audioBlob: Blob): Promise<string> {
        const token = localStorage.getItem('authToken');
        const API_BASE_URL = import.meta.env.VITE_API_URL || '';

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => {
                resolve((reader.result as string).split(',')[1]);
            };
            reader.readAsDataURL(audioBlob);
        });

        const base64 = await base64Promise;

        try {
            const response = await fetch(`${API_BASE_URL}/api/ask/stt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ audio: base64, mimeType: audioBlob.type })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'STT request failed');
            }
            const data = await response.json();
            return (data as { transcript: string }).transcript;
        } catch (err) {
            console.error('STT failed:', err);
            throw err;
        }
    }
}

export const voiceInteractionService = new VoiceInteractionService();
