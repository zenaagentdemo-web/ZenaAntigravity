import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('--- Environment Check ---');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length || 0);
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('--- Done ---');
