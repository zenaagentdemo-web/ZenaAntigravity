import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Phone, Copy, Check, ExternalLink, Clock, MessageSquare, Zap } from 'lucide-react';
import { api } from '../../utils/apiClient';
import './ZenaCallTooltip.css';

interface CallIntel {
    bestTime: string;
    lastInteraction: string;
    talkingPoints: string[];
}

interface ZenaCallTooltipProps {
    contactId?: string;
    phones: string[];
    contactName: string;
    children: React.ReactElement;
}

export const ZenaCallTooltip: React.FC<ZenaCallTooltipProps> = ({
    contactId,
    phones,
    contactName,
    children
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

    // AI State
    const [callIntel, setCallIntel] = useState<CallIntel | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const triggerRef = useRef<HTMLElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Handle click on the trigger element
    const handleTriggerClick = (e: React.MouseEvent) => {
        if (isMobile && phones.length > 0) {
            // Native dialing on mobile
            window.location.href = `tel:${phones[0]}`;
            return;
        }

        e.stopPropagation();
        e.preventDefault();
        setIsOpen(!isOpen);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                tooltipRef.current &&
                triggerRef.current &&
                !tooltipRef.current.contains(e.target as Node) &&
                !triggerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);

            // Calculate position
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const scrollY = window.scrollY;

                let left = rect.left + rect.width / 2;
                // Keep tooltip within viewport
                const minEdgePadding = 20;
                const expectedWidth = 300; // Increased width for intel
                if (left < expectedWidth / 2 + minEdgePadding) {
                    left = expectedWidth / 2 + minEdgePadding;
                } else if (left > viewportWidth - expectedWidth / 2 - minEdgePadding) {
                    left = viewportWidth - expectedWidth / 2 - minEdgePadding;
                }

                setTooltipStyle({
                    position: 'absolute',
                    top: rect.top + scrollY - 10, // 10px spacing
                    left: left,
                    transform: 'translate(-50%, -100%)',
                    zIndex: 200000
                });
            }
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Fetch AI Intel on Open
    useEffect(() => {
        let isMounted = true;

        async function fetchIntel() {
            if (!contactId || !isOpen || callIntel) return;

            setIsLoading(true);
            try {
                const response = await api.get<CallIntel>(`/api/ask/contact-call-intel/${contactId}`);
                if (isMounted && response.data) {
                    setCallIntel(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch call intel:', error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        fetchIntel();

        return () => { isMounted = false; };
    }, [isOpen, contactId, callIntel]);

    const handleCopy = (phone: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(phone);
        setCopied(phone);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDial = (phone: string, e: React.MouseEvent) => {
        e.stopPropagation();
        window.location.href = `tel:${phone}`;
    };

    // Clone the child to attach the ref and click handler
    const trigger = React.cloneElement(children, {
        ref: triggerRef,
        onClick: handleTriggerClick
    });

    return (
        <>
            {trigger}
            {isOpen && createPortal(
                <div
                    ref={tooltipRef}
                    className="zena-call-tooltip"
                    style={tooltipStyle}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="zena-call-tooltip__header">
                        <Phone size={14} className="zena-call-tooltip__icon" />
                        <span className="zena-call-tooltip__title">Contact {contactName}</span>
                    </div>

                    <div className="zena-call-tooltip__content">
                        {phones.length > 0 ? (
                            phones.map((phone, idx) => (
                                <div key={idx} className="zena-call-tooltip__row">
                                    <span className="zena-call-tooltip__number">{phone}</span>
                                    <div className="zena-call-tooltip__actions">
                                        <button
                                            className="zena-call-tooltip__btn"
                                            onClick={(e) => handleCopy(phone, e)}
                                            title="Copy number"
                                        >
                                            {copied === phone ? <Check size={14} color="#00FF88" /> : <Copy size={14} />}
                                        </button>
                                        <button
                                            className="zena-call-tooltip__btn dial"
                                            onClick={(e) => handleDial(phone, e)}
                                            title="Dial number"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="zena-call-tooltip__empty">No phone number available</div>
                        )}

                        {contactId && (
                            <div className="zena-call-intel-wrapper">
                                {isLoading ? (
                                    <div className="zena-call-loading">
                                        <Zap size={12} className="spinning" />
                                        <span>Zena is analyzing calendar & history...</span>
                                    </div>
                                ) : callIntel ? (
                                    <>
                                        <div className="zena-call-intel-section">
                                            <div className="zena-intel-label">
                                                <Clock size={10} />
                                                <span>Best Time To Call</span>
                                            </div>
                                            <div className="zena-intel-value">{callIntel.bestTime}</div>
                                        </div>

                                        <div className="zena-call-intel-section">
                                            <div className="zena-intel-label">
                                                <MessageSquare size={10} />
                                                <span>Talking Points</span>
                                            </div>
                                            <ul className="zena-talking-points">
                                                {callIntel.talkingPoints.map((point, i) => (
                                                    <li key={i}>{point}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        )}
                    </div>
                    <div className="zena-call-tooltip__arrow" />
                </div>,
                document.body
            )}
        </>
    );
};
