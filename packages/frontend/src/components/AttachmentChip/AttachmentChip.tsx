
import React, { useMemo, useState, useEffect } from 'react';
import { formatFileSize, getFileIcon, getFileType } from '../../utils/attachmentUtils';
import './AttachmentChip.css';

export interface AttachmentChipProps {
    file: File;
    onRemove: () => void;
    onPreview: () => void;
}

export const AttachmentChip: React.FC<AttachmentChipProps> = ({ file, onRemove, onPreview }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

    const fileType = useMemo(() => getFileType(file), [file]);
    const formattedSize = useMemo(() => formatFileSize(file.size), [file.size]);
    const icon = useMemo(() => getFileIcon(fileType), [fileType]);

    // Generate thumbnail for images
    useEffect(() => {
        if (fileType === 'image') {
            const url = URL.createObjectURL(file);
            setThumbnailUrl(url);

            return () => {
                URL.revokeObjectURL(url);
            };
        }
        setThumbnailUrl(null);
    }, [file, fileType]);

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPreview();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            onRemove();
        }
    };

    return (
        <div className="attachment-chip">
            <button
                className="attachment-main-action"
                onClick={onPreview}
                onKeyDown={handleKeyDown}
                type="button"
                aria-label={`Preview ${file.name} (${formattedSize})`}
            >
                <div className="attachment-chip-preview">
                    {thumbnailUrl ? (
                        <img src={thumbnailUrl} alt="" className="attachment-thumbnail" />
                    ) : (
                        <span className="attachment-icon" aria-hidden="true">{icon}</span>
                    )}
                </div>

                <div className="attachment-info">
                    <span className="attachment-name" title={file.name}>{file.name}</span>
                    <span className="attachment-size">{formattedSize}</span>
                </div>
            </button>

            <div className="attachment-remove-wrapper">
                <button
                    className="attachment-remove"
                    onClick={handleRemove}
                    type="button"
                    aria-label={`Remove attachment ${file.name}`}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default AttachmentChip;
