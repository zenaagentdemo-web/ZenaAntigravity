import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  DollarSign,
  Zap,
  Clock,
  Loader2,
  Download,
  Database
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';

import { BatchActionBar } from '../../components/BatchActionBar/BatchActionBar';
import { IntelScoreTooltip } from '../../components/IntelScoreTooltip/IntelScoreTooltip';
import { useThreadActions } from '../../hooks/useThreadActions';
import { ToastContainer } from '../../components/Toast/Toast';
import { CrmQuickSetupModal } from '../ConnectionCentrePage/CrmQuickSetupModal';
import { CrmSuccessOverlay } from '../../components/CrmSuccessOverlay/CrmSuccessOverlay';
import {
  EngagementScore,
  DealStage,
  ContactRole,
  Contact
} from '../../models/contact.types';
import './ContactsPage.css';
import { ZenaBatchComposeModal } from '../../components/ZenaBatchComposeModal/ZenaBatchComposeModal';
import { NewContactModal } from '../../components/NewContactModal/NewContactModal';
import { ZenaCallTooltip } from '../../components/ZenaCallTooltip/ZenaCallTooltip';
import { ZenaBatchTagModal } from '../../components/ZenaBatchTagModal/ZenaBatchTagModal';
import { ContactIntelligenceModal, StrategicAction } from '../../components/ContactIntelligenceModal/ContactIntelligenceModal';
// Oracle & Godmode Components
import { OracleBadge } from '../../components/OracleBadge/OracleBadge';
import { GodmodeToggle } from '../../components/GodmodeToggle/GodmodeToggle';
import { ActionApprovalQueue } from '../../components/ActionApprovalQueue/ActionApprovalQueue';
import { useOracle } from '../../hooks/useOracle';
import { useGodmode } from '../../hooks/useGodmode';



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

// NOTE: Mock functions removed - all data now comes from Zena's backend AI brain

import { useContactIntelligence } from '../../hooks/useContactIntelligence';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Custom renderer for clickable contact names in AI Spotlight
const ContactLink = ({ children, ...props }: any) => {
  const navigate = useNavigate();
  // We need to access contacts list to find the ID. 
  // Since we can't easily pass props to Markdown components, we'll try to match by name from a global/context or just try to find it in the DOM if needed, 
  // BUT cleanest way in ReactMarkdown is often just rendering a span that LOOKS like a link, 
  // or using a custom handler if we can inject data. 
  // For now, let's assume the backend wraps names in a specific format or we just match text.
  // Actually, standard markdown links [Name](contact-id) work best if the backend generates them.
  // The prompt says "Reference specific contacts by NAME".
  // Let's make a smart renderer that tries to match text content to known contacts if it looks like a name.

  return <span className="ai-spotlight__contact-link" {...props}>{children}</span>;
}

export const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast, state: actionState, dismissToast } = useThreadActions();

  // Helper for lazy state initialization (Persistence)
  const getPersistedState = (key: string, defaultValue: any) => {
    try {
      const saved = sessionStorage.getItem('zenaContactSearchState');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed[key] !== undefined ? parsed[key] : defaultValue;
      }
    } catch (e) {
      console.warn('Failed to parse persisted contact search state', e);
    }
    return defaultValue;
  };

  // Handle openQueue query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openQueue') === 'true') {
      setIsActionQueueOpen(true);
    }
  }, [location.search]);
  // Zena Brain Real-time Intelligence
  const { lastEngagementUpdate, lastCategoryUpdate, lastBatchUpdate, isConnected } = useContactIntelligence();
  // Update contacts when a batch of updates arrives via WebSocket
  useEffect(() => {
    if (lastBatchUpdate && lastBatchUpdate.updates) {
      console.log(`[ContactsPage] Applying batch synchronization for ${lastBatchUpdate.updates.length} contacts`);
      setContacts(prevContacts => {
        const updatedContacts = [...prevContacts];
        lastBatchUpdate.updates.forEach(update => {
          const index = updatedContacts.findIndex(c => c.id === update.contactId);
          if (index !== -1) {
            updatedContacts[index] = {
              ...updatedContacts[index],
              zenaCategory: update.zenaCategory as any,
              intelligenceSnippet: update.intelligenceSnippet || updatedContacts[index].intelligenceSnippet,
              role: update.role || updatedContacts[index].role
            };
          }
        });
        return updatedContacts;
      });
      addToast('info', `Synchronized ${lastBatchUpdate.updates.length} records with Zena brain`);
    }
  }, [lastBatchUpdate, addToast]);

  // Track Real-time Discovery Status
  const [discoveryStates, setDiscoveryStates] = useState<Record<string, 'started' | 'completed' | 'failed'>>({});
  const { lastDiscoveryUpdate } = useContactIntelligence();

  useEffect(() => {
    if (lastDiscoveryUpdate) {
      setDiscoveryStates(prev => ({
        ...prev,
        [lastDiscoveryUpdate.contactId]: lastDiscoveryUpdate.status
      }));

      if (lastDiscoveryUpdate.status === 'started') {
        // No toast for start to avoid clutter, just UI ring
      } else if (lastDiscoveryUpdate.status === 'completed') {
        const payload = lastDiscoveryUpdate.payload;
        // Optionally update contact in local state immediately
        if (payload) {
          setContacts(prev => prev.map(c =>
            c.id === lastDiscoveryUpdate.contactId
              ? {
                ...c,
                ...payload,
                engagementReasoning: payload.engagementReasoning || c.engagementReasoning,
                discoveryComplete: true
              }
              : c
          ));
        }
        addToast('success', `Discovery complete for ${lastDiscoveryUpdate.contactName || 'contact'}`);
      }
    }
  }, [lastDiscoveryUpdate, addToast]);

  // Persist view mode preference in localStorage
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('contactsViewMode');
    return (saved === 'grid' || saved === 'list') ? saved : 'list';
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Persisted Search State
  const [filterRole, setFilterRole] = useState<string>(() => getPersistedState('filterRole', 'all'));
  const [filterDealStage, setFilterDealStage] = useState<string>(() => getPersistedState('filterDealStage', 'all'));
  const [searchQuery, setSearchQuery] = useState(() => getPersistedState('searchQuery', ''));

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [isCrmSetupOpen, setIsCrmSetupOpen] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [targetCrm, setTargetCrm] = useState('Generic CRM');


  // Smart Search State (Persisted)
  const [isAnalyzingQuery, setIsAnalyzingQuery] = useState(false);
  const [isSmartSearchActive, setIsSmartSearchActive] = useState(() => getPersistedState('isSmartSearchActive', false));
  const [smartSearchInsight, setSmartSearchInsight] = useState<string | null>(() => getPersistedState('smartSearchInsight', null));
  const [smartSearchRichResponse, setSmartSearchRichResponse] = useState<string | null>(() => getPersistedState('smartSearchRichResponse', null));
  const [executedQuery, setExecutedQuery] = useState<string | null>(() => getPersistedState('executedQuery', null));

  // Persistence Effect
  useEffect(() => {
    const state = {
      filterRole,
      filterDealStage,
      searchQuery,
      executedQuery,
      isSmartSearchActive,
      smartSearchInsight,
      smartSearchRichResponse
    };
    sessionStorage.setItem('zenaContactSearchState', JSON.stringify(state));
  }, [filterRole, filterDealStage, searchQuery, executedQuery, isSmartSearchActive, smartSearchInsight, smartSearchRichResponse]);

  const handleSmartSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAnalyzingQuery(true);
    setSmartSearchRichResponse(null); // Clear previous

    try {
      const response = await api.post<{ filters: any; richResponse: string; aiInsight: string }>('/api/ask/contact-search', { query: searchQuery });
      const result = response.data;

      if (result) {
        // Apply filters
        const { filters, richResponse, aiInsight } = result;
        if (filters?.role) setFilterRole(filters.role);

        // Map status/tags to intel filter if possible, or just leave as 'all'
        // The backend returns { role: '...', status: '...', keywords: '...' } inside 'filters' usually
        // But our new endpoint structure returns { filters: {...}, richResponse: '...', aiInsight: '...' }
        // Let's assume naive mapping for now or respect what the backend gives.


        // Store Rich Response
        setSmartSearchRichResponse(richResponse || null);
        setSmartSearchInsight(aiInsight || null);
        setIsSmartSearchActive(true);
        setExecutedQuery(searchQuery);

        // Clear the search query text so the user focuses on the AI result headers
        setSearchQuery('');
      }
    } catch (e) {
      console.error('Smart search failed:', e);
      addToast('error', 'Zena is having trouble accessing the neural network.');
    } finally {
      setIsAnalyzingQuery(false);
    }
  };


  // Reset smart search state when user types manually
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (isSmartSearchActive) setIsSmartSearchActive(false);
    // Clear any existing proactive suggestion when user types
    if (proactiveSuggestion) setProactiveSuggestion(null);
  };

  // ============================================
  // GLOBAL PROACTIVITY PHASE 1 - CONTACTS
  // Proactive Intent Detection
  // ============================================
  const [proactiveSuggestion, setProactiveSuggestion] = useState<{
    message: string;
    action: string;
    prefill?: { name?: string };
  } | null>(null);
  const [intentDebounceTimer, setIntentDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Debounced intent analysis - calls backend after 600ms of no typing
  useEffect(() => {
    if (intentDebounceTimer) clearTimeout(intentDebounceTimer);

    if (searchQuery.trim().length >= 3) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.post<{
            intentDetected: boolean;
            intentType: string;
            suggestion?: {
              message: string;
              action: string;
              prefill?: { name?: string };
            };
          }>('/api/ask/analyze-intent', { text: searchQuery, context: 'contacts' });

          if (res.data.intentDetected && res.data.suggestion) {
            setProactiveSuggestion(res.data.suggestion);
          } else {
            setProactiveSuggestion(null);
          }
        } catch (err) {
          console.warn('[ContactsPage] Intent analysis failed:', err);
        }
      }, 600);
      setIntentDebounceTimer(timer);
    } else {
      setProactiveSuggestion(null);
    }

    return () => {
      if (intentDebounceTimer) clearTimeout(intentDebounceTimer);
    };
  }, [searchQuery]);

  // Handle proactive suggestion action
  // GLOBAL PROACTIVITY INVARIANT 1: Context Must Flow Forward
  const handleProactiveSuggestionClick = () => {
    if (proactiveSuggestion?.action === 'open_new_contact_modal') {
      // Pre-fill the new contact modal with extracted name
      const extractedName = proactiveSuggestion.prefill?.name || '';
      setNewContactPrefill({ name: extractedName });
      setIsNewContactModalOpen(true);
      setProactiveSuggestion(null);
      setSearchQuery('');
    }
  };

  // ============================================
  // GLOBAL PROACTIVITY PHASE 1 - FEATURE 2
  // Real-Time Role Prediction
  // ============================================
  const [roleSuggestions, setRoleSuggestions] = useState<Record<string, {
    suggestedRole: string | null;
    confidence: number;
    reason: string;
    shouldSuggest: boolean;
  }>>({});

  // Analyze roles for visible contacts when they load
  useEffect(() => {
    const analyzeRoles = async () => {
      if (contacts.length === 0) return;

      // Analyze first 10 contacts (to avoid overwhelming API)
      const toAnalyze = contacts.slice(0, 10);

      for (const contact of toAnalyze) {
        if (roleSuggestions[contact.id]) continue; // Already analyzed

        try {
          const res = await api.post<{
            suggestedRole: string | null;
            confidence: number;
            reason: string;
            shouldSuggest: boolean;
          }>('/api/ask/analyze-contact-role', { contactId: contact.id });

          if (res.data.shouldSuggest) {
            setRoleSuggestions(prev => ({
              ...prev,
              [contact.id]: res.data
            }));
          }
        } catch (err) {
          console.warn('[ContactsPage] Role analysis failed for', contact.id);
        }
      }
    };

    // Delay analysis slightly to prioritize initial render
    const timer = setTimeout(analyzeRoles, 1500);
    return () => clearTimeout(timer);
  }, [contacts]);

  // Handle one-click role update
  const handleRoleSuggestionClick = async (contactId: string, newRole: string) => {
    try {
      await api.patch(`/api/contacts/${contactId}`, { role: newRole });

      // Update local state
      setContacts(prev => prev.map(c =>
        c.id === contactId ? { ...c, role: newRole as any } : c
      ));

      // Remove suggestion
      setRoleSuggestions(prev => {
        const updated = { ...prev };
        delete updated[contactId];
        return updated;
      });

      addToast('success', `Role updated to ${ROLE_CONFIG[newRole]?.label || newRole}`);
    } catch (err) {
      console.error('[ContactsPage] Failed to update role:', err);
      addToast('error', 'Failed to update role');
    }
  };

  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchModeType, setBatchModeType] = useState<'full' | 'export' | null>(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  // GLOBAL PROACTIVITY: Pre-fill data for new contact modal
  const [newContactPrefill, setNewContactPrefill] = useState<{ name?: string } | null>(null);
  const [targetContact, setTargetContact] = useState<Contact | null>(null);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [composeContext, setComposeContext] = useState('');
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);

  // Contact Intelligence Hub State
  const [isIntelModalOpen, setIsIntelModalOpen] = useState(false);
  const [selectedContactForIntel, setSelectedContactForIntel] = useState<Contact | null>(null);
  const [isLoadingStrategic, setIsLoadingStrategic] = useState(false);
  const [contactStrategicActions, setContactStrategicActions] = useState<StrategicAction[]>([]);

  // ============================================
  // GLOBAL PROACTIVITY - FEATURE 4
  // Relationship Decay / Nurture Alerts
  // ============================================
  const [nurtureScores, setNurtureScores] = useState<Record<string, {
    score: number;
    status: 'hot' | 'warm' | 'cold' | 'stale';
    daysSinceContact: number;
    recommendation?: string;
  }>>({});

  // Fetch nurture scores for visible contacts
  useEffect(() => {
    const fetchNurtureScores = async () => {
      if (contacts.length === 0) return;

      const contactIds = contacts.slice(0, 20).map(c => c.id);

      try {
        const res = await api.post<{ nurtureScores: Record<string, any> }>('/api/contacts/batch-nurture-scores', { contactIds });
        setNurtureScores(res.data.nurtureScores);
      } catch (err) {
        console.warn('[ContactsPage] Nurture score fetch failed:', err);
      }
    };

    // Delay to prioritize initial render
    const timer = setTimeout(fetchNurtureScores, 2000);
    return () => clearTimeout(timer);
  }, [contacts]);

  const handleOpenContactIntel = (contact: Contact) => {
    setSelectedContactForIntel(contact);
    setContactStrategicActions([]); // Clear previous
    setIsIntelModalOpen(true);
    setIsLoadingStrategic(true);

    // SIMULATION: In a real app, this would call api.get('/api/ask/contact-strategic-actions', { contactId: contact.id })
    // For now, we simulate Zena's brain generating context-aware strategies
    setTimeout(() => {
      const strategies: StrategicAction[] = [
        {
          action: 'Propose Off-Market Viewing',
          reasoning: `Based on ${contact.name}'s interest in Ponsonby and high engagement score, they are a prime candidate for an early viewing of upcoming listings.`,
          impact: 'High'
        },
        {
          action: 'Schedule Strategy Review Call',
          reasoning: 'Engagement has reached the 75% threshold. Now is the optimal time to convert this momentum into a formal buyer representation agreement.',
          impact: 'High'
        },
        {
          action: 'Send "Sold in Area" Report',
          reasoning: 'Recent sales in their target price bracket ($1.5M - $2M) validate their budget. Sharing this data will build trust and urgency.',
          impact: 'Medium'
        }
      ];
      setContactStrategicActions(strategies);
      setIsLoadingStrategic(false);
    }, 1500);
  };

  const handleExecuteContactStrategy = (action: string, reasoning: string) => {
    // Open composer with pre-filled context from strategy
    if (selectedContactForIntel) {
      handleOpenCompose(
        selectedContactForIntel,
        action,
        '', // Let AI generate body
        `Strategy: ${action}. Reasoning: ${reasoning}. Target: ${selectedContactForIntel.name}.`
      );
      setIsIntelModalOpen(false);
    }
  };

  // Oracle & Godmode State
  const [isActionQueueOpen, setIsActionQueueOpen] = useState(false);
  const [relationships, setRelationships] = useState<Record<string, any[]>>({});
  const { predictions, fetchPrediction, batchAnalyze } = useOracle();
  const { settings: godmodeSettings, pendingActions, pendingCount, fetchPendingActions } = useGodmode();
  const pendingActionContactIds = useMemo(() => {
    return new Set(pendingActions?.filter(a => a.contact?.id).map(a => a.contact!.id) || []);
  }, [pendingActions]);

  const fetchRelationships = async (ids: string[]) => {
    try {
      const response = await api.post('/api/ask/relationships', { ids });
      setRelationships(prev => ({ ...prev, ...response.data }));
    } catch (err) {
      console.warn('[ContactsPage] Failed to fetch relationships:', err);
    }
  };


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
            engagementReasoning: lastEngagementUpdate.engagementReasoning || c.engagementReasoning,
            scoringData: {
              ...(c.scoringData as EngagementScore),
              intelScore: lastEngagementUpdate.engagementScore,
              momentum: lastEngagementUpdate.momentum,
              dealStage: (lastEngagementUpdate.dealStage as DealStage) || c.dealStage,
              reasoning: lastEngagementUpdate.engagementReasoning || c.engagementReasoning,
              isOnTrack: lastEngagementUpdate.engagementScore > 60 // Simple heuristic update
            }
          };
        }
        return c;
      }));
      addToast('info', `Updated engagement for contact`);
    }
  }, [lastEngagementUpdate, addToast]);

  // Update contacts when real-time categorization arrives
  useEffect(() => {
    if (lastCategoryUpdate) {
      setContacts(prevContacts => prevContacts.map(c => {
        if (c.id === lastCategoryUpdate.contactId) {
          return {
            ...c,
            zenaCategory: lastCategoryUpdate.zenaCategory as any,
            intelligenceSnippet: lastCategoryUpdate.intelligenceSnippet || c.intelligenceSnippet,
            role: lastCategoryUpdate.role || c.role
          };
        }
        return c;
      }));
      addToast('success', `Contact categorised as ${lastCategoryUpdate.zenaCategory}`);
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

  const handleOpenCompose = (contact?: Contact, subject?: string, message?: string, context?: string) => {
    if (contact) {
      setTargetContact(contact);
    } else {
      setTargetContact(null);
    }
    setDraftSubject(subject || '');
    setDraftMessage(message || '');
    setComposeContext(context || '');
    setShowComposeModal(true);
  };

  // Handle Improve Now action from IntelScoreTooltip
  const handleImproveNow = (contact: Contact) => async (payload: {
    contactName: string;
    contactEmail?: string;
    subject: string;
    body: string;
    context?: string;
  }) => {
    try {
      // Record the feedback to Zena Brain immediately
      await api.post('/api/ask/record-action', {
        contactId: contact.id,
        actionType: 'email',
        actionDescription: `Executed AI suggested improvement: ${payload.context || payload.subject}`
      });
      console.log(`[ContactsPage] Action feedback recorded for contact ${contact.id}`);
    } catch (err) {
      console.warn('[ContactsPage] Failed to record action feedback:', err);
    }
    // Pass context to compose modal for AI generation
    handleOpenCompose(contact, payload.subject, payload.body, payload.context);
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
    if (newSelected.size > 0) {
      setIsBatchMode(true);
      if (!batchModeType) setBatchModeType('full');
    } else {
      setIsBatchMode(false);
      setBatchModeType(null);
    }
  };

  const toggleBatchMode = () => {
    if (isBatchMode) {
      clearSelection();
    } else {
      setIsBatchMode(true);
      setBatchModeType('full');
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsBatchMode(false);
    setBatchModeType(null);
  };

  const handleAddContact = () => {
    setIsNewContactModalOpen(true);
  };

  const handleSaveContact = async (contactData: any) => {
    try {
      console.log('[ContactsPage] Saving new contact:', contactData);
      const response = await api.post('/api/contacts', contactData);
      if (response.data && response.data.contact) {
        addToast('success', 'Contact added to Zena Brain successfully.');
        loadContacts(); // Refresh the list
      }
    } catch (err) {
      console.error('[ContactsPage] Failed to save contact:', err);
      addToast('error', 'System failed to persist contact record.');
    }
  };

  useEffect(() => {
    loadContacts();
    // Trigger throttled Godmode heartbeat on page mount
    api.post('/api/godmode/heartbeat').catch(err =>
      console.warn('[ContactsPage] Heartbeat failed', err)
    );
  }, [filterRole, filterDealStage]); // Reload when filters change

  const loadContacts = async () => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);
      console.log('[ContactsPage] Fetching contacts with filters:', { filterRole, filterDealStage });

      const queryParams = new URLSearchParams();
      if (filterRole !== 'all') queryParams.append('role', filterRole);
      if (filterDealStage !== 'all') queryParams.append('dealStage', filterDealStage);
      if (searchQuery) queryParams.append('search', searchQuery);

      const response = await api.get<Contact[] | { contacts: Contact[] }>(`/api/contacts?${queryParams.toString()}`);
      console.log('[ContactsPage] API Response:', response.data);
      const contactsData = Array.isArray(response.data)
        ? response.data
        : (response.data as any).contacts || [];
      console.log('[ContactsPage] Contacts extracted:', contactsData.length);

      // Fetch real engagement scores from Zena's backend AI brain
      let enrichedContacts = contactsData;

      if (contactsData.length > 0) {
        try {
          const contactIds = contactsData.map((c: Contact) => c.id);
          console.log('[ContactsPage] Fetching real engagement scores from Zena brain...');
          const engagementResponse = await api.post<{ engagementData: Record<string, any> }>('/api/contacts/batch-engagement', { contactIds });

          if (engagementResponse.data?.engagementData) {
            console.log('[ContactsPage] Received real engagement data for', Object.keys(engagementResponse.data.engagementData).length, 'contacts');

            // Identify contacts with missing intelligence (Optional: can still highlight in UI, but discovery is now throttled)
            const contactsRequiringDiscovery = contactsData.filter((c: Contact) =>
              !c.intelligenceSnippet || c.intelligenceSnippet.includes('analyzing')
            );

            // Merge real engagement scores with contacts
            enrichedContacts = contactsData.map((contact: Contact) => {
              const realEngagement = engagementResponse.data.engagementData[contact.id];
              if (realEngagement) {
                return {
                  ...contact,
                  engagementScore: realEngagement.engagementScore,
                  engagementVelocity: realEngagement.momentum,
                  dealStage: realEngagement.dealStage || contact.dealStage,
                  scoringData: {
                    intelScore: realEngagement.engagementScore,
                    momentum: realEngagement.momentum,
                    dealStage: realEngagement.dealStage,
                    isOnTrack: realEngagement.engagementScore >= 50,
                    adjustedTarget: 70,
                    stageContext: 'Real-time Zena Intelligence',
                    reasoning: contact.engagementReasoning || realEngagement.reasoning,
                    improvementTips: []
                  } as EngagementScore
                };
              }
              // Return contact with default scores if no engagement data yet
              return {
                ...contact,
                engagementScore: contact.engagementScore || 0,
                engagementVelocity: contact.engagementVelocity || 0,
                scoringData: {
                  intelScore: contact.engagementScore || 0,
                  momentum: 0,
                  dealStage: contact.dealStage || 'none',
                  isOnTrack: false,
                  adjustedTarget: 70,
                  stageContext: 'Awaiting Zena analysis...',
                  improvementTips: ['Zena is analysing this contact']
                } as EngagementScore
              };
            });
          }
        } catch (engagementErr) {
          console.warn('[ContactsPage] Failed to fetch real engagement data:', engagementErr);
          // Show contacts with placeholder scores
          enrichedContacts = contactsData.map((contact: Contact) => ({
            ...contact,
            engagementScore: contact.engagementScore || 0,
            engagementVelocity: 0,
            scoringData: {
              intelScore: 0,
              momentum: 0,
              dealStage: 'none' as const,
              isOnTrack: false,
              adjustedTarget: 70,
              stageContext: 'Analysis pending...',
              improvementTips: []
            } as EngagementScore
          }));
        }
      }

      setContacts(enrichedContacts);

      // Trigger batch Oracle analysis and Relationship discovery for the current view
      if (enrichedContacts.length > 0) {
        const ids = enrichedContacts.map(c => c.id);
        batchAnalyze(ids);
        fetchRelationships(ids);
      }
    } catch (err) {
      console.error('[ContactsPage] Failed to load contacts:', err);
      setError('System sync failed. Re-attempting connection...');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSync = async () => {
    setIsRefreshing(true);
    addToast('info', 'Contacting Zena brain for neural synchronization...');

    try {
      // Trigger background discovery for prioritized contacts
      const prioritizedIds = contacts.slice(0, 10).map(c => c.id);
      if (prioritizedIds.length > 0) {
        console.log('[ContactsPage] Triggering neural sync for batch:', prioritizedIds);
        // We fire and forget these to keep the UI snappy
        prioritizedIds.forEach(id => {
          api.post('/api/ask/discover', { contactId: id }).catch(() => { });
        });
      }

      await loadContacts();
    } catch (err) {
      console.error('[ContactsPage] Neural sync failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEmailSyncToCRM = async (contactId?: string) => {
    try {
      const idsToSync = contactId ? [contactId] : Array.from(selectedIds);
      if (idsToSync.length === 0) return;

      addToast('info', `Zena is syncing ${idsToSync.length} record${idsToSync.length > 1 ? 's' : ''} to your CRM via Email Bridge...`);

      // Check if user has CRM email configured
      const configRes = await api.get('/api/crm-delivery/config');
      if (!configRes.data?.crmEmail) {
        setIsCrmSetupOpen(true);
        return;
      }

      // Sync each record (in a real production app we might have a bulk endpoint, but for now we'll do them sequentially or in parallel)
      const results = await Promise.all(idsToSync.map(id => api.post(`/api/crm-delivery/sync/contact/${id}`)));

      const successCount = results.length;

      // apiClient throws on error, so if we get here all syncs succeeded
      setTargetCrm(configRes.data?.crmType || 'CRM');
      setShowSyncSuccess(true);
      addToast('success', `Successfully synced ${successCount} contact${successCount > 1 ? 's' : ''} to your CRM.`);


      clearSelection();
      // Refresh to update delta calculation
      setTimeout(() => loadContacts(), 1000);
    } catch (err: any) {
      console.error('[ContactsPage] CRM Email Sync failed:', err);
      addToast('error', err.response?.data?.error || 'Failed to sync with CRM. Check your connection.');
    }
  };

  const handleBatchAction = async (action: BatchAction) => {
    switch (action) {
      case 'delete':
        await handleBatchDelete();
        break;
      case 'tag_intel':
        await handleSaveBatchTag(); // Assuming handleSaveBatchTag is the correct function for 'tag_intel'
        break;
      case 'export_crm':
        await handleExportForCRM();
        break;
      case 'email_crm':
        await handleEmailSyncToCRM();
        break;
      case 'add_to_deal':
        // Handle add to deal
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
      addToast('success', `Successfully applied intelligence to ${ids.length} records.`);
      setIsTagModalOpen(false);
      clearSelection();
      loadContacts(); // Refresh list to reflect updates
    } catch (err) {
      console.error('[ContactsPage] Bulk update failed:', err);
      addToast('error', 'System failed to apply batch intelligence.');
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
      addToast('success', `Successfully purged ${count} contact record${count > 1 ? 's' : ''}.`);
      clearSelection();
    } catch (err) {
      console.error('[ContactsPage] Failed to bulk delete contacts:', err);
      addToast('error', 'System failed to execute bulk purge. Please try again.');
    }
  };

  /**
   * Export selected contacts (or all if none selected) as CRM-ready CSV
   * Uses backend service to ensure sync timestamps are recorded
   */
  const handleExportForCRM = async () => {
    try {
      addToast('info', 'Zena is generating your CRM export...');

      // Get record IDs if selected, otherwise undefined (export all)
      const recordIds = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;

      const response = await api.post<{ exportId: string }>('/api/export/contacts', {
        format: 'csv',
        recordIds
      });

      const { exportId } = response.data;

      // Clear selection immediately
      if (selectedIds.size > 0) {
        clearSelection();
      }

      // Wait for backend processing (simulated 2s) and refresh
      // This ensures deltaCount disappears because lastCrmExportAt is updated in DB
      setTimeout(async () => {
        try {
          // Check status and trigger download
          const statusRes = await api.get<{ status: string, fileUrl: string }>(`/api/export/${exportId}`);
          if (statusRes.data.status === 'completed') {
            // Trigger download via blob fetch (to include Auth header)
            const downloadUrl = `/api/export/${exportId}/download`;
            const blobRes = await api.get(downloadUrl, { responseType: 'blob' });

            const blob = new Blob([blobRes.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Contacts_Export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            addToast('success', 'Export complete. Syncing delta ledger...');
            await loadContacts(); // REFRESH STATE
          }
        } catch (e) {
          console.error('[ContactsPage] Poll export error:', e);
          // Still refresh even if download trigger fails
          await loadContacts();
        }
      }, 2500);

    } catch (err) {
      console.error('[ContactsPage] Export for CRM failed:', err);
      addToast('error', 'Export failed. Please try again.');
    }
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredContacts = useMemo(() => {
    let list = [...contacts];

    // 1. Filter by Role
    if (filterRole !== 'all') {
      list = list.filter(c => c.role === filterRole);
    }


    // 3. Filter by Search Query (Keywords from Smart Search)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.emails.some(e => e.toLowerCase().includes(q)) ||
        (c.intelligenceSnippet && c.intelligenceSnippet.toLowerCase().includes(q)) ||
        (c.lastActivityDetail && c.lastActivityDetail.toLowerCase().includes(q))
      );
    }

    // 4. Sort Alphabetically
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, filterRole, predictions, searchQuery]);

  // Delta Detection: Count contacts updated since last export (CSV or Email)
  const deltaCountSet = useMemo(() => {
    return new Set(contacts.filter(c => {
      // Get the most recent export time (either CSV or Email)
      const lastExportAt = c.lastCrmExportAt || c.lastCsvExportAt
        ? Math.max(
          c.lastCrmExportAt ? new Date(c.lastCrmExportAt).getTime() : 0,
          c.lastCsvExportAt ? new Date(c.lastCsvExportAt).getTime() : 0
        )
        : null;

      if (!lastExportAt) return true; // Never exported

      // Buffer of 2 seconds to account for server processing time / clock drift
      const updateTime = new Date(c.updatedAt).getTime();
      return updateTime > lastExportAt + 2000;
    }).map(c => c.id));
  }, [contacts]);


  const deltaCount = deltaCountSet.size;


  const getTopOracleSignal = (contactId: string) => {
    const pred = predictions[contactId];
    if (!pred) return null;

    if (pred.sellProbability && pred.sellProbability > 0.6) {
      return { label: 'Likely Seller', score: pred.sellProbability, type: 'sell' };
    }
    if (pred.churnRisk && pred.churnRisk > 0.7) {
      return { label: 'High Churn Risk', score: pred.churnRisk, type: 'risk' };
    }
    if (pred.buyProbability && pred.buyProbability > 0.6) {
      return { label: 'Active Buyer', score: pred.buyProbability, type: 'buy' };
    }
    return null;
  };

  return (
    <div className="contacts-page" data-godmode={godmodeSettings.mode}>
      <AmbientBackground variant="default" showParticles={true} />

      <div className="contacts-page__container">
        {/* God Mode System Overlay - Explains Value Add */}
        <div className={`godmode-system-status ${godmodeSettings.mode}`}>
          <div className="godmode-status-content">
            <Zap size={16} className="godmode-icon" />
            <div className="godmode-info">
              <span className="godmode-title">
                {godmodeSettings.mode === 'full_god' ? 'God Mode Active' :
                  godmodeSettings.mode === 'demi_god' ? 'Demi-God Mode Active' : 'Normal Mode'}
              </span>
              <span className="godmode-description">
                {godmodeSettings.mode === 'full_god'
                  ? 'Zena is fully autonomous. High-confidence actions are executed automatically 24/7.'
                  : godmodeSettings.mode === 'demi_god'
                    ? 'Zena is proactively drafting actions for your review. You retain full control.'
                    : 'Background scanning disabled. Suggested actions will appear for manual trigger.'}
              </span>
            </div>
          </div>
          <div className="godmode-banner-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('zena-show-godmode-history'))}
              className="godmode-banner-btn"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
            >
              <Clock size={14} />
              View God Mode Activity
            </button>
            <div className="godmode-pulse-indicator" />
          </div>
        </div>

        <header className="contacts-page__header">
          <div className="contacts-page__title-group">
            <span className="contacts-page__subtitle">ZENA RELATIONSHIP INTELLIGENCE</span>
            <h1 className="contacts-page__title">Contacts</h1>
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

            <button
              className={`contacts-page__action-btn contacts-page__export-crm-btn ${deltaCount > 0 ? 'pulsating' : ''}`}
              onClick={deltaCount > 0 ? () => {
                // If deltas exist, select them and enter batch mode
                const newSelected = new Set(contacts.filter(c => deltaCountSet.has(c.id)).map(c => c.id));
                setSelectedIds(newSelected);
                setIsBatchMode(true);
                setBatchModeType('export');
                addToast('info', `${deltaCount} updated contacts selected for CRM export.`);
              } : () => {
                setIsBatchMode(true);
                setBatchModeType('export');
              }}
              title={deltaCount > 0 ? `${deltaCount} deltas detected. Click to select and export.` : "Export contacts to CRM"}
            >
              <Download size={18} />
              <span>Export to CRM</span>
              {deltaCount > 0 && <span className="delta-badge">{deltaCount}</span>}
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
              onClick={handleSync}
              disabled={isRefreshing}
            >
              <RefreshCw size={18} className={isRefreshing ? 'contacts-page__spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            {/* Oracle & Godmode Controls */}
            <div className="contacts-page__godmode-controls">
              <GodmodeToggle compact />
              {pendingCount > 0 && (
                <button
                  className="contacts-page__pending-actions-btn"
                  onClick={() => setIsActionQueueOpen(true)}
                >
                  ⚡ {pendingCount} Pending Actions
                </button>
              )}
            </div>
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
              disabled={isAnalyzingQuery}
              title="Ask Zena to filter results"
            >
              <Sparkles size={16} />
              <span>Ask Zena</span>
            </button>
            <button
              className="reset-filters-btn"
              onClick={() => {
                setSearchQuery('');
                setFilterRole('all');
                setFilterDealStage('all');
                setIsSmartSearchActive(false);
                setSmartSearchInsight(null);
                setSmartSearchRichResponse(null);
                setExecutedQuery(null);
                // Clear persistence
                sessionStorage.removeItem('zenaContactSearchState');
              }}
              title="Reset all filters and show all contacts"
            >
              <RefreshCw size={16} />
              <span>Reset Filters</span>
            </button>
          </div>

          {/* GLOBAL PROACTIVITY: Proactive Intent Suggestion Banner */}
          {proactiveSuggestion && (
            <div className="proactive-suggestion-banner" style={{
              marginTop: '12px',
              padding: '14px 18px',
              background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 212, 255, 0.08))',
              border: '1px solid rgba(0, 255, 136, 0.4)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              animation: 'fadeSlideIn 0.3s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Sparkles size={18} style={{ color: '#00FF88' }} />
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
                  {proactiveSuggestion.message}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleProactiveSuggestionClick}
                  style={{
                    padding: '8px 18px',
                    background: 'linear-gradient(135deg, #00FF88, #00D4FF)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#0a1628',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={14} />
                  Add Contact
                </button>
                <button
                  onClick={() => setProactiveSuggestion(null)}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* AI Spotlight Rich Answer */}
          {isSmartSearchActive && smartSearchRichResponse && (
            <div className="contacts-page__ai-spotlight">
              {executedQuery && (
                <div className="ai-spotlight__query">
                  <span className="query-label">Your Question:</span> "{executedQuery}"
                </div>
              )}
              <div className="ai-spotlight__header">
                <div className="ai-spotlight__title">
                  <Sparkles size={16} className="ai-spotlight__icon" />
                  <span>Zena Intelligence Spotlight</span>
                </div>
                {smartSearchInsight && (
                  <div className="ai-spotlight__badge">
                    {smartSearchInsight}
                  </div>
                )}
              </div>
              <div className="ai-spotlight__content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Helper to match and linkify contact names within text
                    p: ({ children }) => {
                      if (typeof children === 'string') {
                        const contact = contacts.find(c => children.includes(c.name));
                        if (contact) {
                          const parts = children.split(contact.name);
                          return (
                            <p>
                              {parts[0]}
                              <span
                                className="ai-spotlight__contact-link"
                                onClick={() => navigate(`/contacts/${contact.id}`)}
                              >
                                {contact.name}
                              </span>
                              {parts.slice(1).join(contact.name)}
                            </p>
                          );
                        }
                      }
                      return <p>{children}</p>;
                    },
                    li: ({ children }) => {
                      // Extract text content recursively if needed, simpler for now
                      const text = React.Children.toArray(children).join('');
                      const contact = contacts.find(c => text.includes(c.name));
                      if (contact) {
                        const parts = text.split(contact.name);
                        return (
                          <li>
                            {parts[0]}
                            <span
                              className="ai-spotlight__contact-link"
                              onClick={() => navigate(`/contacts/${contact.id}`)}
                            >
                              {contact.name}
                            </span>
                            {parts.slice(1).join(contact.name)}
                          </li>
                        );
                      }
                      return <li>{children}</li>;
                    },
                    strong: ({ children }) => {
                      const text = String(children);
                      const contact = contacts.find(c => text.includes(c.name));
                      if (contact) {
                        return (
                          <strong
                            className="ai-spotlight__contact-link"
                            onClick={() => navigate(`/contacts/${contact.id}`)}
                          >
                            {children}
                          </strong>
                        );
                      }
                      return <strong>{children}</strong>;
                    }
                  }}
                >
                  {smartSearchRichResponse}
                </ReactMarkdown>
              </div>
            </div>
          )}
          {isSmartSearchActive && !smartSearchRichResponse && (
            <div className="smart-search-badge">
              <Sparkles size={12} />
              <span>{smartSearchInsight || "Semantic Filters Active"}</span>
              <button title="Clear filters" onClick={() => {
                setIsSmartSearchActive(false);
                setFilterRole('all');
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
                          navigate(`/contacts/${contact.id}`, { state: { from: location.pathname + location.search, label: 'Contacts' } });
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
                          className={`contact-list-item__avatar ${nurtureScores[contact.id]?.status === 'stale' ? 'nurture-stale' :
                              nurtureScores[contact.id]?.status === 'cold' ? 'nurture-cold' : ''
                            }`}
                          style={{
                            '--heat-score': `${contact.engagementScore}%`,
                            '--heat-score-decimal': (contact.engagementScore || 0) / 100,
                            ...(nurtureScores[contact.id]?.status === 'stale' ? {
                              boxShadow: '0 0 12px 3px rgba(255, 100, 100, 0.6), 0 0 20px 6px rgba(255, 50, 50, 0.3)'
                            } : nurtureScores[contact.id]?.status === 'cold' ? {
                              boxShadow: '0 0 10px 2px rgba(255, 180, 0, 0.5), 0 0 16px 4px rgba(255, 150, 0, 0.2)'
                            } : {})
                          } as any}
                          title={nurtureScores[contact.id]?.recommendation || ''}
                        >
                          {getInitials(contact.name)}
                        </div>
                        <div className="name-with-score">
                          <span>{contact.name}</span>
                          <div className="score-velocity-row">

                            {discoveryStates[contact.id] === 'started' && (
                              <span className="discovery-status-badge" title="Zena is researching this contact in the background">
                                <Loader2 size={10} className="spinning" />
                                <span>Brain thinking...</span>
                              </span>
                            )}
                            {getTopOracleSignal(contact.id) && (
                              <span className={`oracle-signal-badge ${getTopOracleSignal(contact.id)?.type}`}>
                                {getTopOracleSignal(contact.id)?.label} ({Math.round((getTopOracleSignal(contact.id)?.score || 0) * 100)}%)
                              </span>
                            )}
                            {/* Oracle Personality Badge */}
                            <OracleBadge
                              contactId={contact.id}
                              prediction={predictions[contact.id]}
                              compact
                              onAnalyze={() => fetchPrediction(contact.id)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="contact-list-item__role">
                        <span className="role-tag" style={{ borderLeftColor: config.color }}>{config.label}</span>
                        {/* GLOBAL PROACTIVITY: Role Suggestion Badge */}
                        {roleSuggestions[contact.id]?.shouldSuggest && (
                          <button
                            className="role-suggestion-badge"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRoleSuggestionClick(contact.id, roleSuggestions[contact.id].suggestedRole!);
                            }}
                            title={roleSuggestions[contact.id].reason}
                            style={{
                              marginLeft: '8px',
                              padding: '3px 8px',
                              background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 212, 255, 0.1))',
                              border: '1px solid rgba(0, 255, 136, 0.4)',
                              borderRadius: '6px',
                              color: '#00FF88',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Sparkles size={10} />
                            → {ROLE_CONFIG[roleSuggestions[contact.id].suggestedRole!]?.label || roleSuggestions[contact.id].suggestedRole}
                          </button>
                        )}
                      </div>
                      <div className="contact-list-item__email">
                        {contact.emails[0] || '-'}
                      </div>
                      <div className="contact-list-item__activity">
                        <div className="activity-pulse-dot" />
                        <span className="activity-text">{contact.lastActivityDetail}</span>

                        {relationships[contact.id] && relationships[contact.id].length > 0 && (
                          <div className="relationship-tag">
                            <Users size={10} /> {relationships[contact.id][0].context}
                          </div>
                        )}
                        <div className="intelligence-preview">
                          <Shield size={12} /> {contact.intelligenceSnippet}
                        </div>
                      </div>
                      <div className="contact-list-item__actions" onClick={e => e.stopPropagation()}>
                        {pendingActionContactIds.has(contact.id) && (
                          <button
                            className="pending-approval-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsActionQueueOpen(true);
                            }}
                            title="Review Demi-God drafted action"
                          >
                            <Zap size={12} fill="currentColor" />
                            <span>Pending Approval</span>
                          </button>
                        )}
                        <button className="improvements-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenContactIntel(contact);
                          }}
                          title="Open Intelligence Hub"
                        >
                          <Zap size={12} />
                          <span>3 Improvements</span>
                        </button>
                        <div className="action-icons-row">
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
                        navigate(`/contacts/${contact.id}`, { state: { from: location.pathname + location.search, label: 'Contacts' } });
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
                        <div
                          className="contact-card__avatar"
                          style={{
                            '--heat-score-decimal': (contact.engagementScore || 0) / 100
                          } as any}
                        >
                          {getInitials(contact.name)}
                        </div>
                        <div className="contact-card__name-role">
                          <h3 className="contact-card__name">{contact.name}</h3>
                          <div className="role-heat-row">
                            <span className="contact-card__role">{config.label}</span>
                            {getTopOracleSignal(contact.id) && (
                              <span className={`oracle-signal-badge tiny ${getTopOracleSignal(contact.id)?.type}`}>
                                {getTopOracleSignal(contact.id)?.label}
                              </span>
                            )}
                            {discoveryStates[contact.id] === 'started' && (
                              <span className="discovery-status-badge tiny">
                                <Loader2 size={8} className="spinning" />
                                <span>Researching...</span>
                              </span>
                            )}
                            {contact.zenaCategory && contact.zenaCategory !== 'PULSE' && (
                              <span
                                className="category-badge"
                                style={{ borderColor: CATEGORY_BADGE_CONFIG[contact.zenaCategory]?.color }}
                                title={CATEGORY_BADGE_CONFIG[contact.zenaCategory]?.label}
                              >
                                {CATEGORY_BADGE_CONFIG[contact.zenaCategory]?.emoji}
                              </span>
                            )}

                          </div>
                        </div>
                      </div>
                      <div className="contact-card__quick-actions" onClick={e => e.stopPropagation()}>
                        {pendingActionContactIds.has(contact.id) && (
                          <button className="icon-action-btn pending-approval-icon" onClick={() => setIsActionQueueOpen(true)} title="Review Demi-God drafted action">
                            <Zap size={16} fill="currentColor" />
                          </button>
                        )}
                        <button className="icon-action-btn improvements-icon" onClick={() => handleOpenContactIntel(contact)} title="Open Intelligence Hub">
                          <Zap size={16} />
                        </button>
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
                  </div>
                );
              })}
            </div>
          </div>
        )
        }
      </div>

      {
        showComposeModal && (
          <ZenaBatchComposeModal
            selectedContacts={selectedContacts}
            onClose={() => {
              setShowComposeModal(false);
              setTargetContact(null);
              setDraftSubject('');
              setDraftMessage('');
              setComposeContext('');
            }}
            initialSubject={draftSubject}
            initialMessage={draftMessage}
            initialActionContext={composeContext || undefined}
            oraclePredictions={predictions}
          />
        )
      }

      {
        isNewContactModalOpen && (
          <NewContactModal
            isOpen={isNewContactModalOpen}
            onClose={() => {
              setIsNewContactModalOpen(false);
              setNewContactPrefill(null); // Clear prefill on close
            }}
            onSave={handleSaveContact}
            initialData={newContactPrefill}
            title={newContactPrefill?.name ? `Add Contact: ${newContactPrefill.name}` : 'Add New Contact'}
          />
        )
      }

      {
        isBatchMode && createPortal(
          <BatchActionBar
            selectedCount={selectedIds.size}
            isVisible={isBatchMode}
            onAction={handleBatchAction as any}
            onCancel={clearSelection}
            className={batchModeType === 'export' ? 'batch-action-bar--export-mode' : ''}
            actions={batchModeType === 'export' ? ['export_crm', 'email_crm'] : ['tag_intel', 'export_crm', 'email_crm', 'delete']}
          />,
          document.body
        )
      }

      <ZenaBatchTagModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        onSave={handleSaveBatchTag}
        selectedCount={selectedIds.size}
      />

      <ToastContainer
        toasts={actionState.toasts}
        onDismiss={dismissToast}
      />

      <CrmQuickSetupModal
        isOpen={isCrmSetupOpen}
        onClose={() => setIsCrmSetupOpen(false)}
        onSuccess={() => {
          setIsCrmSetupOpen(false);
          addToast('success', 'CRM Bridge configured! You can now sync records.');
        }}
        addToast={addToast}
      />

      <CrmSuccessOverlay
        isVisible={showSyncSuccess}
        crmType={targetCrm}
        onClose={() => setShowSyncSuccess(false)}
      />
      {/* Godmode Action Approval Queue */}
      <ActionApprovalQueue
        isOpen={isActionQueueOpen}
        onClose={() => setIsActionQueueOpen(false)}
        onActionTaken={fetchPendingActions}
      />

      <ContactIntelligenceModal
        isOpen={isIntelModalOpen}
        onClose={() => setIsIntelModalOpen(false)}
        contactId={selectedContactForIntel?.id || ''}
        contactName={selectedContactForIntel?.name || ''}
        contactRole={selectedContactForIntel?.role || 'other'}
        intelScore={selectedContactForIntel?.engagementScore || selectedContactForIntel?.scoringData?.intelScore || 0}
        momentumVelocity={selectedContactForIntel?.engagementVelocity || selectedContactForIntel?.scoringData?.momentum || 0}
        onExecuteStrategy={handleExecuteContactStrategy}
        onImproveNow={(action) => {
          handleOpenCompose(
            selectedContactForIntel!,
            action.title,
            '',
            `Improvement Action: ${action.title}. Recommended by Zena.`
          );
          setIsIntelModalOpen(false);
        }}
      />

    </div >
  );
};
