import React from 'react';
import './ContextualInsightsWidget.css';

export const ContextualInsightsWidgetSkeleton: React.FC = () => {
  return (
    <div className="contextual-insights-widget contextual-insights-widget--skeleton">
      <div className="skeleton skeleton--widget-title"></div>
      
      <div className="contextual-insights-widget__content">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="insight-card insight-card--skeleton">
            <div className="insight-card__metric">
              <div className="skeleton skeleton--insight-value"></div>
              <div className="skeleton skeleton--insight-trend"></div>
            </div>
            <div className="skeleton skeleton--insight-label"></div>
            <div className="skeleton skeleton--insight-message"></div>
          </div>
        ))}
      </div>
    </div>
  );
};