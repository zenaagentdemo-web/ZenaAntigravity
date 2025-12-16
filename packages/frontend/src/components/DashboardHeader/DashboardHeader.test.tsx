/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardHeader } from './DashboardHeader';
import { ThemeContext } from '../../hooks/useTheme';
import { vi } from 'vitest';
import { vi } from 'vitest';

// Mock theme context
const mockThemeContext = {
  theme: 'day' as const,
  effectiveTheme: 'day' as const,
  setTheme: vi.fn(),
  toggleTheme: vi.fn(),
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeContext.Provider value={mockThemeContext}>
        {component}
      </ThemeContext.Provider>
    </BrowserRouter>
  );
};

describe('DashboardHeader', () => {
  it('renders the professional header with branding', () => {
    renderWithRouter(<DashboardHeader />);
    
    // Check for main header elements
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByLabelText('Zena AI - Go to home')).toBeInTheDocument();
    expect(screen.getByText('Zena AI')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithRouter(<DashboardHeader />);
    
    // Check for navigation
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('Ask Zena')).toBeInTheDocument();
  });

  it('renders user profile section', () => {
    renderWithRouter(<DashboardHeader agentName="Test Agent" />);
    
    // Check for profile elements
    expect(screen.getByLabelText('User menu for Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('TA')).toBeInTheDocument(); // Avatar initials
  });

  it('renders action buttons and weather widget', () => {
    renderWithRouter(<DashboardHeader />);
    
    // Check for action buttons
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    expect(screen.getByLabelText('Switch to night mode. Currently using day mode.')).toBeInTheDocument();
    
    // Check for weather widget (may not be visible on mobile)
    const weatherWidget = document.querySelector('.dashboard-header__weather');
    expect(weatherWidget).toBeInTheDocument();
  });

  it('displays notification count when provided', () => {
    renderWithRouter(<DashboardHeader notificationCount={5} />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByLabelText('Notifications (5 unread)')).toBeInTheDocument();
  });

  it('renders mobile menu toggle', () => {
    renderWithRouter(<DashboardHeader />);
    
    expect(screen.getByLabelText('Toggle mobile menu')).toBeInTheDocument();
  });
});