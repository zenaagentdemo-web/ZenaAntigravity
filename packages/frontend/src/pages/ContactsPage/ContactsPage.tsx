import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
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
  X,
  Send,
  Sparkles,
  CheckSquare,
  DollarSign
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';

import { BatchActionBar } from '../../components/BatchActionBar/BatchActionBar';
import { IntelScoreTooltip } from '../../components/IntelScoreTooltip/IntelScoreTooltip';
import { useThreadActions } from '../../hooks/useThreadActions';
import {
  calculateEngagementScore,
  generateMockEngagementInput,
  EngagementScore,
  DealStage,
  ContactRole
} from '../../utils/ContactEngagementScorer';
import './ContactsPage.css';
import { ZenaBatchComposeModal } from '../../components/ZenaBatchComposeModal/ZenaBatchComposeModal';
import { NewContactModal } from '../../components/NewContactModal/NewContactModal';
import { ZenaCallTooltip } from '../../components/ZenaCallTooltip/ZenaCallTooltip';
import { ZenaBatchTagModal } from '../../components/ZenaBatchTagModal/ZenaBatchTagModal';

interface Contact {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  role: 'buyer' | 'vendor' | 'market' | 'tradesperson' | 'agent' | 'other';
  engagementScore?: number;
  engagementVelocity?: number; // +/- percentage (momentum)
  intelligenceSnippet?: string;
  lastActivityDetail?: string;
  dealStage?: DealStage; // Stage of associated deal if any
  scoringData?: EngagementScore; // Calculated scoring data
  zenaCategory?: 'PULSE' | 'HOT_LEAD' | 'COLD_NURTURE' | 'HIGH_INTENT'; // AI-assigned category from backend
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
  investor: {
    label: 'Investor',
    color: '#FACC15',
    glow: 'rgba(250, 204, 21, 0.5)',
    bg: 'rgba(250, 204, 21, 0.1)',
    border: 'rgba(250, 204, 21, 0.3)',
    icon: <DollarSign size={18} />
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

// Category badge configuration for Zena Intelligence categories
const CATEGORY_BADGE_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  HOT_LEAD: { emoji: '🔥', label: 'Hot Lead', color: '#FF6B35' },
  COLD_NURTURE: { emoji: '❄️', label: 'Cold Nurture', color: '#00D4FF' },
  HIGH_INTENT: { emoji: '🎯', label: 'High Intent', color: '#8B5CF6' },
  PULSE: { emoji: '⚡', label: 'Pulse', color: '#00FF88' }
};

// --- Deterministic Hash Function for Consistent Mock Data ---
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// --- Mock Intelligence Generator (Using Real Scoring Algorithm) ---
const ENRICH_CONTACT = (contact: Contact): Contact => {
  const AucklandAddresses = [
    '24 Ponsonby Road, Ponsonby',
    '88 Queen Street, CBD',
    '12 Jervois Road, Herne Bay',
    '156 Parnell Road, Parnell',
    '45 Mount Eden Road, Mt Eden',
    '102 Tamaki Drive, Mission Bay'
  ];

  const snippets = [
    "High probability seller (6-9 months). Watching local auction clearance rates.",
    "Active buyer. Attending 3+ open homes per weekend in Grey Lynn area.",
    "Previous client. Portfolio investor looking for low-maintenance yields.",
    "First-home buyer. Pre-approval valid for 60 days. High urgency.",
    "Downsizing vendor. Exploring smaller apartments in Mission Bay.",
    "Trades lead. Reliable for urgent pre-settlement repairs."
  ];

  // Use contact ID as seed for deterministic "random" values
  const seed = hashString(contact.id);
  const addressIndex = seed % AucklandAddresses.length;
  const snippetIndex = (seed >> 4) % snippets.length;
  const activityIndex = (seed >> 8) % 5;

  const activities = [
    "Inquired about " + AucklandAddresses[addressIndex],
    "Viewed " + AucklandAddresses[(addressIndex + 1) % AucklandAddresses.length] + " (2h ago)",
    "Downloaded info pack for " + AucklandAddresses[(addressIndex + 2) % AucklandAddresses.length],
    "Scheduled private viewing for tomorrow",
    "Requested appraisal for current property"
  ];

  // Simulate deal stages - some contacts have associated deals
  const dealStages: (DealStage | undefined)[] = [
    undefined, 'lead', 'qualified', 'viewing', 'offer', 'conditional', 'sold', 'nurture'
  ];
  const seedIndex = contact.name.charCodeAt(0) % dealStages.length;
  const mockDealStage = dealStages[seedIndex];

  // Generate mock engagement input and calculate real scores
  const engagementInput = generateMockEngagementInput(
    contact.name,
    contact.emails,
    contact.phones,
    contact.role as ContactRole,
    mockDealStage
  );
  const scoringData = calculateEngagementScore(engagementInput);

  return {
    ...contact,
    dealStage: mockDealStage,
    scoringData,
    engagementScore: scoringData.intelScore,
    engagementVelocity: scoringData.momentum,
    intelligenceSnippet: contact.intelligenceSnippet ?? snippets[snippetIndex],
    lastActivityDetail: contact.lastActivityDetail ?? activities[activityIndex]
  };
};



import { useContactIntelligence } from '../../hooks/useContactIntelligence';

export const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useThreadActions();
  // Zena Brain Real-time Intelligence
  const { lastEngagementUpdate, lastCategoryUpdate, isConnected } = useContactIntelligence();

  // Persist view mode preference in localStorage
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('contactsViewMode');
    return (saved === 'grid' || saved === 'list') ? saved : 'list';
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterIntel, setFilterIntel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Smart Search State
  const [isAnalyzingQuery, setIsAnalyzingQuery] = useState(false);
  const [isSmartSearchActive, setIsSmartSearchActive] = useState(false);

  const handleSmartSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAnalyzingQuery(true);
    try {
      const response = await api.post<{ role: string; intel: string; keywords: string }>('/api/ask/smart-search', { query: searchQuery });
      const result = response.data;
      if (result) {
        // Map backend roles to frontend config keys if necessary
        // Assuming backend returns valid keys matching ROLE_CONFIG or 'all'
        if (result.role) setFilterRole(result.role);
        if (result.intel) setFilterIntel(result.intel);

        // Update query with extracted keywords (stripping semantic terms)
        // If keywords are empty but we have filters, clear the query to show all results for that filter
        setSearchQuery(result.keywords || '');

        setIsSmartSearchActive(true);
      }
    } catch (e) {
      console.error('Smart search failed:', e);
    } finally {
      setIsAnalyzingQuery(false);
    }
  };

  // Reset smart search state when user types manually
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (isSmartSearchActive) setIsSmartSearchActive(false);
  };
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [targetContact, setTargetContact] = useState<Contact | null>(null);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  // Update contacts when real-time engagement data arrives
  useEffect(() => {
    if (lastEngagementUpdate) {
      setContacts(prevContacts => prevContacts.map(c => {
        if (c.id === lastEngagementUpdate.contactId) {
          return {
            ...c,
            engagementScore: lastEngagementUpdate.engagementScore,
            engagementVelocity: lastEngagementUpdate.momentum,
            dealStage: (lastEngagementUpdate.dealStage as DealStage) || c.dealStage,
            scoringData: {
              ...(c.scoringData as EngagementScore),
              intelScore: lastEngagementUpdate.engagementScore,
              momentum: lastEngagementUpdate.momentum,
              dealStage: (lastEngagementUpdate.dealStage as DealStage) || c.dealStage,
              isOnTrack: lastEngagementUpdate.engagementScore > 60 // Simple heuristic update
            }
          };
        }
        return c;
      }));
      addToast(`Updated engagement for contact`, 'info');
    }
  }, [lastEngagementUpdate, addToast]);

  // Update contacts when real-time categorization arrives
  useEffect(() => {
    if (lastCategoryUpdate) {
      setContacts(prevContacts => prevContacts.map(c => {
        if (c.id === lastCategoryUpdate.contactId) {
          return {
            ...c,
            zenaCategory: lastCategoryUpdate.zenaCategory as any
          };
        }
        return c;
      }));
      addToast(`Contact re-categorized as ${lastCategoryUpdate.zenaCategory}`, 'info');
    }
  }, [lastCategoryUpdate, addToast]);

  // Save view mode preference when it changes
  useEffect(() => {
    localStorage.setItem('contactsViewMode', viewMode);
  }, [viewMode]);

  const selectedContacts = useMemo(() => {
    if (targetContact) return [targetContact];
    return contacts.filter(c => selectedIds.has(c.id));
  }, [contacts, selectedIds, targetContact]);

  const handleOpenCompose = (contact?: Contact, subject?: string, message?: string) => {
    if (contact) {
      setTargetContact(contact);
    } else {
      setTargetContact(null);
    }
    setDraftSubject(subject || '');
    setDraftMessage(message || '');
    setShowComposeModal(true);
  };

  // Handle Improve Now action from IntelScoreTooltip
  const handleImproveNow = (contact: Contact) => async (payload: {
    contactName: string;
    contactEmail?: string;
    subject: string;
    body: string;
  }) => {
    try {
      // Record the feedback to Zena Brain immediately
      await api.post('/api/ask/record-action', {
        contactId: contact.id,
        actionType: 'email',
        actionDescription: `Executed AI suggested improvement: ${payload.subject}`
      });
      console.log(`[ContactsPage] Action feedback recorded for contact ${contact.id}`);
    } catch (err) {
      console.warn('[ContactsPage] Failed to record action feedback:', err);
    }
    handleOpenCompose(contact, payload.subject, payload.body);
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    if (newSelected.size > 0) setIsBatchMode(true);
    else setIsBatchMode(false);
  };

  const toggleBatchMode = () => {
    if (isBatchMode) {
      clearSelection();
    } else {
      setIsBatchMode(true);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsBatchMode(false);
  };

  const handleAddContact = () => {
    setIsNewContactModalOpen(true);
  };

  const handleSaveContact = async (contactData: any) => {
    try {
      console.log('[ContactsPage] Saving new contact:', contactData);
      const response = await api.post('/api/contacts', contactData);
      if (response.data && response.data.contact) {
        addToast('Contact added to Zena Brain successfully.', 'success');
        loadContacts(); // Refresh the list
      }
    } catch (err) {
      console.error('[ContactsPage] Failed to save contact:', err);
      addToast('System failed to persist contact record.', 'error');
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);
      console.log('[ContactsPage] Fetching contacts...');
      const response = await api.get<Contact[] | { contacts: Contact[] }>('/api/contacts');
      console.log('[ContactsPage] API Response:', response.data);
      const contactsData = Array.isArray(response.data)
        ? response.data
        : (response.data as any).contacts || [];
      console.log('[ContactsPage] Contacts extracted:', contactsData.length);

      // Enrich contacts with mock snippets first (for display, will be replaced by AI data over time)
      let enrichedContacts = contactsData.map(ENRICH_CONTACT);

      // Now fetch real engagement scores from Zena's backend AI brain
      if (enrichedContacts.length > 0) {
        try {
          const contactIds = enrichedContacts.map(c => c.id);
          console.log('[ContactsPage] Fetching real engagement scores from Zena brain...');
          const engagementResponse = await api.post<{ engagementData: Record<string, any> }>('/api/contacts/batch-engagement', { contactIds });

          if (engagementResponse.data?.engagementData) {
            console.log('[ContactsPage] Received real engagement data for', Object.keys(engagementResponse.data.engagementData).length, 'contacts');

            // Identify contacts with missing intelligence to trigger discovery
            const contactsRequiringDiscovery = enrichedContacts.filter(c =>
              !c.intelligenceSnippet || c.intelligenceSnippet.includes('analyzing')
            );

            if (contactsRequiringDiscovery.length > 0) {
              console.log(`[ContactsPage] Triggering discovery for ${contactsRequiringDiscovery.length} contacts...`);
              // Run discovery in the background for each contact (limited to avoid overwhelming)
              contactsRequiringDiscovery.slice(0, 5).forEach(c => {
                api.post('/api/ask/discover', { contactId: c.id }).catch(err =>
                  console.warn(`Discovery failed for ${c.id}`, err)
                );
              });
            }

            // Merge real engagement scores with contacts
            enrichedContacts = enrichedContacts.map(contact => {
              const realEngagement = engagementResponse.data.engagementData[contact.id];
              if (realEngagement) {
                return {
                  ...contact,
                  engagementScore: realEngagement.engagementScore,
                  engagementVelocity: realEngagement.momentum,
                  dealStage: realEngagement.dealStage || contact.dealStage,
                  scoringData: {
                    ...contact.scoringData,
                    intelScore: realEngagement.engagementScore,
                    momentum: realEngagement.momentum,
                    dealStage: realEngagement.dealStage
                  } as EngagementScore
                };
              }
              return contact;
            });
          }
        } catch (engagementErr) {
          console.warn('[ContactsPage] Failed to fetch real engagement data, using mock data:', engagementErr);
          // Continue with mock data if engagement endpoint fails
        }
      }

      setContacts(enrichedContacts);
    } catch (err) {
      console.error('[ContactsPage] Failed to load contacts:', err);
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

  const handleBatchAction = (action: string) => {
    switch (action) {
      case 'delete_all':
        handleBatchDelete();
        break;
      case 'compose':
        handleOpenCompose();
        break;
      case 'tag':
        setIsTagModalOpen(true);
        break;
      default:
        console.warn(`Action ${action} not implemented for contacts.`);
    }
  };

  const handleSaveBatchTag = async (data: { role?: string; zenaIntelligence?: any }) => {
    try {
      const ids = Array.from(selectedIds);
      console.log('[ContactsPage] Bulk updating intelligence for', ids.length, 'contacts:', data);
      await api.patch('/api/contacts/bulk', { ids, data });
      addToast(`Successfully applied intelligence to ${ids.length} records.`, 'success');
      setIsTagModalOpen(false);
      clearSelection();
      loadContacts(); // Refresh list to reflect updates
    } catch (err) {
      console.error('[ContactsPage] Bulk update failed:', err);
      addToast('System failed to apply batch intelligence.', 'error');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    const idsToDelete = Array.from(selectedIds);

    if (!window.confirm(`Are you sure you want to purge ${count} contact record${count > 1 ? 's' : ''}? This action is irreversible.`)) {
      return;
    }

    try {
      await api.post('/api/contacts/bulk-delete', { ids: idsToDelete });
      setContacts(prev => prev.filter(c => !selectedIds.has(c.id)));
      addToast(`Successfully purged ${count} contact record${count > 1 ? 's' : ''}.`, 'success');
      clearSelection();
    } catch (err) {
      console.error('[ContactsPage] Failed to bulk delete contacts:', err);
      addToast('System failed to execute bulk purge. Please try again.', 'error');
    }
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
    return contacts
      .filter(contact => {
        const matchesRole = filterRole === 'all' || contact.role === filterRole;

        // Use backend-assigned category or fall back to score-based logic
        let matchesIntel = true;
        if (filterIntel === 'pulse') {
          matchesIntel = contact.zenaCategory === 'PULSE' ||
            (!contact.zenaCategory && (contact.engagementVelocity || 0) > 10);
        }
        if (filterIntel === 'hot') {
          matchesIntel = contact.zenaCategory === 'HOT_LEAD' ||
            (!contact.zenaCategory && (contact.engagementScore || 0) > 80);
        }
        if (filterIntel === 'cold') {
          matchesIntel = contact.zenaCategory === 'COLD_NURTURE' ||
            (!contact.zenaCategory && (contact.engagementScore || 0) < 30);
        }
        if (filterIntel === 'intent') {
          matchesIntel = contact.zenaCategory === 'HIGH_INTENT' ||
            (!contact.zenaCategory && (contact.engagementScore || 0) > 60 && (contact.intelligenceSnippet?.includes('buyer') || false));
        }

        const query = searchQuery.toLowerCase();
        const matchesSearch = contact.name.toLowerCase().includes(query) ||
          contact.emails.some(e => e.toLowerCase().includes(query)) ||
          contact.role.toLowerCase().includes(query) ||
          (contact.dealStage && contact.dealStage.toLowerCase().includes(query)) ||
          (contact.intelligenceSnippet && contact.intelligenceSnippet.toLowerCase().includes(query)) ||
          (contact.lastActivityDetail && contact.lastActivityDetail.toLowerCase().includes(query));
        return matchesRole && matchesIntel && matchesSearch;
      })
      .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0));
  }, [contacts, filterRole, filterIntel, searchQuery]);

  return (
    <div className="contacts-page">
      <AmbientBackground variant="default" showParticles={true} />

      <div className="contacts-page__container">
        <header className="contacts-page__header">
          <div className="contacts-page__title-group">
            <h1 className="contacts-page__title">Contacts</h1>
            <span className="contacts-page__stat-badge">{filteredContacts.length} Records</span>
          </div>

          <div className="contacts-page__header-actions">
            <button
              className={`contacts-page__action-btn contacts-page__select-btn ${isBatchMode ? 'active' : ''}`}
              onClick={toggleBatchMode}
              aria-label={isBatchMode ? "Exit selection mode" : "Enter selection mode"}
              aria-pressed={isBatchMode}
              data-testid="batch-mode-toggle"
            >
              <CheckSquare size={18} />
              <span className="contacts-page__select-label">Select</span>
            </button>



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
              onClick={handleAddContact}
            >
              <Plus size={18} />
              <span>Add contact</span>
            </button>
            <button
              className={`contacts-page__refresh-btn ${isRefreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw size={18} className={isRefreshing ? 'contacts-page__spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </header>

        <section className="contacts-page__controls">
          <div className={`contacts-page__search-container ${isSmartSearchActive ? 'smart-active' : ''}`}>
            {isAnalyzingQuery ? (
              <div className="search-loading-icon">
                <RefreshCw className="spinning" size={18} />
              </div>
            ) : (
              <Search className="contacts-page__search-icon" size={20} />
            )}
            <input
              type="text"
              className="contacts-page__search-input"
              placeholder="Search or Ask Zena (e.g. 'Active buyers in Ponsonby')"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
            />
            <button
              className={`smart-search-btn ${isAnalyzingQuery ? 'analyzing' : ''}`}
              onClick={handleSmartSearch}
              disabled={isAnalyzingQuery || !searchQuery.trim()}
              title="Ask Zena to filter results"
            >
              <Sparkles size={16} />
              <span>Ask Zena</span>
            </button>
          </div>
          {isSmartSearchActive && (
            <div className="smart-search-badge">
              <Sparkles size={12} />
              <span>Semantic Filters Active</span>
              <button onClick={() => {
                setIsSmartSearchActive(false);
                setFilterRole('all');
                setFilterIntel('all');
                setSearchQuery('');
              }}><X size={12} /></button>
            </div>
          )}

          <div className="contacts-page__filters-group">
            <div className="contacts-page__filters">
              <button
                className={`contacts-page__filter ${filterRole === 'all' ? 'contacts-page__filter--active' : ''}`}
                onClick={() => setFilterRole('all')}
              >
                All
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

            <div className="contacts-page__intel-filters">
              <span className="intel-label">Zena Intelligence:</span>
              <button
                className={`intel-filter ${filterIntel === 'all' ? 'active' : ''}`}
                onClick={() => setFilterIntel('all')}
              >
                Pulse
              </button>
              <button
                className={`intel-filter hot ${filterIntel === 'hot' ? 'active' : ''}`}
                onClick={() => setFilterIntel('hot')}
              >
                🔥 Hot Leads
              </button>
              <button
                className={`intel-filter cold ${filterIntel === 'cold' ? 'active' : ''}`}
                onClick={() => setFilterIntel('cold')}
              >
                ❄️ Cold Nurture
              </button>
              <button
                className={`intel-filter intent ${filterIntel === 'intent' ? 'active' : ''}`}
                onClick={() => setFilterIntel('intent')}
              >
                🎯 High Intent
              </button>
            </div>
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
              <div className={`contacts-list-header ${isBatchMode ? 'batch-mode' : ''}`}>
                {isBatchMode && (
                  <div className="contacts-list-header__check">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
                      onChange={() => {
                        if (selectedIds.size === filteredContacts.length) setSelectedIds(new Set());
                        else setSelectedIds(new Set(filteredContacts.map(c => c.id)));
                      }}
                    />
                  </div>
                )}
                <div className="contacts-list-header__name">Name</div>
                <div className="contacts-list-header__role">Role</div>
                <div className="contacts-list-header__email">Email</div>
                <div className="contacts-list-header__activity">Intelligence / Activity</div>
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
                      className={`contact-list-item ${selectedIds.has(contact.id) ? 'selected' : ''} ${isBatchMode ? 'batch-mode' : ''}`}
                      onClick={(e) => {
                        if (isBatchMode) {
                          toggleSelection(contact.id, e);
                        } else {
                          navigate(`/contacts/${contact.id}`);
                        }
                      }}
                    >
                      {isBatchMode && (
                        <div className="contact-list-item__check" onClick={e => toggleSelection(contact.id, e)}>
                          <div className={`custom-checkbox ${selectedIds.has(contact.id) ? 'checked' : ''}`} />
                        </div>
                      )}
                      <div className="contact-list-item__name">
                        <div
                          className="contact-list-item__avatar"
                          style={{ '--heat-score': `${contact.engagementScore}%` } as any}
                        >
                          <div className="heat-ring" />
                          {getInitials(contact.name)}
                        </div>
                        <div className="name-with-score">
                          <span>{contact.name}</span>
                          <div className="score-velocity-row">
                            <span className="mini-heat-score" data-heat={contact.engagementScore && contact.engagementScore > 80 ? 'hot' : 'normal'}>
                              {contact.engagementScore}% Intel
                            </span>
                            {contact.scoringData && (
                              <IntelScoreTooltip
                                contactId={contact.id}
                                score={contact.scoringData}
                                role={contact.role}
                                contactName={contact.name}
                                contactEmail={contact.emails[0]}
                                onImproveNow={handleImproveNow(contact)}
                              />
                            )}
                            {contact.engagementVelocity !== undefined && (
                              <span className={`velocity-indicator ${contact.engagementVelocity >= 0 ? 'positive' : 'negative'}`}>
                                {contact.engagementVelocity >= 0 ? '+' : ''}{contact.engagementVelocity}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="contact-list-item__role">
                        <span className="role-tag" style={{ borderLeftColor: config.color }}>{config.label}</span>
                      </div>
                      <div className="contact-list-item__email">
                        {contact.emails[0] || '-'}
                      </div>
                      <div className="contact-list-item__activity">
                        <div className="activity-pulse-dot" />
                        <span className="activity-text">{contact.lastActivityDetail}</span>
                        <div className="intelligence-preview">
                          <Shield size={12} /> {contact.intelligenceSnippet}
                        </div>
                      </div>
                      <div className="contact-list-item__actions" onClick={e => e.stopPropagation()}>
                        <button className="icon-action-btn" onClick={() => handleOpenCompose(contact)} title="Compose Email">
                          <Mail size={16} />
                        </button>
                        <ZenaCallTooltip contactId={contact.id} phones={contact.phones} contactName={contact.name}>
                          <button className="icon-action-btn" title="Call">
                            <Phone size={16} />
                          </button>
                        </ZenaCallTooltip>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={contact.id}
                    className={`contact-card ${selectedIds.has(contact.id) ? 'selected' : ''}`}
                    onClick={(e) => {
                      if (isBatchMode) {
                        toggleSelection(contact.id, e);
                      } else {
                        navigate(`/contacts/${contact.id}`);
                      }
                    }}
                    style={{
                      '--role-color': config.color,
                      '--role-glow': config.glow,
                      '--role-bg': config.bg,
                      '--role-border': config.border,
                      '--heat-score': `${contact.engagementScore}%`
                    } as any}
                  >
                    {isBatchMode && (
                      <div className="contact-card__selection-check" onClick={e => toggleSelection(contact.id, e)}>
                        <div className={`custom-checkbox ${selectedIds.has(contact.id) ? 'checked' : ''}`} />
                      </div>
                    )}

                    <div className="contact-card__header">
                      <div className="contact-card__avatar-group">
                        <div className="contact-card__avatar">
                          <div className="heat-ring" />
                          {getInitials(contact.name)}
                        </div>
                        <div className="contact-card__name-role">
                          <h3 className="contact-card__name">{contact.name}</h3>
                          <div className="role-heat-row">
                            <span className="contact-card__role">{config.label}</span>
                            {contact.zenaCategory && contact.zenaCategory !== 'PULSE' && (
                              <span
                                className="category-badge"
                                style={{ borderColor: CATEGORY_BADGE_CONFIG[contact.zenaCategory]?.color }}
                                title={CATEGORY_BADGE_CONFIG[contact.zenaCategory]?.label}
                              >
                                {CATEGORY_BADGE_CONFIG[contact.zenaCategory]?.emoji}
                              </span>
                            )}
                            <span className="card-heat-intel" data-heat={contact.engagementScore && contact.engagementScore > 80 ? 'hot' : 'normal'}>
                              {contact.engagementScore}% Intel
                            </span>
                            {contact.scoringData && (
                              <IntelScoreTooltip
                                contactId={contact.id}
                                score={contact.scoringData}
                                role={contact.role}
                                contactName={contact.name}
                                contactEmail={contact.emails[0]}
                                onImproveNow={handleImproveNow(contact)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="contact-card__quick-actions" onClick={e => e.stopPropagation()}>
                        <button className="icon-action-btn" onClick={() => handleOpenCompose(contact)} title="Compose Email">
                          <Mail size={16} />
                        </button>
                        <ZenaCallTooltip contactId={contact.id} phones={contact.phones} contactName={contact.name}>
                          <button className="icon-action-btn" title="Call">
                            <Phone size={16} />
                          </button>
                        </ZenaCallTooltip>
                      </div>
                    </div>

                    <div className="contact-card__intelligence-box">
                      <div className="activity-pulse-dot" />
                      <span className="activity-text">{contact.lastActivityDetail}</span>
                      <p className="zena-intelligence-note">
                        <Shield size={12} className="zena-shield" />
                        "{contact.intelligenceSnippet}"
                      </p>
                    </div>

                    <div className="contact-card__info">
                      {contact.emails.length > 0 && (
                        <div className="contact-card__info-item">
                          <Mail className="contact-card__icon" />
                          <span>{contact.emails[0]}</span>
                        </div>
                      )}
                    </div>

                    <div className="contact-card__footer">
                      <div className="contact-card__deals">
                        <Briefcase size={14} />
                        <span>Recent Interest</span>
                      </div>
                      <button className="contact-card__view-btn">
                        Scan Profile <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="contact-card__tactical-overlay" />
                  </div>
                );
              })}
            </div>
          </div>
        )
        }
      </div>

      {showComposeModal && (
        <ZenaBatchComposeModal
          selectedContacts={selectedContacts}
          onClose={() => {
            setShowComposeModal(false);
            setTargetContact(null);
            setDraftSubject('');
            setDraftMessage('');
          }}
          initialSubject={draftSubject}
          initialMessage={draftMessage}
        />
      )}

      {isNewContactModalOpen && (
        <NewContactModal
          isOpen={isNewContactModalOpen}
          onClose={() => setIsNewContactModalOpen(false)}
          onSave={handleSaveContact}
        />
      )}

      {isBatchMode && createPortal(
        <BatchActionBar
          selectedCount={selectedIds.size}
          isVisible={isBatchMode}
          onAction={handleBatchAction as any}
          onCancel={clearSelection}
          actions={['compose', 'tag', 'delete_all']}
        />,
        document.body
      )}

      <ZenaBatchTagModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        onSave={handleSaveBatchTag}
        selectedCount={selectedIds.size}
      />

    </div>
  );
};
