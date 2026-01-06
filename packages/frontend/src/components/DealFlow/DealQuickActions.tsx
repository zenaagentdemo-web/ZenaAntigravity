import React, { useState, useEffect } from 'react';
import { Deal, STAGE_LABELS } from './types';
import './DealQuickActions.css';

// API base URL  
const API_BASE = '/api';

// Fetch function with auth token
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('authToken');
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
}

interface ActionConfig {
    label: string;
    emoji: string;
    description: string;
}

interface SuggestedAction {
    type: string;
    reason: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    context: Record<string, unknown>;
}

interface DealQuickActionsProps {
    deal: Deal;
    isOpen: boolean;
    onClose: () => void;
    onStageChange?: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e'
};

export const DealQuickActions: React.FC<DealQuickActionsProps> = ({
    deal,
    isOpen,
    onClose,
    onStageChange: _onStageChange
}) => {
    const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
    const [actionConfigs, setActionConfigs] = useState<Record<string, ActionConfig>>({});
    const [loading, setLoading] = useState(false);
    const [generatingAction, setGeneratingAction] = useState<string | null>(null);
    const [generatedDraft, setGeneratedDraft] = useState<string | null>(null);

    // Fetch pending actions when opened
    useEffect(() => {
        if (isOpen && deal.id) {
            fetchPendingActions();
        }
    }, [isOpen, deal.id]);

    const fetchPendingActions = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(`${API_BASE}/zena-actions/deal/${deal.id}/pending`);
            if (response.ok) {
                const data = await response.json();
                setSuggestedActions(data.suggestedActions || []);
                setActionConfigs(data.actionConfigs || {});
            }
        } catch (error) {
            console.error('Error fetching pending actions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAction = async (actionType: string, context: Record<string, unknown>) => {
        try {
            setGeneratingAction(actionType);
            setGeneratedDraft(null);

            const response = await fetchWithAuth(`${API_BASE}/zena-actions/deal/${deal.id}/generate`, {
                method: 'POST',
                body: JSON.stringify({ actionType, context })
            });

            if (response.ok) {
                const data = await response.json();
                setGeneratedDraft(data.action.output);
            }
        } catch (error) {
            console.error('Error generating action:', error);
        } finally {
            setGeneratingAction(null);
        }
    };

    const handleCopyDraft = () => {
        if (generatedDraft) {
            navigator.clipboard.writeText(generatedDraft);
        }
    };

    const handleViewDeal = () => {
        window.location.href = `/deals/${deal.id}`;
    };

    if (!isOpen) return null;

    const propertyAddress = deal.property?.address || 'No property assigned';
    const contactName = deal.contacts?.[0]?.name;

    return (
        <>
            {/* Backdrop */}
            <div className="quick-actions__backdrop" onClick={onClose} />

            {/* Drawer */}
            <div className="quick-actions__drawer">
                {/* Header */}
                <div className="quick-actions__header">
                    <h3 className="quick-actions__title">{propertyAddress}</h3>
                    {contactName && (
                        <p className="quick-actions__subtitle">{contactName} • {STAGE_LABELS[deal.stage] || deal.stage}</p>
                    )}

                    <div className="quick-actions__health">
                        <div className="quick-actions__health-score">
                            <span className="health-label">Deal Health</span>
                            <div className="health-bar">
                                <div className="health-fill" style={{ width: '75%', backgroundColor: '#22c55e' }}></div>
                            </div>
                        </div>
                        <div className="quick-actions__sentiment">
                            <span className="sentiment-emoji">😊</span>
                            <span className="sentiment-text">Positive Momentum</span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions__section">
                    <h4 className="quick-actions__section-title">Smart Connections</h4>
                    <div className="quick-actions__grid">
                        <button className="quick-actions__btn" onClick={() => handleGenerateAction('nudge_client', {})}>
                            <span className="quick-actions__btn-icon">📧</span>
                            <span>Nudge Client</span>
                        </button>
                        <button className="quick-actions__btn" onClick={handleViewDeal}>
                            <span className="quick-actions__btn-icon">📄</span>
                            <span>View Deal</span>
                        </button>
                        <button className="quick-actions__btn" onClick={() => { }}>
                            <span className="quick-actions__btn-icon">📝</span>
                            <span>Add Note</span>
                        </button>
                        <button className="quick-actions__btn" onClick={() => { }}>
                            <span className="quick-actions__btn-icon">📋</span>
                            <span>Update Stage</span>
                        </button>
                    </div>
                </div>

                {/* Suggested Actions */}
                {(loading || suggestedActions.length > 0) && (
                    <div className="quick-actions__section">
                        <h4 className="quick-actions__section-title">
                            💡 Zena Suggests
                        </h4>

                        {loading ? (
                            <div className="quick-actions__loading">
                                <div className="quick-actions__spinner" />
                                <span>Analyzing deal...</span>
                            </div>
                        ) : (
                            <div className="quick-actions__suggestions">
                                {suggestedActions.slice(0, 3).map((action, index) => {
                                    const config = actionConfigs[action.type];
                                    if (!config) return null;

                                    return (
                                        <div
                                            key={index}
                                            className="quick-actions__suggestion"
                                            style={{ borderLeftColor: PRIORITY_COLORS[action.priority] }}
                                        >
                                            <div className="quick-actions__suggestion-header">
                                                <span className="quick-actions__suggestion-emoji">{config.emoji}</span>
                                                <span className="quick-actions__suggestion-label">{config.label}</span>
                                                <span
                                                    className="quick-actions__suggestion-priority"
                                                    style={{ color: PRIORITY_COLORS[action.priority] }}
                                                >
                                                    {action.priority}
                                                </span>
                                            </div>
                                            <p className="quick-actions__suggestion-reason">{action.reason}</p>
                                            <button
                                                className="quick-actions__suggestion-btn"
                                                onClick={() => handleGenerateAction(action.type, action.context)}
                                                disabled={generatingAction === action.type}
                                            >
                                                {generatingAction === action.type ? 'Generating...' : 'Draft'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Generated Draft */}
                {generatedDraft && (
                    <div className="quick-actions__section">
                        <h4 className="quick-actions__section-title">📝 Generated Draft</h4>
                        <div className="quick-actions__draft">
                            <pre className="quick-actions__draft-text">{generatedDraft}</pre>
                            <div className="quick-actions__draft-actions">
                                <button className="quick-actions__draft-btn" onClick={handleCopyDraft}>
                                    📋 Copy
                                </button>
                                <button
                                    className="quick-actions__draft-btn quick-actions__draft-btn--primary"
                                    onClick={() => {
                                        // TODO: Open email composer with draft
                                        alert('Email composer coming soon!');
                                    }}
                                >
                                    ✉️ Send Email
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Close button */}
                <button className="quick-actions__close" onClick={onClose}>
                    Close
                </button>
            </div>
        </>
    );
};

export default DealQuickActions;
