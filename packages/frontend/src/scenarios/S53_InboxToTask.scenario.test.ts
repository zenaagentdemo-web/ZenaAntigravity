
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actionScannerService } from '../../../backend/src/services/action-scanner.service';
import { tasksActionsService } from '../../../backend/src/services/tasks-actions.service';
import { askZenaService } from '../../../backend/src/services/ask-zena.service';
import prisma from '../../../backend/src/config/database';

// Mock dependencies
vi.mock('../../../backend/src/services/ask-zena.service');
vi.mock('../../../backend/src/services/websocket.service');

describe('Scenario S53: Inbox-to-Task Chain', () => {
    const mockUserId = 'user-123';
    const mockContactId = 'contact-456';
    const mockThreadId = 'thread-789';

    beforeEach(async () => {
        vi.clearAllMocks();
        // Clear potential data
        await prisma.task.deleteMany({ where: { userId: mockUserId } });
        await prisma.autonomousAction.deleteMany({ where: { userId: mockUserId } });
    });

    it('should extract a task from an urgent email and create a pending action', async () => {
        // --- STEP 1: TRIGGER (Receive Email) ---
        // Mock the email content in the database
        const mockEmailBody = "Hi Agent, the roof at 123 Main St is leaking badly. Please get it fixed ASAP.";

        vi.spyOn(prisma.thread, 'findUnique').mockResolvedValue({
            id: mockThreadId,
            subject: "Urgent: Roof Leak",
            messages: [
                {
                    id: 'msg-1',
                    body: mockEmailBody,
                    receivedAt: new Date(),
                }
            ],
            participants: [{ name: 'John Vendor', email: 'john@vendor.com' }]
        } as any);

        // --- STEP 2: REASONING (AI Extraction) ---
        // Mock Zena's "Brain" response
        (askZenaService.askBrain as any).mockResolvedValue(JSON.stringify({
            hasTask: true,
            title: "Coordinate Roof Repair",
            description: "Fix leaking roof at 123 Main St as requested by John Vendor.",
            priority: "urgent",
            daysUntilDue: 1
        }));

        // Trigger the scanner
        const result = await actionScannerService.onEmailReceived(
            'msg-1',
            mockThreadId,
            mockUserId
        );

        // Verify Step 2 Result
        expect(result.actionsCreated).toBeGreaterThan(0);

        // --- STEP 3: CONSEQUENCE (Task-Action Mapping) ---
        // Verify that a pending action (Demi-God mode) was created in the database
        const pendingAction = await prisma.autonomousAction.findFirst({
            where: {
                userId: mockUserId,
                actionType: 'create_task'
            }
        });

        expect(pendingAction).toBeDefined();
        expect(pendingAction?.title).toContain("Coordinate Roof Repair");
        expect(pendingAction?.priority).toBe(10); // Urgent maps to 10 usually
        expect(pendingAction?.reasoning).toContain("extracted from email");

        console.log("✅ Scenario S53 Passed: Email -> AI Reasoning -> Pending Task Action");
    });
});
