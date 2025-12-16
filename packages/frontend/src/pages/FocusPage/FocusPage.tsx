import React, { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../../utils/apiClient';
import { AnimatedEmptyState } from '../../components/AnimatedEmptyState';
import './FocusPage.css';
import './FocusPage.hightech.css';

interface Thread {
  id: string;
  subject: string;
  participants: Array<{ name: string; email: string; role?: string }>;
  classification: 'buyer' | 'vendor' | 'market' | 'lawyer_broker' | 'noise';
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  riskReason?: string;
  lastMessageAt: string;
  draftResponse?: string;
  summary: string;
  propertyId?: string;
}

// Swipe gesture state interface
interface SwipeState {
  threadId: string | null;
  startX: number;
  currentX: number;
  isSwiping: boolean;
}

export const FocusPage: React.FC = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [swipeState, setSwipeState] = useState<SwipeState>({
    threadId: null,
    startX: 0,
    currentX: 0,
    isSwiping: false,
  });
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadFocusThreads();
  }, []);

  const loadFocusThreads = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ threads: Thread[] }>('/api/threads?filter=focus');
      setThreads(response.data.threads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load threads');
      console.error('Failed to load focus threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDraft = (threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const handleSendDraft = async (threadId: string) => {
    try {
      await api.post(`/api/threads/${threadId}/reply`, {
        useDraft: true,
      });
      // Reload threads after sending
      await loadFocusThreads();
    } catch (err) {
      console.error('Failed to send draft:', err);
      alert('Failed to send reply. Please try again.');
    }
  };

  const handleSnooze = async (threadId: string) => {
    try {
      // Snooze for 24 hours by default
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + 24);
      
      await api.post(`/api/threads/${threadId}/snooze`, {
        snoozeUntil: snoozeUntil.toISOString(),
      });
      // Reload threads after snoozing
      await loadFocusThreads();
    } catch (err) {
      console.error('Failed to snooze thread:', err);
      alert('Failed to snooze thread. Please try again.');
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

  const handleTouchEnd = useCallback(async () => {
    if (!swipeState.isSwiping || !swipeState.threadId) return;
    
    const deltaX = swipeState.currentX - swipeState.startX;
    const card = cardRefs.current.get(swipeState.threadId);
    
    if (card) {
      card.classList.remove('swiping');
      card.style.transform = '';
    }
    
    // Threshold for action trigger
    const threshold = 80;
    
    if (deltaX < -threshold) {
      // Swipe left - Snooze action
      await handleSnooze(swipeState.threadId);
    } else if (deltaX > threshold) {
      // Swipe right - View action
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
      <div className="focus-page">
        <div className="container">
          <h1 className="focus-page__title">Focus</h1>
          <div className="focus-page__loading">Loading threads...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="focus-page">
        <div className="container">
          <h1 className="focus-page__title">Focus</h1>
          <div className="focus-page__error">
            <p>{error}</p>
            <button onClick={loadFocusThreads} className="focus-page__retry-btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="focus-page">
      <div className="container">
        <div className="focus-page__header">
          <div>
            <h1 className="focus-page__title">Focus</h1>
            <p className="focus-page__description">
              {threads.length} {threads.length === 1 ? 'thread' : 'threads'} requiring your reply
            </p>
          </div>
          <button onClick={loadFocusThreads} className="focus-page__refresh-btn">
            Refresh
          </button>
        </div>

        {threads.length === 0 ? (
          <AnimatedEmptyState
            message="All caught up!"
            subMessage="No threads need your reply right now. Great job staying on top of your inbox!"
            avatarState="idle"
            avatarSize="lg"
            className="animated-empty-state--success"
          />
        ) : (
          <div className="focus-page__threads">
            {threads.map(thread => (
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
                    {thread.riskLevel !== 'none' && (
                      <span 
                        className="thread-card__risk-badge"
                        style={{ backgroundColor: getRiskColor(thread.riskLevel) }}
                      >
                        {thread.riskLevel.toUpperCase()} RISK
                      </span>
                    )}
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

                <p className="thread-card__summary">{thread.summary}</p>

                {thread.draftResponse && (
                  <div className="thread-card__draft">
                    <button 
                      onClick={() => toggleDraft(thread.id)}
                      className="thread-card__draft-toggle"
                    >
                      {expandedThreads.has(thread.id) ? '▼' : '▶'} Draft Response
                    </button>
                    {expandedThreads.has(thread.id) && (
                      <div className="thread-card__draft-content">
                        {thread.draftResponse}
                      </div>
                    )}
                  </div>
                )}

                <div className="thread-card__actions">
                  {thread.draftResponse && (
                    <button 
                      onClick={() => handleSendDraft(thread.id)}
                      className="thread-card__action thread-card__action--primary"
                    >
                      Send Draft
                    </button>
                  )}
                  <button 
                    onClick={() => window.location.href = `/threads/${thread.id}`}
                    className="thread-card__action"
                  >
                    View & Edit
                  </button>
                  <button 
                    onClick={() => handleSnooze(thread.id)}
                    className="thread-card__action"
                  >
                    Snooze
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
