import React, { useState, useEffect, useRef } from 'react';
import { Thread, ReplyData, ReplyStyle } from '../../models/newPage.types';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { hapticFeedback } from '../../utils/hapticFeedback';
import { AttachmentChip } from '../AttachmentChip/AttachmentChip';
import { ImageLightbox } from '../ImageLightbox/ImageLightbox';
import { generateAttachmentKey, isPreviewable } from '../../utils/attachmentUtils';
import './ReplyComposer.css';

/**
 * Props for the ReplyComposer component
 */
export interface ReplyComposerProps {
  /** Whether the composer is open */
  isOpen: boolean;
  /** Thread context for reply */
  thread: Thread;
  /** Currently selected AI style */
  selectedStyle?: ReplyStyle;
  /** Whether AI is currently generating */
  isGenerating?: boolean;
  /** Pre-filled message content (e.g. from AI) */
  generatedMessage?: string;
  /** Callback when composer should close */
  onClose: () => void;
  /** Callback when reply is sent */
  onSend: (replyData: ReplyData) => Promise<void>;
  /** Callback when style is changed */
  onStyleChange?: (style: ReplyStyle) => void;
  /** Callback to regenerate reply */
  onRegenerate?: () => void;
}

/**
 * ReplyComposer Component
 * 
 * Implements glassmorphism modal with AI-driven reply generation.
 * Features: Style selection (Friendly, Professional, Casual), Regeneration,
 * and smart context awareness.
 * 
 * Requirements: 3.2, 5.1, 5.2, AI-1
 */
export const ReplyComposer: React.FC<ReplyComposerProps> = ({
  isOpen,
  thread,
  selectedStyle = 'Friendly',
  isGenerating = false,
  generatedMessage = '',
  onClose,
  onSend,
  onStyleChange,
  onRegenerate
}) => {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState(generatedMessage || '');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  // Fix: Use MutableRefObject type to allow assignment
  const modalRef = useRef<HTMLDivElement | null>(null);

  const STYLES: ReplyStyle[] = ['Friendly', 'Professional', 'Casual'];

  // Keyboard navigation setup with focus trapping
  const { containerRef, announceToScreenReader } = useKeyboardNavigation({
    enableArrowNavigation: false, // Let form elements handle their own navigation
    enableTabTrapping: true
  });

  // Reduced motion support
  const { prefersReducedMotion, getTransitionDuration } = useReducedMotion();

  // Initialize composer when opened
  useEffect(() => {
    if (isOpen && thread) {
      // Defensive check: Ensure participants exist (Requirement 1.1)
      if (!thread.participants) {
        console.warn('ReplyComposer: Thread has no participants', thread);
        return;
      }

      // Pre-populate recipients with thread participants (excluding user)
      const participants = thread.participants || [];
      const threadRecipients = participants
        .filter(p => p && p.email && !p.email.includes('user@'))
        .map(p => p.email) || [];

      setRecipients(threadRecipients);

      // Safe subject access with fallback and defensive check
      const rawSubject = thread.subject || '';
      const displaySubject = rawSubject.startsWith('Re:')
        ? rawSubject
        : `Re: ${rawSubject || 'No Subject'}`;

      setSubject(displaySubject);
      setError(null);

      // Announce to screen readers
      const announcement = `AI Reply composer opened for thread: ${thread.subject || 'Unknown'}. Generating ${selectedStyle} reply...`;
      announceToScreenReader(announcement, 'polite');

      // Focus message input after a brief delay
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, thread, announceToScreenReader]);

  // Update message when AI generation completes
  useEffect(() => {
    if (generatedMessage) {
      setMessage(generatedMessage);
    }
  }, [generatedMessage]);

  // Update character count when message changes
  useEffect(() => {
    setCharacterCount(message.length);
  }, [message]);

  // Update character count when message changes
  useEffect(() => {
    setCharacterCount(message.length);
  }, [message]);

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Clean up object URLs when attachments are removed if needed? 
  // Actually, we create object URLs on demand for preview in this simple implementation?
  // No, ImageLightbox takes a source. For local files, we need `URL.createObjectURL(file)`.
  // To avoid leaks, we should create it when opening lightbox and revoke when closing.

  const handlePreviewAttachment = (file: File) => {
    if (isPreviewable(file)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewFilename(file.name);
    } else {
      // For non-previewable files, trigger download?
      // Since they are local files the user just attached, downloading them seems redundant but standard behavior.
      // We can just open them in new tab if browser supports (e.g. PDF).
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const closeLightbox = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFilename(null);
  };

  // Handle send button click
  const handleSend = async () => {
    if (!isValidForSend()) return;

    setIsSending(true);
    setError(null);
    announceToScreenReader('Sending reply...', 'assertive');

    try {
      const replyData: ReplyData = {
        threadId: thread.id,
        recipients,
        subject,
        message,
        attachments
      };

      await onSend(replyData);
      hapticFeedback.success();
      announceToScreenReader('Reply sent successfully', 'assertive');
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reply';
      setError(errorMessage);
      hapticFeedback.error();
      announceToScreenReader(`Error sending reply: ${errorMessage}`, 'assertive');
    } finally {
      setIsSending(false);
    }
  };

  // Validate if reply can be sent
  const isValidForSend = (): boolean => {
    return (
      recipients.length > 0 &&
      message.trim().length > 0 &&
      !isSending &&
      !isGenerating
    );
  };

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Remove recipient
  const removeRecipient = (email: string) => {
    setRecipients(prev => prev.filter(r => r !== email));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    // If we were previewing this file, close lightbox? 
    // Complexity: identifying if the removed file is the one being previewed.
    // Index might shift.
    // For now, if user removes a file, they probably aren't previewing it (modal blocks interaction? No, lightbox is overlay).
    // If lightbox is open, they can't interact with underlying chips.
    // So this is fine.
  };

  if (!isOpen || !thread) return null;

  return (
    <div
      className={`reply-composer-backdrop ${prefersReducedMotion ? 'reply-composer-backdrop--reduced-motion' : ''}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reply-composer-title"
      style={{
        '--composer-transition-duration': getTransitionDuration('200ms'),
        '--composer-animation-duration': getTransitionDuration('300ms')
      } as React.CSSProperties}
    >
      <div
        ref={(node) => {
          modalRef.current = node;
          containerRef.current = node;
        }}
        className={`reply-composer-modal ${prefersReducedMotion ? 'reply-composer-modal--reduced-motion' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="reply-composer-header">
          <h2 id="reply-composer-title" className="reply-composer-title">
            Quick Reply <span className="ai-badge">AI Powered</span>
          </h2>
          <button
            className="reply-composer-close"
            onClick={onClose}
            aria-label="Close reply composer"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Recipients */}
        <div className="reply-composer-field">
          <label htmlFor="recipients" className="reply-composer-label">To:</label>
          <div className="reply-composer-recipients">
            {recipients.map((email) => (
              <div key={email} className="recipient-chip">
                <span className="recipient-email">{email}</span>
                <button
                  className="recipient-remove"
                  onClick={() => removeRecipient(email)}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="reply-composer-field">
          <label htmlFor="subject" className="reply-composer-label">Subject:</label>
          <input
            id="subject"
            type="text"
            className="reply-composer-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter subject..."
            required
          />
        </div>

        {/* AI Style Selection */}
        <div className="reply-composer-field">
          <label className="reply-composer-label">Style:</label>
          <div className="reply-composer-styles">
            {STYLES.map((style) => (
              <button
                key={style}
                className={`style-chip ${selectedStyle === style ? 'style-chip--selected' : ''}`}
                onClick={() => onStyleChange?.(style)}
                type="button"
                disabled={isGenerating}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="reply-composer-field reply-composer-field--message">
          <label htmlFor="message" className="reply-composer-label">
            Message:
            {isGenerating && <span className="generating-indicator">Generating...</span>}
          </label>
          <div className="message-container">
            <textarea
              id="message"
              ref={messageInputRef}
              className={`reply-composer-message ${isGenerating ? 'reply-composer-message--generating' : ''}`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your reply..."
              rows={8}
              required
              disabled={isGenerating}
            />
          </div>
          <div className="reply-composer-message-meta">
            <span className="character-count">{characterCount} characters</span>
          </div>
        </div>

        {/* Attachment List */}
        {attachments.length > 0 && (
          <div className="reply-composer-field reply-composer-attachments">
            <div className="attachment-list">
              {attachments.map((file, index) => (
                <AttachmentChip
                  key={generateAttachmentKey(file) + index} // Append index to ensure uniqueness if duplicate files
                  file={file}
                  onRemove={() => removeAttachment(index)}
                  onPreview={() => handlePreviewAttachment(file)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="reply-composer-error" role="alert">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="reply-composer-actions">
          <div className="actions-left">
            <button
              className="reply-composer-regenerate"
              onClick={onRegenerate}
              disabled={isGenerating || isSending}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Regenerate
            </button>
          </div>

          <div className="actions-right">
            <button
              className="reply-composer-cancel"
              onClick={onClose}
              disabled={isSending}
              type="button"
            >
              Cancel
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              style={{ display: 'none' }}
              aria-hidden="true"
            />

            <button
              className="reply-composer-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              type="button"
              aria-label="Attach file"
              title="Attach file"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            <button
              className="reply-composer-send"
              onClick={handleSend}
              disabled={!isValidForSend()}
              type="button"
            >
              {isSending ? (
                <>
                  <span className="send-spinner"></span>
                  Sending...
                </>
              ) : (
                'Send Reply'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Portal/Overlay */}
      {previewUrl && (
        <ImageLightbox
          src={previewUrl}
          filename={previewFilename || 'Attachment'}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
};

export default ReplyComposer;