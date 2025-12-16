import React from 'react';
import { generateContextualMessage, getUrgencyClass } from '../../utils/urgencyCalculator';
import './SmartSummaryWidget.css';

export interface AppointmentSummary {
  id: string;
  time: Date;
  title: string;
  property?: {
    id: string;
    address: string;
  };
  type: 'viewing' | 'meeting' | 'call' | 'other';
}

export interface SmartSummaryProps {
  focusThreadsCount: number;
  waitingThreadsCount: number;
  atRiskDealsCount: number;
  upcomingAppointments: AppointmentSummary[];
  urgencyLevel: 'low' | 'medium' | 'high';
}

export const SmartSummaryWidget: React.FC<SmartSummaryProps> = ({
  focusThreadsCount,
  waitingThreadsCount,
  atRiskDealsCount,
  upcomingAppointments,
  urgencyLevel
}) => {
  // Generate contextual message using utility function
  const contextualMessage = generateContextualMessage(
    { focusThreadsCount, waitingThreadsCount, atRiskDealsCount },
    urgencyLevel
  );

  return (
    <section 
      className={`smart-summary-widget smart-summary-widget--${urgencyLevel}`} 
      data-urgency={urgencyLevel}
      role="region"
      aria-labelledby="smart-summary-title"
      aria-describedby="smart-summary-message"
    >
      <h2 id="smart-summary-title" className="smart-summary-widget__title">Today's Overview</h2>
      
      <div className="smart-summary-widget__metrics" role="group" aria-label="Key business metrics">
        <div 
          className={`smart-summary-metric ${getUrgencyClass('focus', focusThreadsCount, urgencyLevel)}`}
          data-metric="focus-threads"
          role="button"
          tabIndex={0}
          aria-label={`${focusThreadsCount} focus threads requiring immediate attention. ${focusThreadsCount > 5 ? 'High priority' : focusThreadsCount > 2 ? 'Medium priority' : 'Low priority'}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // Navigate to focus threads
              console.log('Navigate to focus threads');
            }
          }}
        >
          <div className="smart-summary-metric__value" aria-hidden="true">{focusThreadsCount}</div>
          <div className="smart-summary-metric__label">Focus Threads</div>
          {focusThreadsCount > 5 && (
            <span className="sr-only">High priority - requires immediate attention</span>
          )}
        </div>
        
        <div 
          className={`smart-summary-metric ${getUrgencyClass('waiting', waitingThreadsCount, urgencyLevel)}`}
          data-metric="waiting-threads"
          role="button"
          tabIndex={0}
          aria-label={`${waitingThreadsCount} threads waiting for your response. ${waitingThreadsCount > 8 ? 'High volume' : waitingThreadsCount > 4 ? 'Moderate volume' : 'Low volume'}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // Navigate to waiting threads
              console.log('Navigate to waiting threads');
            }
          }}
        >
          <div className="smart-summary-metric__value" aria-hidden="true">{waitingThreadsCount}</div>
          <div className="smart-summary-metric__label">Waiting for Response</div>
          {waitingThreadsCount > 8 && (
            <span className="sr-only">High volume - many clients waiting for responses</span>
          )}
        </div>
        
        <div 
          className={`smart-summary-metric ${getUrgencyClass('at-risk', atRiskDealsCount, urgencyLevel)}`}
          data-metric="at-risk-deals"
          role="button"
          tabIndex={0}
          aria-label={`${atRiskDealsCount} deals at risk of being lost. ${atRiskDealsCount > 0 ? 'Requires immediate attention' : 'All deals are healthy'}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // Navigate to at-risk deals
              console.log('Navigate to at-risk deals');
            }
          }}
        >
          <div className="smart-summary-metric__value" aria-hidden="true">{atRiskDealsCount}</div>
          <div className="smart-summary-metric__label">At-Risk Deals</div>
          {atRiskDealsCount > 0 && (
            <span className="sr-only">Critical - deals require immediate attention to prevent loss</span>
          )}
        </div>
      </div>

      <div 
        id="smart-summary-message" 
        className="smart-summary-widget__message"
        role="status"
        aria-live="polite"
      >
        {contextualMessage}
      </div>

      <div className="smart-summary-widget__appointments">
        <h3 id="appointments-title" className="smart-summary-appointments__title">Today's Appointments</h3>
        <div 
          className="smart-summary-appointments__list"
          role="list"
          aria-labelledby="appointments-title"
        >
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.slice(0, 3).map((appointment) => (
              <div 
                key={appointment.id} 
                className="appointment-item"
                role="listitem"
                tabIndex={0}
                aria-label={`Appointment: ${appointment.title} at ${appointment.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${appointment.property ? ` for property at ${appointment.property.address}` : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Navigate to appointment details
                    console.log('Navigate to appointment:', appointment.id);
                  }
                }}
              >
                <div className="appointment-item__time" aria-hidden="true">
                  {appointment.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="appointment-item__content">
                  <div className="appointment-item__title">{appointment.title}</div>
                  {appointment.property && (
                    <div className="appointment-item__property">{appointment.property.address}</div>
                  )}
                </div>
                <div 
                  className={`appointment-item__type appointment-item__type--${appointment.type}`}
                  aria-label={`Appointment type: ${appointment.type}`}
                >
                  {appointment.type}
                </div>
              </div>
            ))
          ) : (
            <div className="appointment-item appointment-item--empty" role="listitem">
              <div className="appointment-item__content">
                <div className="appointment-item__title">No appointments scheduled</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {urgencyLevel === 'high' && (
        <div 
          className="urgency-indicator urgency-indicator--high"
          role="alert"
          aria-label="High priority alert - immediate attention required"
        >
          <span className="urgency-indicator__icon" aria-hidden="true">⚠️</span>
          <span className="urgency-indicator__text">High Priority</span>
        </div>
      )}
    </section>
  );
};