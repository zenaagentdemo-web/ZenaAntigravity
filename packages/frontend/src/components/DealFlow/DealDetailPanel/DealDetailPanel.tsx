/**
 * DealDetailPanel - Slide-in panel showing deal details when card is clicked
 */

import React, { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Deal, STAGE_LABELS, formatCurrency, calculateDaysInStage } from '../types';
import { getStageConfig, QuickAction } from './StageConfig';
import { analyseDeal, DealIntelligence } from '../ZenaIntelligence/ZenaIntelligenceEngine';
import { logActivity } from '../utils/ActivityLogger';

// Section components
import {
    BlockerWidget,
    QuickContacts,
    KeyDatesSection,
    ConditionsTracker,
    CommissionPreview,
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

interface DealDetailPanelProps {
    deal: Deal;
    onClose: () => void;
    onDealUpdate?: (deal: Deal) => void;
    onNavigateToContact?: (contactId: string) => void;
    onStartZenaLive?: (dealId: string) => void;
}

type TabId = 'overview' | 'intelligence' | 'people' | 'timeline' | 'financials';

interface Tab {
    id: TabId;
    label: string;
    icon: string;
}

const TABS: Tab[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'intelligence', label: 'Intelligence', icon: '🧠' },
    { id: 'people', label: 'People', icon: '👥' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
    { id: 'financials', label: 'Financials', icon: '💰' },
];

export const DealDetailPanel: React.FC<DealDetailPanelProps> = ({
    deal,
    onClose,
    onDealUpdate,
    onNavigateToContact,
    onStartZenaLive,
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('overview');

    // Get stage configuration
    const stageConfig = getStageConfig(deal.stage, deal.pipelineType);

    // Get Zena intelligence
    const intelligence: DealIntelligence = analyseDeal(deal);

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

    // Handle quick action click
    const handleQuickAction = useCallback((action: QuickAction) => {
        switch (action.action) {
            case 'call': {
                handleCommunication('call');
                break;
            }
            case 'sms': {
                handleCommunication('sms');
                break;
            }
            case 'email': {
                handleCommunication('email');
                break;
            }
            default:
                console.log('Action triggered:', action.id);
                break;
        }
    }, [handleCommunication]);

    // Get health status color
    const getHealthColor = (status: 'healthy' | 'warning' | 'critical') => {
        switch (status) {
            case 'healthy': return 'var(--color-success, #22c55e)';
            case 'warning': return 'var(--color-warning, #eab308)';
            case 'critical': return 'var(--color-error, #ef4444)';
        }
    };

    // Render overview tab content dynamically based on stage configuration
    const renderOverviewTab = () => {
        const sortedSections = [...stageConfig.sections].sort((a, b) => a.order - b.order);

        return (
            <div className="deal-detail-panel__overview">
                <StageProgressHeader
                    currentStage={deal.stage}
                    pipelineType={deal.pipelineType}
                />

                {sortedSections.map((section, idx) => {
                    if (section.priority === 'hidden') return null;

                    switch (section.id) {
                        case 'blocker':
                            return intelligence.riskSignals.length > 0 && (
                                <BlockerWidget
                                    key={`blocker-${idx}`}
                                    riskSignals={intelligence.riskSignals}
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
                        case 'commission':
                            return (
                                <CommissionPreview
                                    key={`commission-${idx}`}
                                    dealValue={deal.dealValue}
                                    estimatedCommission={deal.estimatedCommission}
                                    isConjunctional={deal.isConjunctional}
                                    conjunctionalSplit={deal.conjunctionalSplit}
                                    settlementDate={deal.settlementDate}
                                />
                            );
                        case 'zenaCoaching':
                            return (
                                <ZenaCoachingPanel
                                    key={`coaching-${idx}`}
                                    intelligence={intelligence}
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

    // Render financials tab content
    const renderFinancialsTab = () => (
        <div className="deal-detail-panel__financials">
            <CommissionPreview
                dealValue={deal.dealValue}
                estimatedCommission={deal.estimatedCommission}
                isConjunctional={deal.isConjunctional}
                conjunctionalSplit={deal.conjunctionalSplit}
                settlementDate={deal.settlementDate}
            />
        </div>
    );

    const renderIntelligenceTab = () => {
        return (
            <div className="deal-detail-panel__content-inner">
                <IntelligenceTab
                    deal={deal}
                    intelligence={intelligence}
                    onStartZenaLive={onStartZenaLive}
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
            case 'financials':
                return renderFinancialsTab();
            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                className="deal-detail-panel__backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />

            {/* Panel */}
            <motion.div
                className="deal-detail-panel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
                {/* Tactical Brackets */}
                <div className="deal-detail-panel__bracket tl" />
                <div className="deal-detail-panel__bracket tr" />
                <div className="deal-detail-panel__bracket bl" />
                <div className="deal-detail-panel__bracket br" />

                {/* Header */}
                <div className="deal-detail-panel__header">
                    <div className="deal-detail-panel__header-content">
                        <h2 className="deal-detail-panel__address">
                            {deal.property?.address || 'Unknown Property'}
                        </h2>
                        <div className="deal-detail-panel__meta">
                            <span
                                className="deal-detail-panel__stage"
                                style={{ borderColor: getHealthColor(intelligence.stageHealthStatus) }}
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
                        <div
                            className="deal-detail-panel__health"
                            style={{ backgroundColor: getHealthColor(intelligence.stageHealthStatus) }}
                        >
                            <span className="deal-detail-panel__health-score">
                                {intelligence.healthScore}%
                            </span>
                            <span className="deal-detail-panel__health-label">
                                {intelligence.stageHealthStatus === 'healthy' ? 'On Track' :
                                    intelligence.stageHealthStatus === 'warning' ? 'Needs Attention' : 'Critical'}
                            </span>
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
                            <span className="deal-detail-panel__tab-icon">{tab.icon}</span>
                            <span className="deal-detail-panel__tab-label">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="deal-detail-panel__content">
                    {renderContent()}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DealDetailPanel;
