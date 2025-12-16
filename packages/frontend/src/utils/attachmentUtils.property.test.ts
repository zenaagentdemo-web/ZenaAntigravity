import fc from 'fast-check';
import { formatFileSize, getFileType, getFileIcon, isPreviewable, generateAttachmentKey } from './attachmentUtils';

describe('Attachment Utilities Properties', () => {
    // P3: File size formatting invariants
    describe('P3: File size formatting', () => {
        it('should always return a string ending in B, KB, MB, or GB', () => {
            fc.assert(
                fc.property(fc.nat(), (size) => {
                    const params = formatFileSize(size);
                    return /^\d+(\.\d)?\s?(B|KB|MB|GB)$/.test(params);
                })
            );
        });

        it('should handle boundary values correctly', () => {
            expect(formatFileSize(0)).toBe('0 B');
            expect(formatFileSize(1023)).toBe('1023 B');
            expect(formatFileSize(1024)).toBe('1 KB');
            expect(formatFileSize(1024 * 1.5)).toBe('1.5 KB');
            expect(formatFileSize(1024 * 1024)).toBe('1 MB');
        });

        it('should be monotonic for same unit', () => {
            fc.assert(
                fc.property(fc.integer({ min: 0, max: 1000 }), (a) => {
                    // This is a simplified check - real monotony is hard across units due to rounding
                    // specific check for bytes range
                    const s1 = parseFloat(formatFileSize(a).split(' ')[0]);
                    const s2 = parseFloat(formatFileSize(a + 1).split(' ')[0]);
                    return a < 1024 ? s1 <= s2 : true;
                })
            );
        });
    });

    // P6: Type detection consistency
    describe('P6: Type detection consistency', () => {
        it('should return consistent types for known mime types', () => {
            const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            imageMimeTypes.forEach(mime => {
                const file = new File([''], 'test.jpg', { type: mime });
                expect(getFileType(file)).toBe('image');
                expect(isPreviewable(file)).toBe(true);
            });

            const pdfMimeTypes = ['application/pdf'];
            pdfMimeTypes.forEach(mime => {
                const file = new File([''], 'test.pdf', { type: mime });
                expect(getFileType(file)).toBe('pdf');
                expect(isPreviewable(file)).toBe(false);
            });
        });

        it('should generate unique keys for different files', () => {
            fc.assert(
                fc.property(
                    fc.string(), fc.integer(), fc.integer(),
                    fc.string(), fc.integer(), fc.integer(),
                    (n1, s1, t1, n2, s2, t2) => {
                        // Ensure inputs are different
                        fc.pre(n1 !== n2 || s1 !== s2 || t1 !== t2);

                        const f1 = { name: n1, size: s1, lastModified: t1 } as File;
                        const f2 = { name: n2, size: s2, lastModified: t2 } as File;

                        return generateAttachmentKey(f1) !== generateAttachmentKey(f2);
                    }
                )
            );
        });

        it('should generate same key for essential same file data', () => {
            const f1 = { name: 'foo.jpg', size: 100, lastModified: 12345 } as File;
            const f2 = { name: 'foo.jpg', size: 100, lastModified: 12345 } as File;
            expect(generateAttachmentKey(f1)).toBe(generateAttachmentKey(f2));
        });
    });
});
