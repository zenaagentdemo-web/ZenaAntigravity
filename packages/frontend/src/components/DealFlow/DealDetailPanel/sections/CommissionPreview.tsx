/**
 * CommissionPreview - Financial summary with commission calculation
 */

import React from 'react';
import './sections.css';

interface CommissionPreviewProps {
    dealValue?: number;
    estimatedCommission?: number;
    isConjunctional?: boolean;
    conjunctionalSplit?: number;
    settlementDate?: string;
}

export const CommissionPreview: React.FC<CommissionPreviewProps> = ({
    dealValue,
    estimatedCommission,
    isConjunctional = false,
    conjunctionalSplit = 0.5,
    settlementDate,
}) => {
    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('en-NZ', {
            style: 'currency',
            currency: 'NZD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-NZ', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    // If no value at all, show placeholder
    if (!dealValue && !estimatedCommission) {
        return (
            <div className="section-card">
                <div className="section-card__header">
                    <span className="section-card__icon">💰</span>
                    <span className="section-card__title">Financials</span>
                </div>
                <div className="commission-preview__placeholder">
                    Deal value not yet confirmed
                </div>
            </div>
        );
    }

    // Calculate your share if conjunctional
    const yourShare = isConjunctional && estimatedCommission
        ? estimatedCommission * conjunctionalSplit
        : estimatedCommission;

    return (
        <div className="section-card">
            <div className="section-card__header">
                <span className="section-card__icon">💰</span>
                <span className="section-card__title">Commission Summary</span>
            </div>

            <div className="commission-preview__grid">
                {dealValue && (
                    <div className="commission-preview__row">
                        <span className="commission-preview__label">Sale Price</span>
                        <span className="commission-preview__value">
                            {formatCurrency(dealValue)}
                        </span>
                    </div>
                )}

                {estimatedCommission && (
                    <div className="commission-preview__row">
                        <span className="commission-preview__label">
                            {isConjunctional ? 'Gross Commission' : 'Est. Commission'}
                        </span>
                        <span className="commission-preview__value">
                            {formatCurrency(estimatedCommission)}
                        </span>
                    </div>
                )}

                {isConjunctional && yourShare && (
                    <>
                        <div className="commission-preview__row commission-preview__row--split">
                            <span className="commission-preview__label">
                                Your Split ({Math.round(conjunctionalSplit * 100)}%)
                            </span>
                            <span className="commission-preview__value commission-preview__value--highlight">
                                {formatCurrency(yourShare)}
                            </span>
                        </div>
                    </>
                )}

                {!isConjunctional && yourShare && (
                    <div className="commission-preview__row commission-preview__row--total">
                        <span className="commission-preview__label">Your Commission</span>
                        <span className="commission-preview__value commission-preview__value--highlight">
                            {formatCurrency(yourShare)}
                        </span>
                    </div>
                )}

                {settlementDate && (
                    <div className="commission-preview__row commission-preview__row--date">
                        <span className="commission-preview__label">Payment Due</span>
                        <span className="commission-preview__value">
                            {formatDate(settlementDate)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommissionPreview;
