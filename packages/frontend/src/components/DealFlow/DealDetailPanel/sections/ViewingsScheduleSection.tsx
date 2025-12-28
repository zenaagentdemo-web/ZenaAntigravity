/**
 * ViewingsScheduleSection - Displays a buyer's viewing itinerary
 */

import React from 'react';
import { Deal, Viewing } from '../../types';
import './sections.css';

interface ViewingsScheduleSectionProps {
    deal: Deal;
}

export const ViewingsScheduleSection: React.FC<ViewingsScheduleSectionProps> = ({ deal }) => {
    const viewings = deal.viewings || [];

    // Separate upcoming and past
    const now = new Date();
    const upcoming = viewings.filter(v => new Date(v.date) >= now && v.status === 'scheduled');
    const past = viewings.filter(v => new Date(v.date) < now || v.status === 'completed');

    return (
        <div className="section-card">
            <div className="section-card__header">
                <span className="section-card__icon">📅</span>
                <span className="section-card__title">Viewings Schedule</span>
            </div>

            {upcoming.length > 0 ? (
                <div className="viewings-list">
                    <div className="viewings-list__group-label">Upcoming</div>
                    {upcoming.map(viewing => (
                        <div key={viewing.id} className="viewings-list__item upcoming">
                            <div className="viewing-datetime">
                                <span className="viewing-date">{new Date(viewing.date).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                <span className="viewing-time">{viewing.time}</span>
                            </div>
                            <div className="viewing-details">
                                <span className="viewing-address">{viewing.address}</span>
                                <span className="viewing-status status--scheduled">Confirmed</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="section-empty-state">No upcoming viewings.</div>
            )}

            {past.length > 0 && (
                <div className="viewings-list past">
                    <div className="viewings-list__group-label">Recent Feedback</div>
                    {past.slice(0, 2).map(viewing => (
                        <div key={viewing.id} className="viewings-list__item past">
                            <div className="viewing-details">
                                <span className="viewing-address">{viewing.address}</span>
                                <span className="viewing-feedback">"{viewing.feedback || 'No feedback yet'}"</span>
                            </div>
                            <span className={`viewing-status-dot status--${viewing.status}`} title={viewing.status} />
                        </div>
                    ))}
                </div>
            )}

            <button className="section-footer-btn">
                📅 Book New Viewing
            </button>
        </div>
    );
};
