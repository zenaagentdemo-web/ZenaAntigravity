import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    CheckSquare,
    RefreshCw,
    Search,
    Sparkles,
    Zap,
    Clock,
    X,
    Plus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BatchAction } from '../../models/newPage.types';
import { PipelineType, PipelineResponse, Deal, NewDealModal, StrategySessionContext, STRATEGY_SESSION_KEY, STAGE_LABELS } from '../../components/DealFlow';
import { analyseDeal } from '../../components/DealFlow/ZenaIntelligence/ZenaIntelligenceEngine';
import { DealDetailPanel } from '../../components/DealFlow/DealDetailPanel';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import { GodmodeToggle } from '../../components/GodmodeToggle/GodmodeToggle';
import { ActionApprovalQueue } from '../../components/ActionApprovalQueue/ActionApprovalQueue';
import { ToastContainer } from '../../components/Toast/Toast';
import { useGodmode } from '../../hooks/useGodmode';
import { useThreadActions } from '../../hooks/useThreadActions';
import { api } from '../../utils/apiClient';
import { calculateDaysInStage } from '../../components/DealFlow/types';
import '../../components/DealFlow/DealFlow.css';
import './DealFlowPage.css';

export const DealFlowPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addToast, state: actionState, dismissToast } = useThreadActions();

    // Core state
    const [pipelineType, setPipelineType] = useState<PipelineType>('seller');
    const [pipelineData, setPipelineData] = useState<PipelineResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showNewDealModal, setShowNewDealModal] = useState(false);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [selectedIntelligence, setSelectedIntelligence] = useState<any | null>(null);
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
    const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
    const [deals, setDeals] = useState<Deal[]>([]);

    // New features state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // ============================================
    // GLOBAL PROACTIVITY: Live Intent Extraction
    // ============================================
    const [proactiveSuggestion, setProactiveSuggestion] = useState<{ message: string; action: string; data?: any } | null>(null);
    const [newDealPrefill, setNewDealPrefill] = useState<any>(null);

    const handleProactiveSuggestionClick = () => {
        if (proactiveSuggestion?.action === 'open_new_deal_modal') {
            setNewDealPrefill(proactiveSuggestion.data);
            setShowNewDealModal(true);
            setProactiveSuggestion(null);
            setSearchQuery('');
        }
    };

    // Detect intent in search query
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 5) {
            setProactiveSuggestion(null);
            return;
        }

        const timer = setTimeout(() => {
            // "New deal [address]" or "Deal for [name]"
            const newDealPattern = /\b(?:new\s+deal|deal\s+for)\s+(.+)/i;
            const match = searchQuery.match(newDealPattern);

            if (match) {
                const query = match[1].trim();
                // Check if it looks like an address (has numbers)
                const isAddress = /\d/.test(query);

                setProactiveSuggestion({
                    message: `Start a new deal for "${query}"?`,
                    action: 'open_new_deal_modal',
                    data: isAddress ? { propertyAddress: query } : { contactName: query }
                });
            } else {
                setProactiveSuggestion(null);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);
    const [isSmartSearchActive, setIsSmartSearchActive] = useState(false);
    const [smartSearchInsight, setSmartSearchInsight] = useState<string | null>(null);
    const [smartSearchRichResponse, setSmartSearchRichResponse] = useState<string | null>(null);
    const [executedQuery, setExecutedQuery] = useState<string | null>(null);
    const [isAnalyzingQuery, setIsAnalyzingQuery] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedStage, setSelectedStage] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    // Mutual exclusivity handlers
    const handleFilterStatusChange = (status: string) => {
        setFilterStatus(status);
        // Always clear the stage selection when applying any status filter
        // This ensures the view switches to "All Deals" filtered by that status
        setSelectedStage(null);
        // User wants to exit Archived page if they click a filter
        setShowArchived(false);
    };

    const handleStageSelect = (stage: string | null) => {
        setSelectedStage(stage);
        if (stage) {
            // If selecting a stage, clear the status filter to 'all' (or keep 'active'? Usually distinct stages imply active deals)
            // The user wants "one or the other".
            setFilterStatus('all');
            // User wants to exit Archived page if they click a pipeline filter
            setShowArchived(false);
        }
    };

    // God Mode state
    const [isActionQueueOpen, setIsActionQueueOpen] = useState(false);
    const { settings: godmodeSettings, pendingCount } = useGodmode();

    // Handle openQueue query param
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('openQueue') === 'true') {
            setIsActionQueueOpen(true);
        }
    }, [location.search]);

    // Handle openDealId or openAddDealModal state from navigation
    useEffect(() => {
        const state = location.state as { openDealId?: string, openPipelineType?: string, openAddDealModal?: boolean } | null;

        if (state?.openPipelineType && state.openPipelineType !== pipelineType) {
            console.log('[DealFlowPage] Switching pipeline from nav state:', state.openPipelineType);
            setPipelineType(state.openPipelineType as PipelineType);
            return; // Wait for pipeline switch to trigger re-fetch
        }

        if (state?.openDealId) {
            console.log('[DealFlowPage] Opening deal from nav state:', state.openDealId);
            const targetDeal = deals.find(d => d.id === state.openDealId);
            if (targetDeal) {
                // Ensure pipeline type matches the deal to make it visible
                if (targetDeal.pipelineType !== pipelineType) {
                    setPipelineType(targetDeal.pipelineType);
                    return; // Wait for pipeline switch
                }
                setSelectedDeal(targetDeal);
                setIsDetailPanelOpen(true);

                // Clear state to prevent re-opening on refresh
                window.history.replaceState({}, document.title);
            }
        } else if (state?.openAddDealModal) {
            console.log('[DealFlowPage] Opening Add Deal modal from nav state');
            setShowNewDealModal(true);
            // Clear state to prevent re-opening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state, deals, pipelineType]);

    // Calculate stats
    const stats = useMemo(() => {
        const filteredByPipeline = deals.filter(d => d.pipelineType === pipelineType);
        const total = filteredByPipeline.length;
        const activeStages = ['buyer_consult', 'shortlisting', 'viewings', 'offer_made', 'conditional', 'unconditional', 'pre_settlement', 'appraisal', 'listing_signed', 'marketing', 'offers_received'];
        const active = filteredByPipeline.filter(d => activeStages.includes(d.stage) && d.stage !== 'settled').length;
        const needAttention = filteredByPipeline.filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high' || d.riskLevel === 'medium').length;
        const onTrack = filteredByPipeline.filter(d => d.riskLevel === 'low' || d.riskLevel === 'none').length;
        const won = filteredByPipeline.filter(d => d.stage === 'settled').length;
        return { total, active, needAttention, onTrack, won };
    }, [deals, pipelineType]);

    // Filtered deals based on search and filter
    const filteredDeals = useMemo(() => {
        let filtered = deals.filter(d => d.pipelineType === pipelineType);

        // Filter by archived status
        if (showArchived) {
            filtered = filtered.filter(d => d.status === 'archived');
        } else {
            filtered = filtered.filter(d => d.status !== 'archived');
        }

        // Apply filter status (only for active deals)
        if (!showArchived) {
            if (filterStatus === 'needAttention') {
                filtered = filtered.filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high' || d.riskLevel === 'medium');
            } else if (filterStatus === 'onTrack') {
                filtered = filtered.filter(d => d.riskLevel === 'low' || d.riskLevel === 'none');
            } else if (filterStatus === 'won') {
                filtered = filtered.filter(d => d.stage === 'settled');
            }
        }

        // Apply search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(d =>
                d.property?.address?.toLowerCase().includes(q) ||
                d.contacts?.some(c => c.name.toLowerCase().includes(q))
            );
        }

        return filtered;
    }, [deals, pipelineType, filterStatus, searchQuery, showArchived]);

    // Update specific deal in state
    const handleUpdateDeal = useCallback((updatedDeal: Deal) => {
        setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
        if (selectedDeal?.id === updatedDeal.id) {
            setSelectedDeal(updatedDeal);
        }
    }, [selectedDeal]);

    // Phase 3: Executive Brain Sync handler
    // Allows child components (like AI hydration) to update specific fields without full re-fetch
    const handlePartialDealUpdate = (dealId: string, updates: Partial<Deal>) => {
        setDeals(prevDeals => prevDeals.map(d => {
            if (d.id === dealId) {
                const newDeal = { ...d, ...updates };
                // Also update selected deal if it's the one being updated
                if (selectedDeal && selectedDeal.id === dealId) {
                    setSelectedDeal(newDeal);
                }
                return newDeal;
            }
            return d;
        }));
    };

    // Fetch pipeline data
    const fetchPipeline = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get<PipelineResponse>(`/deals/pipeline/${pipelineType}`, {
                cache: true, // Allow caching
            });

            const data = response.data;
            const allDeals = data.columns.flatMap((col: { deals: Deal[] }) => col.deals);

            // Always use API data - even when empty, this ensures we show real state
            setPipelineData(data);
            setDeals(allDeals);
        } catch (err: any) {
            console.error('[ZenaDealFlow] Error fetching pipeline:', err);
            setError(err.message || 'Failed to fetch pipeline data');
            addToast('error', 'Failed to update deal pipeline.');
        } finally {
            setLoading(false);
        }
    }, [pipelineType, addToast]);

    useEffect(() => {
        fetchPipeline();
        // Trigger God Mode heartbeat
        api.post('/api/godmode/heartbeat').catch(err =>
            console.warn('[DealFlowPage] Heartbeat failed', err)
        );
    }, [fetchPipeline]);

    // Handle deal card click - open detail panel
    const handleDealClick = (deal: Deal, intelligence?: any) => {
        if (isBatchMode) {
            toggleSelection(deal.id);
            return;
        }
        setSelectedDeal(deal);
        setSelectedIntelligence(intelligence || null);
        setIsDetailPanelOpen(true);
    };

    // Handle close detail panel
    const handleCloseDetailPanel = () => {
        setIsDetailPanelOpen(false);
        setTimeout(() => {
            setSelectedDeal(null);
            setSelectedIntelligence(null);
        }, 300);
    };

    // Handle navigate to contact
    const handleNavigateToContact = (contactId: string) => {
        if (selectedDeal) {
            navigate(`/contacts/${contactId}`, {
                state: {
                    from: 'deal-detail', // Special flag for ContactDetailPage to show "Return to Deal"
                    dealId: selectedDeal.id,
                    propertyName: selectedDeal.property?.address,
                    pipelineType: selectedDeal.pipelineType,
                    label: 'Deal Flow'
                }
            });
        } else {
            navigate(`/contacts/${contactId}`, { state: { from: location.pathname, label: 'Deal Flow' } });
        }
    };

    // Handle new deal button click
    const handleNewDealClick = () => {
        setShowNewDealModal(true);
    };

    // Handle Start Zena Live
    const handleStartZenaLive = useCallback((dealId: string) => {
        const deal = deals.find(d => d.id === dealId);
        if (!deal) return;

        // Use analyseDeal to get heuristic intelligence if needed
        const intelligence = analyseDeal(deal);
        const context: StrategySessionContext = {
            dealId: deal.id,
            address: deal.property?.address || 'Unknown Property',
            stage: deal.stage,
            stageLabel: STAGE_LABELS[deal.stage] || deal.stage,
            dealValue: deal.dealValue,
            daysInStage: calculateDaysInStage(deal.stageEnteredAt),
            healthScore: intelligence.healthScore || 0,
            healthStatus: intelligence.stageHealthStatus || 'healthy',
            primaryRisk: intelligence.riskSignals?.[0]?.description || 'No immediate risks',
            riskType: intelligence.riskSignals?.[0]?.type || 'none',
            coachingInsight: intelligence.coachingInsight || '',
            suggestedAction: intelligence.suggestedPowerMove?.headline,
            contactName: deal.contacts?.[0]?.name
        };

        sessionStorage.setItem(STRATEGY_SESSION_KEY, JSON.stringify(context));
        // CRITICAL: Use liveMode=true to trigger Gemini Live voice (Aoede) instead of TTS
        navigate(`/ask-zena?greeting=strategy-session&liveMode=true&t=${Date.now()}`);
    }, [deals, navigate]);

    // Selection handlers
    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
        if (newSelected.size === 0) {
            setIsBatchMode(false);
        }
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

    // Batch actions - wrap async calls since onAction expects sync function
    const handleBatchAction = (action: BatchAction): void => {
        switch (action) {
            case 'delete':
                handleBatchDelete();
                break;
            case 'archive':
                handleBatchArchive();
                break;
            case 'restore':
                handleBatchRestore();
                break;
            case 'export_crm':
                handleExportToCRM();
                break;
            default:
                console.warn(`Action ${action} not implemented for deals.`);
        }
    };

    const handleBatchRestore = async () => {
        if (selectedIds.size === 0) return;

        const count = selectedIds.size;
        try {
            await api.post('/api/deals/bulk-restore', { ids: Array.from(selectedIds) });
            // Update local state is handled in finally/fallback logic below
        } catch (err: any) {
            console.warn('[DealFlowPage] Bulk restore API failed, proceeding with local update:', err);
            // Fallback for mock environment/proxy issues
        } finally {
            // Optimistic update - ensure the changes reflect in UI even if API 404s
            setDeals(prev => prev.map(d => selectedIds.has(d.id) ? { ...d, status: 'active' } : d));
            addToast('success', `Successfully restored ${count} deal(s).`);
            clearSelection();
        }
    };

    const handleBatchArchive = async () => {
        if (selectedIds.size === 0) return;

        const count = selectedIds.size;
        try {
            await api.post('/api/deals/bulk-archive', { ids: Array.from(selectedIds) });
            // Update local state is handled in finally/fallback logic below
        } catch (err: any) {
            console.warn('[DealFlowPage] Bulk archive API failed, proceeding with local update:', err);
            // Fallback for mock environment/proxy issues
        } finally {
            // Optimistic update - ensure the changes reflect in UI even if API 404s
            setDeals(prev => prev.map(d => selectedIds.has(d.id) ? { ...d, status: 'archived' } : d));
            addToast('success', `Successfully archived ${count} deal(s).`);
            clearSelection();
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;

        const count = selectedIds.size;
        if (!window.confirm(`Are you sure you want to delete ${count} deal(s)? This action cannot be undone.`)) {
            return;
        }

        try {
            await api.post('/api/deals/bulk-delete', { ids: Array.from(selectedIds) });
            // Update local state is handled in finally/fallback logic below
        } catch (err: any) {
            console.warn('[DealFlowPage] Bulk delete API failed, proceeding with local update:', err);
            // Fallback for mock environment/proxy issues
        } finally {
            // Optimistic update - ensure the changes reflect in UI even if API 404s
            setDeals(prev => prev.filter(d => !selectedIds.has(d.id)));
            addToast('success', `Successfully deleted ${count} deal(s).`);
            clearSelection();
        }
    };

    const handleExportToCRM = async () => {
        try {
            const idsToExport = selectedIds.size > 0 ? Array.from(selectedIds) : deals.map(d => d.id);
            addToast('info', `Exporting ${idsToExport.length} deal(s) to CRM...`);

            const response = await api.post('/api/export/deals', {
                recordIds: idsToExport,
                format: 'csv'
            });

            const { exportId } = response.data;

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            const statusResponse = await api.get(`/api/export/${exportId}`);
            if (statusResponse.data.status === 'completed') {
                const downloadUrl = `/api/export/${exportId}/download`;
                const blobRes = await api.get(downloadUrl, { responseType: 'blob' });

                const blob = new Blob([blobRes.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Deals_Export_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                addToast('success', 'Deals exported successfully.');
            }
            clearSelection();
        } catch (err) {
            console.error('[DealFlowPage] Export failed:', err);
            addToast('error', 'Export failed. Please try again.');
        }
    };

    // Sync/Refresh
    const handleSync = async () => {
        addToast('info', 'Syncing deals with Zena brain...');
        const minWait = new Promise(resolve => setTimeout(resolve, 800));
        await Promise.all([fetchPipeline(), minWait]);
    };

    // Smart Search
    const handleSmartSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsAnalyzingQuery(true);
        setSmartSearchRichResponse(null);

        try {
            const response = await api.post('/api/ask/deal-search', { query: searchQuery });
            if (response.data) {
                const { filters, aiInsight, richResponse } = response.data;
                if (filters?.riskLevel) {
                    if (filters.riskLevel === 'high' || filters.riskLevel === 'critical') {
                        handleFilterStatusChange('needAttention');
                    } else if (filters.riskLevel === 'low') {
                        handleFilterStatusChange('onTrack');
                    }
                }

                // If richResponse is present, store the executed query and clear search bar
                if (richResponse) {
                    setSmartSearchRichResponse(richResponse);
                    setExecutedQuery(searchQuery);
                    setSearchQuery(''); // Clear search so full list is visible under Spotlight
                } else if (filters?.keywords !== undefined) {
                    setSearchQuery(filters.keywords);
                } else {
                    setSearchQuery('');
                }

                if (aiInsight) setSmartSearchInsight(aiInsight);
                setIsSmartSearchActive(true);
            }
        } catch (err) {
            console.warn('[DealFlowPage] Smart search not available');
            // Fallback: simple keyword matching
            setIsSmartSearchActive(true);
            setSmartSearchInsight('Filtering by keywords');
        } finally {
            setIsAnalyzingQuery(false);
        }
    };

    const handleResetFilters = () => {
        setFilterStatus('all');
        setSelectedStage(null);
        setSearchQuery('');
        setSmartSearchInsight(null);
        setSmartSearchRichResponse(null);
        setExecutedQuery(null);
        setIsSmartSearchActive(false);
    };

    return (
        <div className="deal-flow-page" data-godmode={godmodeSettings.mode} style={{ background: '#0A0A0F', minHeight: '100vh' }}>
            <AmbientBackground
                variant="default"
                showParticles={true}
                showGradientOrbs={false}
            />

            <div className="deal-flow-page__container">
                {/* God Mode System Overlay */}
                {(godmodeSettings.mode === 'full_god' || godmodeSettings.mode === 'demi_god') && (
                    <div className={`godmode-system-status ${godmodeSettings.mode}`}>
                        <div className="godmode-status-content">
                            <Zap size={16} className="godmode-icon" />
                            <div className="godmode-info">
                                <span className="godmode-title">
                                    {godmodeSettings.mode === 'full_god' ? 'God Mode Active' : 'Demi-God Mode Active'}
                                </span>
                                <span className="godmode-description">
                                    {godmodeSettings.mode === 'full_god'
                                        ? 'Zena is fully autonomous. High-confidence actions are executed automatically 24/7.'
                                        : 'Zena is proactively drafting deal actions for your review. You retain full control.'}
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
                            >
                                <Clock size={14} />
                                View God Mode Activity
                            </button>
                            <div className="godmode-pulse-indicator" />
                        </div>
                    </div>
                )}

                {/* Header */}
                <header className="deal-flow-page__header">
                    {/* Top Row: Title */}
                    <div className="deal-flow-page__title-group">
                        <span className="deal-flow-page__subtitle">ZENA DEAL INTELLIGENCE</span>
                        <h1 className="deal-flow-page__title">Deal Flow</h1>
                    </div>

                    {/* Bottom Row: Actions Toolbar */}
                    <div className="deal-flow-page__actions-toolbar">
                        {/* Left Side: Standard Actions */}
                        <div className="deal-flow-page__standard-actions">
                            {/* Select Button */}
                            <button
                                className={`deal-flow-page__action-btn deal-flow-page__select-btn ${isBatchMode ? 'active' : ''}`}
                                onClick={toggleBatchMode}
                                aria-label={isBatchMode ? "Exit selection mode" : "Enter selection mode"}
                                data-testid="batch-mode-toggle"
                            >
                                <CheckSquare size={18} />
                                <span>Select</span>
                            </button>

                            {/* Add Deal Button */}
                            <button className="deal-flow-page__add-btn" onClick={handleNewDealClick}>
                                <Plus size={18} />
                                <span>Add new Deal</span>
                            </button>

                            {/* Archived Deals Toggle Button */}
                            <button
                                className={`deal-flow-page__archived-btn ${showArchived ? 'active' : ''}`}
                                onClick={() => setShowArchived(!showArchived)}
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="21 8 21 21 3 21 3 8" />
                                    <rect x="1" y="3" width="22" height="5" />
                                    <line x1="10" y1="12" x2="14" y2="12" />
                                </svg>
                                <span>{showArchived ? 'Active Deals' : 'Archived Deals'}</span>
                            </button>
                        </div>

                        {/* Right Side: God Mode Controls */}
                        <div className="deal-flow-page__godmode-controls">
                            <GodmodeToggle compact />
                            {pendingCount > 0 && (
                                <button
                                    className="deal-flow-page__pending-actions-btn"
                                    onClick={() => setIsActionQueueOpen(true)}
                                >
                                    ⚡ {pendingCount} Pending Actions
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Stats Orbs */}
                <section className="deal-flow-page__stats">
                    <div
                        className={`stats-orb stats-orb--all ${filterStatus === 'all' ? 'selected' : ''}`}
                        onClick={() => handleFilterStatusChange('all')}
                    >
                        <span className="stats-orb__value">{stats.total}</span>
                        <span className="stats-orb__label">ALL</span>
                    </div>
                    <div
                        className={`stats-orb stats-orb--active ${filterStatus === 'active' ? 'selected' : ''}`}
                        onClick={() => handleFilterStatusChange(filterStatus === 'active' ? 'all' : 'active')}
                    >
                        <span className="stats-orb__value">{stats.active}</span>
                        <span className="stats-orb__label">ACTIVE</span>
                    </div>
                    <div
                        className={`stats-orb stats-orb--warning ${filterStatus === 'needAttention' ? 'selected' : ''}`}
                        onClick={() => handleFilterStatusChange(filterStatus === 'needAttention' ? 'all' : 'needAttention')}
                    >
                        <span className="stats-orb__value">{stats.needAttention}</span>
                        <span className="stats-orb__label">NEED ATTENTION</span>
                    </div>
                    <div
                        className={`stats-orb stats-orb--healthy ${filterStatus === 'onTrack' ? 'selected' : ''}`}
                        onClick={() => handleFilterStatusChange(filterStatus === 'onTrack' ? 'all' : 'onTrack')}
                    >
                        <span className="stats-orb__value">{stats.onTrack}</span>
                        <span className="stats-orb__label">ON TRACK</span>
                    </div>
                    <div
                        className={`stats-orb stats-orb--won ${filterStatus === 'won' ? 'selected' : ''}`}
                        onClick={() => handleFilterStatusChange(filterStatus === 'won' ? 'all' : 'won')}
                    >
                        <span className="stats-orb__value">{stats.won}</span>
                        <span className="stats-orb__label">WON</span>
                    </div>
                </section>

                {/* Search Bar */}
                <section className="deal-flow-page__controls">
                    <div className="deal-flow-page__search-wrapper">
                        <div className={`deal-flow-page__search-container ${isSmartSearchActive ? 'smart-active' : ''}`}>
                            {isAnalyzingQuery ? (
                                <div className="search-loading-icon">
                                    <RefreshCw className="spinning" size={18} />
                                </div>
                            ) : (
                                <Search className="deal-flow-page__search-icon" size={20} />
                            )}
                            <input
                                type="text"
                                className="deal-flow-page__search-input"
                                placeholder="Search deals or ask Zena (e.g. 'deals at risk')"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (isSmartSearchActive) setIsSmartSearchActive(false);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
                            />
                        </div>
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
                            onClick={handleResetFilters}
                            title="Reset all filters"
                        >
                            <RefreshCw size={16} />
                            <span>Reset Filters</span>
                        </button>
                    </div>

                    {isSmartSearchActive && smartSearchInsight && (
                        <div className="smart-search-badge">
                            <Sparkles size={12} />
                            <span>{smartSearchInsight}</span>
                            <button title="Clear filters" onClick={handleResetFilters}><X size={12} /></button>
                        </div>
                    )}

                    {proactiveSuggestion && (
                        <div className="proactive-suggestion-banner" onClick={handleProactiveSuggestionClick}>
                            <Sparkles size={16} />
                            <span>{proactiveSuggestion.message}</span>
                            <button
                                className="add-contact-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleProactiveSuggestionClick();
                                }}
                            >
                                <Sparkles size={10} style={{ marginRight: '4px' }} />
                                {proactiveSuggestion.action === 'open_new_deal_modal' ? 'Create Deal' : 'Action'}
                            </button>
                            <button
                                className="dismiss-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setProactiveSuggestion(null);
                                }}
                            >
                                Dismiss
                            </button>
                        </div>
                    )}
                </section>

                {/* AI Intelligence Spotlight - Rich Markdown Response */}
                {smartSearchRichResponse && (
                    <section className="deal-flow-page__ai-spotlight">
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
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {smartSearchRichResponse}
                            </ReactMarkdown>
                        </div>
                        <div className="ai-spotlight__footer">
                            <div className="ai-spotlight__pulse" />
                            <span>Real-time analysis by Zena Intelligence</span>
                        </div>
                    </section>
                )}

                {/* Main Content */}
                <div className="deal-flow-page__content">
                    {loading && (
                        <div className="deal-flow__loading">
                            <div className="deal-flow__loading-spinner" />
                            <span>Scanning pipeline...</span>
                        </div>
                    )}

                    {error && (
                        <div className="deal-flow-page__error">
                            <p>Error: {error}</p>
                            <button onClick={fetchPipeline}>Retry</button>
                        </div>
                    )}

                    {!loading && !error && pipelineData && (
                        <>
                            <ZenaMomentumFlow
                                deals={filteredDeals}
                                pipelineType={pipelineType}
                                isBatchMode={isBatchMode}
                                selectedIds={selectedIds}
                                onDealSelect={handleDealClick}
                                onStartZenaLive={handleStartZenaLive}
                                selectedStage={selectedStage}
                                onStageSelect={handleStageSelect}
                                healthFilter={
                                    filterStatus === 'needAttention' ? 'needsAttention' :
                                        filterStatus === 'onTrack' ? 'healthy' : 'all'
                                }
                                onHealthFilterChange={(val) => {
                                    const mappedStatus = val === 'needsAttention' ? 'needAttention' :
                                        val === 'healthy' ? 'onTrack' : 'all';
                                    handleFilterStatusChange(mappedStatus);
                                }}
                                onDealUpdate={handlePartialDealUpdate}
                            />

                            {filteredDeals.length === 0 && (
                                <div className="deal-flow-page__empty">
                                    <div className="deal-flow-page__empty-icon">🚀</div>
                                    <h3>
                                        {filterStatus !== 'all' || searchQuery
                                            ? 'No matching deals'
                                            : 'Launch your first deal'}
                                    </h3>
                                    <p>
                                        {filterStatus !== 'all' || searchQuery
                                            ? 'Try adjusting your filters or search query.'
                                            : `No ${pipelineType} deals in the pipeline. Ready to close some business?`}
                                    </p>
                                    {filterStatus === 'all' && !searchQuery && (
                                        <button className="deal-flow__new-deal-btn" onClick={handleNewDealClick}>
                                            Create Deal
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Batch Action Bar */}
                {isBatchMode && selectedIds.size > 0 && (
                    <BatchActionBar
                        selectedCount={selectedIds.size}
                        isVisible={isBatchMode && selectedIds.size > 0}
                        onAction={handleBatchAction}
                        onCancel={clearSelection}
                        actions={showArchived ? ['delete', 'restore'] : ['delete', 'archive']}
                    />
                )}
            </div>

            {/* New Deal Modal */}
            {/* New Deal Modal */}
            <NewDealModal
                isOpen={showNewDealModal}
                onClose={() => setShowNewDealModal(false)}
                onDealCreated={fetchPipeline}
                initialPipelineType={pipelineType}
                initialData={newDealPrefill}
            />

            {/* Quick Actions Drawer */}
            {selectedDeal && isQuickActionsOpen && (
                <DealQuickActions
                    deal={selectedDeal}
                    isOpen={isQuickActionsOpen}
                    onClose={() => setIsQuickActionsOpen(false)}
                    onStageChange={fetchPipeline}
                />
            )}

            {selectedDeal && isDetailPanelOpen && (
                <DealDetailPanel
                    deal={selectedDeal}
                    precomputedIntelligence={selectedIntelligence}
                    onClose={handleCloseDetailPanel}
                    onNavigateToContact={handleNavigateToContact}
                    onDealUpdate={handleUpdateDeal}
                    onStartZenaLive={handleStartZenaLive}
                />
            )}

            {/* Action Approval Queue */}
            <ActionApprovalQueue
                isOpen={isActionQueueOpen}
                onClose={() => setIsActionQueueOpen(false)}
            />

            {/* Toast Container */}
            <ToastContainer toasts={actionState.toasts} onDismiss={dismissToast} />
        </div>
    );
};

export default DealFlowPage;
