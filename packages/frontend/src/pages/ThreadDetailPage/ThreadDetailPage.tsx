/**
 * ThreadDetailPage Component
 * 
 * Enhanced thread view page with high-tech glassmorphism aesthetic.
 * Mobile-first design with responsive two-column layout on desktop.
 * 
 * Features:
 * - Sticky header with thread info and quick actions
 * - Expandable/collapsible message cards
 * - AI insights and context sidebar
 * - Inline reply composer with AI draft support
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/apiClient';
import { useThreadDetail } from '../../hooks/useThreadDetail';
import { useMessageExpand } from '../../hooks/useMessageExpand';
import {
  ThreadViewHeader,
  MessageCard,
  ThreadContextSidebar,
  ThreadViewReplyComposer
} from '../../components/ThreadView';
import { SnoozePicker } from '../../components/SnoozePicker';
import { ForwardModal } from '../../components/ForwardModal';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import './ThreadDetailPage.css';

export const ThreadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Thread data and messages
  const {
    thread,
    messages,
    isLoading,
    isLoadingMessages,
    error,
    refresh
  } = useThreadDetail(id, true);

  // Message expand/collapse state
  const {
    isExpanded,
    toggleMessage,
    expandAll,
    collapseAll,
    expandLatest,
    expandedCount
  } = useMessageExpand();

  // Context sidebar state (mobile)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal states
  const [isSnoozePickerOpen, setIsSnoozePickerOpen] = useState(false);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);

  // Expand latest message on load
  useEffect(() => {
    if (messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      expandLatest(messageIds);
    }
  }, [messages, expandLatest]);

  // Handle reply send
  const handleSendReply = useCallback(async (messageContent: string, attachments?: File[]) => {
    if (!id || !thread) return;

    try {
      // Create form data if there are attachments
      if (attachments && attachments.length > 0) {
        const formData = new FormData();
        formData.append('message', messageContent);
        attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
        await api.post(`/api/threads/${id}/reply`, formData);
      } else {
        await api.post(`/api/threads/${id}/reply`, {
          message: messageContent
        });
      }

      // Refresh to show new message
      await refresh();
    } catch (err) {
      console.error('Failed to send reply:', err);
      throw err;
    }
  }, [id, thread, refresh]);

  // Handle archive
  const handleArchive = useCallback(async () => {
    if (!id) return;
    try {
      await api.post(`/api/threads/${id}/archive`);
      navigate(-1);
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  }, [id, navigate]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this thread?')) return;

    try {
      await api.delete(`/api/threads/${id}`);
      navigate(-1);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }, [id, navigate]);

  // Handle snooze - open snooze picker
  const handleSnooze = useCallback(() => {
    setIsSnoozePickerOpen(true);
  }, []);

  // Handle snooze submit
  const handleSnoozeSubmit = useCallback(async (snoozeUntil: Date) => {
    if (!id) return;
    try {
      await api.post(`/api/threads/${id}/snooze`, {
        snoozeUntil: snoozeUntil.toISOString()
      });
      setIsSnoozePickerOpen(false);
      navigate(-1);
    } catch (err) {
      console.error('Failed to snooze:', err);
    }
  }, [id, navigate]);

  // Handle forward - open forward modal
  const handleForward = useCallback(() => {
    setIsForwardModalOpen(true);
  }, []);

  // Handle forward submit
  const handleForwardSubmit = useCallback(async (recipients: string[], message?: string) => {
    if (!id) return;
    try {
      await api.post(`/api/threads/${id}/forward`, {
        recipients,
        message
      });
      setIsForwardModalOpen(false);
    } catch (err) {
      console.error('Failed to forward:', err);
      throw err;
    }
  }, [id]);

  // Memoized message list sorted by date (oldest first)
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) =>
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );
  }, [messages]);

  // Loading state
  if (isLoading) {
    return (
      <div className="thread-detail-page">
        <AmbientBackground />
        <div className="thread-detail-page__loading">
          <div className="thread-detail-page__spinner" />
          <p>Loading thread...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !thread) {
    return (
      <div className="thread-detail-page">
        <AmbientBackground />
        <div className="thread-detail-page__error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2>Failed to load thread</h2>
          <p>{error?.message || 'Thread not found'}</p>
          <button onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="thread-detail-page">
      <AmbientBackground />

      {/* Sticky Header */}
      <ThreadViewHeader
        thread={thread}
        messageCount={messages.length}
        onForward={handleForward}
        onArchive={handleArchive}
        onSnooze={handleSnooze}
        onDelete={handleDelete}
      />

      {/* Main Content Area */}
      <div className="thread-detail-page__content">
        {/* Messages Column */}
        <main className="thread-detail-page__messages">
          {/* Expand/Collapse All Controls */}
          {messages.length > 1 && (
            <div className="thread-detail-page__controls">
              <button
                className="thread-detail-page__control-btn"
                onClick={() => expandAll(messages.map(m => m.id))}
                disabled={expandedCount === messages.length}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
                Expand All
              </button>
              <button
                className="thread-detail-page__control-btn"
                onClick={collapseAll}
                disabled={expandedCount === 0}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
                Collapse All
              </button>
            </div>
          )}

          {/* Message List */}
          <div className="thread-detail-page__message-list">
            {isLoadingMessages && messages.length === 0 ? (
              <div className="thread-detail-page__loading-messages">
                <div className="thread-detail-page__spinner" />
                <p>Loading messages...</p>
              </div>
            ) : sortedMessages.length === 0 ? (
              <div className="thread-detail-page__no-messages">
                <p>No messages in this thread</p>
              </div>
            ) : (
              sortedMessages.map((message, index) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  isExpanded={isExpanded(message.id)}
                  onToggle={() => toggleMessage(message.id)}
                  isLatest={index === sortedMessages.length - 1}
                />
              ))
            )}
          </div>

          {/* Reply Composer */}
          <div className="thread-detail-page__composer">
            <ThreadViewReplyComposer
              threadId={id || ''}
              threadSubject={thread.subject}
              classification={thread.classification}
              draftResponse={thread.draftResponse}
              onSend={handleSendReply}
              onForward={handleForward}
              onArchive={handleArchive}
              onSnooze={handleSnooze}
              onDelete={handleDelete}
              isOpen={true}
            />
          </div>
        </main>

        {/* Context Sidebar (Desktop: visible, Mobile: drawer) */}
        <ThreadContextSidebar
          thread={thread}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      {/* Snooze Picker Modal */}
      <SnoozePicker
        isOpen={isSnoozePickerOpen}
        onClose={() => setIsSnoozePickerOpen(false)}
        onSnooze={handleSnoozeSubmit}
      />

      {/* Forward Modal */}
      <ForwardModal
        isOpen={isForwardModalOpen}
        threadSubject={thread.subject}
        onClose={() => setIsForwardModalOpen(false)}
        onForward={handleForwardSubmit}
      />
    </div>
  );
};

export default ThreadDetailPage;
