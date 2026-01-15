
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jobManager } from '../services/job-manager.service.js';
import { ToolExecutionService } from '../services/tool-execution.service.js';
import { ToolRegistry } from '../tools/registry.js';
import { ZenaToolDefinition } from '../tools/types.js';

describe('Scenario S100: Parallel Task Execution (Async Tools)', () => {
    const mockUserId = 'user-parallel-test';

    // Create REAL registry instance for test
    const testRegistry = new ToolRegistry();
    // Instantiate service ensuring we use OUR registry AND jobManager
    const toolExecutionService = new ToolExecutionService(testRegistry, jobManager);

    // Mock tool definition
    const mockAsyncTool: ZenaToolDefinition = {
        name: 'test.async_tool',
        domain: 'system',
        description: 'A slow tool that runs in background',
        inputSchema: { type: 'object', properties: { duration: { type: 'number' } } },
        outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
        permissions: [],
        requiresApproval: false,
        isAsync: true,
        execute: async (params, context) => {
            await new Promise(resolve => setTimeout(resolve, params.duration || 50));
            return {
                success: true,
                data: { result: 'Async Success' }
            };
        },
        auditLogFormat: () => ({ action: 'TEST', summary: 'Test' })
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Register directly to our test registry instance
        testRegistry.register(mockAsyncTool);
    });

    it('should immediately return "Job Started" and emit completion event later', async () => new Promise<void>((done) => {

        let jobCompleted = false;
        jobManager.on('job_completed', (job) => {
            if (job.toolName === 'test.async_tool') {
                console.log('✅ Job completed event received:', job.id);
                expect(job.status).toBe('completed');
                expect(job.result.result).toBe('Async Success');
                jobCompleted = true;
                done();
            }
        });

        console.log('🚀 Triggering async tool...');
        toolExecutionService.executeTool(
            'test.async_tool',
            { duration: 100 },
            { userId: mockUserId, conversationId: 'test-conv', approvalConfirmed: true }
        ).then(response => {
            console.log('📦 Immediate response:', response);
            expect(response.success).toBe(true);
            expect(response.result).toBeDefined();
            expect(response.result.status).toBe('started');
            expect(jobCompleted).toBe(false);
        });

    }));

    it('should handle tool failures gracefully', async () => new Promise<void>((done) => {
        const failingTool: ZenaToolDefinition = {
            ...mockAsyncTool,
            name: 'test.failing_tool',
            execute: async () => { throw new Error('Planned Failure'); }
        };
        testRegistry.register(failingTool);

        jobManager.on('job_failed', (job) => {
            if (job.toolName === 'test.failing_tool') {
                console.log('✅ Job failed event received:', job.id);
                expect(job.status).toBe('failed');
                expect(job.error).toBe('Planned Failure');
                done();
            }
        });

        toolExecutionService.executeTool(
            'test.failing_tool',
            {},
            { userId: mockUserId, conversationId: 'test-conv', approvalConfirmed: true }
        );
    }));
});
