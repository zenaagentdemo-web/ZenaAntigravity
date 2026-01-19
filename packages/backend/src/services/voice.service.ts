import fs from 'fs';
import { tokenTrackingService } from './token-tracking.service.js';

export class VoiceService {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
    }

    /**
     * Transcribe audio using Gemini 3 Flash
     */
    async transcribe(audioBase64: string, mimeType: string): Promise<string> {
        // Clean cleanup mimeType (Gemini doesn't like parameters like ;codecs=opus)
        const cleanMimeType = mimeType.split(';')[0].trim();
        const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

        console.log(`[VoiceService] Transcribing with model: ${model}, mimeType: ${cleanMimeType}`);
        console.log(`[VoiceService] API Key prefix: ${this.apiKey.substring(0, 4)}...`);

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        const body = {
            contents: [{
                role: 'user',
                parts: [
                    { text: "Transcribe this audio exactly as spoken in English. Only return the transcription, nothing else." },
                    {
                        inline_data: {
                            mime_type: cleanMimeType,
                            data: audioBase64
                        }
                    }
                ]
            }]
        };

        const logPath = 'gemini_debug.log';
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] Transcribing with model: ${model}, mimeType: ${cleanMimeType}\n`);

        const startTime = Date.now();
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] Gemini STT error: ${response.status} ${errorText}\n`);
            console.error('[VoiceService] Gemini STT error:', response.status, errorText);
            throw new Error(`Gemini STT error: ${response.status} ${errorText}`);
        }

        const data = await response.json() as any;

        // Log token usage
        if (data.usageMetadata) {
            tokenTrackingService.log({
                source: 'voice-stt',
                model: model,
                inputTokens: data.usageMetadata.promptTokenCount,
                outputTokens: data.usageMetadata.candidatesTokenCount,
                durationMs: Date.now() - startTime
            }).catch(() => { });
        }

        fs.appendFileSync(logPath, `[${new Date().toISOString()}] Gemini Response: ${JSON.stringify(data).substring(0, 500)}\n`);

        const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (!transcript) {
            console.warn('[VoiceService] No transcript found in Gemini response');
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] No transcript found\n`);
        }
        return transcript;
    } catch(err: any) {
        fs.appendFileSync('gemini_debug.log', `[${new Date().toISOString()}] Catch error: ${err.message}\n`);
        throw err;
    }

    private cleanTextForSpeech(text: string): string {
        return text
            .replace(/\*\*/g, '') // Remove bold
            .replace(/\*/g, '')   // Remove italics
            .replace(/#/g, '')    // Remove headers
            .replace(/\[.*?\]/g, '') // Remove brackets [Action]
            .replace(/\(.*?\)/g, '') // Remove parentheses (Playful)
            .replace(/_{1,2}/g, '')  // Remove underscores
            .replace(/`{1,3}.*?`{1,3}/gs, '') // Remove code
            .replace(/\n+/g, ' ')   // Newlines to spaces
            .trim();
    }

    /**
     * Generate speech using Google Cloud TTS
     */
    async textToSpeech(text: string): Promise<Buffer> {
        const logPath = 'gemini_debug.log';
        const cleanedText = this.cleanTextForSpeech(text);
        // Using the REST API for Google Cloud TTS
        const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`;

        // Cortana-like settings: Studio voice, slightly higher pitch, slightly faster rate
        const body = {
            input: { text: cleanedText },
            voice: {
                languageCode: 'en-US',
                name: 'en-US-Studio-O', // Most advanced female studio voice
                ssmlGender: 'FEMALE'
            },
            audioConfig: {
                audioEncoding: 'MP3',
                pitch: 1.2, // Slightly higher pitch for AI aesthetic
                speakingRate: 1.05 // Slightly faster for responsiveness
            }
        };

        fs.appendFileSync(logPath, `[${new Date().toISOString()}] Generating TTS for text: ${text.substring(0, 50)}...\n`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] Google TTS error: ${response.status} ${errorText}\n`);
            console.error('[VoiceService] Google TTS error:', response.status, errorText);
            throw new Error(`Google TTS error: ${response.status} ${errorText}`);
        }

        const data = await response.json() as { audioContent: string };

        // Log TTS usage (characters as tokens for tracking)
        tokenTrackingService.log({
            source: 'voice-tts',
            model: 'google-tts',
            inputTokens: cleanedText.length,
            durationMs: Date.now() - startTime
        }).catch(() => { });

        fs.appendFileSync(logPath, `[${new Date().toISOString()}] TTS generated successfully\n`);
        return Buffer.from(data.audioContent, 'base64');
    }
}

export const voiceService = new VoiceService();
