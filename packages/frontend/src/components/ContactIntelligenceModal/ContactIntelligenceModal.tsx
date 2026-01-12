import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, ArrowRight, MessageSquare, Lightbulb, TrendingUp, TrendingDown, Minus, Send, Shield, Target, Users, HelpCircle, Info, RefreshCw } from 'lucide-react';
import { ImprovementAction } from '../../utils/ImprovementActionsLibrary';
import { useContactIntelligence } from '../DealFlow/ZenaIntelligence/ZenaIntelligenceEngine';
import { PortfolioBriefSection } from './sections/PortfolioBriefSection';
import './ContactIntelligenceModal.css';

export interface StrategicAction {
    action: string;
    reasoning: string;
    impact: 'Low' | 'Medium' | 'High';
}

interface ContactIntelligenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    contactId: string;
    contactName: string;
    contactRole: string;
    intelScore: number;
    momentumVelocity: number;
    isLoadingStrategic?: boolean;
    strategicActions: StrategicAction[];
    onExecuteStrategy: (action: string, reasoning: string) => void;
    onImproveNow: (contactId: string, context: string) => void;
}

type TabType = 'strategy' | 'optimization';

const getIntelExplanation = (score: number): string => {
    if (score >= 80) {
        return 'High engagement! Strong responsiveness and proactive communication suggest this contact is highly motivated.';
    }
    if (score >= 60) {
        return 'Healthy relationship. Regular interactions and steady interest are maintaining a solid connection.';
    }
    if (score >= 40) {
        return 'Moderate interest. Engagement is within expected range, but could benefit from a personal touchpoint.';
    }
    return 'Needs attention. Engagement is cooling off. Consider a value-add touchpoint to re-engage.';
};

const getMomentumExplanation = (velocity: number): string => {
    if (velocity > 15) return 'Momentum is surging! Interest has spiked significantly in the last tracking period.';
    if (velocity > 0) return 'Upward trend. Engagement is steadily increasing.';
    if (velocity === 0) return 'Steady state. Relationship strength is consistent.';
    if (velocity > -15) return 'Slight cooling. Engagement has dipped recently.';
    return 'Momentum dropping. Significant decrease in interaction detected.';
};

// MOCK: Static tips for now, can be replaced by dynamic fetch later if needed
// Or we can pass optimizationTips as prop like in Property modal if we fetch them in parent
const MOCK_OPTIMIZATION_TIPS: ImprovementAction[] = [
    {
        id: '1',
        tip: 'Send a personalized market update for their target suburb',
        category: 'communication',
        priority: 'high',
        actionType: 'email'
    },
    {
        id: '2',
        tip: 'Check in on their financing status or pre-approval expiry',
        category: 'follow_up',
        priority: 'medium',
        actionType: 'email'
    },
    {
        id: '3',
        tip: 'Share a "Just Listed" property similar to their preferences',
        category: 'engagement',
        priority: 'high',
        actionType: 'email'
    }
];

export const ContactIntelligenceModal: React.FC<ContactIntelligenceModalProps> = ({
    isOpen,
    onClose,
    contactId,
    contactName,
    contactRole,
    intelScore,
    momentumVelocity,
    onExecuteStrategy,
    onImproveNow
}) => {
    const { intelligence: aiIntel, loading: aiLoading, refresh } = useContactIntelligence(contactId);
    const [activeTab, setActiveTab] = useState<TabType>('strategy');
    const [selectedTipIndices, setSelectedTipIndices] = useState<Set<number>>(new Set());
    const [optimizationTips] = useState<ImprovementAction[]>(MOCK_OPTIMIZATION_TIPS);
    const [showIntelHelp, setShowIntelHelp] = useState(false);
    const [showMomentumHelp, setShowMomentumHelp] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // If we had dynamic fetching for tips, we'd call it here
        } else {
            document.body.style.overflow = '';
            setActiveTab('strategy'); // Reset tab on close
            setSelectedTipIndices(new Set());
            setShowIntelHelp(false);
            setShowMomentumHelp(false);
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const toggleTip = (index: number) => {
        const newSelected = new Set(selectedTipIndices);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedTipIndices(newSelected);
    };

    const handleImproveNow = () => {
        const selectedTips = Array.from(selectedTipIndices)
            .map(i => optimizationTips[i]?.tip)
            .filter(Boolean);

        if (selectedTips.length > 0) {
            const context = `Improve relationship with ${contactName} by implementing: ${selectedTips.join('; ')}`;
            onImproveNow(contactId, context);
            onClose();
        }
    };

    if (!isOpen) return null;

    const intelExplanation = getIntelExplanation(intelScore);
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

    return createPortal(
        <div className="contact-intel-modal-overlay" onClick={onClose}>
            <div className="contact-intel-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="contact-intel-modal__header">
                    <div className="contact-intel-modal__title-group">
                        <div className="contact-intel-modal__icon-wrapper">
                            <Users size={20} color="#00D4FF" fill="rgba(0, 212, 255, 0.2)" />
                        </div>
                        <div>
                            <h2>Contact Intelligence Hub</h2>
                            <p className="contact-intel-modal__subtitle">{contactName} • {contactRole || 'Contact'}</p>
                        </div>
                    </div>
                    <button className="contact-intel-modal__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Intel Score Summary */}
                <div className="contact-intel-modal__score-summary">
                    <div className="contact-intel-modal__metric">
                        <div className="contact-intel-modal__label-group">
                            <span className="contact-intel-modal__label">INTEL SCORE</span>
                            <button
                                className={`contact-intel-modal__help-trigger ${showIntelHelp ? 'active' : ''}`}
                                onClick={() => setShowIntelHelp(!showIntelHelp)}
                                title="About Intel Score"
                            >
                                <HelpCircle size={12} />
                            </button>
                        </div>
                        <span className="contact-intel-modal__value" data-status={intelScore >= 60 ? 'good' : 'needs-attention'}>
                            {intelScore}%
                        </span>
                        <span className="contact-intel-modal__target">/ 75% target</span>

                        {showIntelHelp && (
                            <div className="contact-intel-modal__explanation-popover">
                                <div className="explanation-popover__header">
                                    <div className="explanation-popover__title-group">
                                        <Info size={14} />
                                        <span>Intelligence Score</span>
                                    </div>
                                    <button className="explanation-popover__close" onClick={() => setShowIntelHelp(false)}>
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="explanation-popover__content">
                                    <p>The Intel Score measures the depth of your relationship based on:</p>
                                    <ul>
                                        <li><strong>Profile (20%):</strong> Completeness of contact details.</li>
                                        <li><strong>Activity (30%):</strong> Frequency of interactions in the last 7 days.</li>
                                        <li><strong>Engagement (25%):</strong> Quality and quantity of notes.</li>
                                        <li><strong>Deals (25%):</strong> Current deal stage progression.</li>
                                    </ul>
                                    <p className="explanation-popover__tip">Tip: Use "Improve Now" actions for an instant +5% boost.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="contact-intel-modal__metric">
                        <div className="contact-intel-modal__label-group">
                            <span className="contact-intel-modal__label">MOMENTUM</span>
                            <button
                                className={`contact-intel-modal__help-trigger ${showMomentumHelp ? 'active' : ''}`}
                                onClick={() => setShowMomentumHelp(!showMomentumHelp)}
                                title="About Momentum"
                            >
                                <HelpCircle size={12} />
                            </button>
                        </div>
                        <span className={`contact-intel-modal__momentum ${momentumClass}`}>
                            <MomentumIcon size={14} />
                            {momentumVelocity >= 0 ? '+' : ''}{momentumVelocity}%
                        </span>

                        {showMomentumHelp && (
                            <div className="contact-intel-modal__explanation-popover">
                                <div className="explanation-popover__header">
                                    <div className="explanation-popover__title-group">
                                        <TrendingUp size={14} />
                                        <span>Momentum Velocity</span>
                                    </div>
                                    <button className="explanation-popover__close" onClick={() => setShowMomentumHelp(false)}>
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="explanation-popover__content">
                                    <p>Momentum tracks the direction of engagement:</p>
                                    <ul>
                                        <li><strong>Surging:</strong> Activity is increasing week-over-week.</li>
                                        <li><strong>Steady:</strong> Regular interactions are maintained.</li>
                                        <li><strong>Cooling:</strong> Automatic decay starts after 14 days of no activity.</li>
                                    </ul>
                                    <p className="explanation-popover__tip">Actioning Zena's suggestions provides a +15% momentum spike.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="contact-intel-modal__status-badge">
                        <Shield size={12} />
                        <span>Active</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="contact-intel-modal__tabs">
                    <button
                        className={`contact-intel-modal__tab ${activeTab === 'strategy' ? 'active' : ''}`}
                        onClick={() => setActiveTab('strategy')}
                    >
                        <Target size={16} />
                        <span>Engagement Strategy</span>
                        {strategicActions.length > 0 && (
                            <span className="contact-intel-modal__tab-count">{strategicActions.length}</span>
                        )}
                    </button>
                    <button
                        className={`contact-intel-modal__tab ${activeTab === 'optimization' ? 'active' : ''}`}
                        onClick={() => setActiveTab('optimization')}
                    >
                        <Lightbulb size={16} />
                        <span>Relationship Health</span>
                    </button>
                </div>

                {/* Content */}
                <div className="contact-intel-modal__content">
                    {activeTab === 'strategy' && (
                        <div className="contact-intel-modal__strategy-content">
                            {aiLoading ? (
                                <div className="contact-intel-modal__loading">
                                    <Zap size={32} className="zena-zap-pulse" />
                                    <p>Zena is analyzing relationship dynamics...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Portfolio Strategy Section */}
                                    <PortfolioBriefSection contactId={contactId} />

                                    {/* AI Brief Section */}
                                    <div className="contact-ai-brief">
                                        <div className="contact-ai-brief__item">
                                            <span className="contact-ai-brief__label">CORE MOTIVATION</span>
                                            <p className="contact-ai-brief__value">{aiIntel?.motivation || 'Analyzing...'}</p>
                                        </div>
                                        <div className="contact-ai-brief__item">
                                            <span className="contact-ai-brief__label">STRATEGIC ADVICE</span>
                                            <p className="contact-ai-brief__value">{aiIntel?.strategicAdvice || 'Analyzing...'}</p>
                                        </div>
                                    </div>

                                    <div className="contact-intel-modal__actions-list">
                                        <div className="contact-intel-modal__action-card active">
                                            <div className="contact-intel-modal__action-header">
                                                <div className="contact-intel-modal__action-badge">RECOMMENDED NEXT STEP</div>
                                                <div className="contact-intel-modal__impact-badge impact-high">High Impact</div>
                                            </div>
                                            <div className="contact-intel-modal__action-content">
                                                <h3 className="contact-intel-modal__action-title">{aiIntel?.recommendedNextStep || 'Awaiting Zena...'}</h3>
                                                <div className="contact-intel-modal__reasoning-container">
                                                    <span className="contact-intel-modal__reasoning-label">WHY IT MATTERS:</span>
                                                    <p className="contact-intel-modal__reasoning">This move aligns with detected motivation and current urgency levels.</p>
                                                </div>
                                            </div>
                                            <div className="contact-intel-modal__action-footer">
                                                <button
                                                    className="contact-intel-modal__execute-btn"
                                                    onClick={() => onExecuteStrategy(aiIntel?.recommendedNextStep || '', 'AI Recommendation')}
                                                    disabled={!aiIntel}
                                                >
                                                    <MessageSquare size={14} />
                                                    <span>Execute Action</span>
                                                    <ArrowRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'optimization' && (
                        <div className="contact-intel-modal__optimization-content">
                            <div className="contact-intel-modal__intel-explanation">
                                <p>{intelExplanation}</p>
                                <p className="contact-intel-modal__momentum-explanation">{momentumExplanation}</p>
                            </div>

                            <div className="contact-intel-modal__tips-section">
                                <div className="contact-intel-modal__tips-header">
                                    <Lightbulb size={14} />
                                    <span>How to improve your Intel Score</span>
                                </div>

                                <ul className="contact-intel-modal__tips-list">
                                    {optimizationTips.map((action, i) => (
                                        <li key={i} className="contact-intel-modal__tip-item" onClick={() => toggleTip(i)}>
                                            <div className={`contact-intel-modal__checkbox ${selectedTipIndices.has(i) ? 'checked' : ''}`}>
                                                <Zap size={10} />
                                            </div>
                                            <span>{action.tip}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    className="contact-intel-modal__improve-btn"
                                    onClick={handleImproveNow}
                                    disabled={selectedTipIndices.size === 0}
                                >
                                    <Zap size={14} />
                                    <span>Improve Now ({selectedTipIndices.size})</span>
                                    <Send size={12} />
                                </button>
                            </div>

                            <div className="contact-intel-modal__why">
                                <strong>Why it matters:</strong>
                                <p>Higher Intel scores indicate stronger relationships and higher conversion probability. Proactive engagement prevents churn and keeps you top-of-mind.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="contact-intel-modal__footer">
                    <button className={`neural-refresh-btn ${aiLoading ? 'spinning' : ''}`} onClick={() => refresh()}>
                        <RefreshCw size={14} />
                        <span>{aiLoading ? 'Refreshing Synapses...' : 'Neural Refresh'}</span>
                    </button>
                    <p>Zena Autonomous Agent • Relationship Hub</p>
                </div>
            </div>
        </div>,
        document.body
    );
};
