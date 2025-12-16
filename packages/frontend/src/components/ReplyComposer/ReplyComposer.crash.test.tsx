
import { describe, it, vi } from 'vitest';
import { render } from '@testing-library/react';
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

describe('ReplyComposer Crash Repro', () => {
    it('renders with empty thread', () => {
        const thread = {} as any;
        render(
            <ReplyComposer
                isOpen={true}
                thread={thread}
                onClose={vi.fn()}
                onSend={vi.fn()}
            />
        );
    });

    it('renders with undefined participants', () => {
        const thread = { id: '1', subject: 'test', participants: undefined } as any;
        render(<ReplyComposer isOpen={true} thread={thread} onClose={vi.fn()} onSend={vi.fn()} />);
    });

    it('renders with undefined subject', () => {
        const thread = { id: '1', subject: undefined, participants: [] } as any;
        render(<ReplyComposer isOpen={true} thread={thread} onClose={vi.fn()} onSend={vi.fn()} />);
    });
});
