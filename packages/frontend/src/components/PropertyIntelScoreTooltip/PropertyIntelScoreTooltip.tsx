import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, TrendingUp, TrendingDown, Minus, Lightbulb, X, Zap, Send } from 'lucide-react';
import { SuggestedAction } from '../../hooks/usePropertyIntelligence';
import { fetchPropertyImprovementActions, ImprovementAction } from '../../utils/ImprovementActionsLibrary';
import './PropertyIntelScoreTooltip.css';

interface PropertyIntelScoreTooltipProps {
    propertyId: string;
    address: string;
    intelScore: number;
    momentumVelocity: number;
    suggestedActions?: SuggestedAction[];
    className?: string;
    status: string;
    onImproveNow?: (propertyId: string, context: string) => void;
}

const getIntelExplanation = (score: number, status: string): string => {
    if (score >= 80) {
        return 'High momentum! Strong buyer interest and active engagement suggest this property is performing well above market average.';
    }
    if (score >= 60) {
        return 'Healthy activity. Steady inquiries and viewings are maintaining a solid market presence.';
    }
    if (score >= 40) {
        return 'Moderate interest. Engagement is within expected range, but could benefit from a strategic pulse.';
    }
    return 'Needs attention. Engagement is below target for this listing period. Consider reviewing price or marketing strategy.';
};

const getMomentumExplanation = (velocity: number): string => {
    if (velocity > 15) return 'Momentum is surging! Interest has spiked significantly in the last tracking period.';
    if (velocity > 0) return 'Upward trend. Engagement is steadily increasing.';
    if (velocity === 0) return 'Steady state. Market interest is consistent.';
    if (velocity > -15) return 'Slight cooling. Engagement has dipped recently.';
    return 'Momentum dropping. Significant decrease in buyer engagement detected.';
};

export const PropertyIntelScoreTooltip: React.FC<PropertyIntelScoreTooltipProps> = ({
    propertyId,
    address,
    intelScore,
    momentumVelocity,
    suggestedActions = [],
    className = '',
    status,
    onImproveNow
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [actions, setActions] = useState<ImprovementAction[]>([]);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const tooltipRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                tooltipRef.current &&
                buttonRef.current &&
                !tooltipRef.current.contains(e.target as Node) &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Load dynamic actions when tooltip opens
            loadActions();
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, propertyId]);

    const loadActions = async () => {
        setIsLoading(true);
        try {
            const dynamicActions = await fetchPropertyImprovementActions(propertyId);
            setActions(dynamicActions);
            // Reset selection when new actions load - user selects their own tips
            setSelectedIndices(new Set());
        } catch (err) {
            console.warn('Failed to fetch property improvement actions', err);
            setActions([]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTooltip = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const toggleTip = (index: number) => {
        const newSelected = new Set(selectedIndices);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedIndices(newSelected);
    };

    const handleImproveNow = (e: React.MouseEvent) => {
        e.stopPropagation();

        const currentActions = actions.length > 0 ? actions : (suggestedActions.map(a => typeof a === 'string' ? { tip: a } : { tip: a.action }));
        const selectedTips = Array.from(selectedIndices)
            .map(i => currentActions[i]?.tip)
            .filter(Boolean);

        if (selectedTips.length > 0 && onImproveNow) {
            const context = `Improve property at ${address} by implementing: ${selectedTips.join('; ')}`;
            onImproveNow(propertyId, context);
            setIsOpen(false);
        }
    };

    const intelExplanation = getIntelExplanation(intelScore, status);
    const momentumExplanation = getMomentumExplanation(momentumVelocity);

    const MomentumIcon = momentumVelocity > 5
        ? TrendingUp
        : momentumVelocity < -5
            ? TrendingDown
            : Minus;

    const momentumClass = momentumVelocity > 5
        ? 'positive'
        : momentumVelocity < -5
            ? 'negative'
            : 'neutral';

    const bestAction = actions.find(a => a.actionType === 'email' && a.emailTemplate);

    return (
        <div className={`property-intel-tooltip-wrapper ${className}`}>
            <button
                ref={buttonRef}
                className="property-intel-help-btn"
                onClick={toggleTooltip}
                aria-label="What does this score mean?"
                aria-expanded={isOpen}
                style={{
                    color: '#8B5CF6',
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                }}
            >
                <HelpCircle size={16} />
            </button>

            {isOpen && createPortal(
                <div className="property-intel-tooltip-overlay" onClick={toggleTooltip}>
                    <div
                        ref={tooltipRef}
                        className="property-intel-tooltip"
                        role="tooltip"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="property-intel-tooltip__header">
                            <h4>Property Intelligence</h4>
                            <button className="property-intel-tooltip__close" onClick={toggleTooltip}>
                                <X size={14} />
                            </button>
                        </div>

                        <div className="property-intel-tooltip__content">
                            <div className="property-intel-tooltip__section">
                                <div className="property-intel-tooltip__metric">
                                    <span className="property-intel-tooltip__label">INTEL</span>
                                    <span className="property-intel-tooltip__value" data-status={intelScore >= 60 ? 'good' : 'needs-attention'}>
                                        {intelScore}%
                                    </span>
                                    <span className="property-intel-tooltip__target">/ 75% target</span>
                                </div>
                                <p className="property-intel-tooltip__explanation">{intelExplanation}</p>
                            </div>

                            <div className="property-intel-tooltip__section">
                                <div className="property-intel-tooltip__metric">
                                    <span className="property-intel-tooltip__label">MOMENTUM</span>
                                    <span className={`property-intel-tooltip__momentum ${momentumClass}`}>
                                        <MomentumIcon size={14} />
                                        {momentumVelocity >= 0 ? '+' : ''}{momentumVelocity}%
                                    </span>
                                </div>
                                <p className="property-intel-tooltip__explanation">{momentumExplanation}</p>
                            </div>

                            <div className="property-intel-tooltip__context">
                                <span className="property-intel-tooltip__stage-label">Status:</span>
                                <span className="property-intel-tooltip__stage-text">{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')} Intelligence</span>
                            </div>

                            <div className="property-intel-tooltip__tips">
                                <div className="property-intel-tooltip__tips-header">
                                    <Lightbulb size={14} />
                                    <span>How to improve</span>
                                </div>
                                {isLoading ? (
                                    <div className="intel-loading">
                                        <Zap size={14} className="spinning" />
                                        <span>Zena is thinking...</span>
                                    </div>
                                ) : actions.length > 0 ? (
                                    <ul className="property-intel-tips-list">
                                        {actions.slice(0, 3).map((action, i) => (
                                            <li key={i} className="property-intel-tip-item" onClick={() => toggleTip(i)}>
                                                <div className={`property-intel-checkbox ${selectedIndices.has(i) ? 'checked' : ''}`}>
                                                    <Zap size={10} />
                                                </div>
                                                <span>{action.tip}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <ul className="property-intel-tips-list">
                                        {suggestedActions.slice(0, 3).map((action, i) => {
                                            const tipText = typeof action === 'string' ? action : action.action;
                                            return (
                                                <li key={i} className="property-intel-tip-item" onClick={() => toggleTip(i)}>
                                                    <div className={`property-intel-checkbox ${selectedIndices.has(i) ? 'checked' : ''}`}>
                                                        <Zap size={10} />
                                                    </div>
                                                    <span>{tipText}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}

                                {onImproveNow && !isLoading && (
                                    <button
                                        className="intel-tooltip__improve-btn"
                                        onClick={handleImproveNow}
                                        disabled={selectedIndices.size === 0}
                                    >
                                        <Zap size={14} />
                                        <span>Improve Now ({selectedIndices.size})</span>
                                        <Send size={12} />
                                    </button>
                                )}
                            </div>

                            <div className="property-intel-tooltip__why">
                                <strong>Why it matters:</strong>
                                <p>High Intel scores correlate with faster sales and better offers. Momentum shifts help you proactively adjust campaign strategy before a listing go stale.</p>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
