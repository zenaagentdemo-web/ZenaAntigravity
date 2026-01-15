/**
 * IntelligenceTab - Deep AI-driven deal analysis and strategic guidance
 */

import React from 'react';
import { Deal, RISK_BADGES } from '../../types';
import { DealIntelligence } from '../../ZenaIntelligence/ZenaIntelligenceEngine';
import './sections.css';

interface IntelligenceTabProps {
    deal: Deal;
    intelligence: DealIntelligence;
    onStartZenaLive?: (dealId: string) => void;
    onRefresh?: () => void;
    isLoading?: boolean;
}

export const IntelligenceTab: React.FC<IntelligenceTabProps> = ({
    deal,
    intelligence,
    onStartZenaLive,
    onRefresh,
    isLoading = false
}) => {
    const riskInfo = RISK_BADGES[intelligence.riskLevel || 'none'];

    return (
        <div className="intelligence-tab">
            {/* Risk Scan Header */}
            <div className="intelligence-risk-card">
                <div className="risk-meter">
                    <div className="risk-meter__gauge">
                        <div
                            className="risk-meter__fill"
                            style={{
                                height: `${intelligence.healthScore}%`,
                                background: riskInfo.color
                            }}
                        />
                        <div className="risk-meter__target" style={{ bottom: `${intelligence.healthScore}%` }} />
                    </div>
                    <div className="risk-meter__value">
                        <span className="value-number">{intelligence.healthScore}%</span>
                        <span className="value-label">MOMENTUM SCORE</span>
                    </div>
                </div>

                <div className="risk-summary">
                    <div className="risk-summary__status">
                        <span className="emoji">{riskInfo.emoji}</span>
                        <div className="text">
                            <span className="label">Risk Profile</span>
                            <span className="value" style={{ color: riskInfo.color }}>{riskInfo.label}</span>
                        </div>
                    </div>
                    <div className="intelligence-brief">
                        <h4>Zena Intelligence Brief</h4>
                        <p className="intelligence-brief__summary">
                            {intelligence.executiveSummary || intelligence.coachingInsight}
                        </p>
                    </div>
                </div>
            </div>

            {/* AI Power Move */}
            {intelligence.suggestedPowerMove && (
                <div className="ai-power-move-section">
                    <div className="section-label">RECOMMENDED POWER MOVE</div>
                    <div className="ai-power-move-card">
                        <div className="ai-power-move-card__header">
                            <div className="ai-power-move-card__title">
                                <span className="ai-power-move-card__icon">
                                    {intelligence.suggestedPowerMove.action === 'email' ? '✉️' :
                                        intelligence.suggestedPowerMove.action === 'call' ? '📞' : '📱'}
                                </span>
                                <h3>{intelligence.suggestedPowerMove.headline}</h3>
                            </div>
                            <span className={`priority-badge priority-${intelligence.suggestedPowerMove.priority}`}>
                                {intelligence.suggestedPowerMove.priority.toUpperCase()}
                            </span>
                        </div>
                        <p className="ai-power-move-card__rationale">{intelligence.suggestedPowerMove.rationale}</p>
                        <div className="ai-power-move-card__actions">
                            <button className="ai-power-move-card__btn primary">
                                Execute {intelligence.suggestedPowerMove.action}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Strategic Options (Power Moves) */}
            <div className="section-label">STRATEGIC OPTIONS</div>
            <div className="power-moves-grid">
                {intelligence.riskSignals.slice(0, 3).map((signal, idx) => (
                    <div key={idx} className="power-move-card">
                        <div className="power-move-card__header">
                            <span className="type-tag">{signal.type.replace('_', ' ')}</span>
                            <span className="severity-dot" style={{ background: signal.severity === 'high' ? '#ef4444' : '#eab308' }} />
                        </div>
                        <p className="power-move-card__desc">{signal.description}</p>
                        <button className="power-move-card__action">
                            Launch Counter-Strategy
                        </button>
                    </div>
                ))}
            </div>

            {/* Zena Command Button */}
            <div className="zena-command-section">
                <div className="zena-command-card" onClick={() => onStartZenaLive?.(deal.id)}>
                    <div className="zena-logo-anim">
                        <div className="zena-logo-ring" />
                        <div className="zena-logo-ring" />
                        <span className="zena-icon">✨</span>
                    </div>
                    <div className="zena-command-text">
                        <h3>Initiate Strategy Session</h3>
                        <p>Zena will guide you through a live tactical brainstorm for this deal.</p>
                    </div>
                    <span className="command-arrow">→</span>
                </div>
            </div>

            <div className="intelligence-meta">

                <button
                    className={`intelligence-refresh-btn ${isLoading ? 'spinning' : ''}`}
                    onClick={onRefresh}
                    disabled={isLoading}
                >
                    <span className="icon">{isLoading ? '⌛' : '🔄'}</span>
                    {isLoading ? 'Neural Syncing...' : 'Neural Refresh'}
                </button>
            </div>
        </div>
    );
};
