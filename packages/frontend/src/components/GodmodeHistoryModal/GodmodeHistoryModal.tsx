import React, { useState, useEffect } from 'react';
import { api } from '../../utils/apiClient';
import { X, Clock, CheckCircle2, XCircle, Slash, Mail, Calendar, User, Home } from 'lucide-react';
import './GodmodeHistoryModal.css';

interface GodmodeHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

import { ActionDetailProps, GodmodeActionDetail } from './GodmodeActionDetail';

interface GodmodeHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface HistoryAction {
    id: string;
    title: string;
    description: string;
    reasoning?: string;
    intelligenceSources?: any[];
    actionType: string;
    status: 'completed' | 'failed' | 'dismissed';
    executedAt: string;
    draftSubject?: string;
    draftBody?: string;
    contact?: { name: string };
    property?: { address: string };
    mode: string;
}

export const GodmodeHistoryModal: React.FC<GodmodeHistoryModalProps> = ({ isOpen, onClose }) => {
    const [history, setHistory] = useState<HistoryAction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAction, setSelectedAction] = useState<HistoryAction | null>(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
            setSelectedAction(null);
        }
    }, [isOpen]);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/godmode/history');
            setHistory(response.data.actions || []);
        } catch (error) {
            console.error('Failed to fetch Godmode history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getFilterCategories = () => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const cats = [
            { id: 'all', label: 'All', check: () => true },
            { id: 'today', label: 'Today', check: (d: Date) => d >= startOfToday },
            {
                id: 'yesterday', label: 'Yesterday', check: (d: Date) => {
                    const yesterday = new Date(startOfToday);
                    yesterday.setDate(yesterday.getDate() - 1);
                    return d >= yesterday && d < startOfToday;
                }
            },
        ];

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        for (let i = 2; i < 7; i++) {
            const date = new Date(startOfToday);
            date.setDate(date.getDate() - i);
            cats.push({
                id: `day-${i}`,
                label: days[date.getDay()],
                check: (d: Date) => {
                    const start = new Date(date);
                    const end = new Date(date);
                    end.setDate(end.getDate() + 1);
                    return d >= start && d < end;
                }
            });
        }

        cats.push({
            id: 'last_week',
            label: 'Last Week',
            check: (d: Date) => {
                const sevenDaysAgo = new Date(startOfToday);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const fourteenDaysAgo = new Date(startOfToday);
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
                return d >= fourteenDaysAgo && d < sevenDaysAgo;
            }
        });

        cats.push({
            id: 'last_month',
            label: 'Last Month',
            check: (d: Date) => {
                const fourteenDaysAgo = new Date(startOfToday);
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
                const monthAgo = new Date(startOfToday);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return d >= monthAgo && d < fourteenDaysAgo;
            }
        });

        cats.push({
            id: 'older',
            label: 'Older',
            check: (d: Date) => {
                const monthAgo = new Date(startOfToday);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return d < monthAgo;
            }
        });

        return cats;
    };

    const categories = getFilterCategories();
    const filteredHistory = history.filter(action => {
        const cat = categories.find(c => c.id === activeFilter);
        return cat ? cat.check(new Date(action.executedAt)) : true;
    });

    if (!isOpen) return null;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="status-icon status-icon--completed" size={16} />;
            case 'failed': return <XCircle className="status-icon status-icon--failed" size={16} />;
            case 'dismissed': return <Slash className="status-icon status-icon--dismissed" size={16} />;
            default: return null;
        }
    };

    const getActionTypeIcon = (type: string) => {
        switch (type) {
            case 'send_email': return <Mail size={14} />;
            case 'schedule_followup': return <Calendar size={14} />;
            default: return <Clock size={14} />;
        }
    };

    return (
        <div className="godmode-history-overlay" onClick={onClose}>
            <div className="godmode-history-modal" onClick={e => e.stopPropagation()}>
                <div className="godmode-history-header">
                    <div className="header-title">
                        <Clock className="text-purple-400" size={20} />
                        <h2>Recent God Mode Activity</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="godmode-history-content">
                    {selectedAction ? (
                        <GodmodeActionDetail
                            action={selectedAction}
                            onBack={() => setSelectedAction(null)}
                        />
                    ) : (
                        <>
                            <div className="filter-bar">
                                {categories.slice(0, 3).map(cat => (
                                    <button
                                        key={cat.id}
                                        className={`filter-chip ${activeFilter === cat.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveFilter(cat.id);
                                            setIsMoreOpen(false);
                                        }}
                                    >
                                        {cat.label}
                                    </button>
                                ))}

                                <button
                                    className={`filter-chip filter-chip--more ${isMoreOpen || (activeFilter !== 'all' && activeFilter !== 'today' && activeFilter !== 'yesterday') ? 'active' : ''}`}
                                    onClick={() => setIsMoreOpen(!isMoreOpen)}
                                >
                                    {isMoreOpen ? 'Less Filters' : 'More Filters...'}
                                </button>
                            </div>

                            {isMoreOpen && (
                                <div className="filter-bar filter-bar--expanded">
                                    {categories.slice(3).map(cat => (
                                        <button
                                            key={cat.id}
                                            className={`filter-chip ${activeFilter === cat.id ? 'active' : ''}`}
                                            onClick={() => setActiveFilter(cat.id)}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {isLoading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <span>Retrieving activity log...</span>
                                </div>
                            ) : filteredHistory.length === 0 ? (
                                <div className="empty-state">
                                    <Clock size={48} opacity={0.2} />
                                    <p>No activity found for this period.</p>
                                </div>
                            ) : (
                                <div className="history-list">
                                    {filteredHistory.map(action => (
                                        <div
                                            key={action.id}
                                            className={`history-item history-item--${action.status}`}
                                            onClick={() => setSelectedAction(action)}
                                        >
                                            <div className="history-item-top">
                                                <div className="action-badge">
                                                    {getActionTypeIcon(action.actionType)}
                                                    <span>{action.actionType.replace('_', ' ')}</span>
                                                </div>
                                                <div className="mode-tag" data-mode={action.mode}>
                                                    {action.mode === 'full_god' ? 'Autonomous' : 'Approved'}
                                                </div>
                                                <span className="execution-time">
                                                    {new Date(action.executedAt || action.executedAt || Date.now()).toLocaleString([], {
                                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>

                                            <h3 className="action-title">{action.title}</h3>

                                            <div className="action-context">
                                                {action.contact && (
                                                    <div className="context-chip">
                                                        <User size={12} />
                                                        <span>{action.contact.name}</span>
                                                    </div>
                                                )}
                                                {action.property && (
                                                    <div className="context-chip">
                                                        <Home size={12} />
                                                        <span>{action.property.address.split(',')[0]}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="action-result">
                                                {getStatusIcon(action.status)}
                                                <span className="status-text">{action.status.toUpperCase()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
