import React, { useState } from 'react';
// @ts-ignore
import { X, Check, ArrowRight, Clock, Battery, MapPin, Loader2 } from 'lucide-react';
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
    proposal: {
        originalSchedule: any[];
        proposedSchedule: any[];
        metrics: {
            drivingTimeSavedMinutes: number;
            oldTotalDurationMinutes: number;
            newTotalDurationMinutes: number;
            tasksAdded: number;
        };
        changes: Change[];
    } | null;
    isLoading: boolean;
}

export const OptimiseProposalModal: React.FC<OptimiseProposalModalProps> = ({ isOpen, onClose, onApply, proposal, isLoading }) => {
    if (!isOpen) return null;

    if (isLoading || !proposal) {
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
                            <span className="value">{metrics.tasksAdded}</span>
                            <span className="label">Tasks Filled</span>
                        </div>
                    </div>
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
                                                <div className="item-title">{item.title}</div>
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
                    <button className="apply-btn" onClick={onApply}>
                        Apply Optimisation
                    </button>
                </div>
            </div>
        </div>
    );
};
