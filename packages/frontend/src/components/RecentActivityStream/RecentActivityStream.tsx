import React from 'react';
import './RecentActivityStream.css';

export interface ActivityItem {
  id: string;
  type: 'email' | 'voice_note' | 'deal_update' | 'appointment' | 'property_update' | 'contact_update';
  description: string;
  timestamp: Date;
  propertyAddress?: string;
  dealName?: string;
  contactName?: string;
  relatedId?: string; // ID for navigation to detail view
  relatedType?: 'thread' | 'deal' | 'property' | 'contact' | 'appointment';
}

export interface RecentActivityStreamProps {
  activities: ActivityItem[];
  onActivityClick?: (activity: ActivityItem) => void;
  maxItems?: number;
}

export const RecentActivityStream: React.FC<RecentActivityStreamProps> = ({
  activities,
  onActivityClick,
  maxItems = 5
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email': return '📧';
      case 'voice_note': return '🎤';
      case 'deal_update': return '💼';
      case 'appointment': return '📅';
      case 'property_update': return '🏠';
      case 'contact_update': return '👤';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  const groupActivitiesByDay = (activities: ActivityItem[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const groups: { [key: string]: ActivityItem[] } = {};

    activities.forEach(activity => {
      const activityDate = new Date(activity.timestamp);
      const activityDay = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());

      let groupKey: string;
      if (activityDay.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (activityDay.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = activityDate.toLocaleDateString();
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(activity);
    });

    return groups;
  };

  // Sort activities by timestamp (most recent first) and limit to maxItems
  const sortedActivities = activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxItems);

  // Check if we need to group by day (activities older than 24 hours)
  const hasOldActivities = sortedActivities.some(activity => {
    const diffInHours = (new Date().getTime() - activity.timestamp.getTime()) / (1000 * 60 * 60);
    return diffInHours >= 24;
  });

  const handleActivityClick = (activity: ActivityItem) => {
    if (onActivityClick) {
      onActivityClick(activity);
    }
  };

  if (sortedActivities.length === 0) {
    return (
      <div className="recent-activity-stream">
        <h2 className="recent-activity-stream__title">Recent Activity</h2>
        <div className="activity-empty-state">
          <p className="activity-empty-state__message">No recent activity to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-activity-stream">
      <h2 className="recent-activity-stream__title">Recent Activity</h2>
      <div className="activity-list">
        {hasOldActivities ? (
          // Group activities by day if there are old activities
          Object.entries(groupActivitiesByDay(sortedActivities)).map(([day, dayActivities]) => (
            <div key={day} className="activity-day-group">
              <h3 className="activity-day-group__title">{day}</h3>
              {dayActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={`activity-item ${onActivityClick ? 'activity-item--clickable' : ''}`}
                  onClick={() => handleActivityClick(activity)}
                  role={onActivityClick ? 'button' : undefined}
                  tabIndex={onActivityClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onActivityClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleActivityClick(activity);
                    }
                  }}
                >
                  <div className="activity-item__icon">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="activity-item__content">
                    <p className="activity-item__description">
                      {activity.description}
                      {activity.propertyAddress && (
                        <span className="activity-item__property"> • {activity.propertyAddress}</span>
                      )}
                      {activity.dealName && (
                        <span className="activity-item__deal"> • {activity.dealName}</span>
                      )}
                    </p>
                    <span className="activity-item__time">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          // Simple list for recent activities
          sortedActivities.map((activity) => (
            <div
              key={activity.id}
              className={`activity-item ${onActivityClick ? 'activity-item--clickable' : ''}`}
              onClick={() => handleActivityClick(activity)}
              role={onActivityClick ? 'button' : undefined}
              tabIndex={onActivityClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (onActivityClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleActivityClick(activity);
                }
              }}
            >
              <div className="activity-item__icon">
                {getActivityIcon(activity.type)}
              </div>
              <div className="activity-item__content">
                <p className="activity-item__description">
                  {activity.description}
                  {activity.propertyAddress && (
                    <span className="activity-item__property"> • {activity.propertyAddress}</span>
                  )}
                  {activity.dealName && (
                    <span className="activity-item__deal"> • {activity.dealName}</span>
                  )}
                </p>
                <span className="activity-item__time">
                  {formatTimestamp(activity.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};