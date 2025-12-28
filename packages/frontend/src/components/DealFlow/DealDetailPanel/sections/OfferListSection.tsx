/**
 * OfferListSection - Displays active offers on a listing
 */

import React from 'react';
import { Deal, formatCurrency } from '../../types';
import './sections.css';

interface Offer {
    id: string;
    buyerName: string;
    amount: number;
    conditions: number;
    status: 'pending' | 'rejected' | 'accepted' | 'countered';
    date: string;
}

interface OfferListSectionProps {
    deal: Deal;
}

export const OfferListSection: React.FC<OfferListSectionProps> = ({ deal }) => {
    // Mocking offers
    const offers: Offer[] = (deal as any).offers || [
        { id: 'o1', buyerName: 'The Johnsons', amount: 3150000, conditions: 2, status: 'countered', date: '2025-12-24' },
        { id: 'o2', buyerName: 'Li Family', amount: 3080000, conditions: 0, status: 'pending', date: '2025-12-25' },
    ];

    return (
        <div className="section-card">
            <div className="section-card__header">
                <span className="section-card__icon">⚖️</span>
                <span className="section-card__title">Active Offers ({offers.length})</span>
            </div>

            <div className="offer-list">
                {offers.map(offer => (
                    <div key={offer.id} className={`offer-list__item offer-list__item--${offer.status}`}>
                        <div className="offer-list__main">
                            <span className="offer-list__name">{offer.buyerName}</span>
                            <span className="offer-list__amount">{formatCurrency(offer.amount)}</span>
                        </div>
                        <div className="offer-list__meta">
                            <span className="offer-list__conditions">{offer.conditions} conditions</span>
                            <span className={`offer-list__status status--${offer.status}`}>{offer.status.toUpperCase()}</span>
                        </div>
                    </div>
                ))}
            </div>

            <button className="offer-list__compare-btn">
                📊 Compare Negotiation Strategies
            </button>
        </div>
    );
};
