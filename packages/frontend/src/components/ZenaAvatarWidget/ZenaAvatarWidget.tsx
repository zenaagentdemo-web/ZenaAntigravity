/**
 * ZenaAvatarWidget - Compact Zena avatar with "Start Zena Live" button
 * 
 * Designed for use on secondary pages (Inbox, Deal Flow, Properties, Contacts).
 * Smaller than the dashboard version but maintains the same visual effects.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ZenaHighTechAvatar } from '../ZenaHighTechAvatar/ZenaHighTechAvatar';
import './ZenaAvatarWidget.css';

interface ZenaAvatarWidgetProps {
    /** Custom click handler for avatar (overrides default navigation) */
    onAvatarClick?: () => void;
    /** Custom click handler for live button (overrides default navigation) */
    onLiveClick?: () => void;
    /** Widget variation: 'central' (original) or 'floating' (compact bottom-right) */
    variant?: 'central' | 'floating';
    /** Optional coaching status to display (e.g., 'Analyzing Pipeline') */
    coachingStatus?: string;
    /** Test ID for testing */
    testId?: string;
    /** Page context (e.g., 'contacts', 'properties') */
    context?: string;
}

export const ZenaAvatarWidget: React.FC<ZenaAvatarWidgetProps> = ({
    onAvatarClick,
    onLiveClick,
    variant = 'central',
    coachingStatus,
    testId = 'zena-avatar-widget',
    context = 'app',
}) => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);

    const handleAvatarClick = useCallback(() => {
        if (onAvatarClick) {
            onAvatarClick();
        } else {
            navigate('/ask-zena');
        }
    }, [onAvatarClick, navigate]);

    const handleLiveClick = useCallback(() => {
        if (onLiveClick) {
            onLiveClick();
        } else {
            navigate(`/ask-zena?mode=handsfree&context=${encodeURIComponent(context)}&t=${Date.now()}`);
        }
    }, [onLiveClick, navigate, context]);

    const isFloating = variant === 'floating';

    return (
        <div
            className={`zena-avatar-widget zena-avatar-widget--${variant} ${coachingStatus ? 'zena-avatar-widget--coaching' : ''}`}
            data-testid={testId}
        >
            {/* Zena Avatar Container */}
            <div
                className="zena-avatar-widget__container"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleAvatarClick}
            >
                <ZenaHighTechAvatar
                    voiceState={isHovered ? 'processing' : (coachingStatus ? 'listening' : 'idle')}
                    size={isFloating ? 64 : 140}
                    className="zena-avatar-widget__avatar-instance"
                />

                {/* Coaching HUD Overlay */}
                {!isFloating && coachingStatus && (
                    <motion.div
                        className="zena-avatar-widget__coaching-hud"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="coaching-hud__scanner" />
                        <div className="coaching-hud__status">
                            <span className="status__dot" />
                            {coachingStatus.toUpperCase()}
                        </div>
                    </motion.div>
                )}

                {/* Hint text - only show in central mode if no status */}
                {!isFloating && !coachingStatus && (
                    <div className="zena-avatar-widget__hint">
                        <span className="zena-avatar-widget__hint-text">TAP TO ASK ZENA</span>
                    </div>
                )}
            </div>

            {/* Start Zena Live Button */}
            <button
                className="zena-avatar-widget__live-button"
                onClick={handleLiveClick}
                aria-label="Start Zena Live voice conversation"
            >
                {!isFloating && (
                    <span className="zena-avatar-widget__live-text">
                        {coachingStatus ? 'Start Strategy Session' : 'Start Zena Live'}
                    </span>
                )}
                {isFloating && <span className="zena-avatar-widget__live-text">LIVE</span>}
                <span className="zena-avatar-widget__wave-icon">
                    <span className="wave-bar" style={{ animationDelay: '0ms' }} />
                    <span className="wave-bar" style={{ animationDelay: '150ms' }} />
                    <span className="wave-bar" style={{ animationDelay: '300ms' }} />
                    <span className="wave-bar" style={{ animationDelay: '200ms' }} />
                    <span className="wave-bar" style={{ animationDelay: '100ms' }} />
                </span>
            </button>
        </div>
    );
};

export default ZenaAvatarWidget;
