/**
 * ZenaMomentumFlow - Zero-friction deal management with Zena Intelligence
 * 
 * Replaces explicit gamification with invisible momentum coaching.
 * Agents see deal health visually and receive contextual Power Moves.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Deal, PipelineType, StrategySessionContext, STAGE_LABELS } from './types';
import { ZenaDealCard, analyseDeal, NZ_MARKET_DATA } from './ZenaIntelligence';
import { ZenaAvatarWidget } from '../ZenaAvatarWidget/ZenaAvatarWidget';
import { AmbientBackground } from '../AmbientBackground/AmbientBackground';
import './ZenaMomentumFlow.css';

const STAGE_CONFIG: Record<string, { colour: string; label: string }> = {
    'buyer_consult': { colour: '#00f3ff', label: 'Consult' },
    'shortlisting': { colour: '#00f3ff', label: 'Shortlist' },
    'viewings': { colour: '#ff9500', label: 'Viewings' },
    'offer_made': { colour: '#ffd700', label: 'Offer Made' },
    'conditional': { colour: '#bc13fe', label: 'Conditional' },
    'unconditional': { colour: '#00ff41', label: 'Unconditional' },
    'pre_settlement': { colour: '#00ff41', label: 'Pre-Settlement' },
    'settled': { colour: '#22c55e', label: 'Settled' },
    'appraisal': { colour: '#00f3ff', label: 'Appraisal' },
    'listing_signed': { colour: '#00f3ff', label: 'Listed' },
    'marketing': { colour: '#ff9500', label: 'Marketing' },
    'offers_received': { colour: '#ffd700', label: 'Offers' },
    'nurture': { colour: '#6b7280', label: 'Nurture' },
};

// High-end NZ property data for realism
const LUXURY_NZ_ADDRESSES = [
    '15 Marine Parade, Herne Bay',
    '42 Kohimarama Road, Kohimarama',
    '108 Remuera Road, Remuera',
    '56 Victoria Avenue, Remuera',
    '23 Arney Road, Remuera',
    '8 Cliff Road, St Heliers',
    '19 Paritai Drive, Orakei',
    '34 The Strand, Parnell',
    '27 Hanene Street, St Heliers',
    '12 Minnehaha Avenue, Takapuna',
];

// Chronological orders
const BUYER_SEQUENCE = ['buyer_consult', 'shortlisting', 'viewings', 'offer_made', 'conditional', 'unconditional', 'pre_settlement', 'settled', 'nurture'];
const SELLER_SEQUENCE = ['appraisal', 'listing_signed', 'marketing', 'offers_received', 'conditional', 'unconditional', 'pre_settlement', 'settled', 'nurture'];

interface ZenaMomentumFlowProps {
    deals: Deal[];
    pipelineType?: PipelineType;
    onDealSelect?: (deal: Deal) => void;
    onStartZenaLive?: (context: StrategySessionContext) => void;
}

export const ZenaMomentumFlow: React.FC<ZenaMomentumFlowProps> = ({
    deals,
    pipelineType = 'buyer',
    onDealSelect,
    onStartZenaLive,
}) => {
    const [selectedStage, setSelectedStage] = useState<string | null>(null);
    const [showAllStages, setShowAllStages] = useState(false);

    // Analyse all deals for intelligence and NZ-ify addresses
    const dealsWithIntelligence = useMemo(() => {
        return deals.map((deal, index) => {
            // Inject realistic NZ data if it looks like mock data
            const realisticAddress = deal.property?.address === 'Mock Property 246' || !deal.property?.address || deal.property?.address === 'Unknown Property'
                ? LUXURY_NZ_ADDRESSES[index % LUXURY_NZ_ADDRESSES.length]
                : deal.property.address;

            const realisticDeal = {
                ...deal,
                property: {
                    ...deal.property,
                    address: realisticAddress
                }
            };

            const baseIntelligence = analyseDeal(realisticDeal);

            // TESTING MODE: Force first 3 deals to appear in Momentum Radar
            // Remove this block when connected to real data
            const testingOverride = index < 3 ? {
                healthScore: [35, 48, 55][index],
                stageHealthStatus: ['critical', 'warning', 'warning'][index] as 'critical' | 'warning' | 'healthy',
                needsLiveSession: true,
                riskSignals: [{
                    type: 'stalling' as const,
                    severity: ['critical', 'high', 'medium'][index] as 'critical' | 'high' | 'medium',
                    detectedAt: new Date(),
                    description: [
                        'Finance condition expires tomorrow - urgent action needed',
                        'No activity for 8 days - buyer may be cooling off',
                        'Extended conditional period - check for hidden concerns'
                    ][index],
                }],
                healthVelocity: [-8, -3, -5][index],
                coachingInsight: [
                    'Finance is in the red zone. Nudge the broker now.',
                    'Buyer has gone quiet. A lifestyle nudge can restart momentum.',
                    'Long conditionals kill deals. Get confirmation of intent today.'
                ][index],
            } : {};

            return {
                deal: realisticDeal,
                intelligence: { ...baseIntelligence, ...testingOverride },
            };
        });
    }, [deals]);

    // Sort deals by health score (lowest first - needs attention)
    const sortedDeals = useMemo(() => {
        return [...dealsWithIntelligence].sort(
            (a, b) => a.intelligence.healthScore - b.intelligence.healthScore
        );
    }, [dealsWithIntelligence]);

    // Filter by selected stage
    const filteredDeals = useMemo(() => {
        if (!selectedStage) return sortedDeals;
        return sortedDeals.filter(d => d.deal.stage === selectedStage);
    }, [sortedDeals, selectedStage]);

    // Calculate stats
    const stats = useMemo(() => {
        const total = deals.length;
        const needsAttention = dealsWithIntelligence.filter(
            d => d.intelligence.stageHealthStatus === 'critical' || d.intelligence.stageHealthStatus === 'warning'
        ).length;
        const healthy = dealsWithIntelligence.filter(
            d => d.intelligence.stageHealthStatus === 'healthy'
        ).length;
        const avgHealthScore = total > 0
            ? Math.round(dealsWithIntelligence.reduce((sum, d) => sum + d.intelligence.healthScore, 0) / total)
            : 0;

        return { total, needsAttention, healthy, avgHealthScore };
    }, [deals, dealsWithIntelligence]);

    // Group deals by stage for sidebar
    const dealsByStage = useMemo(() => {
        return deals.reduce((acc, deal) => {
            const stage = deal.stage || (pipelineType === 'buyer' ? 'buyer_consult' : 'appraisal');
            if (!acc[stage]) acc[stage] = [];
            acc[stage].push(deal);
            return acc;
        }, {} as Record<string, Deal[]>);
    }, [deals, pipelineType]);

    // Determine relevant stages in chronological order
    const relevantSequence = pipelineType === 'buyer' ? BUYER_SEQUENCE : SELLER_SEQUENCE;

    // Filter visible stages based on showAllStages toggle
    const visibleStages = useMemo(() => {
        const sequence = relevantSequence;
        if (showAllStages) return sequence;

        // Only show stages with deals
        return sequence.filter(stage => (dealsByStage[stage]?.length || 0) > 0);
    }, [relevantSequence, showAllStages, dealsByStage]);

    // Handle power move execution
    const handlePowerMoveExecute = useCallback((dealId: string, action: string, content: string) => {
        console.log('Power Move executed:', { dealId, action, content });
    }, []);

    return (
        <div className="zena-momentum-flow">
            <AmbientBackground variant="default" showParticles={true} showGradientOrbs={true} />
            {/* Header - Stats Overview */}
            <div className="zena-momentum-flow__header">
                <div className="momentum-header__stats">
                    <div className="momentum-stat">
                        <div className="momentum-stat__header">
                            <span className="momentum-stat__value">{stats.total}</span>
                            <div className="status-beacon status-beacon--active" />
                        </div>
                        <span className="momentum-stat__label">Active Deals</span>
                    </div>
                    <div className="momentum-stat momentum-stat--warning">
                        <div className="momentum-stat__header">
                            <span className="momentum-stat__value">{stats.needsAttention}</span>
                            {stats.needsAttention > 0 && <div className="status-beacon status-beacon--warning" />}
                        </div>
                        <span className="momentum-stat__label">Need Attention</span>
                    </div>
                    <div className="momentum-stat momentum-stat--healthy">
                        <div className="momentum-stat__header">
                            <span className="momentum-stat__value">{stats.healthy}</span>
                            <div className="status-beacon status-beacon--healthy" />
                        </div>
                        <span className="momentum-stat__label">On Track</span>
                    </div>
                    <div className="momentum-stat">
                        <div className="momentum-stat__header">
                            <span className="momentum-stat__value">{stats.avgHealthScore}%</span>
                            <div className="status-beacon status-beacon--active" />
                        </div>
                        <span className="momentum-stat__label">Avg Health</span>
                    </div>
                </div>

            </div>

            {/* Main Content */}
            <div className="zena-momentum-flow__content">
                {/* Left Sidebar - Stage Filter */}
                <div className="zena-momentum-flow__sidebar">
                    <h3 className="sidebar__title">PIPELINE</h3>

                    <div className="sidebar__stages-container">
                        {/* The Momemtum Line (Timeline) */}
                        <div className="sidebar__momentum-line" />

                        <div className="sidebar__stages">
                            <AnimatePresence initial={false}>
                                {visibleStages.map((stage) => {
                                    const config = STAGE_CONFIG[stage];
                                    if (!config) return null;

                                    const count = dealsByStage[stage]?.length || 0;
                                    const isSelected = selectedStage === stage;

                                    return (
                                        <motion.button
                                            key={stage}
                                            className={`sidebar__stage ${isSelected ? 'sidebar__stage--selected' : ''}`}
                                            onClick={() => setSelectedStage(isSelected ? null : stage)}
                                            style={{
                                                '--stage-colour': config.colour,
                                            } as React.CSSProperties}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            whileHover={{ x: 4 }}
                                        >
                                            <span className="stage__indicator" />
                                            <span className="stage__label">{config.label}</span>
                                            <span className="stage__count">{count}</span>
                                        </motion.button>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="sidebar__actions">
                        <button
                            className="sidebar__toggle-all"
                            onClick={() => setShowAllStages(!showAllStages)}
                        >
                            {showAllStages ? 'Show Active Only' : 'See All Stages'}
                            <span className={`toggle-icon ${showAllStages ? 'open' : ''}`}>▼</span>
                        </button>

                        {selectedStage && (
                            <button
                                className="sidebar__clear-filter"
                                onClick={() => setSelectedStage(null)}
                            >
                                Clear Selection
                            </button>
                        )}
                    </div>
                </div>

                {/* Center - Deal Grid */}
                <div className="zena-momentum-flow__deals">
                    <div className="deals__header">
                        <h3 className="deals__title">
                            {selectedStage
                                ? STAGE_CONFIG[selectedStage]?.label || selectedStage
                                : 'All Deals'}
                            <span className="deals__count">({filteredDeals.length})</span>
                        </h3>
                        <div className="deals__sort-info">
                            Sorted by urgency
                        </div>
                    </div>

                    <div className="deals__grid">
                        {filteredDeals.map(({ deal, intelligence }) => (
                            <ZenaDealCard
                                key={deal.id}
                                deal={deal}
                                precomputedIntelligence={intelligence}
                                onClick={() => onDealSelect?.(deal)}
                                onPowerMoveExecute={handlePowerMoveExecute}
                                onStartZenaLive={onStartZenaLive}
                                isDimmed={selectedStage !== null && deal.stage !== selectedStage}
                                isHighlighted={intelligence.needsLiveSession}
                            />
                        ))}

                        {filteredDeals.length === 0 && (
                            <div className="deals__empty">
                                <span className="deals__empty-icon">🔍</span>
                                <span className="deals__empty-text">
                                    No deals in this stage
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar - Zena Coaching Hub */}
                <div className="zena-momentum-flow__coaching">
                    <div className="coaching__zena-widget">
                        <ZenaAvatarWidget
                            variant="central"
                            coachingStatus={stats.needsAttention > 0
                                ? `Hone-In: ${stats.needsAttention} Sticky Deals`
                                : 'Analysing Pipeline...'}
                            onLiveClick={() => onStartZenaLive?.()}
                        />
                    </div>

                    <div className="coaching__priority-deals">
                        <div className="coaching__header-row">
                            <h4 className="coaching__section-title">Momentum Radar</h4>
                            <div className="momentum-radar__dot" />
                        </div>

                        <div className="priority-deals__list">
                            {sortedDeals
                                .filter(d => d.intelligence.needsLiveSession)
                                .slice(0, 3)
                                .map(({ deal, intelligence }) => {
                                    // Build context for strategy session
                                    const stageLabel = STAGE_LABELS[deal.stage] || deal.stage;
                                    const context: StrategySessionContext = {
                                        dealId: deal.id,
                                        address: deal.property?.address || 'Unknown',
                                        stage: deal.stage,
                                        stageLabel,
                                        dealValue: deal.dealValue,
                                        daysInStage: intelligence.daysInStage,
                                        healthScore: intelligence.healthScore,
                                        healthStatus: intelligence.stageHealthStatus,
                                        primaryRisk: intelligence.riskSignals[0]?.description || 'Deal needs attention',
                                        riskType: intelligence.riskSignals[0]?.type || 'stalling',
                                        coachingInsight: intelligence.coachingInsight,
                                        suggestedAction: intelligence.suggestedPowerMove?.headline,
                                        contactName: deal.contacts?.[0]?.name,
                                    };

                                    return (
                                        <motion.div
                                            key={deal.id}
                                            className="priority-deal"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            onClick={() => onStartZenaLive?.(context)}
                                            whileHover={{ x: 4, backgroundColor: 'rgba(255, 0, 60, 0.15)' }}
                                        >
                                            <div className="priority-deal__header">
                                                <span className="priority-deal__address">
                                                    {deal.property?.address || 'Unknown'}
                                                </span>
                                                <span className="priority-deal__risk-badge">
                                                    {intelligence.healthScore}%
                                                    <span className={`priority-deal__trend ${intelligence.healthVelocity < 0 ? 'down' : 'up'}`}>
                                                        {intelligence.healthVelocity > 0 ? '↑' : '↓'}{Math.abs(intelligence.healthVelocity)}%
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="priority-deal__insight">
                                                {intelligence.riskSignals[0]?.description || 'Deal needs attention'}
                                            </div>
                                            <div className="priority-deal__action-hint">
                                                START STRATEGY SESSION →
                                            </div>
                                        </motion.div>
                                    );
                                })}

                            {sortedDeals.filter(d => d.intelligence.needsLiveSession).length === 0 && (
                                <div className="coaching__all-good">
                                    <div className="all-good__icon">✨</div>
                                    <div className="all-good__text">All deals are on track</div>
                                    <div className="all-good__subtext">Zena is monitoring for new signals</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ZenaMomentumFlow;
