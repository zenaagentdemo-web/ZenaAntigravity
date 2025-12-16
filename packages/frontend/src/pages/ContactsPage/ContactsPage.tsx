import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/apiClient';
import './ContactsPage.css';

interface Contact {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  role: 'buyer' | 'vendor' | 'market' | 'other';
  createdAt: string;
  updatedAt: string;
}

export const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<Contact[] | { contacts: Contact[] }>('/api/contacts');
      const contactsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data as any).contacts || [];
      setContacts(contactsData);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setError('Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
    }
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

  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      buyer: '#4CAF50',
      vendor: '#2196F3',
      market: '#FF9800',
      other: '#9E9E9E',
    };
    return colors[role] || '#9E9E9E';
  };

  const filteredContacts = filterRole === 'all' 
    ? contacts 
    : contacts.filter(c => c.role === filterRole);

  if (loading) {
    return (
      <div className="contacts-page">
        <div className="container">
          <h1 className="contacts-page__title">Contacts</h1>
          <div className="contacts-page__loading">Loading contacts...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="contacts-page">
        <div className="container">
          <h1 className="contacts-page__title">Contacts</h1>
          <div className="contacts-page__error">
            <p>{error}</p>
            <button onClick={loadContacts} className="contacts-page__retry-btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contacts-page">
      <div className="container">
        <div className="contacts-page__header">
          <div>
            <h1 className="contacts-page__title">Contacts</h1>
            <p className="contacts-page__description">
              {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
            </p>
          </div>
          <button onClick={loadContacts} className="contacts-page__refresh-btn">
            Refresh
          </button>
        </div>

        <div className="contacts-page__filters">
          <button
            className={`contacts-page__filter ${filterRole === 'all' ? 'contacts-page__filter--active' : ''}`}
            onClick={() => setFilterRole('all')}
          >
            All ({contacts.length})
          </button>
          <button
            className={`contacts-page__filter ${filterRole === 'buyer' ? 'contacts-page__filter--active' : ''}`}
            onClick={() => setFilterRole('buyer')}
          >
            Buyers ({contacts.filter(c => c.role === 'buyer').length})
          </button>
          <button
            className={`contacts-page__filter ${filterRole === 'vendor' ? 'contacts-page__filter--active' : ''}`}
            onClick={() => setFilterRole('vendor')}
          >
            Vendors ({contacts.filter(c => c.role === 'vendor').length})
          </button>
          <button
            className={`contacts-page__filter ${filterRole === 'market' ? 'contacts-page__filter--active' : ''}`}
            onClick={() => setFilterRole('market')}
          >
            Market ({contacts.filter(c => c.role === 'market').length})
          </button>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="contacts-page__empty">
            <p>No contacts found.</p>
          </div>
        ) : (
          <div className="contacts-page__list">
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                className="contact-card"
                onClick={() => navigate(`/contacts/${contact.id}`)}
              >
                <div className="contact-card__header">
                  <h3 className="contact-card__name">{contact.name}</h3>
                  <span
                    className="contact-card__role"
                    style={{ backgroundColor: getRoleColor(contact.role) }}
                  >
                    {getRoleLabel(contact.role)}
                  </span>
                </div>

                {contact.emails.length > 0 && (
                  <div className="contact-card__info">
                    <span className="contact-card__icon">📧</span>
                    <span className="contact-card__text">{contact.emails[0]}</span>
                  </div>
                )}

                {contact.phones.length > 0 && (
                  <div className="contact-card__info">
                    <span className="contact-card__icon">📞</span>
                    <span className="contact-card__text">{contact.phones[0]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
