/**
 * ConditionsTracker - Condition checklist with status and actions
 */

import React from 'react';
import { Deal } from '../../types';
import { logActivity } from '../../utils/ActivityLogger';
import './sections.css';

interface ConditionsTrackerProps {
    deal: Deal;
    onUpdate?: (deal: Deal) => void;
}

export const ConditionsTracker: React.FC<ConditionsTrackerProps> = ({ deal, onUpdate }) => {
    const handleAction = (conditionId: string, action: 'satisfy' | 'waive') => {
        if (!deal.conditions || !onUpdate) return;

        const updatedConditions = deal.conditions.map(c =>
            c.id === conditionId ? { ...c, status: action === 'satisfy' ? 'satisfied' as const : 'waived' as const } : c
        );

        const condition = deal.conditions.find(c => c.id === conditionId);
        const eventTitle = action === 'satisfy' ? 'Condition Satisfied' : 'Condition Waived';
        const eventDesc = `${eventTitle}: ${condition?.label || condition?.type}`;

        const newEvent = logActivity('condition_met', eventTitle, eventDesc);

        onUpdate({
            ...deal,
            conditions: updatedConditions,
            timelineEvents: [newEvent, ...(deal.timelineEvents || [])]
        });
    };

    const completedCount = deal.conditions?.filter(c => c.status !== 'pending').length || 0;
    const totalCount = deal.conditions?.length || 0;

    return (
        <div className="section-card">
            <div className="section-card__header">
                <span className="section-card__icon">⚖️</span>
                <span className="section-card__title">
                    Conditions Tracker
                    <span className="count-badge">{completedCount}/{totalCount}</span>
                </span>
            </div>

            <div className="conditions-list">
                {deal.conditions?.map((condition, idx) => (
                    <div key={condition.id || idx} className={`condition-item ${condition.status}`}>
                        <div className="condition-info">
                            <span className="condition-label">{condition.label || condition.type.replace('_', ' ')}</span>
                            <span className="condition-meta">Due: {new Date(condition.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="condition-status-pills">
                            <span className={`status-pill ${condition.status}`}>{condition.status}</span>
                        </div>
                        <div className="condition-actions">
                            {condition.status === 'pending' && (
                                <>
                                    <button
                                        className="conditions-tracker__btn conditions-tracker__btn--satisfy"
                                        onClick={() => handleAction(condition.id!, 'satisfy')}
                                    >
                                        Satisfy
                                    </button>
                                    <button
                                        className="conditions-tracker__btn conditions-tracker__btn--waive"
                                        onClick={() => handleAction(condition.id!, 'waive')}
                                    >
                                        Waive
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConditionsTracker;
