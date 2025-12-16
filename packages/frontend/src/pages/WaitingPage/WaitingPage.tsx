import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../../utils/apiClient';
import { AnimatedEmptyState } from '../../components/AnimatedEmptyState';
import './WaitingPage.css';
import './WaitingPage.hightech.css';

interface Thread {
  id: string;
  subject: string;
  participants: Array<{ name: string; email: string; role?: string }>;
  classification: 'buyer' | 'vendor' | 'market' | 'lawyer_broker' | 'noise';
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  riskReason?: string;
  lastMessageAt: string;
  lastReplyAt?: string;
  summary: string;
  nextAction?: string;
  propertyId?: string;
}

// Swipe gesture state interface
interface SwipeState {
  threadId: string | null;
  startX: number;
  currentX: number;
  isSwiping: boolean;
}

export const WaitingPage: React.FC = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    threadId: null,
    startX: 0,
    currentX: 0,
    isSwiping: false,
  });
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadWaitingThreads();
  }, []);

  const loadWaitingThreads = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ threads: Thread[] }>('/api/threads?filter=waiting');
      setThreads(response.data.threads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load threads');
      console.error('Failed to load waiting threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async (threadId: string) => {
    try {
      // Navigate to thread detail for follow-up
      window.location.href = `/threads/${threadId}`;
    } catch (err) {
      console.error('Failed to open thread:', err);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'var(--color-risk-high)';
      case 'medium': return 'var(--color-risk-medium)';
      case 'low': return 'var(--color-risk-low)';
      default: return 'var(--color-risk-none)';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getDaysSinceReply = (lastReplyAt?: string): number | null => {
    if (!lastReplyAt) return null;
    const date = new Date(lastReplyAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  // Swipe gesture handlers
  const handleTouchStart = useCallback((threadId: string, e: React.TouchEvent) => {
    setSwipeState({
      threadId,
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
      isSwiping: true,
    });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeState.isSwiping || !swipeState.threadId) return;
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - swipeState.startX;
    
    // Limit swipe distance
    const clampedDelta = Math.max(-100, Math.min(100, deltaX));
    
    const card = cardRefs.current.get(swipeState.threadId);
    if (card) {
      card.style.transform = `translateX(${clampedDelta}px)`;
      card.classList.add('swiping');
    }
    
    setSwipeState(prev => ({ ...prev, currentX }));
  }, [swipeState.isSwiping, swipeState.threadId, swipeState.startX]);

  const handleTouchEnd = useCallback(() => {
    if (!swipeState.isSwiping || !swipeState.threadId) return;
    
    const deltaX = swipeState.currentX - swipeState.startX;
    const card = cardRefs.current.get(swipeState.threadId);
    
    if (card) {
      card.classList.remove('swiping');
      card.style.transform = '';
    }
    
    // Threshold for action trigger
    const threshold = 80;
    
    if (deltaX > threshold) {
      // Swipe right - View/Follow up action
      window.location.href = `/threads/${swipeState.threadId}`;
    }
    
    setSwipeState({
      threadId: null,
      startX: 0,
      currentX: 0,
      isSwiping: false,
    });
  }, [swipeState]);

  const setCardRef = useCallback((threadId: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(threadId, el);
    } else {
      cardRefs.current.delete(threadId);
    }
  }, []);

  if (loading) {
    return (
      <div className="waiting-page">
        <div className="container">
          <h1 className="waiting-page__title">Waiting</h1>
          <div className="waiting-page__loading">Loading threads...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="waiting-page">
        <div className="container">
          <h1 className="waiting-page__title">Waiting</h1>
          <div className="waiting-page__error">
            <p>{error}</p>
            <button onClick={loadWaitingThreads} className="waiting-page__retry-btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const atRiskThreads = Array.isArray(threads) ? threads.filter(t => t.riskLevel !== 'none') : [];
  const safeThreads = Array.isArray(threads) ? threads.filter(t => t.riskLevel === 'none') : [];

  return (
    <div className="waiting-page">
      <div className="container">
        <div className="waiting-page__header">
          <div>
            <h1 className="waiting-page__title">Waiting</h1>
            <p className="waiting-page__description">
              {threads.length} {threads.length === 1 ? 'thread' : 'threads'} waiting for replies
              {atRiskThreads.length > 0 && (
                <span className="waiting-page__risk-count">
                  {' '}• {atRiskThreads.length} at risk
                </span>
              )}
            </p>
          </div>
          <button onClick={loadWaitingThreads} className="waiting-page__refresh-btn">
            Refresh
          </button>
        </div>

        {threads.length === 0 ? (
          <AnimatedEmptyState
            message="Nothing waiting"
            subMessage="No threads are waiting for replies right now. Check back later or start a new conversation."
            avatarState="idle"
            avatarSize="lg"
          />
        ) : (
          <>
            {atRiskThreads.length > 0 && (
              <div className="waiting-page__section">
                <h2 className="waiting-page__section-title">
                  ⚠️ At Risk ({atRiskThreads.length})
                </h2>
                <div className="waiting-page__threads">
                  {atRiskThreads.map(thread => (
                    <div 
                      key={thread.id} 
                      className="thread-card thread-card--at-risk"
                      ref={(el) => setCardRef(thread.id, el)}
                      onTouchStart={(e) => handleTouchStart(thread.id, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="thread-card__header">
                        <div className="thread-card__indicators">
                          <span 
                            className="thread-card__risk-badge"
                            style={{ backgroundColor: getRiskColor(thread.riskLevel) }}
                          >
                            {thread.riskLevel.toUpperCase()} RISK
                          </span>
                          <span className="thread-card__classification">
                            {thread.classification.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="thread-card__date">
                          {formatDate(thread.lastMessageAt)}
                        </span>
                      </div>

                      <h3 className="thread-card__subject">{thread.subject}</h3>

                      <div className="thread-card__participants">
                        {thread.participants.slice(0, 3).map((p, idx) => (
                          <span key={idx} className="thread-card__participant">
                            {p.name || p.email}
                          </span>
                        ))}
                        {thread.participants.length > 3 && (
                          <span className="thread-card__participant-more">
                            +{thread.participants.length - 3} more
                          </span>
                        )}
                      </div>

                      {thread.riskReason && (
                        <div className="thread-card__risk-reason">
                          ⚠️ {thread.riskReason}
                        </div>
                      )}

                      {thread.lastReplyAt && (
                        <div className="thread-card__waiting-info">
                          Waiting {getDaysSinceReply(thread.lastReplyAt)} days for reply
                        </div>
                      )}

                      <p className="thread-card__summary">{thread.summary}</p>

                      {thread.nextAction && (
                        <div className="thread-card__next-action">
                          <strong>Suggested action:</strong> {thread.nextAction}
                        </div>
                      )}

                      <div className="thread-card__actions">
                        <button 
                          onClick={() => handleFollowUp(thread.id)}
                          className="thread-card__action thread-card__action--primary"
                        >
                          Follow Up
                        </button>
                        <button 
                          onClick={() => window.location.href = `/threads/${thread.id}`}
                          className="thread-card__action"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {safeThreads.length > 0 && (
              <div className="waiting-page__section">
                <h2 className="waiting-page__section-title">
                  ✓ On Track ({safeThreads.length})
                </h2>
                <div className="waiting-page__threads">
                  {safeThreads.map(thread => (
                    <div 
                      key={thread.id} 
                      className="thread-card"
                      ref={(el) => setCardRef(thread.id, el)}
                      onTouchStart={(e) => handleTouchStart(thread.id, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="thread-card__header">
                        <div className="thread-card__indicators">
                          <span className="thread-card__classification">
                            {thread.classification.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="thread-card__date">
                          {formatDate(thread.lastMessageAt)}
                        </span>
                      </div>

                      <h3 className="thread-card__subject">{thread.subject}</h3>

                      <div className="thread-card__participants">
                        {thread.participants.slice(0, 3).map((p, idx) => (
                          <span key={idx} className="thread-card__participant">
                            {p.name || p.email}
                          </span>
                        ))}
                        {thread.participants.length > 3 && (
                          <span className="thread-card__participant-more">
                            +{thread.participants.length - 3} more
                          </span>
                        )}
                      </div>

                      {thread.lastReplyAt && (
                        <div className="thread-card__waiting-info">
                          Waiting {getDaysSinceReply(thread.lastReplyAt)} days for reply
                        </div>
                      )}

                      <p className="thread-card__summary">{thread.summary}</p>

                      {thread.nextAction && (
                        <div className="thread-card__next-action">
                          <strong>Suggested action:</strong> {thread.nextAction}
                        </div>
                      )}

                      <div className="thread-card__actions">
                        <button 
                          onClick={() => window.location.href = `/threads/${thread.id}`}
                          className="thread-card__action"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
