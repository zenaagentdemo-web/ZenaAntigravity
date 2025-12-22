import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'packages/backend/.env') });

async function testSTT() {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = 'gemini-3-flash-preview';

    console.log(`Using model: ${model}`);
    console.log(`API Key: ${apiKey?.substring(0, 4)}...`);

    if (!apiKey) {
        console.error('No API Key found!');
        return;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Minimal valid request to check API connectivity
    const body = {
        contents: [{
            parts: [{ text: "Hello" }]
        }]
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            console.log('API call successful!');
            const data = await response.json();
            console.log('Response:', JSON.stringify(data).substring(0, 100));
        } else {
            console.error('API call failed:', response.status);
            console.error(await response.text());
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testSTT();
