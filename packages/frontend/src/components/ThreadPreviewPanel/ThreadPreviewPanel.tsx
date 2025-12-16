/**
 * ThreadPreviewPanel Component
 * 
 * Expandable panel showing detailed thread information including:
 * - Full AI summary
 * - Message previews with sender info
 * - Linked contacts
 * - Suggested reply options (max 3)
 * 
 * Requirements: 11.1, 11.2, 11.6
 */

import React, { useMemo } from 'react';
import { Thread, MessagePreview, Participant } from '../../models/newPage.types';
import './ThreadPreviewPanel.css';

export interface ThreadPreviewPanelProps {
  /** Thread data to display */
  thread: Thread;
  /** Whether the panel is expanded */
  isExpanded: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Callback when a quick reply option is selected */
  onQuickReply?: (threadId: string, replyOption: string) => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Maximum number of suggested replies to display
 */
const MAX_SUGGESTED_REPLIES = 3;

/**
 * Maximum number of message previews to display
 */
const MAX_MESSAGE_PREVIEWS = 2;

/**
 * Format timestamp for message preview
 */
const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Get initials from a name for avatar fallback
 */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Limit suggested replies to maximum allowed
 */
export const limitSuggestedReplies = (replies: string[] | undefined): string[] => {
  if (!replies) return [];
  return replies.slice(0, MAX_SUGGESTED_REPLIES);
};

/**
 * Get linked contacts from participants
 */
const getLinkedContacts = (participants: Participant[]): Participant[] => {
  // Filter out the user and return unique contacts
  return participants.filter(p => p.role !== 'agent');
};

export const ThreadPreviewPanel: React.FC<ThreadPreviewPanelProps> = ({
  thread,
  isExpanded,
  onClose,
  onQuickReply,
  className = ''
}) => {
  // Get limited suggested replies
  const suggestedReplies = useMemo(
    () => limitSuggestedReplies(thread.suggestedReplies),
    [thread.suggestedReplies]
  );

  // Get message previews (last 2)
  const messagePreviewsToShow = useMemo(() => {
    if (!thread.lastMessages) return [];
    return thread.lastMessages.slice(-MAX_MESSAGE_PREVIEWS);
  }, [thread.lastMessages]);

  // Get linked contacts
  const linkedContacts = useMemo(
    () => getLinkedContacts(thread.participants),
    [thread.participants]
  );

  // Handle quick reply click
  const handleQuickReplyClick = (reply: string) => {
    if (onQuickReply) {
      onQuickReply(thread.id, reply);
    }
  };

  // Handle backdrop click to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isExpanded) {
    return null;
  }

  return (
    <div 
      className={`thread-preview-panel ${isExpanded ? 'thread-preview-panel--expanded' : ''} ${className}`}
      onClick={handleBackdropClick}
      role="region"
      aria-label="Thread preview details"
      data-testid="thread-preview-panel"
    >
      <div className="thread-preview-panel__content">
        {/* Close button */}
        <button
          className="thread-preview-panel__close"
          onClick={onClose}
          aria-label="Close preview panel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* AI Summary Section */}
        <section 
          className="thread-preview-panel__section"
          data-testid="ai-summary-section"
        >
          <h4 className="thread-preview-panel__section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            AI Summary
          </h4>
          <p className="thread-preview-panel__summary">
            {thread.aiSummary || thread.summary}
          </p>
        </section>

        {/* Message Previews Section */}
        {messagePreviewsToShow.length > 0 && (
          <section 
            className="thread-preview-panel__section"
            data-testid="message-previews-section"
          >
            <h4 className="thread-preview-panel__section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Recent Messages
            </h4>
            <div className="thread-preview-panel__messages">
              {messagePreviewsToShow.map((message) => (
                <MessagePreviewItem key={message.id} message={message} />
              ))}
            </div>
          </section>
        )}

        {/* Linked Contacts Section */}
        {linkedContacts.length > 0 && (
          <section 
            className="thread-preview-panel__section"
            data-testid="linked-contacts-section"
          >
            <h4 className="thread-preview-panel__section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Linked Contacts
            </h4>
            <div className="thread-preview-panel__contacts">
              {linkedContacts.map((contact) => (
                <ContactItem key={contact.id} contact={contact} />
              ))}
            </div>
          </section>
        )}

        {/* Suggested Replies Section */}
        {suggestedReplies.length > 0 && (
          <section 
            className="thread-preview-panel__section"
            data-testid="suggested-replies-section"
          >
            <h4 className="thread-preview-panel__section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 17 4 12 9 7" />
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
              Quick Replies
            </h4>
            <div className="thread-preview-panel__replies">
              {suggestedReplies.map((reply, index) => (
                <button
                  key={index}
                  className="thread-preview-panel__reply-chip"
                  onClick={() => handleQuickReplyClick(reply)}
                  aria-label={`Send quick reply: ${reply}`}
                  data-testid="reply-chip"
                >
                  {reply}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

/**
 * Message Preview Item Component
 */
interface MessagePreviewItemProps {
  message: MessagePreview;
}

const MessagePreviewItem: React.FC<MessagePreviewItemProps> = ({ message }) => {
  return (
    <div 
      className={`thread-preview-panel__message ${message.isFromUser ? 'thread-preview-panel__message--user' : ''}`}
      data-testid="message-preview"
    >
      <div className="thread-preview-panel__message-avatar">
        {getInitials(message.senderName)}
      </div>
      <div className="thread-preview-panel__message-content">
        <div className="thread-preview-panel__message-header">
          <span className="thread-preview-panel__message-sender">
            {message.senderName}
          </span>
          <time className="thread-preview-panel__message-time">
            {formatMessageTime(message.timestamp)}
          </time>
        </div>
        <p className="thread-preview-panel__message-text">
          {message.content}
        </p>
      </div>
    </div>
  );
};

/**
 * Contact Item Component
 */
interface ContactItemProps {
  contact: Participant;
}

const ContactItem: React.FC<ContactItemProps> = ({ contact }) => {
  return (
    <div className="thread-preview-panel__contact" data-testid="contact-item">
      <div className="thread-preview-panel__contact-avatar">
        {contact.avatarUrl ? (
          <img src={contact.avatarUrl} alt={contact.name} />
        ) : (
          getInitials(contact.name)
        )}
      </div>
      <div className="thread-preview-panel__contact-info">
        <span className="thread-preview-panel__contact-name">{contact.name}</span>
        <span className="thread-preview-panel__contact-email">{contact.email}</span>
        {contact.role && (
          <span className="thread-preview-panel__contact-role">{contact.role}</span>
        )}
      </div>
    </div>
  );
};

export default ThreadPreviewPanel;
