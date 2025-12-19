import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    console.log('Testing Gemini API with model:', model);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Hello, are you functional?' }] }]
            })
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response body:', JSON.stringify(data, null, 2));

        if (response.status === 402 || (data.error && data.error.message.toLowerCase().includes('billing'))) {
            console.log('\nDIAGNOSIS: Billing issue detected.');
        } else if (response.status === 429) {
            console.log('\nDIAGNOSIS: Quota/Rate limit issue detected.');
        } else if (response.status === 404) {
            console.log('\nDIAGNOSIS: Model not found or invalid endpoint.');
        }
    } catch (err) {
        console.error('Test failed:', err);
    }
}

testGemini();
