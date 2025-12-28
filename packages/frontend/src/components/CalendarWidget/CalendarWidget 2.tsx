import React from 'react';
import './CalendarWidget.css';

export interface CalendarAppointment {
  id: string;
  time: Date;
  title: string;
  location?: string;
  property?: {
    id: string;
    address: string;
    type?: string;
  };
  type: 'viewing' | 'meeting' | 'call' | 'other';
  urgency?: 'low' | 'medium' | 'high';
  conflictsWith?: string[]; // IDs of conflicting appointments
}

export interface CalendarWidgetProps {
  appointments: CalendarAppointment[];
  onAppointmentClick?: (appointment: CalendarAppointment) => void;
  onConflictResolve?: (appointmentId: string, action: 'reschedule' | 'cancel' | 'ignore') => void;
  onCallClick?: (appointment: CalendarAppointment) => void;
  onMapClick?: (appointment: CalendarAppointment) => void;
  maxAppointments?: number;
  showConflicts?: boolean;
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  appointments,
  onAppointmentClick,
  onConflictResolve,
  onCallClick,
  onMapClick,
  maxAppointments = 3,
  showConflicts = true
}) => {
  // Sort appointments by time and filter to upcoming only
  const upcomingAppointments = appointments
    .filter(appointment => appointment.time > new Date())
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .slice(0, maxAppointments);

  // Detect conflicts (appointments within 30 minutes of each other)
  const detectConflicts = (appointment: CalendarAppointment): boolean => {
    if (!showConflicts) return false;

    return appointments.some(other =>
      other.id !== appointment.id &&
      Math.abs(other.time.getTime() - appointment.time.getTime()) < 30 * 60 * 1000 // 30 minutes
    );
  };

  const getUrgencyClass = (appointment: CalendarAppointment): string => {
    const now = new Date();
    const timeUntil = appointment.time.getTime() - now.getTime();
    const hoursUntil = timeUntil / (1000 * 60 * 60);

    // Determine urgency based on time until appointment and explicit urgency
    if (appointment.urgency === 'high' || hoursUntil < 1) {
      return 'appointment-item--urgent';
    } else if (appointment.urgency === 'medium' || hoursUntil < 4) {
      return 'appointment-item--medium';
    } else {
      return 'appointment-item--low';
    }
  };

  const getAppointmentTypeIcon = (type: string): string => {
    switch (type) {
      case 'viewing':
        return '🏠';
      case 'meeting':
        return '👥';
      case 'call':
        return '📞';
      default:
        return '📅';
    }
  };

  const formatTimeUntil = (appointmentTime: Date): string => {
    const now = new Date();
    const timeUntil = appointmentTime.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

    if (hoursUntil < 1) {
      return `in ${minutesUntil}m`;
    } else if (hoursUntil < 24) {
      return `in ${hoursUntil}h ${minutesUntil}m`;
    } else {
      const daysUntil = Math.floor(hoursUntil / 24);
      return `in ${daysUntil}d`;
    }
  };

  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    if (onAppointmentClick) {
      onAppointmentClick(appointment);
    }
  };

  const handleConflictAction = (appointmentId: string, action: 'reschedule' | 'cancel' | 'ignore') => {
    if (onConflictResolve) {
      onConflictResolve(appointmentId, action);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, appointment: CalendarAppointment) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAppointmentClick(appointment);
    }
  };

  return (
    <section
      className="calendar-widget"
      role="region"
      aria-labelledby="calendar-widget-title"
    >
      <h2
        id="calendar-widget-title"
        className="calendar-widget__title"
      >
        Upcoming Appointments
      </h2>

      <div
        className="calendar-widget__appointments"
        role="list"
        aria-label="List of upcoming appointments"
      >
        {upcomingAppointments.length > 0 ? (
          upcomingAppointments.map((appointment) => {
            const hasConflict = detectConflicts(appointment);
            const urgencyClass = getUrgencyClass(appointment);

            return (
              <div
                key={appointment.id}
                className={`appointment-item ${urgencyClass} ${hasConflict ? 'appointment-item--conflict' : ''}`}
                role="listitem"
                tabIndex={0}
                onClick={() => handleAppointmentClick(appointment)}
                onKeyDown={(e) => handleKeyDown(e, appointment)}
                aria-label={`
                  ${appointment.title} at ${appointment.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  ${appointment.property ? ` for property at ${appointment.property.address}` : ''}
                  ${appointment.location ? ` at ${appointment.location}` : ''}
                  ${hasConflict ? ' - Has scheduling conflict' : ''}
                  ${formatTimeUntil(appointment.time)}
                `}
              >
                <div className="appointment-item__time-section">
                  <div className="appointment-item__time">
                    {appointment.time.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="appointment-item__time-until">
                    {formatTimeUntil(appointment.time)}
                  </div>
                </div>

                <div className="appointment-item__content">
                  <div className="appointment-item__header">
                    <span
                      className="appointment-item__type-icon"
                      aria-label={`Appointment type: ${appointment.type}`}
                    >
                      {getAppointmentTypeIcon(appointment.type)}
                    </span>
                    <div className="appointment-item__title">
                      {appointment.title}
                    </div>
                  </div>

                  {appointment.property && (
                    <div className="appointment-item__property">
                      <span className="appointment-item__property-icon" aria-hidden="true">📍</span>
                      <span className="appointment-item__property-address">
                        {appointment.property.address}
                      </span>
                      {appointment.property.type && (
                        <span className="appointment-item__property-type">
                          ({appointment.property.type})
                        </span>
                      )}
                    </div>
                  )}

                  {appointment.location && !appointment.property && (
                    <div className="appointment-item__location">
                      <span className="appointment-item__location-icon" aria-hidden="true">📍</span>
                      {appointment.location}
                    </div>
                  )}

                  {/* Quick Action Buttons */}
                  <div className="appointment-item__actions">
                    <button
                      className="appointment-action appointment-action--map"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMapClick ? onMapClick(appointment) : window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(appointment.property?.address || appointment.location || '')}`, '_blank');
                      }}
                      aria-label="Get directions"
                    >
                      🗺️
                    </button>
                    {(appointment.type === 'call' || appointment.title.toLowerCase().includes('call')) && (
                      <button
                        className="appointment-action appointment-action--call"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCallClick ? onCallClick(appointment) : console.log('Initiating call...');
                        }}
                        aria-label="Call client"
                      >
                        📞
                      </button>
                    )}
                  </div>
                </div>

                <div className="appointment-item__indicators">
                  {hasConflict && (
                    <div
                      className="appointment-item__conflict-indicator"
                      role="alert"
                      aria-label="Scheduling conflict detected"
                    >
                      <span className="conflict-icon" aria-hidden="true">⚠️</span>
                      <div className="conflict-actions">
                        <button
                          className="conflict-action conflict-action--reschedule"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConflictAction(appointment.id, 'reschedule');
                          }}
                          aria-label="Reschedule this appointment"
                        >
                          Reschedule
                        </button>
                        <button
                          className="conflict-action conflict-action--ignore"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConflictAction(appointment.id, 'ignore');
                          }}
                          aria-label="Ignore conflict warning"
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    className={`appointment-item__urgency-indicator appointment-item__urgency-indicator--${appointment.urgency || 'low'}`}
                    aria-label={`Priority level: ${appointment.urgency || 'low'}`}
                  >
                    <span className="urgency-dot" aria-hidden="true"></span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div
            className="appointment-item appointment-item--empty"
            role="listitem"
          >
            <div className="appointment-item__content">
              <div className="appointment-item__title">
                No upcoming appointments
              </div>
              <div className="appointment-item__subtitle">
                Your schedule is clear for now
              </div>
            </div>
          </div>
        )}
      </div>

      {appointments.length > maxAppointments && (
        <div className="calendar-widget__footer">
          <button
            className="calendar-widget__view-all"
            onClick={() => {
              // Navigate to full calendar view
              console.log('Navigate to full calendar');
            }}
            aria-label={`View all ${appointments.length} appointments in calendar`}
          >
            View all {appointments.length} appointments
          </button>
        </div>
      )}
    </section>
  );
};