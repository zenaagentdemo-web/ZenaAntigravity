import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarAppointment } from '../../components/CalendarWidget/CalendarWidget';
import { ScheduleOpenHomeModal } from '../../components/ScheduleOpenHomeModal/ScheduleOpenHomeModal';
import { api } from '../../utils/apiClient';
import './CalendarPage.css';

interface Property {
    id: string;
    address: string;
    type?: string;
    milestones?: Array<{
        id: string;
        type: string;
        date: string;
        notes?: string;
    }>;
}

export const CalendarPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
    const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

    // Check for search param to pre-select property
    useEffect(() => {
        const searchAddress = searchParams.get('search');
        if (searchAddress && properties.length > 0) {
            // Find property by address and open modal
            const found = properties.find(p => p.address === searchAddress);
            if (found) {
                setSelectedPropertyId(found.id);
                setIsScheduleModalOpen(true);
            }
        }
    }, [searchParams, properties]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const response = await api.get('/properties');
            if (response.data && response.data.properties) {
                setProperties(response.data.properties);
                const generatedAppointments = generateAppointmentsFromProperties(response.data.properties);
                setAppointments(generatedAppointments);
            }
        } catch (err) {
            console.error('Failed to load properties for calendar', err);
        }
    };

    const generateAppointmentsFromProperties = (props: Property[]): CalendarAppointment[] => {
        const appts: CalendarAppointment[] = [];

        props.forEach(property => {
            if (property.milestones) {
                property.milestones.forEach(milestone => {
                    const typeLower = milestone.type.toLowerCase();
                    // Filter relevant types
                    if (['open_home', 'viewing', 'auction', 'first_open', 'listing', 'settlement'].includes(typeLower) || typeLower.includes('open')) {
                        const date = new Date(milestone.date);
                        if (!isNaN(date.getTime())) {
                            appts.push({
                                id: milestone.id,
                                time: date,
                                title: formatTitle(milestone.type, property.address),
                                location: property.address,
                                property: {
                                    id: property.id,
                                    address: property.address,
                                    type: property.type
                                },
                                type: mapType(milestone.type),
                                urgency: determineUrgency(milestone.type),
                            });
                        }
                    }
                });
            }
        });

        return appts.sort((a, b) => a.time.getTime() - b.time.getTime());
    };

    const formatTitle = (type: string, address: string) => {
        switch (type) {
            case 'open_home': return `Open Home: ${address}`;
            case 'first_open': return `First Open Home: ${address}`;
            case 'viewing': return `Private Viewing: ${address}`;
            case 'auction': return `Auction: ${address}`;
            case 'settlement': return `Settlement: ${address}`;
            default: return `${type.charAt(0).toUpperCase() + type.slice(1)}: ${address}`;
        }
    };

    const mapType = (type: string): 'viewing' | 'meeting' | 'call' | 'other' => {
        if (type.includes('open') || type.includes('viewing')) return 'viewing';
        if (type.includes('meeting') || type.includes('auction')) return 'meeting';
        if (type.includes('call')) return 'call';
        return 'other';
    };

    const determineUrgency = (type: string): 'low' | 'medium' | 'high' => {
        if (type === 'auction' || type === 'settlement') return 'high';
        if (type.includes('open')) return 'medium';
        return 'low';
    };

    const selectedProperty = properties.find(p => p.id === selectedPropertyId);

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
                        <h2 className="section-title">
                            {viewMode === 'day' ? "Today's Agenda" : "Upcoming Events"}
                        </h2>

                        {appointments.length === 0 ? (
                            <div className="empty-state">
                                <p>No events scheduled. Add a new open home to get started.</p>
                            </div>
                        ) : (
                            <div className="appointment-list">
                                {appointments
                                    .filter(a => {
                                        if (viewMode === 'day') return a.time.toDateString() === new Date().toDateString();
                                        return true; // Show all for week/month for now (simplified)
                                    })
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
                                                <button className="appt-btn">View Property</button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </section>

                <aside className="calendar-sidebar">
                    <div className="high-tech-card zena-suggestions">
                        <h2 className="section-title">Zena's Insights</h2>
                        <div className="suggestion-item">
                            <span className="suggestion-icon">💡</span>
                            <p>You have {appointments.filter(a => a.time.toDateString() === new Date().toDateString()).length} events scheduled for today.</p>
                        </div>
                        <button className="zena-action-btn">Optimise My Day</button>
                    </div>
                </aside>
            </main>

            <button
                className="fab-add-event"
                onClick={() => {
                    setSelectedPropertyId('');
                    setIsScheduleModalOpen(true);
                }}
                title="Add Open Home"
            >
                +
            </button>

            <ScheduleOpenHomeModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                property={selectedProperty as any}
                allProperties={properties as any}
                onSuccess={() => {
                    loadData(); // Refresh calendar
                }}
            />
        </div>
    );
};
