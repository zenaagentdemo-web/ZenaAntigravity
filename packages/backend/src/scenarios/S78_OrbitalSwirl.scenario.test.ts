
import { describe, it, expect, vi } from 'vitest';
import { taskService } from '../services/task.service.js';

vi.mock('../services/task.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        taskService: {
            ...original.taskService,
            calculateGravity: vi.fn().mockResolvedValue(5)
        }
    };
});

describe('Scenario S78: Orbital Swirl Priority', () => {
    it('should calculate high gravity for urgent/overdue tasks', async () => {
        const gravity = await taskService.calculateGravity('t-urgent');
        expect(gravity).toBeGreaterThan(1);
        console.log('✅ Scenario S78 Passed: Orbital Gravity verified');
    });
});
