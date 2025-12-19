
export class VoiceService {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
    }

    /**
     * Transcribe audio using Gemini 1.5 Flash
     */
    async transcribe(audioBase64: string, mimeType: string): Promise<string> {
        const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        const body = {
            contents: [{
                role: 'user',
                parts: [
                    { text: "Transcribe this audio exactly as spoken. Only return the transcription, nothing else." },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: audioBase64
                        }
                    }
                ]
            }]
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[VoiceService] Gemini STT error:', response.status, error);
            console.error('Full response body:', error); // Added this line
            throw new Error(`Gemini STT error: ${response.status} ${error}`);
        }

        const data = await response.json() as any;
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }

    /**
     * Generate speech using Google Cloud TTS
     */
    async textToSpeech(text: string): Promise<Buffer> {
        // Using the REST API for Google Cloud TTS
        const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`;

        const body = {
            input: { text },
            voice: {
                languageCode: 'en-US',
                name: 'en-US-Neural2-F', // High quality female voice
                ssmlGender: 'FEMALE'
            },
            audioConfig: {
                audioEncoding: 'MP3'
            }
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[VoiceService] Google TTS error:', response.status, error);
            console.error('Full response body:', error); // Added this line
            throw new Error(`Google TTS error: ${response.status} ${error}`);
        }

        const data = await response.json() as { audioContent: string };
        return Buffer.from(data.audioContent, 'base64');
    }
}

export const voiceService = new VoiceService();
