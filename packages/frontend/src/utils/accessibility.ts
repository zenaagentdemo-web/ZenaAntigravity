/**
 * Accessibility Utilities
 * 
 * Provides utilities for WCAG 2.1 AA compliance including:
 * - ARIA attribute helpers
 * - Focus management
 * - Screen reader announcements
 * - Keyboard navigation utilities
 * - Color contrast validation
 */

// ============================================================================
// ARIA Attribute Helpers
// ============================================================================

export interface AriaLiveRegionOptions {
  priority?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}

/**
 * Creates ARIA live region attributes for dynamic content announcements
 */
export function createAriaLiveRegion(options: AriaLiveRegionOptions = {}) {
  const { priority = 'polite', atomic = true, relevant = 'additions text' } = options;
  
  return {
    'aria-live': priority,
    'aria-atomic': atomic,
    'aria-relevant': relevant,
  };
}

/**
 * Creates ARIA attributes for expandable/collapsible content
 */
export function createAriaExpanded(isExpanded: boolean, controlsId?: string) {
  return {
    'aria-expanded': isExpanded,
    ...(controlsId && { 'aria-controls': controlsId }),
  };
}

/**
 * Creates ARIA attributes for toggle buttons
 */
export function createAriaPressed(isPressed: boolean) {
  return {
    'aria-pressed': isPressed,
  };
}

/**
 * Creates ARIA attributes for loading states
 */
export function createAriaLoading(isLoading: boolean, loadingText = 'Loading...') {
  return {
    'aria-busy': isLoading,
    ...(isLoading && { 'aria-label': loadingText }),
  };
}

/**
 * Creates ARIA attributes for disabled elements
 */
export function createAriaDisabled(isDisabled: boolean) {
  return {
    'aria-disabled': isDisabled,
  };
}

/**
 * Creates ARIA attributes for form validation
 */
export function createAriaValidation(
  isInvalid: boolean,
  errorId?: string,
  describedBy?: string
) {
  return {
    'aria-invalid': isInvalid,
    ...(isInvalid && errorId && { 'aria-errormessage': errorId }),
    ...(describedBy && { 'aria-describedby': describedBy }),
  };
}

/**
 * Creates ARIA attributes for modal dialogs
 */
export function createAriaModal(labelledBy?: string, describedBy?: string) {
  return {
    role: 'dialog',
    'aria-modal': true,
    ...(labelledBy && { 'aria-labelledby': labelledBy }),
    ...(describedBy && { 'aria-describedby': describedBy }),
  };
}

// ============================================================================
// Focus Management
// ============================================================================

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
  'details > summary',
].join(', ');

/**
 * Gets all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Gets the first focusable element within a container
 */
export function getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
}

/**
 * Gets the last focusable element within a container
 */
export function getLastFocusableElement(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[elements.length - 1] || null;
}

/**
 * Traps focus within a container (for modals/dialogs)
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

/**
 * Restores focus to a previously focused element
 */
export function restoreFocus(element: HTMLElement | null): void {
  if (element && typeof element.focus === 'function') {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      element.focus();
    });
  }
}

/**
 * Moves focus to the next/previous focusable element
 */
export function moveFocus(
  container: HTMLElement,
  direction: 'next' | 'previous'
): void {
  const focusableElements = getFocusableElements(container);
  const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

  if (currentIndex === -1) {
    focusableElements[0]?.focus();
    return;
  }

  let nextIndex: number;
  if (direction === 'next') {
    nextIndex = (currentIndex + 1) % focusableElements.length;
  } else {
    nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
  }

  focusableElements[nextIndex]?.focus();
}

// ============================================================================
// Screen Reader Announcements
// ============================================================================

let announcementContainer: HTMLElement | null = null;

/**
 * Creates or gets the announcement container for screen readers
 */
function getAnnouncementContainer(): HTMLElement {
  if (announcementContainer && document.body.contains(announcementContainer)) {
    return announcementContainer;
  }

  announcementContainer = document.createElement('div');
  announcementContainer.id = 'sr-announcements';
  announcementContainer.setAttribute('aria-live', 'polite');
  announcementContainer.setAttribute('aria-atomic', 'true');
  announcementContainer.className = 'sr-only';
  announcementContainer.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  document.body.appendChild(announcementContainer);

  return announcementContainer;
}

/**
 * Announces a message to screen readers
 */
export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const container = getAnnouncementContainer();
  container.setAttribute('aria-live', priority);
  
  // Clear and set message to trigger announcement
  container.textContent = '';
  
  // Use setTimeout to ensure the DOM update triggers the announcement
  setTimeout(() => {
    container.textContent = message;
  }, 100);
}

/**
 * Announces a loading state
 */
export function announceLoading(isLoading: boolean, context = ''): void {
  if (isLoading) {
    announce(`Loading ${context}`.trim(), 'polite');
  } else {
    announce(`${context} loaded`.trim(), 'polite');
  }
}

/**
 * Announces an error
 */
export function announceError(errorMessage: string): void {
  announce(`Error: ${errorMessage}`, 'assertive');
}

/**
 * Announces a success message
 */
export function announceSuccess(message: string): void {
  announce(message, 'polite');
}

// ============================================================================
// Color Contrast Utilities
// ============================================================================

interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Parses a hex color to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculates relative luminance of a color
 */
export function calculateLuminance(color: RGB): number {
  const { r, g, b } = color;
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two colors
 */
export function calculateContrastRatio(color1: RGB, color2: RGB): number {
  const lum1 = calculateLuminance(color1);
  const lum2 = calculateLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Checks if a color combination meets WCAG AA standards
 */
export function meetsWCAGAA(
  foreground: RGB,
  background: RGB,
  isLargeText = false
): boolean {
  const ratio = calculateContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Checks if a color combination meets WCAG AAA standards
 */
export function meetsWCAGAAA(
  foreground: RGB,
  background: RGB,
  isLargeText = false
): boolean {
  const ratio = calculateContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

// ============================================================================
// Keyboard Navigation Utilities
// ============================================================================

export type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
};

/**
 * Checks if a keyboard event matches a shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    !!event.ctrlKey === !!shortcut.ctrl &&
    !!event.altKey === !!shortcut.alt &&
    !!event.shiftKey === !!shortcut.shift &&
    !!event.metaKey === !!shortcut.meta
  );
}

/**
 * Creates a keyboard shortcut handler
 */
export function createShortcutHandler(
  shortcuts: Map<string, () => void>
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const modifiers = [
      event.ctrlKey && 'ctrl',
      event.altKey && 'alt',
      event.shiftKey && 'shift',
      event.metaKey && 'meta',
    ]
      .filter(Boolean)
      .join('+');

    const shortcutKey = modifiers ? `${modifiers}+${key}` : key;
    const handler = shortcuts.get(shortcutKey);

    if (handler) {
      event.preventDefault();
      handler();
    }
  };
}

// ============================================================================
// Skip Link Utilities
// ============================================================================

/**
 * Creates a skip link for keyboard navigation
 */
export function createSkipLink(targetId: string, text = 'Skip to main content'): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.className = 'skip-link';
  link.textContent = text;
  return link;
}

// ============================================================================
// Reduced Motion Utilities
// ============================================================================

/**
 * Checks if the user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Gets animation duration based on user preference
 */
export function getAnimationDuration(defaultDuration: number): number {
  return prefersReducedMotion() ? 0 : defaultDuration;
}

// ============================================================================
// High Contrast Mode Utilities
// ============================================================================

/**
 * Checks if the user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
}

// ============================================================================
// Touch Target Utilities
// ============================================================================

/**
 * Minimum touch target size in pixels (WCAG 2.1 AA)
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Checks if an element meets minimum touch target requirements
 */
export function meetsTouchTargetSize(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= MIN_TOUCH_TARGET_SIZE && rect.height >= MIN_TOUCH_TARGET_SIZE;
}
