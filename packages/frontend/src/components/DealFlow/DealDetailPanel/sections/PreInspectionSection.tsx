/**
 * PreInspectionSection - Tracking the final pre-settlement inspection
 */

import React from 'react';
import { Deal } from '../../types';
import './sections.css';

interface PreInspectionSectionProps {
    deal: Deal;
}

export const PreInspectionSection: React.FC<PreInspectionSectionProps> = ({ deal }) => {
    const inspection = deal.preSettlementInspection;

    if (!inspection) {
        return (
            <div className="section-card">
                <div className="section-card__header">
                    <span className="section-card__icon">🔍</span>
                    <span className="section-card__title">Pre-Settlement Inspection</span>
                </div>
                <button className="section-footer-btn">
                    📅 Schedule Inspection
                </button>
            </div>
        );
    }

    return (
        <div className="section-card">
            <div className="section-card__header">
                <span className="section-card__icon">🔍</span>
                <span className="section-card__title">Pre-Settlement Inspection</span>
            </div>

            <div className="inspection-status-card">
                <div className="inspection-datetime">
                    <span className="date">{new Date(inspection.date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</span>
                    <span className="time">{inspection.time}</span>
                </div>
                <div className="inspection-main">
                    <span className={`inspection-badge status--${inspection.status}`}>
                        {inspection.status.replace('_', ' ').toUpperCase()}
                    </span>
                </div>
            </div>

            {inspection.issues && inspection.issues.length > 0 && (
                <div className="inspection-issues">
                    <span className="issues-label">Defects/Issues Found:</span>
                    <ul className="issues-list">
                        {inspection.issues.map((issue, idx) => (
                            <li key={idx} className="issue-item">⚠️ {issue}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="inspection-grid">
                <div className={`grid-item ${inspection.isFundsReady ? 'done' : ''}`}>
                    <span className="icon">{inspection.isFundsReady ? '✅' : '⏳'}</span>
                    <span className="label">Bank Funds</span>
                </div>
                <div className={`grid-item ${inspection.isKeysArranged ? 'done' : ''}`}>
                    <span className="icon">{inspection.isKeysArranged ? '✅' : '🔑'}</span>
                    <span className="label">Keys Ready</span>
                </div>
            </div>

            <div className="section-actions">
                <button className="section-action-btn">📞 Call Solicitors</button>
                <button className="section-action-btn primary">✅ Confirm Satisfied</button>
            </div>
        </div>
    );
};
