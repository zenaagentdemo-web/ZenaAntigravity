import React from 'react';
import './DealFlowPage.css';

export const DealFlowPage: React.FC = () => {
    return (
        <div className="deal-flow-page">
            <div className="deal-flow-page__header">
                <h1 className="deal-flow-page__title">Deal Flow</h1>
                <p className="deal-flow-page__subtitle">Track and manage your real estate deals</p>
            </div>

            <div className="deal-flow-page__content">
                <div className="deal-flow-page__placeholder">
                    <div className="deal-flow-page__icon-container">
                        <svg
                            className="deal-flow-page__icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M20.5 11.5c-.83 0-1.5-.67-1.5-1.5V7c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v3c0 .83-.67 1.5-1.5 1.5z" />
                            <path d="M3.5 11.5c.83 0 1.5-.67 1.5-1.5V7c0-.83-.67-1.5-1.5-1.5S2 6.17 2 7v3c0 .83.67 1.5 1.5 1.5z" />
                            <path d="M19 10l-3.5 3.5c-.5.5-1.3.5-1.8 0l-.7-.7c-.5-.5-1.3-.5-1.8 0l-.7.7c-.5.5-1.3.5-1.8 0L5 10" />
                            <path d="M8 14l1.5 1.5c.5.5 1.3.5 1.8 0l1.2-1.2c.5-.5 1.3-.5 1.8 0L16 16" />
                            <path d="M12 18l-2-2" />
                            <path d="M14 16l2 2" />
                        </svg>
                    </div>

                    <h2 className="deal-flow-page__coming-soon">Coming Soon</h2>
                    <p className="deal-flow-page__description">
                        Your deal pipeline is being built. Soon you'll be able to track
                        prospects, manage negotiations, and close deals faster.
                    </p>

                    <div className="deal-flow-page__features">
                        <div className="deal-flow-page__feature">
                            <span className="deal-flow-page__feature-icon">📊</span>
                            <span>Pipeline Visualization</span>
                        </div>
                        <div className="deal-flow-page__feature">
                            <span className="deal-flow-page__feature-icon">🎯</span>
                            <span>Deal Tracking</span>
                        </div>
                        <div className="deal-flow-page__feature">
                            <span className="deal-flow-page__feature-icon">⚡</span>
                            <span>AI-Powered Insights</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
