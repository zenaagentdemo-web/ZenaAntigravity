import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'backend-debug.log');

export const fileLogger = {
    log: (message: string, data?: any) => {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n`;
        try {
            fs.appendFileSync(LOG_FILE, logEntry);
        } catch (err) {
            console.error('Failed to write to log file:', err);
        }
    }
};
