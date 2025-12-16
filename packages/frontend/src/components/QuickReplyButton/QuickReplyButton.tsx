import React from 'react';
import './QuickReplyButton.css';
import { hapticFeedback } from '../../utils/hapticFeedback';

export interface QuickReplyButtonProps {
  /** Thread ID for reply context */
  threadId: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick: (threadId: string) => void;
  /** Optional className for styling */
  className?: string;
}

export const QuickReplyButton: React.FC<QuickReplyButtonProps> = ({
  threadId,
  disabled = false,
  onClick,
  className = ''
}) => {
  const handleClick = () => {
    if (!disabled) {
      // Trigger haptic feedback for button press (Requirement 7.6)
      hapticFeedback.medium();
      onClick(threadId);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
      event.preventDefault();
      // Trigger haptic feedback for keyboard activation (Requirement 7.6)
      hapticFeedback.medium();
      onClick(threadId);
    }
  };

  return (
    <button
      className={`quick-reply-button ${disabled ? 'quick-reply-button--disabled' : ''} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      type="button"
      aria-label="Quick Reply"
      data-testid="quick-reply-button"
    >
      <span className="quick-reply-button__icon">↩</span>
      <span className="quick-reply-button__text">Quick Reply</span>
    </button>
  );
};

export default QuickReplyButton;