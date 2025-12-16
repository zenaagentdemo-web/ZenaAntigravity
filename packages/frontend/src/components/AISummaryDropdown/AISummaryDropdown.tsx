import React, { useRef, useEffect } from 'react';
import { Thread } from '../../models/newPage.types';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { hapticFeedback } from '../../utils/hapticFeedback';
import { useAnimationPerformance, applyAnimationOptimizations, cleanupAnimationOptimizations } from '../../utils/animationPerformance';
import './AISummaryDropdown.css';

// ============================================================================
// Enhanced Data Models for AI Summary Dropdown
// ============================================================================

export interface HighlightedEntity {
  text: string;
  type: 'person' | 'property' | 'date' | 'amount' | 'location';
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export interface EnhancedSummary {
  content: string;
  highlightedEntities: HighlightedEntity[];
  keyPoints: string[];
  actionItems: string[];
}

export interface SentimentData {
  overall: 'positive' | 'neutral' | 'negative';
  confidence: number;
  emotions: EmotionScore[];
}

export interface EmotionScore {
  emotion: 'joy' | 'anger' | 'fear' | 'sadness' | 'surprise' | 'trust';
  score: number; // 0-1
}

export interface UrgencyIndicator {
  type: 'time_sensitive' | 'high_value' | 'relationship_risk' | 'deadline_approaching';
  level: 'low' | 'medium' | 'high';
  description: string;
  icon: string;
}

export interface RecommendedAction {
  id: string;
  type: 'quick_reply' | 'schedule_followup' | 'mark_priority';
  label: string;
  description: string;
  priority: number;
  icon: string;
}

export interface LinkedEntity {
  id: string;
  type: 'property' | 'deal' | 'contact';
  name: string;
  details: Record<string, unknown>;
  quickNavUrl?: string;
}

export interface ParticipantCard {
  id: string;
  name: string;
  email: string;
  role: string;
  contactMethods: string[];
  recentInteractions: string[];
  avatarUrl?: string;
}

export interface DropdownContent {
  aiSummary: string;
  sentimentAnalysis?: SentimentData;
  urgencyIndicators: UrgencyIndicator[];
  recommendedActions: RecommendedAction[];
  linkedEntities: LinkedEntity[];
  participantCards: ParticipantCard[];
}

export type DropdownAction = 'quick_reply' | 'schedule_followup' | 'mark_priority';

// ============================================================================
// Component Props
// ============================================================================

export interface AISummaryDropdownProps {
  /** Thread data for summary display */
  thread: Thread;
  /** Whether the dropdown is expanded */
  isExpanded: boolean;
  /** Whether content is loading */
  isLoading?: boolean;
  /** Loading error if any */
  error?: Error | null;
  /** Callback for action button clicks */
  onAction?: (action: DropdownAction) => void;
  /** Callback for retry on error */
  onRetry?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates enhanced content with fallback handling
 * Handles missing AI data gracefully per Requirements 2.6, 8.1
 */
const generateContentWithFallback = (thread: Thread): DropdownContent & { hasAIData: boolean } => {
  const hasAIData = Boolean(thread.aiSummary);
  
  // Basic recommended actions available even without AI data
  const basicActions: RecommendedAction[] = [
    {
      id: 'quick_reply',
      type: 'quick_reply',
      label: 'Quick Reply',
      description: 'Send a quick response',
      priority: 1,
      icon: '💬'
    },
    {
      id: 'schedule_followup',
      type: 'schedule_followup',
      label: 'Schedule Follow-up',
      description: 'Set a reminder to follow up',
      priority: 2,
      icon: '📅'
    },
    {
      id: 'mark_priority',
      type: 'mark_priority',
      label: 'Mark Priority',
      description: 'Flag as high priority',
      priority: 3,
      icon: '⭐'
    }
  ].slice(0, 3); // Max 3 actions as per requirements

  return {
    hasAIData,
    aiSummary: thread.aiSummary || thread.summary,
    // Only include AI-enhanced data if AI summary is available
    sentimentAnalysis: hasAIData ? {
      overall: 'neutral',
      confidence: 0.75,
      emotions: [
        { emotion: 'trust', score: 0.6 },
        { emotion: 'joy', score: 0.3 }
      ]
    } : undefined,
    urgencyIndicators: hasAIData ? [
      {
        type: 'time_sensitive',
        level: 'medium',
        description: 'Response expected within 24 hours',
        icon: '⏰'
      }
    ] : [],
    recommendedActions: basicActions,
    linkedEntities: thread.propertyAddress ? [
      {
        id: thread.propertyId || 'prop-1',
        type: 'property',
        name: thread.propertyAddress,
        details: { address: thread.propertyAddress },
        quickNavUrl: `/properties/${thread.propertyId}`
      }
    ] : [],
    participantCards: thread.participants.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role || 'other',
      contactMethods: ['email', 'phone'],
      recentInteractions: ['Last contact: 2 days ago'],
      avatarUrl: p.avatarUrl
    }))
  };
};

/**
 * Highlights entities in text content
 */
const highlightEntities = (text: string, entities: HighlightedEntity[]): React.ReactNode => {
  if (!entities.length) return text;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Sort entities by start index
  const sortedEntities = [...entities].sort((a, b) => a.startIndex - b.startIndex);

  sortedEntities.forEach((entity, index) => {
    // Add text before entity
    if (entity.startIndex > lastIndex) {
      parts.push(text.slice(lastIndex, entity.startIndex));
    }

    // Add highlighted entity
    parts.push(
      <span
        key={`entity-${index}`}
        className={`ai-summary-dropdown__entity ai-summary-dropdown__entity--${entity.type}`}
        title={`${entity.type} (${Math.round(entity.confidence * 100)}% confidence)`}
      >
        {entity.text}
      </span>
    );

    lastIndex = entity.endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

// ============================================================================
// Main Component
// ============================================================================

export const AISummaryDropdown: React.FC<AISummaryDropdownProps> = ({
  thread,
  isExpanded,
  isLoading = false,
  error = null,
  onAction,
  onRetry
}) => {
  // Generate content with fallback handling (Requirements 2.6, 8.1)
  const contentWithFallback = React.useMemo(() => generateContentWithFallback(thread), [thread]);
  const { hasAIData, ...content } = contentWithFallback;
  
  // Keyboard navigation setup
  const { containerRef, announceToScreenReader, focusFirstElement } = useKeyboardNavigation({
    enableArrowNavigation: true,
    enableTabTrapping: false
  });

  // Reduced motion support
  const { prefersReducedMotion, getTransitionDuration } = useReducedMotion();
  
  // Animation performance monitoring
  const { requestAnimation, isPerformanceAcceptable } = useAnimationPerformance();

  // Focus first interactive element when dropdown expands
  useEffect(() => {
    if (isExpanded) {
      // Apply animation optimizations for better performance (Requirement 7.1, 7.2)
      if (containerRef.current) {
        applyAnimationOptimizations(containerRef.current);
      }
      
      // Request animation with performance throttling
      const animationId = `dropdown-expand-${thread.id}`;
      const wasStarted = requestAnimation(animationId, () => {
        // Announce to screen readers with detailed information
        const participantCount = content.participantCards.length;
        const actionCount = content.recommendedActions.length;
        const announcement = `AI summary dropdown expanded. Contains ${actionCount} recommended actions and ${participantCount} participants. Use Tab to navigate through options.`;
        
        announceToScreenReader(announcement, 'polite');
        
        // Focus first interactive element after a brief delay
        setTimeout(() => {
          focusFirstElement();
        }, 100);
      });
      
      // If animation was throttled due to performance, still provide basic functionality
      if (!wasStarted) {
        announceToScreenReader('AI summary dropdown expanded', 'polite');
        focusFirstElement();
      }
    } else {
      // Clean up animation optimizations when collapsed
      if (containerRef.current) {
        cleanupAnimationOptimizations(containerRef.current);
      }
      
      // Announce when collapsed
      announceToScreenReader('AI summary dropdown collapsed', 'polite');
    }
  }, [isExpanded, announceToScreenReader, focusFirstElement, content, thread.id, requestAnimation]);

  // Don't render if not expanded
  if (!isExpanded) {
    return null;
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="ai-summary-dropdown ai-summary-dropdown--loading">
        <div className="ai-summary-dropdown__skeleton">
          <div className="ai-summary-dropdown__skeleton-line ai-summary-dropdown__skeleton-line--long"></div>
          <div className="ai-summary-dropdown__skeleton-line ai-summary-dropdown__skeleton-line--medium"></div>
          <div className="ai-summary-dropdown__skeleton-line ai-summary-dropdown__skeleton-line--short"></div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="ai-summary-dropdown ai-summary-dropdown--error">
        <div className="ai-summary-dropdown__error">
          <p className="ai-summary-dropdown__error-message">
            Failed to load enhanced content
          </p>
          <p className="ai-summary-dropdown__error-details">
            {error.message}
          </p>
          {onRetry && (
            <button
              className="ai-summary-dropdown__retry-button"
              onClick={() => {
                // Trigger haptic feedback for retry action (Requirement 7.6)
                hapticFeedback.light();
                onRetry?.();
              }}
              type="button"
              aria-label="Retry loading AI summary content"
            >
              Retry
            </button>
          )}
        </div>
        {/* Show fallback content */}
        <div className="ai-summary-dropdown__fallback">
          <h4 className="ai-summary-dropdown__section-title">Summary</h4>
          <p className="ai-summary-dropdown__summary">{thread.summary}</p>
          <p className="ai-summary-dropdown__ai-pending">AI analysis pending...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`ai-summary-dropdown ${prefersReducedMotion ? 'ai-summary-dropdown--reduced-motion' : ''}`}
      role="region"
      aria-label="AI Summary Details"
      aria-expanded={isExpanded}
      aria-live="polite"
      aria-atomic="false"
      tabIndex={-1}
      style={{
        '--dropdown-transition-duration': getTransitionDuration('300ms'),
        '--dropdown-animation-duration': getTransitionDuration('300ms')
      } as React.CSSProperties}
    >
      {/* AI Summary Section with Fallback Content */}
      <div className="ai-summary-dropdown__section" role="group" aria-labelledby="ai-summary-title">
        <h4 id="ai-summary-title" className="ai-summary-dropdown__section-title">
          {hasAIData ? 'AI Summary' : 'Summary'}
        </h4>
        <div className="ai-summary-dropdown__summary" aria-describedby="ai-summary-title">
          {highlightEntities(content.aiSummary, [])}
        </div>
        {!hasAIData && (
          <div className="ai-summary-dropdown__ai-pending" role="status" aria-live="polite">
            <span className="ai-summary-dropdown__ai-pending-icon" aria-hidden="true">⏳</span>
            <span className="ai-summary-dropdown__ai-pending-text">
              AI analysis pending - enhanced insights will appear here once processing is complete
            </span>
          </div>
        )}
      </div>

      {/* Sentiment Analysis */}
      {content.sentimentAnalysis && (
        <div className="ai-summary-dropdown__section" role="group" aria-labelledby="sentiment-title">
          <h4 id="sentiment-title" className="ai-summary-dropdown__section-title">Sentiment</h4>
          <div className="ai-summary-dropdown__sentiment" aria-describedby="sentiment-title">
            <span 
              className={`ai-summary-dropdown__sentiment-badge ai-summary-dropdown__sentiment-badge--${content.sentimentAnalysis.overall}`}
              role="status"
              aria-label={`Sentiment: ${content.sentimentAnalysis.overall}`}
            >
              {content.sentimentAnalysis.overall}
            </span>
            <span 
              className="ai-summary-dropdown__sentiment-confidence"
              aria-label={`Confidence level: ${Math.round(content.sentimentAnalysis.confidence * 100)} percent`}
            >
              {Math.round(content.sentimentAnalysis.confidence * 100)}% confidence
            </span>
          </div>
        </div>
      )}

      {/* Urgency Indicators */}
      {content.urgencyIndicators.length > 0 && (
        <div className="ai-summary-dropdown__section" role="group" aria-labelledby="urgency-title">
          <h4 id="urgency-title" className="ai-summary-dropdown__section-title">Urgency</h4>
          <div className="ai-summary-dropdown__urgency-list" role="list" aria-describedby="urgency-title">
            {content.urgencyIndicators.map((indicator, index) => (
              <div
                key={index}
                className={`ai-summary-dropdown__urgency-item ai-summary-dropdown__urgency-item--${indicator.level}`}
                role="listitem"
                aria-label={`${indicator.level} urgency: ${indicator.description}`}
              >
                <span className="ai-summary-dropdown__urgency-icon" aria-hidden="true">
                  {indicator.icon}
                </span>
                <span className="ai-summary-dropdown__urgency-text">
                  {indicator.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      {content.recommendedActions.length > 0 && (
        <div className="ai-summary-dropdown__section" role="group" aria-labelledby="actions-title">
          <h4 id="actions-title" className="ai-summary-dropdown__section-title">Recommended Actions</h4>
          <div 
            className="ai-summary-dropdown__actions" 
            role="toolbar" 
            aria-label="Recommended actions for this thread"
            aria-describedby="actions-title"
          >
            {content.recommendedActions.map((action, index) => (
              <button
                key={action.id}
                className="ai-summary-dropdown__action-button"
                onClick={() => {
                  // Trigger haptic feedback for action button press (Requirement 7.6)
                  hapticFeedback.medium();
                  onAction?.(action.type);
                }}
                type="button"
                title={action.description}
                aria-label={`${action.label}: ${action.description}`}
                aria-describedby={`action-desc-${action.id}`}
                aria-posinset={index + 1}
                aria-setsize={content.recommendedActions.length}
              >
                <span className="ai-summary-dropdown__action-icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span className="ai-summary-dropdown__action-label">
                  {action.label}
                </span>
                <span id={`action-desc-${action.id}`} className="sr-only">
                  {action.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Linked Entities */}
      {content.linkedEntities.length > 0 && (
        <div className="ai-summary-dropdown__section" role="group" aria-labelledby="entities-title">
          <h4 id="entities-title" className="ai-summary-dropdown__section-title">Related</h4>
          <div className="ai-summary-dropdown__entities" role="list" aria-describedby="entities-title">
            {content.linkedEntities.map((entity, index) => (
              <div 
                key={entity.id} 
                className="ai-summary-dropdown__entity-card"
                role="listitem"
                aria-label={`${entity.type}: ${entity.name}`}
              >
                <div className="ai-summary-dropdown__entity-header">
                  <span 
                    className="ai-summary-dropdown__entity-type"
                    aria-label={`Entity type: ${entity.type}`}
                  >
                    {entity.type}
                  </span>
                  <span className="ai-summary-dropdown__entity-name">
                    {entity.name}
                  </span>
                </div>
                {entity.quickNavUrl && (
                  <a
                    href={entity.quickNavUrl}
                    className="ai-summary-dropdown__entity-link"
                    aria-label={`View details for ${entity.name} ${entity.type}`}
                    aria-describedby={`entity-desc-${entity.id}`}
                  >
                    View Details →
                    <span id={`entity-desc-${entity.id}`} className="sr-only">
                      Opens {entity.name} details in new page
                    </span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participant Cards */}
      {content.participantCards.length > 0 && (
        <div className="ai-summary-dropdown__section" role="group" aria-labelledby="participants-title">
          <h4 id="participants-title" className="ai-summary-dropdown__section-title">Participants</h4>
          <div 
            className="ai-summary-dropdown__participants" 
            role="list" 
            aria-describedby="participants-title"
            aria-label={`${content.participantCards.length} thread participants`}
          >
            {content.participantCards.map((participant, index) => (
              <div 
                key={participant.id} 
                className="ai-summary-dropdown__participant-card"
                role="listitem"
                aria-label={`Participant: ${participant.name}, ${participant.role}`}
                tabIndex={0}
              >
                <div className="ai-summary-dropdown__participant-header">
                  {participant.avatarUrl && (
                    <img
                      src={participant.avatarUrl}
                      alt={`${participant.name}'s avatar`}
                      className="ai-summary-dropdown__participant-avatar"
                      role="img"
                    />
                  )}
                  <div className="ai-summary-dropdown__participant-info">
                    <span 
                      className="ai-summary-dropdown__participant-name"
                      aria-label={`Name: ${participant.name}`}
                    >
                      {participant.name}
                    </span>
                    <span 
                      className="ai-summary-dropdown__participant-role"
                      aria-label={`Role: ${participant.role}`}
                    >
                      {participant.role}
                    </span>
                  </div>
                </div>
                <div className="ai-summary-dropdown__participant-contact">
                  <span 
                    className="ai-summary-dropdown__participant-email"
                    aria-label={`Email: ${participant.email}`}
                  >
                    {participant.email}
                  </span>
                </div>
                {participant.recentInteractions.length > 0 && (
                  <div 
                    className="ai-summary-dropdown__participant-interactions"
                    role="list"
                    aria-label="Recent interactions"
                  >
                    {participant.recentInteractions.map((interaction, interactionIndex) => (
                      <span 
                        key={interactionIndex} 
                        className="ai-summary-dropdown__interaction"
                        role="listitem"
                        aria-label={`Interaction: ${interaction}`}
                      >
                        {interaction}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AISummaryDropdown;