/**
 * Extract Live Logs - Helper script to summarize Zena Live behavior from debug.log
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.join(__dirname, '../debug.log');

function extractLogs() {
    if (!fs.existsSync(LOG_FILE)) {
        console.error('Log file not found at:', LOG_FILE);
        return;
    }

    console.log('--- ZENA LIVE SESSION SUMMARY ---');
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.split('\n');

    let currentSession: any = null;

    lines.forEach(line => {
        if (!line.trim()) return;
        try {
            const entry = JSON.parse(line);
            const msg = entry.message || '';

            if (msg.includes('voice.live.start') || msg.includes('STARTING SESSION')) {
                console.log(`\n🚀 [NEW SESSION] ${entry.timestamp}`);
                console.log(`   User: ${entry.context?.userId || 'unknown'}`);
                console.log(`   Context: ${entry.context?.context || 'none'}`);
            }

            if (msg.includes('Received voice.live.prompt')) {
                console.log(`   💬 [PROMPT] ${msg.split('TEXT:')[1]?.trim() || ''}`);
            }

            if (msg.includes('RAW Message from Gemini')) {
                // Peek into what Gemini is actually sending back
                if (msg.includes('serverContent')) {
                    console.log(`   🤖 [GEMINI RESPONSE]`);
                }
            }

            if (msg.includes('Audio chunk')) {
                // Summary of audio activity
                // (Could count chunks here)
            }

            if (msg.includes('error') || entry.level === 'error') {
                console.log(`   ❌ [ERROR] ${msg}`);
            }

            if (msg.includes('Session stopping') || msg.includes('onclose')) {
                console.log(`   ⏹️ [STOP] ${entry.timestamp}`);
            }

        } catch (e) {
            // Probably not a JSON log entry
        }
    });
}

extractLogs();
