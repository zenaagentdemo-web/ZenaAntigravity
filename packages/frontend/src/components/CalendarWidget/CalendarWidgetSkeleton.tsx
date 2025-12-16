import React from 'react';
import './CalendarWidget.css';

export const CalendarWidgetSkeleton: React.FC = () => {
  return (
    <section 
      className="calendar-widget calendar-widget--skeleton"
      role="region"
      aria-label="Loading calendar appointments"
    >
      <div className="skeleton skeleton--widget-title" aria-hidden="true"></div>
      
      <div className="calendar-widget__appointments" role="list">
        {Array.from({ length: 3 }).map((_, index) => (
          <div 
            key={index} 
            className="appointment-item appointment-item--skeleton"
            role="listitem"
            aria-hidden="true"
          >
            <div className="appointment-item__time-section">
              <div className="skeleton skeleton--appointment-time"></div>
              <div className="skeleton skeleton--appointment-until"></div>
            </div>
            
            <div className="appointment-item__content">
              <div className="appointment-item__header">
                <div className="skeleton skeleton--appointment-icon"></div>
                <div className="skeleton skeleton--appointment-title"></div>
              </div>
              <div className="skeleton skeleton--appointment-location"></div>
            </div>
            
            <div className="appointment-item__indicators">
              <div className="skeleton skeleton--appointment-indicator"></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
