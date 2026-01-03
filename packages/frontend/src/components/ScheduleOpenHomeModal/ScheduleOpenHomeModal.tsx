import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, MapPin, Check } from 'lucide-react';
import { api } from '../../utils/apiClient';
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
}

export const ScheduleOpenHomeModal: React.FC<ScheduleOpenHomeModalProps> = ({
    isOpen,
    onClose,
    property: initialProperty,
    onSuccess,
    allProperties = []
}) => {
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [time, setTime] = useState<string>('');
    const [type, setType] = useState<string>('open_home');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialProperty) {
                setSelectedPropertyId(initialProperty.id);
            } else if (allProperties.length > 0) {
                setSelectedPropertyId(allProperties[0].id);
            }
            // Default to today
            const today = new Date().toISOString().split('T')[0];
            setDate(today);
            setTime('13:00'); // Default 1pm
            setError(null);
        }
    }, [isOpen, initialProperty, allProperties]);

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

            await api.post(`/properties/${selectedPropertyId}/milestones`, {
                type,
                date: datetime.toISOString(),
                notes: 'Scheduled via Zena Calendar'
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to schedule open home:', err);
            setError(err.response?.data?.error?.message || err.message || 'Failed to schedule open home');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedProperty = initialProperty || allProperties.find(p => p.id === selectedPropertyId);

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="schedule-modal high-tech-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Schedule Open Home</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-content">
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="input-label">
                            <MapPin size={16} />
                            Property
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

                    <div className="form-row">
                        <div className="form-group">
                            <label className="input-label">
                                <Calendar size={16} />
                                Date
                            </label>
                            <input
                                type="date"
                                className="high-tech-input"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="input-label">
                                <Clock size={16} />
                                Time
                            </label>
                            <input
                                type="time"
                                className="high-tech-input"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                required
                            />
                        </div>
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

                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? (
                                'Scheduling...'
                            ) : (
                                <>
                                    <Check size={18} />
                                    Confirm Schedule
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
