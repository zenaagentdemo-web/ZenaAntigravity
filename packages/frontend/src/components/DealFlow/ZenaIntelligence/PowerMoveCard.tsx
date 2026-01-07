/**
 * PowerMoveCard - One-tap action card with pre-drafted content
 * 
 * Displays the suggested Power Move for a deal with copy/send functionality.
 * Zero friction - agent can execute the action with a single tap.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PowerMove, PowerMoveAction } from './ZenaIntelligenceEngine';
import './PowerMoveCard.css';

interface PowerMoveCardProps {
    powerMove: PowerMove;
    onExecute?: (action: PowerMoveAction, content: string) => void;
    onCopy?: (content: string) => void;
    onDismiss?: () => void;
    compact?: boolean;
}

/**
 * Get icon for action type
 */
function getActionIcon(action: PowerMoveAction): string {
    switch (action) {
        case 'call': return '📞';
        case 'email': return '✉️';
        case 'text': return '💬';
        case 'viewing': return '🏠';
        case 'negotiation': return '🤝';
        default: return '⚡';
    }
}

/**
 * Get action button label
 */
function getActionLabel(action: PowerMoveAction): string {
    switch (action) {
        case 'call': return 'Copy Script';
        case 'email': return 'Send Email';
        case 'text': return 'Send Text';
        case 'viewing': return 'Schedule';
        case 'negotiation': return 'Start Chat';
        default: return 'Execute';
    }
}

export const PowerMoveCard: React.FC<PowerMoveCardProps> = ({
    powerMove,
    onExecute,
    onCopy,
    onDismiss,
    compact = false,
}) => {
    const [showDraft, setShowDraft] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(powerMove.draftContent);
            setCopied(true);
            onCopy?.(powerMove.draftContent);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [powerMove.draftContent, onCopy]);

    const handleExecute = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onExecute?.(powerMove.action, powerMove.draftContent);
    }, [onExecute, powerMove]);

    const handleDismiss = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onDismiss?.();
    }, [onDismiss]);

    const handleToggleDraft = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDraft(!showDraft);
    }, [showDraft]);

    const priorityClass = `power-move-card--${powerMove.priority}`;

    return (
        <motion.div
            className={`power-move-card ${priorityClass} ${compact ? 'power-move-card--compact' : ''}`}
            onClick={(e) => e.stopPropagation()} // Stop propagation from the card itself
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
            <div className="power-move-card__header">
                <span className="power-move-card__icon">⚡</span>
                <span className="power-move-card__label">POWER MOVE</span>
                {onDismiss && (
                    <button
                        className="power-move-card__dismiss"
                        onClick={handleDismiss}
                        aria-label="Dismiss"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Headline */}
            <h4 className="power-move-card__headline">
                <span className="power-move-card__action-icon">
                    {getActionIcon(powerMove.action)}
                </span>
                {powerMove.headline}
            </h4>

            {/* Rationale - only show in non-compact mode */}
            {!compact && (
                <p className="power-move-card__rationale">{powerMove.rationale}</p>
            )}

            {/* Draft content toggle */}
            <button
                className="power-move-card__toggle"
                onClick={handleToggleDraft}
            >
                {showDraft ? 'Hide Draft' : 'View Draft'}
                <span className={`power-move-card__toggle-arrow ${showDraft ? 'open' : ''}`}>
                    ▼
                </span>
            </button>

            {/* Expandable draft content */}
            <AnimatePresence>
                {showDraft && (
                    <motion.div
                        className="power-move-card__draft"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <pre className="power-move-card__draft-content">
                            {powerMove.draftContent}
                        </pre>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="power-move-card__actions">
                <button
                    className="power-move-card__copy-btn"
                    onClick={handleCopy}
                >
                    {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                </button>

                {powerMove.action !== 'call' && (
                    <button
                        className="power-move-card__execute-btn"
                        onClick={handleExecute}
                    >
                        {getActionLabel(powerMove.action)}
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default PowerMoveCard;
