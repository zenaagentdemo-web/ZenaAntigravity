/**
 * FloatingComposeButton Component
 * 
 * A fixed-position Floating Action Button (FAB) that opens the compose modal.
 * Features a gradient background and hover effects consistent with the high-tech theme.
 */

import React from 'react';
import './FloatingComposeButton.css';

export interface FloatingComposeButtonProps {
    /** Callback when clicked */
    onClick: () => void;
    /** Optional className */
    className?: string;
}

export const FloatingComposeButton: React.FC<FloatingComposeButtonProps> = ({
    onClick,
    className = ''
}) => {
    return (
        <button
            className={`floating-compose-btn ${className}`}
            onClick={onClick}
            aria-label="Compose new message"
            data-testid="compose-fab"
        >
            <div className="floating-compose-btn__content">
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="floating-compose-btn__icon"
                >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span className="floating-compose-btn__label">Compose</span>
            </div>
            <div className="floating-compose-btn__glow" />
        </button>
    );
};

export default FloatingComposeButton;
