import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, TrendingUp, TrendingDown, Minus, Lightbulb, X, Zap, Send } from 'lucide-react';
import {
    EngagementScore,
    ContactRole,
    DealStage
} from '../../models/contact.types';
import {
    getImprovementActions,
    fetchImprovementActions, // Import the new async function
    getBestImprovementAction,
    personalizeEmailTemplate,
    ImprovementAction
} from '../../utils/ImprovementActionsLibrary';
import './IntelScoreTooltip.css';

interface ImproveNowPayload {
    contactName: string;
    contactEmail?: string;
    subject: string;
    body: string;
    context?: string; // Selected tips context
}

interface IntelScoreTooltipProps {
    score: EngagementScore;
    contactId: string; // Add contactId
    role: ContactRole;
    contactName: string;
    contactEmail?: string;
    className?: string;
    onImproveNow?: (payload: ImproveNowPayload) => void;
}

// --- Explanation Logic (Moved from redundant utility) ---
const STAGE_CONFIG: Record<string, any> = {
    lead: { context: 'New lead - needs active engagement to qualify', momentumExpectation: 'high' },
    qualified: { context: 'Qualified lead - building momentum', momentumExpectation: 'positive' },
    viewing: { context: 'Active viewings - peak engagement period', momentumExpectation: 'high' },
    offer: { context: 'Offer stage - critical communication period', momentumExpectation: 'positive' },
    conditional: { context: 'Conditional - waiting on conditions to clear', momentumExpectation: 'stable' },
    pre_settlement: { context: 'Pre-settlement - transaction winding down', momentumExpectation: 'declining_ok' },
    sold: { context: 'Recently settled - hibernation mode is normal', momentumExpectation: 'low' },
    nurture: { context: 'Nurture phase - periodic touchpoints maintain relationship', momentumExpectation: 'stable' },
    none: { context: 'No active deal - general contact', momentumExpectation: 'stable' }
};

const getIntelExplanation = (score: EngagementScore, role: ContactRole): string => {
    // Neural Narrative Priority (Remediation Step 2)
    if (score.reasoning) {
        return score.reasoning;
    }

    const { intelScore, adjustedTarget, isOnTrack, stageContext } = score;
    if (isOnTrack) {
        if (intelScore >= 80) {
            return role === 'buyer'
                ? 'Hot lead! High engagement suggests they\'re ready to make a move.'
                : role === 'vendor'
                    ? 'Strong vendor relationship. Campaign communication is solid.'
                    : 'Excellent engagement level for this contact.';
        }
        return `On track. ${stageContext}`;
    } else {
        const gap = adjustedTarget - intelScore;
        if (gap > 30) return `Needs attention. Currently ${gap}% below target for this stage.`;
        return `Slightly below target. ${stageContext}`;
    }
};

const getMomentumExplanation = (momentum: number, dealStage?: DealStage): string => {
    const stage = dealStage || 'none';
    const config = STAGE_CONFIG[stage] || STAGE_CONFIG.none;
    if (momentum > 20) return 'Building momentum - they\'re heating up!';
    if (momentum > 0) return 'Slight upward momentum.';
    if (momentum === 0) return 'Engagement is steady.';
    if (momentum > -20) {
        if (config.momentumExpectation === 'declining_ok' || config.momentumExpectation === 'low') return 'Normal cooling as transaction completes.';
        return 'Slight slowdown in engagement.';
    }
    if (config.momentumExpectation === 'declining_ok' || config.momentumExpectation === 'low') return 'Expected reduction post-transaction.';
    return 'Momentum dropping - may need re-engagement.';
};

export const IntelScoreTooltip: React.FC<IntelScoreTooltipProps> = ({
    score,
    contactId,
    role,
    contactName,
    contactEmail,
    className = '',
    onImproveNow
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close on click outside
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

    // Calculate position when opening
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const toggleTooltip = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const intelExplanation = getIntelExplanation(score, role);
    const momentumExplanation = getMomentumExplanation(score.momentum, score.dealStage === 'none' ? undefined : score.dealStage);

    // Determine momentum icon
    const MomentumIcon = score.momentum > 5
        ? TrendingUp
        : score.momentum < -5
            ? TrendingDown
            : Minus;

    const momentumClass = score.momentum > 5
        ? 'positive'
        : score.momentum < -5
            ? 'negative'
            : 'neutral';

    return (
        <div className={`intel-tooltip-wrapper ${className}`}>
            <button
                ref={buttonRef}
                className="intel-help-btn"
                onClick={toggleTooltip}
                aria-label="What does this score mean?"
                aria-expanded={isOpen}
            >
                <HelpCircle size={16} />
            </button>

            {isOpen && createPortal(
                <div className="intel-tooltip-overlay" onClick={toggleTooltip}>
                    <div
                        ref={tooltipRef}
                        className="intel-tooltip"
                        role="tooltip"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="intel-tooltip__header">
                            <h4>Intelligence Score</h4>
                            <button className="intel-tooltip__close" onClick={toggleTooltip}>
                                <X size={14} />
                            </button>
                        </div>

                        <div className="intel-tooltip__content">
                            {/* Intel Score Section */}
                            <div className="intel-tooltip__section">
                                <div className="intel-tooltip__metric">
                                    <span className="intel-tooltip__label">Intel</span>
                                    <span
                                        className="intel-tooltip__value"
                                        data-status={score.isOnTrack ? 'good' : 'needs-attention'}
                                    >
                                        {score.intelScore}%
                                    </span>
                                    <span className="intel-tooltip__target">
                                        / {score.adjustedTarget}% target
                                    </span>
                                </div>
                                <p className="intel-tooltip__explanation">{intelExplanation}</p>
                            </div>

                            {/* Momentum Section */}
                            <div className="intel-tooltip__section">
                                <div className="intel-tooltip__metric">
                                    <span className="intel-tooltip__label">Momentum</span>
                                    <span className={`intel-tooltip__momentum ${momentumClass}`}>
                                        <MomentumIcon size={14} />
                                        {score.momentum >= 0 ? '+' : ''}{score.momentum}%
                                    </span>
                                </div>
                                <p className="intel-tooltip__explanation">{momentumExplanation}</p>
                            </div>

                            {/* Stage Context */}
                            <div className="intel-tooltip__context">
                                <span className="intel-tooltip__stage-label">Stage:</span>
                                <span className="intel-tooltip__stage-text">{score.stageContext}</span>
                            </div>

                            {/* Improvement Tips */}
                            {!score.isOnTrack && (
                                <ImprovementSection
                                    role={role}
                                    dealStage={score.dealStage}
                                    contactId={contactId}
                                    contactName={contactName}
                                    contactEmail={contactEmail}
                                    onImproveNow={onImproveNow}
                                    onClose={() => setIsOpen(false)}
                                />
                            )}

                            {/* Why It Matters */}
                            <div className="intel-tooltip__why">
                                <strong>Why it matters:</strong>
                                {role === 'buyer' && (
                                    <p>High Intel scores indicate engaged buyers ready to transact. Low scores may mean they're cooling off or considering other agents.</p>
                                )}
                                {role === 'vendor' && (
                                    <p>Strong vendor engagement leads to smoother campaigns and better outcomes. Regular communication builds trust.</p>
                                )}
                                {(role !== 'buyer' && role !== 'vendor') && (
                                    <p>Engagement scores help prioritize your time on contacts most likely to convert.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// Sub-component for improvement tips with actionable button
interface ImprovementSectionProps {
    role: ContactRole;
    dealStage: DealStage | 'none';
    contactId: string;
    contactName: string;
    contactEmail?: string;
    onImproveNow?: (payload: ImproveNowPayload) => void;
    onClose: () => void;
}

const ImprovementSection: React.FC<ImprovementSectionProps> = ({
    role,
    dealStage,
    contactId,
    contactName,
    contactEmail,
    onImproveNow,
    onClose
}) => {
    const [actions, setActions] = useState<ImprovementAction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    // Fetch dynamic actions on mount
    useEffect(() => {
        let isMounted = true;

        async function loadActions() {
            setIsLoading(true);
            try {
                // Fetch from Zena Brain
                const dynamicActions = await fetchImprovementActions({
                    id: contactId,
                    name: contactName,
                    role
                });

                if (isMounted) {
                    if (dynamicActions && dynamicActions.length > 0) {
                        setActions(dynamicActions);
                        setSelectedIndices(new Set()); // User selects their own tips
                    } else {
                        setActions([]);
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch AI actions');
                if (isMounted) {
                    setActions([]);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        loadActions();

        return () => { isMounted = false; };
    }, [contactId, contactName, role, dealStage]);

    const bestAction = useMemo(() =>
        actions.find(a => a.emailTemplate) || actions[0] || null,
        [actions]
    );

    const toggleTip = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('[IntelScoreTooltip] toggleTip called with index:', index);
        const newSelected = new Set(selectedIndices);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        console.log('[IntelScoreTooltip] New selected indices:', Array.from(newSelected));
        setSelectedIndices(newSelected);
    };

    const handleImproveNow = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onImproveNow || selectedIndices.size === 0) return;

        const selectedTips = Array.from(selectedIndices)
            .map(i => actions[i]?.tip)
            .filter(Boolean);

        const context = `Improve engagement with ${contactName} by implementing: ${selectedTips.join('; ')}`;

        const personalized = bestAction?.emailTemplate
            ? personalizeEmailTemplate(bestAction.emailTemplate, contactName, 'Your Name')
            : { subject: 'Following Up', body: '' };

        onImproveNow({
            contactName,
            contactEmail,
            subject: personalized.subject,
            body: context ? '' : personalized.body, // Pass empty body if context exists to force AI generation
            context
        });
        onClose();
    };

    if (actions.length === 0 && !isLoading) return null;

    return (
        <div className="intel-tooltip__tips">
            <div className="intel-tooltip__tips-header">
                <Lightbulb size={14} />
                <span>How to improve</span>
            </div>
            {isLoading ? (
                <div className="intel-loading">
                    <Zap size={14} className="spinning" />
                    <span>Zena is thinking...</span>
                </div>
            ) : actions.length > 0 ? (
                <ul className="intel-tips-list">
                    {actions.slice(0, 3).map((action, i) => (
                        <li key={action.id || i} className="intel-tip-item" onClick={(e) => toggleTip(i, e)}>
                            <div className={`intel-checkbox ${selectedIndices.has(i) ? 'checked' : ''}`}>
                                <Zap size={10} />
                            </div>
                            <span>{action.tip}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="intel-tooltip__no-actions">
                    <Zap size={14} />
                    <span>Zena is currently strategizing contextual next steps for this contact.</span>
                </div>
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
    );
};

export default IntelScoreTooltip;
