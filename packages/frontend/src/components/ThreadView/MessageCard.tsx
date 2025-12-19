/**
 * MessageCard Component
 * 
 * Individual message display with expand/collapse functionality.
 * Shows sender info, timestamp, and message content.
 * Mobile-first design with touch-friendly interactions.
 */

import React, { useMemo } from 'react';
import { MessageWithAttachments } from '../../models/newPage.types';
import './MessageCard.css';

interface MessageCardProps {
    message: MessageWithAttachments;
    isExpanded: boolean;
    onToggle: () => void;
    isLatest?: boolean;
}

/**
 * Format relative timestamp
 */
const formatTimestamp = (timestamp: string): string => {
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

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};

/**
 * Get initials from name
 */
const getInitials = (name: string): string => {
    if (!name) return '?';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

/**
 * Truncate text to specified length
 */
const truncateText = (text: string, maxLength: number): string => {
    if (!text) return '';
    const plainText = text.replace(/<[^>]*>/g, '').trim();
    if (plainText.length <= maxLength) return plainText;
    return plainText.slice(0, maxLength).trim() + '...';
};

/**
 * Format recipients list
 */
const formatRecipients = (recipients: Array<{ name: string; email: string }>): string => {
    if (!recipients || recipients.length === 0) return '';
    if (recipients.length === 1) return recipients[0].name || recipients[0].email;
    return `${recipients[0].name || recipients[0].email} +${recipients.length - 1}`;
};

export const MessageCard: React.FC<MessageCardProps> = ({
    message,
    isExpanded,
    onToggle,
    isLatest = false
}) => {
    // Memoize preview text
    const previewText = useMemo(() => {
        return truncateText(message.body, 150);
    }, [message.body]);

    return (
        <article
            className={`message-card ${isExpanded ? 'message-card--expanded' : ''} ${message.isFromUser ? 'message-card--from-user' : ''} ${isLatest ? 'message-card--latest' : ''}`}
            data-testid="message-card"
            data-message-id={message.id}
        >
            {/* Message Header - Always visible */}
            <header
                className="message-card__header"
                onClick={onToggle}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggle();
                    }
                }}
            >
                {/* Avatar */}
                <div className="message-card__avatar">
                    {getInitials(message.from.name)}
                </div>

                {/* Sender info */}
                <div className="message-card__sender-info">
                    <div className="message-card__sender-row">
                        <span className="message-card__sender-name">
                            {message.from.name || message.from.email}
                        </span>
                        {message.isFromUser && (
                            <span className="message-card__you-badge">You</span>
                        )}
                        {isLatest && (
                            <span className="message-card__latest-badge">Latest</span>
                        )}
                    </div>
                    <div className="message-card__meta-row">
                        <span className="message-card__sender-email">{message.from.email}</span>
                        {message.to && message.to.length > 0 && (
                            <>
                                <span className="message-card__separator">→</span>
                                <span className="message-card__recipients">{formatRecipients(message.to)}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Timestamp and expand toggle */}
                <div className="message-card__header-right">
                    <time
                        className="message-card__timestamp"
                        dateTime={message.sentAt}
                    >
                        {formatTimestamp(message.sentAt)}
                    </time>
                    <button
                        className="message-card__expand-toggle"
                        aria-label={isExpanded ? 'Collapse message' : 'Expand message'}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points={isExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Collapsed Preview */}
            {!isExpanded && (
                <div className="message-card__preview">
                    <p className="message-card__preview-text">{previewText}</p>
                    {message.attachments && message.attachments.length > 0 && (
                        <span className="message-card__attachment-indicator">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                            {message.attachments.length}
                        </span>
                    )}
                </div>
            )}

            {/* Expanded Content */}
            {isExpanded && (
                <div className="message-card__content">
                    {/* Recipients detail */}
                    {message.to && message.to.length > 0 && (
                        <div className="message-card__recipients-detail">
                            <span className="message-card__label">To:</span>
                            {message.to.map((r, i) => (
                                <span key={i} className="message-card__recipient">
                                    {r.name || r.email}
                                    {i < message.to!.length - 1 && ', '}
                                </span>
                            ))}
                        </div>
                    )}

                    {message.cc && message.cc.length > 0 && (
                        <div className="message-card__recipients-detail">
                            <span className="message-card__label">Cc:</span>
                            {message.cc.map((r, i) => (
                                <span key={i} className="message-card__recipient">
                                    {r.name || r.email}
                                    {i < message.cc!.length - 1 && ', '}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Message body */}
                    <div className="message-card__body">
                        {message.bodyHtml ? (
                            <div
                                className="message-card__html-content"
                                dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                            />
                        ) : (
                            <pre className="message-card__text-content">{message.body}</pre>
                        )}
                    </div>

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="message-card__attachments">
                            <h4 className="message-card__attachments-title">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                                {message.attachments.length} Attachment{message.attachments.length !== 1 ? 's' : ''}
                            </h4>
                            <div className="message-card__attachment-list">
                                {message.attachments.map((att) => (
                                    <a
                                        key={att.id}
                                        href={att.url}
                                        className="message-card__attachment-item"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={att.filename}
                                    >
                                        {att.thumbnailUrl ? (
                                            <img
                                                src={att.thumbnailUrl}
                                                alt={att.filename}
                                                className="message-card__attachment-thumb"
                                            />
                                        ) : (
                                            <div className="message-card__attachment-icon">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                </svg>
                                            </div>
                                        )}
                                        <span className="message-card__attachment-name">{att.filename}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
};

export default MessageCard;
