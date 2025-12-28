import React, { useState, useEffect } from 'react';
import './RevenueForecast.css';

interface ForecastBreakdown {
    stage: string;
    count: number;
    value: number;
    probability: number;
}

interface RevenueForecastData {
    period: string;
    periodDate: string;
    expectedCommission: number;
    rawCommission: number;
    dealCount: number;
    breakdown: ForecastBreakdown[];
}

interface RevenueForecastProps {
    authToken: string;
}

const STAGE_LABELS: Record<string, string> = {
    conditional: 'Conditional',
    unconditional: 'Unconditional',
    pre_settlement: 'Pre-Settlement',
    offer_made: 'Offer Made',
    offers_received: 'Offers Received',
    marketing: 'Marketing',
    listing_signed: 'Listing Signed',
    viewings: 'Viewings',
    shortlisting: 'Shortlisting',
    buyer_consult: 'Buyer Consult',
    appraisal: 'Appraisal',
};

const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
};

const RevenueForecast: React.FC<RevenueForecastProps> = ({ authToken }) => {
    const [forecast, setForecast] = useState<RevenueForecastData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

    useEffect(() => {
        fetchForecast();
    }, [authToken]);

    const fetchForecast = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/deals/forecast?months=6', {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch forecast');
            }

            const data = await response.json();
            setForecast(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load forecast');
        } finally {
            setLoading(false);
        }
    };

    const maxCommission = Math.max(...forecast.map(f => f.expectedCommission), 1);

    const totalExpected = forecast.reduce((sum, f) => sum + f.expectedCommission, 0);
    const totalRaw = forecast.reduce((sum, f) => sum + f.rawCommission, 0);
    const totalDeals = forecast.reduce((sum, f) => sum + f.dealCount, 0);

    if (loading) {
        return (
            <div className="revenue-forecast revenue-forecast--loading">
                <div className="revenue-forecast__skeleton" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="revenue-forecast revenue-forecast--error">
                <span className="revenue-forecast__error-icon">⚠️</span>
                <p>{error}</p>
                <button onClick={fetchForecast}>Retry</button>
            </div>
        );
    }

    return (
        <div className="revenue-forecast">
            <div className="revenue-forecast__header">
                <h3>📊 Revenue Forecast</h3>
                <span className="revenue-forecast__subtitle">6-month projection</span>
            </div>

            {/* Summary Stats */}
            <div className="revenue-forecast__summary">
                <div className="revenue-forecast__stat">
                    <span className="revenue-forecast__stat-value">{formatCurrency(totalExpected)}</span>
                    <span className="revenue-forecast__stat-label">Expected</span>
                </div>
                <div className="revenue-forecast__stat">
                    <span className="revenue-forecast__stat-value">{formatCurrency(totalRaw)}</span>
                    <span className="revenue-forecast__stat-label">If all close</span>
                </div>
                <div className="revenue-forecast__stat">
                    <span className="revenue-forecast__stat-value">{totalDeals}</span>
                    <span className="revenue-forecast__stat-label">Deals</span>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="revenue-forecast__chart">
                {forecast.map((month) => (
                    <div
                        key={month.period}
                        className={`revenue-forecast__bar-container ${expandedMonth === month.period ? 'revenue-forecast__bar-container--expanded' : ''}`}
                        onClick={() => setExpandedMonth(expandedMonth === month.period ? null : month.period)}
                    >
                        <div className="revenue-forecast__bar-wrapper">
                            <div
                                className="revenue-forecast__bar"
                                style={{
                                    height: `${Math.max(5, (month.expectedCommission / maxCommission) * 100)}%`,
                                }}
                            >
                                {month.expectedCommission > 0 && (
                                    <span className="revenue-forecast__bar-value">
                                        {formatCurrency(month.expectedCommission)}
                                    </span>
                                )}
                            </div>
                            {month.rawCommission > month.expectedCommission && (
                                <div
                                    className="revenue-forecast__bar revenue-forecast__bar--raw"
                                    style={{
                                        height: `${((month.rawCommission - month.expectedCommission) / maxCommission) * 100}%`,
                                    }}
                                />
                            )}
                        </div>
                        <span className="revenue-forecast__bar-label">{month.period.split(' ')[0]}</span>
                    </div>
                ))}
            </div>

            {/* Expanded Breakdown */}
            {expandedMonth && (
                <div className="revenue-forecast__breakdown">
                    <h4>{expandedMonth} Breakdown</h4>
                    {forecast
                        .find(f => f.period === expandedMonth)
                        ?.breakdown.map((item) => (
                            <div key={item.stage} className="revenue-forecast__breakdown-item">
                                <span className="revenue-forecast__breakdown-stage">
                                    {STAGE_LABELS[item.stage] || item.stage}
                                </span>
                                <span className="revenue-forecast__breakdown-deals">
                                    {item.count} deal{item.count !== 1 ? 's' : ''}
                                </span>
                                <span className="revenue-forecast__breakdown-value">
                                    {formatCurrency(item.value * item.probability)}
                                </span>
                                <span className="revenue-forecast__breakdown-prob">
                                    {Math.round(item.probability * 100)}%
                                </span>
                            </div>
                        ))}
                </div>
            )}

            {/* Legend */}
            <div className="revenue-forecast__legend">
                <div className="revenue-forecast__legend-item">
                    <span className="revenue-forecast__legend-color revenue-forecast__legend-color--expected" />
                    Expected (weighted)
                </div>
                <div className="revenue-forecast__legend-item">
                    <span className="revenue-forecast__legend-color revenue-forecast__legend-color--raw" />
                    If all close
                </div>
            </div>
        </div>
    );
};

export default RevenueForecast;
