
import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import './ImageLightbox.css';

export interface ImageLightboxProps {
    /** Source URL of the image */
    src: string;
    /** Filename for alt text and aria-label */
    filename: string;
    /** Callback to close the lightbox */
    onClose: () => void;
}

/**
 * ImageLightbox Component
 * 
 * Displays an image in a full-screen modal overlay with glassmorphism effects.
 * Handles keyboard navigation (Escape to close) and focus management.
 */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, filename, onClose }) => {
    const { prefersReducedMotion } = useReducedMotion();
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Handle Escape key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        // Focus the close button on mount for accessibility
        closeButtonRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Lock body scroll when open
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    return (
        <div
            className={`image-lightbox-backdrop ${prefersReducedMotion ? 'image-lightbox--reduced-motion' : ''}`}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Preview of ${filename}`}
        >
            <div
                className="image-lightbox-content"
                onClick={e => e.stopPropagation()} // Prevent close when clicking image area
            >
                <button
                    ref={closeButtonRef}
                    className="image-lightbox-close"
                    onClick={onClose}
                    aria-label="Close preview"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <img
                    src={src}
                    alt={`Preview of ${filename}`}
                    className="image-lightbox-img"
                />

                <div className="image-lightbox-caption">
                    {filename}
                </div>
            </div>
        </div>
    );
};

export default ImageLightbox;
