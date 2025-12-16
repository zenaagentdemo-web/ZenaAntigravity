import { useEffect, useCallback, useRef } from 'react';

interface KeyboardNavigationOptions {
  enableVoiceCommands?: boolean;
  enableArrowNavigation?: boolean;
  enableTabTrapping?: boolean;
  onVoiceCommand?: (command: string) => void;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions = {}) => {
  const {
    enableVoiceCommands = true,
    enableArrowNavigation = true,
    enableTabTrapping = false,
    onVoiceCommand
  } = options;

  const containerRef = useRef<HTMLElement | null>(null);
  const isKeyboardNavigationRef = useRef(false);

  // Detect keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      isKeyboardNavigationRef.current = true;
      document.body.classList.add('keyboard-navigation');
    }
  }, []);

  const handleMouseDown = useCallback(() => {
    isKeyboardNavigationRef.current = false;
    document.body.classList.remove('keyboard-navigation');
  }, []);

  // Voice command handling
  const handleVoiceCommand = useCallback((command: string) => {
    if (!enableVoiceCommands || !onVoiceCommand) return;

    const normalizedCommand = command.toLowerCase().trim();

    // Map common voice commands to actions
    const commandMap: Record<string, string> = {
      'voice note': 'voice-note',
      'record voice': 'voice-note',
      'start recording': 'voice-note',
      'ask zena': 'ask-zena',
      'open zena': 'ask-zena',
      'chat with zena': 'ask-zena',
      'focus threads': 'focus-threads',
      'show focus': 'focus-threads',
      'urgent threads': 'focus-threads',
      'properties': 'property-search',
      'search properties': 'property-search',
      'find properties': 'property-search',
      'switch theme': 'theme-toggle',
      'toggle theme': 'theme-toggle',
      'dark mode': 'theme-toggle',
      'light mode': 'theme-toggle'
    };

    const mappedCommand = commandMap[normalizedCommand];
    if (mappedCommand) {
      onVoiceCommand(mappedCommand);
    }
  }, [enableVoiceCommands, onVoiceCommand]);

  // Arrow key navigation
  const handleArrowNavigation = useCallback((event: KeyboardEvent) => {
    if (!enableArrowNavigation || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"]'
    );

    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as Element);

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        nextIndex = (currentIndex + 1) % focusableElements.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = focusableElements.length - 1;
        break;
      default:
        return;
    }

    (focusableElements[nextIndex] as HTMLElement)?.focus();
  }, [enableArrowNavigation]);

  // Global keyboard event handler
  const handleGlobalKeyDown = useCallback((event: KeyboardEvent) => {
    // Handle escape key to clear focus
    if (event.key === 'Escape') {
      (document.activeElement as HTMLElement)?.blur();
      return;
    }

    // Handle arrow navigation
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      handleArrowNavigation(event);
      return;
    }

    // Handle keyboard shortcuts
    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      const key = event.key.toLowerCase();
      const shortcutElement = document.querySelector(`[data-shortcut="${key}"]`) as HTMLElement;

      if (shortcutElement) {
        event.preventDefault();
        shortcutElement.click();
        shortcutElement.focus();
      }
    }
  }, [handleArrowNavigation]);

  // Focus trap for modals/dialogs
  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (!enableTabTrapping || !containerRef.current) return;

    if (event.key === 'Tab') {
      const focusableElements = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }, [enableTabTrapping]);

  // Set up event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleGlobalKeyDown);

    if (enableTabTrapping) {
      document.addEventListener('keydown', trapFocus);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleGlobalKeyDown);

      if (enableTabTrapping) {
        document.removeEventListener('keydown', trapFocus);
      }
    };
  }, [handleKeyDown, handleMouseDown, handleGlobalKeyDown, trapFocus, enableTabTrapping]);

  // Voice command setup (if Web Speech API is available)
  useEffect(() => {
    if (!enableVoiceCommands || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let recognition: any;

    try {
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
      }
    } catch (error) {
      console.warn('SpeechRecognition initialization failed:', error);
      return;
    }

    if (!recognition) return;

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const command = event.results[event.results.length - 1][0].transcript;
      handleVoiceCommand(command);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
    };

    // Start voice recognition when Alt+V is pressed
    const handleVoiceActivation = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        try {
          recognition.start();
          document.body.classList.add('voice-control-active');

          // Stop after 3 seconds
          setTimeout(() => {
            recognition.stop();
            document.body.classList.remove('voice-control-active');
          }, 3000);
        } catch (error) {
          console.warn('Could not start voice recognition:', error);
        }
      }
    };

    document.addEventListener('keydown', handleVoiceActivation);

    return () => {
      document.removeEventListener('keydown', handleVoiceActivation);
      recognition.stop();
    };
  }, [enableVoiceCommands, handleVoiceCommand]);

  // Announce dynamic content changes to screen readers
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  // Focus management utilities
  const focusFirstElement = useCallback(() => {
    if (!containerRef.current) return;

    const firstFocusable = containerRef.current.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;

    firstFocusable?.focus();
  }, []);

  const focusLastElement = useCallback(() => {
    if (!containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    lastFocusable?.focus();
  }, []);

  return {
    containerRef,
    isKeyboardNavigation: isKeyboardNavigationRef.current,
    announceToScreenReader,
    focusFirstElement,
    focusLastElement,
    handleVoiceCommand
  };
};