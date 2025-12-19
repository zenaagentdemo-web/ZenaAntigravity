/**
 * ForwardEmailModal Component
 * 
 * Modal for forwarding an email thread to another recipient.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import './ForwardEmailModal.css';

export interface ForwardEmailModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Original thread subject */
    originalSubject: string;
    /** Original thread content/summary */
    originalContent?: string;
    /** Callback to close the modal */
    onClose: () => void;
    /** Callback when forward is sent */
    onSend: (data: { to: string; subject: string; message: string }) => void;
}

export const ForwardEmailModal: React.FC<ForwardEmailModalProps> = ({
    isOpen,
    originalSubject,
    originalContent = '',
    onClose,
    onSend,
}) => {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState(`Fwd: ${originalSubject}`);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const toInputRef = useRef<HTMLInputElement>(null);

    // Reset form and focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTo('');
            setSubject(`Fwd: ${originalSubject}`);
            setMessage('');
            setTimeout(() => toInputRef.current?.focus(), 100);
        }
    }, [isOpen, originalSubject]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!to.trim()) return;

        setIsSending(true);
        try {
            await onSend({ to, subject, message });
            onClose();
        } finally {
            setIsSending(false);
        }
    }, [to, subject, message, onSend, onClose]);

    if (!isOpen) return null;

    return (
        <div className="forward-modal__overlay" onClick={onClose}>
            <div
                className="forward-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="forward-modal-title"
            >
                {/* Header */}
                <div className="forward-modal__header">
                    <h2 id="forward-modal-title" className="forward-modal__title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 17 20 12 15 7" />
                            <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                        </svg>
                        Forward Email
                    </h2>
                    <button
                        className="forward-modal__close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form className="forward-modal__form" onSubmit={handleSubmit}>
                    {/* To Field */}
                    <div className="forward-modal__field">
                        <label htmlFor="forward-to" className="forward-modal__label">To</label>
                        <input
                            ref={toInputRef}
                            id="forward-to"
                            type="email"
                            className="forward-modal__input"
                            placeholder="recipient@example.com"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            required
                        />
                    </div>

                    {/* Subject Field */}
                    <div className="forward-modal__field">
                        <label htmlFor="forward-subject" className="forward-modal__label">Subject</label>
                        <input
                            id="forward-subject"
                            type="text"
                            className="forward-modal__input"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    {/* Message Field */}
                    <div className="forward-modal__field">
                        <label htmlFor="forward-message" className="forward-modal__label">Add a message (optional)</label>
                        <textarea
                            id="forward-message"
                            className="forward-modal__textarea"
                            placeholder="Add a note to the recipient..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Original Content Preview */}
                    {originalContent && (
                        <div className="forward-modal__original">
                            <div className="forward-modal__original-label">Original Message</div>
                            <div className="forward-modal__original-content">
                                {originalContent}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="forward-modal__actions">
                        <button
                            type="button"
                            className="forward-modal__btn forward-modal__btn--cancel"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="forward-modal__btn forward-modal__btn--send"
                            disabled={!to.trim() || isSending}
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
                                    Send
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForwardEmailModal;
