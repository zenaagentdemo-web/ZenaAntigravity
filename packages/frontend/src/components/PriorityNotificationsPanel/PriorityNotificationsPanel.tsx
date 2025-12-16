import React from 'react';
import './PriorityNotificationsPanel.css';

export interface NotificationAction {
  label: string;
  action: string;
  primary: boolean;
}

export interface Notification {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  actionable: boolean;
  actions?: NotificationAction[];
  timestamp: Date;
  dismissed: boolean;
  priority: number;
}

export interface PriorityNotificationsPanelProps {
  notifications: Notification[];
  onDismiss: (notificationId: string) => void;
  onAction: (notificationId: string, action: string) => void;
}

export { PriorityNotificationsPanelSkeleton } from './PriorityNotificationsPanelSkeleton';

export const PriorityNotificationsPanel: React.FC<PriorityNotificationsPanelProps> = ({
  notifications,
  onDismiss,
  onAction
}) => {
  const activeNotifications = notifications
    .filter(n => !n.dismissed)
    .sort((a, b) => b.priority - a.priority);

  if (activeNotifications.length === 0) {
    return null;
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'urgent': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      default: return '📢';
    }
  };

  return (
    <section className="priority-notifications-panel" role="region" aria-label="Priority notifications">
      <h2 className="priority-notifications-panel__title">Priority Notifications</h2>
      <div className="notifications-list" role="list">
        {activeNotifications.map((notification) => (
          <article 
            key={notification.id}
            className={`notification notification--${notification.type}`}
            data-priority={notification.type === 'urgent' ? 'high' : 'normal'}
            role="listitem"
            aria-labelledby={`notification-title-${notification.id}`}
            aria-describedby={`notification-message-${notification.id}`}
          >
            <div className="notification__indicator" aria-hidden="true">
              <span 
                className="notification__icon"
                role="img"
                aria-label={`${notification.type} notification`}
              >
                {getNotificationIcon(notification.type)}
              </span>
              {notification.type === 'urgent' && (
                <div className="urgency-badge" aria-label="Urgent priority">URGENT</div>
              )}
            </div>
            
            <div className="notification__content">
              <h3 
                id={`notification-title-${notification.id}`}
                className="notification__title"
              >
                {notification.title}
              </h3>
              <p 
                id={`notification-message-${notification.id}`}
                className="notification__message"
              >
                {notification.message}
              </p>
              <time 
                className="notification__timestamp"
                dateTime={notification.timestamp.toISOString()}
                title={notification.timestamp.toLocaleString()}
              >
                {notification.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </time>
            </div>

            <div className="notification__actions" role="group" aria-label="Notification actions">
              {notification.actions?.map((action) => (
                <button
                  key={action.action}
                  className={`notification__action ${action.primary ? 'notification__action--primary' : ''}`}
                  onClick={() => onAction(notification.id, action.action)}
                  aria-describedby={`notification-title-${notification.id}`}
                >
                  {action.label}
                </button>
              ))}
              <button
                className="notification__dismiss"
                onClick={() => onDismiss(notification.id)}
                aria-label={`Dismiss ${notification.title} notification`}
                title="Dismiss notification"
              >
                ×
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};