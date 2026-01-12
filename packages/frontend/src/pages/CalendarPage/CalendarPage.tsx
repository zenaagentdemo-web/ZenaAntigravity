import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Calendar, CheckCircle2, MapPin, ArrowRight, Clock, ChevronLeft, ChevronRight, AlertTriangle, X, Plus } from 'lucide-react';
import { CalendarAppointment } from '../../components/CalendarWidget/CalendarWidget';
import { ScheduleOpenHomeModal } from '../../components/ScheduleOpenHomeModal/ScheduleOpenHomeModal';
import { CalendarMiniPicker } from '../../components/CalendarMiniPicker/CalendarMiniPicker';
import { GodmodeToggle } from '../../components/GodmodeToggle/GodmodeToggle';
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
    const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
    const [selectedAgendaDate, setSelectedAgendaDate] = useState<Date | null>(new Date());

    const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

    const formatDateSafe = (date: Date | null | undefined, options: Intl.DateTimeFormatOptions, fallback: string = '--') => {
        if (!date || !isValidDate(date)) return fallback;
        try {
            return date.toLocaleDateString('en-NZ', options);
        } catch (e) {
            console.error('Safe date formatting failed', e);
            return fallback;
        }
    };

    const navigateDate = (direction: number) => {
        const current = isValidDate(selectedAgendaDate) ? selectedAgendaDate : new Date();
        const newDate = new Date(current);
        if (viewMode === 'day') {
            newDate.setDate(newDate.getDate() + direction);
        } else if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + (direction * 7));
        } else if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + direction);
        }
        setSelectedAgendaDate(newDate);
    };

    // AI Suggestions state
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [propertyAddress, setPropertyAddress] = useState<string>('');
    const [propertyId, setPropertyId] = useState<string>('');
    const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');
    const [isConfirming, setIsConfirming] = useState(false);

    // Route Optimization State
    const [routeWarnings, setRouteWarnings] = useState<{
        id: string;
        message: string;
        type: 'warning' | 'optimization';
        actionLabel?: string;
        action?: () => void;
    }[]>([]);

    // Parse URL params for AI suggestions
    useEffect(() => {
        const suggestionsParam = searchParams.get('suggestions');
        const property = searchParams.get('property');
        const propId = searchParams.get('propertyId');
        const selected = searchParams.get('selected');

        if (suggestionsParam) {
            try {
                const parsed = JSON.parse(suggestionsParam);
                setAiSuggestions(Array.isArray(parsed) ? parsed : []);
            } catch {
                setAiSuggestions([]);
            }
        }
        if (property) setPropertyAddress(property);
        if (propId) setPropertyId(propId);
        if (selected) setSelectedSuggestion(selected);
    }, [searchParams]);

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
            const [propRes, taskRes, timelineRes] = await Promise.all([
                api.get('/api/properties'),
                api.get('/api/tasks?status=open'),
                api.get('/api/timeline?entityType=calendar_event')
            ]);

            const loadedProps = propRes.data?.properties || [];
            const loadedTasks = taskRes.data?.tasks || [];
            const loadedTimeline = timelineRes.data?.events || [];

            setProperties(loadedProps);

            const propAppts = generateAppointmentsFromProperties(loadedProps);
            const taskAppts = generateAppointmentsFromTasks(loadedTasks, loadedProps);
            const timelineAppts = generateAppointmentsFromTimeline(loadedTimeline, loadedProps);

            const allAppts = [...propAppts, ...taskAppts, ...timelineAppts]
                .sort((a, b) => a.time.getTime() - b.time.getTime());

            setAppointments(allAppts);

            // ANALYZE ROUTES
            analyzeRoutes(allAppts);
        } catch (err) {
            console.error('Failed to load combined calendar data', err);
        }
    };

    const analyzeRoutes = (appts: CalendarAppointment[]) => {
        const warnings: any[] = [];
        const todayStr = new Date().toDateString();
        const now = new Date();
        const todayAppts = appts
            .filter(a => a.time.toDateString() === todayStr)
            .sort((a, b) => a.time.getTime() - b.time.getTime());

        for (let i = 0; i < todayAppts.length - 1; i++) {
            const current = todayAppts[i];
            const next = todayAppts[i + 1];

            // Only analyze if the *next* appointment is consistent with the current schedule order
            // AND the next appointment is starting within the next 3 hours (not "ages away")
            const timeUntilNextStart = (next.time.getTime() - now.getTime()) / (1000 * 60);

            if (timeUntilNextStart < 0 || timeUntilNextStart > 180) continue; // Skip past events or far future events (3h+)

            // Assuming 1 hour duration for 'current' if not specified
            const currentEndTime = new Date(current.time.getTime() + 60 * 60 * 1000);
            const gapMinutes = (next.time.getTime() - currentEndTime.getTime()) / (1000 * 60);

            // Simple Distance Estimate (Manhattan distance approx if coords existed, else random mock for demo)
            // In reality, we'd use Google Maps API here. 
            // For now, let's assume a "Critical Alert" only if the gap is remarkably tight (< 30 mins)
            // and we rely on the heuristic that most property drives are ~15-30 mins.

            if (gapMinutes < 30) {
                // If gap is less than 30 mins, it's a potential rush.
                // We refine this: if gap is NEGATIVE, it's an overlap.
                if (gapMinutes < 0) {
                    warnings.push({
                        id: `overlap-${current.id}-${next.id}`,
                        message: `Schedule Conflict: ${next.title} starts before ${current.title} ends.`,
                        type: 'warning',
                        actionLabel: 'Reschedule',
                        action: () => {
                            const newTime = new Date(currentEndTime.getTime() + 30 * 60 * 1000); // Suggest 30 mins after current ends
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(next.location)}`, '_blank');
                        }
                    });
                } else if (gapMinutes < 20) {
                    // Tight gap (0-20 mins)
                    warnings.push({
                        id: `travel-${current.id}-${next.id}`,
                        message: `Tight Schedule: Only ${Math.round(gapMinutes)} mins travel time to ${next.title}. Traffic may cause delays.`,
                        type: 'warning',
                        actionLabel: 'Optimize Route',
                        action: () => {
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(next.location)}`, '_blank');
                        }
                    });
                }
            }
        }
        setRouteWarnings(warnings);
    };

    const generateAppointmentsFromTasks = (tasks: any[], props: Property[]): CalendarAppointment[] => {
        return tasks
            .filter(t => t.dueDate)
            .map(t => {
                const property = props.find(p => p.id === t.propertyId);
                return {
                    id: t.id,
                    time: new Date(t.dueDate),
                    title: t.label,
                    location: property?.address || 'Personal Task',
                    property: property ? {
                        id: property.id,
                        address: property.address,
                        type: property.type
                    } : undefined,
                    type: t.label.toLowerCase().includes('call') ? 'call' : 'other',
                    urgency: 'medium'
                };
            });
    };

    const generateAppointmentsFromTimeline = (events: any[], props: Property[]): CalendarAppointment[] => {
        return events.map(e => {
            const propertyId = e.metadata?.propertyId;
            const property = props.find(p => p.id === propertyId);
            return {
                id: e.id,
                time: new Date(e.timestamp),
                title: e.summary,
                location: property?.address || e.metadata?.location || '',
                property: property ? {
                    id: property.id,
                    address: property.address,
                    type: property.type
                } : undefined,
                type: e.type === 'meeting' ? 'meeting' : 'other',
                urgency: e.metadata?.urgency || 'low'
            };
        });
    };

    const generateAppointmentsFromProperties = (props: Property[]): CalendarAppointment[] => {
        const appts: CalendarAppointment[] = [];

        props.forEach(property => {
            if (property.milestones) {
                property.milestones.forEach(milestone => {
                    const date = new Date(milestone.date);
                    if (!isNaN(date.getTime())) {
                        appts.push({
                            id: milestone.id,
                            time: date,
                            title: formatTitle(milestone.type || milestone.title || 'Milestone', property.address),
                            location: property.address,
                            property: {
                                id: property.id,
                                address: property.address,
                                type: property.type
                            },
                            type: mapType(milestone.type || 'other'),
                            urgency: determineUrgency(milestone.type || 'low'),
                        });
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

    const handleConfirmSuggestion = async (suggestion: string) => {
        if (!propertyId) return;

        try {
            // Parse the suggestion to extract date/time
            const dateMatch = suggestion.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
            const timeMatch = suggestion.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);

            let targetDate = new Date();
            if (dateMatch) {
                const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
                const day = parseInt(dateMatch[1]);
                const month = months.indexOf(dateMatch[2].toLowerCase());
                const year = parseInt(dateMatch[3]);
                targetDate = new Date(year, month, day);
            }

            if (timeMatch) {
                const [time, period] = timeMatch[1].split(/\s+/);
                const [hours, minutes] = time.split(':').map(Number);
                let adjustedHours = hours;
                if (period.toUpperCase() === 'PM' && hours !== 12) adjustedHours += 12;
                if (period.toUpperCase() === 'AM' && hours === 12) adjustedHours = 0;
                targetDate.setHours(adjustedHours, minutes, 0, 0);
            }

            await api.post(`/api/properties/${propertyId}/milestones`, {
                type: 'open_home',
                title: `Open Home - ${propertyAddress}`,
                date: targetDate.toISOString(),
                notes: suggestion
            });

            // Clear suggestions and refresh
            setAiSuggestions([]);
            setSelectedSuggestion('');
            loadData();
        } catch (err) {
            console.error('Failed to create open home:', err);
        }
    };

    const selectedProperty = properties.find(p => p.id === selectedPropertyId);

    const handleApptClick = (appt: CalendarAppointment) => {
        setSelectedPropertyId(appt.property?.id || '');
        setSelectedMilestone({
            id: appt.id,
            title: appt.title,
            date: appt.time.toISOString(),
            notes: (appt as any).notes || '', // CalendarAppointment might need notes field
            type: appt.type === 'viewing' ? 'viewing' : (appt.title.toLowerCase().includes('auction') ? 'auction' : 'open_home')
        });
        setIsScheduleModalOpen(true);
    };

    return (
        <div className="calendar-page">
            <header className="calendar-page__header">
                <button className="back-button" onClick={() => navigate(-1)}>
                    ← Back
                </button>
                <div className="calendar-header-main">
                    <h1 className="calendar-page__title">Your Schedule</h1>
                    <div className="calendar-nav-controls">
                        <button className="nav-btn" onClick={() => navigateDate(-1)}><ChevronLeft size={20} /></button>
                        <span className="current-date-display">
                            {viewMode === 'day'
                                ? formatDateSafe(selectedAgendaDate, { day: 'numeric', month: 'short', year: 'numeric' })
                                : viewMode === 'week'
                                    ? `Week of ${formatDateSafe(selectedAgendaDate, { day: 'numeric', month: 'short' })}`
                                    : formatDateSafe(selectedAgendaDate, { month: 'long', year: 'numeric' })
                            }
                        </span>
                        <button className="nav-btn" onClick={() => navigateDate(1)}><ChevronRight size={20} /></button>
                    </div>
                </div>
                <div className="calendar-page__godmode-area">
                    <GodmodeToggle compact />
                </div>
                <div className="calendar-view-toggles">
                    <button
                        className="view-toggle today-btn"
                        onClick={() => {
                            const today = new Date();
                            setSelectedAgendaDate(today);
                            setViewMode('day');
                            const todayKey = today.toISOString().split('T')[0];
                            const element = document.getElementById(todayKey);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }}
                    >
                        Today
                    </button>
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
                    <div className="header-separator" style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }}></div>
                    <button
                        className="calendar-page__add-btn"
                        onClick={() => {
                            setSelectedPropertyId('');
                            setIsScheduleModalOpen(true);
                        }}
                    >
                        <Plus size={18} />
                        <span>Add Appointment</span>
                    </button>
                </div>
            </header>

            <main className="calendar-page__content">
                <section className="calendar-main-view">
                    {/* Route Intelligence Banner */}
                    {routeWarnings.length > 0 && (
                        <div className="calendar-route-intelligence">
                            {routeWarnings.map(warning => (
                                <div key={warning.id} className={`route-warning route-warning--${warning.type}`}>
                                    <div className="route-warning__icon">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div className="route-warning__content">
                                        <p>{warning.message}</p>
                                        {warning.actionLabel && (
                                            <button className="route-warning__btn" onClick={warning.action}>
                                                <Sparkles size={12} />
                                                {warning.actionLabel}
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        className="route-warning__close"
                                        onClick={() => setRouteWarnings(prev => prev.filter(w => w.id !== warning.id))}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* AI Suggested Open Home Times */}
                    {aiSuggestions.length > 0 && (
                        <div className="high-tech-card ai-suggestions-panel" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 255, 136, 0.05))', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
                            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00D4FF' }}>
                                <Sparkles size={18} />
                                AI-Suggested Open Home Times
                                {propertyAddress && <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: 'normal' }}>for {propertyAddress}</span>}
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                                {aiSuggestions.map((suggestion, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '14px 16px',
                                            background: selectedSuggestion === suggestion ? 'rgba(0, 255, 136, 0.15)' : 'rgba(0, 212, 255, 0.08)',
                                            border: selectedSuggestion === suggestion ? '2px solid rgba(0, 255, 136, 0.5)' : '1px solid rgba(0, 212, 255, 0.2)',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                            <Calendar size={18} style={{ color: selectedSuggestion === suggestion ? '#00FF88' : '#00D4FF', flexShrink: 0 }} />
                                            <span style={{ color: 'white', fontSize: '14px' }}>{suggestion}</span>
                                        </div>
                                        <button
                                            onClick={() => handleConfirmSuggestion(suggestion)}
                                            style={{
                                                padding: '8px 16px',
                                                background: 'linear-gradient(135deg, #00FF88, #00D4FF)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: '#0a1628',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                fontSize: '13px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                flexShrink: 0
                                            }}
                                        >
                                            <CheckCircle2 size={14} />
                                            Confirm
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setAiSuggestions([])}
                                style={{ marginTop: '12px', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '13px' }}
                            >
                                Dismiss Suggestions
                            </button>
                        </div>
                    )}

                    <div className="calendar-agenda-container">
                        <div className="agenda-header-info">
                            <h2 className="section-title">
                                {viewMode === 'day' ? (
                                    selectedAgendaDate?.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' }) === new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
                                        ? "Today's Agenda"
                                        : `Agenda for ${selectedAgendaDate?.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long' })}`
                                ) : viewMode === 'week' ? (
                                    "This Week's Schedule"
                                ) : (
                                    `Schedule for ${selectedAgendaDate?.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })}`
                                )}
                            </h2>
                        </div>

                        {(() => {
                            const filteredGroups = Object.entries(
                                appointments.reduce((groups, appt) => {
                                    const dateKey = appt.time.toISOString().split('T')[0];
                                    if (!groups[dateKey]) groups[dateKey] = [];
                                    groups[dateKey].push(appt);
                                    return groups;
                                }, {} as Record<string, CalendarAppointment[]>)
                            ).filter(([dateKey]) => {
                                const date = new Date(dateKey);
                                const anchor = selectedAgendaDate || new Date();

                                if (viewMode === 'day') {
                                    return date.toDateString() === anchor.toDateString();
                                }
                                if (viewMode === 'week') {
                                    const startOfWeek = new Date(anchor);
                                    startOfWeek.setDate(anchor.getDate() - anchor.getDay() + (anchor.getDay() === 0 ? -6 : 1));
                                    startOfWeek.setHours(0, 0, 0, 0);
                                    const endOfWeek = new Date(startOfWeek);
                                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                                    endOfWeek.setHours(23, 59, 59, 999);
                                    return date >= startOfWeek && date <= endOfWeek;
                                }
                                if (viewMode === 'month') {
                                    return date.getMonth() === anchor.getMonth() && date.getFullYear() === anchor.getFullYear();
                                }
                                return true;
                            })
                                .sort(([a], [b]) => a.localeCompare(b));

                            if (filteredGroups.length === 0) {
                                return (
                                    <div className="high-tech-card empty-state">
                                        <div className="zena-intelligence-badge">
                                            <Sparkles size={14} /> No Events Found
                                        </div>
                                        <p>There are no appointments scheduled for this {viewMode}.</p>
                                        <button className="zena-action-btn" onClick={() => {
                                            setSelectedAgendaDate(new Date());
                                            setViewMode('month');
                                        }}>
                                            View Full Month
                                        </button>
                                    </div>
                                );
                            }

                            return filteredGroups.map(([dateKey, dayAppts]) => {
                                const dateObj = new Date(dateKey);
                                const isToday = dateObj.toDateString() === new Date().toDateString();
                                const isPreSelection = selectedSuggestion && dateKey === new Date(selectedSuggestion).toISOString().split('T')[0];

                                return (
                                    <div key={dateKey} id={dateKey} className={`calendar-day-group ${isToday ? 'is-today' : ''} ${isPreSelection ? 'is-suggestion' : ''}`}>
                                        <div className="calendar-date-header">
                                            <div className="date-main">
                                                <span className="date-number">{dateObj.getDate()}</span>
                                                <div className="date-details">
                                                    <span className="day-name">{formatDateSafe(dateObj, { weekday: 'long' })}</span>
                                                    <span className="month-year">{formatDateSafe(dateObj, { month: 'long', year: 'numeric' })}</span>
                                                </div>
                                            </div>
                                            {isToday && <span className="today-badge">Today</span>}
                                        </div>

                                        <div className="appointment-list">
                                            <div className="timeline-trail"></div>
                                            {dayAppts.map(appt => (
                                                <div
                                                    key={appt.id}
                                                    className={`appt-card appt-card--${appt.urgency || 'low'} appt-card--${appt.type}`}
                                                    onClick={() => handleApptClick(appt)}
                                                >
                                                    <div className="appt-time-column">
                                                        <div className="appt-time">
                                                            {appt.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                        </div>
                                                        <div className="appt-dot"></div>
                                                    </div>
                                                    <div className="appt-main-info">
                                                        <div className="appt-type-tag">{appt.type.replace('_', ' ')}</div>
                                                        <div className="appt-title">{appt.title}</div>
                                                        {appt.location && (
                                                            <div className="appt-location">
                                                                <MapPin size={12} />
                                                                {appt.location}
                                                            </div>
                                                        )}
                                                        {appt.property?.type && (
                                                            <div className="appt-prop-type">
                                                                {appt.property.type}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {appt.property?.id && (
                                                        <div className="appt-actions">
                                                            <button
                                                                className="appt-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/properties/${appt.property.id}`);
                                                                }}
                                                            >
                                                                View Property
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </section>

                <aside className="calendar-sidebar">
                    {/* Focus: Next Up - TOP of sidebar for immediate attention */}
                    <div className="sidebar-section">
                        <h2 className="section-title"><span className="focus-title-highlight">Focus:</span> Next Up</h2>
                        {appointments.filter(a => isValidDate(a.time) && a.time > new Date()).length > 0 ? (
                            (() => {
                                const nextAppt = appointments
                                    .filter(a => isValidDate(a.time) && a.time > new Date())
                                    .sort((a, b) => a.time.getTime() - b.time.getTime())[0];

                                return (
                                    <div className="high-tech-card next-event-spotlight" onClick={() => handleApptClick(nextAppt)}>
                                        <div className="spotlight-header">
                                            <Clock size={16} />
                                            <span>Starts in {Math.round((nextAppt.time.getTime() - Date.now()) / (1000 * 60))} mins</span>
                                        </div>
                                        <div className="spotlight-title">{nextAppt.title}</div>
                                        <div className="spotlight-footer">
                                            <MapPin size={12} />
                                            <span>{nextAppt.location}</span>
                                        </div>
                                        <button className="spotlight-action">
                                            Details <ArrowRight size={14} />
                                        </button>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="high-tech-card spotlight-empty">
                                <p>No more events today. Time to catch up on admin!</p>
                            </div>
                        )}
                    </div>

                    {/* Navigation Calendar */}
                    <div className="sidebar-section">
                        <h2 className="section-title">Navigation</h2>
                        <CalendarMiniPicker
                            selectedDate={isValidDate(selectedAgendaDate) ? selectedAgendaDate : new Date()}
                            appointments={appointments}
                            onDateSelect={(date) => {
                                if (!isValidDate(date)) return;
                                setSelectedAgendaDate(date);
                                // Scroll to date section
                                const dateKey = date.toISOString().split('T')[0];
                                const element = document.getElementById(dateKey);
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }}
                        />
                    </div>

                    {/* Zena's Intelligence */}
                    <div className="high-tech-card zena-suggestions sidebar-section">
                        <h2 className="section-title">Zena's Intelligence</h2>
                        <div className="suggestion-item">
                            <span className="suggestion-icon">💡</span>
                            <p>You have {appointments.filter(a => isValidDate(a.time) && a.time.toDateString() === new Date().toDateString()).length} events scheduled for today.</p>
                        </div>
                        <button className="zena-action-btn">Optimize My Day</button>
                    </div>
                </aside>
            </main>


            {/* Removed FAB - Moved to Header */}

            <ScheduleOpenHomeModal
                isOpen={isScheduleModalOpen}
                onClose={() => {
                    setIsScheduleModalOpen(false);
                    setSelectedMilestone(null);
                }}
                property={selectedProperty as any}
                allProperties={properties as any}
                milestone={selectedMilestone}
                onSuccess={() => {
                    loadData(); // Refresh calendar
                }}
            />
        </div>
    );
};
