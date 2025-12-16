import React, { useState } from 'react';
import { VoiceRecorder, ExtractedEntity } from '../../components/VoiceRecorder/VoiceRecorder';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import './VoiceNotePage.css';

interface VoiceNote {
  id: string;
  transcript: string;
  extractedEntities: ExtractedEntity[];
  createdAt: Date;
}

export const VoiceNotePage: React.FC = () => {
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [currentEntities, setCurrentEntities] = useState<ExtractedEntity[]>([]);
  
  const voiceInteraction = useVoiceInteraction({
    onTranscriptionComplete: (transcript) => {
      setCurrentTranscript(transcript);
    },
    onEntitiesExtracted: (entities) => {
      setCurrentEntities(entities);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleRecordingComplete = async (audioBlob: Blob) => {
    const response = await voiceInteraction.uploadVoiceNote(audioBlob);
    
    if (response) {
      // Add to voice notes list
      const newNote: VoiceNote = {
        id: response.id,
        transcript: response.transcript,
        extractedEntities: response.extractedEntities,
        createdAt: new Date(),
      };
      
      setVoiceNotes(prev => [newNote, ...prev]);
      setCurrentTranscript(response.transcript);
      setCurrentEntities(response.extractedEntities);
    }
  };

  const handleTranscriptionReceived = (transcript: string) => {
    setCurrentTranscript(transcript);
  };

  const handleEntitiesExtracted = (entities: ExtractedEntity[]) => {
    setCurrentEntities(entities);
  };

  const getEntityIcon = (type: string): string => {
    switch (type) {
      case 'contact':
        return '👤';
      case 'property':
        return '🏠';
      case 'task':
        return '✓';
      case 'note':
        return '📝';
      default:
        return '•';
    }
  };

  return (
    <div className="voice-note-page">
      <div className="voice-note-page__container">
        <div className="voice-note-page__header">
          <h1 className="voice-note-page__title">Voice Notes</h1>
          <p className="voice-note-page__description">
            Record voice notes to capture information on the go
          </p>
        </div>

        {/* Voice Recorder */}
        <div className="voice-note-page__recorder">
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onTranscriptionReceived={handleTranscriptionReceived}
            onEntitiesExtracted={handleEntitiesExtracted}
            showTranscription={true}
            showEntities={true}
            showWaveform={true}
            disabled={voiceInteraction.isProcessing}
          />
        </div>

        {/* Current Processing Status */}
        {voiceInteraction.isProcessing && (
          <div className="voice-note-page__status">
            <div className="voice-note-page__status-spinner" />
            <p className="voice-note-page__status-text">
              Processing your voice note...
            </p>
          </div>
        )}

        {/* Current Transcription */}
        {currentTranscript && !voiceInteraction.isProcessing && (
          <div className="voice-note-page__current">
            <h2 className="voice-note-page__current-title">Latest Transcription</h2>
            <div className="voice-note-page__transcript">
              <p className="voice-note-page__transcript-text">{currentTranscript}</p>
            </div>
            
            {currentEntities.length > 0 && (
              <div className="voice-note-page__entities">
                <h3 className="voice-note-page__entities-title">Extracted Information</h3>
                <div className="voice-note-page__entities-grid">
                  {currentEntities.map((entity, idx) => (
                    <div key={idx} className="voice-note-page__entity-card">
                      <span className="voice-note-page__entity-icon">
                        {getEntityIcon(entity.type)}
                      </span>
                      <div className="voice-note-page__entity-content">
                        <span className="voice-note-page__entity-type">
                          {entity.type}
                        </span>
                        <span className="voice-note-page__entity-confidence">
                          {Math.round(entity.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Voice Notes History */}
        {voiceNotes.length > 0 && (
          <div className="voice-note-page__history">
            <h2 className="voice-note-page__history-title">Recent Voice Notes</h2>
            <div className="voice-note-page__notes-list">
              {voiceNotes.map((note) => (
                <div key={note.id} className="voice-note-page__note-card">
                  <div className="voice-note-page__note-header">
                    <span className="voice-note-page__note-icon">🎤</span>
                    <span className="voice-note-page__note-time">
                      {note.createdAt.toLocaleString()}
                    </span>
                  </div>
                  <p className="voice-note-page__note-transcript">
                    {note.transcript}
                  </p>
                  {note.extractedEntities.length > 0 && (
                    <div className="voice-note-page__note-entities">
                      {note.extractedEntities.map((entity, idx) => (
                        <span key={idx} className="voice-note-page__note-entity-tag">
                          {getEntityIcon(entity.type)} {entity.type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {voiceNotes.length === 0 && !currentTranscript && !voiceInteraction.isProcessing && (
          <div className="voice-note-page__empty">
            <div className="voice-note-page__empty-icon">🎙️</div>
            <h2 className="voice-note-page__empty-title">No voice notes yet</h2>
            <p className="voice-note-page__empty-text">
              Press and hold the microphone button to record your first voice note.
              We'll automatically transcribe it and extract key information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
