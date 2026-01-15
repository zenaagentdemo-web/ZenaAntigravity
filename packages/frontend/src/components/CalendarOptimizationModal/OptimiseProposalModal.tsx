import React, { useState } from 'react';
// @ts-ignore
import { X, Check, ArrowRight, Clock, Battery, MapPin, Loader2, Sparkles } from 'lucide-react';
// @ts-ignore
import { useCalendarStore } from '../../stores/useCalendarStore';
import './OptimiseProposalModal.css';

interface Change {
    id: string;
    type: 'moved' | 'added' | 'removed';
    reason: string;
    timeDiff?: string;
}

interface OptimiseProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: () => void;
    onApplyAndStart: () => void;
    proposal: {
        originalSchedule: any[];
        proposedSchedule: any[];
        metrics: {
            drivingTimeSavedMinutes: number;
            oldTotalDurationMinutes: number;
            newTotalDurationMinutes: number;
            tasksAdded: number;
            totalProposedTasks: number;
        };
        changes: Change[];
        aiReasoning?: string;
    } | null;
    isLoading: boolean;
}

export const OptimiseProposalModal: React.FC<OptimiseProposalModalProps> = ({ isOpen, onClose, onApply, onApplyAndStart, proposal, isLoading }) => {
    if (!isOpen) return null;

    if (isLoading) {
        return (
            <div className="optimise-modal-overlay">
                <div className="optimise-modal-content loading">
                    <Loader2 className="animate-spin text-cyan-400" size={48} />
                    <h3>Zena is analysing routes...</h3>
                    <p>Calculating traffic, gaps, and optimal sequences.</p>
                </div>
            </div>
        );
    }

    if (!proposal) {
        return (
            <div className="optimise-modal-overlay">
                <div className="optimise-modal-content error">
                    <h3>Unable to Generate Proposal</h3>
                    <p>Zena could not optimize the schedule at this time.</p>
                    <button className="cancel-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        );
    }

    const { metrics, changes, proposedSchedule } = proposal;

    return (
        <div className="optimise-modal-overlay">
            <div className="optimise-modal-content">
                <div className="optimise-header">
                    <div className="header-left">
                        <h2>Optimise My Day</h2>
                        <span className="ai-badge">Zena Intelligence</span>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="optimise-metrics-banner">
                    <div className="metric-card success">
                        <Clock className="text-green-400" />
                        <div>
                            <span className="value">{metrics.drivingTimeSavedMinutes} min</span>
                            <span className="label">Driving Saved</span>
                        </div>
                    </div>
                    <div className="metric-card info">
                        <Check className="text-cyan-400" />
                        <div>
                            <span className="value">{metrics.totalProposedTasks || metrics.tasksAdded}</span>
                            <span className="label" style={{ fontSize: '0.65rem', lineHeight: '1.2', display: 'block', maxWidth: '140px' }}>
                                <span style={{ color: '#4ade80', fontWeight: 600 }}>Tasks</span> intended to be completed during travel/gaps
                            </span>
                        </div>
                    </div>
                </div>

                {proposal.aiReasoning && (
                    <div className="optimise-ai-reasoning" style={{
                        marginTop: '16px',
                        padding: '12px 16px',
                        background: 'rgba(139, 92, 246, 0.1)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        borderRadius: '12px',
                        fontSize: '14px',
                        color: '#ddd6fe',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center'
                    }}>
                        <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '8px', borderRadius: '8px', color: '#a78bfa', flexShrink: 0 }}>
                            <Clock size={16} />
                        </div>
                        <p style={{ margin: 0, lineHeight: 1.5 }}>{proposal.aiReasoning}</p>
                    </div>
                )}

                <div className="legend-row">
                    <span className="legend-label">Legend:</span>
                    <div className="chip moved">Start/Moved</div>
                    <div className="chip unchanged">Not Changed</div>
                </div>

                <div className="optimise-body">
                    <div className="schedule-comparison">
                        <div className="timeline-view">
                            <h3>Proposed Schedule</h3>
                            <div className="timeline-list">
                                {proposedSchedule.map((item: any, index: number) => {
                                    const change = changes.find(c => c.id === item.id);
                                    let statusClass = '';
                                    if (change?.type === 'moved') statusClass = 'moved';
                                    if (change?.type === 'added') statusClass = 'added';

                                    return (
                                        <div key={item.id || index} className={`timeline-item ${statusClass}`}>
                                            <div className="time-col">
                                                {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div className="content-col">
                                                <div className="item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {item.title}
                                                    {(item.type === 'task' || item.source === 'task' || item.isTask) && (
                                                        <span className="task-pill">TASK</span>
                                                    )}
                                                </div>
                                                <div className="item-meta">
                                                    <MapPin size={12} /> {item.location}
                                                </div>
                                                {change && (
                                                    <div className="change-reason">
                                                        {change.type === 'moved' && <ArrowRight size={12} />}
                                                        {change.reason} {change.timeDiff && `(${change.timeDiff})`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="optimise-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button className="apply-btn" onClick={onApply} style={{ background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.5)' }}>
                        Apply Only
                    </button>
                    <button className="apply-btn" onClick={onApplyAndStart} style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', border: 'none', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}>
                        <Sparkles size={16} style={{ marginRight: '8px' }} />
                        Apply & Start Mission
                    </button>
                </div>
            </div>
        </div>
    );
};
