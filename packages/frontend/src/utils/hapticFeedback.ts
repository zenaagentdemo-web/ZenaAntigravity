/**
 * Haptic Feedback Utility
 * 
 * Provides haptic feedback for button interactions and successful actions
 * with graceful fallback on unsupported devices.
 * 
 * Requirements: 7.6
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

export interface HapticFeedbackOptions {
  /** Enable/disable haptic feedback globally */
  enabled?: boolean;
  /** Custom vibration pattern (overrides preset patterns) */
  customPattern?: number | number[];
  /** Fallback to audio feedback if haptic not supported */
  audioFallback?: boolean;
}

/**
 * Predefined haptic patterns for different interaction types
 */
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,           // Quick tap feedback
  medium: 50,          // Button press feedback
  heavy: 100,          // Strong action feedback
  success: [50, 30, 50], // Success pattern
  error: [100, 50, 100, 50, 100], // Error pattern
  warning: [30, 30, 30] // Warning pattern
};

/**
 * Check if haptic feedback is supported by the device
 */
export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
};

/**
 * Check if the user has reduced motion preference
 */
export const hasReducedMotionPreference = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Trigger haptic feedback with the specified pattern
 * 
 * @param pattern - Predefined pattern or custom vibration
 * @param options - Configuration options
 */
export const triggerHapticFeedback = (
  pattern: HapticPattern | number | number[],
  options: HapticFeedbackOptions = {}
): void => {
  const {
    enabled = true,
    customPattern,
    audioFallback = false
  } = options;

  // Early return if disabled or reduced motion preference
  if (!enabled || hasReducedMotionPreference()) {
    return;
  }

  // Use custom pattern if provided, otherwise use preset or direct pattern
  let vibrationPattern: number | number[];
  
  if (customPattern !== undefined) {
    vibrationPattern = customPattern;
  } else if (typeof pattern === 'string') {
    vibrationPattern = HAPTIC_PATTERNS[pattern];
  } else {
    vibrationPattern = pattern;
  }

  // Attempt haptic feedback
  if (isHapticSupported()) {
    try {
      navigator.vibrate(vibrationPattern);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      
      // Fallback to audio if enabled
      if (audioFallback) {
        triggerAudioFallback(pattern);
      }
    }
  } else if (audioFallback) {
    // Device doesn't support haptic, use audio fallback
    triggerAudioFallback(pattern);
  }
};

/**
 * Audio fallback for devices without haptic support
 */
const triggerAudioFallback = (pattern: HapticPattern | number | number[]): void => {
  // Create a short audio beep as fallback
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure audio based on pattern
    if (typeof pattern === 'string') {
      switch (pattern) {
        case 'light':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          break;
        case 'medium':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          break;
        case 'heavy':
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          break;
        case 'success':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          break;
        case 'error':
          oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          break;
        case 'warning':
          oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
          break;
      }
    } else {
      // Default audio for custom patterns
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    }
    
    oscillator.type = 'sine';
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
    
    // Clean up
    setTimeout(() => {
      try {
        audioContext.close();
      } catch (e) {
        // Ignore cleanup errors
      }
    }, 200);
    
  } catch (error) {
    // Audio fallback also failed, silently ignore
    console.warn('Audio fallback failed:', error);
  }
};

/**
 * Convenience functions for common haptic patterns
 */
export const hapticFeedback = {
  /** Light tap feedback for subtle interactions */
  light: (options?: HapticFeedbackOptions) => triggerHapticFeedback('light', options),
  
  /** Medium feedback for button presses */
  medium: (options?: HapticFeedbackOptions) => triggerHapticFeedback('medium', options),
  
  /** Heavy feedback for important actions */
  heavy: (options?: HapticFeedbackOptions) => triggerHapticFeedback('heavy', options),
  
  /** Success feedback for completed actions */
  success: (options?: HapticFeedbackOptions) => triggerHapticFeedback('success', options),
  
  /** Error feedback for failed actions */
  error: (options?: HapticFeedbackOptions) => triggerHapticFeedback('error', options),
  
  /** Warning feedback for cautionary actions */
  warning: (options?: HapticFeedbackOptions) => triggerHapticFeedback('warning', options),
  
  /** Custom pattern feedback */
  custom: (pattern: number | number[], options?: HapticFeedbackOptions) => 
    triggerHapticFeedback(pattern, options)
};

/**
 * Hook for managing haptic feedback preferences
 */
export const useHapticPreferences = () => {
  const isSupported = isHapticSupported();
  const hasReducedMotion = hasReducedMotionPreference();
  
  return {
    isSupported,
    hasReducedMotion,
    isEnabled: isSupported && !hasReducedMotion
  };
};

export default hapticFeedback;