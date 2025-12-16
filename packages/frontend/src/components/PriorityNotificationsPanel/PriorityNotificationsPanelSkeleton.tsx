import React from 'react';
import './PriorityNotificationsPanel.css';

export interface PriorityNotificationsPanelSkeletonProps {
  count?: number;
}

export const PriorityNotificationsPanelSkeleton: React.FC<PriorityNotificationsPanelSkeletonProps> = ({
  count = 3
}) => {
  return (
    <section className="priority-notifications-panel priority-notifications-panel--skeleton" role="region" aria-label="Loading priority notifications">
      <div className="skeleton skeleton--panel-title" aria-hidden="true"></div>
      <div className="notifications-list" role="list">
        {Array.from({ length: count }, (_, index) => (
          <article 
            key={index}
            className="notification notification-item--skeleton"
            role="listitem"
            aria-hidden="true"
          >
            <div className="notification__indicator">
              <div className="skeleton skeleton--notification-icon"></div>
            </div>
            
            <div className="notification__content">
              <div className="skeleton skeleton--notification-title"></div>
              <div className="skeleton skeleton--notification-message"></div>
              <div className="skeleton skeleton--notification-timestamp"></div>
            </div>

            <div className="notification__actions">
              <div className="skeleton skeleton--notification-action"></div>
              <div className="skeleton skeleton--notification-action"></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};