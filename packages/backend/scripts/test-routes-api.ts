
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensure .env is loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.join(__dirname, '../.env') });

import { geospatialService } from '../src/services/geospatial.service.js';

async function testRoutes() {
    console.log('--- Testing Google Maps Routes API ---');
    console.log('API Key Present:', !!process.env.GOOGLE_MAPS_API_KEY);

    // Real Auckland addresses
    const origin = "Sky Tower, Victoria Street West, Auckland";
    const destination = "Auckland Airport, Ray Emery Drive, Māngere, Auckland";

    console.log(`\nCalculating route:`);
    console.log(`From: ${origin}`);
    console.log(`To:   ${destination}`);

    const start = Date.now();
    const metrics = await geospatialService.getRouteMetrics(origin, destination);
    const duration = Date.now() - start;

    console.log('\n--- Result ---');
    if (metrics) {
        console.log('Distance:', (metrics.distanceMeters / 1000).toFixed(2), 'km');
        console.log('Duration:', Math.round(metrics.durationSeconds / 60), 'minutes');
        console.log('API Latency:', duration, 'ms');

        if ((metrics as any).simulation_mode) {
            console.log('\n❌ FALLBACK: Result is from Simulation Mode (Mock Data).');
            console.log('The API Key might be invalid or the API is not enabled in Google Console.');
        } else {
            console.log('\n✅ SUCCESS: Result is from Real Google Routes API.');
        }
    } else {
        console.error('❌ FAILED: No metrics returned.');
    }
}

testRoutes().catch(console.error);
