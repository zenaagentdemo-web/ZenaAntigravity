import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createPortal } from 'react-dom';
import { useThreadActions } from '../../hooks/useThreadActions'; // Added for toasts

import {
  Home,
  Search,
  RefreshCw,
  Phone,
  Calendar,
  LayoutGrid,
  List,
  Plus,
  Building2,
  MapPin,
  DollarSign,
  BedDouble,
  Bath,
  Maximize,
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
  Sparkles,
  CheckSquare,
  Loader2,
  X,
  Zap,
  Shield
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import { BatchActionBar } from '../../components/BatchActionBar/BatchActionBar';
import { ZenaCallTooltip } from '../../components/ZenaCallTooltip/ZenaCallTooltip';
import { AddPropertyModal } from '../../components/AddPropertyModal/AddPropertyModal';
import { ZenaBatchComposeModal, ContactForCompose } from '../../components/ZenaBatchComposeModal/ZenaBatchComposeModal';
import { ZenaBatchPropertyTagModal } from '../../components/ZenaBatchPropertyTagModal/ZenaBatchPropertyTagModal';
import { SmartMatchModal } from '../../components/SmartMatchModal/SmartMatchModal';
import { ScheduleOpenHomeModal } from '../../components/ScheduleOpenHomeModal/ScheduleOpenHomeModal';
import { PropertyIntelligenceModal, StrategicAction } from '../../components/PropertyIntelligenceModal/PropertyIntelligenceModal';
import { GodmodeToggle } from '../../components/GodmodeToggle/GodmodeToggle';
import { ActionApprovalQueue } from '../../components/ActionApprovalQueue/ActionApprovalQueue';
import { ComparableReportModal } from '../../components/ComparableReportModal/ComparableReportModal';
import { usePropertyIntelligence, SuggestedAction } from '../../hooks/usePropertyIntelligence';
import { useGodmode } from '../../hooks/useGodmode';
// PropertyIntelScoreTooltip replaced by unified PropertyIntelligenceModal
import './PropertiesPage.css';

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
  type?: 'residential' | 'commercial' | 'land';
  status?: 'active' | 'under_contract' | 'sold' | 'withdrawn';
  listingPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  landSize?: number;
  dealId?: string;
  milestones: Array<{
    id: string;
    type: string;
    title: string;
    date: string;
  }>;
  createdAt: string;
  updatedAt: string;
  vendors?: Contact[];
  buyers?: Contact[];
  vendorName?: string;
  momentumScore?: number;
  buyerMatchCount?: number;
  listingDate?: string;
  rateableValue?: number;
  viewingCount?: number;
  inquiryCount?: number;
  suggestedActions?: RecommendedAction[];
  heatLevel?: 'hot' | 'active' | 'cold';
  heatReasoning?: string;
  lastActivityDetail?: string;
}

type RecommendedAction = SuggestedAction | string;

const STATUS_CONFIG: Record<string, { label: string, color: string, glow: string, bg: string, icon: string }> = {
  active: {
    label: 'Active',
    color: '#00FF88',
    glow: 'rgba(0, 255, 136, 0.5)',
    bg: 'rgba(0, 255, 136, 0.15)',
    icon: '🟢'
  },
  under_contract: {
    label: 'Under Contract',
    color: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.5)',
    bg: 'rgba(255, 215, 0, 0.15)',
    icon: '🟡'
  },
  sold: {
    label: 'Sold',
    color: '#FF6B6B',
    glow: 'rgba(255, 107, 107, 0.5)',
    bg: 'rgba(255, 107, 107, 0.15)',
    icon: '🔴'
  },
  withdrawn: {
    label: 'Withdrawn',
    color: '#888888',
    glow: 'rgba(136, 136, 136, 0.5)',
    bg: 'rgba(136, 136, 136, 0.15)',
    icon: '⚫'
  }
};


// Client-side cache for instant rendering
let cachedProperties: Property[] | null = null;
let cachedMarketPulse: any = null;

export const PropertiesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useThreadActions();
  // Helper for lazy state initialization
  const getPersistedState = (key: string, defaultValue: any) => {
    try {
      const saved = sessionStorage.getItem('zenaPropertySearchState');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed[key] !== undefined ? parsed[key] : defaultValue;
      }
    } catch (e) {
      console.warn('Failed to parse persisted state', e);
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

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [properties, setProperties] = useState<Property[]>(cachedProperties || []);
  const [loading, setLoading] = useState(!cachedProperties);
  const [error, setError] = useState<string | null>(null);

  // Persisted Inputs
  const [filterStatus, setFilterStatus] = useState<string>(() => getPersistedState('filterStatus', 'all'));
  const [searchQuery, setSearchQuery] = useState(() => getPersistedState('searchQuery', ''));

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState<{ subject: string; body: string } | null>(null);
  const [composeContext, setComposeContext] = useState<string | null>(null);

  // Smart Search State (Persisted)
  const [isAnalyzingQuery, setIsAnalyzingQuery] = useState(false);
  const [isSmartSearchActive, setIsSmartSearchActive] = useState(() => getPersistedState('isSmartSearchActive', false));
  const [smartSearchInsight, setSmartSearchInsight] = useState<string | null>(() => getPersistedState('smartSearchInsight', null));
  const [smartSearchRichResponse, setSmartSearchRichResponse] = useState<string | null>(() => getPersistedState('smartSearchRichResponse', null));
  const [filterPriceMax, setFilterPriceMax] = useState<number | null>(() => getPersistedState('filterPriceMax', null));
  const [executedQuery, setExecutedQuery] = useState<string | null>(() => getPersistedState('executedQuery', null));

  // Insight Filter State (Persisted)
  const [showOnlyOpenHomes, setShowOnlyOpenHomes] = useState<boolean>(() => getPersistedState('showOnlyOpenHomes', false));
  const [marketPulse, setMarketPulse] = useState<any>(cachedMarketPulse); // Store server market pulse

  // Schedule Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleModalProperty, setScheduleModalProperty] = useState<Property | undefined>(undefined);


  // Zena Actions Modal State
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [selectedPropertyForActions, setSelectedPropertyForActions] = useState<Property | null>(null);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [freshActions, setFreshActions] = useState<SuggestedAction[] | null>(null);

  // Oracle & Godmode State
  const [isActionQueueOpen, setIsActionQueueOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalData, setReportModalData] = useState<{ address: string; bedrooms?: number } | null>(null);
  const { settings: godmodeSettings, pendingActions, pendingCount, fetchPendingActions } = useGodmode();

  const pendingActionPropertyIds = useMemo(() => {
    return new Set(pendingActions?.filter(a => a.propertyId).map(a => a.propertyId!) || []);
  }, [pendingActions]);

  const handleOpenActions = async (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPropertyForActions(property);
    setFreshActions(null); // Clear previous actions
    setIsActionsModalOpen(true);
    setIsLoadingActions(true);

    try {
      // Trigger a neural pulse to get fresh, data-driven reasoning
      const prediction = await refreshIntelligence(property.id);
      if (prediction && Array.isArray(prediction.suggestedActions)) {
        setFreshActions(prediction.suggestedActions as SuggestedAction[]);
      }
    } catch (err) {
      console.error('[ZenaBrain] Failed to refresh intelligence for actions:', err);
    } finally {
      setIsLoadingActions(false);
    }
  };

  const handleExecuteAction = (action: string, reasoning: string) => {
    // If it's a communication executing, pre-fill compose
    setIsActionsModalOpen(false);

    if (selectedPropertyForActions) {
      const address = selectedPropertyForActions.address;
      // Construct a rich context that Zena AI will use to draft the email
      const richContext = `Strategy: ${action}. \nContext for ${address}: ${reasoning}`;

      setComposeContext(richContext);
      setComposeInitialData({ subject: `Strategic Update: ${action}`, body: '' }); // Body empty triggers AI generation

      if (selectedPropertyForActions.vendors && selectedPropertyForActions.vendors.length > 0) {
        // Automatically select the property and its vendor
        setSelectedIds(new Set([selectedPropertyForActions.id]));
        setIsComposeModalOpen(true);
      } else {
        // Fallback if no vendor (though unlikely for a live listing)
        setIsComposeModalOpen(true);
      }

      // Record the action (use first vendor's ID as the contact)
      const vendorContact = selectedPropertyForActions.vendors?.[0];
      if (vendorContact) {
        api.post('/api/ask/record-action', {
          contactId: vendorContact.id,
          actionType: 'email',
          actionDescription: `Property Strategy: ${action} for ${address}`
        }).catch(err => console.error('Failed to record action:', err));
      }
    }
  };

  // State Persistence: Save state on change
  useEffect(() => {
    const state = {
      searchQuery,
      filterStatus,
      filterPriceMax,
      smartSearchRichResponse,
      smartSearchInsight,
      isSmartSearchActive,
      showOnlyOpenHomes,
      executedQuery
    };
    // Save state to sessionStorage
    sessionStorage.setItem('zenaPropertySearchState', JSON.stringify(state));
  }, [searchQuery, filterStatus, filterPriceMax, smartSearchRichResponse, smartSearchInsight, isSmartSearchActive, showOnlyOpenHomes, executedQuery]);


  // Reuse existing compose logic or creating a bridge if needed
  // Note: handleOpenCompose isn't exposed or defined in this file yet (it's in ContactsPage maybe? Or we need to implement it here)
  // Checking existing code... setIsComposeModalOpen is here.

  const handleOpenCompose = (contact?: Contact) => {
    // In properties page, the BatchComposeModal usually typically takes a LIST of contacts.
    // But we can adapt it or just use it as is.
    // The current ZenaBatchComposeModal likely expects 'selectedVendorsForCompose'.
    // We might need to override the selection if executing a single action.
    // For simplicity in this step, let's just open the compose modal and let the user know.
    setIsComposeModalOpen(true);
    // Ideally we would select this property's vendor.
    if (contact) {
      setSelectedIds(new Set([selectedPropertyForActions!.id]));
    }
  };

  const handleImproveNow = async (propertyId: string, contextOrDraft: string | { subject: string; body: string }) => {
    try {
      // 1. Mark as batch mode but for this specific property
      setSelectedIds(new Set([propertyId]));

      if (typeof contextOrDraft === 'string') {
        const fakeDraft = {
          subject: 'Property Strategy Update',
          body: '' // The modal will generate this based on context
        };
        setComposeInitialData(fakeDraft);
        setComposeContext(contextOrDraft);
      } else {
        setComposeInitialData(contextOrDraft);
        setComposeContext(null);
      }

      setIsComposeModalOpen(true);

      // 2. Record the action execution in background
      api.post('/api/ask/record-action', {
        actionType: 'email',
        entityType: 'property',
        entityId: propertyId,
        metadata: { contextOrDraft }
      }).catch(err => console.error('Failed to record action:', err));

      addToast('Zena is drafting your specific improvements.', 'success');
    } catch (err) {
      console.error('Failed to initiate Improvement Action:', err);
      addToast('Failed to start improvement action.', 'error');
    }
  };

  // Zena Intelligence Hooks
  const { lastPropertyUpdate, getIntelligence, refreshIntelligence } = usePropertyIntelligence();

  // Listen for real-time property intelligence updates

  // Listen for real-time property intelligence updates
  useEffect(() => {
    if (lastPropertyUpdate) {
      setProperties(prev => prev.map(p => {
        if (p.id === lastPropertyUpdate.propertyId) {
          const pred = lastPropertyUpdate.prediction;
          return {
            ...p,
            momentumScore: pred.momentumScore,
            suggestedActions: pred.suggestedActions,
            // Map 'Hot' | 'High' etc to a buyer match count proxy if needed, or better, add real matches
            // For now, let's keep match count separate but update momentum
            // If we had buyerMatchCount in prediction, we'd use it. 
            // We can infer heat from interestLevel
          };
        }
        return p;
      }));
    }
  }, [lastPropertyUpdate]);

  useEffect(() => {
    loadProperties();
    // Trigger throttled Godmode heartbeat on page mount
    api.post('/api/godmode/heartbeat').catch(err =>
      console.warn('[PropertiesPage] Heartbeat failed', err)
    );
  }, [filterStatus]);

  const loadProperties = async () => {
    try {
      // Only show loading if we have no cached data (optimistic rendering)
      if (!cachedProperties || cachedProperties.length === 0) {
        setLoading(true);
      }
      setError(null);
      const response = await api.get<Property[] | { properties: Property[] }>('/api/properties');
      const propertiesData = Array.isArray(response.data)
        ? response.data
        : (response.data as any).properties || [];

      // Remove Mock Data Injection. 
      // Instead, we will async fetch intelligence for visible properties if needed.
      // For now, load raw properties. Intelligence will hydrate via getIntelligence or WS.

      const rawProperties = propertiesData.map((p: any) => ({
        ...p,
        // Keep vendorName fallback for now if relation is missing, or backend provides it
        vendorName: p.vendorName || (p.vendors && p.vendors.length > 0 ? p.vendors[0].name : 'Unknown Vendor'),
        // Initialize scores to 0/neutral until fetched
        momentumScore: p.prediction?.momentumScore || p.momentumScore || 0,
        buyerMatchCount: p.buyerMatchCount || 0,
        suggestedActions: p.prediction?.suggestedActions || [],
        heatLevel: p.heatLevel,
        heatReasoning: p.heatReasoning
      }));

      // Set Market Pulse if available
      if ((response.data as any).marketPulse) {
        setMarketPulse((response.data as any).marketPulse);
        cachedMarketPulse = (response.data as any).marketPulse;
      }

      setProperties(rawProperties);
      cachedProperties = rawProperties;

      // Trigger lazy load of intelligence for active properties
      rawProperties.filter((p: any) => p.status === 'active').forEach(async (p: any) => {
        if (!p.prediction && !p.heatLevel) { // Only fetch if not already populated by list
          const prediction = await getIntelligence(p.id);
          if (prediction) {
            setProperties(prev => prev.map(current =>
              current.id === p.id
                ? { ...current, momentumScore: prediction.momentumScore, buyerInterestLevel: prediction.buyerInterestLevel, suggestedActions: prediction.suggestedActions }
                : current
            ));
          }
        }
      });

    } catch (err) {
      console.error('Failed to load properties:', err);
      setError('Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
      // setIsRefreshing(false); // Handled in handleRefresh to ensure min duration
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    addToast('Syncing properties with Zena brain...', 'info');

    // Ensure the spinner shows for at least 800ms for better UX
    const minWait = new Promise(resolve => setTimeout(resolve, 800));
    const loadPromise = loadProperties(true); // pass true to indicate manual refresh if needed, though loadProperties doesn't take arg yet

    await Promise.all([loadPromise, minWait]);
    setIsRefreshing(false);
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const getDaysOnMarket = (property: Property): number => {
    const startDate = property.listingDate ? new Date(property.listingDate) : new Date(property.createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Property Heat Score: Determines buyer interest level

  const getNextEvent = (property: Property): string | null => {
    if (!property.milestones || property.milestones.length === 0) return null;
    const upcoming = property.milestones
      .filter(m => new Date(m.date) > new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (upcoming.length === 0) return null;
    const next = upcoming[0];
    const date = new Date(next.date);
    return `${next.title}: ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
  };

  const getSaleDate = (property: Property): number => {
    const settledMilestone = property.milestones?.find(m => m.type === 'settled');
    if (settledMilestone) {
      return new Date(settledMilestone.date).getTime();
    }
    return new Date(property.updatedAt).getTime();
  };

  // Stats calculations
  const stats = useMemo(() => {
    const total = properties.length;
    const active = properties.filter(p => p.status === 'active').length;
    const underContract = properties.filter(p => p.status === 'under_contract').length;
    const sold = properties.filter(p => p.status === 'sold').length;
    const withdrawn = properties.filter(p => p.status === 'withdrawn').length;

    const today = new Date();
    const isToday = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
    };

    const upcomingOpenHomes = properties.filter(p => {
      return p.milestones?.some(m => {
        const type = m.type?.toLowerCase() || '';
        const title = m.title?.toLowerCase() || '';
        const isOpening = type.includes('open') || title.includes('open') || type.includes('viewing');
        return isOpening && isToday(m.date);
      });
    }).length;

    return {
      total,
      active,
      underContract,
      sold,
      withdrawn,
      upcomingOpenHomes
    };
  }, [properties]);

  // Filtered properties
  const filteredProperties = useMemo(() => {
    let filtered = properties.filter(property => {
      const matchesStatus = filterStatus === 'all' || property.status === filterStatus;
      const matchesSearch = property.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPrice = !filterPriceMax || (property.listingPrice && property.listingPrice <= filterPriceMax);

      const today = new Date();
      const isToday = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear();
      };

      const matchesOpenHomes = !showOnlyOpenHomes || (
        property.milestones?.some(m => {
          const type = m.type?.toLowerCase() || '';
          const title = m.title?.toLowerCase() || '';
          const isOpening = type.includes('open') || title.includes('open') || type.includes('viewing');
          return isOpening && isToday(m.date);
        })
      );

      return matchesStatus && matchesSearch && matchesPrice && matchesOpenHomes;
    });


    const isTodayOpenHome = (p: Property) => {
      const today = new Date();
      return p.milestones?.some(m => {
        const d = new Date(m.date);
        const isSameDay = d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear();
        const type = m.type?.toLowerCase() || '';
        const title = m.title?.toLowerCase() || '';
        const isOpening = type.includes('open') || title.includes('open') || type.includes('viewing');
        return isOpening && isSameDay;
      });
    };

    return [...filtered].sort((a, b) => {
      // 1. Identify "Status" rank or special "Open Home" rank
      // User requested: Active > Under Contract > Sold > Withdrawn > Open Homes
      const getRank = (p: Property) => {
        if (isTodayOpenHome(p)) return 4; // Open Homes last
        const statusOrder: Record<string, number> = {
          active: 0,
          under_contract: 1,
          sold: 2,
          withdrawn: 3
        };
        return statusOrder[p.status || 'active'] ?? 3;
      };

      const rankA = getRank(a);
      const rankB = getRank(b);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // Within same status/rank, sort by date/activity
      if (a.status === 'active' || a.status === 'under_contract') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (a.status === 'sold') {
        return getSaleDate(b) - getSaleDate(a);
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [properties, filterStatus, searchQuery, showOnlyOpenHomes, filterPriceMax]);


  const handleCallVendor = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleScheduleOpenHome = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation();
    setScheduleModalProperty(property);
    setIsScheduleModalOpen(true);
  };

  // Smart Search - NLP parsing
  const handleSmartSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAnalyzingQuery(true);
    setSmartSearchRichResponse(null);
    try {
      const response = await api.post<{
        status?: string;
        type?: string;
        priceMax?: number;
        keywords?: string;
        aiInsight?: string;
        richResponse?: string;
      }>('/api/ask/property-search', { query: searchQuery });
      const result = response.data;
      if (result) {
        if (result.status && result.status !== 'all') setFilterStatus(result.status);
        if (result.priceMax) setFilterPriceMax(result.priceMax);
        // If richResponse is present, clear searchQuery to show the full property list under the Spotlight
        if (result.richResponse) {
          setSmartSearchRichResponse(result.richResponse);
          setSearchQuery(''); // Clear search bar so full list is visible
        } else if (result.keywords !== undefined) {
          setSearchQuery(result.keywords);
        }
        if (result.aiInsight) setSmartSearchInsight(result.aiInsight);
        setExecutedQuery(searchQuery);
        setIsSmartSearchActive(true);
      }
    } catch (e) {
      console.warn('Smart search not available, using basic search');
      // Fallback: try to extract keywords locally
      const keywords = searchQuery.toLowerCase();
      if (keywords.includes('stale') || keywords.includes('old')) {
        setFilterStatus('active');
        setSmartSearchInsight('Showing active listings sorted by age');
        setIsSmartSearchActive(true);
      } else if (keywords.includes('sold')) {
        setFilterStatus('sold');
        setSmartSearchInsight('Showing sold properties');
        setIsSmartSearchActive(true);
      } else if (keywords.includes('hot') || keywords.includes('popular')) {
        setFilterStatus('active');
        setSmartSearchInsight('Showing active listings with high buyer interest');
        setIsSmartSearchActive(true);
      }
    } finally {
      setIsAnalyzingQuery(false);
    }
  };

  const handleGenerateReport = async (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation();

    // Find property details
    const property = properties.find(p => p.id === propertyId);
    if (!property) {
      addToast('error', 'Property details not found');
      return;
    }

    console.log(`[PropertiesPage] handleGenerateReport triggered for property: ${property.address}`);

    // Open the modal and pass the property data
    setReportModalData({
      address: property.address,
      bedrooms: property.bedrooms
    });
    setIsReportModalOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (isSmartSearchActive) {
      setIsSmartSearchActive(false);
      setSmartSearchInsight(null);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      handleSmartSearch();
    }
  };

  const handleResetFilters = () => {
    setFilterStatus('all');
    setSearchQuery('');
    setSmartSearchInsight(null);
    setSmartSearchRichResponse(null);
    setIsSmartSearchActive(false);
    setFilterPriceMax(null);
    setShowOnlyOpenHomes(false);
    setExecutedQuery(null);
    sessionStorage.removeItem('zenaPropertySearchState');
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
    setIsBatchMode(newSelected.size > 0);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsBatchMode(false);
  };

  const handleBatchAction = async (action: string) => {
    switch (action) {
      case 'delete_all':
        if (window.confirm(`Are you sure you want to delete ${selectedIds.size} properties?`)) {
          try {
            await api.post('/api/properties/bulk-delete', { ids: Array.from(selectedIds) });
            setProperties(prev => prev.filter(p => !selectedIds.has(p.id)));
            clearSelection();
          } catch (err) {
            console.error('Batch delete failed:', err);
            alert('Failed to delete properties. Please try again.');
          }
        }
        break;
      case 'compose':
        setIsComposeModalOpen(true);
        break;
      case 'tag':
        setIsTagModalOpen(true);
        break;
      default:
        console.warn('Action not implemented:', action);
    }
  };

  // Aggregate vendors from selected properties for compose modal
  const selectedVendorsForCompose = useMemo((): ContactForCompose[] => {
    const vendorMap = new Map<string, ContactForCompose>();
    properties
      .filter(p => selectedIds.has(p.id))
      .forEach(p => {
        if (p.vendors) {
          p.vendors.forEach(v => {
            if (!vendorMap.has(v.id)) {
              vendorMap.set(v.id, {
                id: v.id,
                name: v.name,
                emails: v.emails,
                role: v.role || 'vendor'
              });
            }
          });
        }
      });
    return Array.from(vendorMap.values());
  }, [properties, selectedIds]);

  const handleTagSave = (data: { status?: string; type?: string }) => {
    // Update properties locally after successful save
    setProperties(prev => prev.map(p => {
      if (selectedIds.has(p.id)) {
        return {
          ...p,
          status: (data.status as Property['status']) || p.status
        };
      }
      return p;
    }));
    clearSelection();
  };

  return (
    <div className="properties-page" data-godmode={godmodeSettings.mode}>
      <AmbientBackground variant="default" showParticles={true} />

      <div className="properties-page__container">
        {/* God Mode System Overlay */}
        {godmodeSettings.mode !== 'off' && (
          <div className={`godmode-system-status ${godmodeSettings.mode}`} style={{
            background: godmodeSettings.mode === 'full_god' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(139, 92, 246, 0.1)',
            border: godmodeSettings.mode === 'full_god' ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(139, 92, 246, 0.3)',
            padding: '12px 20px',
            marginBottom: '20px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div className="godmode-status-content" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Zap size={18} color={godmodeSettings.mode === 'full_god' ? '#FFD700' : '#8B5CF6'} className="godmode-icon" />
              <div className="godmode-info">
                <span className="godmode-title" style={{
                  display: 'block',
                  fontWeight: 600,
                  color: godmodeSettings.mode === 'full_god' ? '#FFD700' : '#8B5CF6'
                }}>
                  {godmodeSettings.mode === 'demi_god' ? 'Demi-God Mode Active' : 'God Mode Active'}
                </span>
                <span className="godmode-description" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                  {godmodeSettings.mode === 'demi_god'
                    ? 'Zena is proactively drafting property actions for your review.'
                    : 'Zena is autonomously optimising your property portfolio.'}
                </span>
              </div>
            </div>
            <div className="godmode-banner-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('zena-show-godmode-history'))}
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
              <div className="godmode-pulse-indicator" style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: godmodeSettings.mode === 'full_god' ? '#FFD700' : '#8B5CF6',
                boxShadow: `0 0 10px ${godmodeSettings.mode === 'full_god' ? '#FFD700' : '#8B5CF6'}`
              }} />
            </div>
          </div>
        )}

        {/* Header */}
        <header className="properties-page__header">
          <div className="properties-page__title-group">
            <span className="properties-page__subtitle">Zena Property Intelligence</span>
            <h1 className="properties-page__title">Properties</h1>
          </div>
          <div className="properties-page__actions">
            <div className="properties-page__view-toggle">
              <button
                className={`properties-page__toggle-btn ${isBatchMode ? 'active' : ''}`}
                onClick={() => {
                  if (isBatchMode) clearSelection();
                  else setIsBatchMode(true);
                }}
                title="Selection Mode"
              >
                <CheckSquare size={18} />
              </button>
              <div className="toggle-separator" />
              <button
                className={`properties-page__toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                className={`properties-page__toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>
            <button
              className="properties-page__add-btn"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus size={18} />
              <span>Add Property</span>
            </button>

            <button
              className="properties-page__refresh-btn"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw size={18} className={isRefreshing ? 'properties-page__spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>

            <button
              className="properties-page__report-btn"
              onClick={() => {
                setReportModalData(null);
                setIsReportModalOpen(true);
              }}
              style={{
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                border: '1px solid rgba(0, 212, 255, 0.4)',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: '0 0 15px rgba(0, 212, 255, 0.2)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 212, 255, 0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.2)';
              }}
            >
              <TrendingUp size={18} />
              <span>Comparable Analysis Report</span>
            </button>

            {/* God Mode Controls */}
            <div className="properties-page__godmode-controls">
              <GodmodeToggle compact />
              {pendingCount > 0 && (
                <button
                  className="properties-page__pending-actions-btn"
                  onClick={() => setIsActionQueueOpen(true)}
                >
                  ⚡ {pendingCount} Pending Actions
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Quick Stats - Clickable Filter Orbs */}
        <section className="properties-page__stats">
          <div
            className={`stats-orb stats-orb--all ${filterStatus === 'all' && !showOnlyOpenHomes ? 'selected' : ''}`}
            onClick={() => {
              setFilterStatus('all');
              setShowOnlyOpenHomes(false);
            }}
          >
            <span className="stats-orb__value">{stats.total}</span>
            <span className="stats-orb__label">ALL</span>
          </div>
          <div
            className={`stats-orb stats-orb--active ${filterStatus === 'active' ? 'selected' : ''}`}
            onClick={() => {
              setFilterStatus(filterStatus === 'active' ? 'all' : 'active');
              setShowOnlyOpenHomes(false);
            }}
          >
            <span className="stats-orb__value">{stats.active}</span>
            <span className="stats-orb__label">ACTIVE</span>
          </div>
          <div
            className={`stats-orb stats-orb--contract ${filterStatus === 'under_contract' ? 'selected' : ''}`}
            onClick={() => {
              setFilterStatus(filterStatus === 'under_contract' ? 'all' : 'under_contract');
              setShowOnlyOpenHomes(false);
            }}
          >
            <span className="stats-orb__value">{stats.underContract}</span>
            <span className="stats-orb__label">UNDER CONTRACT</span>
          </div>
          <div
            className={`stats-orb stats-orb--sold ${filterStatus === 'sold' ? 'selected' : ''}`}
            onClick={() => {
              setFilterStatus(filterStatus === 'sold' ? 'all' : 'sold');
              setShowOnlyOpenHomes(false);
            }}
          >
            <span className="stats-orb__value">{stats.sold}</span>
            <span className="stats-orb__label">SOLD</span>
          </div>
          <div
            className={`stats-orb stats-orb--withdrawn ${filterStatus === 'withdrawn' ? 'selected' : ''}`}
            onClick={() => {
              setFilterStatus(filterStatus === 'withdrawn' ? 'all' : 'withdrawn');
              setShowOnlyOpenHomes(false);
            }}
          >
            <span className="stats-orb__value">{stats.withdrawn}</span>
            <span className="stats-orb__label">WITHDRAWN</span>
          </div>
          <div
            className={`stats-orb stats-orb--events ${showOnlyOpenHomes ? 'selected' : ''}`}
            onClick={() => {
              setShowOnlyOpenHomes(prev => !prev);
              setFilterStatus('all');
            }}
          >
            <span className="stats-orb__value">{stats.upcomingOpenHomes}</span>
            <span className="stats-orb__label">OPEN HOMES</span>
          </div>
        </section>

        {/* Controls */}
        <section className="properties-page__controls">
          <div className={`properties-page__search-container ${isSmartSearchActive ? 'smart-active' : ''}`}>
            {isAnalyzingQuery ? (
              <Loader2 className="properties-page__search-icon spin" size={24} />
            ) : (
              <Search className="properties-page__search-icon" size={24} />
            )}
            <input
              type="text"
              className="properties-page__search-input"
              placeholder="Search properties, suburbs, or ask Zena..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
            />

            <button
              className={`smart-search-btn ${isAnalyzingQuery ? 'analyzing' : ''}`}
              onClick={handleSmartSearch}
              disabled={isAnalyzingQuery}
            >
              <Sparkles size={18} />
              <span>Ask Zena</span>
            </button>

            <button
              className="reset-filters-btn"
              onClick={handleResetFilters}
            >
              <RefreshCw size={18} />
              <span>Reset Filters</span>
            </button>
          </div>





        </section>

        {/* AI Spotlight - Rich Markdown Response */}
        {smartSearchRichResponse && (
          <section className="properties-page__ai-spotlight">
            {executedQuery && (
              <div className="ai-spotlight__query">
                <span className="query-label">Your Question:</span> "{executedQuery}"
              </div>
            )}
            <div className="ai-spotlight__header">
              <div className="ai-spotlight__title">
                <Sparkles size={20} />
                <span>Zena Intelligence Spotlight</span>
              </div>
              <button className="ai-spotlight__close" onClick={() => setSmartSearchRichResponse(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="ai-spotlight__content markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom text renderer to make property names clickable
                  td: ({ children, ...props }) => {
                    const text = String(children);
                    // Try to match against loaded properties
                    const matchedProperty = properties.find(p => {
                      const addressParts = p.address.toLowerCase().split(/[\s,]+/);
                      const textLower = text.toLowerCase();
                      // Match if text contains suburb or street name from address
                      return addressParts.some(part => part.length > 3 && textLower.includes(part)) ||
                        textLower.includes(p.address.toLowerCase().split(',')[0]);
                    });
                    if (matchedProperty) {
                      return (
                        <td {...props}>
                          <span
                            className="ai-spotlight__property-link"
                            onClick={() => navigate(`/properties/${matchedProperty.id}`)}
                          >
                            {children}
                          </span>
                        </td>
                      );
                    }
                    return <td {...props}>{children}</td>;
                  },
                  // Also handle list items and paragraphs
                  li: ({ children, ...props }) => {
                    const text = String(children);
                    const matchedProperty = properties.find(p => {
                      const addressParts = p.address.toLowerCase().split(/[\s,]+/);
                      const textLower = text.toLowerCase();
                      return addressParts.some(part => part.length > 3 && textLower.includes(part));
                    });
                    if (matchedProperty) {
                      return (
                        <li {...props}>
                          <span
                            className="ai-spotlight__property-link"
                            onClick={() => navigate(`/properties/${matchedProperty.id}`)}
                          >
                            {children}
                          </span>
                        </li>
                      );
                    }
                    return <li {...props}>{children}</li>;
                  },
                }}
              >
                {smartSearchRichResponse}
              </ReactMarkdown>
            </div>
            <div className="ai-spotlight__footer">
              <div className="ai-spotlight__pulse" />
              <span>Real-time analysis by Zena Intelligence</span>
            </div>
          </section>
        )}

        {/* Content */}
        {loading ? (
          <div className="properties-page__loading">
            <RefreshCw className="properties-page__spin" size={48} />
            <p>Loading Properties...</p>
          </div>
        ) : error ? (
          <div className="properties-page__error">
            <AlertCircle size={48} />
            <p>{error}</p>
            <button onClick={loadProperties} className="properties-page__refresh-btn">
              Retry
            </button>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="properties-page__empty">
            <Home size={64} className="properties-page__empty-icon" />
            <h3>No properties found</h3>
            <p>Try adjusting your filters or add a new property.</p>
          </div>
        ) : (
          <>

            {/* Grid/List View */}
            <div className={`properties-page__content ${viewMode === 'list' ? 'properties-page__content--list' : ''}`}>
              {viewMode === 'list' && (
                <div className={`properties-list-header ${isBatchMode ? 'batch-mode' : ''}`}>
                  {isBatchMode && (
                    <div className="properties-list-header__check">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredProperties.length && filteredProperties.length > 0}
                        onChange={() => {
                          if (selectedIds.size === filteredProperties.length) setSelectedIds(new Set());
                          else setSelectedIds(new Set(filteredProperties.map(p => p.id)));
                        }}
                      />
                    </div>
                  )}
                  <div className="properties-list-header__status">Status</div>
                  <div className="properties-list-header__address">Address</div>
                  <div className="properties-list-header__price">Asking Price</div>
                  <div className="properties-list-header__activity">Intelligence / Activity</div>
                  <div className="properties-list-header__dom">DOM</div>
                  <div className="properties-list-header__vendor">Vendor</div>
                  <div className="properties-list-header__actions">Actions</div>
                </div>
              )}

              <div className={viewMode === 'grid' ? 'properties-page__grid' : 'properties-page__list'}>
                {filteredProperties.map(property => {
                  const statusConfig = STATUS_CONFIG[property.status || 'active'] || STATUS_CONFIG.active;
                  const daysOnMarket = getDaysOnMarket(property);
                  const nextEvent = getNextEvent(property);

                  if (viewMode === 'list') {
                    return (
                      <div
                        key={property.id}
                        className={`property-list-item ${selectedIds.has(property.id) ? ' property-list-item--selected' : ''} ${isBatchMode ? 'batch-mode' : ''}`}
                        onClick={(e) => {
                          if (isBatchMode) toggleSelection(property.id, e);
                          else navigate(`/properties/${property.id}`);
                        }}
                      >
                        {isBatchMode && (
                          <div className="property-list-item__check" onClick={e => toggleSelection(property.id, e)}>
                            <div className={`custom-checkbox ${selectedIds.has(property.id) ? 'checked' : ''}`} />
                          </div>
                        )}
                        <div className="property-list-item__status">
                          <span
                            className="status-badge"
                            style={{
                              background: statusConfig.bg,
                              color: statusConfig.color,
                              borderColor: statusConfig.color
                            }}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="property-list-item__address">
                          <div className="address-main">
                            <span>{property.address}</span>
                          </div>

                          <div className="property-specs-compact">
                            {property.bedrooms !== undefined && <span className="spec-item">{property.bedrooms} bd</span>}
                            {property.bathrooms !== undefined && <span className="spec-item">{property.bathrooms} ba</span>}
                            {property.landSize !== undefined && <span className="spec-item">{property.landSize}m²</span>}
                            <span className="spec-divider">|</span>
                            <span className="property-stats-item"><Users size={10} /> {property.inquiryCount || 0}</span>
                            <span className="property-stats-item"><MapPin size={10} /> {property.viewingCount || 0}</span>
                          </div>


                        </div>

                        <div className="property-list-item__price">
                          <div className="price-main">
                            {property.listingPrice ? formatPrice(property.listingPrice) : '-'}
                          </div>
                          {property.rateableValue && (
                            <div className="price-rv" title="Rateable Value">
                              RV: {formatPrice(property.rateableValue)}
                            </div>
                          )}
                        </div>

                        <div className="property-list-item__activity">
                          <div className="activity-pulse-dot" />
                          <span className="activity-text">{property.lastActivityDetail || 'Awaiting Zena activity scan...'}</span>

                          <div className="intelligence-preview">
                            <Shield size={12} />
                            <div className="intelligence-summary">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {(property.heatReasoning || 'Propensity analysis pending...')
                                  .split(' ||| ')[0]
                                  .split(/\*\*Verified Sources:\*\*|Verified Sources:/)[0]
                                  .trim()}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                        <div className={`property-list-item__dom ${property.status === 'active' && daysOnMarket > 21 && (property.momentumScore || 50) < 40
                          ? 'property-list-item__dom--stale'
                          : ''
                          }`}>
                          {daysOnMarket} days
                          {property.status === 'active' && daysOnMarket > 21 && (property.momentumScore || 50) < 40 && (
                            <AlertCircle
                              size={14}
                              className="stale-indicator"
                              title="Stale listing - consider price review"
                            />
                          )}
                        </div>
                        <div className="property-list-item__vendor">
                          <span className="vendor-name">
                            {property.vendors && property.vendors.length > 0
                              ? property.vendors[0].name
                              : (property.vendorName || '-')}
                          </span>
                          <span
                            className={`vendor-recency-dot ${daysOnMarket <= 7 ? 'vendor-recency-dot--recent' :
                              daysOnMarket <= 14 ? 'vendor-recency-dot--moderate' :
                                'vendor-recency-dot--stale'
                              }`}
                            title={`Last activity: ${daysOnMarket} days ago`}
                          />
                        </div>
                        <div className="property-list-item__actions" onClick={e => e.stopPropagation()}>
                          {pendingActionPropertyIds.has(property.id) && (
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
                          {property.suggestedActions && property.suggestedActions.length > 0 && (
                            <button
                              className="improvements-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenActions(property, e);
                              }}
                              title="Open Intelligence Hub"
                            >
                              <Zap size={12} />
                              <span>{property.suggestedActions.length} Improvements</span>
                            </button>
                          )}
                          <div className="action-icons-row">
                            <ZenaCallTooltip
                              contactId={property.vendors && property.vendors.length > 0 ? property.vendors[0].id : ''}
                              phones={property.vendors && property.vendors.length > 0 ? property.vendors[0].phones : []}
                              contactName={property.vendors && property.vendors.length > 0 ? property.vendors[0].name : (property.vendorName || 'Vendor')}
                            >
                              <button className="icon-action-btn" onClick={handleCallVendor} title="Call Vendor">
                                <Phone size={16} />
                              </button>
                            </ZenaCallTooltip>
                            <button className="icon-action-btn" onClick={(e) => handleScheduleOpenHome(e, property)} title="Schedule Open Home">
                              <Calendar size={16} />
                            </button>
                            <button className="icon-action-btn" onClick={(e) => handleGenerateReport(e, property.id)} title="Generate Comparable Sales Report">
                              <TrendingUp size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Grid View Card
                  const isSelected = selectedIds.has(property.id);

                  return (
                    <div
                      key={property.id}
                      className={`property-card ${selectedIds.has(property.id) ? 'property-card--selected' : ''} ${isBatchMode ? 'property-card--selectable' : ''}`}
                      onClick={(e) => {
                        if (isBatchMode) {
                          toggleSelection(property.id, e);
                        } else {
                          navigate(`/properties/${property.id}`);
                        }
                      }}
                      style={{
                        '--status-color': statusConfig.color,
                        '--status-glow': statusConfig.glow,
                        '--status-bg': statusConfig.bg
                      } as React.CSSProperties}
                    >
                      {isBatchMode && (
                        <div className="property-card__selection-check" onClick={e => toggleSelection(property.id, e)}>
                          <div className={`custom-checkbox ${selectedIds.has(property.id) ? 'checked' : ''}`} />
                        </div>
                      )}
                      <div className="property-card__header">
                        <span
                          className="property-card__status"
                          style={{
                            background: statusConfig.bg,
                            color: statusConfig.color,
                            borderColor: statusConfig.color
                          }}
                        >
                          {statusConfig.label}
                        </span>
                        <div className="property-card__header-right">
                          {property.suggestedActions && property.suggestedActions.length > 0 && (
                            <span className="property-card__improvements-count">
                              {property.suggestedActions.length} improvements
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="property-card__address-group">
                        <h3 className="property-card__address">{property.address}</h3>
                        <span className="property-card__vendor">{property.vendorName}</span>
                      </div>

                      <div className="property-card__intelligence">
                        {property.listingPrice && (
                          <div className="property-card__price">
                            <DollarSign size={16} />
                            {formatPrice(property.listingPrice)}
                          </div>
                        )}
                        <div className="property-card__momentum">
                          <div className="momentum-bar">
                            <div
                              className="momentum-fill"
                              style={{ width: `${property.momentumScore}%`, background: `linear-gradient(90deg, #8B5CF6, ${statusConfig.color})` }}
                            />
                          </div>
                          <span className="momentum-label">Momentum: {property.momentumScore}%</span>
                        </div>
                      </div>

                      <div className="property-card__specs">
                        {property.bedrooms !== undefined && (
                          <span className="spec">
                            <BedDouble size={14} />
                            {property.bedrooms}
                          </span>
                        )}
                        {property.bathrooms !== undefined && (
                          <span className="spec">
                            <Bath size={14} />
                            {property.bathrooms}
                          </span>
                        )}
                        {property.landSize !== undefined && (
                          <span className="spec">
                            <Maximize size={14} />
                            {property.landSize}m²
                          </span>
                        )}
                      </div>

                      <div className="property-card__meta">
                        <span className="property-card__dom">
                          <Clock size={14} />
                          {daysOnMarket} days on market
                        </span>
                        {nextEvent && (
                          <span className="property-card__event">
                            <Calendar size={14} />
                            {nextEvent}
                          </span>
                        )}
                      </div>

                      <div className="property-card__actions" onClick={e => e.stopPropagation()}>
                        {pendingActionPropertyIds.has(property.id) && (
                          <button
                            className="property-card__action-btn property-card__action-btn--pending"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsActionQueueOpen(true);
                            }}
                          >
                            <Zap size={14} fill="currentColor" />
                            Pending
                          </button>
                        )}
                        {property.suggestedActions && property.suggestedActions.length > 0 && (
                          <button
                            className="property-card__action-btn property-card__action-btn--improvements"
                            onClick={(e) => handleOpenActions(property, e)}
                          >
                            <Zap size={14} />
                            {property.suggestedActions.length} Improve
                          </button>
                        )}
                        <ZenaCallTooltip
                          contactId={property.vendors && property.vendors.length > 0 ? property.vendors[0].id : ''}
                          phones={property.vendors && property.vendors.length > 0 ? property.vendors[0].phones : []}
                          contactName={property.vendors && property.vendors.length > 0 ? property.vendors[0].name : (property.vendorName || 'Vendor')}
                        >
                          <button
                            className="property-card__action-btn"
                            onClick={handleCallVendor}
                          >
                            <Phone size={14} />
                            Call
                          </button>
                        </ZenaCallTooltip>
                        <button
                          className="property-card__action-btn"
                          onClick={(e) => handleScheduleOpenHome(e, property)}
                        >
                          <Calendar size={14} />
                          Open Home
                        </button>
                        <button
                          className="property-card__action-btn"
                          onClick={(e) => handleGenerateReport(e, property.id)}
                          title="Generate Comparable Sales Report"
                        >
                          <TrendingUp size={14} />
                          Report
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
      {isBatchMode && selectedIds.size > 0 && createPortal(
        <BatchActionBar
          selectedCount={selectedIds.size}
          isVisible={isBatchMode && selectedIds.size > 0}
          onAction={handleBatchAction}
          onCancel={clearSelection}
          actions={['compose', 'tag', 'delete_all']}
        />,
        document.body
      )}
      <AddPropertyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(newProperty) => {
          setProperties(prev => [newProperty, ...prev]);
        }}
      />
      <ZenaBatchPropertyTagModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        onSave={handleTagSave}
        selectedCount={selectedIds.size}
        selectedPropertyIds={Array.from(selectedIds)}
      />
      {isComposeModalOpen && selectedVendorsForCompose.length > 0 && (
        <ZenaBatchComposeModal
          selectedContacts={selectedVendorsForCompose}
          initialSubject={composeInitialData?.subject}
          initialMessage={composeInitialData?.body}
          initialActionContext={composeContext || undefined}
          onClose={() => {
            setIsComposeModalOpen(false);
            setComposeInitialData(null);
            setComposeContext(null);
            clearSelection();
          }}
        />
      )}
      {isComposeModalOpen && selectedVendorsForCompose.length === 0 && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.9)', padding: '24px', borderRadius: '12px', zIndex: 9999, color: 'white', textAlign: 'center' }}>
          <p>No vendors associated with the selected properties.</p>
          <button onClick={() => setIsComposeModalOpen(false)} style={{ marginTop: '16px', padding: '8px 16px', background: '#00D4FF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
        </div>
      )}
      <PropertyIntelligenceModal
        isOpen={isActionsModalOpen}
        onClose={() => {
          setIsActionsModalOpen(false);
          setFreshActions(null);
        }}
        propertyId={selectedPropertyForActions?.id || ''}
        propertyAddress={selectedPropertyForActions?.address || 'Property'}
        intelScore={selectedPropertyForActions?.momentumScore || 50}
        momentumVelocity={selectedPropertyForActions?.buyerMatchCount || 0}
        status={selectedPropertyForActions?.status || 'active'}
        aiReasoning={selectedPropertyForActions?.heatReasoning}
        isLoadingStrategic={isLoadingActions}
        strategicActions={(freshActions || selectedPropertyForActions?.suggestedActions || []).map(a =>
          typeof a === 'string'
            ? {
              action: a,
              reasoning: `Based on current market volatility and property specifics, Zena recommends this course of action to maintain strategic momentum. This will help ensure the vendor's expectations are managed while maximizing buyer engagement.`,
              impact: 'Medium' as const
            }
            : a
        )}
        onExecuteStrategy={(action, reasoning) => handleExecuteAction(action, reasoning)}
        onImproveNow={handleImproveNow}
      />

      {/* Schedule Open Home Modal */}
      <ScheduleOpenHomeModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        property={scheduleModalProperty as any}
        onSuccess={() => {
          loadProperties(); // Refresh to update orbit counts and filters
        }}
        allProperties={properties}
      />
      <ActionApprovalQueue
        isOpen={isActionQueueOpen}
        onClose={() => setIsActionQueueOpen(false)}
        onActionTaken={fetchPendingActions}
      />
      <ComparableReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportModalData(null);
        }}
        initialAddress={reportModalData?.address}
        initialBedrooms={reportModalData?.bedrooms}
      />
    </div>
  );
};
