import React, { useState } from 'react';
import { errorHandlingService } from '../../services/errorHandlingService';
import './UserFeedbackDialog.css';

interface UserFeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  errorId?: string;
  errorMessage?: string;
}

export const UserFeedbackDialog: React.FC<UserFeedbackDialogProps> = ({
  isOpen,
  onClose,
  errorId,
  errorMessage
}) => {
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim() || !errorId) {
      return;
    }

    setIsSubmitting(true);

    try {
      await errorHandlingService.submitUserFeedback({
        errorId,
        message: feedback.trim(),
        email: email.trim() || undefined,
        timestamp: new Date()
      });

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setFeedback('');
        setEmail('');
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setFeedback('');
      setEmail('');
      setSubmitted(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="user-feedback-dialog__overlay" onClick={handleClose}>
      <div 
        className="user-feedback-dialog" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="feedback-title"
        aria-describedby="feedback-description"
      >
        <div className="user-feedback-dialog__header">
          <h2 id="feedback-title" className="user-feedback-dialog__title">
            Help Us Improve
          </h2>
          <button
            className="user-feedback-dialog__close"
            onClick={handleClose}
            aria-label="Close feedback dialog"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className="user-feedback-dialog__content">
          {submitted ? (
            <div className="user-feedback-dialog__success">
              <div className="user-feedback-dialog__success-icon">✓</div>
              <p>Thank you for your feedback! We'll use it to improve Zena.</p>
            </div>
          ) : (
            <>
              <p id="feedback-description" className="user-feedback-dialog__description">
                We encountered an issue and would appreciate your feedback to help us fix it.
              </p>

              {errorMessage && (
                <div className="user-feedback-dialog__error-info">
                  <h3>Error Details:</h3>
                  <p className="user-feedback-dialog__error-message">{errorMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="user-feedback-dialog__form">
                <div className="user-feedback-dialog__field">
                  <label htmlFor="feedback-message" className="user-feedback-dialog__label">
                    What were you trying to do when this happened? *
                  </label>
                  <textarea
                    id="feedback-message"
                    className="user-feedback-dialog__textarea"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Please describe what you were doing when the error occurred..."
                    rows={4}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="user-feedback-dialog__field">
                  <label htmlFor="feedback-email" className="user-feedback-dialog__label">
                    Email (optional)
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    className="user-feedback-dialog__input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    disabled={isSubmitting}
                  />
                  <small className="user-feedback-dialog__help">
                    We'll only use this to follow up if needed
                  </small>
                </div>

                <div className="user-feedback-dialog__actions">
                  <button
                    type="button"
                    className="user-feedback-dialog__button user-feedback-dialog__button--secondary"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="user-feedback-dialog__button user-feedback-dialog__button--primary"
                    disabled={isSubmitting || !feedback.trim()}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Feedback'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};