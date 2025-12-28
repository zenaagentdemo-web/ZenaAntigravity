/**
 * FollowUpActionsSection - Post-settlement and nurture check-ins
 */

import React from 'react';
import { Deal } from '../../types';
import { logActivity } from '../../utils/ActivityLogger';
import './sections.css';

interface FollowUpActionsSectionProps {
    deal: Deal;
    onUpdate?: (deal: Deal) => void;
}

export const FollowUpActionsSection: React.FC<FollowUpActionsSectionProps> = ({ deal, onUpdate }) => {
    const handleAction = (type: 'gift' | 'text') => {
        if (!onUpdate) return;

        const eventTitle = type === 'gift' ? 'Settlement Gift Ordered' : 'Post-Settlement Check-in';
        const eventDesc = type === 'gift'
            ? `Ordered premium settlement bundle for ${deal.contacts?.[0]?.name || 'Client'}`
            : `Sent relationship nurturing text to ${deal.contacts?.[0]?.name || 'Client'}`;

        const newEvent = logActivity(type === 'gift' ? 'system' : 'sms', eventTitle, eventDesc);

        onUpdate({
            ...deal,
            timelineEvents: [newEvent, ...(deal.timelineEvents || [])]
        });
    };

    // Current state of follow-ups (could be moved to Deal type later)
    const followUps = {
        thankYouSent: false,
        giftDelivered: true,
        testimonialRequested: true,
        testimonialReceived: false,
        referralAsked: false,
        nextCheckIn: '2026-03-26',
    };

    return (
        <div className="section-card">
            <div className="section-card__header">
                <span className="section-card__icon">🎁</span>
                <span className="section-card__title">Post-Settlement & Follow-up</span>
            </div>

            <div className="follow-up-checklist">
                <div className={`checklist-item ${followUps.thankYouSent ? 'done' : ''}`}>
                    <span className="check-icon">{followUps.thankYouSent ? '✅' : '⭕'}</span>
                    <span className="check-label">Thank-you Note Sent</span>
                </div>
                <div className={`checklist-item ${followUps.giftDelivered ? 'done' : ''}`}>
                    <span className="check-icon">{followUps.giftDelivered ? '✅' : '⭕'}</span>
                    <span className="check-label">Settlement Gift Delivered</span>
                </div>
                <div className={`checklist-item ${followUps.testimonialReceived ? 'done' : 'testimonial-pending'}`}>
                    <span className="check-icon">{followUps.testimonialReceived ? '✅' : '⭐'}</span>
                    <span className="check-label">Client Testimonial</span>
                </div>
            </div>

            <div className="nurture-status">
                <div className="status-item">
                    <span className="status-label">NEXT PLANNED CONTACT</span>
                    <span className="status-value">{new Date(followUps.nextCheckIn).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="status-item">
                    <span className="status-label">RELATIONSHIP SCAN</span>
                    <span className="status-value health-good">STRONG (P0)</span>
                </div>
            </div>

            <div className="section-actions">
                <button
                    className="section-action-btn primary"
                    onClick={() => handleAction('text')}
                >
                    💬 Send "Checking In" text
                </button>
                <button
                    className="section-action-btn"
                    onClick={() => handleAction('gift')}
                >
                    🎁 Order New Gift
                </button>
            </div>
        </div>
    );
};
