import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/apiClient';
import './PropertyDetailPage.css';

interface Property {
  id: string;
  address: string;
  type?: 'residential' | 'commercial' | 'land';
  status?: 'active' | 'under_contract' | 'sold' | 'withdrawn';
  listingPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  landSize?: number;
  dealId?: string;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}

interface Milestone {
  id: string;
  type: 'listed' | 'first_viewing' | 'offer_received' | 'contract_signed' | 'settlement' | 'custom';
  title: string;
  date: string;
  notes?: string;
}

interface Contact {
  id: string;
  name: string;
  role: 'buyer' | 'vendor' | 'market' | 'other';
  emails: string[];
  phones: string[];
}

interface Deal {
  id: string;
  stage: string;
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

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneNotes, setMilestoneNotes] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);

  useEffect(() => {
    if (id) {
      loadPropertyData();
    }
  }, [id]);

  const loadPropertyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load property details
      const propertyResponse = await api.get<Property>(`/api/properties/${id}`);
      setProperty(propertyResponse.data);

      // Load associated deal
      if (propertyResponse.data.dealId) {
        const dealResponse = await api.get<Deal>(`/api/deals/${propertyResponse.data.dealId}`);
        setDeal(dealResponse.data);
      }

      // Load associated contacts
      const contactsResponse = await api.get<Contact[] | { contacts: Contact[] }>(
        `/api/contacts?propertyId=${id}`
      );
      const contactsData = Array.isArray(contactsResponse.data) 
        ? contactsResponse.data 
        : (contactsResponse.data as any).contacts || [];
      setContacts(contactsData);

      // Load timeline
      const timelineResponse = await api.get<TimelineEvent[] | { events: TimelineEvent[] }>(
        `/api/timeline?entityType=property&entityId=${id}`
      );
      const timelineData = Array.isArray(timelineResponse.data)
        ? timelineResponse.data
        : (timelineResponse.data as any).events || [];
      setTimeline(timelineData);
    } catch (err) {
      console.error('Failed to load property data:', err);
      setError('Failed to load property details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMilestone = async () => {
    if (!milestoneTitle.trim() || !milestoneDate || !id) return;

    try {
      setAddingMilestone(true);
      await api.post(`/api/properties/${id}/milestones`, {
        type: 'custom',
        title: milestoneTitle,
        date: milestoneDate,
        notes: milestoneNotes || undefined,
      });

      // Reload property data to get updated milestones
      await loadPropertyData();
      setMilestoneTitle('');
      setMilestoneDate('');
      setMilestoneNotes('');
      setShowMilestoneForm(false);
    } catch (err) {
      console.error('Failed to add milestone:', err);
      alert('Failed to add milestone. Please try again.');
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleUpdateStage = async () => {
    if (!deal) return;
    // This would open a modal or navigate to deal detail page
    navigate(`/deals/${deal.id}`);
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

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatMilestoneDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="property-detail-page">
        <div className="container">
          <div className="property-detail-page__loading">Loading property details...</div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="property-detail-page">
        <div className="container">
          <div className="property-detail-page__error">
            {error || 'Property not found'}
          </div>
          <button
            className="property-detail-page__back-button"
            onClick={() => navigate('/properties')}
          >
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="property-detail-page">
      <div className="container">
        {/* Header */}
        <div className="property-detail-page__header">
          <button
            className="property-detail-page__back"
            onClick={() => navigate('/properties')}
            aria-label="Back to properties"
          >
            ← Back
          </button>
          <h1 className="property-detail-page__address">{property.address}</h1>
          {property.status && (
            <span className={`property-detail-page__status property-detail-page__status--${property.status}`}>
              {property.status.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* Property Details */}
        <section className="property-detail-page__section">
          <h2 className="property-detail-page__section-title">Property Details</h2>
          <div className="property-detail-page__details-grid">
            {property.listingPrice && (
              <div className="property-detail-page__detail-item">
                <div className="property-detail-page__detail-label">Price</div>
                <div className="property-detail-page__detail-value property-detail-page__detail-value--price">
                  {formatPrice(property.listingPrice)}
                </div>
              </div>
            )}
            {property.type && (
              <div className="property-detail-page__detail-item">
                <div className="property-detail-page__detail-label">Type</div>
                <div className="property-detail-page__detail-value">
                  {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                </div>
              </div>
            )}
            {property.bedrooms !== undefined && (
              <div className="property-detail-page__detail-item">
                <div className="property-detail-page__detail-label">Bedrooms</div>
                <div className="property-detail-page__detail-value">
                  {property.bedrooms} 🛏️
                </div>
              </div>
            )}
            {property.bathrooms !== undefined && (
              <div className="property-detail-page__detail-item">
                <div className="property-detail-page__detail-label">Bathrooms</div>
                <div className="property-detail-page__detail-value">
                  {property.bathrooms} 🚿
                </div>
              </div>
            )}
            {property.landSize !== undefined && (
              <div className="property-detail-page__detail-item">
                <div className="property-detail-page__detail-label">Land Size</div>
                <div className="property-detail-page__detail-value">
                  {property.landSize} m²
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Deal Status */}
        {deal && (
          <section className="property-detail-page__section">
            <h2 className="property-detail-page__section-title">Deal Status</h2>
            <div
              className="property-detail-page__deal-card"
              onClick={handleUpdateStage}
            >
              <div className="property-detail-page__deal-header">
                <span className="property-detail-page__deal-stage">{deal.stage}</span>
                <span
                  className="property-detail-page__deal-risk"
                  style={{ color: getRiskColor(deal.riskLevel) }}
                >
                  {deal.riskLevel !== 'none' && `⚠️ ${deal.riskLevel}`}
                </span>
              </div>
              <p className="property-detail-page__deal-summary">{deal.summary}</p>
              {deal.nextAction && (
                <p className="property-detail-page__deal-action">
                  Next: {deal.nextAction}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Associated Contacts */}
        {contacts.length > 0 && (
          <section className="property-detail-page__section">
            <h2 className="property-detail-page__section-title">Associated Contacts</h2>
            <div className="property-detail-page__contacts">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="property-detail-page__contact-card"
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  <div className="property-detail-page__contact-header">
                    <span className="property-detail-page__contact-name">{contact.name}</span>
                    <span className="property-detail-page__contact-role">
                      {getRoleLabel(contact.role)}
                    </span>
                  </div>
                  {contact.emails.length > 0 && (
                    <p className="property-detail-page__contact-email">{contact.emails[0]}</p>
                  )}
                  {contact.phones.length > 0 && (
                    <p className="property-detail-page__contact-phone">{contact.phones[0]}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Campaign Milestones */}
        <section className="property-detail-page__section">
          <div className="property-detail-page__section-header">
            <h2 className="property-detail-page__section-title">Campaign Milestones</h2>
            <button
              className="property-detail-page__add-milestone-button"
              onClick={() => setShowMilestoneForm(!showMilestoneForm)}
            >
              + Add Milestone
            </button>
          </div>

          {showMilestoneForm && (
            <div className="property-detail-page__milestone-form">
              <input
                type="text"
                className="property-detail-page__milestone-input"
                placeholder="Milestone title"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
              />
              <input
                type="date"
                className="property-detail-page__milestone-input"
                value={milestoneDate}
                onChange={(e) => setMilestoneDate(e.target.value)}
              />
              <textarea
                className="property-detail-page__milestone-textarea"
                placeholder="Notes (optional)"
                value={milestoneNotes}
                onChange={(e) => setMilestoneNotes(e.target.value)}
                rows={3}
              />
              <div className="property-detail-page__milestone-actions">
                <button
                  className="property-detail-page__milestone-cancel"
                  onClick={() => {
                    setShowMilestoneForm(false);
                    setMilestoneTitle('');
                    setMilestoneDate('');
                    setMilestoneNotes('');
                  }}
                  disabled={addingMilestone}
                >
                  Cancel
                </button>
                <button
                  className="property-detail-page__milestone-save"
                  onClick={handleAddMilestone}
                  disabled={!milestoneTitle.trim() || !milestoneDate || addingMilestone}
                >
                  {addingMilestone ? 'Saving...' : 'Save Milestone'}
                </button>
              </div>
            </div>
          )}

          {property.milestones.length > 0 ? (
            <div className="property-detail-page__milestones">
              {property.milestones.map((milestone) => (
                <div key={milestone.id} className="property-detail-page__milestone">
                  <div className="property-detail-page__milestone-header">
                    <span className="property-detail-page__milestone-title">
                      {milestone.title}
                    </span>
                    <span className="property-detail-page__milestone-date">
                      {formatMilestoneDate(milestone.date)}
                    </span>
                  </div>
                  {milestone.notes && (
                    <p className="property-detail-page__milestone-notes">{milestone.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="property-detail-page__empty-state">
              No milestones yet. Add one to track campaign progress.
            </p>
          )}
        </section>

        {/* Activity Timeline */}
        {timeline.length > 0 && (
          <section className="property-detail-page__section">
            <h2 className="property-detail-page__section-title">Activity Timeline</h2>
            <div className="property-detail-page__timeline">
              {timeline.map((event) => (
                <div key={event.id} className="property-detail-page__timeline-event">
                  <div className="property-detail-page__timeline-marker">
                    <span className="property-detail-page__timeline-icon">
                      {event.type === 'email' && '📧'}
                      {event.type === 'call' && '📞'}
                      {event.type === 'meeting' && '📅'}
                      {event.type === 'task' && '✓'}
                      {event.type === 'note' && '📝'}
                      {event.type === 'voice_note' && '🎤'}
                    </span>
                  </div>
                  <div className="property-detail-page__timeline-content">
                    <div className="property-detail-page__timeline-header">
                      <span className="property-detail-page__timeline-type">{event.type}</span>
                      <span className="property-detail-page__timeline-date">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                    <p className="property-detail-page__timeline-summary">{event.summary}</p>
                    {event.content && (
                      <p className="property-detail-page__timeline-detail">{event.content}</p>
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
