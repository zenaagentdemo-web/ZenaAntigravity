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
import { useGodmodeLogic } from '../../hooks/useGodmode';
import './HighTechDashboard.css';
import { AmbientBackground } from '../AmbientBackground/AmbientBackground';
import { CalendarWidget, CalendarAppointment } from '../CalendarWidget/CalendarWidget';
import { RecentActivityStream, ActivityItem } from '../RecentActivityStream/RecentActivityStream';
import { NeuralBridgesWidget } from '../NeuralBridgesWidget/NeuralBridgesWidget';
import { MorningBriefModal } from './MorningBriefModal';
import { QuickActionsCarousel, CarouselAction } from '../QuickActionsCarousel/QuickActionsCarousel';
import { DriveModeModal } from '../DriveModeModal/DriveModeModal';

import './HighTechDashboard.css';

export interface HighTechDashboardProps {
  /** User's display name for greeting */
  userName?: string;
  /** Focus threads count */
  focusThreadsCount?: number;
  /** Waiting threads count */
  waitingThreadsCount?: number;
  /** Deals needing action count */
  dealsNeedingActionCount?: number;
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

/**
 * Format timestamp to HH:MM AM/PM
 */
const formatAppointmentTime = (timestamp: string | Date): string => {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return typeof timestamp === 'string' ? timestamp : String(timestamp);
  }
};




export const HighTechDashboard: React.FC<HighTechDashboardProps> = ({
  userName = 'there', // Default to 'there'
  focusThreadsCount = 0,
  waitingThreadsCount = 0,
  dealsNeedingActionCount = 0,
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
  const { settings } = useGodmodeLogic();
  const [currentAiState, setCurrentAiState] = useState<ZenaAvatarState>(aiState);
  const [isBriefOpen, setIsBriefOpen] = useState(false);
  const [isDriveModeOpen, setIsDriveModeOpen] = useState(false);

  // Auto-show Morning Brief on first mount if there are urgent items
  useEffect(() => {
    const hasUrgent = focusThreadsCount > 0 || dealsNeedingActionCount > 0;
    const briefDismissed = localStorage.getItem('zena_brief_dismissed');
    const today = new Date().toDateString();

    if (hasUrgent && briefDismissed !== today) {
      setIsBriefOpen(true);
    }
  }, [focusThreadsCount, dealsNeedingActionCount]);

  const handleBriefClose = () => {
    setIsBriefOpen(false);
    localStorage.setItem('zena_brief_dismissed', new Date().toDateString());
  };

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
      value: dealsNeedingActionCount,
      color: 'magenta',
      urgency: dealsNeedingActionCount > 0 ? 'high' : 'low',
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
      color: settings.mode === 'full_god' ? 'gold' : 'green',
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
      color: settings.mode === 'demi_god' ? 'purple' : settings.mode === 'full_god' ? 'gold' : 'magenta',
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

      {/* Morning Brief Modal */}
      <MorningBriefModal
        isOpen={isBriefOpen}
        onClose={handleBriefClose}
        userName={userName}
        metrics={{
          focusThreads: focusThreadsCount,
          waitingThreads: waitingThreadsCount,
          atRiskDeals: dealsNeedingActionCount
        }}
        topAppointment={appointments.length > 0 ? {
          time: formatAppointmentTime(appointments[0].time),
          title: appointments[0].title,
          location: appointments[0].location
        } : undefined}
        onStartLive={() => navigate('/ask-zena?mode=handsfree')}
      />

      {/* Header Bar */}
      <header className="high-tech-dashboard__header">
        <h1 className="high-tech-dashboard__title">
          <span className="title-glow">ZENA</span> AI Command Center
        </h1>
      </header>

      {/* Main Content */}
      <main className="high-tech-dashboard__content">
        {/* Hero Section (Always Top) */}
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
              onClick={() => {
                const prompt = encodeURIComponent("Let's triage my unread emails. I want the full breakdown using your super level intelligence. Brief me on each one, show me the drafts you've prepared, and let's get those subsequent actions like tasks and appointments sorted. I'm ready for some high-proactivity!");
                navigate(`/ask-zena?mode=handsfree&prompt=${prompt}&context=triage_emails&t=${Date.now()}`);
              }}
            >
              <img src="/assets/icons/triage-email-final.png" alt="" className="intel-btn__icon-img" />
              <span className="intel-btn__label">Triage Emails</span>
            </button>

            <button
              className="intel-btn intel-btn--brief"
              onClick={() => {
                const prompt = encodeURIComponent("Give me my morning brief. I want a high-energy, proactive update. Tell me about my new emails, at-risk deals, and today's priorities. I know you've already prepared some drafts for me—let's hear your plan!");
                navigate(`/ask-zena?mode=handsfree&prompt=${prompt}&context=morning_brief&t=${Date.now()}`);
              }}
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

            <button
              className="intel-btn intel-btn--drive"
              onClick={() => setIsDriveModeOpen(true)}
            >
              <img src="/assets/icons/start-drive-final.png" alt="" className="intel-btn__icon-img" />
              <span className="intel-btn__label">Start Drive</span>
            </button>

            <button
              className="intel-btn intel-btn--recap"
              onClick={() => navigate(`/ask-zena?prompt=${encodeURIComponent("Give me my end of day recap. Summarize what I accomplished, highlight any deals needing attention, and suggest priorities for tomorrow.")}&mode=handsfree`)}
            >
              <img src="/assets/icons/todays-tasks-final.png" alt="" className="intel-btn__icon-img" />
              <span className="intel-btn__label">End of Day</span>
            </button>
          </div>
        </section>

        <DriveModeModal isOpen={isDriveModeOpen} onClose={() => setIsDriveModeOpen(false)} />

        {/* Dynamic Contextual Sections */}
        {(() => {
          // Define all potential sections
          const sections = [
            {
              id: 'metrics',
              priority: 200, // Always top
              render: () => (
                <section key="metrics" className="high-tech-dashboard__metrics" aria-label="Key Metrics">
                  <FloatingMetricOrbs orbs={metricOrbs} onOrbClick={handleMetricClick} />
                </section>
              )
            },
            {
              id: 'neural',
              priority: 70, // Consistent background intelligence
              render: () => (
                <section key="neural" className="high-tech-dashboard__neural-bridges">
                  <NeuralBridgesWidget />
                </section>
              )
            },
            {
              id: 'actions',
              priority: 150, // Second
              render: () => (
                <section key="actions" className="high-tech-dashboard__actions" aria-label="Quick Actions">
                  <QuickActionsCarousel actions={quickActions} onActionClick={handleQuickAction} />
                </section>
              )
            },
            {
              id: 'calendar',
              priority: 100, // Third
              render: () => (
                <section key="calendar" className="high-tech-dashboard__calendar" aria-label="Upcoming Appointments">
                  <CalendarWidget appointments={appointments} onAppointmentClick={onAppointmentClick} maxAppointments={3} showConflicts={true} />
                </section>
              )
            },
            {
              id: 'activity',
              priority: 30, // Usually lowest priority
              render: () => (
                <section key="activity" className="high-tech-dashboard__activity" aria-label="Recent Activity">
                  <RecentActivityStream activities={recentActivities} onActivityClick={onActivityClick} maxItems={5} />
                </section>
              )
            }
          ];

          // Sort sections by priority and render
          return sections
            .sort((a, b) => b.priority - a.priority)
            .map(section => section.render());
        })()}
      </main>
    </div>
  );
};

export default HighTechDashboard;
