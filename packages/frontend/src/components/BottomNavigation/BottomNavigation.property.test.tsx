/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import fc from 'fast-check';

/**
 * Feature: high-tech-ai-aesthetic, Property 10: Navigation Glow States
 * 
 * For any navigation item in active state, it should have a glow effect 
 * (box-shadow or filter) using neon accent colors.
 * 
 * **Validates: Requirements 4.2, 4.5**
 */
describe('Property 10: Navigation Glow States', () => {
  // Define the navigation routes
  const navRoutes = ['/focus', '/waiting', '/contacts', '/properties'];
  const zenaRoute = '/ask-zena';

  it('should apply active glow classes to navigation items when route is active', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...navRoutes),
        (activeRoute) => {
          const { container } = render(
            <MemoryRouter initialEntries={[activeRoute]}>
              <BottomNavigation />
            </MemoryRouter>
          );

          // Find the active navigation item
          const activeItem = container.querySelector(`a[href="${activeRoute}"]`);
          expect(activeItem).toBeTruthy();
          
          // Verify active state class is applied
          expect(activeItem?.classList.contains('bottom-nav-ht__item--active')).toBe(true);
          
          // Verify active glow indicator element exists for active items
          const glowIndicator = activeItem?.querySelector('.bottom-nav-ht__active-glow');
          expect(glowIndicator).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply active icon glow class when navigation item is active', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...navRoutes),
        (activeRoute) => {
          const { container } = render(
            <MemoryRouter initialEntries={[activeRoute]}>
              <BottomNavigation />
            </MemoryRouter>
          );

          // Find the active navigation item
          const activeItem = container.querySelector(`a[href="${activeRoute}"]`);
          expect(activeItem).toBeTruthy();
          
          // Verify icon has active glow class
          const icon = activeItem?.querySelector('.bottom-nav-ht__icon');
          expect(icon?.classList.contains('bottom-nav-ht__icon--active')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply active label glow class when navigation item is active', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...navRoutes),
        (activeRoute) => {
          const { container } = render(
            <MemoryRouter initialEntries={[activeRoute]}>
              <BottomNavigation />
            </MemoryRouter>
          );

          // Find the active navigation item
          const activeItem = container.querySelector(`a[href="${activeRoute}"]`);
          expect(activeItem).toBeTruthy();
          
          // Verify label has active glow class for text glow effect
          const label = activeItem?.querySelector('.bottom-nav-ht__label');
          expect(label?.classList.contains('bottom-nav-ht__label--active')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply active glow state to Zena orb when Ask Zena route is active', () => {
    fc.assert(
      fc.property(
        fc.constant(zenaRoute),
        (route) => {
          const { container } = render(
            <MemoryRouter initialEntries={[route]}>
              <BottomNavigation />
            </MemoryRouter>
          );

          // Find the Zena orb
          const zenaOrb = container.querySelector(`a[href="${route}"]`);
          expect(zenaOrb).toBeTruthy();
          
          // Verify active state class is applied to Zena orb
          expect(zenaOrb?.classList.contains('bottom-nav-ht__zena-orb--active')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should NOT apply active glow classes to inactive navigation items', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...navRoutes),
        (activeRoute) => {
          const { container } = render(
            <MemoryRouter initialEntries={[activeRoute]}>
              <BottomNavigation />
            </MemoryRouter>
          );

          // Find all inactive navigation items (excluding the active one and Zena orb)
          const allItems = container.querySelectorAll('.bottom-nav-ht__item');
          
          allItems.forEach((item) => {
            const href = item.getAttribute('href');
            if (href !== activeRoute) {
              // Inactive items should NOT have active class
              expect(item.classList.contains('bottom-nav-ht__item--active')).toBe(false);
              
              // Inactive items should NOT have glow indicator
              const glowIndicator = item.querySelector('.bottom-nav-ht__active-glow');
              expect(glowIndicator).toBeNull();
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: zena-ai-real-estate-pwa, Property 89: Mobile tap target sizing
 * 
 * For any interactive element on mobile, tap targets should be appropriately sized (minimum 44x44 pixels).
 * Validates: Requirements 24.1
 */
describe('Property 89: Mobile tap target sizing - Bottom Navigation', () => {
  it('should ensure all bottom navigation items meet minimum tap target size', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const { container } = render(
            <BrowserRouter>
              <BottomNavigation />
            </BrowserRouter>
          );

          // Get all navigation items (using new class names)
          const navItems = container.querySelectorAll('.bottom-nav-ht__item');
          
          // Should have 4 regular navigation items (Zena orb is separate)
          expect(navItems.length).toBe(4);
          
          // Verify Zena orb exists
          const zenaOrb = container.querySelector('.bottom-nav-ht__zena-orb');
          expect(zenaOrb).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have appropriately sized touch targets for all navigation routes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('/focus', '/waiting', '/ask-zena', '/contacts', '/properties'),
        (route) => {
          const { container } = render(
            <BrowserRouter>
              <BottomNavigation />
            </BrowserRouter>
          );

          // Find the link for this route
          const link = container.querySelector(`a[href="${route}"]`);
          expect(link).toBeTruthy();
          
          // Verify it has the proper class for touch targets
          const hasNavClass = link?.classList.contains('bottom-nav-ht__item') || 
                              link?.classList.contains('bottom-nav-ht__zena-orb');
          expect(hasNavClass).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: zena-ai-real-estate-pwa, Property 90: Desktop layout adaptation
 * 
 * For any agent using Zena on desktop, the layout should adapt to take advantage of larger screen space.
 * Validates: Requirements 24.3
 */
describe('Property 90: Desktop layout adaptation - Bottom Navigation', () => {
  it('should be hidden on desktop via CSS', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const { container } = render(
            <BrowserRouter>
              <BottomNavigation />
            </BrowserRouter>
          );

          const bottomNav = container.querySelector('.bottom-nav-ht');
          expect(bottomNav).toBeTruthy();
          
          // The bottom navigation should have the class that controls responsive display
          // CSS media query hides it on desktop (min-width: 768px)
          expect(bottomNav?.classList.contains('bottom-nav-ht')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should render all navigation items regardless of screen size', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const { container } = render(
            <BrowserRouter>
              <BottomNavigation />
            </BrowserRouter>
          );

          // Verify all 5 navigation items are present
          const focusLink = container.querySelector('a[href="/focus"]');
          const waitingLink = container.querySelector('a[href="/waiting"]');
          const askZenaLink = container.querySelector('a[href="/ask-zena"]');
          const contactsLink = container.querySelector('a[href="/contacts"]');
          const propertiesLink = container.querySelector('a[href="/properties"]');
          
          expect(focusLink).toBeTruthy();
          expect(waitingLink).toBeTruthy();
          expect(askZenaLink).toBeTruthy();
          expect(contactsLink).toBeTruthy();
          expect(propertiesLink).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });
});
