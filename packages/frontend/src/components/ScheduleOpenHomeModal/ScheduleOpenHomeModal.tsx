import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, Clock, MapPin, Check, ExternalLink, Trash2, Sparkles, ChevronRight, Moon, Bell } from 'lucide-react';
import { api } from '../../utils/apiClient';
import { getLocalISODate } from '../../utils/dateUtils';
import { ZenaDatePicker } from '../ZenaDatePicker/ZenaDatePicker';
import { ZenaTimePicker } from '../ZenaTimePicker/ZenaTimePicker';
// @ts-ignore
import { ZenaConflictModal } from '../ZenaConflictModal/ZenaConflictModal';
import './ScheduleOpenHomeModal.css';

interface Property {
    id: string;
    address: string;
}

interface ScheduleOpenHomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    property?: Property;
    onSuccess: () => void;
    /** Pass all properties if opened from Calendar without a specific property context */
    allProperties?: Property[];
    /** Provide milestone data for edit mode */
    milestone?: {
        id: string;
        title: string;
        date: string;
        notes?: string;
        type: string;
        isTimelineEvent?: boolean;
        isMilestone?: boolean;
        isTask?: boolean;
        location?: string;
    };
}

interface RescheduleSuggestion {
    date: string;
    time: string;
    reasoning: string;
}

export const ScheduleOpenHomeModal: React.FC<ScheduleOpenHomeModalProps> = ({
    isOpen,
    onClose,
    property: initialProperty,
    onSuccess,
    allProperties = [],
    milestone
}) => {
    const navigate = useNavigate();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [time, setTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>(''); // New State for End Time
    const [isOvernight, setIsOvernight] = useState(false);
    const [notes, setNotes] = useState<string>('');
    const [type, setType] = useState<string>('meeting'); // Default to generic meeting
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reminder, setReminder] = useState<string | null>(null);
    const [location, setLocation] = useState<string>('');



    const [isPropertyLinked, setIsPropertyLinked] = useState(false);

    // Contact Linking State
    const [isContactLinked, setIsContactLinked] = useState(false);
    const [selectedContactId, setSelectedContactId] = useState<string>('');
    const [allContacts, setAllContacts] = useState<any[]>([]);

    // Conflict State
    const [conflictData, setConflictData] = useState<any>(null);
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [pendingSave, setPendingSave] = useState<{ date: string, time: string } | null>(null);

    // Rescheduling Suggestions State
    const [suggestions, setSuggestions] = useState<RescheduleSuggestion[]>([]);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);


    useEffect(() => {
        if (isOpen) {
            if (milestone) {
                // Edit mode
                setTitle(milestone.title);
                const dt = new Date(milestone.date);
                setDate(getLocalISODate(dt));
                setTime(dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));

                // Initialize End Time
                if ((milestone as any).endTime) {
                    const endDt = new Date((milestone as any).endTime);
                    setEndTime(endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));

                    // Check if overnight
                    const startDt = new Date(milestone.date);
                    // If end date is on a different day than start date
                    if (endDt.getDate() !== startDt.getDate() || endDt.getMonth() !== startDt.getMonth() || endDt.getFullYear() !== startDt.getFullYear()) {
                        setIsOvernight(true);
                    } else {
                        setIsOvernight(false);
                    }
                } else {
                    // Default to 1 hour after start if not present
                    const endDt = new Date(dt.getTime() + 60 * 60 * 1000);
                    setEndTime(endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                    setIsOvernight(false);
                }

                setNotes(milestone.notes || '');
                setType(milestone.type);
                setReminder((milestone as any).reminder || null);
                setLocation((milestone as any).location || (milestone as any).metadata?.location || '');
                // If it's edit mode, initialProperty should be passed or we find it from allProperties
                if (initialProperty) {
                    setSelectedPropertyId(initialProperty.id);
                    setIsPropertyLinked(true);
                } else if (!selectedPropertyId && allProperties.length > 0) {
                    // Try to find property if we have an ID but no object (fallback)
                }

                // Fetch suggestions for rescheduling
                fetchRescheduleSuggestions(milestone.id, milestone.isMilestone ? 'milestone' : (milestone.isTask ? 'task' : 'timeline_event'));
            } else {
                // Create mode
                if (initialProperty) {
                    setSelectedPropertyId(initialProperty.id);
                    setIsPropertyLinked(true);
                    setType('open_home'); // Default to open home if property context
                    setTitle('Open Home');
                } else {
                    // Generic mode
                    setSelectedPropertyId('');
                    setIsPropertyLinked(false);
                    setType('meeting');
                    setTitle('Meeting');
                }

                // Default to next nearest hour
                // Default to next nearest hour
                const now = new Date();
                const nextHour = new Date(now);
                nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

                setDate(getLocalISODate(nextHour));
                setTime(nextHour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));

                const defaultEnd = new Date(nextHour);
                defaultEnd.setMinutes(defaultEnd.getMinutes() + 30);
                setEndTime(defaultEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                setNotes('');
                setSuggestions([]);
                setIsOvernight(false);
                setIsContactLinked(false);
                setSelectedContactId('');
                setReminder(null);
                setLocation('');
            }
            setError(null);

            // Initialize Contact state if editing
            if (milestone && isOpen) {
                const m = milestone as any;
                if (m.contactId) {
                    setSelectedContactId(m.contactId);
                    setIsContactLinked(true);
                } else {
                    setIsContactLinked(false);
                    setSelectedContactId('');
                }
            }
        }
    }, [isOpen, initialProperty, allProperties, milestone]);

    // Fetch contacts on mount
    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const res = await api.get('/api/contacts');
                if (res.data && res.data.contacts) {
                    setAllContacts(res.data.contacts);
                }
            } catch (err) {
                console.error('Failed to fetch contacts for selector', err);
            }
        };
        if (isOpen) {
            fetchContacts();
        }
    }, [isOpen]);

    const fetchRescheduleSuggestions = async (id: string, entityType: 'milestone' | 'timeline_event' | 'task') => {
        setIsLoadingSuggestions(true);
        try {
            const res = await api.get(`/api/calendar/events/${id}/reschedule-suggestions?entityType=${entityType}`, { cache: false });
            console.log(`[ScheduleModal] Suggestions fetched for ${id}:`, res.data.suggestions);
            if (res.data.suggestions && Array.isArray(res.data.suggestions) && res.data.suggestions.length > 0) {
                setSuggestions(res.data.suggestions);
                setSuggestionIndex(0);

                // Automatically apply first suggestion
                const first = res.data.suggestions[0];
                setDate(first.date);
                setTime(first.time);
                // Update end time accordingly (maintain duration)
                // Simplified: just set specific duration or keep existing logic? 
                // For now, let's just keep the existing end time logic or reset it?
                // Ideally we shift the end time by the same delta, but simpler to just default to +1h for suggestion
                const [h, m] = first.time.split(':').map(Number);
                const suggDate = new Date();
                suggDate.setHours(h + 1, m);
                setEndTime(suggDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));

                // Reset overnight for suggestions unless we calculate it
                setIsOvernight(false);

            }
        } catch (err) {
            console.error('Failed to fetch reschedule suggestions:', err);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    const handleNextSuggestion = () => {
        if (suggestions.length === 0) return;
        const nextIndex = (suggestionIndex + 1) % suggestions.length;
        setSuggestionIndex(nextIndex);
        const suggestion = suggestions[nextIndex];
        setDate(suggestion.date);
        setTime(suggestion.time);
        // Update end time
        const [h, m] = suggestion.time.split(':').map(Number);
        const suggDate = new Date();
        suggDate.setHours(h + 1, m);
        setEndTime(suggDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
        setIsOvernight(false);
    };

    // Auto-detect overnight when times change
    useEffect(() => {
        if (!time || !endTime) return;

        const [startH, startM] = time.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;

        if (endMins < startMins) {
            setIsOvernight(true);
        }
        // If end > start, we don't necessarily turn OFF overnight, user might want 2pm -> 3pm next day.
        // But if they uncheck it, we might want to warn or not. 
        // For now let's just allow the user to control it, but auto-enable if end < start.
    }, [time, endTime]);

    // Update location when property changes, if not manually edited or if in create mode
    useEffect(() => {
        if (selectedPropertyId && isPropertyLinked && !milestone) {
            const prop = allProperties.find(p => p.id === selectedPropertyId) || initialProperty;
            if (prop) {
                setLocation(prop.address);
            }
        }
    }, [selectedPropertyId, isPropertyLinked, allProperties, initialProperty, milestone]);

    // Initialize contact state from milestone if editing
    useEffect(() => {
        if (milestone && isOpen) {
            // We need to check if the milestone has a linked contact. 
            // The timeline event typically stores this in metadata.contactReference or entityId
            const m = milestone as any;
            // Check if we have contact info in the milestone object (depends on how it's passed)
            // But for now, let's assume if it was passed, we might need to look it up or the parent needs to pass it.
            // Given the current props interface, we might need to rely on the parent or fetch the event details if missing.
            // However, for MVP, let's check if the metadata has contactReference
            // NOTE: The prop `milestone` is a simplified object. We might need to fetch full details if not present.
        }
    }, [milestone, isOpen]);

    if (!isOpen) return null;

    const performSave = async (overrideDate?: string, overrideTime?: string, force: boolean = false) => {
        setError(null);
        setIsSubmitting(true);

        // If overrides are provided, update the relevant states so the UI reflects the change (optional but good practice)
        if (overrideDate) {
            const cleanDate = overrideDate.includes('T') ? overrideDate.split('T')[0] : overrideDate;
            setDate(cleanDate);
        }
        if (overrideTime) setTime(overrideTime);

        try {
            if (isPropertyLinked && !selectedPropertyId) {
                throw new Error('Please select a property to link');
            }

            // Use provided values or current state
            // Handle if date is already a full ISO string (ZenaDatePicker behavior)
            const datePart = (overrideDate || date).includes('T') ? (overrideDate || date).split('T')[0] : (overrideDate || date);

            // Handle if time is a full ISO string or just HH:mm
            let timePart = overrideTime || time;
            if (timePart.includes('T')) {
                const dt = new Date(timePart);
                timePart = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            }

            let endTimePart = endTime;
            if (endTimePart.includes('T')) {
                const dt = new Date(endTimePart);
                endTimePart = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            }

            console.log(`[ScheduleModal] performSave: datePart=${datePart}, timePart=${timePart}, endTimePart=${endTimePart}, force=${force}, isOvernight=${isOvernight}`);
            const startDatetime = new Date(`${datePart}T${timePart}:00`);
            let endDatetime = new Date(`${datePart}T${endTimePart}:00`);

            // Handle overnight events
            if (isOvernight) {
                endDatetime.setDate(endDatetime.getDate() + 1);
            } else {
                if (endDatetime < startDatetime) {
                    // If NOT marked overnight but End < Start, this is invalid
                    throw new Error('End time cannot be earlier than start time unless "Ends Tomorrow" is checked.');
                }
            }

            if (isNaN(startDatetime.getTime()) || isNaN(endDatetime.getTime())) {
                console.error(`[ScheduleModal] Invalid datetime: ${datePart}T${timePart}:00`);
                throw new Error('Invalid date or time provided');
            }

            // CONFLICT CHECK (Only for new events or time changes usually, but let's do generally)
            // Skip check if force is true
            if (!force && !milestone) { // Assuming we only check specific conflicts on Create for now to match spec "Create Event"
                try {
                    const conflictRes = await api.post('/api/calendar-optimization/check-conflict', {
                        start: startDatetime.toISOString(),
                        end: endDatetime.toISOString()
                    });

                    if (conflictRes.data.success && conflictRes.data.hasConflict) {
                        console.log('Conflict Detected:', conflictRes.data);
                        setConflictData(conflictRes.data);
                        setPendingSave({ date: datePart, time: timePart }); // Store intent
                        setShowConflictModal(true);
                        setIsSubmitting(false);
                        return; // HALT SAVE
                    }
                } catch (cErr) {
                    console.warn('Conflict check failed, proceeding anyway', cErr);
                }
            }

            console.log(`[ScheduleModal] Saving event: ${startDatetime.toISOString()} to ${endDatetime.toISOString()}`);

            if (milestone) {
                // EDIT MODE
                console.log(`[ScheduleModal] Edit Mode: milestoneId=${milestone.id}, isTimelineEvent=${milestone.isTimelineEvent}`);
                if (milestone.isTimelineEvent) {
                    await api.put(`/api/timeline/${milestone.id}`, {
                        summary: title,
                        content: notes,
                        timestamp: startDatetime.toISOString(),
                        metadata: {
                            endTime: endDatetime.toISOString(),
                            type: type,
                            location: location || 'TBD',
                            propertyId: selectedPropertyId || undefined,
                            contactId: selectedContactId || undefined,
                            reminder: reminder || undefined
                        }
                    });
                } else if (milestone.isTask) {
                    await api.put(`/api/tasks/${milestone.id}`, {
                        label: title,
                        dueDate: startDatetime.toISOString(),
                        propertyId: selectedPropertyId || undefined
                    });
                } else {
                    if (!selectedPropertyId) throw new Error('Property ID missing for milestone update');
                    console.log(`[ScheduleModal] Updating milestone ${milestone.id} on property ${selectedPropertyId}`);
                    await api.put(`/api/properties/${selectedPropertyId}/milestones/${milestone.id}`, {
                        type,
                        title,
                        date: startDatetime.toISOString(),
                        endTime: endDatetime.toISOString(),
                        notes,
                        location: location || undefined,
                        reminder: reminder || undefined
                    });
                }
            } else {
                // CREATE MODE
                console.log('[ScheduleModal] Create Mode');
                if (selectedPropertyId && isPropertyLinked) {
                    await api.post(`/api/properties/${selectedPropertyId}/milestones`, {
                        type,
                        title,
                        date: startDatetime.toISOString(),
                        endTime: endDatetime.toISOString(),
                        notes,
                        location: location || undefined,
                        reminder: reminder || undefined
                    });
                } else {
                    await api.post('/api/timeline/events', {
                        summary: title,
                        description: notes,
                        startTime: startDatetime.toISOString(),
                        endTime: endDatetime.toISOString(),
                        type: type === 'open_home' ? 'meeting' : type,
                        location: location || 'TBD',

                        propertyId: isPropertyLinked ? selectedPropertyId : undefined,
                        contactId: isContactLinked ? selectedContactId : undefined,
                        reminder: reminder || undefined
                    });
                }
            }

            console.log('[ScheduleModal] Save successful, refreshing data...');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to save event:', err);
            setError(err.response?.data?.error?.message || err.message || 'Failed to save event');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await performSave();
    };

    const handleDelete = async () => {
        if (!milestone) return;

        if (!window.confirm('Are you sure you want to delete this event?')) return;

        setIsSubmitting(true);
        try {
            if (milestone.isTimelineEvent) {
                await api.delete(`/api/timeline/${milestone.id}`);
            } else if (milestone.isTask) {
                await api.delete(`/api/tasks/${milestone.id}`);
            } else if (selectedPropertyId) {
                await api.delete(`/api/properties/${selectedPropertyId}/milestones/${milestone.id}`);
            } else {
                throw new Error('Could not determine how to delete this event');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to delete event:', err);
            setError(err.response?.data?.error?.message || err.message || 'Failed to delete event');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedProperty = initialProperty || allProperties.find(p => p.id === selectedPropertyId);

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="schedule-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        <Calendar size={22} color="#00d4ff" />
                        {milestone ? 'Edit Event' : (type === 'open_home' ? 'Schedule Open Home' : 'New Event')}
                    </h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={22} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-content">
                    {error && (
                        <div className="error-message">
                            <X size={16} />
                            {error}
                        </div>
                    )}

                    {/* AI RESCHEDULING SUGGESTIONS */}
                    {milestone && (
                        <div className="ai-reschedule-banner">
                            <div className="ai-reschedule-info">
                                <div className="ai-badge">
                                    <Sparkles size={14} />
                                    <span>Zena Intelligence</span>
                                </div>
                                {isLoadingSuggestions ? (
                                    <p className="ai-message">Finding best time for you...</p>
                                ) : suggestions.length > 0 ? (
                                    <div className="ai-suggestion-body">
                                        <div className="suggested-slot-direct">
                                            <div className="slot-item">
                                                <Calendar size={14} />
                                                <span>{new Date(suggestions[suggestionIndex].date).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                            </div>
                                            <div className="slot-item">
                                                <Clock size={14} />
                                                <span>{suggestions[suggestionIndex].time}</span>
                                            </div>
                                        </div>
                                        <p className="ai-message">
                                            {suggestions[suggestionIndex].reasoning}
                                        </p>
                                        <div className="ai-actions">
                                            <button
                                                type="button"
                                                className="accept-suggestion-btn"
                                                onClick={() => {
                                                    const suggestion = suggestions[suggestionIndex];
                                                    console.log('[ScheduleModal] Accepting suggestion:', suggestion);
                                                    performSave(suggestion.date, suggestion.time);
                                                }}
                                            >
                                                <Check size={16} />
                                                Reschedule to this time
                                            </button>
                                            <button
                                                type="button"
                                                className="next-suggestion-btn"
                                                onClick={handleNextSuggestion}
                                            >
                                                Next suggested time
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="ai-message">I'm ready to help you reschedule if needed.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PROPERTY CONTEXT SECTION */}
                    <div className="form-group">
                        <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label className="input-label" style={{ margin: 0 }}>
                                <MapPin size={14} />
                                Property Context
                            </label>
                            {!initialProperty && (
                                <button
                                    type="button"
                                    className={`link-property-toggle ${isPropertyLinked ? 'active' : ''}`}
                                    onClick={() => {
                                        const newState = !isPropertyLinked;
                                        setIsPropertyLinked(newState);
                                        if (!newState) setSelectedPropertyId('');
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '12px',
                                        padding: '4px 10px',
                                        color: isPropertyLinked ? '#00d4ff' : 'rgba(255,255,255,0.5)',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        borderColor: isPropertyLinked ? '#00d4ff' : 'rgba(255,255,255,0.2)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {isPropertyLinked ? 'Linked' : 'Link Property?'}
                                </button>
                            )}
                        </div>

                        {initialProperty ? (
                            <div className="readonly-value">{initialProperty.address}</div>
                        ) : (
                            isPropertyLinked && (
                                <select
                                    className="high-tech-input"
                                    value={selectedPropertyId}
                                    onChange={e => setSelectedPropertyId(e.target.value)}
                                    required={isPropertyLinked}
                                >
                                    <option value="">Select a property...</option>
                                    {allProperties.map(p => (
                                        <option key={p.id} value={p.id}>{p.address}</option>
                                    ))}
                                </select>
                            )
                        )}
                    </div>

                    {/* CONTACT CONTEXT SECTION */}
                    <div className="form-group">
                        <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label className="input-label" style={{ margin: 0 }}>
                                <ExternalLink size={14} />
                                Linked Contact
                            </label>
                            <button
                                type="button"
                                className={`link-property-toggle ${isContactLinked ? 'active' : ''}`}
                                onClick={() => {
                                    const newState = !isContactLinked;
                                    setIsContactLinked(newState);
                                    if (!newState) setSelectedContactId('');
                                }}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '12px',
                                    padding: '4px 10px',
                                    color: isContactLinked ? '#00d0ff' : 'rgba(255,255,255,0.5)', // Distinct color
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    borderColor: isContactLinked ? '#00d0ff' : 'rgba(255,255,255,0.2)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {isContactLinked ? 'Linked' : 'Link Contact?'}
                            </button>
                            {isContactLinked && selectedContactId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigate(`/contacts/${selectedContactId}`, { state: { fromZena: true } });
                                    }}
                                    style={{
                                        background: 'rgba(168, 85, 247, 0.2)',
                                        border: '1px solid rgba(168, 85, 247, 0.4)',
                                        borderRadius: '12px',
                                        padding: '4px 10px',
                                        color: '#d8b4fe',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Sparkles size={12} />
                                    View Contact
                                </button>
                            )}
                        </div>

                        {isContactLinked && (
                            <select
                                className="high-tech-input"
                                value={selectedContactId}
                                onChange={e => setSelectedContactId(e.target.value)}
                                required={isContactLinked}
                            >
                                <option value="">Select a contact...</option>
                                {allContacts.map(c => (
                                    <option key={c.id} value={c.id}>{c.name || 'Unknown'} ({c.role || c.type || 'Contact'})</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="input-label">Event Type</label>
                        <div className="type-selector" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            <button
                                type="button"
                                className={`type-btn ${type === 'open_home' ? 'active' : ''}`}
                                onClick={() => {
                                    setType('open_home');
                                    setTitle('Open Home');
                                }}
                            >
                                Open Home
                            </button>
                            <button
                                type="button"
                                className={`type-btn ${type === 'meeting' ? 'active' : ''}`}
                                onClick={() => {
                                    setType('meeting');
                                    setTitle('Meeting');
                                }}
                            >
                                Meeting
                            </button>
                            <button
                                type="button"
                                className={`type-btn ${type === 'personal' ? 'active' : ''}`}
                                onClick={() => {
                                    setType('personal');
                                    setTitle('Personal');
                                }}
                            >
                                Personal
                            </button>
                            <button
                                type="button"
                                className={`type-btn ${type === 'other' ? 'active' : ''}`}
                                onClick={() => {
                                    setType('other');
                                    setTitle('Event');
                                }}
                            >
                                Other
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="input-label">Event Title</label>
                        <input
                            type="text"
                            className="high-tech-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Lunch with Agent"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="input-label">
                            <MapPin size={14} />
                            Location
                        </label>
                        <input
                            type="text"
                            className="high-tech-input"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="Enter location address..."
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="input-label">
                                <Calendar size={14} />
                                Date
                            </label>
                            <ZenaDatePicker
                                value={date}
                                onChange={setDate}
                                minDate={getLocalISODate(new Date())}
                            />
                        </div>
                        <div className="form-group">
                            <label className="input-label">
                                <Clock size={14} />
                                Start Time
                            </label>
                            <ZenaTimePicker
                                value={time}
                                onChange={setTime}
                            />
                        </div>
                        <div className="form-group">
                            <label className="input-label">
                                <Clock size={14} />
                                End Time
                            </label>
                            <ZenaTimePicker
                                value={endTime}
                                onChange={setEndTime}
                            />
                        </div>
                    </div>

                    <div className="form-group checkbox-group">
                        <label className={`custom-checkbox-container ${isOvernight ? 'checked' : ''}`}>
                            <input
                                type="checkbox"
                                checked={isOvernight}
                                onChange={(e) => setIsOvernight(e.target.checked)}
                            />
                            <span className="checkmark">
                                {isOvernight && <Check size={12} strokeWidth={4} />}
                            </span>
                            <span className="checkbox-label">
                                <Moon size={14} />
                                Overnight / Ends Tomorrow
                            </span>
                        </label>
                    </div>

                    <div className="form-group">
                        <label className="input-label" htmlFor="reminder-select">
                            <Bell size={14} />
                            Reminder
                        </label>
                        <select
                            id="reminder-select"
                            className="high-tech-input"
                            value={reminder || ''}
                            onChange={(e) => setReminder(e.target.value || null)}
                        >
                            <option value="">None</option>
                            <option value="5m">5 minutes before</option>
                            <option value="15m">15 minutes before</option>
                            <option value="30m">30 minutes before</option>
                            <option value="1h">1 hour before</option>
                            <option value="1d">1 day before</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="input-label">Notes / Instructions</label>
                        <textarea
                            className="high-tech-input"
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Add any specific details for this event..."
                        />
                    </div>

                    <div className="modal-actions">
                        {milestone && (
                            <button
                                type="button"
                                className="delete-btn"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                                title="Delete Event"
                            >
                                <Trash2 size={18} />
                                Delete
                            </button>
                        )}
                        {selectedPropertyId && (
                            <button
                                type="button"
                                className="secondary-action-btn"
                                onClick={() => {
                                    navigate(`/properties/${selectedPropertyId}`, { state: { fromCalendar: true } });
                                }}
                                style={{
                                    marginRight: 'auto',
                                    padding: '8px 12px',
                                    background: 'rgba(0, 212, 255, 0.1)',
                                    border: '1px solid rgba(0, 212, 255, 0.3)',
                                    borderRadius: '8px',
                                    color: '#00d4ff',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <ExternalLink size={14} />
                                View Property
                            </button>
                        )}
                        {selectedContactId && isContactLinked && (
                            <button
                                type="button"
                                className="secondary-action-btn"
                                onClick={() => {
                                    navigate(`/contacts/${selectedContactId}`, { state: { fromCalendar: true } });
                                }}
                                style={{
                                    marginRight: '8px',
                                    padding: '8px 12px',
                                    background: 'rgba(0, 208, 255, 0.1)',
                                    border: '1px solid rgba(0, 208, 255, 0.3)',
                                    borderRadius: '8px',
                                    color: '#00d0ff',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                <ExternalLink size={14} />
                                View Contact
                            </button>
                        )}
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Dismiss
                        </button>
                        <button
                            type="submit"
                            className="create-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : (milestone ? 'Save Changes' : 'Create Event')}
                            <Check size={18} />
                        </button>
                    </div>
                </form>
            </div >

            <ZenaConflictModal
                isOpen={showConflictModal}
                onClose={() => setShowConflictModal(false)}
                conflictData={conflictData}
                requestedTime={pendingSave || { date, time }}
                newEventTitle={title}
                onForceCreate={() => {
                    setShowConflictModal(false);
                    // Force save with original requested time
                    performSave(pendingSave?.date, pendingSave?.time, true);
                }}
                onAcceptProposal={() => {
                    if (conflictData?.proposal) {
                        setShowConflictModal(false);
                        // Save with proposed time
                        const newDate = new Date(conflictData.proposal.startTime);
                        const nDate = getLocalISODate(newDate);
                        const nTime = newDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                        performSave(nDate, nTime, true);
                    }
                }}
            />
        </div >,
        document.body
    );
};
