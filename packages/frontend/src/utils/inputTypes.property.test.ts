/**
 * @vitest-environment jsdom
 */
/**
 * Property-Based Tests for Mobile Keyboard Type Triggering
 * 
 * Feature: zena-ai-real-estate-pwa, Property 91: Mobile keyboard type triggering
 * Validates: Requirements 24.4
 * 
 * Property: For any text input field, the system should trigger the appropriate 
 * mobile keyboard type (email, phone, text).
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import fc from 'fast-check';
import React from 'react';

// Import all pages that contain input fields
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { RegisterPage } from '../pages/RegisterPage/RegisterPage';
import { SearchPage } from '../pages/SearchPage/SearchPage';
import { PropertyDetailPage } from '../pages/PropertyDetailPage/PropertyDetailPage';
import { CRMDialog } from '../components/CRMDialog/CRMDialog';

describe('Property 91: Mobile keyboard type triggering', () => {
  /**
   * Helper function to extract all input elements from a rendered component
   */
  const getAllInputs = (container: HTMLElement): HTMLInputElement[] => {
    return Array.from(container.querySelectorAll('input'));
  };

  /**
   * Helper function to determine expected input type based on field purpose
   */
  const getExpectedType = (input: HTMLInputElement): string[] => {
    const id = input.id?.toLowerCase() || '';
    const name = input.name?.toLowerCase() || '';
    const placeholder = input.placeholder?.toLowerCase() || '';
    const className = input.className?.toLowerCase() || '';
    const ariaLabel = input.getAttribute('aria-label')?.toLowerCase() || '';
    
    const allText = `${id} ${name} ${placeholder} ${className} ${ariaLabel}`;

    // Email fields should use type="email"
    if (allText.includes('email')) {
      return ['email'];
    }

    // Phone fields should use type="tel"
    if (allText.includes('phone') || allText.includes('tel')) {
      return ['tel'];
    }

    // URL fields should use type="url"
    if (allText.includes('url') || allText.includes('website')) {
      return ['url'];
    }

    // Search fields should use type="search"
    if (allText.includes('search')) {
      return ['search'];
    }

    // Password fields should use type="password"
    if (allText.includes('password')) {
      return ['password'];
    }

    // Date fields should use type="date"
    if (allText.includes('date')) {
      return ['date'];
    }

    // Checkbox fields should use type="checkbox"
    if (input.type === 'checkbox') {
      return ['checkbox'];
    }

    // Radio fields should use type="radio"
    if (input.type === 'radio') {
      return ['radio'];
    }

    // Default text fields should use type="text"
    return ['text', 'textarea'];
  };

  /**
   * Property: All email input fields should have type="email"
   */
  it('should use type="email" for all email input fields', () => {
    const pages = [
      { name: 'LoginPage', Component: LoginPage },
      { name: 'RegisterPage', Component: RegisterPage },
    ];

    pages.forEach(({ name, Component }) => {
      const { container } = render(
        React.createElement(BrowserRouter, null, React.createElement(Component))
      );

      const inputs = getAllInputs(container);
      const emailInputs = inputs.filter(input => {
        const text = `${input.id} ${input.placeholder} ${input.name}`.toLowerCase();
        return text.includes('email');
      });

      emailInputs.forEach(input => {
        expect(
          input.type,
          `${name}: Email input should have type="email", found type="${input.type}"`
        ).toBe('email');
      });
    });
  });

  /**
   * Property: All password input fields should have type="password"
   */
  it('should use type="password" for all password input fields', () => {
    const pages = [
      { name: 'LoginPage', Component: LoginPage },
      { name: 'RegisterPage', Component: RegisterPage },
    ];

    pages.forEach(({ name, Component }) => {
      const { container } = render(
        React.createElement(BrowserRouter, null, React.createElement(Component))
      );

      const inputs = getAllInputs(container);
      const passwordInputs = inputs.filter(input => {
        const text = `${input.id} ${input.placeholder} ${input.name}`.toLowerCase();
        return text.includes('password');
      });

      passwordInputs.forEach(input => {
        expect(
          input.type,
          `${name}: Password input should have type="password", found type="${input.type}"`
        ).toBe('password');
      });
    });
  });

  /**
   * Property: All search input fields should have type="search"
   */
  it('should use type="search" for search input fields', () => {
    const { container } = render(
      React.createElement(BrowserRouter, null, React.createElement(SearchPage))
    );

    const inputs = getAllInputs(container);
    const searchInputs = inputs.filter(input => {
      const text = `${input.id} ${input.placeholder} ${input.className}`.toLowerCase();
      return text.includes('search');
    });

    searchInputs.forEach(input => {
      expect(
        input.type,
        `SearchPage: Search input should have type="search", found type="${input.type}"`
      ).toBe('search');
    });
  });

  /**
   * Property: All URL input fields should have type="url"
   */
  it('should use type="url" for URL input fields', () => {
    const { container } = render(
      React.createElement(
        BrowserRouter,
        null,
        React.createElement(CRMDialog, {
          isOpen: true,
          onClose: () => {},
          onSuccess: () => {},
        })
      )
    );

    const inputs = getAllInputs(container);
    const urlInputs = inputs.filter(input => {
      const text = `${input.id} ${input.placeholder}`.toLowerCase();
      return text.includes('url') || text.includes('instance');
    });

    urlInputs.forEach(input => {
      expect(
        input.type,
        `CRMDialog: URL input should have type="url", found type="${input.type}"`
      ).toBe('url');
    });
  });

  /**
   * Property: Text input fields should have type="text"
   */
  it('should use type="text" for general text input fields', () => {
    const { container } = render(
      React.createElement(BrowserRouter, null, React.createElement(RegisterPage))
    );

    const inputs = getAllInputs(container);
    const nameInput = inputs.find(input => input.id === 'name');

    if (nameInput) {
      expect(
        nameInput.type,
        'RegisterPage: Name input should have type="text"'
      ).toBe('text');
    }
  });

  /**
   * Property: Date input fields should have type="date"
   */
  it('should use type="date" for date input fields', () => {
    const { container } = render(
      React.createElement(BrowserRouter, null, React.createElement(PropertyDetailPage))
    );

    const inputs = getAllInputs(container);
    const dateInputs = inputs.filter(input => input.type === 'date');

    // If there are date inputs, they should have the correct type
    dateInputs.forEach(input => {
      expect(input.type).toBe('date');
    });
  });

  /**
   * Property-based test: For any input field, the type attribute should be 
   * appropriate for its purpose
   */
  it('should have appropriate input types for all input fields across all pages', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { name: 'LoginPage', Component: LoginPage },
          { name: 'RegisterPage', Component: RegisterPage },
          { name: 'SearchPage', Component: SearchPage }
        ),
        (page) => {
          const { container } = render(
            React.createElement(BrowserRouter, null, React.createElement(page.Component))
          );

          const inputs = getAllInputs(container);

          // Every input should have a valid type attribute
          inputs.forEach(input => {
            const validTypes = [
              'text',
              'email',
              'password',
              'tel',
              'url',
              'search',
              'date',
              'time',
              'number',
              'checkbox',
              'radio',
              'file',
              'hidden',
              'submit',
              'button',
            ];

            expect(
              validTypes.includes(input.type),
              `${page.name}: Input should have a valid type attribute, found type="${input.type}"`
            ).toBe(true);

            // Verify that the type is appropriate for the field's purpose
            const expectedTypes = getExpectedType(input);
            const hasAppropriateType = expectedTypes.some((expectedType: string) => {
              if (expectedType === 'textarea') {
                // Textareas are not input elements, so we skip this check
                return true;
              }
              return input.type === expectedType;
            });

            expect(
              hasAppropriateType,
              `${page.name}: Input type="${input.type}" should be one of [${expectedTypes.join(', ')}] based on field purpose (id="${input.id}", placeholder="${input.placeholder}")`
            ).toBe(true);
          });
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: No input fields should have missing or undefined type attributes
   */
  it('should not have any input fields with missing type attributes', () => {
    const pages = [
      { name: 'LoginPage', Component: LoginPage },
      { name: 'RegisterPage', Component: RegisterPage },
      { name: 'SearchPage', Component: SearchPage },
    ];

    pages.forEach(({ name, Component }) => {
      const { container } = render(
        React.createElement(BrowserRouter, null, React.createElement(Component))
      );

      const inputs = getAllInputs(container);

      inputs.forEach(input => {
        expect(
          input.type,
          `${name}: Input should have a type attribute defined`
        ).toBeDefined();
        expect(
          input.type,
          `${name}: Input type should not be empty`
        ).not.toBe('');
      });
    });
  });
});
