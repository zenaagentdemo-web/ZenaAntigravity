import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'packages/backend/.env') });

async function testGeminiTTS() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = 'gemini-2.5-flash-preview-tts';

    console.log(`Using model: ${model}`);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
        contents: [{
            parts: [
                { text: "Hello, I am Zena. I am testing my new voice." }
            ]
        }],
        generationConfig: {
            response_mime_type: "audio/wav"
        }
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            console.log('Gemini TTS call successful!');
            const data = await response.json();
            console.log('Response structure:', JSON.stringify(data).substring(0, 500));
        } else {
            console.error('Gemini TTS call failed:', response.status);
            console.error(await response.text());
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testGeminiTTS();
