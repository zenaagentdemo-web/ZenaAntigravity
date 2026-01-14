import prisma from '../src/config/database.js';

async function generateReport() {
    console.log('📊 Generating Token Usage Report (Last 7 Days)...');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    try {
        const logs = await prisma.aIUsageLog.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (logs.length === 0) {
            console.log('❌ No usage logs found for the last 7 days.');
            return;
        }

        // Group by Date and Source
        const dailyUsage: Record<string, Record<string, { requests: number, input: number, output: number }>> = {};

        for (const log of logs) {
            const date = log.createdAt.toISOString().split('T')[0];
            const source = log.source || 'unknown';

            if (!dailyUsage[date]) dailyUsage[date] = {};
            if (!dailyUsage[date][source]) dailyUsage[date][source] = { requests: 0, input: 0, output: 0 };

            dailyUsage[date][source].requests++;
            dailyUsage[date][source].input += log.inputTokens;
            dailyUsage[date][source].output += log.outputTokens || 0;
        }

        // Sort dates descending
        const sortedDates = Object.keys(dailyUsage).sort((a, b) => b.localeCompare(a));

        for (const date of sortedDates) {
            console.log(`📅 Date: ${date}`);
            console.log('───────────────────────────────────────────────────────────────');

            const tableData = Object.entries(dailyUsage[date]).map(([source, stats]) => ({
                Feature: source,
                Requests: stats.requests,
                'Input Tokens': stats.input,
                'Output Tokens': stats.output,
                'Total Tokens': stats.input + stats.output
            }));

            console.table(tableData);
            console.log('');
        }

        // Generate Grand Totals
        const totals = logs.reduce((acc, log) => {
            acc.requests++;
            acc.input += log.inputTokens;
            acc.output += log.outputTokens || 0;
            return acc;
        }, { requests: 0, input: 0, output: 0 });

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🏆 GRAND TOTALS (7 DAYS)');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`Total Requests:      ${totals.requests}`);
        console.log(`Total Input Tokens:  ${totals.input}`);
        console.log(`Total Output Tokens: ${totals.output}`);
        console.log(`Overall Tokens:      ${totals.input + totals.output}`);
        console.log('═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error generating report:', error);
    } finally {
        await prisma.$disconnect();
    }
}

generateReport();
