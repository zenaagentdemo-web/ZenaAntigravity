
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actionScannerService } from '../services/action-scanner.service.js';
import { tasksActionsService } from '../services/tasks-actions.service.js';
import { godmodeService } from '../services/godmode.service.js';

// Deep mock of the services
vi.mock('../services/tasks-actions.service.js', () => ({
    tasksActionsService: {
        generateTaskFromNote: vi.fn(),
        generateTaskFromEmail: vi.fn(),
        generateTaskFromDeal: vi.fn(),
        generateTaskFromVoiceNote: vi.fn()
    }
}));

vi.mock('../services/godmode.service.js', () => ({
    godmodeService: {
        getFeatureMode: vi.fn(),
        queueAction: vi.fn()
    }
}));

vi.mock('../services/websocket.service.js', () => ({
    websocketService: {
        broadcastToUser: vi.fn()
    }
}));

describe('Scenario S10: Note-to-Task Chain', () => {
    const mockUserId = 'user-123';
    const mockContactId = 'contact-456';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should extract a task from a manual note and queue a pending action', async () => {
        // --- STEP 1: TRIGGER (Add Note) ---
        const mockNoteContent = "Met with John today. He wants a call back on Wednesday to discuss the landing page.";

        // --- STEP 2: REASONING (AI Logic) ---
        // Mock Godmode to have the feature enabled
        (godmodeService.getFeatureMode as any).mockResolvedValue('demi_god');

        // Mock Task extraction for notes
        const mockTaskSuggestion = {
            featureKey: 'tasks:create_from_note',
            sourceId: mockContactId,
            sourceType: 'note',
            title: "Call back John re: Landing Page",
            description: "Discuss the landing page as requested in the meeting.",
            priority: 'normal',
            suggestedDueDate: new Date(),
            reasoning: "User added a note mentioning a 'call back'."
        };
        (tasksActionsService.generateTaskFromNote as any).mockResolvedValue(mockTaskSuggestion);

        // Mock the consequence (Queuing the action)
        (godmodeService.queueAction as any).mockResolvedValue({
            id: 'action-777',
            title: "Call back John re: Landing Page"
        });

        // Execute the orchestration (triggered by controller in real app)
        const result = await actionScannerService.onNoteAdded(
            mockNoteContent,
            mockContactId,
            mockUserId
        );

        // --- STEP 3: CONSEQUENCE (Verification) ---
        // 1. Verify Task Extraction was triggered for the note
        expect(tasksActionsService.generateTaskFromNote).toHaveBeenCalledWith(mockNoteContent, mockContactId, mockUserId);

        // 2. Verify Godmode Queuing was triggered
        expect(godmodeService.queueAction).toHaveBeenCalledWith(expect.objectContaining({
            actionType: 'create_task',
            title: "Call back John re: Landing Page"
        }));

        // 3. Verify the scanner returned a successful result
        expect(result.actionsCreated).toBe(1);
        expect(result.actionIds).toContain('action-777');

        console.log("✅ Scenario S10 Passed: Manual Note -> AI Extraction -> Task Queued");
    });
});
