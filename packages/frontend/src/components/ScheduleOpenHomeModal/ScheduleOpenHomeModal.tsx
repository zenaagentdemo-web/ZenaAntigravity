import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, MapPin, Check } from 'lucide-react';
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
    };
}

export const ScheduleOpenHomeModal: React.FC<ScheduleOpenHomeModalProps> = ({
    isOpen,
    onClose,
    property: initialProperty,
    onSuccess,
    allProperties = [],
    milestone
}) => {
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [time, setTime] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [type, setType] = useState<string>('open_home');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            } else {
                // Create mode
                if (initialProperty) {
                    setSelectedPropertyId(initialProperty.id);
                } else if (allProperties.length > 0) {
                    setSelectedPropertyId(allProperties[0].id);
                }

                // Default Title based on type
                setTitle(type === 'open_home' ? 'Open Home' : type === 'viewing' ? 'Private Viewing' : 'Auction');

                // Default to today
                const today = new Date().toISOString().split('T')[0];
                setDate(today);
                setTime('13:00'); // Default 1pm
                setNotes('');
            }
            setError(null);
        }
    }, [isOpen, initialProperty, allProperties, type, milestone]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (!selectedPropertyId) {
                throw new Error('Please select a property');
            }

            // Construct ISO date string from date and time
            const datetime = new Date(`${date}T${time}:00`);

            if (milestone) {
                // Update existing milestone
                await api.put(`/api/properties/${selectedPropertyId}/milestones/${milestone.id}`, {
                    type,
                    title,
                    date: datetime.toISOString(),
                    notes
                });
            } else {
                // Create new milestone
                await api.post(`/api/properties/${selectedPropertyId}/milestones`, {
                    type,
                    title: title || (type === 'open_home' ? 'Open Home' : 'Property Event'),
                    date: datetime.toISOString(),
                    notes: notes || 'Scheduled via Zena Calendar'
                });
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to save milestone:', err);
            setError(err.response?.data?.error?.message || err.message || 'Failed to save milestone');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!milestone || !selectedPropertyId) return;

        if (!window.confirm('Are you sure you want to delete this event?')) return;

        setIsSubmitting(true);
        try {
            await api.delete(`/api/properties/${selectedPropertyId}/milestones/${milestone.id}`);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to delete milestone:', err);
            setError(err.response?.data?.error?.message || err.message || 'Failed to delete milestone');
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
                        {milestone ? 'Edit Event' : (type === 'open_home' ? 'Schedule Open Home' : 'New Property Event')}
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

                    <div className="form-group">
                        <label className="input-label">
                            <MapPin size={14} />
                            Property Context
                        </label>
                        {initialProperty ? (
                            <div className="readonly-value">{initialProperty.address}</div>
                        ) : (
                            <select
                                className="high-tech-input"
                                value={selectedPropertyId}
                                onChange={e => setSelectedPropertyId(e.target.value)}
                                required
                            >
                                <option value="">Select a property...</option>
                                {allProperties.map(p => (
                                    <option key={p.id} value={p.id}>{p.address}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="input-label">Event Type</label>
                        <div className="type-selector">
                            <button
                                type="button"
                                className={`type-btn ${type === 'open_home' ? 'active' : ''}`}
                                onClick={() => setType('open_home')}
                            >
                                Open Home
                            </button>
                            <button
                                type="button"
                                className={`type-btn ${type === 'viewing' ? 'active' : ''}`}
                                onClick={() => setType('viewing')}
                            >
                                Viewing
                            </button>
                            <button
                                type="button"
                                className={`type-btn ${type === 'auction' ? 'active' : ''}`}
                                onClick={() => setType('auction')}
                            >
                                Auction
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="input-label">Event Title</label>
                        <input
                            type="text"
                            className="high-tech-input"
                            placeholder="e.g. Saturday Open Home"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
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
                                value={date ? new Date(`${date}T12:00:00`).toISOString() : ''}
                                onChange={(isoString) => {
                                    if (isoString) {
                                        const d = new Date(isoString);
                                        const yyyy = d.getFullYear();
                                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                                        const dd = String(d.getDate()).padStart(2, '0');
                                        setDate(`${yyyy}-${mm}-${dd}`);
                                    }
                                }}
                                placeholder="Select date"
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
                            placeholder="Add any specific details for this event..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            style={{ resize: 'none' }}
                        />
                    </div>

                    <div className="modal-actions">
                        {milestone && (
                            <button type="button" className="delete-btn" onClick={handleDelete} disabled={isSubmitting}>
                                Delete
                            </button>
                        )}
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Dismiss
                        </button>
                        <button type="submit" className="submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? (
                                'Syncing...'
                            ) : (
                                <>
                                    <Check size={20} />
                                    {milestone ? 'Save Changes' : 'Create Event'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
