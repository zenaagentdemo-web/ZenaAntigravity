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

import { QuickActionsCarousel, CarouselAction } from '../QuickActionsCarousel/QuickActionsCarousel';
import { AmbientBackground } from '../AmbientBackground/AmbientBackground';
import { CalendarWidget, CalendarAppointment } from '../CalendarWidget/CalendarWidget';
import { RecentActivityStream, ActivityItem } from '../RecentActivityStream/RecentActivityStream';
import { NeuralBridgesWidget } from '../NeuralBridgesWidget/NeuralBridgesWidget';

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

  /** Callback when a quick action is triggered */
  onQuickAction?: (actionId: string) => void;
  /** Callback when an appointment is clicked */
  onAppointmentClick?: (appointment: CalendarAppointment) => void;
  /** Callback when an activity is clicked */
  onActivityClick?: (activity: ActivityItem) => void;
  /** Test ID for testing */
  testId?: string;
}




export const HighTechDashboard: React.FC<HighTechDashboardProps> = ({
  focusThreadsCount = 0,
  waitingThreadsCount = 0,
  atRiskDealsCount = 0,
  activeTasksCount = 0,

  appointments = [],
  recentActivities = [],
  aiState = 'idle',
  onZenaClick,
  onMetricClick,

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


  // Build metric orbs data - no icons, just numbers and labels
  const metricOrbs: MetricOrb[] = [
    {
      id: 'focus',
      label: focusThreadsCount === 1 ? 'NEW MESSAGE' : 'NEW MESSAGES',
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
      label: 'FOLLOW UP',
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
      iconImage: '/assets/icons/voice-note-final.png',
      color: 'cyan',
    },
    {
      id: 'search',
      label: 'Search',
      icon: '🔍',
      iconImage: '/assets/icons/search-final.png',
      color: 'purple',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: '📅',
      iconImage: '/assets/icons/calendar-final.png',
      color: 'magenta',
    },
    {
      id: 'add-deal',
      label: 'Add Deal',
      icon: '💼',
      iconImage: '/assets/icons/add-deal-final.png',
      color: 'green',
    },
    {
      id: 'schedule-viewing',
      label: 'Schedule Meeting',
      icon: '🗓️',
      iconImage: '/assets/icons/schedule-meeting-final.png',
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
      navigate('/ask-zena');
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
        case 'add-deal':
          navigate('/deals/new');
          break;
        case 'schedule-viewing':
          navigate('/viewings/new');
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
        {/* Central Zena Orb Hero Section (Full Width) */}
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

          {/* Start Zena Live Button - Speech-to-Speech Conversation */}
          <div className="high-tech-dashboard__live-button-container">
            <button
              className="zena-live-button"
              onClick={() => navigate('/ask-zena?mode=handsfree')}
              aria-label="Start Zena Live voice conversation"
            >
              <span className="zena-live-button__text">Start Zena Live</span>
              <span className="zena-live-button__wave-icon">
                <span className="wave-bar" style={{ animationDelay: '0ms' }} />
                <span className="wave-bar" style={{ animationDelay: '150ms' }} />
                <span className="wave-bar" style={{ animationDelay: '300ms' }} />
                <span className="wave-bar" style={{ animationDelay: '200ms' }} />
                <span className="wave-bar" style={{ animationDelay: '100ms' }} />
              </span>
            </button>
          </div>

          {/* Action Bar: Morning Routine Actions */}
          <div className="high-tech-dashboard__quick-intel">
            <button
              className="intel-btn intel-btn--emails"
              onClick={() => navigate(`/ask-zena?prompt=${encodeURIComponent("Triage my emails. Categorize by urgency, summarize important ones, and tell me which need immediate response.")}&mode=handsfree`)}
            >
              <img src="/assets/icons/triage-email-final.png" alt="" className="intel-btn__icon-img" />
              <span className="intel-btn__label">Triage Emails</span>
            </button>

            <button
              className="intel-btn intel-btn--brief"
              onClick={() => navigate(`/ask-zena?prompt=${encodeURIComponent("Give me my morning brief. Include today's schedule, any urgent messages, and key tasks I need to focus on.")}&mode=handsfree`)}
            >
              <img src="/assets/icons/morning-brief-final.png" alt="" className="intel-btn__icon-img" />
              <span className="intel-btn__label">Morning Brief</span>
            </button>

            <button
              className="intel-btn intel-btn--tasks"
              onClick={() => navigate(`/ask-zena?prompt=${encodeURIComponent("Review my tasks for today. Generate a prioritized list from my calendar, emails, and any pending follow-ups.")}&mode=handsfree`)}
            >
              <img src="/assets/icons/todays-tasks-final.png" alt="" className="intel-btn__icon-img" />
              <span className="intel-btn__label">Today's Tasks</span>
            </button>
          </div>
        </section>

        {/* Floating Metric Orbs - Always visible near top */}
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

        {/* Neural Bridges Status */}
        <section className="high-tech-dashboard__neural-bridges">
          <NeuralBridgesWidget />
        </section>

        {/* Quick Actions Carousel */}
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

        {/* Upcoming Appointments */}
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
