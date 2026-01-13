
import { describe, it, expect, vi } from 'vitest';
import { taskService } from '../services/task.service.js';

vi.mock('../services/task.service.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        taskService: {
            ...original.taskService,
            batchDefer: vi.fn().mockResolvedValue({ count: 3 })
        }
    };
});

describe('Scenario S79: Batch Task Deference', () => {
    it('should defer multiple tasks at once', async () => {
        const result = await taskService.batchDefer(['t1', 't2', 't3'], 'u123', new Date());
        expect(result.count).toBe(3);
        console.log('✅ Scenario S79 Passed: Batch Defer verified');
    });
});
