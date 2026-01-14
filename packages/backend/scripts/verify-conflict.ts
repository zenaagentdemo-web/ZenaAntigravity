
import { api } from '../src/utils/apiClient'; // Mock or use real client if doable in script context? 
// Actually backend scripts usually import service directly.
import { calendarOptimizerService } from '../src/services/calendar-optimizer.service';
import prisma from '../src/config/database';

async function verify() {
    console.log('🚀 Starting Verification of Conflict Logic...');

    const userId = 'user-123';
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const start = today;
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    // 1. Setup: Create a conflict
    console.log('1️⃣ Creating Test Event at 10:00 AM...');
    await prisma.task.create({
        data: {
            userId,
            label: 'CONFLICT_TEST_EVENT',
            dueDate: start,
            status: 'open',
            source: 'manual'
        }
    });

    // 2. Check Conflict
    console.log('2️⃣ Checking for conflict at 10:00 AM...');
    const result = await calendarOptimizerService.checkConflict(userId, start, end);

    if (result.hasConflict) {
        console.log('✅ Conflict Detected correctly.');
        console.log('   Conflict with:', result.conflict.title);
        if (result.proposal) {
            console.log('   Proposal:', result.proposal.reason);
            console.log('   Proposed Time:', result.proposal.startTime);
        } else {
            console.log('   ❌ No proposal returned (might be intended if day full).');
        }
    } else {
        console.error('❌ FAILED: No conflict detected.');
    }

    // 3. Cleanup
    console.log('3️⃣ Cleanup...');
    const task = await prisma.task.findFirst({ where: { label: 'CONFLICT_TEST_EVENT' } });
    if (task) {
        await prisma.task.delete({ where: { id: task.id } });
    }

    process.exit(0);
}

verify();
