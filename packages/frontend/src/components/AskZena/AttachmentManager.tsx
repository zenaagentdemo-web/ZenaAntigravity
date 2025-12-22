import React, { useRef } from 'react';
import './AttachmentManager.css';

export interface Attachment {
    file: File;
    type: 'image' | 'file';
    previewUrl?: string;
}

interface AttachmentManagerProps {
    attachments: Attachment[];
    onAddAttachments: (files: FileList) => void;
    onRemoveAttachment: (index: number) => void;
    onPreviewAttachment?: (attachment: Attachment) => void;
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
    attachments,
    onAddAttachments,
    onRemoveAttachment,
    onPreviewAttachment,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            onAddAttachments(e.target.files);
        }
        // Reset input value to allow selecting the same file again
        e.target.value = '';
    };

    return (
        <div className="attachment-manager">
            <div className="attachment-previews">
                {attachments.map((att, idx) => (
                    <div key={idx} className="attachment-preview-item">
                        <div
                            className="attachment-item-media"
                            onClick={() => onPreviewAttachment?.(att)}
                            title="Click to preview"
                        >
                            {att.type === 'image' ? (
                                <img src={att.previewUrl} alt="preview" />
                            ) : att.file.type.startsWith('video/') ? (
                                <div className="file-preview">🎬 {att.file.name}</div>
                            ) : (
                                <div className="file-preview">📄 {att.file.name}</div>
                            )}
                        </div>
                        <button type="button" className="remove-att-btn" onClick={() => onRemoveAttachment(idx)}>
                            ×
                        </button>
                    </div>
                ))}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                multiple
                accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.numbers,.pages,.key"
            />

            <button type="button" className="attach-btn" onClick={handleButtonClick} title="Attach files">
                <span className="attach-icon">+</span>
            </button>
        </div>
    );
};
