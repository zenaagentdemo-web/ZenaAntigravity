
/**
 * Utility functions for handling file attachments
 */

export type FileType = 'image' | 'pdf' | 'document' | 'spreadsheet' | 'presentation' | 'video' | 'audio' | 'archive' | 'code' | 'other';

/**
 * Format file size into human-readable string
 * @param bytes Size in bytes
 * @returns Formatted string (e.g. "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

    // For Bytes, no decimal point. For others, 1 decimal point.
    const dm = i === 0 ? 0 : 1;
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

    return `${size} ${sizes[i]}`;
};

/**
 * Determine the broad category of a file based on MIME type and extension
 * @param file The file object
 * @returns FileType category
 */
export const getFileType = (file: File): FileType => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'pdf';

    if (
        type.includes('word') ||
        type.includes('document') ||
        name.endsWith('.doc') ||
        name.endsWith('.docx') ||
        name.endsWith('.txt') ||
        name.endsWith('.rtf')
    ) return 'document';

    if (
        type.includes('spreadsheet') ||
        type.includes('excel') ||
        type.includes('csv') ||
        name.endsWith('.xls') ||
        name.endsWith('.xlsx') ||
        name.endsWith('.csv')
    ) return 'spreadsheet';

    if (
        type.includes('presentation') ||
        type.includes('powerpoint') ||
        name.endsWith('.ppt') ||
        name.endsWith('.pptx')
    ) return 'presentation';

    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';

    if (
        type.includes('zip') ||
        type.includes('compressed') ||
        type.includes('tar') ||
        name.endsWith('.zip') ||
        name.endsWith('.rar') ||
        name.endsWith('.7z')
    ) return 'archive';

    if (
        name.endsWith('.js') ||
        name.endsWith('.ts') ||
        name.endsWith('.tsx') ||
        name.endsWith('.jsx') ||
        name.endsWith('.html') ||
        name.endsWith('.css') ||
        name.endsWith('.json')
    ) return 'code';

    return 'other';
};

/**
 * Get the appropriate icon/emoji for a file type
 * @param type The file type category
 * @returns Emoji character representing the file type
 */
export const getFileIcon = (type: FileType): string => {
    switch (type) {
        case 'image': return '🖼️';
        case 'pdf': return '📄'; // PDF often represented as document page
        case 'document': return '📝';
        case 'spreadsheet': return '📊';
        case 'presentation': return '📽️';
        case 'video': return '🎬';
        case 'audio': return '🎵';
        case 'archive': return '📦';
        case 'code': return '💻';
        case 'other': return '📎';
        default: return '📎';
    }
};

/**
 * Check if a file can be previewed inline (e.g. in lightbox)
 * @param file The file to check
 * @returns true if previewable
 */
export const isPreviewable = (file: File): boolean => {
    return file.type.startsWith('image/');
};

/**
 * Generate a unique key for a file attachment for React lists
 * Uses a combination of name, size, and timestamp to be relatively unique
 * @param file The file object
 * @returns Unique string key
 */
export const generateAttachmentKey = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`;
};
