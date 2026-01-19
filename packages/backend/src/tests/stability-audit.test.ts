
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { agentOrchestrator } from '../services/agent-orchestrator.service.js';
import { askZenaService } from '../services/ask-zena.service.js';
import { navigationPlannerService } from '../services/navigation-planner.service.js';
import prisma from '../config/database.js';
import { AgentSession, sessionManager } from '../services/session-manager.service.js';

describe('Stability Audit: Zena Brain Purification', () => {
    const userId = 'stability_audit_user';
    let sessionId: string;
    let session: AgentSession;

    beforeEach(async () => {
        // Setup user and session
        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: { id: userId, email: 'audit@zena.com', name: 'Stability Auditor', passwordHash: 'hash' }
        });

        // Clean slate
        await prisma.chatMessage.deleteMany({ where: { conversation: { userId } } });
        await prisma.chatConversation.deleteMany({ where: { userId } });
        await prisma.contact.deleteMany({ where: { userId } });
        await prisma.property.deleteMany({ where: { userId } });

        // Create conversation
        const conversation = await prisma.chatConversation.create({
            data: { id: 'conv_123', userId, title: 'Audit Test' }
        });

        session = sessionManager.getOrCreateSession(userId);
        sessionId = session.sessionId;
        session.conversationId = conversation.id;
    });

    afterEach(async () => {
        vi.restoreAllMocks();
    });

    it('SAFEGUARD 1: Should THROW AMBIGUITY_DETECTED for duplicate contacts (Zero-Guess)', async () => {
        // 1. Seed duplicates
        await prisma.contact.create({ data: { userId, name: 'Charlie Temp', emails: ['charlie1@test.com'], role: 'vendor' } });
        await prisma.contact.create({ data: { userId, name: 'Charlie Temp', emails: ['charlie2@test.com'], role: 'buyer' } });

        // 2. Call resolveSmartParameters directly
        const toolDef = { name: 'contact.update', domain: 'contact' } as any;
        const args = { contactName: 'Charlie Temp', role: 'vendor' };

        // 3. Verify it throws specific error
        await expect(agentOrchestrator.resolveSmartParameters(
            session,
            toolDef,
            args,
            new Map()
        )).rejects.toThrow(/AMBIGUITY_DETECTED/);
    });

    it('SAFEGUARD 2: Should SAFELY RESOLVE unique contacts without ID', async () => {
        // 1. Seed unique
        const unique = await prisma.contact.create({ data: { userId, name: 'Unique Alice', emails: ['alice@test.com'], role: 'vendor' } });

        // 2. Call resolve
        const toolDef = { name: 'contact.update', domain: 'contact' } as any;
        const args = { contactName: 'Unique Alice', role: 'buyer' };

        const resolved = await agentOrchestrator.resolveSmartParameters(
            session,
            toolDef,
            args,
            new Map()
        );

        // 3. Verify ID injection
        expect(resolved.contactId).toBe(unique.id);
    });

    it('SAFEGUARD 3: AskZenaService MUST route conversational turns to Orchestrator', async () => {
        // 1. Mock Orchestrator to avoid real LLM cost
        vi.spyOn(agentOrchestrator, 'processQuery').mockResolvedValue({
            answer: 'Orchestrator handled this',
            sessionId: '123',
            requiresApproval: false
        });

        // 2. Spy on NavigationPlanner to ensure it's NOT called
        const navSpy = vi.spyOn(navigationPlannerService, 'parseIntent');

        // 3. Simulate turn 2 (conversational)
        const history = [{ role: 'user', content: 'Create contact', timestamp: new Date() }] as any;

        // 4. Send query that MIGHT look like external site query but in conversation
        await askZenaService.processQuery({
            userId,
            query: 'Update their email to test@test.com', // "Update" keyword
            conversationId: 'conv_123',
            conversationHistory: history
        });

        // 5. Verify routing
        expect(agentOrchestrator.processQuery).toHaveBeenCalled();
        expect(navSpy).not.toHaveBeenCalled(); // Should NOT try to parse intent for legacy nav
    });

    it('SAFEGUARD 4: AgentOrchestrator generates Product Buttons publicly', () => {
        const results = [{
            tool: 'contact.create',
            result: { data: { id: 'contact_123', name: 'Test Contact' } }
        }];

        const buttons = agentOrchestrator.generateProductButtons(results);
        expect(buttons).toContain('[PRODUCT_BUTTON: See Contact Card, /contacts/contact_123, contact_123]');
    });
});
