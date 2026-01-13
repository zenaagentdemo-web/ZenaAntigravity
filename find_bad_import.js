
const fs = require('fs');
const path = require('path');

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if ((file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Check for import { ... prisma ... } from ...config/database
            if (content.match(/import\s*\{[^}]*prisma[^}]*\}\s*from\s*['"].*config\/database/)) {
                console.log('FOUND BAD IMPORT IN:', fullPath);
            }
            // Check for export { ... prisma ... } from ...config/database
            if (content.match(/export\s*\{[^}]*prisma[^}]*\}\s*from\s*['"].*config\/database/)) {
                console.log('FOUND BAD EXPORT IN:', fullPath);
            }
            // Check for import { ... prisma ... } from ...utils/database
            if (content.match(/import\s*\{[^}]*prisma[^}]*\}\s*from\s*['"].*utils\/database/)) {
                console.log('FOUND BAD IMPORT IN (utils):', fullPath);
            }
        }
    }
}

scanDir('/Users/hamishmcgee/Desktop/ZenaAntigravity/packages/backend/src');
