/**
 * ActionApprovalQueue Component
 * 
 * Slide-out panel displaying pending autonomous actions for Demi-God mode.
 * Users can approve or dismiss actions individually or in bulk.
 */

import React, { useState, useEffect } from 'react';
import {
    X, Check, Trash2, Mail, Calendar, Tag, Archive,
    ChevronRight, Clock, User, Loader2, CheckCheck, XCircle
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import './ActionApprovalQueue.css';

interface AutonomousAction {
    id: string;
    actionType: string;
    priority: number;
    title: string;
    description?: string;
    draftSubject?: string;
    draftBody?: string;
    status: string;
    mode: string;
    createdAt: string;
    contact?: {
        id: string;
        name: string;
        emails?: string[];
        role?: string;
    };
}

interface ActionApprovalQueueProps {
    isOpen: boolean;
    onClose: () => void;
    onActionTaken?: () => void;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
    send_email: <Mail size={16} />,
    schedule_followup: <Calendar size={16} />,
    update_category: <Tag size={16} />,
    archive_contact: <Archive size={16} />
};

const getPriorityColor = (priority: number): string => {
    if (priority >= 8) return '#ef4444';
    if (priority >= 5) return '#f59e0b';
    return '#10b981';
};

export const ActionApprovalQueue: React.FC<ActionApprovalQueueProps> = ({
    isOpen,
    onClose,
    onActionTaken
}) => {
    const [actions, setActions] = useState<AutonomousAction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [godmodeMode, setGodmodeMode] = useState<string>('off');

    useEffect(() => {
        if (isOpen) {
            fetchActions();
        }
    }, [isOpen]);

    const fetchActions = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/godmode/actions');
            if (response.data) {
                setActions(response.data.actions || []);
                setGodmodeMode(response.data.mode || 'off');
            }
        } catch (error) {
            console.error('Failed to fetch actions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (actionId: string) => {
        setProcessingIds(prev => new Set(prev).add(actionId));
        try {
            await api.post(`/api/godmode/actions/${actionId}/approve`);
            setActions(prev => prev.filter(a => a.id !== actionId));
            onActionTaken?.();
        } catch (error) {
            console.error('Failed to approve action:', error);
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(actionId);
                return next;
            });
        }
    };

    const handleDismiss = async (actionId: string) => {
        setProcessingIds(prev => new Set(prev).add(actionId));
        try {
            await api.post(`/api/godmode/actions/${actionId}/dismiss`);
            setActions(prev => prev.filter(a => a.id !== actionId));
            onActionTaken?.();
        } catch (error) {
            console.error('Failed to dismiss action:', error);
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(actionId);
                return next;
            });
        }
    };

    const handleBulkApprove = async () => {
        const actionIds = actions.map(a => a.id);
        setProcessingIds(new Set(actionIds));
        try {
            await api.post('/api/godmode/bulk-approve', { actionIds });
            setActions([]);
            onActionTaken?.();
        } catch (error) {
            console.error('Failed to bulk approve:', error);
        } finally {
            setProcessingIds(new Set());
        }
    };

    const formatTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="action-queue__backdrop" onClick={onClose} />

            {/* Panel */}
            <div className="action-queue">
                {/* Header */}
                <div className="action-queue__header">
                    <div className="action-queue__title">
                        <span className="action-queue__title-icon">⚡</span>
                        <h2>Pending Actions</h2>
                        {actions.length > 0 && (
                            <span className="action-queue__count">{actions.length}</span>
                        )}
                    </div>
                    <button className="action-queue__close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Mode Banner */}
                {godmodeMode !== 'off' && (
                    <div className={`action-queue__mode-banner action-queue__mode-banner--${godmodeMode}`}>
                        {godmodeMode === 'demi_god' ? '🔶 Demi-God Mode' : '🟢 Full God Mode'}
                    </div>
                )}

                {/* Content */}
                <div className="action-queue__content">
                    {isLoading ? (
                        <div className="action-queue__loading">
                            <Loader2 className="animate-spin" size={24} />
                            <span>Loading actions...</span>
                        </div>
                    ) : actions.length === 0 ? (
                        <div className="action-queue__empty">
                            <CheckCheck size={40} />
                            <h3>All caught up!</h3>
                            <p>No pending actions to review.</p>
                        </div>
                    ) : (
                        <>
                            {/* Bulk Actions */}
                            <div className="action-queue__bulk">
                                <button
                                    className="action-queue__bulk-btn action-queue__bulk-btn--approve"
                                    onClick={handleBulkApprove}
                                    disabled={processingIds.size > 0}
                                >
                                    <CheckCheck size={14} />
                                    Approve All ({actions.length})
                                </button>
                            </div>

                            {/* Action List */}
                            <div className="action-queue__list">
                                {actions.map(action => (
                                    <div
                                        key={action.id}
                                        className={`action-queue__item ${expandedId === action.id ? 'action-queue__item--expanded' : ''}`}
                                    >
                                        {/* Item Header */}
                                        <div
                                            className="action-queue__item-header"
                                            onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
                                        >
                                            <div
                                                className="action-queue__item-icon"
                                                style={{ '--priority-color': getPriorityColor(action.priority) } as React.CSSProperties}
                                            >
                                                {ACTION_ICONS[action.actionType] || <Mail size={16} />}
                                            </div>

                                            <div className="action-queue__item-info">
                                                <div className="action-queue__item-title">{action.title}</div>
                                                {action.contact && (
                                                    <div className="action-queue__item-contact">
                                                        <User size={12} />
                                                        <span>{action.contact.name}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="action-queue__item-meta">
                                                <span className="action-queue__item-time">
                                                    <Clock size={12} />
                                                    {formatTimeAgo(action.createdAt)}
                                                </span>
                                                <ChevronRight
                                                    size={16}
                                                    className={`action-queue__item-chevron ${expandedId === action.id ? 'action-queue__item-chevron--open' : ''}`}
                                                />
                                            </div>
                                        </div>

                                        {/* Expanded Content */}
                                        {expandedId === action.id && (
                                            <div className="action-queue__item-details">
                                                {action.description && (
                                                    <p className="action-queue__item-description">{action.description}</p>
                                                )}

                                                {action.draftSubject && (
                                                    <div className="action-queue__draft-preview">
                                                        <strong>Subject:</strong> {action.draftSubject}
                                                    </div>
                                                )}

                                                {action.draftBody && (
                                                    <div className="action-queue__draft-body">
                                                        {action.draftBody.slice(0, 200)}
                                                        {action.draftBody.length > 200 && '...'}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="action-queue__item-actions">
                                            <button
                                                className="action-queue__action-btn action-queue__action-btn--approve"
                                                onClick={(e) => { e.stopPropagation(); handleApprove(action.id); }}
                                                disabled={processingIds.has(action.id)}
                                            >
                                                {processingIds.has(action.id) ? (
                                                    <Loader2 className="animate-spin" size={14} />
                                                ) : (
                                                    <Check size={14} />
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                className="action-queue__action-btn action-queue__action-btn--dismiss"
                                                onClick={(e) => { e.stopPropagation(); handleDismiss(action.id); }}
                                                disabled={processingIds.has(action.id)}
                                            >
                                                <Trash2 size={14} />
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default ActionApprovalQueue;
