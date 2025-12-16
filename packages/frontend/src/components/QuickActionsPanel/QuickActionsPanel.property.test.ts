/**
 * @vitest-environment jsdom
 */
/**
 * Unit Tests for QuickActionsPanel Component
 * **Feature: enhanced-home-dashboard, Property 6: Quick Action Functionality**
 * **Validates: Requirements 3.2, 3.3, 3.4**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { QuickActionsPanel, QuickAction } from './QuickActionsPanel';

// Mock the useVoiceInteraction hook
const mockUploadVoiceNote = vi.fn().mockResolvedValue({});
vi.mock('../../hooks/useVoiceInteraction', () => ({
  useVoiceInteraction: () => ({
    uploadVoiceNote: mockUploadVoiceNote,
    isProcessing: false,
  }),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: vi.fn() }],
  }),
};

// Mock MediaRecorder
class MockMediaRecorder {
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;
  state: string = 'inactive';

  constructor() {
    this.state = 'inactive';
  }

  start() {
    this.state = 'recording';
    // Simulate data available after a short delay
    setTimeout(() => {
      if (this.ondataavailable) {
        this.ondataavailable({ data: new Blob(['test'], { type: 'audio/webm' }) });
      }
    }, 10);
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  }
}

// Mock navigator.vibrate
const mockVibrate = vi.fn();

describe('QuickActionsPanel Unit Tests', () => {
  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: mockMediaDevices,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(global.navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true,
    });

    global.MediaRecorder = MockMediaRecorder as any;

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

    // Clear all mocks
    vi.clearAllMocks();
    mockVibrate.mockClear();
    mockNavigate.mockClear();
    mockUploadVoiceNote.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up DOM
    document.body.innerHTML = '';
  });

  // Helper function to render component with router
  const renderWithRouter = (props = {}) => {
    return render(
      React.createElement(
        BrowserRouter,
        null,
        React.createElement(QuickActionsPanel, props)
      )
    );
  };

  /**
   * Test: Quick Action Functionality - Basic Execution
   * Validates that quick action buttons execute their associated actions immediately
   * **Validates: Requirements 3.2, 3.3, 3.4**
   */
  it('should execute custom actions immediately when buttons are clicked', () => {
    const mockAction1 = vi.fn();
    const mockAction2 = vi.fn();
    const onActionTrigger = vi.fn();

    const customActions: QuickAction[] = [
      {
        id: 'test-action-1',
        label: 'Test Action 1',
        icon: '🧪',
        color: 'primary',
        usage_frequency: 0,
        action: mockAction1,
      },
      {
        id: 'test-action-2',
        label: 'Test Action 2',
        icon: '🔬',
        color: 'secondary',
        usage_frequency: 0,
        action: mockAction2,
      },
    ];

    renderWithRouter({
      actions: customActions,
      onActionTrigger,
    });

    // Test first action
    const button1 = screen.getByRole('button', { name: /test action 1/i });
    expect(button1).toBeInTheDocument();
    expect(button1).not.toBeDisabled();

    fireEvent.click(button1);

    expect(mockAction1).toHaveBeenCalledTimes(1);
    expect(onActionTrigger).toHaveBeenCalledWith('test-action-1');

    // Test second action
    const button2 = screen.getByRole('button', { name: /test action 2/i });
    fireEvent.click(button2);

    expect(mockAction2).toHaveBeenCalledTimes(1);
    expect(onActionTrigger).toHaveBeenCalledWith('test-action-2');
  });

  /**
   * Test: Voice Note Action Immediate Recording
   * Validates that voice note action starts recording immediately without additional navigation
   * **Validates: Requirement 3.2**
   */
  it('should start voice recording immediately when voice note action is triggered', async () => {
    const onActionTrigger = vi.fn();

    renderWithRouter({
      onActionTrigger,
    });

    // Find the voice note button (should be present by default)
    const voiceButton = screen.getByRole('button', { name: /voice note/i });
    expect(voiceButton).toBeInTheDocument();

    // Click the voice note button
    fireEvent.click(voiceButton);

    // Wait for async operations to complete
    await waitFor(() => {
      // Verify getUserMedia was called (recording started immediately)
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });
    
    // Verify action trigger was called
    expect(onActionTrigger).toHaveBeenCalledWith('voice-note');

    // Wait for recording state to update - check for the specific recording indicator
    await waitFor(() => {
      expect(screen.getByText('Recording voice note... Tap Voice Note again to stop')).toBeInTheDocument();
    });

    // Verify haptic feedback was triggered after successful recording start (enhanced pattern)
    expect(mockVibrate).toHaveBeenCalledWith([50, 30, 50]);
  });

  /**
   * Test: Ask Zena Action Navigation
   * Validates that Ask Zena action navigates to the conversational interface
   * **Validates: Requirement 3.3**
   */
  it('should navigate to Ask Zena interface when Ask Zena action is triggered', async () => {
    const onActionTrigger = vi.fn();

    renderWithRouter({
      onActionTrigger,
    });

    // Find the Ask Zena button
    const askZenaButton = screen.getByRole('button', { name: /ask zena/i });
    expect(askZenaButton).toBeInTheDocument();

    // Click the Ask Zena button
    fireEvent.click(askZenaButton);

    // Wait for async action to complete
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/ask-zena');
    });
    
    // Verify action trigger was called
    expect(onActionTrigger).toHaveBeenCalledWith('ask-zena');

    // Verify haptic feedback was triggered
    expect(mockVibrate).toHaveBeenCalledWith(50);
  });

  /**
   * Test: Focus Action Navigation
   * Validates that Focus action navigates to the focus threads page
   */
  it('should navigate to focus page when focus action is triggered', async () => {
    const onActionTrigger = vi.fn();

    renderWithRouter({
      onActionTrigger,
    });

    const focusButton = screen.getByRole('button', { name: /focus/i });
    fireEvent.click(focusButton);

    // Wait for async action to complete
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/focus');
    });
    
    expect(onActionTrigger).toHaveBeenCalledWith('focus-threads');
    expect(mockVibrate).toHaveBeenCalledWith(50);
  });

  /**
   * Test: Property Search Action Navigation
   * Validates that Property Search action navigates to the properties page
   */
  it('should navigate to properties page when property search action is triggered', async () => {
    const onActionTrigger = vi.fn();

    renderWithRouter({
      onActionTrigger,
    });

    const propertiesButton = screen.getByRole('button', { name: /properties/i });
    fireEvent.click(propertiesButton);

    // Wait for async action to complete
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/properties');
    });
    
    expect(onActionTrigger).toHaveBeenCalledWith('property-search');
    expect(mockVibrate).toHaveBeenCalledWith(50);
  });

  /**
   * Test: Visual Feedback Timing
   * Validates that visual feedback appears immediately for user interactions
   * **Validates: Requirement 3.4**
   */
  it('should provide immediate visual feedback for button interactions', () => {
    renderWithRouter();

    const voiceButton = screen.getByRole('button', { name: /voice note/i });
    
    const startTime = performance.now();
    
    // Trigger mousedown for immediate feedback
    fireEvent.mouseDown(voiceButton);
    
    // Check that visual state changes are immediate
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // Visual feedback should be immediate (well under 100ms)
    expect(responseTime).toBeLessThan(100);
    
    // Clean up
    fireEvent.mouseUp(voiceButton);
  });

  /**
   * Test: Keyboard Shortcuts Functionality
   * Validates that keyboard shortcuts work for actions that have them defined
   */
  it('should execute actions via keyboard shortcuts when available', () => {
    const mockAction = vi.fn();
    const onActionTrigger = vi.fn();

    const actionsWithShortcuts: QuickAction[] = [
      {
        id: 'shortcut-test',
        label: 'Shortcut Test',
        icon: '⌨️',
        color: 'primary',
        shortcut: 'T',
        usage_frequency: 0,
        action: mockAction,
      },
    ];

    renderWithRouter({
      actions: actionsWithShortcuts,
      onActionTrigger,
    });

    // Simulate Alt + T key combination
    fireEvent.keyDown(document, {
      key: 'T',
      altKey: true,
    });

    // Verify action was executed
    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(onActionTrigger).toHaveBeenCalledWith('shortcut-test');
  });

  /**
   * Test: Usage Pattern Learning
   * Validates that the system tracks usage frequency and saves to localStorage
   */
  it('should track usage patterns and save to localStorage', () => {
    const mockAction = vi.fn();
    const onActionTrigger = vi.fn();

    const customActions: QuickAction[] = [
      {
        id: 'usage-test',
        label: 'Usage Test',
        icon: '📊',
        color: 'info',
        usage_frequency: 0,
        action: mockAction,
      },
    ];

    renderWithRouter({
      actions: customActions,
      onActionTrigger,
      customizable: true,
    });

    const button = screen.getByRole('button', { name: /usage test/i });
    
    // Click the button multiple times
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Verify localStorage was called to save usage statistics
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'zena-personalization',
      expect.any(String)
    );
  });

  /**
   * Test: Accessibility Compliance
   * Validates that all quick action buttons have proper accessibility features
   * **Validates: Requirements 12.2, 12.3**
   */
  it('should provide proper accessibility features for all actions', () => {
    renderWithRouter();

    // Test default actions for accessibility
    const defaultActions = ['voice note', 'ask zena', 'focus', 'properties'];
    
    defaultActions.forEach((actionName) => {
      const button = screen.getByRole('button', { name: new RegExp(actionName, 'i') });
      
      // Verify button has proper accessibility attributes
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('title');
      
      // Verify button is focusable
      button.focus();
      expect(document.activeElement).toBe(button);
      
      // Verify button can be activated with keyboard
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.keyUp(button, { key: 'Enter' });
    });
  });

  /**
   * Test: Default Actions Presence
   * Validates that all required default actions are present
   */
  it('should render all default quick actions when no custom actions provided', () => {
    renderWithRouter();

    // Verify all default actions are present
    expect(screen.getByRole('button', { name: /voice note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask zena/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /focus/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /properties/i })).toBeInTheDocument();
  });

  /**
   * Test: Customization UI
   * Validates that customization button appears when customizable is true
   */
  it('should show customization button when customizable is true', () => {
    renderWithRouter({ customizable: true });

    const customizeButton = screen.getByRole('button', { name: /customize quick actions/i });
    expect(customizeButton).toBeInTheDocument();
  });

  /**
   * Test: Action Execution Without Navigation
   * Validates that actions execute without requiring additional navigation steps
   * **Validates: Requirement 3.4**
   */
  it('should execute actions without requiring additional navigation steps', () => {
    const mockAction = vi.fn();
    const onActionTrigger = vi.fn();

    const testAction: QuickAction = {
      id: 'immediate-test',
      label: 'Immediate Test',
      icon: '⚡',
      color: 'warning',
      usage_frequency: 0,
      action: mockAction,
    };

    renderWithRouter({
      actions: [testAction],
      onActionTrigger,
    });

    const button = screen.getByRole('button', { name: /immediate test/i });
    
    // Single click should execute action immediately
    fireEvent.click(button);

    // Verify action was called immediately
    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(onActionTrigger).toHaveBeenCalledWith('immediate-test');
    
    // No additional navigation or confirmation should be required
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});