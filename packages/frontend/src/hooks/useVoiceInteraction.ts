import { useState, useCallback, useRef } from 'react';
import { api } from '../utils/apiClient';

export interface ExtractedEntity {
  type: 'contact' | 'property' | 'task' | 'note';
  data: any;
  confidence: number;
}

export interface VoiceNoteResponse {
  id: string;
  transcript: string;
  extractedEntities: ExtractedEntity[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface VoiceQueryResponse {
  response: string;
  messageId: string;
}

export interface UseVoiceInteractionOptions {
  onTranscriptionComplete?: (transcript: string) => void;
  onEntitiesExtracted?: (entities: ExtractedEntity[]) => void;
  onError?: (error: Error) => void;
  /** Callback for audio level changes during recording (0-1) */
  onAudioLevelChange?: (level: number) => void;
}

export const useVoiceInteraction = (options: UseVoiceInteractionOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntity[]>([]);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Upload a voice note for transcription and entity extraction
   */
  const uploadVoiceNote = useCallback(async (audioBlob: Blob): Promise<VoiceNoteResponse | null> => {
    setIsProcessing(true);
    setError(null);
    setTranscript('');
    setExtractedEntities([]);
    
    try {
      // Create form data with audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-note.webm');
      
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      // Upload voice note
      const response = await api.post<VoiceNoteResponse>(
        '/api/voice-notes',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal: abortControllerRef.current.signal,
        }
      );
      
      const voiceNote = response.data;
      
      // Update state with results
      setTranscript(voiceNote.transcript);
      setExtractedEntities(voiceNote.extractedEntities);
      
      // Call callbacks
      if (options.onTranscriptionComplete) {
        options.onTranscriptionComplete(voiceNote.transcript);
      }
      
      if (options.onEntitiesExtracted) {
        options.onEntitiesExtracted(voiceNote.extractedEntities);
      }
      
      return voiceNote;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to process voice note');
      setError(error);
      
      if (options.onError) {
        options.onError(error);
      }
      
      return null;
      
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [options]);

  /**
   * Send a voice query to Ask Zena
   */
  const sendVoiceQuery = useCallback(async (audioBlob: Blob): Promise<VoiceQueryResponse | null> => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Create form data with audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-query.webm');
      
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      // Send voice query
      const response = await api.post<VoiceQueryResponse>(
        '/api/ask/voice',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal: abortControllerRef.current.signal,
        }
      );
      
      return response.data;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to process voice query');
      setError(error);
      
      if (options.onError) {
        options.onError(error);
      }
      
      return null;
      
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [options]);

  /**
   * Request text-to-speech for a given text
   */
  const speakText = useCallback(async (text: string): Promise<void> => {
    try {
      // Use Web Speech API for text-to-speech
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        window.speechSynthesis.speak(utterance);
      } else {
        throw new Error('Text-to-speech not supported in this browser');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to speak text');
      setError(error);
      
      if (options.onError) {
        options.onError(error);
      }
    }
  }, [options]);

  /**
   * Stop any ongoing speech
   */
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  /**
   * Cancel any ongoing processing
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    stopSpeaking();
    setIsProcessing(false);
  }, [stopSpeaking]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setTranscript('');
    setExtractedEntities([]);
    setError(null);
  }, []);

  return {
    // State
    isProcessing,
    transcript,
    extractedEntities,
    error,
    
    // Actions
    uploadVoiceNote,
    sendVoiceQuery,
    speakText,
    stopSpeaking,
    cancel,
    reset,
  };
};
