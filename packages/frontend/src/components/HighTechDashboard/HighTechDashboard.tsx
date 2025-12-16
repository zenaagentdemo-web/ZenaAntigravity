/**
 * HighTechDashboard Component
 * 
 * AI-centric dashboard layout with futuristic high-tech aesthetic.
 * Features central Zena orb hero section, floating metric orbs,
 * collapsible priority alerts, and horizontal quick actions carousel.
 * 
 * Requirements: 1.1, 1.2, 5.3, 6.1, 6.2, 7.1, 7.2, 7.3
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ZenaAvatarState } from '../ZenaAvatar/ZenaAvatar';
import { HolographicAvatar } from '../HolographicAvatar/HolographicAvatar';
import { FloatingMetricOrbs, MetricOrb } from '../FloatingMetricOrbs/FloatingMetricOrbs';
import { CollapsibleAlertsPanel, PriorityAlert } from '../CollapsibleAlertsPanel/CollapsibleAlertsPanel';
import { QuickActionsCarousel, CarouselAction } from '../QuickActionsCarousel/QuickActionsCarousel';
import { AmbientBackground } from '../AmbientBackground/AmbientBackground';
import { CalendarWidget, CalendarAppointment } from '../CalendarWidget/CalendarWidget';
import { RecentActivityStream, ActivityItem } from '../RecentActivityStream/RecentActivityStream';
import { WeatherTimeWidget } from '../WeatherTimeWidget/WeatherTimeWidget';
import './HighTechDashboard.css';

export interface HighTechDashboardProps {
  /** User's display name for greeting */
  userName?: string;
  /** Focus threads count */
  focusThreadsCount?: number;
  /** Waiting threads count */
  waitingThreadsCount?: number;
  /** At-risk deals count */
  atRiskDealsCount?: number;
  /** Active tasks count */
  activeTasksCount?: number;
  /** Priority alerts */
  alerts?: PriorityAlert[];
  /** Upcoming appointments for calendar widget */
  appointments?: CalendarAppointment[];
  /** Recent activity items */
  recentActivities?: ActivityItem[];
  /** Current AI state */
  aiState?: ZenaAvatarState;

  /** Callback when Zena orb is clicked */
  onZenaClick?: () => void;
  /** Callback when a metric orb is clicked */
  onMetricClick?: (metricId: string) => void;
  /** Callback when an alert action is triggered */
  onAlertAction?: (alertId: string, action: string) => void;
  /** Callback when a quick action is triggered */
  onQuickAction?: (actionId: string) => void;
  /** Callback when an appointment is clicked */
  onAppointmentClick?: (appointment: CalendarAppointment) => void;
  /** Callback when an activity is clicked */
  onActivityClick?: (activity: ActivityItem) => void;
  /** Test ID for testing */
  testId?: string;
}

/**
 * Generate AI greeting based on time of day
 */
const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Hello';
};



export const HighTechDashboard: React.FC<HighTechDashboardProps> = ({
  userName = 'there',
  focusThreadsCount = 0,
  waitingThreadsCount = 0,
  atRiskDealsCount = 0,
  activeTasksCount = 0,
  alerts = [],
  appointments = [],
  recentActivities = [],
  aiState = 'idle',
  onZenaClick,
  onMetricClick,
  onAlertAction,
  onQuickAction,
  onAppointmentClick,
  onActivityClick,
  testId = 'high-tech-dashboard',
}) => {
  const navigate = useNavigate();
  const [currentAiState, setCurrentAiState] = useState<ZenaAvatarState>(aiState);

  // Update AI state when prop changes
  useEffect(() => {
    setCurrentAiState(aiState);
  }, [aiState]);

  // Generate greeting
  const greeting = getTimeBasedGreeting();

  // Build metric orbs data - no icons, just numbers and labels
  const metricOrbs: MetricOrb[] = [
    {
      id: 'focus',
      label: 'New',
      value: focusThreadsCount,
      color: 'cyan',
      urgency: focusThreadsCount > 5 ? 'high' : focusThreadsCount > 2 ? 'medium' : 'low',
    },
    {
      id: 'deals',
      label: 'DEAL FLOW',
      value: atRiskDealsCount,
      color: 'magenta',
      urgency: atRiskDealsCount > 0 ? 'high' : 'low',
    },
    {
      id: 'waiting',
      label: 'Awaiting',
      value: waitingThreadsCount,
      color: 'purple',
      urgency: waitingThreadsCount > 10 ? 'high' : waitingThreadsCount > 5 ? 'medium' : 'low',
    },
    {
      id: 'tasks',
      label: 'Tasks',
      value: activeTasksCount,
      color: 'green',
      urgency: activeTasksCount > 5 ? 'medium' : 'low',
    },
  ];

  // Build quick actions
  const quickActions: CarouselAction[] = [
    {
      id: 'voice-note',
      label: 'Voice Note',
      icon: '🎤',
      color: 'cyan',
    },
    {
      id: 'search',
      label: 'Search',
      icon: '🔍',
      color: 'purple',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: '📅',
      color: 'magenta',
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: '👥',
      color: 'green',
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: '🏠',
      color: 'orange',
    },
  ];

  // Handle Zena orb click
  const handleZenaClick = useCallback(() => {
    // Briefly show active state
    setCurrentAiState('active');
    setTimeout(() => setCurrentAiState(aiState), 300);

    if (onZenaClick) {
      onZenaClick();
    } else {
      navigate('/ask-zena-immersive');
    }
  }, [aiState, onZenaClick, navigate]);

  // Handle metric orb click
  const handleMetricClick = useCallback((metricId: string) => {
    if (onMetricClick) {
      onMetricClick(metricId);
    } else {
      // Default navigation based on metric
      switch (metricId) {
        case 'focus':
          navigate('/new');
          break;
        case 'deals':
          navigate('/deals?filter=at-risk');
          break;
        case 'waiting':
          navigate('/waiting');
          break;
        case 'tasks':
          navigate('/tasks');
          break;
      }
    }
  }, [onMetricClick, navigate]);

  // Handle alert action
  const handleAlertAction = useCallback((alertId: string, action: string) => {
    if (onAlertAction) {
      onAlertAction(alertId, action);
    }
  }, [onAlertAction]);

  // Handle quick action
  const handleQuickAction = useCallback((actionId: string) => {
    if (onQuickAction) {
      onQuickAction(actionId);
    } else {
      // Default navigation based on action
      switch (actionId) {
        case 'voice-note':
          navigate('/voice-note');
          break;
        case 'search':
          navigate('/search');
          break;
        case 'calendar':
          navigate('/calendar');
          break;
        case 'contacts':
          navigate('/contacts');
          break;
        case 'properties':
          navigate('/properties');
          break;
      }
    }
  }, [onQuickAction, navigate]);

  return (
    <div
      className="high-tech-dashboard"
      data-testid={testId}
      data-theme="high-tech"
    >
      {/* Ambient Background */}
      <AmbientBackground
        variant="default"
        showParticles={true}
        showGradientOrbs={true}
        showGrid={false}
        testId="dashboard-ambient-background"
      />

      {/* Header Bar */}
      <header className="high-tech-dashboard__header">
        <h1 className="high-tech-dashboard__title">
          <span className="title-glow">ZENA</span> AI Command Center
        </h1>
      </header>

      {/* Main Content */}
      <main className="high-tech-dashboard__content">
        {/* Central Zena Orb Hero Section */}
        <section
          className="high-tech-dashboard__hero"
          aria-label="Zena AI Assistant"
        >
          <div className="high-tech-dashboard__zena-container">
            <HolographicAvatar
              animationState={currentAiState === 'active' ? 'speaking' : 'idle'}
              size={200}
              enableParticles={true}
              noBackground={true}
              onClick={handleZenaClick}
            />
            {/* Hint for first-time users */}
            <div className="high-tech-dashboard__zena-hint">
              <span className="zena-hint__text">TAP TO ASK ZENA</span>
            </div>
          </div>

          {/* AI Greeting */}
          <div className="high-tech-dashboard__greeting">
            <p className="greeting-text">
              {greeting}, <span className="greeting-name">{userName}</span>
            </p>
          </div>
        </section>

        {/* Weather Widget with Property Viewing Tips */}
        <section
          className="high-tech-dashboard__weather"
          aria-label="Weather and Property Viewing Tips"
        >
          <WeatherTimeWidget />
        </section>

        {/* Floating Metric Orbs */}
        <section
          className="high-tech-dashboard__metrics"
          aria-label="Key Metrics"
        >
          <FloatingMetricOrbs
            orbs={metricOrbs}
            onOrbClick={handleMetricClick}
            testId="dashboard-metrics"
          />
        </section>

        {/* Collapsible Priority Alerts Panel */}
        {alerts.length > 0 && (
          <section
            className="high-tech-dashboard__alerts"
            aria-label="Priority Alerts"
          >
            <CollapsibleAlertsPanel
              alerts={alerts}
              onAction={handleAlertAction}
              testId="dashboard-alerts"
            />
          </section>
        )}

        {/* Horizontal Quick Actions Carousel */}
        <section
          className="high-tech-dashboard__actions"
          aria-label="Quick Actions"
        >
          <QuickActionsCarousel
            actions={quickActions}
            onActionClick={handleQuickAction}
            testId="dashboard-quick-actions"
          />
        </section>

        {/* Calendar Widget - Upcoming Appointments */}
        <section
          className="high-tech-dashboard__calendar"
          aria-label="Upcoming Appointments"
        >
          <CalendarWidget
            appointments={appointments}
            onAppointmentClick={onAppointmentClick}
            maxAppointments={3}
            showConflicts={true}
          />
        </section>

        {/* Recent Activity Stream */}
        <section
          className="high-tech-dashboard__activity"
          aria-label="Recent Activity"
        >
          <RecentActivityStream
            activities={recentActivities}
            onActivityClick={onActivityClick}
            maxItems={5}
          />
        </section>
      </main>
    </div>
  );
};

export default HighTechDashboard;
