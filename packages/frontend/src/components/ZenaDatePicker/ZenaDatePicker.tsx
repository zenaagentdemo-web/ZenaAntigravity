import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, AlertTriangle, Brain, ChevronUp, ChevronDown } from 'lucide-react';
import './ZenaDatePicker.css';

interface Appointment {
    id: string;
    time: Date;
    title: string;
}

interface ZenaDatePickerProps {
    value: string; // ISO string
    onChange: (value: string) => void;
    placeholder?: string;
    appointments?: Appointment[];
    defaultOpen?: boolean;
}

export const ZenaDatePicker: React.FC<ZenaDatePickerProps> = ({
    value,
    onChange,
    placeholder = "Select date and time",
    appointments = [],
    defaultOpen = false
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Sync state with props
    useEffect(() => {
        if (value) {
            const newDate = new Date(value);
            if (!isNaN(newDate.getTime())) {
                setSelectedDate(newDate);
                setCurrentDate(newDate);
            }
        } else {
            setSelectedDate(null);
        }
    }, [value]);

    // Center the dropdown on the screen
    useEffect(() => {
        if (isOpen) {
            // Centered positioning - does not depend on container
            setDropdownPosition({
                top: 0, // Will be overridden by CSS
                left: 0  // Will be overridden by CSS
            });
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDayClick = (day: number) => {
        const newDate = new Date(selectedDate || new Date());
        newDate.setFullYear(currentDate.getFullYear());
        newDate.setMonth(currentDate.getMonth());
        newDate.setDate(day);
        setSelectedDate(newDate);
        onChange(newDate.toISOString());
    };

    const handleTimeClick = (hours: number, minutes: number) => {
        const newDate = new Date(selectedDate || new Date());
        newDate.setHours(hours, minutes, 0, 0);
        setSelectedDate(newDate);
        onChange(newDate.toISOString());
    };

    const handleCustomTimeChange = (type: 'h' | 'm', delta: number) => {
        const newDate = new Date(selectedDate || new Date());
        if (type === 'h') {
            const currentH = newDate.getHours();
            newDate.setHours((currentH + delta + 24) % 24);
        } else {
            const currentM = newDate.getMinutes();
            newDate.setMinutes((currentM + delta * 5 + 60) % 60);
        }
        setSelectedDate(newDate);
        onChange(newDate.toISOString());
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const conflict = selectedDate ? appointments.find(appt => {
        const diff = Math.abs(appt.time.getTime() - selectedDate.getTime());
        return diff < 30 * 60 * 1000; // 30 minute overlap
    }) : null;

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = [];
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);

        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="zena-datepicker-day other-month" />);
        }

        for (let i = 1; i <= totalDays; i++) {
            const isSelected = selectedDate?.getDate() === i &&
                selectedDate?.getMonth() === month &&
                selectedDate?.getFullYear() === year;
            const isToday = new Date().getDate() === i &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

            days.push(
                <div
                    key={i}
                    className={`zena-datepicker-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleDayClick(i); }}
                >
                    {i}
                </div>
            );
        }

        return days;
    };

    const timeSlots = [
        { h: 9, m: 0 }, { h: 10, m: 0 }, { h: 11, m: 0 }, { h: 12, m: 0 },
        { h: 13, m: 0 }, { h: 14, m: 0 }, { h: 15, m: 0 }, { h: 16, m: 0 },
        { h: 17, m: 0 }, { h: 18, m: 0 }, { h: 19, m: 0 }, { h: 20, m: 0 }
    ];

    return (
        <div className="zena-datepicker-container" ref={containerRef}>
            <div
                className={`zena-datepicker-input-wrapper ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <CalendarIcon size={18} className="zena-datepicker-icon" style={{ color: '#00D4FF' }} />
                <div className="zena-datepicker-value">
                    {selectedDate ? formatDate(selectedDate) : <span className="zena-datepicker-placeholder">{placeholder}</span>}
                </div>
            </div>

            {createPortal(
                isOpen && (
                    <div
                        ref={dropdownRef}
                        className="zena-datepicker-dropdown"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="zena-datepicker-header">
                            <div className="zena-datepicker-month-year">
                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </div>
                            <div className="zena-datepicker-nav">
                                <button className="zena-datepicker-nav-btn" onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
                                <button className="zena-datepicker-nav-btn" onClick={handleNextMonth}><ChevronRight size={16} /></button>
                            </div>
                        </div>

                        <div className="zena-datepicker-calendar">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                <div key={day} className="zena-datepicker-weekday">{day}</div>
                            ))}
                            {renderCalendar()}
                        </div>

                        {conflict && (
                            <div className="zena-conflict-warning">
                                <AlertTriangle className="zena-conflict-icon" size={20} />
                                <div className="zena-conflict-content">
                                    <div className="zena-brain-indicator">
                                        <Brain size={12} /> Zena Brain Intelligence
                                    </div>
                                    <div className="zena-conflict-title">Scheduling Conflict</div>
                                    <div className="zena-conflict-message">
                                        Selection overlaps with <strong>{conflict.title}</strong> at {conflict.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                                        Consider adjusting yours by 30 mins.
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            className="zena-datepicker-ok-btn"
                            onClick={() => setIsOpen(false)}
                        >
                            OK
                        </button>
                    </div>
                ),
                document.body
            )}
        </div>
    );
};
