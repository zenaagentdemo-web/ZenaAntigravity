import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/apiClient';
import './ContactDetailPage.css';

interface Contact {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  role: 'buyer' | 'vendor' | 'market' | 'other';
  dealIds: string[];
  relationshipNotes: RelationshipNote[];
  createdAt: string;
  updatedAt: string;
}

interface RelationshipNote {
  id: string;
  content: string;
  source: 'email' | 'voice_note' | 'manual';
  createdAt: string;
}

interface Deal {
  id: string;
  stage: string;
  propertyId?: string;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  nextAction?: string;
  summary: string;
}

interface TimelineEvent {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'task' | 'note' | 'voice_note';
  summary: string;
  content?: string;
  timestamp: string;
}

export const ContactDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (id) {
      loadContactData();
    }
  }, [id]);

  const loadContactData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load contact details
      const contactResponse = await api.get<Contact>(`/api/contacts/${id}`);
      setContact(contactResponse.data);

      // Load associated deals
      if (contactResponse.data.dealIds.length > 0) {
        const dealsPromises = contactResponse.data.dealIds.map(dealId =>
          api.get<Deal>(`/api/deals/${dealId}`)
        );
        const dealsResponses = await Promise.all(dealsPromises);
        setDeals(dealsResponses.map(r => r.data));
      }

      // Load timeline
      const timelineResponse = await api.get<TimelineEvent[] | { events: TimelineEvent[] }>(
        `/api/timeline?entityType=contact&entityId=${id}`
      );
      const timelineData = Array.isArray(timelineResponse.data)
        ? timelineResponse.data
        : (timelineResponse.data as any).events || [];
      setTimeline(timelineData);
    } catch (err) {
      console.error('Failed to load contact data:', err);
      setError('Failed to load contact details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim() || !id) return;

    try {
      setAddingNote(true);
      await api.post(`/api/contacts/${id}/notes`, {
        content: noteContent,
        source: 'manual',
      });

      // Reload contact data to get updated notes
      await loadContactData();
      setNoteContent('');
      setShowNoteForm(false);
    } catch (err) {
      console.error('Failed to add note:', err);
      alert('Failed to add note. Please try again.');
    } finally {
      setAddingNote(false);
    }
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      buyer: 'Buyer',
      vendor: 'Vendor',
      market: 'Market Contact',
      other: 'Other',
    };
    return labels[role] || role;
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
      <div className="contact-detail-page">
        <div className="container">
          <div className="contact-detail-page__loading">Loading contact details...</div>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="contact-detail-page">
        <div className="container">
          <div className="contact-detail-page__error">
            {error || 'Contact not found'}
          </div>
          <button
            className="contact-detail-page__back-button"
            onClick={() => navigate('/contacts')}
          >
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-detail-page">
      <div className="container">
        {/* Header */}
        <div className="contact-detail-page__header">
          <button
            className="contact-detail-page__back"
            onClick={() => navigate('/contacts')}
            aria-label="Back to contacts"
          >
            ← Back
          </button>
          <h1 className="contact-detail-page__name">{contact.name}</h1>
          <span className="contact-detail-page__role">{getRoleLabel(contact.role)}</span>
        </div>

        {/* Contact Information */}
        <section className="contact-detail-page__section">
          <h2 className="contact-detail-page__section-title">Contact Information</h2>
          <div className="contact-detail-page__info-grid">
            {contact.emails.length > 0 && (
              <div className="contact-detail-page__info-item">
                <div className="contact-detail-page__info-label">Email</div>
                {contact.emails.map((email, index) => (
                  <div key={index} className="contact-detail-page__info-value">
                    <a href={`mailto:${email}`} className="contact-detail-page__link">
                      {email}
                    </a>
                  </div>
                ))}
              </div>
            )}
            {contact.phones.length > 0 && (
              <div className="contact-detail-page__info-item">
                <div className="contact-detail-page__info-label">Phone</div>
                {contact.phones.map((phone, index) => (
                  <div key={index} className="contact-detail-page__info-value">
                    <a href={`tel:${phone}`} className="contact-detail-page__link">
                      {phone}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="contact-detail-page__section">
          <div className="contact-detail-page__actions">
            {contact.emails.length > 0 && (
              <button
                className="contact-detail-page__action-button"
                onClick={() => handleEmail(contact.emails[0])}
              >
                📧 Email
              </button>
            )}
            {contact.phones.length > 0 && (
              <button
                className="contact-detail-page__action-button"
                onClick={() => handleCall(contact.phones[0])}
              >
                📞 Call
              </button>
            )}
            <button
              className="contact-detail-page__action-button"
              onClick={() => setShowNoteForm(!showNoteForm)}
            >
              📝 Add Note
            </button>
          </div>

          {showNoteForm && (
            <div className="contact-detail-page__note-form">
              <textarea
                className="contact-detail-page__note-textarea"
                placeholder="Add a relationship note..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
              />
              <div className="contact-detail-page__note-actions">
                <button
                  className="contact-detail-page__note-cancel"
                  onClick={() => {
                    setShowNoteForm(false);
                    setNoteContent('');
                  }}
                  disabled={addingNote}
                >
                  Cancel
                </button>
                <button
                  className="contact-detail-page__note-save"
                  onClick={handleAddNote}
                  disabled={!noteContent.trim() || addingNote}
                >
                  {addingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Active Deals */}
        {deals.length > 0 && (
          <section className="contact-detail-page__section">
            <h2 className="contact-detail-page__section-title">Active Deals</h2>
            <div className="contact-detail-page__deals">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="contact-detail-page__deal-card"
                  onClick={() => navigate(`/deals/${deal.id}`)}
                >
                  <div className="contact-detail-page__deal-header">
                    <span className="contact-detail-page__deal-stage">{deal.stage}</span>
                    <span
                      className="contact-detail-page__deal-risk"
                      style={{ color: getRiskColor(deal.riskLevel) }}
                    >
                      {deal.riskLevel !== 'none' && `⚠️ ${deal.riskLevel}`}
                    </span>
                  </div>
                  <p className="contact-detail-page__deal-summary">{deal.summary}</p>
                  {deal.nextAction && (
                    <p className="contact-detail-page__deal-action">
                      Next: {deal.nextAction}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Relationship Notes */}
        {contact.relationshipNotes.length > 0 && (
          <section className="contact-detail-page__section">
            <h2 className="contact-detail-page__section-title">Relationship Notes</h2>
            <div className="contact-detail-page__notes">
              {contact.relationshipNotes.map((note) => (
                <div key={note.id} className="contact-detail-page__note">
                  <div className="contact-detail-page__note-header">
                    <span className="contact-detail-page__note-source">
                      {note.source === 'manual' ? '📝' : note.source === 'email' ? '📧' : '🎤'}
                    </span>
                    <span className="contact-detail-page__note-date">
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  <p className="contact-detail-page__note-content">{note.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Communication Timeline */}
        {timeline.length > 0 && (
          <section className="contact-detail-page__section">
            <h2 className="contact-detail-page__section-title">Communication Timeline</h2>
            <div className="contact-detail-page__timeline">
              {timeline.map((event) => (
                <div key={event.id} className="contact-detail-page__timeline-event">
                  <div className="contact-detail-page__timeline-marker">
                    <span className="contact-detail-page__timeline-icon">
                      {event.type === 'email' && '📧'}
                      {event.type === 'call' && '📞'}
                      {event.type === 'meeting' && '📅'}
                      {event.type === 'task' && '✓'}
                      {event.type === 'note' && '📝'}
                      {event.type === 'voice_note' && '🎤'}
                    </span>
                  </div>
                  <div className="contact-detail-page__timeline-content">
                    <div className="contact-detail-page__timeline-header">
                      <span className="contact-detail-page__timeline-type">{event.type}</span>
                      <span className="contact-detail-page__timeline-date">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                    <p className="contact-detail-page__timeline-summary">{event.summary}</p>
                    {event.content && (
                      <p className="contact-detail-page__timeline-detail">{event.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
