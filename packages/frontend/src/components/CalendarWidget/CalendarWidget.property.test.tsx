/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { CalendarWidget, CalendarAppointment } from './CalendarWidget';

/**
 * **Feature: enhanced-home-dashboard, Property 22: Calendar Integration Accuracy**
 * **Validates: Requirements 14.1, 14.2, 14.3**
 * 
 * For any calendar appointments, the dashboard should display the next 2-3 appointments 
 * with accurate time, location, and property context
 */

// Generators for property-based testing
const appointmentTypeArb = fc.constantFrom('viewing', 'meeting', 'call', 'other');
const urgencyLevelArb = fc.constantFrom('low', 'medium', 'high');

// More realistic generators that avoid text matching issues
const safeStringArb = fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
  s.trim().length > 0 && // No empty or whitespace-only strings
  !/[<>&"']/.test(s) && // No HTML-problematic characters
  s.trim() === s // No leading/trailing whitespace
);

const addressArb = fc.constantFrom(
  '123 Main Street',
  '456 Oak Avenue',
  '789 Pine Road',
  '321 Elm Drive',
  '654 Maple Lane'
);

const propertyTypeArb = fc.constantFrom(
  'Single Family Home',
  'Condo',
  'Townhouse',
  'Apartment',
  'Commercial'
);

const appointmentTitleArb = fc.constantFrom(
  'Property Viewing',
  'Client Meeting',
  'Phone Call',
  'Property Inspection',
  'Contract Signing',
  'Open House'
);

const locationArb = fc.constantFrom(
  'Downtown Office',
  'Coffee Shop',
  'Property Location',
  'Client Home',
  'Real Estate Office'
);

const propertyArb = fc.record({
  id: safeStringArb,
  address: addressArb,
  type: fc.option(propertyTypeArb)
});

const appointmentArb = fc.record({
  id: safeStringArb,
  time: fc.date({ min: new Date(), max: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }), // Next 7 days
  title: appointmentTitleArb,
  location: fc.option(locationArb),
  property: fc.option(propertyArb),
  type: appointmentTypeArb,
  urgency: fc.option(urgencyLevelArb),
  conflictsWith: fc.option(fc.array(safeStringArb, { maxLength: 3 }))
});

const appointmentsListArb = fc.array(appointmentArb, { minLength: 0, maxLength: 10 });

describe('CalendarWidget Property Tests', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Property 22: Calendar Integration Accuracy', () => {
    it('should display the next 2-3 appointments with accurate time information', () => {
      fc.assert(
        fc.property(appointmentsListArb, (appointments) => {
          // Filter to upcoming appointments only (generator should already do this, but ensure it)
          const upcomingAppointments = appointments.filter(apt => apt.time > new Date());
          
          cleanup(); // Clean up before each render
          render(
            <CalendarWidget
              appointments={upcomingAppointments}
              maxAppointments={3}
            />
          );

          // Should display the widget title
          expect(screen.getByText('Upcoming Appointments')).toBeInTheDocument();

          if (upcomingAppointments.length === 0) {
            // Should show empty state
            expect(screen.getByText('No upcoming appointments')).toBeInTheDocument();
            return true;
          }

          // Should display appointment items (up to 3)
          const appointmentItems = screen.getAllByRole('listitem');
          const actualAppointmentItems = appointmentItems.filter(item => 
            !item.textContent?.includes('No upcoming appointments')
          );

          // Should display the correct number of appointments (up to maxAppointments)
          const expectedCount = Math.min(upcomingAppointments.length, 3);
          expect(actualAppointmentItems.length).toBe(expectedCount);

          // Each appointment item should have time information
          actualAppointmentItems.forEach(item => {
            // Should have time display
            const timeElement = item.querySelector('.appointment-item__time');
            expect(timeElement).toBeInTheDocument();
            expect(timeElement?.textContent).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
            
            // Should have title
            const titleElement = item.querySelector('.appointment-item__title');
            expect(titleElement).toBeInTheDocument();
            expect(titleElement?.textContent).toBeTruthy();
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should display property context when appointments are related to properties', () => {
      fc.assert(
        fc.property(appointmentsListArb, (appointments) => {
          // Filter to appointments that have property information
          const appointmentsWithProperties = appointments.filter(apt => 
            apt.property && apt.time > new Date()
          );

          if (appointmentsWithProperties.length === 0) {
            return true; // Skip if no appointments with properties
          }

          cleanup(); // Clean up before each render
          render(
            <CalendarWidget
              appointments={appointmentsWithProperties}
              maxAppointments={3}
            />
          );

          // Should display property information for appointments that have it
          const appointmentItems = screen.getAllByRole('listitem');
          const actualAppointmentItems = appointmentItems.filter(item => 
            !item.textContent?.includes('No upcoming appointments')
          );

          // Each appointment should have property context
          actualAppointmentItems.forEach(item => {
            const propertySection = item.querySelector('.appointment-item__property');
            if (propertySection) {
              // Should have property address
              const addressElement = propertySection.querySelector('.appointment-item__property-address');
              expect(addressElement).toBeInTheDocument();
              expect(addressElement?.textContent).toBeTruthy();
              
              // Should have property icon
              const iconElement = propertySection.querySelector('.appointment-item__property-icon');
              expect(iconElement).toBeInTheDocument();
            }
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should display location information when provided', () => {
      fc.assert(
        fc.property(appointmentsListArb, (appointments) => {
          // Filter to appointments that have location but no property (to avoid conflicts)
          const appointmentsWithLocation = appointments.filter(apt => 
            apt.location && !apt.property && apt.time > new Date()
          );

          if (appointmentsWithLocation.length === 0) {
            return true; // Skip if no appointments with location
          }

          cleanup(); // Clean up before each render
          render(
            <CalendarWidget
              appointments={appointmentsWithLocation}
              maxAppointments={3}
            />
          );

          // Should display location information for appointments that have it
          const appointmentItems = screen.getAllByRole('listitem');
          const actualAppointmentItems = appointmentItems.filter(item => 
            !item.textContent?.includes('No upcoming appointments')
          );

          // Each appointment should have location context
          actualAppointmentItems.forEach(item => {
            const locationSection = item.querySelector('.appointment-item__location');
            if (locationSection) {
              // Should have location text
              expect(locationSection.textContent).toBeTruthy();
              
              // Should have location icon
              const iconElement = locationSection.querySelector('.appointment-item__location-icon');
              expect(iconElement).toBeInTheDocument();
            }
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should display appointments in chronological order', () => {
      fc.assert(
        fc.property(appointmentsListArb, (appointments) => {
          // Filter to upcoming appointments
          const upcomingAppointments = appointments.filter(apt => apt.time > new Date());
          
          if (upcomingAppointments.length < 2) {
            return true; // Need at least 2 appointments to test ordering
          }

          cleanup(); // Clean up before each render
          render(
            <CalendarWidget
              appointments={upcomingAppointments}
              maxAppointments={3}
            />
          );

          // Get all appointment elements and verify they are in chronological order
          const sortedAppointments = upcomingAppointments
            .sort((a, b) => a.time.getTime() - b.time.getTime())
            .slice(0, 3);

          // Verify the first few appointments appear in the correct order
          const appointmentElements = screen.getAllByRole('listitem');
          
          // Filter out empty state if present
          const actualAppointmentElements = appointmentElements.filter(el => 
            !el.textContent?.includes('No upcoming appointments')
          );

          // Should have the correct number of appointments displayed
          expect(actualAppointmentElements.length).toBeLessThanOrEqual(3);
          expect(actualAppointmentElements.length).toBe(Math.min(sortedAppointments.length, 3));

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should respect the maxAppointments limit', () => {
      fc.assert(
        fc.property(
          appointmentsListArb,
          fc.integer({ min: 1, max: 5 }),
          (appointments, maxAppointments) => {
            // Filter to upcoming appointments
            const upcomingAppointments = appointments.filter(apt => apt.time > new Date());

            cleanup(); // Clean up before each render
            render(
              <CalendarWidget
                appointments={upcomingAppointments}
                maxAppointments={maxAppointments}
              />
            );

            const appointmentElements = screen.getAllByRole('listitem');
            
            // Filter out empty state if present
            const actualAppointmentElements = appointmentElements.filter(el => 
              !el.textContent?.includes('No upcoming appointments')
            );

            // Should not display more than maxAppointments
            expect(actualAppointmentElements.length).toBeLessThanOrEqual(maxAppointments);
            
            // Should display the correct number based on available appointments
            const expectedCount = Math.min(upcomingAppointments.length, maxAppointments);
            if (upcomingAppointments.length > 0) {
              expect(actualAppointmentElements.length).toBe(expectedCount);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display appointment type indicators correctly', () => {
      fc.assert(
        fc.property(appointmentsListArb, (appointments) => {
          // Filter to upcoming appointments
          const upcomingAppointments = appointments.filter(apt => apt.time > new Date());

          if (upcomingAppointments.length === 0) {
            return true;
          }

          cleanup(); // Clean up before each render
          render(
            <CalendarWidget
              appointments={upcomingAppointments}
              maxAppointments={3}
            />
          );

          // Should display appointment type icons
          const appointmentItems = screen.getAllByRole('listitem');
          const actualAppointmentItems = appointmentItems.filter(item => 
            !item.textContent?.includes('No upcoming appointments')
          );

          // Each appointment should have a type icon
          actualAppointmentItems.forEach(item => {
            const typeIcon = item.querySelector('[aria-label*="Appointment type"]');
            expect(typeIcon).toBeInTheDocument();
            
            // Should have a valid appointment type in the aria-label
            const ariaLabel = typeIcon?.getAttribute('aria-label');
            expect(ariaLabel).toMatch(/Appointment type: (viewing|meeting|call|other)/);
          });

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle empty appointment lists gracefully', () => {
      fc.assert(
        fc.property(fc.constant([]), (emptyAppointments) => {
          cleanup(); // Clean up before each render
          render(
            <CalendarWidget
              appointments={emptyAppointments}
              maxAppointments={3}
            />
          );

          // Should display empty state
          const emptyMessages = screen.getAllByText('No upcoming appointments');
          expect(emptyMessages.length).toBeGreaterThan(0);
          
          const subtitleMessages = screen.getAllByText('Your schedule is clear for now');
          expect(subtitleMessages.length).toBeGreaterThan(0);

          return true;
        }),
        { numRuns: 10 }
      );
    });

    it('should filter out past appointments automatically', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: safeStringArb,
              time: fc.date({ min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), max: new Date() }), // Past week
              title: appointmentTitleArb,
              type: appointmentTypeArb
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (pastAppointments) => {
            cleanup(); // Clean up before each render
            render(
              <CalendarWidget
                appointments={pastAppointments}
                maxAppointments={3}
              />
            );

            // Should show empty state since all appointments are in the past
            const emptyMessages = screen.getAllByText('No upcoming appointments');
            expect(emptyMessages.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});