/**
 * HighTechDashboardPage
 * 
 * Page wrapper for the high-tech AI-centric dashboard.
 * Integrates the HighTechDashboard component with app data.
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HighTechDashboard } from '../../components/HighTechDashboard/HighTechDashboard';
import { PriorityAlert } from '../../components/CollapsibleAlertsPanel/CollapsibleAlertsPanel';
import { CalendarAppointment } from '../../components/CalendarWidget/CalendarWidget';
import { ActivityItem } from '../../components/RecentActivityStream/RecentActivityStream';
import { useAuth } from '../../hooks/useAuth';
import './HighTechDashboardPage.css';

// Generate mock appointments with realistic real estate data
const generateMockAppointments = (): CalendarAppointment[] => {
  const now = new Date();
  return [
    {
      id: 'apt-1',
      time: new Date(now.getTime() + 45 * 60 * 1000), // 45 min from now
      title: 'Property Viewing - Luxury Penthouse',
      location: '42 Harbour View, Auckland CBD',
      property: { id: 'prop-1', address: '42 Harbour View', type: 'Penthouse' },
      type: 'viewing',
      urgency: 'high',
    },
    {
      id: 'apt-2',
      time: new Date(now.getTime() + 3 * 60 * 60 * 1000), // 3 hours from now
      title: 'Client Meeting - Sarah Chen',
      location: 'Zena HQ, Level 12',
      type: 'meeting',
      urgency: 'medium',
    },
    {
      id: 'apt-3',
      time: new Date(now.getTime() + 5 * 60 * 60 * 1000), // 5 hours from now
      title: 'Open Home - Remuera Estate',
      location: '88 Victoria Ave, Remuera',
      property: { id: 'prop-2', address: '88 Victoria Ave', type: 'Estate' },
      type: 'viewing',
      urgency: 'low',
    },
    {
      id: 'apt-4',
      time: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      title: 'Vendor Call - Price Review',
      type: 'call',
      urgency: 'medium',
    },
  ];
};

// Generate mock activity with realistic real estate events
const generateMockActivities = (): ActivityItem[] => {
  const now = new Date();
  return [
    {
      id: 'act-1',
      type: 'email',
      description: 'New inquiry from James Wilson about 42 Harbour View penthouse',
      timestamp: new Date(now.getTime() - 12 * 60 * 1000), // 12 min ago
      propertyAddress: '42 Harbour View',
      contactName: 'James Wilson',
      relatedType: 'thread',
      relatedId: 'thread-1',
    },
    {
      id: 'act-2',
      type: 'deal_update',
      description: 'Offer accepted! $2.4M for 88 Victoria Ave - Awaiting conditions',
      timestamp: new Date(now.getTime() - 45 * 60 * 1000), // 45 min ago
      dealName: 'Victoria Ave Sale',
      propertyAddress: '88 Victoria Ave',
      relatedType: 'deal',
      relatedId: 'deal-1',
    },
    {
      id: 'act-3',
      type: 'voice_note',
      description: 'Voice note transcribed: "Follow up with Chen family about..."',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      contactName: 'Chen Family',
      relatedType: 'contact',
      relatedId: 'contact-1',
    },
    {
      id: 'act-4',
      type: 'appointment',
      description: 'Viewing confirmed: Sarah Chen for Ponsonby townhouse tomorrow 2pm',
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
      contactName: 'Sarah Chen',
      propertyAddress: '15 Ponsonby Rd',
      relatedType: 'appointment',
      relatedId: 'apt-5',
    },
    {
      id: 'act-5',
      type: 'property_update',
      description: 'Price reduced: 23 Mission Bay Rd now listed at $1.85M (-$100K)',
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
      propertyAddress: '23 Mission Bay Rd',
      relatedType: 'property',
      relatedId: 'prop-3',
    },
  ];
};

export const HighTechDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Dashboard data state
  const [focusThreadsCount] = useState(3);
  const [waitingThreadsCount] = useState(7);
  const [atRiskDealsCount] = useState(2);
  const [activeTasksCount] = useState(4);

  // Mock data for appointments and activities
  const [appointments] = useState<CalendarAppointment[]>(generateMockAppointments);
  const [activities] = useState<ActivityItem[]>(generateMockActivities);

  // Priority alerts
  const [alerts, setAlerts] = useState<PriorityAlert[]>([
    {
      id: 'alert-1',
      priority: 'urgent',
      title: 'At-Risk Deal: 123 Main St',
      message: 'No response in 5 days. Client may be losing interest.',
      actions: [
        { id: 'view', label: 'View Deal', primary: true },
        { id: 'dismiss', label: 'Dismiss' },
      ],
      timestamp: new Date(),
    },
    {
      id: 'alert-2',
      priority: 'warning',
      title: 'Follow-up Required',
      message: '3 threads need your response today.',
      actions: [
        { id: 'view-focus', label: 'View Focus', primary: true },
      ],
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
    },
  ]);

  // Get user's first name for greeting
  const userName = user?.name?.split(' ')[0] || 'there';

  // Handle Zena orb click
  const handleZenaClick = useCallback(() => {
    navigate('/ask-zena');
  }, [navigate]);

  // Handle metric orb click
  const handleMetricClick = useCallback((metricId: string) => {
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
  }, [navigate]);

  // Handle alert action
  const handleAlertAction = useCallback((alertId: string, actionId: string) => {
    if (actionId === 'dismiss') {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      return;
    }

    // Navigate based on action
    if (actionId === 'view') {
      navigate('/deals/123');
    } else if (actionId === 'view-focus') {
      navigate('/new');
    }
  }, [navigate]);

  // Handle quick action
  const handleQuickAction = useCallback((actionId: string) => {
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
  }, [navigate]);

  // Handle appointment click
  const handleAppointmentClick = useCallback((appointment: CalendarAppointment) => {
    if (appointment.property?.id) {
      navigate(`/properties/${appointment.property.id}`);
    } else {
      navigate('/calendar');
    }
  }, [navigate]);

  // Handle activity click
  const handleActivityClick = useCallback((activity: ActivityItem) => {
    if (activity.relatedId && activity.relatedType) {
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
          navigate('/calendar');
          break;
      }
    }
  }, [navigate]);

  return (
    <div className="high-tech-dashboard-page" data-theme="high-tech">
      <HighTechDashboard
        userName={userName}
        focusThreadsCount={focusThreadsCount}
        waitingThreadsCount={waitingThreadsCount}
        atRiskDealsCount={atRiskDealsCount}
        activeTasksCount={activeTasksCount}
        alerts={alerts}
        appointments={appointments}
        recentActivities={activities}
        aiState="idle"
        onZenaClick={handleZenaClick}
        onMetricClick={handleMetricClick}
        onAlertAction={handleAlertAction}
        onQuickAction={handleQuickAction}
        onAppointmentClick={handleAppointmentClick}
        onActivityClick={handleActivityClick}
      />
    </div>
  );
};

export default HighTechDashboardPage;
