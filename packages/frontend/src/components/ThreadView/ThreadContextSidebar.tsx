/**
 * ThreadContextSidebar Component
 * 
 * Collapsible sidebar showing AI insights, linked property/deal, and participants.
 * Mobile-first with collapsible drawer behavior.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ThreadDetailedView,
    DealStage
} from '../../models/newPage.types';
import './ThreadContextSidebar.css';

interface ThreadContextSidebarProps {
    thread: ThreadDetailedView;
    isOpen: boolean;
    onToggle: () => void;
}

/**
 * Get deal stage label
 */
const getDealStageLabel = (stage: DealStage): string => {
    const labels: Record<DealStage, string> = {
        inquiry: 'Inquiry',
        viewing: 'Viewing',
        offer: 'Offer',
        negotiation: 'Negotiation',
        conditional: 'Conditional',
        unconditional: 'Unconditional',
        settled: 'Settled'
    };
    return labels[stage] || 'Unknown';
};

/**
 * Get deal stage progress (0-100)
 */
const getDealProgress = (stage: DealStage): number => {
    const progress: Record<DealStage, number> = {
        inquiry: 14,
        viewing: 28,
        offer: 42,
        negotiation: 56,
        conditional: 70,
        unconditional: 85,
        settled: 100
    };
    return progress[stage] || 0;
};

/**
 * Get initials from name
 */
const getInitials = (name: string): string => {
    if (!name) return '?';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

export const ThreadContextSidebar: React.FC<ThreadContextSidebarProps> = ({
    thread,
    isOpen,
    onToggle
}) => {
    const navigate = useNavigate();
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set(['insights', 'property', 'deal', 'participants'])
    );

    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(section)) {
                newSet.delete(section);
            } else {
                newSet.add(section);
            }
            return newSet;
        });
    };

    return (
        <>
            {/* Mobile toggle button */}
            <button
                className="thread-context-sidebar__toggle"
                onClick={onToggle}
                aria-label={isOpen ? 'Close context panel' : 'Open context panel'}
                aria-expanded={isOpen}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                </svg>
                <span>Context</span>
            </button>

            {/* Sidebar overlay (mobile) */}
            {isOpen && (
                <div
                    className="thread-context-sidebar__overlay"
                    onClick={onToggle}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar panel */}
            <aside
                className={`thread-context-sidebar ${isOpen ? 'thread-context-sidebar--open' : ''}`}
                data-testid="thread-context-sidebar"
            >
                {/* Mobile close button */}
                <button
                    className="thread-context-sidebar__close"
                    onClick={onToggle}
                    aria-label="Close"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className="thread-context-sidebar__content">
                    {/* AI Insights Section */}
                    {thread.aiInsights && (
                        <section className="thread-context-sidebar__section">
                            <button
                                className="thread-context-sidebar__section-header"
                                onClick={() => toggleSection('insights')}
                                aria-expanded={expandedSections.has('insights')}
                            >
                                <div className="thread-context-sidebar__section-title">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                    AI Insights
                                </div>
                                <svg
                                    className={`thread-context-sidebar__section-arrow ${expandedSections.has('insights') ? 'thread-context-sidebar__section-arrow--expanded' : ''}`}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            {expandedSections.has('insights') && (
                                <div className="thread-context-sidebar__section-content">
                                    {/* Summary */}
                                    <div className="thread-context-sidebar__insight-card">
                                        <h4>Summary</h4>
                                        <p>{thread.aiInsights.summary}</p>
                                    </div>

                                    {/* Key Points */}
                                    {thread.aiInsights.keyPoints.length > 0 && (
                                        <div className="thread-context-sidebar__insight-card">
                                            <h4>Key Points</h4>
                                            <ul className="thread-context-sidebar__key-points">
                                                {thread.aiInsights.keyPoints.map((point, i) => (
                                                    <li key={i}>{point}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Suggested Actions */}
                                    {thread.aiInsights.suggestedNextActions.length > 0 && (
                                        <div className="thread-context-sidebar__insight-card">
                                            <h4>Suggested Actions</h4>
                                            <ul className="thread-context-sidebar__actions-list">
                                                {thread.aiInsights.suggestedNextActions.map((action, i) => (
                                                    <li key={i}>
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="9 11 12 14 22 4" />
                                                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                                        </svg>
                                                        {action}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Sentiment */}
                                    <div className="thread-context-sidebar__sentiment">
                                        <span className="thread-context-sidebar__sentiment-label">Sentiment:</span>
                                        <span className={`thread-context-sidebar__sentiment-value thread-context-sidebar__sentiment-value--${thread.aiInsights.sentiment}`}>
                                            {thread.aiInsights.sentiment}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Linked Property Section */}
                    {thread.linkedProperty && (
                        <section className="thread-context-sidebar__section">
                            <button
                                className="thread-context-sidebar__section-header"
                                onClick={() => toggleSection('property')}
                                aria-expanded={expandedSections.has('property')}
                            >
                                <div className="thread-context-sidebar__section-title">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                        <polyline points="9 22 9 12 15 12 15 22" />
                                    </svg>
                                    Linked Property
                                </div>
                                <svg
                                    className={`thread-context-sidebar__section-arrow ${expandedSections.has('property') ? 'thread-context-sidebar__section-arrow--expanded' : ''}`}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            {expandedSections.has('property') && (
                                <div className="thread-context-sidebar__section-content">
                                    <button
                                        className="thread-context-sidebar__property-card"
                                        onClick={() => navigate(`/properties/${thread.linkedProperty!.id}`)}
                                    >
                                        {thread.linkedProperty.imageUrl && (
                                            <img
                                                src={thread.linkedProperty.imageUrl}
                                                alt={thread.linkedProperty.address}
                                                className="thread-context-sidebar__property-image"
                                            />
                                        )}
                                        <div className="thread-context-sidebar__property-info">
                                            <span className="thread-context-sidebar__property-address">
                                                {thread.linkedProperty.address}
                                            </span>
                                            {thread.linkedProperty.price && (
                                                <span className="thread-context-sidebar__property-price">
                                                    {thread.linkedProperty.price}
                                                </span>
                                            )}
                                        </div>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Linked Deal Section */}
                    {thread.linkedDeal && (
                        <section className="thread-context-sidebar__section">
                            <button
                                className="thread-context-sidebar__section-header"
                                onClick={() => toggleSection('deal')}
                                aria-expanded={expandedSections.has('deal')}
                            >
                                <div className="thread-context-sidebar__section-title">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                        <path d="M2 17l10 5 10-5" />
                                        <path d="M2 12l10 5 10-5" />
                                    </svg>
                                    Deal Progress
                                </div>
                                <svg
                                    className={`thread-context-sidebar__section-arrow ${expandedSections.has('deal') ? 'thread-context-sidebar__section-arrow--expanded' : ''}`}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            {expandedSections.has('deal') && (
                                <div className="thread-context-sidebar__section-content">
                                    <button
                                        className="thread-context-sidebar__deal-card"
                                        onClick={() => navigate(`/deals/${thread.linkedDeal!.id}`)}
                                    >
                                        <div className="thread-context-sidebar__deal-stage">
                                            <span className="thread-context-sidebar__deal-stage-label">
                                                {getDealStageLabel(thread.linkedDeal.stage)}
                                            </span>
                                            <div className="thread-context-sidebar__deal-progress">
                                                <div
                                                    className="thread-context-sidebar__deal-progress-bar"
                                                    style={{ width: `${getDealProgress(thread.linkedDeal.stage)}%` }}
                                                />
                                            </div>
                                        </div>
                                        {thread.linkedDeal.nextAction && (
                                            <div className="thread-context-sidebar__deal-action">
                                                <span className="thread-context-sidebar__deal-action-label">Next:</span>
                                                <span className="thread-context-sidebar__deal-action-text">
                                                    {thread.linkedDeal.nextAction}
                                                </span>
                                            </div>
                                        )}
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Participants Section */}
                    {thread.participants && thread.participants.length > 0 && (
                        <section className="thread-context-sidebar__section">
                            <button
                                className="thread-context-sidebar__section-header"
                                onClick={() => toggleSection('participants')}
                                aria-expanded={expandedSections.has('participants')}
                            >
                                <div className="thread-context-sidebar__section-title">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                    Participants ({thread.participants.length})
                                </div>
                                <svg
                                    className={`thread-context-sidebar__section-arrow ${expandedSections.has('participants') ? 'thread-context-sidebar__section-arrow--expanded' : ''}`}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            {expandedSections.has('participants') && (
                                <div className="thread-context-sidebar__section-content">
                                    <div className="thread-context-sidebar__participants-list">
                                        {thread.participants.map((participant) => (
                                            <div
                                                key={participant.id || participant.email}
                                                className="thread-context-sidebar__participant"
                                                onClick={() => {
                                                    if (participant.id) {
                                                        navigate(`/contacts/${participant.id}`);
                                                    }
                                                }}
                                                role={participant.id ? 'button' : undefined}
                                                tabIndex={participant.id ? 0 : undefined}
                                            >
                                                <div className="thread-context-sidebar__participant-avatar">
                                                    {participant.avatarUrl ? (
                                                        <img src={participant.avatarUrl} alt={participant.name} />
                                                    ) : (
                                                        getInitials(participant.name)
                                                    )}
                                                </div>
                                                <div className="thread-context-sidebar__participant-info">
                                                    <span className="thread-context-sidebar__participant-name">
                                                        {participant.name || 'Unknown'}
                                                    </span>
                                                    <span className="thread-context-sidebar__participant-email">
                                                        {participant.email}
                                                    </span>
                                                </div>
                                                {participant.role && (
                                                    <span className={`thread-context-sidebar__participant-role thread-context-sidebar__participant-role--${participant.role}`}>
                                                        {participant.role}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </aside>
        </>
    );
};

export default ThreadContextSidebar;
