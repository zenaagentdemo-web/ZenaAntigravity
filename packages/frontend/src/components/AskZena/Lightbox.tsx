import React, { useEffect } from 'react';
import './Lightbox.css';

interface LightboxProps {
    attachment: {
        file?: File;
        type: 'image' | 'file';
        previewUrl?: string;
        url?: string;
        base64?: string;
        name?: string;
    };
    onClose: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ attachment, onClose }) => {
    // Prevent scrolling when lightbox is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const mimeType = (attachment as any).mimeType || (attachment.type === 'image' ? 'image/png' : 'application/octet-stream');
    const fileUrl = attachment.previewUrl || attachment.url || (attachment.base64 ? `data:${mimeType};base64,${attachment.base64}` : null);
    const fileName = attachment.name || attachment.file?.name || 'Attachment';

    return (
        <div className="zena-lightbox-overlay" onClick={onClose}>
            <div className="zena-lightbox-container" onClick={(e) => e.stopPropagation()}>
                <button className="zena-lightbox-close" onClick={onClose} aria-label="Close preview">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <div className="zena-lightbox-content">
                    {attachment.type === 'image' && fileUrl ? (
                        <div className="zena-lightbox-image-wrapper">
                            <img src={fileUrl} alt={fileName} className="zena-lightbox-image" />
                        </div>
                    ) : (
                        <div className="zena-lightbox-file-wrapper">
                            <div className="zena-lightbox-file-icon">📄</div>
                            <div className="zena-lightbox-file-name">{fileName}</div>
                            {attachment.file && (
                                <div className="zena-lightbox-file-info">
                                    {(attachment.file.size / 1024).toFixed(1)} KB • {attachment.file.type}
                                </div>
                            )}
                            <a
                                href={fileUrl || '#'}
                                download={fileName}
                                className="zena-lightbox-download-btn"
                                onClick={(e) => !fileUrl && e.preventDefault()}
                            >
                                Download File
                            </a>
                        </div>
                    )}
                </div>

                <div className="zena-lightbox-footer">
                    <span className="zena-lightbox-filename">{fileName}</span>
                </div>
            </div>

            {/* Holographic background elements */}
            <div className="zena-lightbox-hologram-ring"></div>
            <div className="zena-lightbox-hologram-grid"></div>
        </div>
    );
};
