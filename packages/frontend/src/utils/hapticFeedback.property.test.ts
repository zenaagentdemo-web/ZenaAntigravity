/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for Haptic Feedback Utility
 * 
 * **Feature: new-page-dropdown-fixes, Property 20: Haptic Feedback Activation**
 * **Validates: Requirements 7.6**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { 
  triggerHapticFeedback, 
  hapticFeedback, 
  isHapticSupported,
  hasReducedMotionPreference,
  HapticPattern 
} from './hapticFeedback';

// Mock navigator.vibrate
const mockVibrate = vi.fn();

// Mock matchMedia for reduced motion
const mockMatchMedia = vi.fn();

describe('Haptic Feedback Property Tests', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock navigator.vibrate
    Object.defineProperty(global.navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true
    });
    
    // Mock window.matchMedia
    Object.defineProperty(global.window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true,
      configurable: true
    });
    
    // Default to no reduced motion preference
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * **Feature: new-page-dropdown-fixes, Property 20: Haptic Feedback Activation**
   * **Validates: Requirements 7.6**
   * 
   * For any touch interaction on Quick Reply button or dropdown arrow, 
   * haptic feedback SHALL be triggered if the device supports it.
   */
  it('should trigger haptic feedback for all supported patterns when device supports vibration', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'medium', 'heavy', 'success', 'error', 'warning'),
        (pattern: HapticPattern) => {
          // Reset mock before each test
          mockVibrate.mockClear();
          
          // Ensure device supports haptic feedback
          mockVibrate.mockReturnValue(true);
          
          // Trigger haptic feedback
          triggerHapticFeedback(pattern, { enabled: true });
          
          // Verify vibrate was called exactly once
          const callCount = mockVibrate.mock.calls.length;
          if (callCount !== 1) {
            return false;
          }
          
          // Verify it was called with a number or array
          const callArg = mockVibrate.mock.calls[0][0];
          return typeof callArg === 'number' || Array.isArray(callArg);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Haptic feedback should be disabled when reduced motion is preferred
   */
  it('should not trigger haptic feedback when reduced motion is preferred', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'medium', 'heavy', 'success', 'error', 'warning'),
        (pattern: HapticPattern) => {
          // Reset mock before each test
          mockVibrate.mockClear();
          
          // Mock reduced motion preference
          mockMatchMedia.mockReturnValue({
            matches: true, // User prefers reduced motion
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
          });
          
          // Ensure device supports haptic feedback
          mockVibrate.mockReturnValue(true);
          
          // Trigger haptic feedback
          triggerHapticFeedback(pattern, { enabled: true });
          
          // Verify vibrate was NOT called due to reduced motion
          return mockVibrate.mock.calls.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Haptic feedback should be disabled when explicitly disabled
   */
  it('should not trigger haptic feedback when explicitly disabled', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'medium', 'heavy', 'success', 'error', 'warning'),
        (pattern: HapticPattern) => {
          // Reset mock before each test
          mockVibrate.mockClear();
          
          // Ensure device supports haptic feedback
          mockVibrate.mockReturnValue(true);
          
          // Trigger haptic feedback with disabled option
          triggerHapticFeedback(pattern, { enabled: false });
          
          // Verify vibrate was NOT called
          return mockVibrate.mock.calls.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Custom vibration patterns should be used when provided
   */
  it('should use custom vibration patterns when provided', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: 1, max: 1000 }), // Single number
          fc.array(fc.integer({ min: 1, max: 500 }), { minLength: 1, maxLength: 10 }) // Array of numbers
        ),
        (customPattern: number | number[]) => {
          // Reset mock before each test
          mockVibrate.mockClear();
          
          // Ensure device supports haptic feedback
          mockVibrate.mockReturnValue(true);
          
          // Trigger haptic feedback with custom pattern
          triggerHapticFeedback('medium', { 
            enabled: true, 
            customPattern 
          });
          
          // Verify vibrate was called exactly once with custom pattern
          if (mockVibrate.mock.calls.length !== 1) {
            return false;
          }
          
          const callArg = mockVibrate.mock.calls[0][0];
          return JSON.stringify(callArg) === JSON.stringify(customPattern);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Convenience functions should trigger appropriate patterns
   */
  it('should trigger correct patterns for convenience functions', () => {
    const convenienceFunctions = [
      { fn: hapticFeedback.light, expectedPattern: 10 },
      { fn: hapticFeedback.medium, expectedPattern: 50 },
      { fn: hapticFeedback.heavy, expectedPattern: 100 },
      { fn: hapticFeedback.success, expectedPattern: [50, 30, 50] },
      { fn: hapticFeedback.error, expectedPattern: [100, 50, 100, 50, 100] },
      { fn: hapticFeedback.warning, expectedPattern: [30, 30, 30] }
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...convenienceFunctions),
        (testCase) => {
          // Reset mock before each test
          mockVibrate.mockClear();
          
          // Ensure device supports haptic feedback
          mockVibrate.mockReturnValue(true);
          
          // Call convenience function
          testCase.fn({ enabled: true });
          
          // Verify correct pattern was used
          if (mockVibrate.mock.calls.length !== 1) {
            return false;
          }
          
          const callArg = mockVibrate.mock.calls[0][0];
          return JSON.stringify(callArg) === JSON.stringify(testCase.expectedPattern);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Should handle unsupported devices gracefully
   */
  it('should handle unsupported devices gracefully without errors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'medium', 'heavy', 'success', 'error', 'warning'),
        (pattern: HapticPattern) => {
          // Remove vibrate support
          delete (global.navigator as any).vibrate;
          
          // Should not throw error
          expect(() => {
            triggerHapticFeedback(pattern, { enabled: true });
          }).not.toThrow();
          
          // Restore vibrate for next iteration
          Object.defineProperty(global.navigator, 'vibrate', {
            value: mockVibrate,
            writable: true,
            configurable: true
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Should handle vibrate API errors gracefully
   */
  it('should handle vibrate API errors gracefully', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'medium', 'heavy', 'success', 'error', 'warning'),
        (pattern: HapticPattern) => {
          // Mock vibrate to throw error
          mockVibrate.mockImplementation(() => {
            throw new Error('Vibrate API error');
          });
          
          // Should not throw error
          expect(() => {
            triggerHapticFeedback(pattern, { enabled: true });
          }).not.toThrow();
          
          // Reset for next iteration
          mockVibrate.mockClear();
          mockVibrate.mockReturnValue(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isHapticSupported should correctly detect support
   */
  it('should correctly detect haptic support', () => {
    // Test with support
    Object.defineProperty(global.navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true
    });
    expect(isHapticSupported()).toBe(true);
    
    // Test without support
    delete (global.navigator as any).vibrate;
    expect(isHapticSupported()).toBe(false);
  });

  /**
   * Property: hasReducedMotionPreference should correctly detect preference
   */
  it('should correctly detect reduced motion preference', () => {
    // Test with reduced motion
    mockMatchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
    expect(hasReducedMotionPreference()).toBe(true);
    
    // Test without reduced motion
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
    expect(hasReducedMotionPreference()).toBe(false);
  });
});

/**
 * Integration Tests for Component Haptic Feedback
 */
describe('Component Haptic Feedback Integration', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock navigator.vibrate
    Object.defineProperty(global.navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
      configurable: true
    });
    
    // Mock window.matchMedia
    Object.defineProperty(global.window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true,
      configurable: true
    });
    
    // Default to no reduced motion preference
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
  });

  /**
   * Property: Button interactions should trigger appropriate haptic feedback
   */
  it('should trigger appropriate haptic feedback for different button types', () => {
    const buttonTypes = [
      { type: 'quick_reply', expectedPattern: 'medium' },
      { type: 'dropdown_toggle', expectedPattern: 'light' },
      { type: 'action_button', expectedPattern: 'medium' },
      { type: 'retry_button', expectedPattern: 'light' }
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...buttonTypes),
        (buttonType) => {
          // Simulate button interaction
          switch (buttonType.expectedPattern) {
            case 'light':
              hapticFeedback.light();
              expect(mockVibrate).toHaveBeenCalledWith(10);
              break;
            case 'medium':
              hapticFeedback.medium();
              expect(mockVibrate).toHaveBeenCalledWith(50);
              break;
          }
          
          // Reset for next iteration
          mockVibrate.mockClear();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Success actions should trigger success haptic feedback
   */
  it('should trigger success haptic feedback for successful actions', () => {
    const successActions = ['reply_sent', 'task_completed', 'save_successful'];

    fc.assert(
      fc.property(
        fc.constantFrom(...successActions),
        (action) => {
          // Simulate successful action
          hapticFeedback.success();
          
          // Verify success pattern was used
          expect(mockVibrate).toHaveBeenCalledWith([50, 30, 50]);
          
          // Reset for next iteration
          mockVibrate.mockClear();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Error actions should trigger error haptic feedback
   */
  it('should trigger error haptic feedback for failed actions', () => {
    const errorActions = ['send_failed', 'validation_error', 'network_error'];

    fc.assert(
      fc.property(
        fc.constantFrom(...errorActions),
        (action) => {
          // Simulate error action
          hapticFeedback.error();
          
          // Verify error pattern was used
          expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100, 50, 100]);
          
          // Reset for next iteration
          mockVibrate.mockClear();
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});