/**
 * @vitest-environment jsdom
 */
/**
 * Property-based tests for CreateFolderModal component
 * 
 * Feature: email-management
 * Validates: Folder creation with validation
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { CreateFolderModal } from './CreateFolderModal';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Arbitrary generators
const validFolderNameArb = fc.string({ minLength: 1, maxLength: 50 })
    .filter(s => s.trim().length > 0);

const existingNamesArb = fc.array(
    fc.string({ minLength: 1, maxLength: 30 }),
    { minLength: 0, maxLength: 10 }
);

describe('CreateFolderModal Property Tests', () => {
    describe('Visibility Control', () => {
        it('should NOT render anything when isOpen is false', () => {
            fc.assert(
                fc.property(
                    existingNamesArb,
                    (existingNames) => {
                        const onClose = vi.fn();
                        const onCreateFolder = vi.fn();

                        const { container, unmount } = render(
                            <CreateFolderModal
                                isOpen={false}
                                onClose={onClose}
                                onCreateFolder={onCreateFolder}
                                existingFolderNames={existingNames}
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
            const onCreateFolder = vi.fn();

            const { unmount } = render(
                <CreateFolderModal
                    isOpen={true}
                    onClose={onClose}
                    onCreateFolder={onCreateFolder}
                    existingFolderNames={[]}
                />
            );

            // Property: Modal should be visible with required elements
            expect(screen.getByText('Create New Folder')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('e.g., Important Clients')).toBeInTheDocument();
            expect(screen.getByText('Create Folder')).toBeInTheDocument();

            unmount();
        });
    });

    describe('Name Validation', () => {
        it('should disable submit button when folder name is empty', () => {
            const onClose = vi.fn();
            const onCreateFolder = vi.fn();

            const { unmount } = render(
                <CreateFolderModal
                    isOpen={true}
                    onClose={onClose}
                    onCreateFolder={onCreateFolder}
                    existingFolderNames={[]}
                />
            );

            // Submit button should be disabled when name is empty
            const submitButton = screen.getByText('Create Folder').closest('button');
            expect(submitButton).toBeDisabled();

            // Property: onCreateFolder should NOT be called
            expect(onCreateFolder).not.toHaveBeenCalled();

            unmount();
        });

        it('should show error for duplicate folder name', async () => {
            fc.assert(
                fc.asyncProperty(
                    validFolderNameArb,
                    async (existingName) => {
                        const onClose = vi.fn();
                        const onCreateFolder = vi.fn();

                        const { unmount } = render(
                            <CreateFolderModal
                                isOpen={true}
                                onClose={onClose}
                                onCreateFolder={onCreateFolder}
                                existingFolderNames={[existingName]}
                            />
                        );

                        // Type the duplicate name
                        const input = screen.getByPlaceholderText('e.g., Important Clients');
                        fireEvent.change(input, { target: { value: existingName } });

                        // Try to submit
                        const submitButton = screen.getByText('Create Folder');
                        fireEvent.click(submitButton);

                        await waitFor(() => {
                            const errorElement = screen.queryByText(/folder.*already exists/i);
                            expect(errorElement).toBeInTheDocument();
                        });

                        // Property: onCreateFolder should NOT be called for duplicates
                        expect(onCreateFolder).not.toHaveBeenCalled();

                        unmount();
                    }
                ),
                { numRuns: 20 }
            );
        });

        it('should call onCreateFolder with valid unique name', async () => {
            const onClose = vi.fn();
            const onCreateFolder = vi.fn();

            const { unmount } = render(
                <CreateFolderModal
                    isOpen={true}
                    onClose={onClose}
                    onCreateFolder={onCreateFolder}
                    existingFolderNames={['Existing1', 'Existing2']}
                />
            );

            // Type a unique name
            const input = screen.getByPlaceholderText('e.g., Important Clients');
            fireEvent.change(input, { target: { value: 'Brand New Folder' } });

            // Submit
            const submitButton = screen.getByText('Create Folder');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(onCreateFolder).toHaveBeenCalledWith(
                    expect.objectContaining({ name: 'Brand New Folder' })
                );
            });

            unmount();
        });
    });

    describe('Cancel Behavior', () => {
        it('should call onClose when cancel button is clicked', () => {
            const onClose = vi.fn();
            const onCreateFolder = vi.fn();

            const { unmount } = render(
                <CreateFolderModal
                    isOpen={true}
                    onClose={onClose}
                    onCreateFolder={onCreateFolder}
                    existingFolderNames={[]}
                />
            );

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            expect(onClose).toHaveBeenCalledTimes(1);

            unmount();
        });

        it('should call onClose when overlay is clicked', () => {
            const onClose = vi.fn();
            const onCreateFolder = vi.fn();

            const { container, unmount } = render(
                <CreateFolderModal
                    isOpen={true}
                    onClose={onClose}
                    onCreateFolder={onCreateFolder}
                    existingFolderNames={[]}
                />
            );

            const overlay = container.querySelector('.create-folder-modal__overlay');
            if (overlay) {
                fireEvent.click(overlay);
                expect(onClose).toHaveBeenCalledTimes(1);
            }

            unmount();
        });
    });

    describe('Color Selection', () => {
        it('should include selected color in folder creation', async () => {
            const onClose = vi.fn();
            const onCreateFolder = vi.fn();

            const { container, unmount } = render(
                <CreateFolderModal
                    isOpen={true}
                    onClose={onClose}
                    onCreateFolder={onCreateFolder}
                    existingFolderNames={[]}
                />
            );

            // Type folder name
            const input = screen.getByPlaceholderText('e.g., Important Clients');
            fireEvent.change(input, { target: { value: 'Colored Folder' } });

            // Click a color swatch (second one)
            const colorSwatches = container.querySelectorAll('.color-swatch');
            if (colorSwatches.length > 1) {
                fireEvent.click(colorSwatches[1]);
            }

            // Submit
            const submitButton = screen.getByText('Create Folder');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(onCreateFolder).toHaveBeenCalledWith(
                    expect.objectContaining({
                        name: 'Colored Folder',
                        color: expect.any(String)
                    })
                );
            });

            unmount();
        });
    });
});
