import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, Clock, MapPin, Check, ExternalLink, Trash2, Sparkles, ChevronRight } from 'lucide-react';
import { api } from '../../utils/apiClient';
import { ZenaDatePicker } from '../ZenaDatePicker/ZenaDatePicker';
import { ZenaTimePicker } from '../ZenaTimePicker/ZenaTimePicker';
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
    const [notes, setNotes] = useState<string>('');
    const [type, setType] = useState<string>('meeting'); // Default to generic meeting
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPropertyLinked, setIsPropertyLinked] = useState(false);

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
                setDate(dt.toISOString().split('T')[0]);
                setTime(dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                setNotes(milestone.notes || '');
                setType(milestone.type);
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

                // Default to today
                const today = new Date().toISOString().split('T')[0];
                setDate(today);
                setTime('13:00'); // Default 1pm
                setNotes('');
                setSuggestions([]);
            }
            setError(null);
        }
    }, [isOpen, initialProperty, allProperties, milestone]);

    const fetchRescheduleSuggestions = async (id: string, entityType: 'milestone' | 'timeline_event' | 'task') => {
        setIsLoadingSuggestions(true);
        try {
            const res = await api.get(`/api/calendar/events/${id}/reschedule-suggestions?entityType=${entityType}`);
            if (res.data.suggestions && res.data.suggestions.length > 0) {
                setSuggestions(res.data.suggestions);
                setSuggestionIndex(0);

                // Automatically apply first suggestion
                const first = res.data.suggestions[0];
                setDate(first.date);
                setTime(first.time);
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
    };

    if (!isOpen) return null;

    const performSave = async (overrideDate?: string, overrideTime?: string) => {
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

            console.log(`[ScheduleModal] performSave: datePart=${datePart}, timePart=${timePart}`);
            const datetime = new Date(`${datePart}T${timePart}:00`);

            if (isNaN(datetime.getTime())) {
                console.error(`[ScheduleModal] Invalid datetime: ${datePart}T${timePart}:00`);
                throw new Error('Invalid date or time provided');
            }

            console.log(`[ScheduleModal] Saving event to ${datetime.toISOString()} (Local: ${datetime.toString()})`);

            if (milestone) {
                // EDIT MODE
                console.log(`[ScheduleModal] Edit Mode: milestoneId=${milestone.id}, isTimelineEvent=${milestone.isTimelineEvent}`);
                if (milestone.isTimelineEvent) {
                    await api.put(`/api/timeline/${milestone.id}`, {
                        summary: title,
                        content: notes,
                        timestamp: datetime.toISOString(),
                        metadata: {
                            endTime: new Date(datetime.getTime() + 60 * 60 * 1000).toISOString(),
                            type: type,
                            location: isPropertyLinked ? allProperties.find(p => p.id === selectedPropertyId)?.address : 'TBD'
                        }
                    });
                } else if (milestone.isTask) {
                    await api.put(`/api/tasks/${milestone.id}`, {
                        label: title,
                        dueDate: datetime.toISOString(),
                        propertyId: selectedPropertyId || undefined
                    });
                } else {
                    if (!selectedPropertyId) throw new Error('Property ID missing for milestone update');
                    console.log(`[ScheduleModal] Updating milestone ${milestone.id} on property ${selectedPropertyId}`);
                    await api.put(`/api/properties/${selectedPropertyId}/milestones/${milestone.id}`, {
                        type,
                        title,
                        date: datetime.toISOString(),
                        notes
                    });
                }
            } else {
                // CREATE MODE
                console.log('[ScheduleModal] Create Mode');
                if (selectedPropertyId && isPropertyLinked) {
                    await api.post(`/api/properties/${selectedPropertyId}/milestones`, {
                        type,
                        title,
                        date: datetime.toISOString(),
                        notes
                    });
                } else {
                    await api.post('/api/timeline/events', {
                        summary: title,
                        description: notes,
                        startTime: datetime.toISOString(),
                        endTime: new Date(datetime.getTime() + 60 * 60 * 1000).toISOString(),
                        type: type === 'open_home' ? 'meeting' : type,
                        location: isPropertyLinked ? allProperties.find(p => p.id === selectedPropertyId)?.address : 'TBD',
                        propertyId: isPropertyLinked ? selectedPropertyId : undefined
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

                    <div className="form-row">
                        <div className="form-group">
                            <label className="input-label">
                                <Calendar size={14} />
                                Date
                            </label>
                            <ZenaDatePicker
                                value={date}
                                onChange={setDate}
                                minDate={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <div className="form-group">
                            <label className="input-label">
                                <Clock size={14} />
                                Time
                            </label>
                            <ZenaTimePicker
                                value={time}
                                onChange={setTime}
                            />
                        </div>
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
                                    navigate(`/properties/${selectedPropertyId}`);
                                    onClose();
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
        </div >,
        document.body
    );
};
