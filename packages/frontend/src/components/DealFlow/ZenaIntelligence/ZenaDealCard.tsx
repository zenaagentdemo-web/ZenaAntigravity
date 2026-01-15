/**
 * ZenaDealCard - Intelligent deal card with health pulse and coaching
 * 
 * Replaces the gamified deal card with a zero-friction momentum-focused card.
 * Shows deal health visually, Zena's coaching insight, and a one-tap Power Move.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Deal, STAGE_LABELS, formatCurrency, StrategySessionContext } from '../types';
import { analyseDeal, personalisePowerMove, DealIntelligence, getHealthColor } from './ZenaIntelligenceEngine';
import { PowerPulse } from './PowerPulse';
import { PowerMoveCard } from './PowerMoveCard';
import { Zap } from 'lucide-react';
import './ZenaDealCard.css';

interface ZenaDealCardProps {
    deal: Deal;
    precomputedIntelligence?: DealIntelligence; // Allow parent to pass pre-computed intelligence
    onClick?: () => void;
    onPowerMoveExecute?: (dealId: string, action: string, content: string) => void;
    onStartZenaLive?: (context: StrategySessionContext) => void; // Strategy session handler
    compact?: boolean;
    isHighlighted?: boolean;
    isDimmed?: boolean;
    isBatchMode?: boolean;
    isSelected?: boolean;
}

export const ZenaDealCard: React.FC<ZenaDealCardProps> = ({
    deal,
    precomputedIntelligence,
    onClick,
    onPowerMoveExecute,
    onStartZenaLive,
    compact = false,
    isHighlighted = false,
    isDimmed = false,
    isBatchMode = false,
    isSelected = false,
}) => {
    const [showPowerMove, setShowPowerMove] = useState(false);

    // Use precomputed intelligence if provided, otherwise analyse fresh
    const intelligence: DealIntelligence = useMemo(
        () => precomputedIntelligence || analyseDeal(deal),
        [deal, precomputedIntelligence]
    );

    // Personalise the power move with deal data
    const personalisedPowerMove = useMemo(() => {
        if (!intelligence.suggestedPowerMove) return null;
        return personalisePowerMove(intelligence.suggestedPowerMove, deal);
    }, [intelligence.suggestedPowerMove, deal]);

    const handlePowerMoveClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setShowPowerMove(!showPowerMove);
    }, [showPowerMove]);

    const handlePowerMoveExecute = useCallback((action: string, content: string) => {
        onPowerMoveExecute?.(deal.id, action, content);
        setShowPowerMove(false);
    }, [deal.id, onPowerMoveExecute]);

    const stageLabel = STAGE_LABELS[deal.stage] || deal.stage;
    const hasRisk = intelligence.riskSignals.length > 0;
    const healthClass = `zena-deal-card--${intelligence.stageHealthStatus}`;

    // Extract suburb for secondary line
    const suburb = useMemo(() => {
        const address = deal.property?.address || '';
        const parts = address.split(',');
        if (parts.length > 1) {
            return parts[1].trim();
        }
        return null;
    }, [deal.property?.address]);

    const isStalled = useMemo(() => {
        return intelligence.riskSignals.some(s => s.type === 'stalling');
    }, [intelligence.riskSignals]);

    const needsAction = useMemo(() => {
        // A deal needs action if:
        // 1. It has any risk signals (risk, overdue conditions, tasks, actions)
        // 2. Its risk level is explicitly high or critical
        return intelligence.riskSignals.length > 0 || deal.riskLevel === 'high' || deal.riskLevel === 'critical';
    }, [intelligence.riskSignals, deal.riskLevel]);

    const mainAddress = useMemo(() => {
        const address = deal.property?.address || 'Unknown Property';
        return address.split(',')[0].trim();
    }, [deal.property?.address]);

    // Handle Zena Live click - build context and pass to parent
    const handleZenaLiveClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onStartZenaLive) return;

        const context: StrategySessionContext = {
            dealId: deal.id,
            address: deal.property?.address || 'Unknown Property',
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

        onStartZenaLive(context);
    }, [deal, intelligence, stageLabel, onStartZenaLive]);

    return (
        <motion.div
            className={`zena-deal-card ${healthClass} ${isStalled ? 'zena-deal-card--stalled' : ''} ${needsAction ? 'zena-deal-card--needs-action' : ''} ${compact ? 'zena-deal-card--compact' : ''} ${isHighlighted ? 'zena-deal-card--highlighted' : ''} ${isDimmed ? 'zena-deal-card--dimmed' : ''} ${isSelected ? 'zena-deal-card--selected' : ''}`}
            onClick={onClick}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
            layout
        >
            {isBatchMode && (
                <div className={`zena-deal-card__checkbox ${isSelected ? 'zena-deal-card__checkbox--selected' : ''}`}>
                    {isSelected && <div className="checkmark-stem"></div>}
                    {isSelected && <div className="checkmark-kick"></div>}
                </div>
            )}



            {/* Scanning Laser - Only show for warning/critical deals (ambient) */}
            {intelligence.stageHealthStatus !== 'healthy' && (
                <div className="zena-deal-card__scanner" />
            )}

            {/* Mount-Time Digital Scan-In Animation */}
            <motion.div
                className="zena-deal-card__mount-scan"
                initial={{ top: '-10%', opacity: 0 }}
                animate={{ top: '110%', opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.8, ease: "easeInOut", delay: 0.1 }}
            />

            {/* Power Pulse - visual health indicator */}
            <div className="zena-deal-card__health-container">
                <PowerPulse
                    healthScore={intelligence.healthScore}
                    size={compact ? 'small' : 'medium'}
                />
            </div>

            {/* Card Header */}
            <div className="zena-deal-card__header">
                <div className="zena-deal-card__title-row">
                    <div className="zena-deal-card__address">
                        <span className="zena-deal-card__main-address">{mainAddress}</span>
                        {suburb && <span className="zena-deal-card__suburb">{suburb}</span>}
                    </div>
                </div>
                <div className="zena-deal-card__stage-column">
                    <div
                        className="zena-deal-card__stage"
                        data-status={intelligence.stageHealthStatus}
                        style={{
                            color: getHealthColor(intelligence.healthScore),
                            borderColor: `${getHealthColor(intelligence.healthScore)}33`,
                            background: `${getHealthColor(intelligence.healthScore)}15`
                        }}
                    >
                        {isStalled ? 'STALLED' : stageLabel}
                    </div>
                    <div className="zena-deal-card__days">
                        {intelligence.daysInStage}d
                    </div>
                </div>
            </div>

            {/* Deal Info */}
            <div className="zena-deal-card__info-bar">
                <div className="zena-deal-card__value">
                    {deal.dealValue ? formatCurrency(deal.dealValue) : 'TBC'}
                </div>
            </div>

            {/* Coaching Snippet on face */}
            {intelligence.coachingInsight && (
                <div className="zena-deal-card__surface-insight">
                    <span className="insight-pulse"></span>
                    <p className="insight-text">{intelligence.coachingInsight}</p>
                </div>
            )}

            {/* Proactive Action Button */}
            {intelligence.needsLiveSession && !showPowerMove && (
                <button
                    className="zena-deal-card__proactive-action"
                    onClick={handleZenaLiveClick}
                >
                    <Zap size={14} />
                    <span>STRATEGY SESSION</span>
                </button>
            )}

            {(hasRisk || personalisedPowerMove) && (
                <div className={`zena-deal-card__intelligence-toggle ${showPowerMove ? 'zena-deal-card__intelligence-toggle--active' : ''} ${intelligence.stageHealthStatus === 'critical' ? 'zena-deal-card__intelligence-toggle--pulsate' : ''}`}
                    onClick={handlePowerMoveClick}
                    title={showPowerMove ? "Hide Intelligence" : "Show Intelligence Suggestions"}
                >
                    <img src={intelligence.stageHealthStatus === 'critical' || intelligence.stageHealthStatus === 'warning' ? "/assets/icons/lightning_bolt_premium.png" : "/assets/icons/lightbulb_premium.png"}
                        alt="Intelligence"
                        className="zena-deal-card__intel-icon"
                    />
                </div>
            )}

            <AnimatePresence>
                {showPowerMove && (
                    <motion.div
                        className="zena-deal-card__expanded-content"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        {/* Power Move Card */}
                        {personalisedPowerMove && (
                            <div className="zena-deal-card__power-move-container">
                                <PowerMoveCard
                                    powerMove={personalisedPowerMove}
                                    onExecute={(action, content) => handlePowerMoveExecute(action, content)}
                                    onDismiss={() => setShowPowerMove(false)}
                                    compact={compact}
                                />
                            </div>
                        )}

                        {/* Zena Live Action (fallback if not proactive button) */}
                        {!intelligence.needsLiveSession && intelligence.needsLiveSession && (
                            <button
                                className="zena-deal-card__live-indicator"
                                onClick={handleZenaLiveClick}
                            >
                                <span className="zena-deal-card__live-icon">🧠</span>
                                <span className="zena-deal-card__live-text">START STRATEGY SESSION</span>
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ZenaDealCard;
