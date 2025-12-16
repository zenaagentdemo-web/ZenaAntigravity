/**
 * MiniZenaAvatar - Small clickable avatar for dashboard
 * Displays at top-center of dashboard and navigates to /ask-zena on click
 */
import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HolographicAvatar } from '../HolographicAvatar/HolographicAvatar';
import './MiniZenaAvatar.css';

interface MiniZenaAvatarProps {
    /** Optional custom click handler (overrides default navigation) */
    onClick?: () => void;
    /** Optional label text below avatar */
    label?: string;
    /** Show pulse ring effect to indicate interactivity */
    showPulseRing?: boolean;
}

export const MiniZenaAvatar: React.FC<MiniZenaAvatarProps> = memo(({
    onClick,
    label = 'Ask Zena',
    showPulseRing = true,
}) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            navigate('/ask-zena');
        }
    };

    return (
        <div className="mini-zena-avatar-wrapper">
            {showPulseRing && <div className="mini-zena-pulse-ring" />}
            <div className="mini-zena-avatar-button" onClick={handleClick}>
                <HolographicAvatar
                    animationState="idle"
                    sizePreset="mini"
                    enableParticles={true}
                />
            </div>
            {label && <span className="mini-zena-label">{label}</span>}
        </div>
    );
});

MiniZenaAvatar.displayName = 'MiniZenaAvatar';
