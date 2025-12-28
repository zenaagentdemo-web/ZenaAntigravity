import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HelpCircle, TrendingUp, TrendingDown, Minus, Lightbulb, X, Zap, Send } from 'lucide-react';
import {
    EngagementScore,
    ContactRole,
    getIntelExplanation,
    getMomentumExplanation,
    DealStage
} from '../../utils/ContactEngagementScorer';
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
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
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
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const tooltipHeight = 450; // Approximate max tooltip height
            const spaceBelow = viewportHeight - rect.bottom;

            // If not enough space below, position above
            if (spaceBelow < tooltipHeight && rect.top > tooltipHeight) {
                setPosition('top');
            } else {
                setPosition('bottom');
            }
        }
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
                <HelpCircle size={12} />
            </button>

            {isOpen && (
                <div ref={tooltipRef} className={`intel-tooltip intel-tooltip--${position}`} role="tooltip">
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
                    } else {
                        // Fallback to static
                        setActions(getImprovementActions(role, dealStage === 'none' ? undefined : dealStage));
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch AI actions, using fallback');
                if (isMounted) {
                    setActions(getImprovementActions(role, dealStage === 'none' ? undefined : dealStage));
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        loadActions();

        return () => { isMounted = false; };
    }, [contactId, contactName, role, dealStage]);

    // Find best action with email template
    const bestAction = useMemo(() =>
        actions.find(a => a.emailTemplate) || actions[0] || null,
        [actions]
    );

    const handleImproveNow = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!bestAction?.emailTemplate || !onImproveNow) return;

        const personalized = personalizeEmailTemplate(
            bestAction.emailTemplate,
            contactName,
            'Your Name' // TODO: Get from user context
        );

        onImproveNow({
            contactName,
            contactEmail,
            subject: personalized.subject,
            body: personalized.body
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
            ) : (
                <ul>
                    {actions.slice(0, 3).map((action, i) => (
                        <li key={action.id || i}>{action.tip}</li>
                    ))}
                </ul>
            )}
            {bestAction?.emailTemplate && onImproveNow && (
                <button
                    className="intel-tooltip__improve-btn"
                    onClick={handleImproveNow}
                >
                    <Zap size={14} />
                    <span>Improve Now</span>
                    <Send size={12} />
                </button>
            )}
        </div>
    );
};

export default IntelScoreTooltip;
