/**
 * BlockerWidget - Shows current deal blocker/bottleneck with quick actions
 */

import React from 'react';
import { QuickAction } from '../StageConfig';
import './sections.css';

export interface RiskSignal {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    daysWaiting?: number;
}

interface BlockerWidgetProps {
    riskSignals: RiskSignal[];
    nextAction?: string;
    nextActionOwner?: 'agent' | 'other';
    onQuickAction: (action: QuickAction) => void;
    quickActions: QuickAction[];
}

export const BlockerWidget: React.FC<BlockerWidgetProps> = ({
    riskSignals,
    nextAction,
    nextActionOwner,
    onQuickAction,
    quickActions,
}) => {
    const primaryRisk = riskSignals[0];

    if (!primaryRisk && !nextAction) return null;

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return '#ef4444';
            case 'high': return '#f97316';
            case 'medium': return '#eab308';
            case 'low': return '#6b7280';
            default: return '#6b7280';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return '⏳';
            case 'low': return '📌';
            default: return '📌';
        }
    };

    // Get relevant quick actions for the blocker
    const relevantActions = quickActions.filter(a => a.primary).slice(0, 2);

    return (
        <div
            className="section-card section-card--blocker"
            style={{ borderColor: primaryRisk ? getSeverityColor(primaryRisk.severity) : '#eab308' }}
        >
            <div className="section-card__header">
                <span className="section-card__icon">
                    {primaryRisk ? getSeverityIcon(primaryRisk.severity) : '📌'}
                </span>
                <span className="section-card__title">Current Focus</span>
            </div>

            <div className="blocker-widget__content">
                {primaryRisk ? (
                    <>
                        <div className="blocker-widget__description">
                            {primaryRisk.description}
                        </div>
                        {primaryRisk.daysWaiting && primaryRisk.daysWaiting > 0 && (
                            <div className="blocker-widget__waiting">
                                Waiting: {primaryRisk.daysWaiting} days
                            </div>
                        )}
                    </>
                ) : nextAction ? (
                    <div className="blocker-widget__description">
                        {nextAction.replace(/_/g, ' ')}
                        {nextActionOwner && (
                            <span className="blocker-widget__owner">
                                ({nextActionOwner === 'agent' ? 'Your action' : 'Waiting on other party'})
                            </span>
                        )}
                    </div>
                ) : null}
            </div>

            {relevantActions.length > 0 && (
                <div className="blocker-widget__actions">
                    {relevantActions.map(action => (
                        <button
                            key={action.id}
                            className="blocker-widget__action-btn"
                            onClick={() => onQuickAction(action)}
                        >
                            <span>{action.icon}</span>
                            <span>{action.label}</span>
                        </button>
                    ))}
                    <button className="blocker-widget__action-btn blocker-widget__action-btn--zena">
                        <img src="/assets/icons/lightbulb_premium.png" alt="Ask" className="blocker-widget__premium-icon" />
                        <span>Ask Zena</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default BlockerWidget;
