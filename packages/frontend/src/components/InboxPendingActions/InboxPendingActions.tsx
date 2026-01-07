/**
 * InboxPendingActions Component
 * 
 * Displays pending God Mode actions for the Inbox page.
 * Shows count badge and expandable queue of AI-suggested actions.
 */

import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Check, X, Mail, Calendar, Archive } from 'lucide-react';
import './InboxPendingActions.css';

interface PendingAction {
    id: string;
    title: string;
    description: string;
    actionType: string;
    priority: number;
    createdAt: string;
    draftSubject?: string;
    draftBody?: string;
}

interface InboxPendingActionsProps {
    actions: PendingAction[];
    onApprove: (actionId: string) => void;
    onDismiss: (actionId: string) => void;
    isLoading?: boolean;
}

export const InboxPendingActions: React.FC<InboxPendingActionsProps> = ({
    actions,
    onApprove,
    onDismiss,
    isLoading = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (actions.length === 0 && !isLoading) {
        return null;
    }

    const getActionIcon = (actionType: string) => {
        switch (actionType) {
            case 'send_email':
                return <Mail size={16} />;
            case 'add_calendar':
                return <Calendar size={16} />;
            case 'archive_thread':
                return <Archive size={16} />;
            default:
                return <Sparkles size={16} />;
        }
    };

    const getPriorityColor = (priority: number) => {
        if (priority >= 8) return '#ff4757';
        if (priority >= 5) return '#ffa502';
        return '#2ed573';
    };

    return (
        <div className="inbox-pending-actions">
            <button
                className="inbox-pending-actions__toggle"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="inbox-pending-actions__badge">
                    <Sparkles size={14} />
                    <span>{actions.length} AI Suggestion{actions.length !== 1 ? 's' : ''}</span>
                </div>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {isExpanded && (
                <div className="inbox-pending-actions__list">
                    {actions.map(action => (
                        <div key={action.id} className="inbox-pending-action">
                            <div
                                className="inbox-pending-action__priority"
                                style={{ backgroundColor: getPriorityColor(action.priority) }}
                            />
                            <div className="inbox-pending-action__icon">
                                {getActionIcon(action.actionType)}
                            </div>
                            <div className="inbox-pending-action__content">
                                <div className="inbox-pending-action__title">{action.title}</div>
                                <div className="inbox-pending-action__description">{action.description}</div>
                                {action.draftSubject && (
                                    <div className="inbox-pending-action__draft">
                                        <strong>Subject:</strong> {action.draftSubject}
                                    </div>
                                )}
                            </div>
                            <div className="inbox-pending-action__actions">
                                <button
                                    className="inbox-pending-action__btn inbox-pending-action__btn--approve"
                                    onClick={() => onApprove(action.id)}
                                    title="Approve"
                                >
                                    <Check size={16} />
                                </button>
                                <button
                                    className="inbox-pending-action__btn inbox-pending-action__btn--dismiss"
                                    onClick={() => onDismiss(action.id)}
                                    title="Dismiss"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InboxPendingActions;
