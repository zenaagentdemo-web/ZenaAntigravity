
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReplyComposer } from './ReplyComposer';

// Mock dependencies
vi.mock('../../hooks/useKeyboardNavigation', () => ({
    useKeyboardNavigation: () => ({
        containerRef: { current: null },
        announceToScreenReader: vi.fn(),
    }),
}));

vi.mock('../../hooks/useReducedMotion', () => ({
    useReducedMotion: () => ({
        prefersReducedMotion: false,
        getTransitionDuration: () => '0ms',
    }),
}));

vi.mock('../../utils/hapticFeedback', () => ({
    hapticFeedback: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('ReplyComposer Message State', () => {
    it('updates message when generatedMessage prop changes', async () => {
        const thread = {
            id: '1',
            subject: 'Test',
            participants: [{ email: 'test@example.com' }]
        } as any;

        const { rerender } = render(
            <ReplyComposer
                isOpen={true}
                thread={thread}
                isGenerating={true}
                generatedMessage="" // Initial state
                onClose={vi.fn()}
                onSend={vi.fn()}
            />
        );

        // Verify initial state
        const textarea = screen.getByLabelText(/Message:/i) as HTMLTextAreaElement;
        expect(textarea.value).toBe('');

        // Simulate async update
        rerender(
            <ReplyComposer
                isOpen={true}
                thread={thread}
                isGenerating={false}
                generatedMessage="Hello world" // Updated state
                onClose={vi.fn()}
                onSend={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(textarea.value).toBe('Hello world');
        });
    });
});
