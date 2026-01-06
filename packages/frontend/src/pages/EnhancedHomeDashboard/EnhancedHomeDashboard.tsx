import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useGestureHandling } from '../../hooks/useGestureHandling';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import { usePersonalization } from '../../hooks/usePersonalization';
import { useOffline } from '../../hooks/useOffline';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { personalizationService } from '../../services/personalizationService';
import { realTimeDataService } from '../../services/realTimeDataService';
import { errorHandlingService, reportWidgetError } from '../../services/errorHandlingService';
import { ErrorBoundary, WidgetErrorBoundary } from '../../components/ErrorBoundary/ErrorBoundary';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import { DashboardHeader } from '../../components/DashboardHeader/DashboardHeader';
import { SmartSummaryWidget, AppointmentSummary } from '../../components/SmartSummaryWidget/SmartSummaryWidget';
import { PriorityNotificationsPanel, Notification } from '../../components/PriorityNotificationsPanel/PriorityNotificationsPanel';
import { QuickActionsPanel } from '../../components/QuickActionsPanel/QuickActionsPanel';
import { RecentActivityStream, ActivityItem } from '../../components/RecentActivityStream/RecentActivityStream';
import { CalendarWidget, CalendarAppointment } from '../../components/CalendarWidget/CalendarWidget';
import { SyncStatusIndicator } from '../../components/SyncStatusIndicator/SyncStatusIndicator';
import { calculateUrgencyLevel } from '../../utils/urgencyCalculator';
import './EnhancedHomeDashboard.css';

export interface EnhancedHomeDashboardProps {
  // Optional props for testing and customization
  testData?: {
    focusThreadsCount?: number;
    waitingThreadsCount?: number;
    atRiskDealsCount?: number;
    urgencyLevel?: 'low' | 'medium' | 'high';
  };
}

export const EnhancedHomeDashboard: React.FC<EnhancedHomeDashboardProps> = ({ testData }) => {
  const { effectiveTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realTimeConnected, setRealTimeConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Personalization hooks
  const {
    trackUsage,
    calculateWidgetPriority,
    getCurrentTimePreferences,
    preferences,
    usagePatterns,
  } = usePersonalization();

  // Real-time updates hook (keeping for backward compatibility)
  const {
    isConnected: isRealTimeConnected,
    refresh: refreshRealTimeData
  } = useRealTimeUpdates({
    updateInterval: 30000, // 30 seconds
    enableWebSocket: false // Start with polling, can be enabled later
  });

  // Network connectivity hook for accurate offline detection
  const { isOnline } = useOffline();

  // Helper functions for connection status display
  const getConnectionStatus = (): string => {
    if (!isOnline) return 'disconnected';
    if (realTimeConnected || isRealTimeConnected) return 'connected';
    return 'limited'; // Online but real-time updates not working
  };

  const getConnectionStatusText = (): string => {
    if (!isOnline) return 'Offline';
    if (realTimeConnected || isRealTimeConnected) return 'Live updates';
    return 'Limited connectivity';
  };

  const getConnectionAriaLabel = (): string => {
    if (!isOnline) return 'Connection status: Offline - using cached data';
    if (realTimeConnected || isRealTimeConnected) return 'Connection status: Connected with live updates';
    return 'Connection status: Online but real-time updates unavailable';
  };

  // Dashboard data state - will be updated by real-time service
  const [dashboardData, setDashboardData] = useState(() => {
    // Use test data if provided, otherwise use default mock data
    const baseData = {
      focusThreadsCount: testData?.focusThreadsCount ?? 3,
      waitingThreadsCount: testData?.waitingThreadsCount ?? 7,
      atRiskDealsCount: testData?.atRiskDealsCount ?? 2,
      upcomingAppointments: [
        {
          id: '1',
          time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          title: 'Property Viewing',
          property: { id: '1', address: '123 Main St' },
          type: 'viewing' as const
        },
        {
          id: '2',
          time: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
          title: 'Client Meeting',
          property: { id: '2', address: '456 Oak Ave' },
          type: 'meeting' as const
        }
      ] as AppointmentSummary[],
      urgencyLevel: testData?.urgencyLevel ?? 'medium' as const
    };

    // Calculate urgency level using utility function if not provided in test data
    if (!testData?.urgencyLevel) {
      baseData.urgencyLevel = calculateUrgencyLevel({
        focusThreadsCount: baseData.focusThreadsCount,
        waitingThreadsCount: baseData.waitingThreadsCount,
        atRiskDealsCount: baseData.atRiskDealsCount
      });
    }

    return baseData;
  });

  // Calendar appointments data (extended from dashboard appointments)
  const [calendarAppointments] = useState<CalendarAppointment[]>(() => [
    {
      id: '1',
      time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      title: 'Property Viewing - Luxury Condo',
      location: 'Downtown Office',
      property: {
        id: '1',
        address: '123 Main St, Suite 1205',
        type: 'Luxury Condo'
      },
      type: 'viewing',
      urgency: 'high'
    },
    {
      id: '2',
      time: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
      title: 'Client Meeting - First Time Buyers',
      location: 'Coffee Shop on Oak Ave',
      property: {
        id: '2',
        address: '456 Oak Ave',
        type: 'Single Family Home'
      },
      type: 'meeting',
      urgency: 'medium'
    },
    {
      id: '3',
      time: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
      title: 'Phone Call - Mortgage Pre-approval',
      type: 'call',
      urgency: 'low'
    },
    {
      id: '4',
      time: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
      title: 'Property Inspection Follow-up',
      property: {
        id: '4',
        address: '789 Pine Street',
        type: 'Townhouse'
      },
      type: 'other',
      urgency: 'medium'
    },
    {
      id: '5',
      time: new Date(Date.now() + 2.5 * 60 * 60 * 1000), // 2.5 hours from now (conflict with appointment 1)
      title: 'Conflicting Appointment',
      type: 'meeting',
      urgency: 'medium'
    }
  ]);

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const notificationList: Notification[] = [];

    // Generate notifications based on dashboard data
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
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        dismissed: false,
        priority: 10
      });
    }

    if (dashboardData.waitingThreadsCount > 8) {
      notificationList.push({
        id: '3',
        type: 'warning',
        title: 'Many Waiting Threads',
        message: `You have ${dashboardData.waitingThreadsCount} threads waiting for responses`,
        actionable: true,
        actions: [
          { label: 'Review Waiting', action: 'view-waiting', primary: true }
        ],
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        dismissed: false,
        priority: 6
      });
    }

    return notificationList;
  });

  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>(() => [
    {
      id: '1',
      type: 'email',
      description: 'Replied to John Smith about property inquiry',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      propertyAddress: '123 Main St',
      contactName: 'John Smith',
      relatedId: 'thread-1',
      relatedType: 'thread'
    },
    {
      id: '2',
      type: 'voice_note',
      description: 'Voice note processed for listing details',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      propertyAddress: '456 Oak Avenue',
      relatedId: 'property-2',
      relatedType: 'property'
    },
    {
      id: '3',
      type: 'appointment',
      description: 'Scheduled viewing appointment',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      propertyAddress: '789 Maple Street',
      contactName: 'Sarah Johnson',
      relatedId: 'appointment-3',
      relatedType: 'appointment'
    },
    {
      id: '4',
      type: 'deal_update',
      description: 'Updated deal status to negotiation',
      timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000), // Yesterday
      dealName: 'Sunset Villa Deal',
      propertyAddress: '321 Sunset Blvd',
      relatedId: 'deal-4',
      relatedType: 'deal'
    },
    {
      id: '5',
      type: 'contact_update',
      description: 'Added new contact from referral',
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
      contactName: 'Mike Wilson',
      relatedId: 'contact-5',
      relatedType: 'contact'
    }
  ]);

  // Function to add new activities (simulates real-time updates)
  const addNewActivity = useCallback((newActivity: ActivityItem) => {
    setRecentActivities(prevActivities => {
      // Add new activity at the beginning and limit to maxItems
      const updatedActivities = [newActivity, ...prevActivities];
      return updatedActivities.slice(0, 5); // Keep only the 5 most recent
    });
  }, []);

  // Real-time data service integration
  useEffect(() => {
    // Initialize real-time data service
    realTimeDataService.initialize();

    // Subscribe to data updates
    const unsubscribeData = realTimeDataService.onDataUpdate((update) => {
      try {
        console.log('Real-time data update received:', update);

        // Update dashboard data
        setDashboardData(prevData => {
          const newData = { ...prevData };

          if (update.focusThreadsCount !== undefined) {
            newData.focusThreadsCount = update.focusThreadsCount;
          }
          if (update.waitingThreadsCount !== undefined) {
            newData.waitingThreadsCount = update.waitingThreadsCount;
          }
          if (update.atRiskDealsCount !== undefined) {
            newData.atRiskDealsCount = update.atRiskDealsCount;
          }
          if (update.upcomingAppointments) {
            newData.upcomingAppointments = update.upcomingAppointments;
          }

          // Recalculate urgency level
          newData.urgencyLevel = calculateUrgencyLevel({
            focusThreadsCount: newData.focusThreadsCount,
            waitingThreadsCount: newData.waitingThreadsCount,
            atRiskDealsCount: newData.atRiskDealsCount
          });

          return newData;
        });

        // Update recent activities if provided
        if (update.recentActivities) {
          setRecentActivities(prevActivities => {
            const newActivities = [...update.recentActivities, ...prevActivities];
            return newActivities.slice(0, 5); // Keep only the 5 most recent
          });
        }

        // Update notifications if provided
        if (update.notifications) {
          setNotifications(prevNotifications => {
            const newNotifications = [...update.notifications, ...prevNotifications];
            // Remove duplicates and sort by priority
            const uniqueNotifications = newNotifications.filter((notification, index, arr) =>
              arr.findIndex(n => n.id === notification.id) === index
            );
            return uniqueNotifications.sort((a, b) => b.priority - a.priority);
          });
        }
      } catch (error) {
        console.error('Error processing real-time data update:', error);
        errorHandlingService.reportError(error as Error, {
          component: 'EnhancedHomeDashboard',
          props: { updateType: 'realTimeData' }
        });
      }
    });

    // Subscribe to connection status
    const unsubscribeConnection = realTimeDataService.onConnectionStatus((connected) => {
      setRealTimeConnected(connected);
      if (connected) {
        setLastError(null);
      }
    });

    // Subscribe to errors
    const unsubscribeError = realTimeDataService.onError((error) => {
      console.error('Real-time service error:', error);
      setLastError(error.message);
      errorHandlingService.reportNetworkError('WebSocket', 'CONNECT', undefined, error);
    });

    // Cleanup on unmount
    return () => {
      unsubscribeData();
      unsubscribeConnection();
      unsubscribeError();
    };
  }, []);

  // Simulate periodic activity updates (fallback for when real-time is not available)
  useEffect(() => {
    if (realTimeConnected) {
      return; // Skip simulation if real-time is connected
    }

    const simulateActivity = () => {
      const activityTypes = ['email', 'voice_note', 'deal_update', 'appointment', 'contact_update'] as const;
      const randomType = activityTypes[Math.floor(Math.random() * activityTypes.length)];

      const newActivity: ActivityItem = {
        id: `activity-${Date.now()}`,
        type: randomType,
        description: `New ${randomType.replace('_', ' ')} activity`,
        timestamp: new Date(),
        propertyAddress: Math.random() > 0.5 ? '123 Example St' : undefined,
        relatedId: `${randomType}-${Date.now()}`,
        relatedType: randomType === 'email' ? 'thread' :
          randomType === 'deal_update' ? 'deal' :
            randomType === 'appointment' ? 'appointment' : 'contact'
      };

      addNewActivity(newActivity);
    };

    // Simulate new activity every 2 minutes (for demo purposes)
    const interval = setInterval(simulateActivity, 120000);

    return () => clearInterval(interval);
  }, [addNewActivity, realTimeConnected]);

  // Calculate personalized widget layout
  const [widgetLayout, setWidgetLayout] = useState(() => {
    const currentTime = new Date();
    const hour = currentTime.getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const workloadMetrics = {
      focusThreadsCount: dashboardData.focusThreadsCount,
      waitingThreadsCount: dashboardData.waitingThreadsCount,
      atRiskDealsCount: dashboardData.atRiskDealsCount,
      upcomingAppointmentsCount: calendarAppointments.length,
      overdueTasksCount: 0, // Would come from actual task data
    };

    return personalizationService.calculateOptimalLayout(
      usagePatterns,
      preferences,
      {
        timeOfDay,
        urgencyLevel: dashboardData.urgencyLevel,
        dealTypes: [], // Would come from actual deal context
      },
      workloadMetrics
    );
  });

  // Update widget layout when personalization data changes
  useEffect(() => {
    const currentTime = new Date();
    const hour = currentTime.getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const workloadMetrics = {
      focusThreadsCount: dashboardData.focusThreadsCount,
      waitingThreadsCount: dashboardData.waitingThreadsCount,
      atRiskDealsCount: dashboardData.atRiskDealsCount,
      upcomingAppointmentsCount: calendarAppointments.length,
      overdueTasksCount: 0, // Would come from actual task data
    };

    const newLayout = personalizationService.calculateOptimalLayout(
      usagePatterns,
      preferences,
      {
        timeOfDay,
        urgencyLevel: dashboardData.urgencyLevel,
        dealTypes: [],
      },
      workloadMetrics
    );

    setWidgetLayout(newLayout);
  }, [usagePatterns, preferences, dashboardData.urgencyLevel, calendarAppointments.length]);

  const handleNotificationDismiss = (notificationId: string) => {
    console.log('Dismissing notification:', notificationId);

    // Update notification state to mark as dismissed
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, dismissed: true }
          : notification
      )
    );

    // In a real app, this would also send the dismissal to the backend
    // to persist the state across sessions
  };

  const handleNotificationAction = (notificationId: string, action: string) => {
    console.log('Notification action:', notificationId, action);

    // Handle notification actions with proper navigation
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
      case 'view-calendar':
        navigate('/calendar');
        break;
      case 'dismiss':
        // Handle dismissal (already handled by onDismiss)
        break;
      default:
        console.log('Unknown notification action:', action);
    }
  };

  const handleQuickActionTrigger = (actionId: string) => {
    console.log('Quick action triggered:', actionId);

    // Track usage for personalization
    trackUsage(actionId, {
      urgencyLevel: dashboardData.urgencyLevel,
      dealTypes: [], // Would come from actual deal context
    });
  };

  const handleActivityClick = (activity: ActivityItem) => {
    console.log('Activity clicked:', activity);

    // Track usage for personalization
    trackUsage('recent-activity', {
      urgencyLevel: dashboardData.urgencyLevel,
      dealTypes: activity.dealName ? ['deal'] : [],
    });

    // Navigate to the relevant detail view based on activity type and related data
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
          navigate(`/contacts/${activity.relatedId}`, { state: { from: location.pathname, label: 'Dashboard' } });
          break;
        case 'appointment':
          // Navigate to calendar or appointment detail
          navigate(`/calendar?appointment=${activity.relatedId}`);
          break;
        default:
          console.log('Unknown activity type for navigation:', activity.relatedType);
      }
    } else {
      // Fallback navigation based on activity type
      switch (activity.type) {
        case 'email':
          navigate('/threads');
          break;
        case 'voice_note':
          navigate('/voice-notes');
          break;
        case 'deal_update':
          navigate('/deals');
          break;
        case 'appointment':
          navigate('/calendar');
          break;
        case 'property_update':
          navigate('/properties');
          break;
        case 'contact_update':
          navigate('/contacts');
          break;
        default:
          console.log('No navigation defined for activity type:', activity.type);
      }
    }
  };

  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    console.log('Appointment clicked:', appointment);

    // Track usage for personalization
    trackUsage('calendar-appointment', {
      urgencyLevel: dashboardData.urgencyLevel,
      dealTypes: appointment.property ? ['property'] : [],
    });

    // Navigate to appointment detail or calendar view
    navigate(`/calendar?appointment=${appointment.id}`);
  };

  const handleConflictResolve = (appointmentId: string, action: 'reschedule' | 'cancel' | 'ignore') => {
    console.log('Conflict resolution:', appointmentId, action);

    // In a real app, this would update the appointment in the backend
    switch (action) {
      case 'reschedule':
        navigate(`/calendar/reschedule/${appointmentId}`);
        break;
      case 'cancel':
        // Show confirmation dialog and cancel appointment
        console.log('Cancelling appointment:', appointmentId);
        break;
      case 'ignore':
        // Mark conflict as ignored
        console.log('Ignoring conflict for appointment:', appointmentId);
        break;
    }
  };

  // Refresh handler for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    console.log('Refreshing dashboard data...');

    try {
      // Refresh real-time data service
      realTimeDataService.refresh();

      // Also refresh the legacy hook for backward compatibility
      await refreshRealTimeData();

      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      setLastError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh dashboard';
      setLastError(errorMessage);

      errorHandlingService.reportError(error as Error, {
        component: 'EnhancedHomeDashboard',
        props: { action: 'refresh' }
      });
    } finally {
      setIsRefreshing(false);
      console.log('Dashboard data refreshed');
    }
  }, [refreshRealTimeData]);

  // Gesture handlers
  const handleSwipeLeft = useCallback((element: HTMLElement) => {
    console.log('Swipe left detected on:', element.className);
    // Show quick action options for widgets
    if (element.classList.contains('smart-summary-widget') ||
      element.classList.contains('contextual-insights-widget') ||
      element.classList.contains('recent-activity-stream')) {
      // In a real implementation, this would show contextual actions
      console.log('Showing quick actions for widget');
    }
  }, []);

  const handleSwipeRight = useCallback(() => {
    console.log('Swipe right detected - navigating back or showing menu');
    // Navigate to previous view or show navigation menu
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Show navigation menu or go to home
      console.log('Showing navigation menu');
    }
  }, [navigate]);

  const handleLongPress = useCallback((element: HTMLElement) => {
    console.log('Long press detected on:', element.className);
    // Show additional options or customization menu
    if (element.classList.contains('quick-action-button')) {
      console.log('Showing customization options for quick action');
    } else if (element.classList.contains('smart-summary-widget')) {
      console.log('Showing widget customization options');
    }
  }, []);

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

  // Set up keyboard navigation and accessibility
  const {
    containerRef: keyboardContainerRef,
    announceToScreenReader,
    handleVoiceCommand
  } = useKeyboardNavigation({
    enableVoiceCommands: true,
    enableArrowNavigation: true,
    onVoiceCommand: (command: string) => {
      console.log('Voice command received:', command);

      // Handle voice commands
      switch (command) {
        case 'voice-note':
          handleQuickActionTrigger('voice-note');
          announceToScreenReader('Starting voice note recording');
          break;
        case 'ask-zena':
          navigate('/ask-zena');
          announceToScreenReader('Opening Zena AI assistant');
          break;
        case 'focus-threads':
          navigate('/focus');
          announceToScreenReader('Opening focus threads');
          break;
        case 'property-search':
          navigate('/properties');
          announceToScreenReader('Opening property search');
          break;
        case 'theme-toggle':
          toggleTheme();
          announceToScreenReader(`Switched to ${effectiveTheme === 'day' ? 'night' : 'day'} mode`);
          break;
        default:
          announceToScreenReader('Voice command not recognized');
      }
    }
  });

  // Attach gesture handlers and keyboard navigation on mount
  useEffect(() => {
    if (dashboardRef.current) {
      attachGestureHandlers(dashboardRef.current);
      attachPullToRefresh(dashboardRef.current);

      // Set up keyboard navigation container
      if (keyboardContainerRef) {
        keyboardContainerRef.current = dashboardRef.current;
      }
    }

    return () => {
      detachGestureHandlers();
      detachPullToRefresh();
    };
  }, [attachGestureHandlers, detachGestureHandlers, attachPullToRefresh, detachPullToRefresh, keyboardContainerRef]);

  // Widget error handler
  const handleWidgetError = useCallback((widgetName: string, error: Error) => {
    console.error(`Widget error in ${widgetName}:`, error);
    reportWidgetError(widgetName, error, { dashboardData });
  }, [dashboardData]);

  // Render widgets in personalized order
  const renderWidget = useCallback((widgetId: string, size: 'small' | 'medium' | 'large', priority: number, visible: boolean) => {
    const handleWidgetInteraction = (widgetId: string) => {
      try {
        trackUsage(widgetId, {
          urgencyLevel: dashboardData.urgencyLevel,
          dealTypes: [],
        });
      } catch (error) {
        console.error('Error tracking widget usage:', error);
        reportWidgetError(widgetId, error as Error);
      }
    };

    // Determine priority class
    let priorityClass = 'priority-low';
    if (priority > 12) priorityClass = 'priority-high';
    else if (priority > 8) priorityClass = 'priority-medium';

    // Determine additional classes based on usage patterns
    const additionalClasses = [];
    const recentUsage = usagePatterns.filter(p =>
      p.actionId === widgetId &&
      p.timestamp >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    if (recentUsage > 5) {
      additionalClasses.push('frequently-used');
    }

    const currentTimePreferences = getCurrentTimePreferences();
    if (currentTimePreferences.includes(widgetId)) {
      additionalClasses.push('time-preferred');
    }

    const sectionClasses = [
      'enhanced-dashboard__section',
      `enhanced-dashboard__section--${size}`,
      `enhanced-dashboard__section--${priorityClass}`,
      visible ? 'enhanced-dashboard__section--visible' : 'enhanced-dashboard__section--hidden',
      ...additionalClasses.map(cls => `enhanced-dashboard__section--${cls}`)
    ].join(' ');

    switch (widgetId) {
      case 'smart-summary':
        return (
          <section
            key={widgetId}
            className={sectionClasses}
            onClick={() => handleWidgetInteraction(widgetId)}
            style={{ display: visible ? 'block' : 'none' }}
          >
            <WidgetErrorBoundary
              widgetName="Smart Summary"
              onError={handleWidgetError}
            >
              <SmartSummaryWidget
                focusThreadsCount={dashboardData.focusThreadsCount}
                waitingThreadsCount={dashboardData.waitingThreadsCount}
                atRiskDealsCount={dashboardData.atRiskDealsCount}
                upcomingAppointments={dashboardData.upcomingAppointments}
                urgencyLevel={dashboardData.urgencyLevel}
              />
            </WidgetErrorBoundary>
          </section>
        );

      case 'priority-notifications':
        return (
          <section
            key={widgetId}
            className={sectionClasses}
            onClick={() => handleWidgetInteraction(widgetId)}
            style={{ display: visible ? 'block' : 'none' }}
          >
            <WidgetErrorBoundary
              widgetName="Priority Notifications"
              onError={handleWidgetError}
            >
              <PriorityNotificationsPanel
                notifications={notifications}
                onDismiss={handleNotificationDismiss}
                onAction={handleNotificationAction}
              />
            </WidgetErrorBoundary>
          </section>
        );

      case 'quick-actions':
        return (
          <section
            key={widgetId}
            className={sectionClasses}
            style={{ display: visible ? 'block' : 'none' }}
          >
            <WidgetErrorBoundary
              widgetName="Smart Connections"
              onError={handleWidgetError}
            >
              <QuickActionsPanel
                onActionTrigger={handleQuickActionTrigger}
                customizable={true}
              />
            </WidgetErrorBoundary>
          </section>
        );

      case 'contextual-insights':
        return (
          <section
            key={widgetId}
            className={sectionClasses}
            onClick={() => handleWidgetInteraction(widgetId)}
            style={{ display: visible ? 'block' : 'none' }}
          >
            <WidgetErrorBoundary
              widgetName="Contextual Insights"
              onError={handleWidgetError}
            >
              <div className="contextual-insights-widget">
                <h2 className="contextual-insights-widget__title">Business Insights</h2>
                <div className="contextual-insights-widget__content">
                  <div className="insight-card">
                    <div className="insight-card__metric">
                      <span className="insight-card__value">2.3h</span>
                      <span className="insight-card__trend insight-card__trend--up">↗</span>
                    </div>
                    <p className="insight-card__label">Avg Response Time</p>
                    <p className="insight-card__message">Great improvement this week!</p>
                  </div>
                  <div className="insight-card">
                    <div className="insight-card__metric">
                      <span className="insight-card__value">12</span>
                      <span className="insight-card__trend insight-card__trend--stable">→</span>
                    </div>
                    <p className="insight-card__label">Active Deals</p>
                    <p className="insight-card__message">Pipeline looking healthy</p>
                  </div>
                </div>
              </div>
            </WidgetErrorBoundary>
          </section>
        );

      case 'recent-activity':
        return (
          <section
            key={widgetId}
            className={sectionClasses}
            style={{ display: visible ? 'block' : 'none' }}
          >
            <WidgetErrorBoundary
              widgetName="Recent Activity"
              onError={handleWidgetError}
            >
              <RecentActivityStream
                activities={recentActivities}
                onActivityClick={handleActivityClick}
                maxItems={5}
              />
            </WidgetErrorBoundary>
          </section>
        );

      case 'calendar':
        return (
          <section
            key={widgetId}
            className={sectionClasses}
            style={{ display: visible ? 'block' : 'none' }}
          >
            <WidgetErrorBoundary
              widgetName="Calendar"
              onError={handleWidgetError}
            >
              <CalendarWidget
                appointments={calendarAppointments}
                onAppointmentClick={handleAppointmentClick}
                onConflictResolve={handleConflictResolve}
                maxAppointments={3}
                showConflicts={true}
              />
            </WidgetErrorBoundary>
          </section>
        );

      default:
        return null;
    }
  }, [
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
    <ErrorBoundary
      onError={(error, errorInfo) => {
        errorHandlingService.reportError(error, {
          component: 'EnhancedHomeDashboard',
          props: { testData }
        }, 'critical', errorInfo);
      }}
    >
      <div className="enhanced-dashboard" ref={dashboardRef} role="main" aria-label="Enhanced Home Dashboard">
        {/* Skip Link for Keyboard Navigation */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <ThemeToggle
          currentTheme={effectiveTheme}
          onToggle={toggleTheme}
          position="top-right"
        />

        <SyncStatusIndicator
          position="bottom-right"
          showDetails={false}
        />

        {/* Error feedback banner */}
        {lastError && (
          <div className="error-banner" role="alert" aria-live="assertive">
            <div className="error-banner__content">
              <span className="error-banner__icon" aria-hidden="true">⚠️</span>
              <span className="error-banner__message">{lastError}</span>
              <button
                className="error-banner__dismiss"
                onClick={() => setLastError(null)}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Pull-to-refresh indicator */}
        <div className="pull-to-refresh-indicator" style={getPullIndicatorStyle()}>
          <div className="pull-to-refresh-icon">
            {isRefreshing ? '⟳' : '↓'}
          </div>
          <span className="pull-to-refresh-text">
            {isRefreshing ? 'Refreshing...' : isPulling && pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>

        <div className="enhanced-dashboard__container" style={getPullContainerStyle()} id="main-content">
          {/* Real-time connection status indicator */}
          <div
            className={`real-time-status ${getConnectionStatus()}`}
            role="status"
            aria-live="polite"
            aria-label={getConnectionAriaLabel()}
          >
            <span className="real-time-status__indicator" aria-hidden="true"></span>
            <span className="real-time-status__text">
              {getConnectionStatusText()}
            </span>
          </div>

          {/* Dashboard Header */}
          <header className="enhanced-dashboard__header" role="banner">
            <WidgetErrorBoundary
              widgetName="Dashboard Header"
              onError={handleWidgetError}
            >
              <DashboardHeader
                agentName="Agent"
                notificationCount={dashboardData.notifications?.length || 0}
              />
            </WidgetErrorBoundary>
          </header>

          {/* Personalized Widget Layout */}
          <div className={`enhanced-dashboard__widgets enhanced-dashboard--urgency-${dashboardData.urgencyLevel}`}>
            {widgetLayout
              .sort((a, b) => a.position - b.position)
              .map(widget => renderWidget(widget.widgetId, widget.size, widget.priority, widget.visible))
            }
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};