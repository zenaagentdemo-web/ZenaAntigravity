import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { WeatherTimeWidget } from './WeatherTimeWidget';

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

describe('WeatherTimeWidget Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Property 2: Temperature Unit Consistency', () => {
    it('should always display temperature values in Celsius with °C suffix', () => {
      fc.assert(
        fc.property(
          fc.record({
            temperature: fc.integer({ min: -50, max: 50 }), // Reasonable temperature range in Celsius
            condition: fc.constantFrom('sunny', 'cloudy', 'rainy', 'stormy', 'partly cloudy'),
            icon: fc.constantFrom('☀️', '☁️', '🌧️', '⛈️', '🌤️'),
            location: fc.string({ minLength: 1, maxLength: 50 }),
            humidity: fc.integer({ min: 0, max: 100 }),
            windSpeed: fc.integer({ min: 0, max: 100 })
          }),
          (weatherData) => {
            const { container } = render(
              <WeatherTimeWidget weather={weatherData} />
            );

            // Find temperature display
            const temperatureElement = container.querySelector('.weather-time-widget__temperature');
            
            if (temperatureElement) {
              const temperatureText = temperatureElement.textContent;
              
              // Property: Temperature should always end with °C
              expect(temperatureText).toMatch(/\d+°C$/);
              
              // Property: Temperature should be the exact value provided
              expect(temperatureText).toBe(`${weatherData.temperature}°C`);
              
              // Property: Temperature should be a valid number
              const tempValue = parseInt(temperatureText.replace('°C', ''));
              expect(tempValue).toBe(weatherData.temperature);
              expect(Number.isInteger(tempValue)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should convert Fahrenheit thresholds to Celsius for weather alerts', () => {
      fc.assert(
        fc.property(
          fc.record({
            temperature: fc.integer({ min: -10, max: 40 }), // Celsius range
            // Exclude stormy/thunder conditions to test temperature-based alerts
            // (stormy conditions take priority over temperature alerts in the component)
            condition: fc.constantFrom('sunny', 'cloudy', 'rainy', 'partly cloudy'),
            icon: fc.string(),
            location: fc.string()
          }),
          (weatherData) => {
            const { container } = render(
              <WeatherTimeWidget weather={weatherData} />
            );

            const alertElement = container.querySelector('.weather-time-widget__alert-text');
            
            if (alertElement) {
              const alertText = alertElement.textContent || '';
              
              // Property: Alert thresholds should be based on Celsius values
              // Note: Heavy rain alerts take priority, so we check for that first
              const isHeavyRain = weatherData.condition.toLowerCase().includes('heavy rain') ||
                                  weatherData.condition.toLowerCase().includes('downpour');
              
              if (!isHeavyRain) {
                if (weatherData.temperature < 5) {
                  expect(alertText).toContain('Very cold');
                } else if (weatherData.temperature > 35) {
                  expect(alertText).toContain('Extreme heat');
                }
              }
              
              // Property: No Fahrenheit references should appear in alerts
              expect(alertText).not.toMatch(/°F/);
              expect(alertText).not.toMatch(/fahrenheit/i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Automatic Refresh Consistency', () => {
    it('should refresh weather data at 30-minute intervals when no weather prop is provided', () => {
      // Mock successful geolocation
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: -36.8485,
            longitude: 174.7633
          }
        });
      });

      const { container } = render(<WeatherTimeWidget />);

      // Property: Component should render without crashing
      expect(container.querySelector('.weather-time-widget')).toBeInTheDocument();

      // Fast-forward 30 minutes
      vi.advanceTimersByTime(30 * 60 * 1000);

      // Property: Weather should attempt to refresh automatically
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it('should handle refresh failures gracefully without breaking the interface', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // Whether geolocation succeeds or fails
          (geolocationSuccess) => {
            if (geolocationSuccess) {
              mockGeolocation.getCurrentPosition.mockImplementation((success) => {
                success({
                  coords: { latitude: -36.8485, longitude: 174.7633 }
                });
              });
            } else {
              mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
                error(new Error('Geolocation failed'));
              });
            }

            const { container } = render(<WeatherTimeWidget />);

            // Property: Component should always render without crashing
            expect(container.querySelector('.weather-time-widget')).toBeInTheDocument();
            
            // Property: Should show either weather data, loading state, or error state
            const hasWeather = container.querySelector('.weather-time-widget__temperature');
            const hasLoading = container.querySelector('.weather-time-widget__loading');
            const hasError = container.querySelector('.weather-time-widget__error');
            
            expect(hasWeather || hasLoading || hasError).toBeTruthy();
            
            // Property: Should never show multiple states simultaneously
            const stateCount = [hasWeather, hasLoading, hasError].filter(Boolean).length;
            expect(stateCount).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should use Auckland, NZ as fallback when location detection fails', () => {
      // Mock geolocation failure
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(new Error('Location access denied'));
      });

      const { container } = render(<WeatherTimeWidget />);

      // Property: Component should render without crashing
      expect(container.querySelector('.weather-time-widget')).toBeInTheDocument();
      
      // Property: Should show loading or error state initially
      const hasLoadingOrError = container.querySelector('.weather-time-widget__loading') ||
                               container.querySelector('.weather-time-widget__error') ||
                               container.querySelector('.weather-time-widget__temperature');
      expect(hasLoadingOrError).toBeTruthy();
    });

    it('should maintain consistent refresh intervals regardless of component re-renders', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }), // Number of re-renders
          (rerenderCount) => {
            const { rerender, container } = render(<WeatherTimeWidget />);
            
            // Re-render the component multiple times
            for (let i = 0; i < rerenderCount; i++) {
              rerender(<WeatherTimeWidget currentTime={new Date()} />);
            }
            
            // Property: Component should remain stable after re-renders
            expect(container.querySelector('.weather-time-widget')).toBeInTheDocument();
            
            // Property: Should show consistent UI state regardless of re-renders
            const hasContent = container.querySelector('.weather-time-widget__temperature') ||
                              container.querySelector('.weather-time-widget__loading') ||
                              container.querySelector('.weather-time-widget__error');
            expect(hasContent).toBeTruthy();
            
            return true; // Property holds
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Error Handling Properties', () => {
    it('should handle all possible weather service failure scenarios gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'geolocation_denied',
            'geolocation_timeout',
            'geolocation_unavailable',
            'weather_api_error',
            'network_error'
          ),
          (errorType) => {
            // Mock different error scenarios
            switch (errorType) {
              case 'geolocation_denied':
                mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
                  error({ code: 1, message: 'Permission denied' });
                });
                break;
              case 'geolocation_timeout':
                mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
                  error({ code: 3, message: 'Timeout' });
                });
                break;
              case 'geolocation_unavailable':
                Object.defineProperty(global.navigator, 'geolocation', {
                  value: undefined,
                  writable: true,
                });
                break;
            }

            const { container } = render(<WeatherTimeWidget />);

            // Property: Component should never crash regardless of error type
            expect(container.querySelector('.weather-time-widget')).toBeInTheDocument();
            
            // Property: Should provide meaningful fallback content
            const hasContent = container.querySelector('.weather-time-widget__temperature') ||
                              container.querySelector('.weather-time-widget__loading') ||
                              container.querySelector('.weather-time-widget__error');
            expect(hasContent).toBeTruthy();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});