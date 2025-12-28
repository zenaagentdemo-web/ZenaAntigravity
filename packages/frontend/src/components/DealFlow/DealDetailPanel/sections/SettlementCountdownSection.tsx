/**
 * SettlementCountdownSection - Large visual countdown for settlement
 */

import React from 'react';
import { Deal, formatCurrency } from '../../types';
import './sections.css';

interface SettlementCountdownSectionProps {
    deal: Deal;
}

export const SettlementCountdownSection: React.FC<SettlementCountdownSectionProps> = ({ deal }) => {
    if (!deal.settlementDate) return null;

    const settlementDate = new Date(deal.settlementDate);
    const diffMs = settlementDate.getTime() - Date.now();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return (
        <div className="section-card settlement-highlight">
            <div className="settlement-countdown">
                <div className="countdown-ring">
                    <span className="countdown-number">{daysRemaining}</span>
                    <span className="countdown-label">DAYS TO SETTLEMENT</span>
                </div>
                <div className="settlement-meta">
                    <span className="settlement-date-full">
                        {settlementDate.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <span className="settlement-balance">
                        Balance Due: {formatCurrency(deal.dealValue || 0)}
                    </span>
                </div>
            </div>

            <div className="settlement-checklist">
                <div className="checklist-item done">
                    <span className="check-icon">✅</span>
                    <span className="check-label">Insurance Arranged</span>
                </div>
                <div className="checklist-item">
                    <span className="check-icon">⭕</span>
                    <span className="check-label">Funds Ready (Solicitor)</span>
                </div>
                <div className="checklist-item">
                    <span className="check-icon">⭕</span>
                    <span className="check-label">Pre-Settlement Inspection</span>
                </div>
            </div>
        </div>
    );
};
