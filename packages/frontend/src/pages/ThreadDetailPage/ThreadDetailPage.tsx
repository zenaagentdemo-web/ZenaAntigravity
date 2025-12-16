import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/apiClient';
import './ThreadDetailPage.css';

interface Participant {
  name: string;
  email: string;
  role?: string;
}

interface Property {
  id: string;
  address: string;
}

interface Deal {
  id: string;
  stage: string;
  riskLevel: string;
}

interface Message {
  id: string;
  externalId: string;
  from: { name: string; email: string };
  to: Array<{ name: string; email: string }>;
  cc: Array<{ name: string; email: string }>;
  subject: string;
  body: string;
  bodyHtml?: string;
  sentAt: string;
  receivedAt: string;
  isFromUser: boolean;
}

interface Thread {
  id: string;
  subject: string;
  participants: Participant[];
  classification: string;
  category: string;
  riskLevel: string;
  riskReason?: string;
  nextAction?: string;
  nextActionOwner: string;
  lastMessageAt: string;
  lastReplyAt?: string;
  summary: string;
  draftResponse?: string;
  property?: Property;
  deal?: Deal;
  createdAt: string;
  updatedAt: string;
}

export const ThreadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showFullThread, setShowFullThread] = useState(false);

  useEffect(() => {
    if (id) {
      loadThread();
    }
  }, [id]);

  const loadThread = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ thread: Thread }>(`/api/threads/${id}`);
      setThread(response.data.thread);
      if (response.data.thread.draftResponse) {
        setReplyBody(response.data.thread.draftResponse);
      }
    } catch (err) {
      console.error('Failed to load thread:', err);
      setError('Failed to load thread details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!id) return;
    
    try {
      setLoadingMessages(true);
      const response = await api.get<{ messages: Message[] }>(`/api/threads/${id}/messages`);
      setMessages(response.data.messages);
      setShowFullThread(true);
    } catch (err) {
      console.error('Failed to load messages:', err);
      alert('Failed to load full email thread. Please try again.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyBody.trim() || !id) return;

    try {
      setSending(true);
      await api.post(`/api/threads/${id}/reply`, {
        body: replyBody,
        useDraft: false,
      });
      // Navigate back to focus page after sending
      navigate('/focus');
    } catch (err) {
      console.error('Failed to send reply:', err);
      alert('Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleUseDraft = () => {
    if (thread?.draftResponse) {
      setReplyBody(thread.draftResponse);
    }
  };

  const getRiskColor = (riskLevel: string): string => {
    const colors: Record<string, string> = {
      none: 'var(--color-risk-none)',
      low: 'var(--color-risk-low)',
      medium: 'var(--color-risk-medium)',
      high: 'var(--color-risk-high)',
    };
    return colors[riskLevel] || 'var(--color-text-secondary)';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="thread-detail-page">
        <div className="container">
          <div className="thread-detail-page__loading">Loading thread...</div>
        </div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="thread-detail-page">
        <div className="container">
          <div className="thread-detail-page__error">
            {error || 'Thread not found'}
          </div>
          <button
            className="thread-detail-page__back-button"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="thread-detail-page">
      <div className="container">
        {/* Header */}
        <div className="thread-detail-page__header">
          <button
            className="thread-detail-page__back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            ← Back
          </button>
          <h1 className="thread-detail-page__subject">{thread.subject}</h1>
        </div>

        {/* Thread Info */}
        <section className="thread-detail-page__section">
          <div className="thread-detail-page__meta">
            <div className="thread-detail-page__meta-row">
              {thread.riskLevel !== 'none' && (
                <span
                  className="thread-detail-page__risk-badge"
                  style={{ backgroundColor: getRiskColor(thread.riskLevel) }}
                >
                  {thread.riskLevel.toUpperCase()} RISK
                </span>
              )}
              <span className="thread-detail-page__classification">
                {thread.classification.replace('_', ' ')}
              </span>
              <span className="thread-detail-page__date">
                {formatDate(thread.lastMessageAt)}
              </span>
            </div>
          </div>

          {thread.riskReason && (
            <div className="thread-detail-page__risk-reason">
              ⚠️ {thread.riskReason}
            </div>
          )}

          <div className="thread-detail-page__participants">
            <h3>Participants</h3>
            {thread.participants.map((p, idx) => (
              <div key={idx} className="thread-detail-page__participant">
                <span className="thread-detail-page__participant-name">
                  {p.name || p.email}
                </span>
                {p.role && (
                  <span className="thread-detail-page__participant-role">
                    {p.role}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="thread-detail-page__summary">
            <h3>AI Summary</h3>
            <p>{thread.summary}</p>
            
            {!showFullThread && (
              <button
                className="thread-detail-page__show-messages-button"
                onClick={loadMessages}
                disabled={loadingMessages}
              >
                {loadingMessages ? 'Loading...' : '📧 View Full Email Thread'}
              </button>
            )}
          </div>

          {showFullThread && messages.length > 0 && (
            <div className="thread-detail-page__messages">
              <h3>Full Email Thread ({messages.length} messages)</h3>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`thread-detail-page__message ${
                    message.isFromUser ? 'thread-detail-page__message--from-user' : ''
                  }`}
                >
                  <div className="thread-detail-page__message-header">
                    <div className="thread-detail-page__message-from">
                      <strong>{message.from.name}</strong>
                      <span className="thread-detail-page__message-email">
                        {message.from.email}
                      </span>
                    </div>
                    <div className="thread-detail-page__message-date">
                      {formatDate(message.sentAt)}
                    </div>
                  </div>
                  
                  {message.to.length > 0 && (
                    <div className="thread-detail-page__message-recipients">
                      <span className="thread-detail-page__message-label">To:</span>
                      {message.to.map((recipient, idx) => (
                        <span key={idx} className="thread-detail-page__message-recipient">
                          {recipient.name} &lt;{recipient.email}&gt;
                          {idx < message.to.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {message.cc.length > 0 && (
                    <div className="thread-detail-page__message-recipients">
                      <span className="thread-detail-page__message-label">Cc:</span>
                      {message.cc.map((recipient, idx) => (
                        <span key={idx} className="thread-detail-page__message-recipient">
                          {recipient.name} &lt;{recipient.email}&gt;
                          {idx < message.cc.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="thread-detail-page__message-body">
                    {message.bodyHtml ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                      />
                    ) : (
                      <pre>{message.body}</pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showFullThread && messages.length === 0 && (
            <div className="thread-detail-page__no-messages">
              <p>No full email messages available for this thread.</p>
              <p>
                <small>
                  This may be because the thread was created before message storage was enabled,
                  or the emails haven't been synced yet.
                </small>
              </p>
            </div>
          )}

          {thread.nextAction && (
            <div className="thread-detail-page__next-action">
              <h3>Next Action</h3>
              <p>{thread.nextAction}</p>
              <span className="thread-detail-page__action-owner">
                Owner: {thread.nextActionOwner === 'agent' ? 'You' : 'Other Party'}
              </span>
            </div>
          )}
        </section>

        {/* Linked Entities */}
        {(thread.property || thread.deal) && (
          <section className="thread-detail-page__section">
            <h2 className="thread-detail-page__section-title">Linked Entities</h2>
            {thread.property && (
              <div
                className="thread-detail-page__entity-card"
                onClick={() => navigate(`/properties/${thread.property!.id}`)}
              >
                <span className="thread-detail-page__entity-label">Property:</span>
                <span className="thread-detail-page__entity-value">
                  {thread.property.address}
                </span>
              </div>
            )}
            {thread.deal && (
              <div
                className="thread-detail-page__entity-card"
                onClick={() => navigate(`/deals/${thread.deal!.id}`)}
              >
                <span className="thread-detail-page__entity-label">Deal:</span>
                <span className="thread-detail-page__entity-value">
                  {thread.deal.stage}
                </span>
              </div>
            )}
          </section>
        )}

        {/* Reply Section */}
        {thread.category === 'focus' && (
          <section className="thread-detail-page__section">
            <h2 className="thread-detail-page__section-title">Reply</h2>
            
            {thread.draftResponse && (
              <button
                className="thread-detail-page__use-draft-button"
                onClick={handleUseDraft}
              >
                Use AI Draft
              </button>
            )}

            <textarea
              className="thread-detail-page__reply-textarea"
              placeholder="Type your reply..."
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={10}
            />

            <div className="thread-detail-page__reply-actions">
              <button
                className="thread-detail-page__send-button"
                onClick={handleSendReply}
                disabled={!replyBody.trim() || sending}
              >
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
              <button
                className="thread-detail-page__cancel-button"
                onClick={() => navigate(-1)}
                disabled={sending}
              >
                Cancel
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
