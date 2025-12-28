import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore, XPEvent } from './GameSystem';
import { XPBar, XPPopupQueue, DailyQuests, Leaderboard } from './GameUI';
import { TacticalDealCard } from './GameUI/TacticalDealCard';
import { TacticalIcons } from './GameUI/TacticalIcons';
import { Deal } from './types';
import './GamifiedDealFlow.css';

// Stage colors & Icon mapping
const STAGE_CONFIG: Record<string, { color: string; icon: keyof typeof TacticalIcons; label: string }> = {
    'new_lead': { color: '#00f3ff', icon: 'Lead', label: 'New Lead' },
    'viewings': { color: '#ff003c', icon: 'Viewing', label: 'Viewings' },
    'offer_made': { color: '#ffd700', icon: 'Offer', label: 'Offer Made' },
    'conditional': { color: '#bc13fe', icon: 'Conditional', label: 'Conditional' },
    'unconditional': { color: '#ff9500', icon: 'Action', label: 'Unconditional' },
    'pre_settlement': { color: '#00ff41', icon: 'Action', label: 'Pre-Settlement' },
    'settled': { color: '#00ff41', icon: 'Settled', label: 'Settled' },
};

interface GamifiedDealFlowProps {
    deals: Deal[];
    onDealSelect?: (deal: Deal) => void;
}

export const GamifiedDealFlow: React.FC<GamifiedDealFlowProps> = ({ deals, onDealSelect }) => {
    const { awardXP, recordDailyLogin, recentXPEvents } = useGameStore();
    const [popupEvents, setPopupEvents] = useState<XPEvent[]>([]);
    const [selectedStage, setSelectedStage] = useState<string | null>(null);

    // Record daily login on mount
    useEffect(() => {
        recordDailyLogin();
    }, []);

    // Show new XP events as popups
    useEffect(() => {
        if (recentXPEvents.length > 0 && recentXPEvents[0]) {
            const latestEvent = recentXPEvents[0];
            if (!popupEvents.find(e => e.id === latestEvent.id)) {
                setPopupEvents(prev => [...prev, latestEvent]);
                // Remove after display
                setTimeout(() => {
                    setPopupEvents(prev => prev.filter(e => e.id !== latestEvent.id));
                }, 3000);
            }
        }
    }, [recentXPEvents]);

    // Group deals by stage
    const dealsByStage = deals.reduce((acc, deal) => {
        const stage = deal.stage || 'new_lead';
        if (!acc[stage]) acc[stage] = [];
        acc[stage].push(deal);
        return acc;
    }, {} as Record<string, Deal[]>);

    // Calculate stage stats
    const stageStats = Object.entries(STAGE_CONFIG).map(([key, config]) => ({
        key,
        ...config,
        count: dealsByStage[key]?.length || 0,
        deals: dealsByStage[key] || []
    }));

    const totalDeals = deals.length;
    const settledDeals = dealsByStage['settled']?.length || 0;

    // Handle deal action (simulated for demo)
    const handleDealAction = useCallback((deal: Deal, action: string) => {
        switch (action) {
            case 'view':
                awardXP('DEAL_STATUS_UPDATE', { description: `Viewed ${deal.property?.address || 'deal'}` });
                break;
            case 'update':
                awardXP('DEAL_STATUS_UPDATE', { description: 'Status updated' });
                break;
            case 'note':
                awardXP('NOTE_ADDED', { description: 'Note added' });
                break;
        }
        onDealSelect?.(deal);
    }, [awardXP, onDealSelect]);

    return (
        <div className="gamified-deal-flow">
            {/* Top Bar - XP Progress */}
            <div className="gamified-deal-flow__header">
                <XPBar showSessionXP={true} />
            </div>

            {/* Main Content Area */}
            <div className="gamified-deal-flow__content">
                {/* Left Panel - Pipeline Overview */}
                <div className="gamified-deal-flow__pipeline">
                    <h3 className="pipeline__title">COMMAND CENTER</h3>

                    <div className="pipeline__stats">
                        <div className="pipeline__stat">
                            <span className="pipeline__stat-value">{totalDeals}</span>
                            <span className="pipeline__stat-label">OPERATIONAL</span>
                        </div>
                        <div className="pipeline__stat pipeline__stat--settled">
                            <span className="pipeline__stat-value">{settledDeals}</span>
                            <span className="pipeline__stat-label">TARGETS HIT</span>
                        </div>
                    </div>

                    {/* Stage Funnel */}
                    <div className="pipeline__funnel">
                        {stageStats.map((stage, index) => {
                            const Icon = TacticalIcons[stage.icon];
                            return (
                                <motion.div
                                    key={stage.key}
                                    className={`funnel__stage ${selectedStage === stage.key ? 'funnel__stage--selected' : ''}`}
                                    onClick={() => setSelectedStage(selectedStage === stage.key ? null : stage.key)}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    style={{
                                        borderLeftColor: stage.color,
                                        '--stage-color': stage.color
                                    } as React.CSSProperties}
                                >
                                    <span className="funnel__stage-icon"><Icon /></span>
                                    <span className="funnel__stage-label">{stage.label}</span>
                                    <span className="funnel__stage-count">
                                        {stage.count}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Center Panel - Tactical Grid */}
                <div className="gamified-deal-flow__deals">
                    <div className="deals__header-tactical">
                        <h3 className="deals__title">
                            {selectedStage ? STAGE_CONFIG[selectedStage]?.label : 'ALL OPERATIONS'}
                            <span className="deals__count">
                                [{selectedStage ? dealsByStage[selectedStage]?.length || 0 : totalDeals}]
                            </span>
                        </h3>
                        {selectedStage && (
                            <button className="deals__clear-filter" onClick={() => setSelectedStage(null)}>
                                RESET SCAN
                            </button>
                        )}
                    </div>

                    <div className="deals__grid">
                        {deals.map((deal: Deal, index: number) => {
                            const stageConfig = STAGE_CONFIG[deal.stage || 'new_lead'];
                            const isDimmed = selectedStage !== null && deal.stage !== selectedStage;

                            // Mock intelligence values
                            const velocity = 40 + (index * 7) % 55;
                            const probability = 30 + (index * 13) % 65;
                            const isStalled = index % 5 === 0;

                            return (
                                <TacticalDealCard
                                    key={deal.id}
                                    deal={deal}
                                    onClick={() => handleDealAction(deal, 'view')}
                                    onAction={(e, action) => handleDealAction(deal, action)}
                                    statusColor={stageConfig?.color || '#fff'}
                                    isDimmed={isDimmed}
                                    velocity={velocity}
                                    probability={probability}
                                    isStalled={isStalled}
                                />
                            );
                        })}

                        {(selectedStage ? dealsByStage[selectedStage]?.length : totalDeals) === 0 && (
                            <div className="deals__empty">
                                <div className="empty-tactical-fx" />
                                <span>NO ACTIVE SIGNALS IN THIS FREQUENCY</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Quests & Leaderboard */}
                <div className="gamified-deal-flow__sidebar">
                    <DailyQuests />
                    <div className="sidebar__spacer" />
                    <Leaderboard compact />
                </div>
            </div>

            {/* XP Popups */}
            <XPPopupQueue
                events={popupEvents}
                onEventComplete={(id: string) => setPopupEvents(prev => prev.filter(e => e.id !== id))}
            />
        </div>
    );
};

export default GamifiedDealFlow;
