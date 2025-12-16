import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './DealDetailPage.css';

interface Participant {
  name: string;
  email: string;
  role?: string;
}

interface Contact {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  role: string;
}

interface Property {
  id: string;
  address: string;
  milestones?: Array<{
    id: string;
    type: string;
    date: string;
    notes?: string;
  }>;
}

interface Thread {
  id: string;
  subject: string;
  participants: Participant[];
  lastMessageAt: string;
  category: string;
  riskLevel: string;
  summary: string;
}

interface TimelineEvent {
  id: string;
  type: string;
  summary: string;
  content?: string;
  timestamp: string;
}

interface Task {
  id: string;
  label: string;
  status: string;
  dueDate?: string;
}

interface Deal {
  id: string;
  stage: string;
  riskLevel: string;
  riskFlags: string[];
  nextAction?: string;
  nextActionOwner: string;
  summary: string;
  property?: Property;
  contacts: Contact[];
  threads?: Thread[];
}

interface DealDetailResponse {
  deal: Deal;
  timeline: TimelineEvent[];
  tasks: Task[];
}

export const DealDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    fetchDealDetails();
  }, [id]);

  const fetchDealDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/deals/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deal details');
      }

      const data: DealDetailResponse | Deal = await response.json();
      
      // Handle both wrapped and unwrapped responses
      if ('deal' in data) {
        setDeal(data.deal);
        setTimeline(data.timeline || []);
        setTasks(data.tasks || []);
      } else {
        setDeal(data as Deal);
        setTimeline([]);
        setTasks([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'high':
        return 'var(--color-error)';
      case 'medium':
        return 'var(--color-warning)';
      case 'low':
        return 'var(--color-info)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  const getStageLabel = (stage: string): string => {
    const stageLabels: Record<string, string> = {
      lead: 'Lead',
      qualified: 'Qualified',
      viewing: 'Viewing',
      offer: 'Offer',
      conditional: 'Conditional',
      pre_settlement: 'Pre-Settlement',
      sold: 'Sold',
      nurture: 'Nurture',
    };
    return stageLabels[stage] || stage;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="deal-detail-page">
        <div className="deal-detail-page__loading">Loading deal details...</div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="deal-detail-page">
        <div className="deal-detail-page__error">
          {error || 'Deal not found'}
        </div>
      </div>
    );
  }

  const latestThread = deal.threads && deal.threads.length > 0 ? deal.threads[0] : null;

  return (
    <div className="deal-detail-page">
      {/* Header */}
      <div className="deal-detail-page__header">
        <button
          className="deal-detail-page__back-button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ← Back
        </button>
        <h1 className="deal-detail-page__title">Deal Details</h1>
      </div>

      {/* Deal Summary Card */}
      <div className="deal-detail-page__summary-card">
        {/* Property */}
        {deal.property && (
          <div className="deal-detail-page__property">
            <h2 className="deal-detail-page__property-address">
              {deal.property.address}
            </h2>
          </div>
        )}

        {/* Stage and Risk */}
        <div className="deal-detail-page__status-row">
          <div className="deal-detail-page__stage">
            <span className="deal-detail-page__label">Stage:</span>
            <span className="deal-detail-page__stage-badge">
              {getStageLabel(deal.stage)}
            </span>
          </div>

          {deal.riskLevel !== 'none' && (
            <div className="deal-detail-page__risk">
              <span
                className="deal-detail-page__risk-indicator"
                style={{ backgroundColor: getRiskColor(deal.riskLevel) }}
              >
                {deal.riskLevel.toUpperCase()} RISK
              </span>
            </div>
          )}
        </div>

        {/* Risk Flags */}
        {deal.riskFlags && deal.riskFlags.length > 0 && (
          <div className="deal-detail-page__risk-flags">
            {deal.riskFlags.map((flag, index) => (
              <div key={index} className="deal-detail-page__risk-flag">
                ⚠️ {flag}
              </div>
            ))}
          </div>
        )}

        {/* Participants */}
        {deal.contacts && deal.contacts.length > 0 && (
          <div className="deal-detail-page__participants">
            <h3 className="deal-detail-page__section-title">Participants</h3>
            <div className="deal-detail-page__contacts-list">
              {deal.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="deal-detail-page__contact"
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  <div className="deal-detail-page__contact-name">
                    {contact.name}
                  </div>
                  <div className="deal-detail-page__contact-role">
                    {contact.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Action */}
        {deal.nextAction && (
          <div className="deal-detail-page__next-action">
            <h3 className="deal-detail-page__section-title">Next Action</h3>
            <div className="deal-detail-page__action-content">
              <div className="deal-detail-page__action-text">
                {deal.nextAction}
              </div>
              <div className="deal-detail-page__action-owner">
                Owner: {deal.nextActionOwner === 'agent' ? 'You' : 'Other Party'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Latest Email Preview */}
      {latestThread && (
        <div className="deal-detail-page__latest-email">
          <h3 className="deal-detail-page__section-title">Latest Email</h3>
          <div className="deal-detail-page__email-card">
            <div className="deal-detail-page__email-subject">
              {latestThread.subject}
            </div>
            <div className="deal-detail-page__email-meta">
              {formatDate(latestThread.lastMessageAt)} at {formatTime(latestThread.lastMessageAt)}
            </div>
            <div className="deal-detail-page__email-summary">
              {latestThread.summary}
            </div>
            <button
              className="deal-detail-page__view-thread-button"
              onClick={() => {
                // TODO: Navigate to thread view
                console.log('View thread:', latestThread.id);
              }}
            >
              View Full Thread
            </button>
          </div>
        </div>
      )}

      {/* Tasks */}
      {tasks && tasks.length > 0 && (
        <div className="deal-detail-page__tasks">
          <h3 className="deal-detail-page__section-title">Tasks</h3>
          <div className="deal-detail-page__tasks-list">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`deal-detail-page__task ${
                  task.status === 'completed' ? 'deal-detail-page__task--completed' : ''
                }`}
              >
                <div className="deal-detail-page__task-label">{task.label}</div>
                {task.dueDate && (
                  <div className="deal-detail-page__task-due">
                    Due: {formatDate(task.dueDate)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Toggle */}
      <div className="deal-detail-page__timeline-section">
        <button
          className="deal-detail-page__timeline-toggle"
          onClick={() => setShowTimeline(!showTimeline)}
        >
          {showTimeline ? '▼' : '▶'} Timeline ({timeline.length} events)
        </button>

        {showTimeline && (
          <div className="deal-detail-page__timeline">
            {timeline.map((event) => (
              <div key={event.id} className="deal-detail-page__timeline-event">
                <div className="deal-detail-page__timeline-marker" />
                <div className="deal-detail-page__timeline-content">
                  <div className="deal-detail-page__timeline-type">
                    {event.type.toUpperCase()}
                  </div>
                  <div className="deal-detail-page__timeline-summary">
                    {event.summary}
                  </div>
                  {event.content && (
                    <div className="deal-detail-page__timeline-details">
                      {event.content}
                    </div>
                  )}
                  <div className="deal-detail-page__timeline-time">
                    {formatDate(event.timestamp)} at {formatTime(event.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
