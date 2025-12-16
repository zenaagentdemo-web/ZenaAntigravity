/**
 * ThreadCard Component
 * 
 * Displays an individual email thread with glassmorphism styling,
 * classification badge, risk indicator, subject, participants, summary, and timestamp.
 * 
 * Requirements: 1.2, 1.3, 3.1
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Thread,
  ThreadClassification,
  DealStage,
  Participant
} from '../../models/newPage.types';
import { isThreadOverdue } from '../../utils/threadPriorityCalculator';
import { hapticFeedback } from '../../utils/hapticFeedback';
import { useAnimationPerformance, applyAnimationOptimizations, cleanupAnimationOptimizations } from '../../utils/animationPerformance';
import './ThreadCard.css';

export interface ThreadCardProps {
  /** Thread data to display */
  thread: Thread;
  /** Whether the inline dropdown is expanded */
  isDropdownExpanded?: boolean;
  /** Whether the card is selected in batch mode */
  isSelected?: boolean;
  /** Whether batch selection mode is active */
  isBatchMode?: boolean;
  /** Whether to show the quick reply button */
  showQuickReply?: boolean;
  /** Callback when dropdown toggle is clicked */
  onDropdownToggle?: (threadId: string) => void;
  /** Callback when quick reply button is clicked */
  onQuickReply?: (threadId: string) => void;
  /** Callback when card is selected in batch mode */
  onSelect?: (threadId: string) => void;
  /** Callback for thread actions */
  onAction?: (threadId: string, action: 'view' | 'snooze' | 'send_draft') => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Get display label for thread classification
 */
const getClassificationLabel = (classification: ThreadClassification): string => {
  const labels: Record<ThreadClassification, string> = {
    buyer: 'Buyer',
    vendor: 'Vendor',
    market: 'Market',
    lawyer_broker: 'Legal/Broker',
    noise: 'Other'
  };
  return labels[classification];
};

/**
 * Get display label for deal stage
 */
const getDealStageLabel = (stage: DealStage): string => {
  const labels: Record<DealStage, string> = {
    inquiry: 'Inquiry',
    viewing: 'Viewing',
    offer: 'Offer',
    negotiation: 'Negotiation',
    conditional: 'Conditional',
    unconditional: 'Unconditional',
    settled: 'Settled'
  };
  return labels[stage];
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
 * Format participants display with limit
 * Shows max 3 participants with "+N more" indicator
 */
export const formatParticipants = (participants: Participant[] = [], maxDisplay: number = 3): {
  displayed: string[];
  remaining: number;
} => {
  if (!participants) return { displayed: [], remaining: 0 };
  const names = participants.map(p => p?.name || 'Unknown');
  const displayed = names.slice(0, maxDisplay);
  const remaining = Math.max(0, names.length - maxDisplay);
  return { displayed, remaining };
};

// Define component first
const ThreadCardComponent: React.FC<ThreadCardProps> = ({
  thread,
  isDropdownExpanded = false,
  isSelected = false,
  isBatchMode = false,
  showQuickReply = true,
  onDropdownToggle,
  onQuickReply,
  onSelect,
  onAction,
  className = ''
}) => {
  const navigate = useNavigate();
  // Animation performance monitoring
  const { requestAnimation } = useAnimationPerformance();
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate if thread is overdue (>48 hours)
  const isOverdue = useMemo(() => isThreadOverdue(thread.lastMessageAt), [thread.lastMessageAt]);

  // Format participants
  const { displayed: displayedParticipants, remaining: remainingParticipants } = useMemo(
    () => formatParticipants(thread?.participants || []),
    [thread?.participants]
  );

  // Apply animation optimizations when dropdown is expanded
  useEffect(() => {
    if (cardRef.current) {
      if (isDropdownExpanded) {
        applyAnimationOptimizations(cardRef.current);
      } else {
        cleanupAnimationOptimizations(cardRef.current);
      }
    }
  }, [isDropdownExpanded]);

  // Handle card click
  const handleCardClick = () => {
    if (isBatchMode && onSelect) {
      onSelect(thread.id);
    } else if (onAction) {
      onAction(thread.id, 'view');
    }
  };

  // Handle dropdown toggle click
  const handleDropdownToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDropdownToggle) {
      // Trigger haptic feedback for dropdown toggle (Requirement 7.6)
      hapticFeedback.light();

      // Request animation with performance throttling (Requirement 7.1, 7.2)
      const animationId = `dropdown-toggle-${thread.id}`;
      const wasStarted = requestAnimation(animationId, () => {
        onDropdownToggle(thread.id);
      });

      // If animation was throttled, still execute the toggle for functionality
      if (!wasStarted) {
        onDropdownToggle(thread.id);
      }
    }
  };

  // Handle quick reply click
  const handleQuickReplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickReply) {
      onQuickReply(thread.id);
    }
  };

  // Handle checkbox click in batch mode
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(thread.id);
    }
  };

  return (
    <article
      ref={cardRef}
      className={`thread-card ${isDropdownExpanded ? 'thread-card--expanded' : ''} ${isSelected ? 'thread-card--selected' : ''} ${isBatchMode ? 'thread-card--batch-mode' : ''} ${className}`}
      onClick={handleCardClick}
      role="article"
      aria-label={`Email thread: ${thread.subject}`}
      data-testid="thread-card"
    >
      {/* Batch mode checkbox */}
      {isBatchMode && (
        <div className="thread-card__checkbox" onClick={handleCheckboxClick}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => { }}
            aria-label={`Select thread: ${thread.subject}`}
          />
        </div>
      )}

      {/* Header row: Classification badge, Risk indicator, Timestamp */}
      <header className="thread-card__header">
        <div className="thread-card__badges">
          {/* Classification badge */}
          <span
            className={`thread-card__classification thread-card__classification--${thread.classification}`}
            data-testid="classification-badge"
          >
            {getClassificationLabel(thread.classification)}
          </span>

          {/* Risk indicator */}
          {thread.riskLevel !== 'none' && (
            <span
              className={`thread-card__risk thread-card__risk--${thread.riskLevel}`}
              data-testid="risk-indicator"
              aria-label={`Risk level: ${thread.riskLevel}`}
            >
              <span className="thread-card__risk-dot" />
              {thread.riskLevel === 'high' ? 'High Risk' : thread.riskLevel === 'medium' ? 'Medium' : 'Low'}
            </span>
          )}

          {/* Response Overdue badge */}
          {isOverdue && (
            <span
              className="thread-card__overdue"
              data-testid="overdue-badge"
            >
              Response Overdue
            </span>
          )}

          {/* Draft Ready indicator */}
          {thread.draftResponse && (
            <span
              className="thread-card__draft"
              data-testid="draft-indicator"
            >
              Draft Ready
            </span>
          )}
        </div>

        <time
          className="thread-card__timestamp"
          dateTime={thread.lastMessageAt}
          data-testid="timestamp"
        >
          {formatRelativeTime(thread.lastMessageAt)}
        </time>
      </header>

      {/* Subject line */}
      <h3 className="thread-card__subject" data-testid="subject">
        {thread.subject}
      </h3>

      <div className="thread-card__participants" data-testid="participants">
        {displayedParticipants.filter(Boolean).map((name, index, arr) => (
          <span key={index} className="thread-card__participant">
            {name}
            {index < arr.length - 1 && ', '}
          </span>
        ))}
        {remainingParticipants > 0 && (
          <span className="thread-card__participant-more" data-testid="participants-more">
            +{remainingParticipants} more
          </span>
        )}
      </div>

      {/* AI Summary preview */}
      <p className="thread-card__summary" data-testid="summary">
        {thread.aiSummary || thread.summary}
      </p>

      {/* Linked entity badges */}
      <div className="thread-card__entities">
        {/* Property badge */}
        {thread.propertyId && (
          <span
            className="thread-card__property-badge thread-card__property-badge--clickable"
            data-testid="property-badge"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/property/${thread.propertyId}`);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/property/${thread.propertyId}`);
              }
            }}
          >
            <svg className="thread-card__badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {thread.propertyAddress || 'Property'}
          </span>
        )}

        {/* Deal stage indicator */}
        {thread.dealId && thread.dealStage && (
          <span
            className={`thread-card__deal-badge thread-card__deal-badge--${thread.dealStage}`}
            data-testid="deal-badge"
          >
            <svg className="thread-card__badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            {getDealStageLabel(thread.dealStage)}
          </span>
        )}
      </div>

      {/* Action row with Quick Reply button and dropdown arrow */}
      <div className="thread-card__action-row" data-testid="action-row">
        {/* Quick Reply Button - positioned on the left */}
        {showQuickReply && (
          <button
            className="thread-card__quick-reply"
            onClick={handleQuickReplyClick}
            aria-label="Quick reply to this thread"
            data-testid="quick-reply-button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
            Quick Reply
          </button>
        )}

        {/* Spacer to push dropdown to the right when no quick reply */}
        {!showQuickReply && <div className="thread-card__action-spacer" />}

        {/* Dropdown toggle button - positioned on the right */}
        <button
          className="thread-card__dropdown-toggle"
          onClick={handleDropdownToggle}
          aria-label={isDropdownExpanded ? 'Collapse thread details' : 'Expand thread details'}
          aria-expanded={isDropdownExpanded}
          data-testid="dropdown-arrow"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points={isDropdownExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
          </svg>
        </button>
      </div>

      {/* Inline AI Summary Dropdown */}
      {isDropdownExpanded && (
        <div
          className="thread-card__dropdown-container"
          data-testid="ai-summary-dropdown"
          role="region"
          aria-label="Thread details"
        >
          {/* AI Summary Section */}
          <section className="thread-card__dropdown-section">
            <h4 className="thread-card__dropdown-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              AI Summary
            </h4>
            <p className="thread-card__dropdown-summary">
              {thread.aiSummary || thread.summary}
            </p>
          </section>

          {/* Recommended Actions */}
          <section className="thread-card__dropdown-section">
            <h4 className="thread-card__dropdown-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 17 4 12 9 7" />
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
              Recommended Actions
            </h4>
            <div className="thread-card__dropdown-actions">
              <button
                className="thread-card__action-button thread-card__action-button--primary"
                onClick={handleQuickReplyClick}
                data-testid="action-quick-reply"
              >
                Quick Reply
              </button>
              <button
                className="thread-card__action-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.(thread.id, 'snooze');
                }}
                data-testid="action-schedule-followup"
              >
                Schedule Follow-up
              </button>
              <button
                className="thread-card__action-button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Mark priority action - could be implemented later
                }}
                data-testid="action-mark-priority"
              >
                Mark Priority
              </button>
            </div>
          </section>

          {/* Linked Entities */}
          {(thread.propertyId || thread.dealId) && (
            <section className="thread-card__dropdown-section">
              <h4 className="thread-card__dropdown-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Linked Entities
              </h4>
              <div className="thread-card__dropdown-entities">
                {thread.propertyId && (
                  <div className="thread-card__entity-card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span>{thread.propertyAddress || 'Property'}</span>
                  </div>
                )}
                {thread.dealId && (
                  <div className="thread-card__entity-card">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    <span>{getDealStageLabel(thread.dealStage || 'inquiry')}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Participant Cards */}
          {(thread?.participants?.length || 0) > 0 && (
            <section className="thread-card__dropdown-section">
              <h4 className="thread-card__dropdown-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Participants
              </h4>
              <div className="thread-card__dropdown-participants">
                {thread.participants.slice(0, 3).map((participant) => (
                  <div key={participant?.id || Math.random()} className="thread-card__participant-card">
                    <div className="thread-card__participant-avatar">
                      {participant?.avatarUrl ? (
                        <img src={participant.avatarUrl} alt={participant.name || 'User'} />
                      ) : (
                        (participant?.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      )}
                    </div>
                    <div className="thread-card__participant-info">
                      <span className="thread-card__participant-name">{participant?.name || 'Unknown User'}</span>
                      <span className="thread-card__participant-email">{participant?.email || 'No email'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </article>
  );
};

// Export memoized version for performance
export const ThreadCard = React.memo(ThreadCardComponent);
export default ThreadCard;
