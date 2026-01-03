import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, ArrowRight, MessageSquare, Lightbulb, TrendingUp, TrendingDown, Minus, Send, Shield, Target, HelpCircle, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchPropertyImprovementActions, ImprovementAction } from '../../utils/ImprovementActionsLibrary';
import './PropertyIntelligenceModal.css';

export interface StrategicAction {
    action: string;
    reasoning: string;
    impact: 'Low' | 'Medium' | 'High';
}

interface PropertyIntelligenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    propertyAddress: string;
    intelScore: number;
    momentumVelocity: number;
    status: string;
    strategicActions: StrategicAction[];
    aiReasoning?: string;
    isLoadingStrategic?: boolean;
    onExecuteStrategy: (action: string, reasoning: string) => void;
    onImproveNow: (propertyId: string, context: string) => void;
}

type TabType = 'strategy' | 'optimization';

const getIntelExplanation = (score: number): string => {
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

export const PropertyIntelligenceModal: React.FC<PropertyIntelligenceModalProps> = ({
    isOpen,
    onClose,
    propertyId,
    propertyAddress,
    intelScore,
    momentumVelocity,
    status,
    strategicActions,
    aiReasoning,
    isLoadingStrategic = false,
    onExecuteStrategy,
    onImproveNow
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('strategy');
    const [optimizationTips, setOptimizationTips] = useState<ImprovementAction[]>([]);
    const [isLoadingOptimization, setIsLoadingOptimization] = useState(false);
    const [selectedTipIndices, setSelectedTipIndices] = useState<Set<number>>(new Set());
    const [showIntelHelp, setShowIntelHelp] = useState(false);
    const [showMomentumHelp, setShowMomentumHelp] = useState(false);

    useEffect(() => {
        if (isOpen && activeTab === 'optimization') {
            loadOptimizationTips();
        }
    }, [isOpen, activeTab, propertyId]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            setShowIntelHelp(false);
            setShowMomentumHelp(false);
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const loadOptimizationTips = async () => {
        setIsLoadingOptimization(true);
        try {
            const tips = await fetchPropertyImprovementActions(propertyId);
            setOptimizationTips(tips);
            setSelectedTipIndices(new Set());
        } catch (err) {
            console.warn('Failed to fetch optimization tips', err);
            setOptimizationTips([]);
        } finally {
            setIsLoadingOptimization(false);
        }
    };

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
            const context = `Improve property at ${propertyAddress} by implementing: ${selectedTips.join('; ')}`;
            onImproveNow(propertyId, context);
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
        <div className="property-intel-modal-overlay" onClick={onClose}>
            <div className="property-intel-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="property-intel-modal__header">
                    <div className="property-intel-modal__title-group">
                        <div className="property-intel-modal__icon-wrapper">
                            <Zap size={20} color="#FFD700" fill="#FFD700" />
                        </div>
                        <div>
                            <h2>Property Intelligence Hub</h2>
                            <p className="property-intel-modal__subtitle">{propertyAddress}</p>
                        </div>
                    </div>
                    <button className="property-intel-modal__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Intel Score Summary */}
                <div className="property-intel-modal__score-summary">
                    <div className="property-intel-modal__metric">
                        <div className="property-intel-modal__label-group">
                            <span className="property-intel-modal__label">INTEL SCORE</span>
                            <button
                                className={`property-intel-modal__help-trigger ${showIntelHelp ? 'active' : ''}`}
                                onClick={() => setShowIntelHelp(!showIntelHelp)}
                                title="About Intel Score"
                            >
                                <HelpCircle size={14} />
                            </button>
                        </div>
                        <span className="property-intel-modal__value" data-status={intelScore >= 60 ? 'good' : 'needs-attention'}>
                            {intelScore}%
                        </span>
                        <span className="property-intel-modal__target">/ 75% target</span>

                        {showIntelHelp && (
                            <div className="property-intel-modal__explanation-popover">
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
                                    <p>Propensity to Sell (Intel Score) is a real-time analysis of your listing's performance:</p>
                                    <ul>
                                        <li><strong>Velocity:</strong> Ratio of Inquiries & Viewings against Days on Market.</li>
                                        <li><strong>Buyer Depth:</strong> Number of high-intent buyers tracking this property.</li>
                                        <li><strong>Deal Logic:</strong> Active offers or conditional contracts drive this score higher.</li>
                                        <li><strong>Sentiment:</strong> Context from linked email threads and timeline events.</li>
                                    </ul>
                                    <p className="explanation-popover__tip">Tip: Execute "Campaign Strategy" actions to boost momentum.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="property-intel-modal__metric">
                        <div className="property-intel-modal__label-group">
                            <span className="property-intel-modal__label">MOMENTUM</span>
                            <button
                                className={`property-intel-modal__help-trigger ${showMomentumHelp ? 'active' : ''}`}
                                onClick={() => setShowMomentumHelp(!showMomentumHelp)}
                                title="About Momentum"
                            >
                                <HelpCircle size={14} />
                            </button>
                        </div>
                        <span className={`property-intel-modal__momentum ${momentumClass}`}>
                            <MomentumIcon size={14} />
                            {momentumVelocity >= 0 ? '+' : ''}{momentumVelocity}%
                        </span>

                        {showMomentumHelp && (
                            <div className="property-intel-modal__explanation-popover">
                                <div className="explanation-popover__header">
                                    <div className="explanation-popover__title-group">
                                        <TrendingUp size={14} />
                                        <span>Momentum (Buyer Depth)</span>
                                    </div>
                                    <button className="explanation-popover__close" onClick={() => setShowMomentumHelp(false)}>
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="explanation-popover__content">
                                    <p>Momentum measures the volume and quality of buyer curiosity:</p>
                                    <ul>
                                        <li><strong>Buyer Matches:</strong> How many qualified buyers in the pool fit this profile.</li>
                                        <li><strong>Click-throughs:</strong> Recent property page views and digital interactions.</li>
                                        <li><strong>Tracking:</strong> Volume of buyers who have "pinned" or saved this property.</li>
                                    </ul>
                                    <p className="explanation-popover__tip">Actioning "Listing Health" tips can reset stale momentum.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="property-intel-modal__status-badge">
                        <Shield size={12} />
                        <span>{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="property-intel-modal__tabs">
                    <button
                        className={`property-intel-modal__tab ${activeTab === 'strategy' ? 'active' : ''}`}
                        onClick={() => setActiveTab('strategy')}
                    >
                        <Target size={16} />
                        <span>Campaign Strategy</span>
                        {strategicActions.length > 0 && (
                            <span className="property-intel-modal__tab-count">{strategicActions.length}</span>
                        )}
                    </button>
                    <button
                        className={`property-intel-modal__tab ${activeTab === 'optimization' ? 'active' : ''}`}
                        onClick={() => setActiveTab('optimization')}
                    >
                        <Lightbulb size={16} />
                        <span>Listing Health</span>
                    </button>
                </div>

                {/* Content */}
                <div className="property-intel-modal__content">
                    {activeTab === 'strategy' && (
                        <div className="property-intel-modal__strategy-content">
                            <p className="property-intel-modal__section-description">
                                High-impact tactical moves to accelerate buyer conversion and campaign momentum.
                            </p>

                            {isLoadingStrategic ? (
                                <div className="property-intel-modal__loading">
                                    <Zap size={32} className="zena-zap-pulse" />
                                    <p>Zena is analyzing market dynamics...</p>
                                </div>
                            ) : strategicActions.length === 0 ? (
                                <div className="property-intel-modal__empty">
                                    <p>No strategic actions available at this time.</p>
                                </div>
                            ) : (
                                <div className="property-intel-modal__actions-list">
                                    {strategicActions.map((item, index) => (
                                        <div key={index} className="property-intel-modal__action-card">
                                            <div className="property-intel-modal__action-header">
                                                <div className="property-intel-modal__action-badge">STRATEGIC RECOMMENDATION</div>
                                                <div className={`property-intel-modal__impact-badge impact-${(item.impact || 'Medium').toLowerCase()}`}>
                                                    {item.impact || 'Medium'} Impact
                                                </div>
                                            </div>
                                            <div className="property-intel-modal__action-content">
                                                <h3 className="property-intel-modal__action-title">{item.action}</h3>
                                                <div className="property-intel-modal__reasoning-container">
                                                    <span className="property-intel-modal__reasoning-label">WHY IT MATTERS:</span>
                                                    <p className="property-intel-modal__reasoning">{item.reasoning}</p>
                                                </div>
                                            </div>
                                            <div className="property-intel-modal__action-footer">
                                                <button
                                                    className="property-intel-modal__execute-btn"
                                                    onClick={() => onExecuteStrategy(item.action, item.reasoning)}
                                                >
                                                    <MessageSquare size={14} />
                                                    <span>Execute Action</span>
                                                    <ArrowRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'optimization' && (
                        <div className="property-intel-modal__optimization-content">
                            <div className="property-intel-modal__intel-explanation">
                                <p>{intelExplanation}</p>
                                <p className="property-intel-modal__momentum-explanation">{momentumExplanation}</p>
                            </div>

                            <div className="property-intel-modal__tips-section">
                                <div className="property-intel-modal__tips-header">
                                    <Lightbulb size={14} />
                                    <span>How to improve your Intel Score</span>
                                </div>

                                {isLoadingOptimization ? (
                                    <div className="property-intel-modal__loading">
                                        <Zap size={24} className="zena-zap-pulse" />
                                        <span>Zena is thinking...</span>
                                    </div>
                                ) : optimizationTips.length > 0 ? (
                                    <>
                                        <ul className="property-intel-modal__tips-list">
                                            {optimizationTips.slice(0, 3).map((action, i) => (
                                                <li key={i} className="property-intel-modal__tip-item" onClick={() => toggleTip(i)}>
                                                    <div className={`property-intel-modal__checkbox ${selectedTipIndices.has(i) ? 'checked' : ''}`}>
                                                        <Zap size={10} />
                                                    </div>
                                                    <span>{action.tip}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            className="property-intel-modal__improve-btn"
                                            onClick={handleImproveNow}
                                            disabled={selectedTipIndices.size === 0}
                                        >
                                            <Zap size={14} />
                                            <span>Improve Now ({selectedTipIndices.size})</span>
                                            <Send size={12} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="property-intel-modal__empty">
                                        <p>No optimization tips available.</p>
                                    </div>
                                )}
                            </div>

                            <div className="property-intel-modal__why">
                                <strong>Why it matters:</strong>
                                <p>High Intel scores correlate with faster sales and better offers. Momentum shifts help you proactively adjust campaign strategy before a listing goes stale.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="property-intel-modal__footer">
                    <p>Zena Autonomous Agent • Property Intelligence Hub</p>
                </div>
            </div>
        </div>,
        document.body
    );
};
