import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarAppointment } from '../../components/CalendarWidget/CalendarWidget';
import './CalendarPage.css';

export const CalendarPage: React.FC = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

    // Mock data for appointments
    const [appointments] = useState<CalendarAppointment[]>([
        {
            id: '1',
            time: new Date(new Date().setHours(16, 30, 0, 0)),
            title: 'Property Viewing - Luxury Penthouse',
            location: '42 Harbour View',
            property: { id: 'p1', address: '42 Harbour View', type: 'Penthouse' },
            type: 'viewing',
            urgency: 'high',
        },
        {
            id: '2',
            time: new Date(new Date().setHours(18, 45, 0, 0)),
            title: 'Client Meeting - Sarah Chen',
            location: 'Zena HQ, Level 12',
            type: 'meeting',
            urgency: 'medium',
        },
        {
            id: '3',
            time: new Date(new Date().setHours(20, 45, 0, 0)),
            title: 'Open Home - Remuera Estate',
            location: '88 Victoria Ave',
            property: { id: 'p2', address: '88 Victoria Ave', type: 'Estate' },
            type: 'viewing',
            urgency: 'low',
        },
        {
            id: '4',
            time: new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
            title: 'Follow-up Call - John Smith',
            type: 'call',
            urgency: 'low',
        }
    ]);

    return (
        <div className="calendar-page">
            <header className="calendar-page__header">
                <button className="back-button" onClick={() => navigate(-1)}>
                    ← Back
                </button>
                <h1 className="calendar-page__title">Your Schedule</h1>
                <div className="calendar-view-toggles">
                    <button
                        className={`view-toggle ${viewMode === 'day' ? 'active' : ''}`}
                        onClick={() => setViewMode('day')}
                    >
                        Day
                    </button>
                    <button
                        className={`view-toggle ${viewMode === 'week' ? 'active' : ''}`}
                        onClick={() => setViewMode('week')}
                    >
                        Week
                    </button>
                    <button
                        className={`view-toggle ${viewMode === 'month' ? 'active' : ''}`}
                        onClick={() => setViewMode('month')}
                    >
                        Month
                    </button>
                </div>
            </header>

            <main className="calendar-page__content">
                <section className="calendar-main-view">
                    <div className="high-tech-card agenda-view">
                        <h2 className="section-title">Today's Agenda</h2>
                        <div className="appointment-list">
                            {appointments
                                .filter(a => a.time.toDateString() === new Date().toDateString())
                                .map(appt => (
                                    <div key={appt.id} className={`appt-card appt-card--${appt.urgency || 'low'}`}>
                                        <div className="appt-time">
                                            {appt.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="appt-info">
                                            <div className="appt-title">{appt.title}</div>
                                            {appt.location && <div className="appt-location">📍 {appt.location}</div>}
                                        </div>
                                        <div className="appt-actions">
                                            <button className="appt-btn">View Details</button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </section>

                <aside className="calendar-sidebar">
                    <div className="high-tech-card zena-suggestions">
                        <h2 className="section-title">Zena's Insights</h2>
                        <div className="suggestion-item">
                            <span className="suggestion-icon">💡</span>
                            <p>You have a 2-hour gap after your Penthouse viewing. Perfect time for follow-up calls.</p>
                        </div>
                        <div className="suggestion-item">
                            <span className="suggestion-icon">⚠️</span>
                            <p>Traffic is heavy near 88 Victoria Ave. Suggest leaving 15 min early.</p>
                        </div>
                        <button className="zena-action-btn">Optimize My Day</button>
                    </div>
                </aside>
            </main>

            <button className="fab-add-event">+</button>
        </div>
    );
};
