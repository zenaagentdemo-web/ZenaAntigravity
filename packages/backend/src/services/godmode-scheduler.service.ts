import { PrismaClient } from '@prisma/client';
import { godmodeService } from './godmode.service.js';

const prisma = new PrismaClient();

// Scan interval: 6 hours (was 1 hour)
const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000;

export class GodmodeSchedulerService {
    private scanIntervalId: NodeJS.Timeout | null = null;
    private isRunning = false;

    start(): void {
        if (this.isRunning) {
            console.log('[GodmodeScheduler] Already running');
            return;
        }

        console.log('[GodmodeScheduler] Starting autonomous pulse (6-hour interval, Full God only)...');
        this.isRunning = true;

        // Run initial scan after 30 seconds (Optional: keep as a small cold-start)
        // setTimeout(() => {
        //     this.runScan().catch(console.error);
        // }, 30 * 1000);

        // DISABLED: Periodic background scans are now replaced by throttled page-visit heartbeats.
        // this.scanIntervalId = setInterval(() => {
        //     this.runScan().catch(console.error);
        // }, SCAN_INTERVAL_MS);
    }

    stop(): void {
        if (this.scanIntervalId) {
            clearInterval(this.scanIntervalId);
            this.scanIntervalId = null;
        }
        this.isRunning = false;
        console.log('[GodmodeScheduler] Stopped.');
    }

    private async runScan(): Promise<void> {
        console.log('[GodmodeScheduler] Initiating global scan check...');
        try {
            const users = await prisma.user.findMany({ select: { id: true } });
            let scannedCount = 0;
            let skippedCount = 0;

            for (const user of users) {
                // Only run scan if user has Full Godmode enabled
                const settings = await godmodeService.getSettings(user.id);

                if (settings.mode === 'off') {
                    console.log(`[GodmodeScheduler] Skipping user ${user.id} - Godmode mode: ${settings.mode}`);
                    skippedCount++;
                    continue;
                }

                console.log(`[GodmodeScheduler] Running scan for user ${user.id} (${settings.mode} mode active)`);
                await godmodeService.runAutoScan(user.id);
                scannedCount++;
            }

            console.log(`[GodmodeScheduler] Scan complete: ${scannedCount} users scanned, ${skippedCount} skipped`);
        } catch (error) {
            console.error('[GodmodeScheduler] Error in scan:', error);
        }
    }
}

export const godmodeSchedulerService = new GodmodeSchedulerService();
