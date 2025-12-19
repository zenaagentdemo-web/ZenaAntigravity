/**
 * @vitest-environment jsdom
 */
/**
 * Property-based tests for ForwardEmailModal component
 * 
 * Feature: email-management
 * Validates: Email forwarding form and validation
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { ForwardEmailModal } from './ForwardEmailModal';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Arbitrary generators
const subjectArb = fc.string({ minLength: 0, maxLength: 100 });
const contentArb = fc.string({ minLength: 0, maxLength: 500 });

describe('ForwardEmailModal Property Tests', () => {
    describe('Visibility Control', () => {
        it('should NOT render anything when isOpen is false', () => {
            fc.assert(
                fc.property(
                    subjectArb,
                    contentArb,
                    (subject, content) => {
                        const onClose = vi.fn();
                        const onSend = vi.fn();

                        const { container, unmount } = render(
                            <ForwardEmailModal
                                isOpen={false}
                                originalSubject={subject}
                                originalContent={content}
                                onClose={onClose}
                                onSend={onSend}
                            />
                        );

                        // Property: When isOpen is false, nothing should be rendered
                        expect(container.innerHTML).toBe('');

                        unmount();
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should render modal when isOpen is true', () => {
            const onClose = vi.fn();
            const onSend = vi.fn();

            const { unmount } = render(
                <ForwardEmailModal
                    isOpen={true}
                    originalSubject="Test Subject"
                    originalContent="Test Content"
                    onClose={onClose}
                    onSend={onSend}
                />
            );

            // Property: Modal should be visible with required elements
            expect(screen.getByText('Forward Email')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('recipient@example.com')).toBeInTheDocument();

            unmount();
        });
    });

    describe('Form Pre-population', () => {
        it('should display original content in preview', () => {
            const originalContent = 'This is the original email content';
            const onClose = vi.fn();
            const onSend = vi.fn();

            const { unmount } = render(
                <ForwardEmailModal
                    isOpen={true}
                    originalSubject="Test"
                    originalContent={originalContent}
                    onClose={onClose}
                    onSend={onSend}
                />
            );

            // Property: Original content should be displayed
            expect(screen.getByText(originalContent)).toBeInTheDocument();

            unmount();
        });
    });

    describe('Form Submission', () => {
        it('should call onSend with form data when valid', async () => {
            const onClose = vi.fn();
            const onSend = vi.fn().mockResolvedValue(undefined);

            const { unmount } = render(
                <ForwardEmailModal
                    isOpen={true}
                    originalSubject="Original Subject"
                    originalContent="Original Content"
                    onClose={onClose}
                    onSend={onSend}
                />
            );

            // Fill in recipient
            const toInput = screen.getByPlaceholderText('recipient@example.com');
            fireEvent.change(toInput, { target: { value: 'test@example.com' } });

            // Submit
            const sendButton = screen.getByText('Send');
            fireEvent.click(sendButton);

            await waitFor(() => {
                expect(onSend).toHaveBeenCalledWith(
                    expect.objectContaining({
                        to: 'test@example.com'
                    })
                );
            });

            unmount();
        });
    });

    describe('Cancel Behavior', () => {
        it('should call onClose when cancel button is clicked', () => {
            const onClose = vi.fn();
            const onSend = vi.fn();

            const { unmount } = render(
                <ForwardEmailModal
                    isOpen={true}
                    originalSubject="Test"
                    originalContent="Content"
                    onClose={onClose}
                    onSend={onSend}
                />
            );

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            expect(onClose).toHaveBeenCalledTimes(1);

            unmount();
        });
    });
});
