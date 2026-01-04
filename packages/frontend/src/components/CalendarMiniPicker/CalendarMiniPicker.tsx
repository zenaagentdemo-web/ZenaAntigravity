import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './CalendarMiniPicker.css';

interface CalendarMiniPickerProps {
    onDateSelect: (date: Date) => void;
    selectedDate: Date | null;
    appointments?: any[];
}

export const CalendarMiniPicker: React.FC<CalendarMiniPickerProps> = ({ onDateSelect, selectedDate, appointments = [] }) => {
    const [viewDate, setViewDate] = React.useState(new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const renderDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const days = [];
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);
        const today = new Date();

        // Empty slots
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="mini-day empty" />);
        }

        // Real days
        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(year, month, d);
            const dateStr = date.toISOString().split('T')[0];
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === today.toDateString();

            // Check if there are appointments on this day
            const hasAppointments = appointments.some(appt => {
                const apptDate = new Date(appt.time).toISOString().split('T')[0];
                return apptDate === dateStr;
            });

            days.push(
                <div
                    key={d}
                    className={`mini-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${hasAppointments ? 'has-events' : ''}`}
                    onClick={() => onDateSelect(date)}
                >
                    {d}
                    {hasAppointments && <div className="event-indicator"></div>}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="mini-picker-container">
            <div className="mini-picker-header">
                <span className="current-month">
                    {viewDate.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })}
                </span>
                <div className="mini-nav">
                    <button onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
                    <button onClick={handleNextMonth}><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="mini-picker-grid">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="mini-weekday">{d}</div>
                ))}
                {renderDays()}
            </div>
        </div>
    );
};
