/**
 * useReplyComposer Hook
 * 
 * Manages reply composer state including open/close, AI generation,
 * and send operations with loading states.
 * 
 * Requirements: 3.2, 3.5, 5.5
 */

import { useState, useCallback, useEffect } from 'react';
import { Thread, ReplyData, SendingState, ReplyStyle } from '../models/newPage.types';
import { aiReplyService } from '../services/aiReplyService';

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseReplyComposerReturn {
  /** Whether the composer is currently open */
  isOpen: boolean;
  /** Current thread context for the composer */
  currentThread: Thread | null;
  /** Currently selected AI style */
  selectedStyle: ReplyStyle;
  /** Whether AI is currently generating a reply */
  isGenerating: boolean;
  /** Current state of the send operation */
  sendingState: SendingState;
  /** Error message if send operation failed */
  sendError: string | null;
  /** Open the composer for a specific thread */
  openComposer: (thread: Thread) => void;
  /** Close the composer and reset state */
  closeComposer: () => void;
  /** Send a reply with the provided data */
  sendReply: (replyData: ReplyData) => Promise<void>;
  /** Change the AI style and regenerate */
  changeStyle: (style: ReplyStyle) => void;
  /** Regenerate the reply with current style */
  regenerateReply: () => void;
  /** Clear error state */
  clearError: () => void;
  /** The generated message content */
  generatedMessage: string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export const useReplyComposer = (): UseReplyComposerReturn => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [isOpen, setIsOpen] = useState(false);
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ReplyStyle>('Friendly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [sendingState, setSendingState] = useState<SendingState>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const [activeSendOperation, setActiveSendOperation] = useState<Promise<void> | null>(null);

  // ============================================================================
  // AI Generation
  // ============================================================================

  const generateReply = useCallback(async (thread: Thread, style: ReplyStyle) => {
    setIsGenerating(true);
    setGeneratedMessage(''); // Clear previous message while generating

    try {
      const reply = await aiReplyService.generateReply(thread, style);
      setGeneratedMessage(reply);
    } catch (error) {
      console.error('Failed to generate reply:', error);
      setGeneratedMessage('Failed to generate reply. Please try again or type manually.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // ============================================================================
  // Composer Actions
  // ============================================================================

  /**
   * Open the composer for a specific thread
   * Requirements: 3.2 - Pre-populate recipients and focus message input
   */
  const openComposer = useCallback((thread: Thread) => {
    setCurrentThread(thread);
    setIsOpen(true);
    setSendingState('idle');
    setSendError(null);
    setSelectedStyle('Friendly'); // Default style

    // Auto-generate reply on open
    generateReply(thread, 'Friendly');
  }, [generateReply]);

  /**
   * Close the composer and reset all state
   */
  const closeComposer = useCallback(() => {
    setIsOpen(false);
    setCurrentThread(null);
    setSendingState('idle');
    setSendError(null);
    setActiveSendOperation(null);
    setGeneratedMessage('');
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setSendError(null);
  }, []);

  // ============================================================================
  // Style & Regeneration
  // ============================================================================

  const changeStyle = useCallback((style: ReplyStyle) => {
    if (!currentThread) return;
    setSelectedStyle(style);
    generateReply(currentThread, style);
  }, [currentThread, generateReply]);

  const regenerateReply = useCallback(() => {
    if (!currentThread) return;
    generateReply(currentThread, selectedStyle);
  }, [currentThread, selectedStyle, generateReply]);

  // ============================================================================
  // Reply Sending
  // ============================================================================

  /**
   * Send a reply with duplicate prevention and error handling
   * Requirements: 5.5 - Prevent duplicate submissions during sending
   */
  const sendReply = useCallback(async (replyData: ReplyData): Promise<void> => {
    // Prevent duplicate sends - check if already sending
    if (sendingState === 'sending' || activeSendOperation) {
      console.warn('Reply send already in progress, ignoring duplicate request');
      return;
    }

    // Validate reply data
    if (!replyData.message.trim()) {
      setSendError('Message content is required');
      return;
    }

    if (replyData.recipients.length === 0) {
      setSendError('At least one recipient is required');
      return;
    }

    setSendingState('sending');
    setSendError(null);

    // Create the send operation promise
    const sendOperation = (async () => {
      try {
        // Simulate API call - in real implementation this would call backend
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            // Simulate occasional failures for testing
            if (Math.random() < 0.1) {
              reject(new Error('Network error: Failed to send reply'));
            } else {
              resolve(void 0);
            }
          }, 1000 + Math.random() * 1000); // 1-2 second delay
        });

        setSendingState('success');

        // Auto-close composer after successful send
        setTimeout(() => {
          closeComposer();
        }, 500);

      } catch (error) {
        console.error('Failed to send reply:', error);
        setSendingState('error');
        setSendError(error instanceof Error ? error.message : 'Failed to send reply');
      } finally {
        setActiveSendOperation(null);
      }
    })();

    setActiveSendOperation(sendOperation);
    await sendOperation;
  }, [sendingState, activeSendOperation, closeComposer]);

  // ============================================================================
  // Cleanup Effect
  // ============================================================================

  /**
   * Cleanup active operations when component unmounts
   */
  useEffect(() => {
    return () => {
      // Cancel any active send operations on unmount
      setActiveSendOperation(null);
    };
  }, []);

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    isOpen,
    currentThread,
    selectedStyle,
    isGenerating,
    generatedMessage,
    sendingState,
    sendError,
    openComposer,
    closeComposer,
    sendReply,
    changeStyle,
    regenerateReply,
    clearError
  };
};

export default useReplyComposer;