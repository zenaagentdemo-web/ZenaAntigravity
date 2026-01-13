import { calendarOptimizerService } from '../src/services/calendar-optimizer.service.js';

async function main() {
    console.log('🚀 Starting Optimization Logic Verification...');

    // Test user ID
    const userId = 'user-123';

    try {
        console.log('1. Calling optimizeDay...');
        const result = await calendarOptimizerService.optimizeDay(userId, new Date());

        console.log('✅ Optimization Result received!');
        console.log('Metrics:', JSON.stringify(result.metrics, null, 2));
        console.log('Changes:', JSON.stringify(result.changes, null, 2));

        if (result.metrics.drivingTimeSavedMinutes >= 0) {
            console.log('✅ TEST PASSED: Metrics calculated.');
        } else {
            console.log('❌ TEST FAILED: Negative or missing metrics.');
        }

    } catch (error) {
        console.error('❌ TEST FAILED with Error:', error);
    }
}

main().catch(console.error);
