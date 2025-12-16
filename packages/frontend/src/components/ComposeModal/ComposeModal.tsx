/**
 * ComposeModal Component
 * 
 * A modal for composing new emails. Similar to ReplyComposer but for fresh threads.
 * Features strict separation of concerns, accessible form fields, and glassmorphism UI.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { hapticFeedback } from '../../utils/hapticFeedback';
import './ComposeModal.css';

export interface ComposeModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback to close the modal */
    onClose: () => void;
    /** Callback when email is sent */
    onSend: (data: { to: string[], subject: string, message: string }) => Promise<void>;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
    isOpen,
    onClose,
    onSend
}) => {
    const [to, setTo] = useState<string[]>([]);
    const [currentToInput, setCurrentToInput] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const toInputRef = useRef<HTMLInputElement>(null);

    // Keyboard navigation setup
    const { announceToScreenReader } = useKeyboardNavigation({
        enableArrowNavigation: false,
        enableTabTrapping: true
    });

    const { prefersReducedMotion, getTransitionDuration } = useReducedMotion();

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setTo([]);
            setCurrentToInput('');
            setSubject('');
            setMessage('');
            setError(null);
            setIsSending(false);

            announceToScreenReader('New message composer opened', 'polite');

            // Focus 'To' input
            setTimeout(() => {
                toInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, announceToScreenReader]);

    // Handle adding recipient on Enter/Comma
    const handleToKeyDown = (e: React.KeyboardEvent) => {
        if (['Enter', ',', 'Tab'].includes(e.key)) {
            e.preventDefault();
            addRecipient();
        }
    };

    const addRecipient = () => {
        const email = currentToInput.trim();
        if (email) {
            if (isValidEmail(email)) {
                if (!to.includes(email)) {
                    setTo([...to, email]);
                    setCurrentToInput('');
                    announceToScreenReader(`Added ${email}`, 'polite');
                } else {
                    setCurrentToInput(''); // Duplicate, just clear
                }
            } else {
                // Ideally show validation error
                announceToScreenReader('Invalid email address', 'assertive');
            }
        }
    };

    const removeRecipient = (email: string) => {
        setTo(to.filter(e => e !== email));
        announceToScreenReader(`Removed ${email}`, 'polite');
    };

    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSend = async () => {
        // Add any pending input as recipient
        if (currentToInput.trim()) {
            addRecipient();
        }

        // Validate
        if (to.length === 0 && !currentToInput.trim()) {
            setError('Please add at least one recipient.');
            return;
        }
        if (!subject.trim()) {
            setError('Please add a subject.');
            return;
        }
        if (!message.trim()) {
            setError('Please add a message.');
            return;
        }

        setIsSending(true);
        setError(null);
        announceToScreenReader('Sending message...', 'polite');

        try {
            await onSend({
                to: [...to, ...(currentToInput && isValidEmail(currentToInput) ? [currentToInput] : [])],
                subject,
                message
            });
            hapticFeedback.success();
            announceToScreenReader('Message sent', 'assertive');
            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to send message.');
            hapticFeedback.error();
            announceToScreenReader('Failed to send message', 'assertive');
        } finally {
            setIsSending(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`compose-modal-backdrop ${prefersReducedMotion ? 'reduced-motion' : ''}`}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="compose-title"
            style={{ '--duration': getTransitionDuration('0.3s') } as React.CSSProperties}
        >
            <div
                ref={modalRef}
                className="compose-modal"
                onClick={e => e.stopPropagation()}
            >
                <div className="compose-modal__header">
                    <h2 id="compose-title">New Message</h2>
                    <button onClick={onClose} className="compose-modal__close" aria-label="Close">×</button>
                </div>

                <div className="compose-modal__body">
                    {/* To Field */}
                    <div className="compose-modal__field">
                        <label htmlFor="to-input">To:</label>
                        <div className="compose-modal__recipients">
                            {to.map(email => (
                                <span key={email} className="recipient-chip">
                                    {email}
                                    <button onClick={() => removeRecipient(email)} aria-label={`Remove ${email}`}>×</button>
                                </span>
                            ))}
                            <input
                                ref={toInputRef}
                                id="to-input"
                                type="text"
                                value={currentToInput}
                                onChange={e => setCurrentToInput(e.target.value)}
                                onKeyDown={handleToKeyDown}
                                onBlur={addRecipient}
                                placeholder={to.length === 0 ? "Recipient email..." : ""}
                                className="compose-modal__input"
                            />
                        </div>
                    </div>

                    {/* Subject Field */}
                    <div className="compose-modal__field">
                        <label htmlFor="subject-input">Subject:</label>
                        <input
                            id="subject-input"
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="Subject..."
                            className="compose-modal__input"
                        />
                    </div>

                    {/* Message Field */}
                    <div className="compose-modal__field compose-modal__field--grow">
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Write your message..."
                            className="compose-modal__textarea"
                        />
                    </div>

                    {error && <div className="compose-modal__error" role="alert">{error}</div>}
                </div>

                <div className="compose-modal__footer">
                    <button onClick={onClose} className="btn-ghost" disabled={isSending}>Cancel</button>
                    <button onClick={handleSend} className="btn-primary" disabled={isSending}>
                        {isSending ? 'Sending...' : 'Send Message'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComposeModal;
