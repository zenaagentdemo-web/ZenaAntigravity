import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import AttachmentChip, { AttachmentChipProps } from './AttachmentChip';
import { vi } from 'vitest';
import { formatFileSize } from '../../utils/attachmentUtils';

describe('AttachmentChip Properties', () => {
    // P7: Accessibility completeness
    describe('P7: Accessibility', () => {
        it('should always have an aria-label containing the filename', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1 }), fc.integer(),
                    (filename, size) => {
                        const file = new File([''], filename, { type: 'text/plain' });
                        Object.defineProperty(file, 'size', { value: Math.abs(size) });

                        // Replicate the formatting logic or import it (we mocked/stubbed it above? No we use the real one in component)
                        // But we can construct the expected strings since we know inputs
                        // We need to import formatFileSize or replicate passing the exact size
                        // To be safe, let's use the utility if imported, or just wildcard regex properly escaped?
                        // Safer: Use utility. We imported it from implementation.

                        const formattedSize = formatFileSize(Math.abs(size));

                        const onRemove = vi.fn();
                        const onPreview = vi.fn();

                        render(
                            <AttachmentChip
                                file={file}
                                onRemove={onRemove}
                                onPreview={onPreview}
                            />
                        );

                        try {
                            // Use getByRole with function matcher for robustness against whitespace normalization
                            const hasPreview = screen.getByRole('button', {
                                name: (name) => {
                                    const normName = name.replace(/\s+/g, ' ');
                                    const normFilename = filename.trim().replace(/\s+/g, ' ');
                                    return normName.startsWith('Preview') && normName.includes(normFilename);
                                }
                            });
                            const hasRemove = screen.getByRole('button', {
                                name: (name) => {
                                    const normName = name.replace(/\s+/g, ' ');
                                    const normFilename = filename.trim().replace(/\s+/g, ' ');
                                    return normName.startsWith('Remove') && normName.includes(normFilename);
                                }
                            });

                            expect(hasPreview).toBeTruthy();
                            expect(hasRemove).toBeTruthy();
                        } finally {
                            cleanup();
                        }
                    }
                )
            );
        });
    });

    describe('Interactions', () => {
        it('should call onPreview when clicked', () => {
            const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
            const onRemove = vi.fn();
            const onPreview = vi.fn();

            render(<AttachmentChip file={file} onRemove={onRemove} onPreview={onPreview} />);

            const previewBtn = screen.getByRole('button', { name: /Preview.*test.jpg/i });
            fireEvent.click(previewBtn);

            expect(onPreview).toHaveBeenCalled();
            expect(onRemove).not.toHaveBeenCalled();
        });

        it('should call onRemove when remove button clicked', () => {
            const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
            const onRemove = vi.fn();
            const onPreview = vi.fn();

            render(<AttachmentChip file={file} onRemove={onRemove} onPreview={onPreview} />);

            const removeBtn = screen.getByRole('button', { name: /^remove attachment/i });
            // Stop propagation is usually handled in component, we just check call
            fireEvent.click(removeBtn);

            expect(onRemove).toHaveBeenCalled();
        });
    });
});
