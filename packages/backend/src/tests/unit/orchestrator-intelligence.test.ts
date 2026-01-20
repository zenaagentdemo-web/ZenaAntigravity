import { describe, it, expect, vi, beforeEach } from 'vitest';
import { agentOrchestrator } from '../../services/agent-orchestrator.service.js';
import { toolRegistry } from '../../tools/registry.js';
import { proactiveContextService } from '../../services/proactive-context.service.js';
import { websocketService } from '../../services/websocket.service.js';
import { sessionManager } from '../../services/session-manager.service.js';
import { toolExecutionService } from '../../services/tool-execution.service.js';

// 🧠 ZENA GLOBAL WIRING: Reconnect the brain
import '../../tools/index.js';

describe('AgentOrchestrator Intelligence & Cascading', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock websocket to prevent network errors
        vi.spyOn(websocketService, 'broadcastToUser').mockReturnValue(undefined as any);
        vi.spyOn(websocketService, 'broadcastAgentMessage').mockReturnValue(undefined as any);

        // Mock tool execution to be successful by default
        vi.spyOn(toolExecutionService, 'executeTool').mockResolvedValue({
            success: true,
            result: { id: 'test-id', status: 'created' }
        } as any);
    });

    describe('Proactive Enrichment (Intelligence Step 1)', () => {
        it('should trigger proactive web search before property creation', async () => {
            const userId = 'user-123';

            // Mock Gemini to return a property.create call
            vi.spyOn((agentOrchestrator as any), 'callGemini').mockResolvedValue({
                candidates: [{
                    content: {
                        parts: [
                            { text: 'Creating property...' },
                            {
                                functionCall: {
                                    name: 'property.create',
                                    args: { address: '22 Boundary Road, Taupo' }
                                }
                            }
                        ]
                    }
                }]
            });

            // Mock scanForContext to return data
            const scanSpy = vi.spyOn(proactiveContextService, 'scanForContext').mockResolvedValue({
                hasMatches: true,
                matches: [{ source: 'Web', id: '1', title: 'Test', snippet: '...', relevance: 100 }],
                scanKey: 'key-1',
                suggestedData: { bedrooms: 3, bathrooms: 2 },
                summaryForUser: 'Found details on the web'
            });

            const response = await agentOrchestrator.processQuery(userId, 'create property card for 22 Boundary Road');

            // 1. Verify proactiveness was triggered
            expect(scanSpy).toHaveBeenCalled();

            // 2. Verify history contains enrichment note
            const session = sessionManager.getOrCreateSession(userId);
            const historyText = JSON.stringify(session.conversationHistory);
            expect(historyText).toContain('Found details on the web');
        });
    });

    describe('Multi-Action Cascading (Cascading Step)', () => {
        it('should execute multiple tools in a single turn if both are auto-approvable', async () => {
            const userId = 'user-multiple-fixed';

            // Mock Gemini with TWO tool calls
            vi.spyOn((agentOrchestrator as any), 'callGemini').mockResolvedValue({
                candidates: [{
                    content: {
                        parts: [
                            { text: 'Doing that now...' },
                            {
                                functionCall: {
                                    name: 'contact.create',
                                    args: { name: 'John Doe', role: 'vendor' }
                                }
                            },
                            {
                                functionCall: {
                                    name: 'task.create',
                                    args: { label: 'Follow up with John Doe' }
                                }
                            }
                        ]
                    }
                }]
            });

            // Mock follow-up turn (synthesis)
            vi.spyOn((agentOrchestrator as any), 'processFollowUp').mockResolvedValue({
                answer: 'Done!',
                sessionId: '...'
            });

            await agentOrchestrator.processQuery(userId, 'Create John Doe as a vendor and add a task to follow up');

            const session = sessionManager.getOrCreateSession(userId);
            const historyText = JSON.stringify(session.conversationHistory);

            // Verify BOTH tools are mentioned in history
            expect(historyText).toContain('contact.create');
            expect(historyText).toContain('task.create');
        });
    });
});
