/**
 * ZenaMomentumFlow - Zero-friction deal management with Zena Intelligence
 * 
 * Replaces explicit gamification with invisible momentum coaching.
 * Agents see deal health visually and receive contextual Power Moves.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Deal, PipelineType, StrategySessionContext, STAGE_LABELS } from './types';
import { ZenaDealCard, analyseDeal, fetchDealIntelligence, NZ_MARKET_DATA, DealIntelligence } from './ZenaIntelligence';
import { ZenaAvatarWidget } from '../ZenaAvatarWidget/ZenaAvatarWidget';
import { AmbientBackground } from '../AmbientBackground/AmbientBackground';
import { useEffect } from 'react';
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
    selectedStage?: string | null;
    onStageSelect?: (stage: string | null) => void;
    healthFilter?: 'all' | 'needsAttention' | 'healthy';
    onHealthFilterChange?: (filter: 'all' | 'needsAttention' | 'healthy') => void;
    isBatchMode?: boolean;
    selectedIds?: Set<string>;
    onDealUpdate?: (dealId: string, updates: Partial<Deal>) => void;
}

export const ZenaMomentumFlow: React.FC<ZenaMomentumFlowProps> = ({
    deals,
    pipelineType = 'buyer',
    onDealSelect,
    onStartZenaLive,
    selectedStage: controlledSelectedStage,
    onStageSelect,
    healthFilter: controlledHealthFilter,
    onHealthFilterChange,
    isBatchMode = false,
    selectedIds = new Set(),
    onDealUpdate,
}) => {
    const navigate = useNavigate();
    const [internalSelectedStage, setInternalSelectedStage] = useState<string | null>(null);
    const [showAllStages, setShowAllStages] = useState(false);
    const [internalHealthFilter, setInternalHealthFilter] = useState<'all' | 'needsAttention' | 'healthy'>('all');

    const [intelligenceMap, setIntelligenceMap] = useState<Record<string, DealIntelligence>>({});

    // Use controlled state if provided, otherwise internal
    const selectedStage = controlledSelectedStage !== undefined ? controlledSelectedStage : internalSelectedStage;
    const healthFilter = controlledHealthFilter !== undefined ? controlledHealthFilter : internalHealthFilter;

    // Hydrate deals with deep AI intelligence
    useEffect(() => {
        const hydrateIntelligence = async () => {
            // Only hydrate active deals shown in current view to avoid 100s of requests
            const dealsToHydrate = deals.slice(0, 10); // Batch first 10 for performance

            for (const deal of dealsToHydrate) {
                if (intelligenceMap[deal.id]) continue; // Already hydrated

                try {
                    const deepAiInt = await fetchDealIntelligence(deal.id);

                    // Executive Sync: If AI found a new risk level, update parent state
                    if (onDealUpdate && deepAiInt.riskLevel && deepAiInt.riskLevel !== deal.riskLevel) {
                        onDealUpdate(deal.id, {
                            riskLevel: deepAiInt.riskLevel,
                            // We could also sync riskFlags if needed, but riskLevel is key for stats
                        });
                    }

                    setIntelligenceMap(prev => ({
                        ...prev,
                        [deal.id]: deepAiInt
                    }));
                } catch (err) {
                    console.error('Failed to hydrate deal intelligence:', err);
                }
            }
        };

        hydrateIntelligence();
    }, [deals]);

    const handleStageSelect = useCallback((stage: string | null) => {
        if (onStageSelect) {
            onStageSelect(stage);
        } else {
            setInternalSelectedStage(stage);
        }
    }, [onStageSelect]);

    const handleHealthFilterChange = useCallback((filter: 'all' | 'needsAttention' | 'healthy') => {
        if (onHealthFilterChange) {
            onHealthFilterChange(filter);
        } else {
            setInternalHealthFilter(filter);
        }
    }, [onHealthFilterChange]);

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
            const hydratedIntelligence = intelligenceMap[deal.id] || baseIntelligence;

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
                intelligence: { ...hydratedIntelligence, ...testingOverride },
            };
        });
    }, [deals, intelligenceMap]);

    // Apply health filter to deals
    const dealsByHealth = useMemo(() => {
        // If the parent is controlling healthFilter, it means the 'deals' prop is already filtered
        if (controlledHealthFilter !== undefined) return dealsWithIntelligence;

        if (healthFilter === 'all') return dealsWithIntelligence;
        if (healthFilter === 'needsAttention') {
            return dealsWithIntelligence.filter(d => d.intelligence.stageHealthStatus === 'critical' || d.intelligence.stageHealthStatus === 'warning');
        }
        return dealsWithIntelligence.filter(d => d.intelligence.stageHealthStatus === 'healthy');
    }, [dealsWithIntelligence, healthFilter, controlledHealthFilter]);

    // Calculate stats
    const stats = useMemo(() => {
        const total = deals.length;
        const needsAttention = dealsWithIntelligence.filter(
            d => d.intelligence.stageHealthStatus === 'critical' || d.intelligence.stageHealthStatus === 'warning'
        ).length;
        const healthy = dealsWithIntelligence.filter(
            d => d.intelligence.stageHealthStatus === 'healthy'
        ).length;

        return { total, needsAttention, healthy };
    }, [deals, dealsWithIntelligence]);

    // Sort deals by health score (lowest first - needs attention)
    const sortedDeals = useMemo(() => {
        return [...dealsByHealth].sort(
            (a, b) => a.intelligence.healthScore - b.intelligence.healthScore
        );
    }, [dealsByHealth]);

    // Filter by selected stage
    const filteredDeals = useMemo(() => {
        if (!selectedStage) return sortedDeals;
        return sortedDeals.filter(d => d.deal.stage === selectedStage);
    }, [sortedDeals, selectedStage]);

    // Group deals by stage for sidebar
    const dealsByStage = useMemo(() => {
        return dealsByHealth.reduce((acc, dealWrapper) => {
            const stage = dealWrapper.deal.stage || (pipelineType === 'buyer' ? 'buyer_consult' : 'appraisal');
            if (!acc[stage]) acc[stage] = [];
            acc[stage].push(dealWrapper.deal);
            return acc;
        }, {} as Record<string, Deal[]>);
    }, [dealsByHealth, pipelineType]);

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

    // Clear all filters (stage and health)
    const clearAllFilters = useCallback(() => {
        handleStageSelect(null);
        handleHealthFilterChange('all');
    }, [handleStageSelect, handleHealthFilterChange]);

    return (
        <div className="zena-momentum-flow">
            <AmbientBackground variant="default" showParticles={true} showGradientOrbs={true} />
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
                                            onClick={() => handleStageSelect(isSelected ? null : stage)}
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

                        {(selectedStage || healthFilter !== 'all') && (
                            <button
                                className="sidebar__see-all"
                                onClick={clearAllFilters}
                            >
                                SEE ALL DEALS
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
                                isBatchMode={isBatchMode}
                                isSelected={selectedIds.has(deal.id)}
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
                    {/* Synchronise priority deals for count alignment */}
                    {(() => {
                        const priorityDeals = sortedDeals.filter(d => d.intelligence.needsLiveSession);
                        const priorityCount = priorityDeals.length;

                        return (
                            <>
                                <div className="coaching__zena-widget">
                                    <ZenaAvatarWidget
                                        variant="central"
                                        coachingStatus="Strategy Session" // Dummy status to trigger "Start Strategy Session" label
                                        onAvatarClick={() => {
                                            // INNOVATION: Clicking face opens written strategy session
                                            // Passing the exact prompt the user wants
                                            navigate('/ask-zena?mode=strategy-session&view=chat&greeting=strategy-session');
                                        }}
                                        onLiveClick={() => {
                                            // INNOVATION: Clicking button opens verbal strategy session (Zena Live)
                                            navigate(`/ask-zena?greeting=strategy-session&liveMode=true&t=${Date.now()}`);
                                        }}
                                    />
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default ZenaMomentumFlow;
