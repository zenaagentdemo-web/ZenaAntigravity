/**
 * OfferDetailsSection - Displays details of an active offer
 */

import React from 'react';
import { Deal, formatCurrency } from '../../types';
import { logActivity } from '../../utils/ActivityLogger';
import './sections.css';

interface OfferDetailsSectionProps {
    deal: Deal;
    onUpdate?: (deal: Deal) => void;
}

export const OfferDetailsSection: React.FC<OfferDetailsSectionProps> = ({ deal, onUpdate }) => {
    const handleAction = (type: 'revise' | 'counter') => {
        if (!onUpdate) return;

        const eventTitle = type === 'revise' ? 'Revised Offer Prepared' : 'Counter-Offer Sent';
        const eventDesc = `${eventTitle} for ${deal.property?.address}`;
        const newEvent = logActivity('offer', eventTitle, eventDesc);

        onUpdate({
            ...deal,
            timelineEvents: [newEvent, ...(deal.timelineEvents || [])]
        });
    };

    const offer = deal.activeOffer;

    if (!offer) {
        return (
            <div className="section-card">
                <div className="section-card__header">
                    <span className="section-card__icon">📝</span>
                    <span className="section-card__title">Offer Presentation</span>
                </div>
                <div className="section-empty-state">
                    No active offer found.
                    <button className="section-action-btn primary" style={{ marginTop: '12px' }}>
                        ➕ Create First Offer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="section-card">
            <div className="section-card__header">
                <span className="section-card__icon">📝</span>
                <span className="section-card__title">Active Negotiation</span>
            </div>

            <div className="offer-presentation">
                <div className="offer-main-value">
                    <span className="offer-value-label">CURRENT OFFER AMOUNT</span>
                    <span className="offer-value-amount">{formatCurrency(offer.amount)}</span>
                </div>

                <div className="offer-grid">
                    <div className="offer-grid-item">
                        <span className="offer-grid-label">SETTLEMENT</span>
                        <span className="offer-grid-value">
                            {offer.settlementDate ? new Date(offer.settlementDate).toLocaleDateString() : 'TBA'}
                        </span>
                    </div>
                    <div className="offer-grid-item">
                        <span className="offer-grid-label">CONDITIONS</span>
                        <span className="offer-grid-value">{offer.conditions.length} Active</span>
                    </div>
                    <div className="offer-grid-item">
                        <span className="offer-grid-label">EXPIRY</span>
                        <span className="offer-grid-value critical">
                            {offer.expiryDate ? new Date(offer.expiryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </span>
                    </div>
                </div>

                <div className="offer-footer">
                    <div className={`offer-status-pill ${offer.status}`}>
                        {offer.status.toUpperCase()}
                    </div>
                    {offer.isMultiOffer && <span className="multi-offer-tag">⚠️ MULTI-OFFER</span>}
                </div>
            </div>

            <div className="section-actions">
                <button className="section-action-btn primary" onClick={() => handleAction('revise')}>
                    ✏️ Revise Offer
                </button>
                <button className="section-action-btn" onClick={() => handleAction('counter')}>
                    🤝 Counter Offer
                </button>
            </div>
        </div>
    );
};
