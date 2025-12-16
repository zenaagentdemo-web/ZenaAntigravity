import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityNotificationsPanel, Notification } from './PriorityNotificationsPanel';

describe('PriorityNotificationsPanel', () => {
  const mockOnDismiss = vi.fn();
  const mockOnAction = vi.fn();

  const sampleNotifications: Notification[] = [
    {
      id: '1',
      type: 'urgent',
      title: 'Critical Issue',
      message: 'This requires immediate attention',
      actionable: true,
      actions: [
        { label: 'Resolve', action: 'resolve', primary: true },
        { label: 'View Details', action: 'view', primary: false }
      ],
      timestamp: new Date(),
      dismissed: false,
      priority: 10
    },
    {
      id: '2',
      type: 'warning',
      title: 'Warning Notice',
      message: 'Please review this item',
      actionable: true,
      actions: [
        { label: 'Review', action: 'review', primary: true }
      ],
      timestamp: new Date(),
      dismissed: false,
      priority: 5
    }
  ];

  it('renders notifications with modern card design', () => {
    render(
      <PriorityNotificationsPanel
        notifications={sampleNotifications}
        onDismiss={mockOnDismiss}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('Priority Notifications')).toBeInTheDocument();
    expect(screen.getByText('Critical Issue')).toBeInTheDocument();
    expect(screen.getByText('Warning Notice')).toBeInTheDocument();
  });

  it('displays proper icons for different notification types', () => {
    render(
      <PriorityNotificationsPanel
        notifications={sampleNotifications}
        onDismiss={mockOnDismiss}
        onAction={mockOnAction}
      />
    );

    // Check for emoji icons
    expect(screen.getByText('🚨')).toBeInTheDocument(); // urgent
    expect(screen.getByText('⚠️')).toBeInTheDocument(); // warning
  });

  it('shows urgency badge for urgent notifications', () => {
    render(
      <PriorityNotificationsPanel
        notifications={sampleNotifications}
        onDismiss={mockOnDismiss}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('URGENT')).toBeInTheDocument();
  });

  it('renders action buttons with proper styling', () => {
    render(
      <PriorityNotificationsPanel
        notifications={sampleNotifications}
        onDismiss={mockOnDismiss}
        onAction={mockOnAction}
      />
    );

    expect(screen.getByText('Resolve')).toBeInTheDocument();
    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('does not render when no notifications are present', () => {
    const { container } = render(
      <PriorityNotificationsPanel
        notifications={[]}
        onDismiss={mockOnDismiss}
        onAction={mockOnAction}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('filters out dismissed notifications', () => {
    const notificationsWithDismissed = [
      ...sampleNotifications,
      {
        id: '3',
        type: 'info' as const,
        title: 'Dismissed Notification',
        message: 'This should not appear',
        actionable: false,
        timestamp: new Date(),
        dismissed: true,
        priority: 3
      }
    ];

    render(
      <PriorityNotificationsPanel
        notifications={notificationsWithDismissed}
        onDismiss={mockOnDismiss}
        onAction={mockOnAction}
      />
    );

    expect(screen.queryByText('Dismissed Notification')).not.toBeInTheDocument();
    expect(screen.getByText('Critical Issue')).toBeInTheDocument();
    expect(screen.getByText('Warning Notice')).toBeInTheDocument();
  });
});