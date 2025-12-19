/**
 * ThreadViewReplyComposer Component
 * 
 * Full-featured reply composer for the thread view page.
 * Supports AI draft integration, style selection, file attachments, and quick actions.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ReplyStyle } from '../../models/newPage.types';
import { AttachmentChip } from '../AttachmentChip/AttachmentChip';
import { ImageLightbox } from '../ImageLightbox/ImageLightbox';
import { SmartReplySuggestions } from '../SmartReplySuggestions';
import { generateAttachmentKey, isPreviewable } from '../../utils/attachmentUtils';
import { api } from '../../utils/apiClient';
import './ThreadViewReplyComposer.css';

interface ThreadViewReplyComposerProps {
    threadId: string;
    threadSubject?: string;
    classification?: string;
    draftResponse?: string;
    onSend: (message: string, attachments?: File[]) => Promise<void>;
    onCancel?: () => void;
    onForward?: () => void;
    onArchive?: () => void;
    onSnooze?: () => void;
    onDelete?: () => void;
    isOpen?: boolean;
}

const STYLE_OPTIONS: { value: ReplyStyle; label: string; emoji: string }[] = [
    { value: 'Professional', label: 'Professional', emoji: '💼' },
    { value: 'Friendly', label: 'Friendly', emoji: '😊' },
    { value: 'Casual', label: 'Casual', emoji: '👋' }
];

export const ThreadViewReplyComposer: React.FC<ThreadViewReplyComposerProps> = ({
    threadId,
    threadSubject = '',
    classification,
    draftResponse,
    onSend,
    onCancel,
    onForward,
    onArchive,
    onSnooze,
    onDelete,
    isOpen = true
}) => {
    const [message, setMessage] = useState('');
    const [selectedStyle, setSelectedStyle] = useState<ReplyStyle>('Professional');
    const [isSending, setIsSending] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewFilename, setPreviewFilename] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Focus textarea when expanded
    useEffect(() => {
        if (isExpanded && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isExpanded]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [message]);

    // Cleanup preview URLs
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Handle tone style change with AI regeneration
    const handleStyleChange = useCallback(async (style: ReplyStyle) => {
        setSelectedStyle(style);

        // If we have a draft and message, regenerate with new tone
        if (message && threadId) {
            setIsRegenerating(true);
            try {
                const response = await api.post<{ draft: string }>(`/api/threads/${threadId}/regenerate-draft`, {
                    style,
                    currentMessage: message
                });
                if (response.data.draft) {
                    setMessage(response.data.draft);
                }
            } catch (error) {
                console.error('Failed to regenerate draft:', error);
                // Keep existing message if regeneration fails
            } finally {
                setIsRegenerating(false);
            }
        }
    }, [message, threadId]);

    const handleUseDraft = () => {
        if (draftResponse) {
            setMessage(draftResponse);
            setIsExpanded(true);
        }
    };

    const handleSend = async () => {
        if (!message.trim() || isSending) return;

        setIsSending(true);
        try {
            await onSend(message, attachments.length > 0 ? attachments : undefined);
            setMessage('');
            setAttachments([]);
            setIsExpanded(false);
        } catch (error) {
            console.error('Failed to send reply:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleCancel = () => {
        setMessage('');
        setAttachments([]);
        setIsExpanded(false);
        onCancel?.();
    };

    // File attachment handlers
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setAttachments(prev => [...prev, ...newFiles]);
        }
        // Reset input for same file selection
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handlePreviewAttachment = (file: File) => {
        if (isPreviewable(file)) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setPreviewFilename(file.name);
        } else {
            // Download non-previewable files
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

    if (!isOpen) return null;

    return (
        <div
            className={`reply-composer ${isExpanded ? 'reply-composer--expanded' : ''}`}
            data-testid="reply-composer"
        >
            {/* Collapsed state - button row */}
            {!isExpanded && (
                <div className="reply-composer__collapsed-row">
                    <button
                        className="reply-composer__expand-btn"
                        onClick={() => setIsExpanded(true)}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 17 4 12 9 7" />
                            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                        </svg>
                        Write a reply...
                    </button>

                    {/* Quick Actions when collapsed */}
                    <div className="reply-composer__quick-actions">
                        {onForward && (
                            <button
                                className="reply-composer__quick-action"
                                onClick={onForward}
                                title="Forward"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="15 17 20 12 15 7" />
                                    <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                                </svg>
                            </button>
                        )}
                        {onArchive && (
                            <button
                                className="reply-composer__quick-action"
                                onClick={onArchive}
                                title="Archive"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="21 8 21 21 3 21 3 8" />
                                    <rect x="1" y="3" width="22" height="5" />
                                    <line x1="10" y1="12" x2="14" y2="12" />
                                </svg>
                            </button>
                        )}
                        {onSnooze && (
                            <button
                                className="reply-composer__quick-action"
                                onClick={onSnooze}
                                title="Snooze"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Expanded state - full composer */}
            {isExpanded && (
                <>
                    {/* Header with style selector and AI draft */}
                    <div className="reply-composer__header">
                        <div className="reply-composer__style-selector">
                            <label className="reply-composer__style-label">Tone:</label>
                            <div className="reply-composer__style-options">
                                {STYLE_OPTIONS.map(option => (
                                    <button
                                        key={option.value}
                                        className={`reply-composer__style-btn ${selectedStyle === option.value ? 'reply-composer__style-btn--active' : ''}`}
                                        onClick={() => handleStyleChange(option.value)}
                                        type="button"
                                        disabled={isRegenerating}
                                    >
                                        <span className="reply-composer__style-emoji">{option.emoji}</span>
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {draftResponse && (
                            <button
                                className="reply-composer__draft-btn"
                                onClick={handleUseDraft}
                                type="button"
                                disabled={isRegenerating}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                                    <path d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                                {isRegenerating ? 'Generating...' : 'Use AI Draft'}
                            </button>
                        )}
                    </div>

                    {/* Smart Reply Suggestions */}
                    <SmartReplySuggestions
                        threadSubject={threadSubject}
                        classification={classification}
                        onSelectSuggestion={(suggestion) => {
                            setMessage(suggestion);
                            setIsExpanded(true);
                        }}
                    />

                    {/* Textarea */}
                    <div className="reply-composer__textarea-wrapper">
                        <textarea
                            ref={textareaRef}
                            className={`reply-composer__textarea ${isRegenerating ? 'reply-composer__textarea--loading' : ''}`}
                            placeholder="Type your reply..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            disabled={isSending || isRegenerating}
                        />
                        {isRegenerating && (
                            <div className="reply-composer__regenerating-overlay">
                                <span className="reply-composer__spinner" />
                                Adjusting tone...
                            </div>
                        )}
                    </div>

                    {/* Attachments */}
                    {attachments.length > 0 && (
                        <div className="reply-composer__attachments">
                            {attachments.map((file, index) => (
                                <AttachmentChip
                                    key={generateAttachmentKey(file) + index}
                                    file={file}
                                    onRemove={() => handleRemoveAttachment(index)}
                                    onPreview={() => handlePreviewAttachment(file)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Actions toolbar */}
                    <div className="reply-composer__actions">
                        <div className="reply-composer__actions-left">
                            {/* Attach button */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                multiple
                                style={{ display: 'none' }}
                                aria-hidden="true"
                            />
                            <button
                                className="reply-composer__attach-btn"
                                onClick={() => fileInputRef.current?.click()}
                                type="button"
                                title="Attach files"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                            </button>

                            {/* Quick actions */}
                            {onForward && (
                                <button
                                    className="reply-composer__action-btn"
                                    onClick={onForward}
                                    type="button"
                                    title="Forward"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="15 17 20 12 15 7" />
                                        <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                                    </svg>
                                </button>
                            )}
                            {onArchive && (
                                <button
                                    className="reply-composer__action-btn"
                                    onClick={onArchive}
                                    type="button"
                                    title="Archive"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="21 8 21 21 3 21 3 8" />
                                        <rect x="1" y="3" width="22" height="5" />
                                        <line x1="10" y1="12" x2="14" y2="12" />
                                    </svg>
                                </button>
                            )}
                            {onSnooze && (
                                <button
                                    className="reply-composer__action-btn"
                                    onClick={onSnooze}
                                    type="button"
                                    title="Snooze"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    className="reply-composer__action-btn reply-composer__action-btn--danger"
                                    onClick={onDelete}
                                    type="button"
                                    title="Delete"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        <div className="reply-composer__actions-right">
                            <button
                                className="reply-composer__cancel-btn"
                                onClick={handleCancel}
                                type="button"
                                disabled={isSending}
                            >
                                Cancel
                            </button>
                            <button
                                className="reply-composer__send-btn"
                                onClick={handleSend}
                                type="button"
                                disabled={!message.trim() || isSending || isRegenerating}
                            >
                                {isSending ? (
                                    <>
                                        <span className="reply-composer__spinner" />
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
                    </div>
                </>
            )}

            {/* Lightbox for attachment preview */}
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

export default ThreadViewReplyComposer;
