import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'packages/backend/.env') });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        console.log('Models:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

listModels();
