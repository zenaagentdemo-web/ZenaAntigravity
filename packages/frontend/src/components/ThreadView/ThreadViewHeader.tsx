/**
 * ThreadViewHeader Component
 * 
 * Sticky header for the thread view page with thread info, badges, and quick actions.
 * Mobile-first design with responsive scaling.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreadDetailedView, RiskLevel, ThreadClassification } from '../../models/newPage.types';
import './ThreadViewHeader.css';

interface ThreadViewHeaderProps {
    thread: ThreadDetailedView;
    messageCount: number;
    onReply?: () => void;
    onForward?: () => void;
    onArchive?: () => void;
    onSnooze?: () => void;
    onDelete?: () => void;
    isCompact?: boolean;
}

/**
 * Get classification badge label
 */
const getClassificationLabel = (classification: ThreadClassification): string => {
    const labels: Record<ThreadClassification, string> = {
        buyer: 'Buyer',
        vendor: 'Vendor',
        market: 'Market',
        lawyer_broker: 'Legal/Broker',
        noise: 'Other'
    };
    return labels[classification] || 'Unknown';
};

/**
 * Get risk badge styling class
 */
const getRiskClass = (riskLevel: RiskLevel): string => {
    return `thread-view-header__risk--${riskLevel}`;
};

/**
 * Format relative timestamp
 */
const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Check if thread response is overdue (>48 hours)
 */
const isOverdue = (timestamp: string): boolean => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours > 48;
};

export const ThreadViewHeader: React.FC<ThreadViewHeaderProps> = ({
    thread,
    messageCount,
    onReply,
    onForward,
    onArchive,
    onSnooze,
    onDelete,
    isCompact = false
}) => {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <header
            className={`thread-view-header ${isCompact ? 'thread-view-header--compact' : ''}`}
            data-testid="thread-view-header"
        >
            {/* Top Row: Back button and actions */}
            <div className="thread-view-header__top-row">
                <button
                    className="thread-view-header__back-btn"
                    onClick={handleBack}
                    aria-label="Go back"
                    data-testid="back-button"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span className="thread-view-header__back-text">Back</span>
                </button>

                {/* Quick Actions */}
                <div className="thread-view-header__actions">
                    {onReply && (
                        <button
                            className="thread-view-header__action-btn thread-view-header__action-btn--primary"
                            onClick={onReply}
                            aria-label="Reply"
                            data-testid="reply-button"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 17 4 12 9 7" />
                                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                            </svg>
                            <span className="thread-view-header__action-text">Reply</span>
                        </button>
                    )}

                    {onForward && (
                        <button
                            className="thread-view-header__action-btn"
                            onClick={onForward}
                            aria-label="Forward"
                            data-testid="forward-button"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 17 20 12 15 7" />
                                <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                            </svg>
                        </button>
                    )}

                    {onArchive && (
                        <button
                            className="thread-view-header__action-btn"
                            onClick={onArchive}
                            aria-label="Archive"
                            data-testid="archive-button"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="21 8 21 21 3 21 3 8" />
                                <rect x="1" y="3" width="22" height="5" />
                                <line x1="10" y1="12" x2="14" y2="12" />
                            </svg>
                        </button>
                    )}

                    {onSnooze && (
                        <button
                            className="thread-view-header__action-btn"
                            onClick={onSnooze}
                            aria-label="Snooze"
                            data-testid="snooze-button"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </button>
                    )}

                    {onDelete && (
                        <button
                            className="thread-view-header__action-btn thread-view-header__action-btn--danger"
                            onClick={onDelete}
                            aria-label="Delete"
                            data-testid="delete-button"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Subject and Badges */}
            <div className="thread-view-header__content">
                <h1 className="thread-view-header__subject" data-testid="thread-subject">
                    {thread.subject}
                </h1>

                <div className="thread-view-header__meta">
                    {/* Badges row */}
                    <div className="thread-view-header__badges">
                        {/* Classification badge */}
                        <span
                            className={`thread-view-header__classification thread-view-header__classification--${thread.classification}`}
                            data-testid="classification-badge"
                        >
                            {getClassificationLabel(thread.classification)}
                        </span>

                        {/* Risk indicator */}
                        {thread.riskLevel !== 'none' && (
                            <span
                                className={`thread-view-header__risk ${getRiskClass(thread.riskLevel)}`}
                                data-testid="risk-badge"
                            >
                                <span className="thread-view-header__risk-dot" />
                                {thread.riskLevel === 'high' ? 'High Risk' : thread.riskLevel === 'medium' ? 'Medium' : 'Low'}
                            </span>
                        )}

                        {/* Overdue badge */}
                        {isOverdue(thread.lastMessageAt) && (
                            <span className="thread-view-header__overdue" data-testid="overdue-badge">
                                Response Overdue
                            </span>
                        )}
                    </div>

                    {/* Message count and timestamp */}
                    <div className="thread-view-header__info">
                        <span className="thread-view-header__message-count">
                            {messageCount} {messageCount === 1 ? 'message' : 'messages'}
                        </span>
                        <span className="thread-view-header__separator">•</span>
                        <time
                            className="thread-view-header__timestamp"
                            dateTime={thread.lastMessageAt}
                        >
                            {formatRelativeTime(thread.lastMessageAt)}
                        </time>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default ThreadViewHeader;
