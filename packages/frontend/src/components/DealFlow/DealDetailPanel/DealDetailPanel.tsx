/**
 * DealDetailPanel - Slide-in panel showing deal details when card is clicked
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Deal, STAGE_LABELS, formatCurrency, calculateDaysInStage } from '../types';
import { getStageConfig, QuickAction } from './StageConfig';
import { analyseDeal, DealIntelligence, useDealIntelligence } from '../ZenaIntelligence/ZenaIntelligenceEngine';
import { logActivity } from '../utils/ActivityLogger';
import { api } from '../../../utils/apiClient';
import { LayoutDashboard, Brain, Users, Calendar } from 'lucide-react';

// Section components
import {
    BlockerWidget,
    QuickContacts,
    KeyDatesSection,
    ConditionsTracker,
    ZenaCoachingPanel,
    SearchCriteriaSection,
    MarketingStatsSection,
    OfferListSection,
    StageProgressHeader,
    PropertiesListSection,
    ViewingsScheduleSection,
    OfferDetailsSection,
    SettlementCountdownSection,
    PreInspectionSection,
    FollowUpActionsSection,
    IntelligenceTab
} from './sections';

import './DealDetailPanel.css';
import { useNavigate } from 'react-router-dom';
import { useDealNavigation } from '../../../hooks/useDealNavigation';

interface DealDetailPanelProps {
    deal: Deal;
    precomputedIntelligence?: DealIntelligence | null;
    onClose: () => void;
    onDealUpdate?: (deal: Deal) => void;
    onNavigateToContact?: (contactId: string) => void;
    onStartZenaLive?: (dealId: string) => void;
}

type TabId = 'overview' | 'intelligence' | 'people' | 'timeline';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ElementType;
}

const TABS: Tab[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'intelligence', label: 'Intelligence', icon: Brain },
    { id: 'people', label: 'People', icon: Users },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
];

export const DealDetailPanel: React.FC<DealDetailPanelProps> = ({
    deal,
    precomputedIntelligence,
    onClose,
    onDealUpdate,
    onNavigateToContact,
    onStartZenaLive,
}) => {
    const navigate = useNavigate();
    const { navigateToFromDeal } = useDealNavigation();
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [showHealthBreakdown, setShowHealthBreakdown] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Scroll back to top when deal changes
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [deal.id, activeTab]);

    // Get stage configuration
    const stageConfig = getStageConfig(deal.stage, deal.pipelineType);

    // Get Zena intelligence (heuristic for immediate display, then AI hydrated)
    const { intelligence: aiIntelligence, loading: aiLoading, refresh } = useDealIntelligence(deal.id);
    const heuristicIntelligence: DealIntelligence = analyseDeal(deal);
    const intelligence = precomputedIntelligence || aiIntelligence || heuristicIntelligence;

    // Phase 3: Executive Brain Sync
    // If opening this panel triggers an AI analysis that changes the risk level,
    // we must notify the parent to update the dashboard stats immediately.
    useEffect(() => {
        if (aiIntelligence?.riskLevel && onDealUpdate && aiIntelligence.riskLevel !== deal.riskLevel) {
            console.log(`[DealDetailPanel] Syncing AI risk level (${aiIntelligence.riskLevel}) to dashboard`);
            onDealUpdate({
                ...deal,
                riskLevel: aiIntelligence.riskLevel,
                // Also sync flags if available
                riskFlags: aiIntelligence.riskSignals?.map(s => s.description) || deal.riskFlags
            });
        }
    }, [aiIntelligence, deal.riskLevel, onDealUpdate]);

    // Days in stage
    const daysInStage = calculateDaysInStage(deal.stageEnteredAt);

    // Handle communication logging
    const handleCommunication = useCallback((type: 'call' | 'sms' | 'email') => {
        if (!onDealUpdate) return;

        const title = type === 'call' ? 'Phone Call' : type === 'sms' ? 'SMS Sent' : 'Email Sent';
        const contact = deal.contacts?.[0];
        const newEvent = logActivity(type, title, `${title} handled via Zena Panel`, contact);

        onDealUpdate({
            ...deal,
            timelineEvents: [newEvent, ...(deal.timelineEvents || [])]
        });
    }, [deal, onDealUpdate]);

    // Settlement countdown
    const settlementDaysRemaining = deal.settlementDate
        ? Math.ceil((new Date(deal.settlementDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleQuickAction = useCallback((action: QuickAction) => {
        // Log action
        console.log('Tactical action triggered:', action.id);

        switch (action.id) {
            case 'chase-finance':
                // AI-powered finance nudge
                navigate('/ask-zena', {
                    state: {
                        initialMessage: `Zena, I need to check the finance status for ${deal.property?.address.split(',')[0]}. Can you draft a firm but professional text for the broker?`,
                        dealContext: { id: deal.id, address: deal.property?.address }
                    }
                });
                break;

            case 'check-report':
                // AI-powered report analysis
                navigate('/ask-zena', {
                    state: {
                        initialMessage: `Zena, let's analyze the building report for ${deal.property?.address.split(',')[0]}. What are the key risks we should be looking for?`,
                        dealContext: { id: deal.id, address: deal.property?.address }
                    }
                });
                break;

            case 'call-solicitor':
            case 'confirm-settlement':
            case 'call-listing-agent': {
                handleCommunication('call');
                // Open system dialer
                const targetPhone = action.target === 'listing_agent'
                    ? deal.property?.listingAgentPhone
                    : deal.contacts?.find(c => c.role === action.target)?.phone;
                window.location.href = `tel:${targetPhone || ''}`;
                break;
            }

            case 'update-buyer':
                // AI-powered buyer update
                navigate('/ask-zena', {
                    state: {
                        initialMessage: `Zena, I need to update the buyer for ${deal.property?.address.split(',')[0]}. Can you draft a professional email with the latest context?`,
                        dealContext: { id: deal.id, address: deal.property?.address }
                    }
                });
                break;

            case 'revise-offer':
                // AI-powered offer revision
                navigate('/ask-zena', {
                    state: {
                        initialMessage: `Zena, let's strategize a revised offer for ${deal.property?.address.split(',')[0]}. What should my approach be based on the current negotiation?`,
                        dealContext: { id: deal.id, address: deal.property?.address }
                    }
                });
                break;

            case 'counter':
                // AI-powered counter-offer
                navigate('/ask-zena', {
                    state: {
                        initialMessage: `Zena, I want to counter the current offer for ${deal.property?.address.split(',')[0]}. Can you draft a firm but fair counter-offer strategy?`,
                        dealContext: { id: deal.id, address: deal.property?.address }
                    }
                });
                break;

            case 'mark-satisfied':
                if (onDealUpdate) {
                    onDealUpdate({
                        ...deal,
                        conditions: deal.conditions?.map(c => ({ ...c, status: 'satisfied' as const }))
                    });
                    // AI follow-up
                    navigate('/ask-zena', {
                        state: {
                            initialMessage: `Conditions are satisfied for ${deal.property?.address.split(',')[0]}. What's our next power move to ensure a smooth settlement?`
                        }
                    });
                }
                break;

            default:
                // Fallback to legacy behavior for standard actions
                switch (action.action) {
                    case 'call': handleCommunication('call'); break;
                    case 'sms': handleCommunication('sms'); break;
                    case 'email': handleCommunication('email'); break;
                }
        }
    }, [deal, navigate, handleCommunication, onDealUpdate]);

    // Handle stage change from progress header
    const handleStageUpdate = useCallback(async (newStage: string) => {
        if (newStage === deal.stage) return;

        console.log(`[DealDetailPanel] Manually updating stage to ${newStage}`);

        // Log to activity
        const newEvent = logActivity('note', 'Stage Change', `Stage manually updated to ${STAGE_LABELS[newStage] || newStage}`, deal.contacts?.[0]);

        if (onDealUpdate) {
            onDealUpdate({
                ...deal,
                stage: newStage as any,
                stageEnteredAt: new Date().toISOString(),
                timelineEvents: [newEvent, ...(deal.timelineEvents || [])]
            });
        }

        // Persistent save to backend
        try {
            await api.put(`/api/deals/${deal.id}/stage`, {
                stage: newStage,
                reason: 'Manual update via Pipeline Hub'
            });
        } catch (err) {
            console.error('Error saving stage update:', err);
        }
    }, [deal, onDealUpdate]);

    // Handle quick action click

    // Get health status color
    const getHealthColor = (status: 'healthy' | 'warning' | 'critical') => {
        switch (status) {
            case 'healthy': return '#00ff41'; // Zena Green
            case 'warning': return '#eab308'; // Warning Gold
            case 'critical': return '#ef4444'; // Error Red
        }
    };

    const renderOverviewTab = () => {
        const sortedSections = [...stageConfig.sections].sort((a, b) => a.order - b.order);

        return (
            <div className="deal-detail-panel__overview">
                <StageProgressHeader
                    currentStage={deal.stage}
                    pipelineType={deal.pipelineType}
                    onStageChange={handleStageUpdate}
                    recommendedStage={intelligence?.recommendedStage}
                />

                {sortedSections.map((section, idx) => {
                    if (section.priority === 'hidden') return null;

                    switch (section.id) {
                        case 'blocker':
                            return intelligence?.riskSignals?.length > 0 && (
                                <BlockerWidget
                                    key={`blocker-${idx}`}
                                    riskSignals={intelligence?.riskSignals || []}
                                    nextAction={deal.nextAction}
                                    nextActionOwner={deal.nextActionOwner}
                                    onQuickAction={handleQuickAction}
                                    quickActions={stageConfig.quickActions}
                                />
                            );
                        case 'contacts':
                            return (
                                <QuickContacts
                                    key={`contacts-${idx}`}
                                    deal={deal}
                                    onCommunicationClick={handleCommunication}
                                    onNavigateToContact={onNavigateToContact}
                                    onUpdate={onDealUpdate}
                                />
                            );
                        case 'keyDates':
                            return (
                                <KeyDatesSection
                                    key={`keydates-${idx}`}
                                    deal={deal}
                                    settlementDaysRemaining={settlementDaysRemaining}
                                />
                            );
                        case 'conditions':
                            return deal.conditions && deal.conditions.length > 0 && (
                                <ConditionsTracker
                                    key={`conditions-${idx}`}
                                    deal={deal}
                                    onUpdate={onDealUpdate}
                                />
                            );
                        case 'zenaCoaching':
                            return (
                                <ZenaCoachingPanel
                                    key={`coaching-${idx}`}
                                    intelligence={intelligence || heuristicIntelligence}
                                    deal={deal}
                                    onStartZenaLive={onStartZenaLive}
                                />
                            );
                        case 'searchCriteria':
                            return (
                                <SearchCriteriaSection
                                    key={`search-${idx}`}
                                    deal={deal}
                                />
                            );
                        case 'marketingStats':
                            return (
                                <MarketingStatsSection
                                    key={`stats-${idx}`}
                                    deal={deal}
                                />
                            );
                        case 'offers':
                            return (
                                <OfferListSection
                                    key={`offers-${idx}`}
                                    deal={deal}
                                />
                            );
                        case 'properties':
                            return (
                                <PropertiesListSection
                                    key={`properties-${idx}`}
                                    deal={deal}
                                    onUpdate={onDealUpdate}
                                />
                            );
                        case 'viewings':
                            return (
                                <ViewingsScheduleSection
                                    key={`viewings-${idx}`}
                                    deal={deal}
                                />
                            );
                        case 'offerDetails':
                            return (
                                <OfferDetailsSection
                                    key={`offerdetails-${idx}`}
                                    deal={deal}
                                    onUpdate={onDealUpdate}
                                    onQuickAction={handleQuickAction}
                                />
                            );
                        case 'settlement':
                            return (
                                <SettlementCountdownSection
                                    key={`settlement-${idx}`}
                                    deal={deal}
                                />
                            );
                        case 'preInspection':
                            return (
                                <PreInspectionSection
                                    key={`preinspection-${idx}`}
                                    deal={deal}
                                />
                            );
                        case 'followUp':
                            return (
                                <FollowUpActionsSection
                                    key={`followup-${idx}`}
                                    deal={deal}
                                    onUpdate={onDealUpdate}
                                />
                            );
                        default:
                            return null;
                    }
                })}
            </div>
        );
    };

    // Render people tab content
    const renderPeopleTab = () => (
        <div className="deal-detail-panel__people">
            <QuickContacts
                deal={deal}
                onCommunicationClick={handleCommunication}
                onNavigateToContact={onNavigateToContact}
                onUpdate={onDealUpdate}
            />
        </div>
    );

    // Render timeline tab content
    const renderTimelineTab = () => (
        <div className="deal-detail-panel__timeline">
            <KeyDatesSection
                deal={deal}
                settlementDaysRemaining={settlementDaysRemaining}
                expanded
            />
            {deal.conditions && deal.conditions.length > 0 && (
                <ConditionsTracker
                    deal={deal}
                    onUpdate={onDealUpdate}
                />
            )}
        </div>
    );

    const renderIntelligenceTab = () => {
        return (
            <div className="deal-detail-panel__content-inner">
                <IntelligenceTab
                    deal={deal}
                    intelligence={intelligence || heuristicIntelligence}
                    onStartZenaLive={onStartZenaLive}
                    onRefresh={refresh}
                    isLoading={aiLoading}
                />
            </div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return renderOverviewTab();
            case 'intelligence':
                return renderIntelligenceTab();
            case 'people':
                return renderPeopleTab();
            case 'timeline':
                return renderTimelineTab();
            default:
                return null;
        }
    };

    return createPortal(
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                key="backdrop"
                className="deal-detail-panel__backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                key="panel"
                className="deal-detail-panel"
                initial={{ opacity: 0, scale: 0.9, y: '-48%', x: '-50%' }}
                animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
                exit={{ opacity: 0, scale: 0.9, y: '-48%', x: '-50%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >

                {/* Header */}
                <div className="deal-detail-panel__header">
                    <div className="deal-detail-panel__header-content">
                        <h2
                            className="deal-detail-panel__address"
                            onClick={() => navigateToFromDeal(`/properties/${deal.id}`, deal.id, deal.property?.address)}
                            style={{ cursor: 'pointer' }}
                            title="View Property Details"
                        >
                            {deal.property?.address || 'Unknown Property'}
                        </h2>
                        <div className="deal-detail-panel__meta">
                            <span
                                className="deal-detail-panel__stage"
                                style={{ borderColor: getHealthColor(intelligence?.stageHealthStatus || 'healthy') }}
                            >
                                {STAGE_LABELS[deal.stage] || deal.stage}
                            </span>
                            <span className="deal-detail-panel__days">
                                {daysInStage}d in stage
                            </span>
                            {deal.dealValue && (
                                <span className="deal-detail-panel__value">
                                    {formatCurrency(deal.dealValue)}
                                </span>
                            )}
                        </div>

                        {/* Health indicator */}
                        <div className="deal-detail-panel__momentum-section">
                            <div
                                className="deal-detail-panel__health"
                                style={{
                                    background: `linear-gradient(90deg, ${getHealthColor(intelligence?.stageHealthStatus || 'healthy')}cc 0%, rgba(10, 15, 30, 0.4) 100%)`,
                                    border: `1px solid ${getHealthColor(intelligence?.stageHealthStatus || 'healthy')}44`
                                }}
                            >
                                <span className="deal-detail-panel__health-score" data-testid="health-score">
                                    {intelligence?.healthScore || 0}%
                                </span>
                                <span className="deal-detail-panel__health-label">
                                    Momentum Score
                                </span>
                                <button
                                    className="deal-detail-panel__health-info-btn"
                                    onClick={() => setShowHealthBreakdown(!showHealthBreakdown)}
                                    title="Why this health score?"
                                >
                                    ?
                                </button>

                                <AnimatePresence>
                                    {showHealthBreakdown && (
                                        <motion.div
                                            key="health-breakdown"
                                            className="deal-detail-panel__health-breakdown"
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        >
                                            <div className="health-breakdown__header">
                                                <span className="health-breakdown__title">Health Intelligence</span>
                                                <span className="health-breakdown__score">{intelligence?.healthScore || 0}%</span>
                                            </div>

                                            <div className="health-breakdown__content">
                                                <div className="health-breakdown__factors">
                                                    <div className="health-factor">
                                                        <span className={`health-factor__indicator ${daysInStage > 14 ? 'warning' : 'healthy'}`} />
                                                        <span className="health-factor__label">{daysInStage} days in current stage</span>
                                                    </div>
                                                    {intelligence?.riskSignals?.map((signal, idx) => (
                                                        <div key={idx} className="health-factor">
                                                            <span className={`health-factor__indicator ${signal.severity}`} />
                                                            <span className="health-factor__label">{signal.description}</span>
                                                        </div>
                                                    ))}
                                                    {(intelligence?.riskSignals?.length === 0 && (intelligence?.healthScore || 0) >= 70) && (
                                                        <div className="health-factor">
                                                            <span className="health-factor__indicator healthy" />
                                                            <span className="health-factor__label">No critical risks detected</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    className="health-breakdown__improve-btn"
                                                    onClick={() => {
                                                        setShowHealthBreakdown(false);
                                                        onStartZenaLive?.(deal.id);
                                                    }}
                                                >
                                                    Improve Deal Health
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button
                                className="deal-detail-panel__improve-btn"
                                onClick={() => onStartZenaLive?.(deal.id)}
                            >
                                <span className="improve-btn__icon">⚡</span>
                                IMPROVE
                            </button>
                        </div>

                        {/* Settlement countdown */}
                        {settlementDaysRemaining !== null && (
                            <div className="deal-detail-panel__countdown">
                                <span className="deal-detail-panel__countdown-number">
                                    {settlementDaysRemaining}
                                </span>
                                <span className="deal-detail-panel__countdown-label">
                                    days to settlement
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        className="deal-detail-panel__close"
                        onClick={onClose}
                        aria-label="Close panel"
                    >
                        ✕
                    </button>
                </div>

                {/* Quick Actions Bar */}
                <div className="deal-detail-panel__quick-actions">
                    {stageConfig.quickActions.map(action => (
                        <button
                            key={action.id}
                            className={`deal-detail-panel__quick-action ${action.primary ? 'deal-detail-panel__quick-action--primary' : ''}`}
                            onClick={() => handleQuickAction(action)}
                        >
                            <span className="deal-detail-panel__quick-action-icon">{action.icon}</span>
                            <span className="deal-detail-panel__quick-action-label">{action.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tabs */}
                <div className="deal-detail-panel__tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`deal-detail-panel__tab ${activeTab === tab.id ? 'deal-detail-panel__tab--active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="deal-detail-panel__tab-icon">
                                <tab.icon size={18} strokeWidth={2} />
                            </span>
                            <span className="deal-detail-panel__tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="deal-detail-panel__content" ref={contentRef}>
                    {renderContent()}
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export default DealDetailPanel;
