/**
 * FloatingMetricOrbs Component
 * 
 * Radial/arc layout for key metrics with glowing number displays
 * and gradient text effects. Features subtle hover animations.
 * 
 * Requirements: 5.3
 */

import React from 'react';
import './FloatingMetricOrbs.css';

export type OrbColor = 'cyan' | 'magenta' | 'purple' | 'green' | 'orange' | string;
export type UrgencyLevel = 'low' | 'medium' | 'high';

export interface MetricOrb {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Numeric value to display */
  value: number;
  /** Color theme for the orb */
  color: OrbColor;
  /** Icon to display (emoji or character) */
  icon?: string;
  /** Urgency level affects glow intensity */
  urgency?: UrgencyLevel;
  /** Optional subtitle */
  subtitle?: string;
}

export interface FloatingMetricOrbsProps {
  /** Array of metric orbs to display */
  orbs: MetricOrb[];
  /** Callback when an orb is clicked */
  onOrbClick?: (orbId: string) => void;
  /** Layout style */
  layout?: 'arc' | 'row' | 'grid' | 'chip';
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * FloatingMetricOrbs - Displays key metrics in glowing orb format
 */
export const FloatingMetricOrbs: React.FC<FloatingMetricOrbsProps> = ({
  orbs,
  onOrbClick,
  layout = 'row',
  className = '',
  testId = 'floating-metric-orbs',
}) => {
  const handleOrbClick = (orbId: string) => {
    if (onOrbClick) {
      onOrbClick(orbId);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, orbId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOrbClick(orbId);
    }
  };

  return (
    <div
      className={`floating-metric-orbs floating-metric-orbs--${layout} ${className}`}
      data-testid={testId}
      role="list"
      aria-label="Key metrics"
    >
      {orbs.map((orb, index) => (
        <div
          key={orb.id}
          className={`metric-orb metric-orb--${orb.color} metric-orb--urgency-${orb.urgency || 'low'} ${layout === 'chip' ? 'metric-orb--chip' : ''}`}
          onClick={() => handleOrbClick(orb.id)}
          onKeyDown={(e) => handleKeyDown(e, orb.id)}
          role="listitem"
          tabIndex={0}
          aria-label={`${orb.label}: ${orb.value}${orb.subtitle ? `, ${orb.subtitle}` : ''}`}
          data-testid={`metric-orb-${orb.id}`}
          style={{ '--orb-index': index } as React.CSSProperties}
        >
          {/* Glow ring effect */}
          {layout !== 'chip' && <div className="metric-orb__glow" aria-hidden="true" />}

          {/* Inner content */}
          <div className="metric-orb__content">
            {orb.icon && (
              <span className="metric-orb__icon" aria-hidden="true">
                {orb.icon}
              </span>
            )}
            <span className="metric-orb__value">{orb.value}</span>
            <span className="metric-orb__label">{orb.label}</span>
            {orb.subtitle && (
              <span className="metric-orb__subtitle">{orb.subtitle}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FloatingMetricOrbs;
