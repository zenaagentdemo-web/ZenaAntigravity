import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, ChevronUp, ChevronDown, Check, X } from 'lucide-react';
import './ZenaTimePicker.css';

interface ZenaTimePickerProps {
    value: string; // "HH:mm"
    onChange: (value: string) => void;
    label?: string;
    variant?: 'default' | 'godmode';
}

export const ZenaTimePicker: React.FC<ZenaTimePickerProps> = ({
    value,
    onChange,
    label,
    variant = 'default'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Parse value
    const initialHours = parseInt(value.split(':')[0]) || 0;
    const initialMinutes = parseInt(value.split(':')[1]) || 0;
    const [hours, setHours] = useState(initialHours === 0 ? 12 : initialHours > 12 ? initialHours - 12 : initialHours);
    const [minutes, setMinutes] = useState(initialMinutes);
    const [isPM, setIsPM] = useState(initialHours >= 12);

    useEffect(() => {
        const h = parseInt(value.split(':')[0]) || 0;
        const m = parseInt(value.split(':')[1]) || 0;
        setHours(h === 0 ? 12 : h > 12 ? h - 12 : h);
        setMinutes(m);
        setIsPM(h >= 12);
    }, [value]);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX
            });
        }
    }, [isOpen]);

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

    const handleAdjust = (type: 'h' | 'm', delta: number) => {
        if (type === 'h') {
            setHours((prev) => {
                const next = prev + delta;
                if (next > 12) return 1;
                if (next < 1) return 12;
                return next;
            });
        } else {
            setMinutes((prev) => (prev + delta + 60) % 60);
        }
    };

    const handleConfirm = () => {
        let h24 = hours;
        if (isPM && hours < 12) h24 += 12;
        if (!isPM && hours === 12) h24 = 0;

        const hStr = h24.toString().padStart(2, '0');
        const mStr = minutes.toString().padStart(2, '0');
        onChange(`${hStr}:${mStr}`);
        setIsOpen(false);
    };

    const displayTime = `${hours}:${minutes.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;

    return (
        <div className={`zena-timepicker-container ${variant === 'godmode' ? 'variant-godmode' : ''}`} ref={containerRef}>
            <div
                className={`zena-timepicker-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Clock size={16} className="zena-timepicker-icon" />
                <span className="zena-timepicker-value">{displayTime}</span>
            </div>

            {createPortal(
                isOpen && (
                    <div
                        className="zena-timepicker-dropdown"
                        ref={dropdownRef}
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="zena-timepicker-selectors">
                            <div className="zena-time-unit">
                                <button className="zena-time-nav" onClick={() => handleAdjust('h', 1)}><ChevronUp size={16} /></button>
                                <div className="zena-time-value">{hours.toString().padStart(2, '0')}</div>
                                <button className="zena-time-nav" onClick={() => handleAdjust('h', -1)}><ChevronDown size={16} /></button>
                                <span className="unit-label">HRS</span>
                            </div>
                            <div className="zena-time-separator">:</div>
                            <div className="zena-time-unit">
                                <button className="zena-time-nav" onClick={() => handleAdjust('m', 5)}><ChevronUp size={16} /></button>
                                <div className="zena-time-value">{minutes.toString().padStart(2, '0')}</div>
                                <button className="zena-time-nav" onClick={() => handleAdjust('m', -5)}><ChevronDown size={16} /></button>
                                <span className="unit-label">MIN</span>
                            </div>
                            <div className="zena-time-ampm-selector">
                                <button
                                    className={`ampm-btn ${!isPM ? 'active' : ''}`}
                                    onClick={() => setIsPM(false)}
                                >
                                    AM
                                </button>
                                <button
                                    className={`ampm-btn ${isPM ? 'active' : ''}`}
                                    onClick={() => setIsPM(true)}
                                >
                                    PM
                                </button>
                            </div>
                        </div>
                        <div className="zena-timepicker-actions">
                            <button className="zena-timepicker-btn cancel" onClick={() => setIsOpen(false)}>
                                <X size={14} />
                            </button>
                            <button className="zena-timepicker-btn confirm" onClick={handleConfirm}>
                                <Check size={14} /> Confirm
                            </button>
                        </div>
                    </div>
                ),
                document.body
            )}
        </div>
    );
};
