/**
 * CollapsibleAlertsPanel Component
 * 
 * Glassmorphism expandable panel for priority alerts with
 * priority-based glow colors and smooth expand/collapse animations.
 * 
 * Requirements: 7.1, 7.2, 7.3
 */

import React, { useState, useRef, useEffect } from 'react';
import './CollapsibleAlertsPanel.css';

export type AlertPriority = 'urgent' | 'warning' | 'info' | 'success';

export interface AlertAction {
  /** Action identifier */
  id: string;
  /** Display label */
  label: string;
  /** Whether this is the primary action */
  primary?: boolean;
}

export interface PriorityAlert {
  /** Unique identifier */
  id: string;
  /** Alert priority level */
  priority: AlertPriority;
  /** Alert title */
  title: string;
  /** Alert message/description */
  message: string;
  /** Available actions */
  actions?: AlertAction[];
  /** Timestamp */
  timestamp?: Date;
  /** Whether the alert has been dismissed */
  dismissed?: boolean;
  /** Related entity ID for navigation */
  relatedId?: string;
  /** Related entity type */
  relatedType?: 'deal' | 'thread' | 'contact' | 'property';
}

export interface CollapsibleAlertsPanelProps {
  /** Array of alerts to display */
  alerts: PriorityAlert[];
  /** Callback when an action is triggered */
  onAction?: (alertId: string, actionId: string) => void;
  /** Callback when an alert is dismissed */
  onDismiss?: (alertId: string) => void;
  /** Initial expanded state */
  defaultExpanded?: boolean;
  /** Maximum alerts to show when collapsed */
  collapsedMaxAlerts?: number;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}



/**
 * CollapsibleAlertsPanel - Expandable panel for priority alerts
 */
export const CollapsibleAlertsPanel: React.FC<CollapsibleAlertsPanelProps> = ({
  alerts,
  onAction,
  onDismiss,
  defaultExpanded = false,
  collapsedMaxAlerts = 2,
  className = '',
  testId = 'collapsible-alerts-panel',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Filter out dismissed alerts and sort by priority
  const activeAlerts = alerts
    .filter(alert => !alert.dismissed)
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, warning: 1, info: 2, success: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  // Determine which alerts to show
  const visibleAlerts = isExpanded 
    ? activeAlerts 
    : activeAlerts.slice(0, collapsedMaxAlerts);
  
  const hiddenCount = activeAlerts.length - collapsedMaxAlerts;
  const hasMoreAlerts = hiddenCount > 0;

  // Calculate content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [activeAlerts, isExpanded]);

  // Handle toggle
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle action click
  const handleAction = (alertId: string, actionId: string) => {
    if (onAction) {
      onAction(alertId, actionId);
    }
  };

  // Handle dismiss
  const handleDismiss = (alertId: string) => {
    if (onDismiss) {
      onDismiss(alertId);
    }
  };

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div 
      className={`collapsible-alerts-panel ${isExpanded ? 'collapsible-alerts-panel--expanded' : ''} ${className}`}
      data-testid={testId}
    >
      {/* Header */}
      <button
        className="collapsible-alerts-panel__header"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls="alerts-content"
      >
        <div className="collapsible-alerts-panel__header-content">
          <span className="collapsible-alerts-panel__title">
            Priority Alerts
          </span>
        </div>
        <span 
          className={`collapsible-alerts-panel__toggle ${isExpanded ? 'collapsible-alerts-panel__toggle--expanded' : ''}`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {/* Content */}
      <div 
        id="alerts-content"
        className="collapsible-alerts-panel__content"
        ref={contentRef}
        style={{
          maxHeight: isExpanded ? `${contentHeight}px` : `${collapsedMaxAlerts * 100}px`,
        }}
      >
        <div className="collapsible-alerts-panel__list" role="list">
          {visibleAlerts.map((alert) => (
            <article
              key={alert.id}
              className={`alert-item alert-item--${alert.priority}`}
              role="listitem"
              data-testid={`alert-${alert.id}`}
              data-priority={alert.priority}
            >
              {/* Priority indicator with glow - no icons, just colored glow */}
              <div className="alert-item__indicator" aria-hidden="true">
                {alert.priority === 'urgent' && (
                  <div className="alert-item__pulse" />
                )}
              </div>

              {/* Content */}
              <div className="alert-item__content">
                <h3 className="alert-item__title">{alert.title}</h3>
                <p className="alert-item__message">{alert.message}</p>
                {alert.timestamp && (
                  <time 
                    className="alert-item__timestamp"
                    dateTime={alert.timestamp.toISOString()}
                  >
                    {alert.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </time>
                )}
              </div>

              {/* Actions */}
              <div className="alert-item__actions">
                {alert.actions?.map((action) => (
                  <button
                    key={action.id}
                    className={`alert-action ${action.primary ? 'alert-action--primary' : ''}`}
                    onClick={() => handleAction(alert.id, action.id)}
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  className="alert-dismiss"
                  onClick={() => handleDismiss(alert.id)}
                  aria-label={`Dismiss ${alert.title}`}
                >
                  ×
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Show more indicator */}
        {!isExpanded && hasMoreAlerts && (
          <div className="collapsible-alerts-panel__more">
            <span>+{hiddenCount} more alert{hiddenCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollapsibleAlertsPanel;
