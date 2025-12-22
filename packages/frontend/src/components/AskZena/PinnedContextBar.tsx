import React from 'react';
import './PinnedContextBar.css';

interface PinnedContextBarProps {
    contextText: string | null;
    onClear: () => void;
}

export const PinnedContextBar: React.FC<PinnedContextBarProps> = ({ contextText, onClear }) => {
    if (!contextText) return null;

    return (
        <div className="pinned-context-bar">
            <div className="pinned-context-content">
                <span className="pinned-icon">📍</span>
                <span className="pinned-label">FOCUSING ON:</span>
                <span className="pinned-text">{contextText}</span>
            </div>
            <button className="clear-context-btn" onClick={onClear} title="Clear Context">
                ×
            </button>
        </div>
    );
};
