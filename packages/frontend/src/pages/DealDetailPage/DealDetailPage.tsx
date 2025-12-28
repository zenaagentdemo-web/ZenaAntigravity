import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { STAGE_LABELS } from '../../components/DealFlow/types';
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
  // Phase 2 fields
  pipelineType?: 'buyer' | 'seller';
  saleMethod?: string;
  dealValue?: number;
  estimatedCommission?: number;
  conditions?: DealCondition[];
  settlementDate?: string;
  auctionDate?: string;
  tenderCloseDate?: string;
  stageEnteredAt?: string;
  lastContactAt?: string;
}

interface DealCondition {
  id: string;
  type: string;
  label: string;
  dueDate: string;
  status: 'pending' | 'satisfied' | 'waived' | 'failed';
  satisfiedAt?: string;
}

interface SuggestedAction {
  type: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  context: Record<string, unknown>;
}

interface ActionConfig {
  label: string;
  emoji: string;
  description: string;
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
  // Phase 2 state
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [actionConfigs, setActionConfigs] = useState<Record<string, ActionConfig>>({});
  const [updatingCondition, setUpdatingCondition] = useState<string | null>(null);

  const fetchDealDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/deals/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
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
  }, [id]);

  // Fetch Zena suggestions
  const fetchSuggestions = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/zena-actions/deal/${id}/pending`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSuggestedActions(data.suggestedActions || []);
        setActionConfigs(data.actionConfigs || {});
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  }, [id]);

  useEffect(() => {
    fetchDealDetails();
  }, [fetchDealDetails]);

  useEffect(() => {
    if (deal) {
      fetchSuggestions();
    }
  }, [deal, fetchSuggestions]);

  // Update condition status
  const handleConditionUpdate = async (conditionId: string, newStatus: 'satisfied' | 'waived') => {
    if (!deal?.conditions) return;

    setUpdatingCondition(conditionId);
    try {
      const updatedConditions = deal.conditions.map(c =>
        c.id === conditionId
          ? { ...c, status: newStatus, satisfiedAt: new Date().toISOString() }
          : c
      );

      const response = await fetch(`/api/deals/${id}/conditions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ conditions: updatedConditions }),
      });

      if (response.ok) {
        setDeal(prev => prev ? { ...prev, conditions: updatedConditions } : null);
      }
    } catch (err) {
      console.error('Error updating condition:', err);
    } finally {
      setUpdatingCondition(null);
    }
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Get days remaining for condition
  const getDaysRemaining = (dueDate: string): number => {
    const now = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
    return STAGE_LABELS[stage] || stage.replace(/_/g, ' ');
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

        {/* Next Action & Zena Insights */}
        {(deal.nextAction || suggestedActions.length > 0) && (
          <div className="deal-detail-page__premium-action-zone">
            <h3 className="deal-detail-page__section-title">Strategic Next Steps</h3>
            <div className="deal-detail-page__holographic-card">
              {deal.nextAction && (
                <div className="deal-detail-page__action-item">
                  <div className="deal-detail-page__action-meta">Manual Protocol</div>
                  <div className="deal-detail-page__action-text">{deal.nextAction.replace(/_/g, ' ')}</div>
                  <div className="deal-detail-page__action-owner">
                    Managed by: {deal.nextActionOwner === 'agent' ? 'You' : 'Other Party'}
                  </div>
                </div>
              )}

              {suggestedActions.map((action, index) => {
                const config = actionConfigs[action.type];
                if (!config) return null;
                return (
                  <div key={`zena-${index}`} className={`deal-detail-page__action-item deal-detail-page__action-item--zena deal-detail-page__action-item--${action.priority}`}>
                    <div className="deal-detail-page__action-meta">
                      <span className="deal-detail-page__zena-tag">ZENA RECOMMENDATION</span>
                      <span className="deal-detail-page__priority-dot"></span>
                    </div>
                    <div className="deal-detail-page__action-header">
                      <span className="deal-detail-page__action-emoji">{config.emoji}</span>
                      <div className="deal-detail-page__action-title">{config.label}</div>
                    </div>
                    <div className="deal-detail-page__action-reason">{action.reason}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Deal Value & Commission */}
      {(deal.dealValue || deal.estimatedCommission) && (
        <div className="deal-detail-page__financials">
          <h3 className="deal-detail-page__section-title">Financials</h3>
          <div className="deal-detail-page__financials-row">
            {deal.dealValue && (
              <div className="deal-detail-page__financial-item">
                <span className="deal-detail-page__financial-label">Deal Value</span>
                <span className="deal-detail-page__financial-value">{formatCurrency(deal.dealValue)}</span>
              </div>
            )}
            {deal.estimatedCommission && (
              <div className="deal-detail-page__financial-item">
                <span className="deal-detail-page__financial-label">Est. Commission</span>
                <span className="deal-detail-page__financial-value deal-detail-page__financial-value--commission">
                  {formatCurrency(deal.estimatedCommission)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conditions Checklist */}
      {deal.conditions && deal.conditions.length > 0 && (
        <div className="deal-detail-page__conditions">
          <h3 className="deal-detail-page__section-title">Conditions</h3>
          <div className="deal-detail-page__conditions-list">
            {deal.conditions.map((condition) => {
              const daysRemaining = getDaysRemaining(condition.dueDate);
              const isOverdue = daysRemaining < 0 && condition.status === 'pending';
              const isUrgent = daysRemaining <= 3 && daysRemaining >= 0 && condition.status === 'pending';

              return (
                <div
                  key={condition.id}
                  className={`deal-detail-page__condition ${condition.status !== 'pending' ? 'deal-detail-page__condition--completed' : ''
                    } ${isOverdue ? 'deal-detail-page__condition--overdue' : ''} ${isUrgent ? 'deal-detail-page__condition--urgent' : ''
                    }`}
                >
                  <div className="deal-detail-page__condition-header">
                    <span className="deal-detail-page__condition-status">
                      {condition.status === 'satisfied' && '✅'}
                      {condition.status === 'waived' && '↩️'}
                      {condition.status === 'pending' && (isOverdue ? '⚠️' : '⏳')}
                      {condition.status === 'failed' && '❌'}
                    </span>
                    <span className="deal-detail-page__condition-label">{condition.label}</span>
                    <span className="deal-detail-page__condition-due">
                      {condition.status === 'pending' ? (
                        isOverdue
                          ? `${Math.abs(daysRemaining)} days overdue`
                          : daysRemaining === 0
                            ? 'Due today'
                            : `${daysRemaining} days left`
                      ) : (
                        condition.status.charAt(0).toUpperCase() + condition.status.slice(1)
                      )}
                    </span>
                  </div>

                  {condition.status === 'pending' && (
                    <div className="deal-detail-page__condition-actions">
                      <button
                        className="deal-detail-page__condition-btn deal-detail-page__condition-btn--satisfy"
                        onClick={() => handleConditionUpdate(condition.id, 'satisfied')}
                        disabled={updatingCondition === condition.id}
                      >
                        {updatingCondition === condition.id ? '...' : '✓ Satisfied'}
                      </button>
                      <button
                        className="deal-detail-page__condition-btn deal-detail-page__condition-btn--waive"
                        onClick={() => handleConditionUpdate(condition.id, 'waived')}
                        disabled={updatingCondition === condition.id}
                      >
                        Waive
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}


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
                className={`deal-detail-page__task ${task.status === 'completed' ? 'deal-detail-page__task--completed' : ''
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
                    {event.summary.replace(/_/g, ' ')}
                  </div>
                  {event.content && (
                    <div className="deal-detail-page__timeline-details">
                      {event.content.replace(/_/g, ' ')}
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
