import React, { useState } from 'react';
import { Deal } from '../../types';
import { DealIntelligence, PowerMove } from '../../ZenaIntelligence/ZenaIntelligenceEngine';
import { StageConfiguration, QuickAction } from '../StageConfig';
import { BrainCircuit, Sparkles, ArrowRight, Mail, Phone, MessageSquare, Zap, X, Check, ShieldAlert } from 'lucide-react';
import './sections.css';

interface ActionCenterProps {
    deal: Deal;
    intelligence: DealIntelligence;
    stageConfig: StageConfiguration;
    onExecuteAction: (actionId: string, context?: any) => void;
}

export const ActionCenter: React.FC<ActionCenterProps> = ({
    deal,
    intelligence,
    stageConfig,
    onExecuteAction
}) => {
    const [selectedAction, setSelectedAction] = useState<PowerMove | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Determine the primary focus item
    // 1. AI Suggested Power Move (Highest Priority)
    // 2. Critical Risk Signal
    // 3. Stage Primary Focus (Fallback)
    const powerMove = intelligence.suggestedPowerMove;
    const topRisk = intelligence.riskSignals[0];

    const handleActionClick = (move: PowerMove) => {
        setSelectedAction(move);
        setShowPreview(true);
    };

    const handleConfirmAction = () => {
        if (selectedAction) {
            onExecuteAction('execute-power-move', { move: selectedAction });
            setShowPreview(false);
            setSelectedAction(null);
        }
    };

    // Render the Action Preview Modal
    const renderPreviewModal = () => {
        if (!showPreview || !selectedAction) return null;

        return (
            <div className="action-preview-overlay" onClick={() => setShowPreview(false)}>
                <div className="action-preview-modal" onClick={e => e.stopPropagation()}>
                    <div className="action-preview-header">
                        <div className="preview-title-group">
                            <Sparkles className="preview-icon" size={18} />
                            <h3>Review Zena's Draft</h3>
                        </div>
                        <button className="preview-close" onClick={() => setShowPreview(false)}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="action-preview-body">
                        <div className="preview-context">
                            <span className="context-label">Action:</span>
                            <span className="context-value">{selectedAction.headline}</span>
                        </div>
                        <div className="preview-content">
                            <textarea
                                className="preview-textarea"
                                defaultValue={selectedAction.draftContent}
                                readOnly={false}
                            />
                        </div>
                        <div className="preview-rationale">
                            <ShieldAlert size={14} className="rationale-icon" />
                            <span>{selectedAction.rationale}</span>
                        </div>
                    </div>

                    <div className="action-preview-footer">
                        <button className="preview-btn-cancel" onClick={() => setShowPreview(false)}>
                            Edit Manually
                        </button>
                        <button className="preview-btn-confirm" onClick={handleConfirmAction}>
                            <Zap size={16} fill="currentColor" />
                            Approve & Execute
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // If we have a Power Move, show the High-Tech UI
    if (powerMove) {
        return (
            <div className="section-card section-card--action-center">
                <div className="section-card__header">
                    <BrainCircuit className="zena-icon-tech" strokeWidth={1.5} />
                    <span className="section-card__title">Current Focus</span> {/* User asked to keep layout familiar but improved, actually let's upgrade title too but user asked about 'current focus' */}
                </div>

                <div className="action-center-hero">
                    <div className="hero-content">
                        <h3 className="hero-headline">{powerMove.headline}</h3>
                        <p className="hero-rationale">{powerMove.rationale}</p>
                    </div>
                    <div className="hero-status">
                        <span className={`priority-badge priority-${powerMove.priority}`}>
                            {powerMove.priority} Priority
                        </span>
                    </div>
                </div>

                <div className="action-center-actions">
                    <button
                        className="action-hero-btn"
                        onClick={() => handleActionClick(powerMove)}
                    >
                        <div className="btn-content">
                            <span className="btn-icon">
                                {powerMove.action === 'email' ? <Mail size={16} /> :
                                    powerMove.action === 'call' ? <Phone size={16} /> :
                                        <MessageSquare size={16} />}
                            </span>
                            <span className="btn-label">Review & {powerMove.action === 'email' ? 'Send' : 'Execute'}</span>
                        </div>
                        <ArrowRight size={16} className="btn-arrow" />
                    </button>
                </div>

                {renderPreviewModal()}
            </div>
        );
    }

    // Fallback: If no Power Move, show Risk-Based Focus (Enhanced Blocker)
    if (topRisk) {
        return (
            <div className="section-card section-card--action-center warning">
                <div className="section-card__header">
                    <ShieldAlert className="warning-icon" size={18} />
                    <span className="section-card__title">Current Focus: Risk Detected</span>
                </div>

                <div className="action-center-hero">
                    <p className="hero-rationale">{topRisk.description}</p>
                    {topRisk.daysWaiting && (
                        <div className="hero-stat">
                            Waiting {topRisk.daysWaiting} days
                        </div>
                    )}
                </div>

                <div className="action-center-actions">
                    {stageConfig.quickActions.slice(0, 2).map(action => (
                        <button
                            key={action.id}
                            className="secondary-action-btn"
                            onClick={() => onExecuteAction(action.id)}
                        >
                            {action.label}
                        </button>
                    ))}
                    <button className="secondary-action-btn zena-ask-btn" onClick={() => onExecuteAction('ask-zena')}>
                        <Sparkles size={14} /> Ask Zena
                    </button>
                </div>
            </div>
        );
    }

    // Default: Stage Focus
    return (
        <div className="section-card section-card--action-center">
            <div className="section-card__header">
                <Zap className="default-icon" size={18} />
                <span className="section-card__title">Current Focus</span>
            </div>
            <div className="action-center-hero">
                <p className="hero-rationale">{stageConfig.primaryFocus}</p>
            </div>
            <div className="action-center-actions">
                {stageConfig.quickActions.slice(0, 3).map(action => (
                    <button
                        key={action.id}
                        className="secondary-action-btn"
                        onClick={() => onExecuteAction(action.id)}
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
