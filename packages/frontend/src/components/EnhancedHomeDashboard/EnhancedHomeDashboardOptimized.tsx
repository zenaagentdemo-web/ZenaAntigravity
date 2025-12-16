import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useGestureHandling } from '../../hooks/useGestureHandling';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import { usePersonalization } from '../../hooks/usePersonalization';
import { useOffline } from '../../hooks/useOffline';
import { useLazyWidgetLoading } from '../../hooks/useLazyLoading';
import { useBackgroundRefresh } from '../../hooks/useBackgroundRefresh';
import { useDashboardPerformance, useComponentPerformance } from '../../hooks/usePerformance';
import { useLoadingStates } from '../../hooks/useLoadingStates';
import { useInteractionOptimizer } from '../../hooks/useInteractionOptimizer';
import { personalizationService } from '../../services/personalizationService';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import { PerformanceDebugPanel } from '../PerformanceDebugPanel/PerformanceDebugPanel';
import { DashboardHeader } from '../DashboardHeader/DashboardHeader';
import { DashboardHeaderSkeleton } from '../DashboardHeader/DashboardHeaderSkeleton';
import { SmartSummaryWidget, AppointmentSummary } from '../SmartSummaryWidget/SmartSummaryWidget';
import { SmartSummaryWidgetSkeleton } from '../SmartSummaryWidget/SmartSummaryWidgetSkeleton';
import { PriorityNotificationsPanel, Notification } from '../PriorityNotificationsPanel/PriorityNotificationsPanel';
import { PriorityNotificationsPanelSkeleton } from '../PriorityNotificationsPanel/PriorityNotificationsPanelSkeleton';
import { QuickActionsPanel } from '../QuickActionsPanel/QuickActionsPanel';
import { QuickActionsPanelSkeleton } from '../QuickActionsPanel/QuickActionsPanelSkeleton';
import { RecentActivityStream, ActivityItem } from '../RecentActivityStream/RecentActivityStream';
import { RecentActivityStreamSkeleton } from '../RecentActivityStream/RecentActivityStreamSkeleton';
import { ContextualInsightsWidgetSkeleton } from '../ContextualInsightsWidget/ContextualInsightsWidgetSkeleton';
import { calculateUrgencyLevel } from '../../utils/urgencyCalculator';

// Lazy load non-critical widgets
const ContextualInsightsWidget = lazy(() => 
  import('../ContextualInsightsWidget/ContextualInsightsWidget').then(module => ({
    default: module.ContextualInsightsWidget
  }))
);

export interface EnhancedHomeDashboardOptimizedProps {
  testData?: {
    focusThreadsCount?: number;
    waitingThreadsCount?: number;
    atRiskDealsCount?: number;
    urgencyLevel?: 'low' | 'medium' | 'high';
  };
}

export const EnhancedHomeDashboardOptimized: React.FC<EnhancedHomeDashboardOptimizedProps> = ({ testData }) => {
  // Performance tracking
  useComponentPerformance('EnhancedHomeDashboard');
  const { measureInteraction, updateWidgetProgress, checkPerformanceRequirements } = useDashboardPerformance();
  
  // Loading states management
  const loadingManager = useLoadingStates([
    'dashboard-init',
    'smart-summary',
    'notifications',
    'quick-actions',
    'contextual-insights',
    'recent-activity',
    'calendar'
  ]);

  // Interaction optimization
  const notificationInteraction = useInteractionOptimizer('notification-action', {
    maxResponseTime: 100,
    enableHapticFeedback: true,
    enableVisualFeedback: true,
  });

  const quickActionInteraction = useInteractionOptimizer('quick-action', {
    maxResponseTime: 100,
    enableHapticFeedback: true,
    enableVisualFeedback: true,
  });

  const activityInteraction = useInteractionOptimizer('activity-click', {
    maxResponseTime: 100,
    enableHapticFeedback: true,
    enableVisualFeedback: true,
  });

  const { effectiveTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Define widget configuration
  const allWidgets = [
    'smart-summary',
    'priority-notifications', 
    'quick-actions',
    'contextual-insights',
    'recent-activity',
    'calendar'
  ];
  
  const criticalWidgets = [
    'smart-summary',
    'priority-notifications',
    'quick-actions'
  ];

  // Lazy loading for widgets
  const {
    getWidgetRef,
    isWidgetLoaded,
    isWidgetVisible,
    loadWidget,
    loadedWidgets,
  } = useLazyWidgetLoading(allWidgets, criticalWidgets, {
    threshold: 0.1,
    rootMargin: '50px',
    delay: 100, // Small delay to prevent loading all at once
  });

  // Update widget progress for performance monitoring
  useEffect(() => {
    updateWidgetProgress(allWidgets.length, loadedWidgets.length);
  }, [allWidgets.length, loadedWidgets.length, updateWidgetProgress]);

  // Personalization hooks
  const {
    trackUsage,
    calculateWidgetPriority,
    getCurrentTimePreferences,
    preferences,
    usagePatterns,
  } = usePersonalization();

  // Mock data for demonstration
  const [dashboardData] = useState(() => {
    const baseData = {
      focusThreadsCount: testData?.focusThreadsCount ?? 3,
      waitingThreadsCount: testData?.waitingThreadsCount ?? 7,
      atRiskDealsCount: testData?.atRiskDealsCount ?? 2,
      upcomingAppointments: [
        {
          id: '1',
          time: new Date(Date.now() + 2 * 60 * 60 * 1000),
          title: 'Property Viewing',
          property: { id: '1', address: '123 Main St' },
          type: 'viewing' as const
        },
        {
          id: '2',
          time: new Date(Date.now() + 4 * 60 * 60 * 1000),
          title: 'Client Meeting',
          property: { id: '2', address: '456 Oak Ave' },
          type: 'meeting' as const
        }
      ] as AppointmentSummary[],
      urgencyLevel: testData?.urgencyLevel ?? 'medium' as const
    };

    if (!testData?.urgencyLevel) {
      baseData.urgencyLevel = calculateUrgencyLevel({
        focusThreadsCount: baseData.focusThreadsCount,
        waitingThreadsCount: baseData.waitingThreadsCount,
        atRiskDealsCount: baseData.atRiskDealsCount
      });
    }

    return baseData;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const notificationList: Notification[] = [];
    
    if (dashboardData.focusThreadsCount > 0) {
      notificationList.push({
        id: '1',
        type: dashboardData.focusThreadsCount > 5 ? 'urgent' : 'warning',
        title: 'Focus Threads Need Attention',
        message: `You have ${dashboardData.focusThreadsCount} focus threads that need immediate attention`,
        actionable: true,
        actions: [
          { label: 'View Focus', action: 'view-focus', primary: true },
          { label: 'Dismiss', action: 'dismiss', primary: false }
        ],
        timestamp: new Date(),
        dismissed: false,
        priority: dashboardData.focusThreadsCount > 5 ? 10 : 7
      });
    }

    if (dashboardData.atRiskDealsCount > 0) {
      notificationList.push({
        id: '2',
        type: 'urgent',
        title: 'At-Risk Deals',
        message: `${dashboardData.atRiskDealsCount} deals require your attention to prevent them from going cold`,
        actionable: true,
        actions: [
          { label: 'Review Deals', action: 'view-deals', primary: true }
        ],
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        dismissed: false,
        priority: 10
      });
    }

    return notificationList;
  });

  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>(() => [
    {
      id: '1',
      type: 'email',
      description: 'Replied to John Smith about property inquiry',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      propertyAddress: '123 Main St',
      contactName: 'John Smith',
      relatedId: 'thread-1',
      relatedType: 'thread'
    },
    {
      id: '2',
      type: 'voice_note',
      description: 'Voice note processed for listing details',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      propertyAddress: '456 Oak Avenue',
      relatedId: 'property-2',
      relatedType: 'property'
    },
    {
      id: '3',
      type: 'appointment',
      description: 'Scheduled viewing appointment',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      propertyAddress: '789 Maple Street',
      contactName: 'Sarah Johnson',
      relatedId: 'appointment-3',
      relatedType: 'appointment'
    }
  ]);

  // Background refresh for real-time data
  const { isRefreshing: isBackgroundRefreshing, lastRefresh, forceRefresh } = useBackgroundRefresh({
    interval: 30000, // 30 seconds
    enabled: true,
    onRefresh: async () => {
      // Simulate API calls for fresh data
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // In a real app, this would fetch fresh data from APIs
      console.log('Background refresh completed');
    },
    onError: (error) => {
      console.error('Background refresh failed:', error);
    },
  });

  // Real-time updates hook
  const { 
    isConnected: isRealTimeConnected, 
    refresh: refreshRealTimeData
  } = useRealTimeUpdates({
    updateInterval: 30000,
    enableWebSocket: false
  });

  // Network connectivity hook for accurate offline detection
  const { isOnline } = useOffline();

  // Helper functions for connection status display
  const getConnectionStatus = (): string => {
    if (!isOnline) return 'disconnected';
    if (isRealTimeConnected) return 'connected';
    return 'limited'; // Online but real-time updates not working
  };

  const getConnectionStatusText = (): string => {
    if (!isOnline) return 'Offline';
    if (isRealTimeConnected) return 'Live updates';
    return 'Limited connectivity';
  };

  // Calculate personalized widget layout
  const [widgetLayout, setWidgetLayout] = useState(() => {
    const currentTime = new Date();
    const hour = currentTime.getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return personalizationService.calculateOptimalLayout(
      usagePatterns,
      preferences,
      {
        timeOfDay,
        urgencyLevel: dashboardData.urgencyLevel,
        dealTypes: [],
      }
    );
  });

  // Handle initial load completion with performance tracking
  useEffect(() => {
    loadingManager.startLoading('dashboard-init', 'Initializing dashboard...');
    
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
      loadingManager.finishLoading('dashboard-init');
      
      // Check performance requirements
      const requirements = checkPerformanceRequirements();
      if (process.env.NODE_ENV === 'development') {
        console.log('Performance requirements check:', requirements);
      }
    }, 500); // Dashboard should load within 500ms

    return () => clearTimeout(timer);
  }, [checkPerformanceRequirements, loadingManager]);

  const handleNotificationDismiss = useCallback((notificationId: string) => {
    notificationInteraction.executeImmediate(() => {
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, dismissed: true }
            : notification
        )
      );
    });
  }, [notificationInteraction]);

  const handleNotificationAction = useCallback((notificationId: string, action: string) => {
    notificationInteraction.executeImmediate(() => {
      switch (action) {
        case 'view-focus':
          navigate('/focus');
          break;
        case 'view-deals':
          navigate('/deals?filter=at-risk');
          break;
        case 'view-waiting':
          navigate('/waiting');
          break;
        default:
          console.log('Unknown notification action:', action);
      }
    });
  }, [navigate, notificationInteraction]);

  const handleQuickActionTrigger = useCallback((actionId: string) => {
    quickActionInteraction.executeImmediate(() => {
      trackUsage(actionId, {
        urgencyLevel: dashboardData.urgencyLevel,
        dealTypes: [],
      });
    });
  }, [trackUsage, dashboardData.urgencyLevel, quickActionInteraction]);

  const handleActivityClick = useCallback((activity: ActivityItem) => {
    activityInteraction.executeImmediate(() => {
      trackUsage('recent-activity', {
        urgencyLevel: dashboardData.urgencyLevel,
        dealTypes: activity.dealName ? ['deal'] : [],
      });
      
      if (activity.relatedType && activity.relatedId) {
        switch (activity.relatedType) {
          case 'thread':
            navigate(`/threads/${activity.relatedId}`);
            break;
          case 'deal':
            navigate(`/deals/${activity.relatedId}`);
            break;
          case 'property':
            navigate(`/properties/${activity.relatedId}`);
            break;
          case 'contact':
            navigate(`/contacts/${activity.relatedId}`);
            break;
          case 'appointment':
            navigate(`/calendar?appointment=${activity.relatedId}`);
            break;
        }
      }
    });
  }, [navigate, trackUsage, dashboardData.urgencyLevel, activityInteraction]);

  // Refresh handler for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      await refreshRealTimeData();
      await forceRefresh();
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshRealTimeData, forceRefresh]);

  // Gesture handlers
  const handleSwipeLeft = useCallback((element: HTMLElement) => {
    const endMeasurement = measureInteraction('swipe-left');
    console.log('Swipe left detected on:', element.className);
    endMeasurement();
  }, [measureInteraction]);

  const handleSwipeRight = useCallback(() => {
    const endMeasurement = measureInteraction('swipe-right');
    if (window.history.length > 1) {
      navigate(-1);
    }
    endMeasurement();
  }, [navigate, measureInteraction]);

  const handleLongPress = useCallback((element: HTMLElement) => {
    const endMeasurement = measureInteraction('long-press');
    console.log('Long press detected on:', element.className);
    endMeasurement();
  }, [measureInteraction]);

  // Set up gesture handling
  const { attachGestureHandlers, detachGestureHandlers } = useGestureHandling({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onLongPress: handleLongPress,
    enableHapticFeedback: true,
    swipeThreshold: 50,
    longPressThreshold: 500
  });

  // Set up pull-to-refresh
  const { 
    attachPullToRefresh, 
    detachPullToRefresh, 
    getPullContainerStyle,
    getPullIndicatorStyle,
    isPulling,
    pullDistance 
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPullDistance: 120,
    enableHapticFeedback: true
  });

  // Attach gesture handlers on mount
  useEffect(() => {
    if (dashboardRef.current) {
      attachGestureHandlers(dashboardRef.current);
      attachPullToRefresh(dashboardRef.current);
    }

    return () => {
      detachGestureHandlers();
      detachPullToRefresh();
    };
  }, [attachGestureHandlers, detachGestureHandlers, attachPullToRefresh, detachPullToRefresh]);

  // Render widget with lazy loading and skeleton states
  const renderWidget = useCallback((widgetId: string, size: 'small' | 'medium' | 'large') => {
    const isLoaded = isWidgetLoaded(widgetId);
    const isVisible = isWidgetVisible(widgetId);
    const ref = getWidgetRef(widgetId);

    const handleWidgetInteraction = (widgetId: string) => {
      trackUsage(widgetId, {
        urgencyLevel: dashboardData.urgencyLevel,
        dealTypes: [],
      });
    };

    const widgetContent = () => {
      if (!isLoaded && !criticalWidgets.includes(widgetId)) {
        // Show skeleton for non-critical widgets that haven't loaded
        switch (widgetId) {
          case 'contextual-insights':
            return <ContextualInsightsWidgetSkeleton />;
          case 'recent-activity':
            return <RecentActivityStreamSkeleton />;
          case 'calendar':
            return <div className="calendar-widget--skeleton">Loading calendar...</div>;
          default:
            return <div>Loading...</div>;
        }
      }

      switch (widgetId) {
        case 'smart-summary':
          return isInitialLoad ? (
            <SmartSummaryWidgetSkeleton />
          ) : (
            <SmartSummaryWidget
              focusThreadsCount={dashboardData.focusThreadsCount}
              waitingThreadsCount={dashboardData.waitingThreadsCount}
              atRiskDealsCount={dashboardData.atRiskDealsCount}
              upcomingAppointments={dashboardData.upcomingAppointments}
              urgencyLevel={dashboardData.urgencyLevel}
            />
          );
        
        case 'priority-notifications':
          return isInitialLoad ? (
            <PriorityNotificationsPanelSkeleton />
          ) : (
            <PriorityNotificationsPanel
              notifications={notifications}
              onDismiss={handleNotificationDismiss}
              onAction={handleNotificationAction}
            />
          );
        
        case 'quick-actions':
          return isInitialLoad ? (
            <QuickActionsPanelSkeleton />
          ) : (
            <QuickActionsPanel
              onActionTrigger={handleQuickActionTrigger}
              customizable={true}
            />
          );
        
        case 'contextual-insights':
          return (
            <Suspense fallback={<ContextualInsightsWidgetSkeleton />}>
              <ContextualInsightsWidget />
            </Suspense>
          );
        
        case 'recent-activity':
          return isLoaded ? (
            <RecentActivityStream
              activities={recentActivities}
              onActivityClick={handleActivityClick}
              maxItems={5}
            />
          ) : (
            <RecentActivityStreamSkeleton />
          );
        
        case 'calendar':
          return isLoaded ? (
            <div className="calendar-widget">
              <h2 className="calendar-widget__title">Upcoming Appointments</h2>
              <div className="calendar-widget__content">
                {dashboardData.upcomingAppointments.slice(0, 3).map(appointment => (
                  <div key={appointment.id} className="appointment-item">
                    <div className="appointment-item__time">
                      {appointment.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="appointment-item__details">
                      <div className="appointment-item__title">{appointment.title}</div>
                      {appointment.property && (
                        <div className="appointment-item__property">{appointment.property.address}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="calendar-widget--skeleton">Loading calendar...</div>
          );
        
        default:
          return null;
      }
    };

    return (
      <section 
        key={widgetId} 
        ref={ref}
        className={`enhanced-dashboard__section enhanced-dashboard__section--${size}`}
        onClick={() => handleWidgetInteraction(widgetId)}
      >
        {widgetContent()}
      </section>
    );
  }, [
    isWidgetLoaded,
    isWidgetVisible,
    getWidgetRef,
    criticalWidgets,
    isInitialLoad,
    dashboardData,
    notifications,
    recentActivities,
    handleNotificationDismiss,
    handleNotificationAction,
    handleQuickActionTrigger,
    handleActivityClick,
    trackUsage,
  ]);

  return (
    <div className="enhanced-dashboard" ref={dashboardRef}>
      <ThemeToggle 
        currentTheme={effectiveTheme}
        onToggle={toggleTheme}
        position="top-right"
      />
      
      {/* Performance Debug Panel (development only) */}
      <PerformanceDebugPanel enabled={process.env.NODE_ENV === 'development'} />
      
      {/* Pull-to-refresh indicator */}
      <div className="pull-to-refresh-indicator" style={getPullIndicatorStyle()}>
        <div className="pull-to-refresh-icon">
          {isRefreshing ? '⟳' : '↓'}
        </div>
        <span className="pull-to-refresh-text">
          {isRefreshing ? 'Refreshing...' : isPulling && pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
      
      <div className="enhanced-dashboard__container" style={getPullContainerStyle()}>
        {/* Real-time connection status indicator */}
        <div className={`real-time-status ${getConnectionStatus()}`}>
          <span className="real-time-status__indicator"></span>
          <span className="real-time-status__text">
            {getConnectionStatusText()}
          </span>
          {isBackgroundRefreshing && (
            <span className="background-refresh-indicator">⟳</span>
          )}
        </div>

        {/* Dashboard Header */}
        <div className="enhanced-dashboard__header">
          {isInitialLoad ? (
            <DashboardHeaderSkeleton />
          ) : (
            <DashboardHeader 
              agentName="Agent"
              notificationCount={dashboardData.notifications?.length || 0}
            />
          )}
        </div>

        {/* Personalized Widget Layout */}
        {widgetLayout
          .filter(widget => widget.visible)
          .sort((a, b) => a.position - b.position)
          .map(widget => renderWidget(widget.widgetId, widget.size))
        }
      </div>
    </div>
  );
};