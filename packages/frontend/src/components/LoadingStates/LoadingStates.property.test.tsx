/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { LoadingSpinner } from './LoadingSpinner';
import { ProgressBar } from './ProgressBar';
import { SkeletonLoader } from './SkeletonLoader';
import { LoadingOverlay } from './LoadingOverlay';
import { LoadingWrapper } from './LoadingWrapper';
import { ErrorMessage } from '../ErrorStates/ErrorMessage';

/**
 * **Feature: professional-ui-redesign, Property 5: Loading State Consistency**
 * **Validates: Requirements 5.4, 5.5**
 * 
 * For any component that fetches data, it should display appropriate loading states 
 * and handle errors gracefully with user-friendly messages
 */

// Helper: Generate strings that are safe for HTML text content comparison
// - No leading/trailing whitespace (HTML trims these)
// - No multiple consecutive spaces (HTML collapses them)
// - Non-empty after trimming
const safeString = (minLength = 1, maxLength = 100) => 
  fc.string({ minLength, maxLength }).filter(s => {
    const trimmed = s.trim();
    return trimmed.length > 0 && trimmed === s && !/\s{2,}/.test(s);
  });

describe('Loading State Consistency Properties', () => {
  describe('LoadingSpinner Properties', () => {
    it('should always render with proper accessibility attributes', () => {
      fc.assert(fc.property(
        fc.constantFrom('sm', 'md', 'lg', 'xl'),
        fc.constantFrom('primary', 'secondary', 'neutral'),
        safeString(1, 100),
        (size, color, ariaLabel) => {
          const { container } = render(
            <LoadingSpinner 
              size={size} 
              color={color} 
              aria-label={ariaLabel}
            />
          );
          
          const spinner = container.querySelector('.loading-spinner');
          expect(spinner).toBeInTheDocument();
          expect(spinner).toHaveAttribute('role', 'status');
          expect(spinner).toHaveAttribute('aria-label', ariaLabel);
          
          // Should have screen reader text
          const srText = container.querySelector('.sr-only');
          expect(srText).toBeInTheDocument();
          expect(srText).toHaveTextContent(ariaLabel.trim());
        }
      ));
    });

    it('should always apply correct size and color classes', () => {
      fc.assert(fc.property(
        fc.constantFrom('sm', 'md', 'lg', 'xl'),
        fc.constantFrom('primary', 'secondary', 'neutral'),
        (size, color) => {
          const { container } = render(
            <LoadingSpinner size={size} color={color} />
          );
          
          const spinner = container.querySelector('.loading-spinner');
          expect(spinner).toHaveClass(`loading-spinner--${size}`);
          expect(spinner).toHaveClass(`loading-spinner--${color}`);
        }
      ));
    });
  });

  describe('ProgressBar Properties', () => {
    it('should always normalize progress values to 0-100 range', () => {
      fc.assert(fc.property(
        fc.float({ min: -1000, max: 1000 }),
        (progress) => {
          const { container } = render(
            <ProgressBar progress={progress} />
          );
          
          const progressBar = container.querySelector('[role="progressbar"]');
          expect(progressBar).toBeInTheDocument();
          
          const ariaNow = progressBar?.getAttribute('aria-valuenow');
          const normalizedProgress = Math.max(0, Math.min(100, progress));
          expect(ariaNow).toBe(normalizedProgress.toString());
          
          const fill = container.querySelector('.progress-bar__fill');
          expect(fill).toHaveStyle(`width: ${normalizedProgress}%`);
        }
      ));
    });

    it('should always show correct label when showLabel is true', () => {
      fc.assert(fc.property(
        fc.float({ min: 0, max: 100 }),
        fc.option(safeString(1, 50), { nil: undefined }),
        (progress, customLabel) => {
          const { container } = render(
            <ProgressBar 
              progress={progress} 
              showLabel={true}
              label={customLabel}
            />
          );
          
          const label = container.querySelector('.progress-bar__label-text');
          expect(label).toBeInTheDocument();
          
          const expectedLabel = customLabel || `${Math.round(progress)}%`;
          expect(label).toHaveTextContent(expectedLabel.trim());
        }
      ));
    });
  });

  describe('SkeletonLoader Properties', () => {
    it('should always render correct number of lines for text variant', () => {
      fc.assert(fc.property(
        fc.integer({ min: 1, max: 10 }),
        (lines) => {
          const { container } = render(
            <SkeletonLoader variant="text" lines={lines} />
          );
          
          if (lines > 1) {
            const textGroup = container.querySelector('.skeleton-loader--text-group');
            expect(textGroup).toBeInTheDocument();
            
            const items = container.querySelectorAll('.skeleton-loader__item');
            expect(items).toHaveLength(lines);
            
            // Last line should be shorter (75% width)
            const lastItem = items[items.length - 1] as HTMLElement;
            expect(lastItem.style.width).toBe('75%');
          } else {
            const singleItem = container.querySelector('.skeleton-loader--text');
            expect(singleItem).toBeInTheDocument();
          }
        }
      ));
    });

    it('should always apply correct variant classes', () => {
      fc.assert(fc.property(
        fc.constantFrom('text', 'circular', 'rectangular', 'rounded'),
        (variant) => {
          const { container } = render(
            <SkeletonLoader variant={variant} />
          );
          
          const skeleton = container.querySelector('.skeleton-loader');
          expect(skeleton).toHaveClass(`skeleton-loader--${variant}`);
        }
      ));
    });
  });

  describe('LoadingOverlay Properties', () => {
    it('should always render with proper modal attributes when visible', () => {
      fc.assert(fc.property(
        safeString(1, 100),
        fc.boolean(),
        (message, backdrop) => {
          const { container } = render(
            <LoadingOverlay 
              isVisible={true}
              message={message}
              backdrop={backdrop}
            />
          );
          
          const overlay = container.querySelector('.loading-overlay');
          expect(overlay).toBeInTheDocument();
          expect(overlay).toHaveAttribute('role', 'dialog');
          expect(overlay).toHaveAttribute('aria-modal', 'true');
          expect(overlay).toHaveAttribute('aria-labelledby', 'loading-overlay-message');
          
          if (backdrop) {
            expect(overlay).toHaveClass('loading-overlay--backdrop');
          }
          
          const messageElement = container.querySelector('#loading-overlay-message');
          expect(messageElement).toHaveTextContent(message.trim());
        }
      ));
    });

    it('should never render when not visible', () => {
      fc.assert(fc.property(
        fc.string(),
        (message) => {
          const { container } = render(
            <LoadingOverlay 
              isVisible={false}
              message={message}
            />
          );
          
          const overlay = container.querySelector('.loading-overlay');
          expect(overlay).not.toBeInTheDocument();
        }
      ));
    });
  });

  describe('LoadingWrapper Properties', () => {
    it('should always show loading state when isLoading is true', () => {
      fc.assert(fc.property(
        fc.constantFrom('spinner', 'progress', 'skeleton', 'widget-skeleton'),
        safeString(1, 50),
        (loadingVariant, content) => {
          const { container } = render(
            <LoadingWrapper 
              isLoading={true}
              loadingVariant={loadingVariant}
            >
              <div data-testid="content">{content}</div>
            </LoadingWrapper>
          );
          
          // Should not show content when loading
          const contentElement = container.querySelector('[data-testid="content"]');
          expect(contentElement).not.toBeInTheDocument();
          
          // Should show appropriate loading state
          switch (loadingVariant) {
            case 'spinner':
              expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
              break;
            case 'progress':
              expect(container.querySelector('.progress-bar')).toBeInTheDocument();
              break;
            case 'skeleton':
              expect(container.querySelector('.skeleton-loader')).toBeInTheDocument();
              break;
            case 'widget-skeleton':
              expect(container.querySelector('.widget-skeleton')).toBeInTheDocument();
              break;
          }
        }
      ));
    });

    it('should always show error state when error is present', () => {
      fc.assert(fc.property(
        safeString(1, 100),
        safeString(1, 50),
        (errorMessage, content) => {
          const error = new Error(errorMessage);
          
          const { container } = render(
            <LoadingWrapper 
              isLoading={false}
              error={error}
            >
              <div data-testid="content">{content}</div>
            </LoadingWrapper>
          );
          
          // Should not show content when error
          const contentElement = container.querySelector('[data-testid="content"]');
          expect(contentElement).not.toBeInTheDocument();
          
          // Should show error message component
          const errorElement = container.querySelector('.error-message');
          expect(errorElement).toBeInTheDocument();
          
          // The error message should be contained within the error element
          // (along with the title "Something went wrong")
          const messageElement = container.querySelector('.error-message__message');
          expect(messageElement).toBeInTheDocument();
          expect(messageElement).toHaveTextContent(errorMessage.trim());
        }
      ));
    });

    it('should always show empty state when isEmpty is true and no error/loading', () => {
      fc.assert(fc.property(
        safeString(1, 100),
        safeString(1, 100),
        safeString(1, 50),
        (emptyTitle, emptyDescription, content) => {
          const { container } = render(
            <LoadingWrapper 
              isLoading={false}
              error={null}
              isEmpty={true}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
            >
              <div data-testid="content">{content}</div>
            </LoadingWrapper>
          );
          
          // Should not show content when empty
          const contentElement = container.querySelector('[data-testid="content"]');
          expect(contentElement).not.toBeInTheDocument();
          
          // Should show empty state with title
          const emptyElement = container.querySelector('.empty-state');
          expect(emptyElement).toBeInTheDocument();
          
          // Check title and description are present in their respective elements
          const titleElement = container.querySelector('.empty-state__title');
          expect(titleElement).toHaveTextContent(emptyTitle);
          
          const descriptionElement = container.querySelector('.empty-state__description');
          expect(descriptionElement).toHaveTextContent(emptyDescription.trim());
        }
      ));
    });

    it('should always show content when not loading, no error, and not empty', () => {
      fc.assert(fc.property(
        safeString(1, 50),
        (content) => {
          const { container } = render(
            <LoadingWrapper 
              isLoading={false}
              error={null}
              isEmpty={false}
            >
              <div data-testid="content">{content}</div>
            </LoadingWrapper>
          );
          
          // Should show content
          const contentElement = container.querySelector('[data-testid="content"]');
          expect(contentElement).toBeInTheDocument();
          expect(contentElement).toHaveTextContent(content.trim());
          
          // Should not show loading states
          expect(container.querySelector('.loading-spinner')).not.toBeInTheDocument();
          expect(container.querySelector('.error-message')).not.toBeInTheDocument();
          expect(container.querySelector('.empty-state')).not.toBeInTheDocument();
        }
      ));
    });
  });

  describe('Error Message Properties', () => {
    it('should always render with proper alert role and message', () => {
      fc.assert(fc.property(
        safeString(1, 100),
        fc.constantFrom('error', 'warning', 'info'),
        (message, variant) => {
          const { container } = render(
            <ErrorMessage 
              message={message}
              variant={variant}
            />
          );
          
          const errorElement = container.querySelector('.error-message');
          expect(errorElement).toBeInTheDocument();
          expect(errorElement).toHaveAttribute('role', 'alert');
          expect(errorElement).toHaveAttribute('aria-live', 'polite');
          expect(errorElement).toHaveClass(`error-message--${variant}`);
          expect(errorElement).toHaveTextContent(message.trim());
        }
      ));
    });

    it('should always show retry button when onRetry is provided', () => {
      fc.assert(fc.property(
        safeString(1, 100),
        safeString(1, 20),
        (message, retryLabel) => {
          const mockRetry = () => {};
          
          const { container } = render(
            <ErrorMessage 
              message={message}
              onRetry={mockRetry}
              retryLabel={retryLabel}
            />
          );
          
          const retryButton = container.querySelector('.error-message__button--primary');
          expect(retryButton).toBeInTheDocument();
          expect(retryButton).toHaveTextContent(retryLabel.trim());
        }
      ));
    });
  });

  describe('Cross-Component Consistency Properties', () => {
    it('should always use consistent design tokens across loading components', () => {
      fc.assert(fc.property(
        fc.constantFrom('sm', 'md', 'lg'),
        (size) => {
          // Test that all components use consistent size classes
          const spinnerResult = render(<LoadingSpinner size={size} />);
          const progressResult = render(<ProgressBar size={size} progress={50} />);
          
          const spinner = spinnerResult.container.querySelector('.loading-spinner');
          const progress = progressResult.container.querySelector('.progress-bar');
          
          expect(spinner).toHaveClass(`loading-spinner--${size}`);
          expect(progress).toHaveClass(`progress-bar--${size}`);
          
          spinnerResult.unmount();
          progressResult.unmount();
        }
      ));
    });

    it('should always maintain accessibility standards across all loading states', () => {
      fc.assert(fc.property(
        safeString(1, 50),
        (ariaLabel) => {
          // Test that all loading components have proper accessibility
          const components = [
            <LoadingSpinner aria-label={ariaLabel} />,
            <ProgressBar progress={50} aria-label={ariaLabel} />,
            <SkeletonLoader aria-label={ariaLabel} />,
          ];
          
          components.forEach((component) => {
            const { container, unmount } = render(component);
            
            // Should have either role="status" or role="progressbar"
            const statusElement = container.querySelector('[role="status"], [role="progressbar"]');
            expect(statusElement).toBeInTheDocument();
            
            // Should have aria-label
            expect(statusElement).toHaveAttribute('aria-label', ariaLabel);
            
            unmount();
          });
        }
      ));
    });
  });
});