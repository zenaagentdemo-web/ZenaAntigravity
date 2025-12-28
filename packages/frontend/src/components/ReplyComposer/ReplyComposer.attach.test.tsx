import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReplyComposer } from './ReplyComposer';

// Mock dependencies
vi.mock('../hooks/useKeyboardNavigation', () => ({
    useKeyboardNavigation: () => ({
        containerRef: { current: null },
        announceToScreenReader: vi.fn(),
    }),
}));

vi.mock('../hooks/useReducedMotion', () => ({
    useReducedMotion: () => ({
        prefersReducedMotion: false,
        getTransitionDuration: () => '0ms',
    }),
}));

vi.mock('../utils/hapticFeedback', () => ({
    hapticFeedback: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('ReplyComposer Attachments', () => {
    it('allows attaching multiple files at once', async () => {
        const thread = {
            id: '1',
            subject: 'Test',
            participants: [{ email: 'test@example.com' }]
        } as any;

        render(
            <ReplyComposer
                isOpen={true}
                thread={thread}
                onClose={vi.fn()}
                onSend={vi.fn()}
            />
        );

        // Find file input (hidden)
        const fileInput = screen.getByLabelText(/Attach file/i, { selector: 'button' });
        // Actually we need to target the input directly or trigger the button click which triggers input click

        // Simpler: find the input by checking hidden inputs or aria-hidden?
        // The input is hidden style={{ display: 'none' }} but accessible via label? No label points to it.
        // It's just there.
        // We can simulate upload on the input element if we can query it.
        // Since it's display:none, getByRole might fail.
        // Let's use container query selector or just mock the click handler?
        // No, we want to test the onChange handler.

        // We can't easily click hidden input with userEvent.
        // But we can verify the handler logic by calling fireEvent.change on the input.

        // Find input via container
        const inputs = screen.queryAllByDisplayValue(''); // Might catch others
        // Better: render matches.

        // Let's rely on the fact that input type=file is present.
        // But it's hidden.

        // Assuming we can find it:
        // const input = container.querySelector('input[type="file"]');

        // Let's just user fireEvent on the known structure.
    });

    it('reproduces multi-file attachment failure', async () => {
        const thread = {
            id: '1',
            subject: 'Test',
            participants: [{ email: 'test@example.com' }]
        } as any;

        const { container } = render(
            <ReplyComposer
                isOpen={true}
                thread={thread}
                onClose={vi.fn()}
                onSend={vi.fn()}
            />
        );

        const input = container.querySelector('input[type="file"]') as HTMLInputElement;
        expect(input).toBeTruthy();

        // Create multiple files
        const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
        const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });
        const file3 = new File(['content3'], 'file3.txt', { type: 'text/plain' });

        // Simulate selection of 3 files
        fireEvent.change(input, { target: { files: [file1, file2, file3] } });

        await waitFor(() => {
            // Check if chips appear
            expect(screen.getByText('file1.txt')).toBeInTheDocument();
            expect(screen.getByText('file2.txt')).toBeInTheDocument();
            expect(screen.getByText('file3.txt')).toBeInTheDocument();
        });
    });
});
