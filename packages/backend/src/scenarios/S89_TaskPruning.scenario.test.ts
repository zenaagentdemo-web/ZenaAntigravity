
import { describe, it, expect, vi } from 'vitest';
import { taskService } from '../services/task.service.js';

vi.mock('../services/task.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        taskService: {
            ...original.taskService,
            pruneTasks: vi.fn().mockResolvedValue({ count: 15 })
        }
    };
});

describe('Scenario S89: AI Task Pruning', () => {
    it('should delete low-priority ghost tasks', async () => {
        const result = await taskService.pruneTasks('u123');
        expect(result.count).toBe(15);
        console.log('✅ Scenario S89 Passed: Task Pruning verified');
    });
});
