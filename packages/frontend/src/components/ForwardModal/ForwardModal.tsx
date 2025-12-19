/**
 * ForwardModal Component
 * 
 * Modal for forwarding email threads to other contacts.
 * Features recipient input with email validation and optional message.
 */

import React, { useState, useRef, useEffect } from 'react';
import './ForwardModal.css';

interface ForwardModalProps {
    isOpen: boolean;
    threadSubject: string;
    onClose: () => void;
    onForward: (recipients: string[], message?: string) => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
    isOpen,
    threadSubject,
    onClose,
    onForward
}) => {
    const [emailInput, setEmailInput] = useState('');
    const [recipients, setRecipients] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Clear state when closed
    useEffect(() => {
        if (!isOpen) {
            setEmailInput('');
            setRecipients([]);
            setMessage('');
            setError(null);
        }
    }, [isOpen]);

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const addRecipient = () => {
        const email = emailInput.trim().toLowerCase();

        if (!email) return;

        if (!validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (recipients.includes(email)) {
            setError('This email is already added');
            return;
        }

        setRecipients([...recipients, email]);
        setEmailInput('');
        setError(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addRecipient();
        }
        if (e.key === 'Backspace' && !emailInput && recipients.length > 0) {
            setRecipients(recipients.slice(0, -1));
        }
    };

    const removeRecipient = (email: string) => {
        setRecipients(recipients.filter(r => r !== email));
    };

    const handleForward = async () => {
        if (recipients.length === 0) {
            setError('Please add at least one recipient');
            return;
        }

        setIsSending(true);
        try {
            await onForward(recipients, message || undefined);
            onClose();
        } catch (err) {
            setError('Failed to forward email');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="forward-modal__backdrop" onClick={onClose}>
            <div
                className="forward-modal__container"
                onClick={e => e.stopPropagation()}
            >
                <div className="forward-modal__header">
                    <h3 className="forward-modal__title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 17 20 12 15 7" />
                            <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                        </svg>
                        Forward Thread
                    </h3>
                    <button
                        className="forward-modal__close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="forward-modal__content">
                    {/* Subject display */}
                    <div className="forward-modal__subject">
                        <span className="forward-modal__subject-label">Subject:</span>
                        <span className="forward-modal__subject-text">Fwd: {threadSubject}</span>
                    </div>

                    {/* Recipients input */}
                    <div className="forward-modal__field">
                        <label className="forward-modal__label">To:</label>
                        <div className="forward-modal__recipients-container">
                            <div className="forward-modal__recipients">
                                {recipients.map(email => (
                                    <div key={email} className="forward-modal__recipient-chip">
                                        <span>{email}</span>
                                        <button
                                            onClick={() => removeRecipient(email)}
                                            type="button"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <input
                                    ref={inputRef}
                                    type="email"
                                    className="forward-modal__input"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={addRecipient}
                                    placeholder={recipients.length === 0 ? "Enter email address..." : "Add another..."}
                                />
                            </div>
                        </div>
                        {error && <p className="forward-modal__error">{error}</p>}
                    </div>

                    {/* Optional message */}
                    <div className="forward-modal__field">
                        <label className="forward-modal__label">Add a message (optional):</label>
                        <textarea
                            className="forward-modal__message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Add a note to the forwarded email..."
                            rows={3}
                        />
                    </div>
                </div>

                <div className="forward-modal__actions">
                    <button
                        className="forward-modal__cancel"
                        onClick={onClose}
                        disabled={isSending}
                    >
                        Cancel
                    </button>
                    <button
                        className="forward-modal__send"
                        onClick={handleForward}
                        disabled={recipients.length === 0 || isSending}
                    >
                        {isSending ? (
                            <>
                                <span className="forward-modal__spinner" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                                Forward
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForwardModal;
