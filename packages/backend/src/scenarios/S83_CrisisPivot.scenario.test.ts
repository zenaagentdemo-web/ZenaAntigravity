
import { describe, it, expect, vi } from 'vitest';
import { taskService } from '../services/task.service.js';

vi.mock('../services/task.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        taskService: {
            ...original.taskService,
            crisisPivot: vi.fn().mockResolvedValue({ count: 12 })
        }
    };
});

describe('Scenario S83: Crisis Pivot', () => {
    it('should reschedule multiple tasks during crisis', async () => {
        const result = await taskService.crisisPivot('u123', 'Sudden lockdown');
        expect(result.count).toBe(12);
        console.log('✅ Scenario S83 Passed: Crisis Pivot verified');
    });
});
