
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

async function debugWebSearch() {
    console.log('🔬 Debugging Web Search for 16 Boundary Road Taupo');

    // Import service
    const { proactiveContextService } = await import('../src/services/proactive-context.service.js');

    const address = '20 Boundary Road, Taupo';

    console.log(`\n1. Clearing cache for "${address}"...`);
    // Access private cache via any (hacky but works for debug)
    (proactiveContextService as any).webSearchCache.clear();

    console.log(`\n2. Running scanForContext...`);
    const startTime = Date.now();

    try {
        const result = await proactiveContextService.scanForContext(
            'debug-user',
            'create',
            'property',
            { address }
        );

        const duration = Date.now() - startTime;
        console.log(`\n⏱️ Duration: ${duration}ms`);
        console.log(`Matches found: ${result.matches.length}`);

        if (result.matches.length > 0) {
            console.log('✅ Matched Data:', JSON.stringify(result.matches[0].data, null, 2));
        } else {
            console.log('❌ No matches found.');
        }

    } catch (error) {
        console.error('💥 Error during scan:', error);
    }

    process.exit(0);
}

debugWebSearch();
