/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../ThemeProvider/ThemeProvider';
import { EnhancedHomeDashboard } from '../../pages/EnhancedHomeDashboard/EnhancedHomeDashboard';
import React from 'react';

describe('EnhancedHomeDashboard', () => {
  it('renders the enhanced dashboard with all main sections', () => {
    render(
      <BrowserRouter>
        <ThemeProvider>
          <EnhancedHomeDashboard />
        </ThemeProvider>
      </BrowserRouter>
    );

    // Check for main dashboard elements - the greeting changes based on time
    expect(screen.getByText(/good (morning|afternoon|evening)/i)).toBeInTheDocument();
    expect(screen.getByText(/today's overview/i)).toBeInTheDocument();
    expect(screen.getByText(/quick actions/i)).toBeInTheDocument();
    expect(screen.getByText(/business insights/i)).toBeInTheDocument();
    expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    
    // Check for theme toggle
    expect(screen.getByRole('button', { name: /switch to/i })).toBeInTheDocument();
    
    // Check for quick action buttons (use more specific selectors)
    expect(screen.getByRole('button', { name: /voice note.*keyboard shortcut.*alt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask zena/i })).toBeInTheDocument();
  });
});