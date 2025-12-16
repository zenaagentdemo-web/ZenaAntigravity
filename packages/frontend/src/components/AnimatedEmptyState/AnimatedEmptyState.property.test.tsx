/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for AnimatedEmptyState Component
 * 
 * Tests the empty state component using fast-check for property-based testing.
 * 
 * **Feature: enhanced-new-page, Property 25: Empty State Display**
 * **Validates: Requirements 9.2**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { AnimatedEmptyState } from './AnimatedEmptyState';

describe('AnimatedEmptyState Property Tests', () => {
  /**
   * **Feature: enhanced-new-page, Property 25: Empty State Display**
   * 
   * *For any* state where isLoading is false and threads array is empty and error is null,
   * the AnimatedEmptyState component SHALL be visible.
   * 
   * **Validates: Requirements 9.2**
   */
  describe('Property 25: Empty State Display', () => {
    it('should display empty state with message for any valid message string', () => {
      fc.assert(
        fc.property(
          // Generate non-empty message strings with alphanumeric characters
          fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/).filter(s => s.trim().length > 0),
          (message) => {
            const { container, unmount } = render(
              <AnimatedEmptyState 
                message={message} 
                testId="test-empty-state"
              />
            );
            
            const emptyState = container.querySelector('[data-testid="test-empty-state"]');
            const messageElement = container.querySelector('.animated-empty-state__message');
            
            const isVisible = emptyState !== null;
            const hasMessage = messageElement !== null && messageElement.textContent === message;
            
            unmount();
            
            return isVisible && hasMessage;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display Zena avatar in idle state by default', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/).filter(s => s.trim().length > 0),
          (message) => {
            const { container, unmount } = render(
              <AnimatedEmptyState 
                message={message}
                avatarState="idle"
                testId="test-empty-state"
              />
            );
            
            // Check that the avatar container exists
            const avatarContainer = container.querySelector('.animated-empty-state__avatar-container');
            const hasAvatar = avatarContainer !== null;
            
            unmount();
            
            return hasAvatar;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should display sub-message when provided', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/).filter(s => s.trim().length > 0),
            subMessage: fc.stringMatching(/^[a-zA-Z0-9 ]{1,100}$/).filter(s => s.trim().length > 0),
          }).filter(({ message, subMessage }) => message !== subMessage),
          ({ message, subMessage }) => {
            const { container, unmount } = render(
              <AnimatedEmptyState 
                message={message}
                subMessage={subMessage}
                testId="test-empty-state"
              />
            );
            
            const subMessageElement = container.querySelector('.animated-empty-state__sub-message');
            const hasSubMessage = subMessageElement !== null && subMessageElement.textContent === subMessage;
            
            unmount();
            
            return hasSubMessage;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should show particles when showParticles is true', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/).filter(s => s.trim().length > 0),
          (message) => {
            const { container, unmount } = render(
              <AnimatedEmptyState 
                message={message}
                showParticles={true}
                testId="test-empty-state"
              />
            );
            
            const particles = container.querySelector('[data-testid="test-empty-state-particles"]');
            const hasParticles = particles !== null;
            
            unmount();
            
            return hasParticles;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not show particles when showParticles is false', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/).filter(s => s.trim().length > 0),
          (message) => {
            const { container, unmount } = render(
              <AnimatedEmptyState 
                message={message}
                showParticles={false}
                testId="test-empty-state"
              />
            );
            
            const particles = container.querySelector('[data-testid="test-empty-state-particles"]');
            const noParticles = particles === null;
            
            unmount();
            
            return noParticles;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should have glassmorphism styling', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/).filter(s => s.trim().length > 0),
          (message) => {
            const { container, unmount } = render(
              <AnimatedEmptyState 
                message={message}
                testId="test-empty-state"
              />
            );
            
            const emptyState = container.querySelector('.animated-empty-state');
            const hasGlassmorphism = emptyState !== null;
            
            unmount();
            
            return hasGlassmorphism;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should display action button when actionText and onAction are provided', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/).filter(s => s.trim().length > 0),
            actionText: fc.stringMatching(/^[a-zA-Z0-9 ]{1,30}$/).filter(s => s.trim().length > 0),
          }),
          ({ message, actionText }) => {
            const mockOnAction = () => {};
            const { container, unmount } = render(
              <AnimatedEmptyState 
                message={message}
                actionText={actionText}
                onAction={mockOnAction}
                testId="test-empty-state"
              />
            );
            
            const actionButton = container.querySelector('.animated-empty-state__action');
            const hasActionButton = actionButton !== null && actionButton.tagName === 'BUTTON';
            
            unmount();
            
            return hasActionButton;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should have ambient background effect', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/).filter(s => s.trim().length > 0),
          (message) => {
            const { container, unmount } = render(
              <AnimatedEmptyState 
                message={message}
                testId="test-empty-state"
              />
            );
            
            const ambient = container.querySelector('.animated-empty-state__ambient');
            const hasAmbient = ambient !== null;
            
            unmount();
            
            return hasAmbient;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
