import React from 'react';
import './RecentActivityStream.css';

export const RecentActivityStreamSkeleton: React.FC = () => {
  return (
    <div className="recent-activity-stream recent-activity-stream--skeleton">
      <div className="skeleton skeleton--stream-title"></div>
      
      <div className="recent-activity-stream__list">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="activity-item activity-item--skeleton">
            <div className="activity-item__icon">
              <div className="skeleton skeleton--activity-icon"></div>
            </div>
            <div className="activity-item__content">
              <div className="skeleton skeleton--activity-description"></div>
              <div className="activity-item__meta">
                <div className="skeleton skeleton--activity-property"></div>
                <div className="skeleton skeleton--activity-timestamp"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};