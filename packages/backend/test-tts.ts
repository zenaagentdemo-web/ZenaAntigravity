import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testTTS() {
    const apiKey = process.env.GEMINI_API_KEY;
    const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    console.log('Testing Google TTS API with key duration:', apiKey?.length);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: { text: 'Testing one two three' },
                voice: {
                    languageCode: 'en-US',
                    name: 'en-US-Neural2-F',
                    ssmlGender: 'FEMALE'
                },
                audioConfig: {
                    audioEncoding: 'MP3'
                }
            })
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response body:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('TTS Test failed:', err);
    }
}

testTTS();
