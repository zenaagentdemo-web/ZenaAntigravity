import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X, Lightbulb, MessageSquare, Mic } from 'lucide-react';
import './LogIntelTooltip.css';

interface LogIntelTooltipProps {
    className?: string;
}

export const LogIntelTooltip: React.FC<LogIntelTooltipProps> = ({ className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
    const tooltipRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                tooltipRef.current &&
                buttonRef.current &&
                !tooltipRef.current.contains(e.target as Node) &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Calculate position when opening
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const tooltipHeight = 400; // estimated max height
            const spaceBelow = viewportHeight - rect.bottom;

            let newStyle: React.CSSProperties = {
                position: 'fixed',
                left: rect.left + rect.width / 2,
                transform: 'translateX(-50%)',
                zIndex: 10000
            };

            if (spaceBelow < tooltipHeight && rect.top > tooltipHeight) {
                // Position top
                newStyle.bottom = (viewportHeight - rect.top) + 12;
                setPosition('top');
            } else {
                // Position bottom
                newStyle.top = rect.bottom + 12;
                setPosition('bottom');
            }
            setTooltipStyle(newStyle);
        }
    }, [isOpen]);

    const toggleTooltip = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    return (
        <div className={`log-intel-tooltip-wrapper ${className}`}>
            <button
                ref={buttonRef}
                className="log-intel-help-btn"
                onClick={toggleTooltip}
                aria-label="Learn about Log Intel"
                aria-expanded={isOpen}
            >
                <HelpCircle size={18} />
            </button>

            {isOpen && createPortal(
                <div className="log-intel-tooltip-overlay" onClick={toggleTooltip}>
                    <div
                        ref={tooltipRef}
                        className="log-intel-tooltip"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="log-intel-title"
                    >
                        <div className="log-intel-tooltip__header">
                            <h4 id="log-intel-title"><Lightbulb size={16} /> What is Log Intel?</h4>
                            <button className="log-intel-tooltip__close" onClick={toggleTooltip}>
                                <X size={14} />
                            </button>
                        </div>

                        <div className="log-intel-tooltip__content">
                            <p className="log-intel-tooltip__intro">
                                Build <strong>relationship intelligence</strong> by recording private notes about your contacts.
                                The more you know, the stronger your relationships, and the more deals you close.
                            </p>

                            <div className="log-intel-tooltip__methods">
                                <div className="log-intel-tooltip__method">
                                    <MessageSquare size={16} />
                                    <span><strong>Written Notes</strong> — Type quick observations</span>
                                </div>
                                <div className="log-intel-tooltip__method">
                                    <Mic size={16} />
                                    <span><strong>Voice Notes</strong> — Record while driving or on-site</span>
                                </div>
                            </div>

                            <div className="log-intel-tooltip__tips">
                                <h5>💡 What to Log</h5>
                                <ul>
                                    <li><strong>Personal details</strong> — Kids' names, hobbies, birthday, pets</li>
                                    <li><strong>Motivations</strong> — Why are they buying/selling? Timeline pressures?</li>
                                    <li><strong>Budget / Price</strong> — What can they afford? What do they expect?</li>
                                    <li><strong>Property preferences</strong> — Must-haves, dealbreakers, areas they love</li>
                                    <li><strong>Key conversations</strong> — Promises made, concerns raised</li>
                                    <li><strong>Referral source</strong> — Who introduced them? Good for thank-yous</li>
                                </ul>
                            </div>

                            <div className="log-intel-tooltip__why">
                                <h5>🎯 Why It Matters</h5>
                                <p>
                                    Great agents remember the little things. When you recall their daughter's
                                    graduation or that they wanted a north-facing garden, you build trust
                                    that competitors can't match.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default LogIntelTooltip;
