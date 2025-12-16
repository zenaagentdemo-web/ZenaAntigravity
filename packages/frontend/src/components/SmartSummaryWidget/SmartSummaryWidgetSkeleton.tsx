import React from 'react';
import './SmartSummaryWidget.css';

export const SmartSummaryWidgetSkeleton: React.FC = () => {
  return (
    <div className="smart-summary-widget smart-summary-widget--skeleton">
      <div className="skeleton skeleton--title"></div>
      
      <div className="smart-summary-widget__metrics">
        <div className="smart-summary-metric smart-summary-metric--skeleton">
          <div className="skeleton skeleton--metric-value"></div>
          <div className="skeleton skeleton--metric-label"></div>
        </div>
        
        <div className="smart-summary-metric smart-summary-metric--skeleton">
          <div className="skeleton skeleton--metric-value"></div>
          <div className="skeleton skeleton--metric-label"></div>
        </div>
        
        <div className="smart-summary-metric smart-summary-metric--skeleton">
          <div className="skeleton skeleton--metric-value"></div>
          <div className="skeleton skeleton--metric-label"></div>
        </div>
      </div>

      <div className="skeleton skeleton--message"></div>

      <div className="smart-summary-widget__appointments">
        <div className="skeleton skeleton--appointments-title"></div>
        <div className="smart-summary-appointments__list">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="appointment-item appointment-item--skeleton">
              <div className="skeleton skeleton--appointment-time"></div>
              <div className="appointment-item__content">
                <div className="skeleton skeleton--appointment-title"></div>
                <div className="skeleton skeleton--appointment-property"></div>
              </div>
              <div className="skeleton skeleton--appointment-type"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};