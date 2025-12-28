import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Briefcase,
  Hammer,
  Shield,
  ArrowRight,
  UserCircle,
  LayoutGrid,
  List,
  Plus,
  MessageSquare
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import './ContactsPage.css';

interface Contact {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  role: 'buyer' | 'vendor' | 'market' | 'tradesperson' | 'agent' | 'other';
  createdAt: string;
  updatedAt: string;
}

const ROLE_CONFIG: Record<string, { label: string, color: string, glow: string, bg: string, border: string, icon: React.ReactNode }> = {
  buyer: {
    label: 'Buyer',
    color: '#00D4FF',
    glow: 'rgba(0, 212, 255, 0.5)',
    bg: 'rgba(0, 212, 255, 0.1)',
    border: 'rgba(0, 212, 255, 0.3)',
    icon: <Users size={18} />
  },
  vendor: {
    label: 'Vendor',
    color: '#FF00FF',
    glow: 'rgba(255, 0, 255, 0.5)',
    bg: 'rgba(255, 0, 255, 0.1)',
    border: 'rgba(255, 0, 255, 0.3)',
    icon: <Briefcase size={18} />
  },
  tradesperson: {
    label: 'Trades',
    color: '#FF6B35',
    glow: 'rgba(255, 107, 53, 0.5)',
    bg: 'rgba(255, 107, 53, 0.1)',
    border: 'rgba(255, 107, 53, 0.3)',
    icon: <Hammer size={18} />
  },
  agent: {
    label: 'Agent',
    color: '#8B5CF6',
    glow: 'rgba(139, 92, 246, 0.5)',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.3)',
    icon: <Shield size={18} />
  },
  market: {
    label: 'Market',
    color: '#00FF88',
    glow: 'rgba(0, 255, 136, 0.5)',
    bg: 'rgba(0, 255, 136, 0.1)',
    border: 'rgba(0, 255, 136, 0.3)',
    icon: <UserCircle size={18} />
  },
  other: {
    label: 'General',
    color: '#FFFFFF',
    glow: 'rgba(255, 255, 255, 0.5)',
    bg: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
    icon: <Users size={18} />
  },
};

export const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);
      const response = await api.get<Contact[] | { contacts: Contact[] }>('/api/contacts');
      const contactsData = Array.isArray(response.data)
        ? response.data
        : (response.data as any).contacts || [];
      setContacts(contactsData);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setError('System sync failed. Re-attempting connection...');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadContacts();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesRole = filterRole === 'all' || contact.role === filterRole;
      const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.emails.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesRole && matchesSearch;
    });
  }, [contacts, filterRole, searchQuery]);

  return (
    <div className="contacts-page">
      <AmbientBackground variant="default" showParticles={true} />

      <div className="contacts-page__container">
        <header className="contacts-page__header">
          <div className="contacts-page__title-group">
            <span className="contacts-page__subtitle">Zena Intelligent CRM</span>
            <h1 className="contacts-page__title">Contacts</h1>
          </div>
          <div className="contacts-page__actions">
            <div className="contacts-page__view-toggle">
              <button
                className={`contacts-page__toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                className={`contacts-page__toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>
            <button
              className="contacts-page__add-btn"
              onClick={() => console.log('Add contact clicked')}
            >
              <Plus size={18} />
              <span>Add Contact</span>
            </button>
            <button
              className={`contacts-page__refresh-btn ${isRefreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw size={18} className={isRefreshing ? 'contacts-page__spin' : ''} />
              {isRefreshing ? 'Syncing...' : 'Sync Contacts'}
            </button>
          </div>
        </header>

        <section className="contacts-page__controls">
          <div className="contacts-page__search-container">
            <input
              type="text"
              className="contacts-page__search-input"
              placeholder="Search by name, email or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="contacts-page__search-icon" size={20} />
          </div>

          <div className="contacts-page__filters">
            <button
              className={`contacts-page__filter ${filterRole === 'all' ? 'contacts-page__filter--active' : ''}`}
              onClick={() => setFilterRole('all')}
            >
              All Contacts
            </button>
            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
              <button
                key={role}
                className={`contacts-page__filter ${filterRole === role ? 'contacts-page__filter--active' : ''}`}
                onClick={() => setFilterRole(role)}
              >
                {config.icon}
                {config.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="contacts-page__loading">
            <RefreshCw className="contacts-page__spin" size={48} />
            <p>Loading Contact Records...</p>
          </div>
        ) : error ? (
          <div className="contacts-page__error">
            <p>{error}</p>
            <button onClick={loadContacts} className="contacts-page__refresh-btn">
              Retry Sync
            </button>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="contacts-page__empty">
            <Users className="contacts-page__empty-icon" />
            <p className="contacts-page__empty-text">No contacts found.</p>
          </div>
        ) : (
          <div className={`contacts-page__content ${viewMode === 'list' ? 'contacts-page__content--list' : ''}`}>
            {viewMode === 'list' && (
              <div className="contacts-list-header">
                <div className="contacts-list-header__name">Name</div>
                <div className="contacts-list-header__role">Role</div>
                <div className="contacts-list-header__email">Email</div>
                <div className="contacts-list-header__activity">Activity</div>
                <div className="contacts-list-header__actions">Actions</div>
              </div>
            )}
            <div className={viewMode === 'grid' ? 'contacts-page__grid' : 'contacts-page__list'}>
              {filteredContacts.map(contact => {
                const config = ROLE_CONFIG[contact.role] || ROLE_CONFIG.other;

                if (viewMode === 'list') {
                  return (
                    <div
                      key={contact.id}
                      className="contact-list-item"
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                    >
                      <div className="contact-list-item__name">
                        <div className="contact-list-item__avatar">
                          {getInitials(contact.name)}
                        </div>
                        <span>{contact.name}</span>
                      </div>
                      <div className="contact-list-item__role">
                        <span className="role-tag" style={{ borderLeftColor: config.color }}>{config.label}</span>
                      </div>
                      <div className="contact-list-item__email">
                        {contact.emails[0] || '-'}
                      </div>
                      <div className="contact-list-item__activity">
                        Property Inquiry
                      </div>
                      <div className="contact-list-item__actions" onClick={e => e.stopPropagation()}>
                        <button className="icon-action-btn" onClick={() => window.location.href = `mailto:${contact.emails[0]}`}>
                          <Mail size={16} />
                        </button>
                        <button className="icon-action-btn" onClick={() => window.location.href = `tel:${contact.phones[0]}`}>
                          <Phone size={16} />
                        </button>
                        <button className="icon-action-btn">
                          <MessageSquare size={16} />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={contact.id}
                    className="contact-card"
                    onClick={() => navigate(`/contacts/${contact.id}`)}
                    style={{
                      '--role-color': config.color,
                      '--role-glow': config.glow,
                      '--role-bg': config.bg,
                      '--role-border': config.border
                    } as React.CSSProperties}
                  >
                    <div className="contact-card__header">
                      <div className="contact-card__avatar-group">
                        <div className="contact-card__avatar">
                          {getInitials(contact.name)}
                        </div>
                        <div className="contact-card__name-role">
                          <h3 className="contact-card__name">{contact.name}</h3>
                          <span className="contact-card__role">{config.label}</span>
                        </div>
                      </div>
                      <div className="contact-card__quick-actions" onClick={e => e.stopPropagation()}>
                        <button className="icon-action-btn" onClick={() => window.location.href = `mailto:${contact.emails[0]}`}>
                          <Mail size={16} />
                        </button>
                        <button className="icon-action-btn" onClick={() => window.location.href = `tel:${contact.phones[0]}`}>
                          <Phone size={16} />
                        </button>
                        <button className="icon-action-btn">
                          <MessageSquare size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="contact-card__info">
                      {contact.emails.length > 0 && (
                        <div className="contact-card__info-item">
                          <Mail className="contact-card__icon" />
                          <span>{contact.emails[0]}</span>
                        </div>
                      )}
                      {contact.phones.length > 0 && (
                        <div className="contact-card__info-item">
                          <Phone className="contact-card__icon" />
                          <span>{contact.phones[0]}</span>
                        </div>
                      )}
                    </div>

                    <div className="contact-card__footer">
                      <div className="contact-card__deals">
                        <Briefcase size={14} />
                        <span>Recent Property Interest</span>
                      </div>
                      <button className="contact-card__view-btn">
                        View Profile <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
        }
      </div>
    </div>
  );
};
