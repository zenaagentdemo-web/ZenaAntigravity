import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { encryptToken, decryptToken } from './src/utils/encryption.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('--- Encryption Check ---');
const key = process.env.ENCRYPTION_KEY;
console.log('ENCRYPTION_KEY exists:', !!key);
if (key) {
    console.log('ENCRYPTION_KEY length:', key.length);
    try {
        const testString = 'test-string';
        const encrypted = encryptToken(testString);
        console.log('Encryption successful');
        const decrypted = decryptToken(encrypted);
        console.log('Decryption successful:', decrypted === testString);
    } catch (error) {
        console.error('Encryption test failed:', error);
    }
} else {
    console.error('ENCRYPTION_KEY is missing!');
}
console.log('--- Done ---');
