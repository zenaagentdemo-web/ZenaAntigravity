import React, { useState } from 'react';
import { VoiceRecorder, ExtractedEntity } from '../../components/VoiceRecorder/VoiceRecorder';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { ZenaIntelligenceSidebar } from '../../components/VoiceRecorder/ZenaIntelligenceSidebar';
import './VoiceNotePage.css';

interface VoiceNote {
  id: string;
  transcript: string;
  timelineSummary?: string;
  extractedEntities: ExtractedEntity[];
  proposedActions?: any[];
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
    try {
      const response = await voiceInteraction.uploadVoiceNote(audioBlob);

      if (response) {
        // Add to voice notes list
        const newNote: VoiceNote = {
          id: response.id,
          transcript: response.transcript,
          timelineSummary: response.timelineSummary,
          extractedEntities: response.extractedEntities || [],
          proposedActions: response.proposedActions || [],
          createdAt: new Date(),
        };

        setVoiceNotes(prev => [newNote, ...prev]);
        setCurrentTranscript(response.transcript);
        setCurrentEntities(response.extractedEntities || []);
      }
    } catch (err) {
      console.error('Failed to upload voice note:', err);
      // useVoiceInteraction already handles the error callback/alert
    }
  };

  const handleActionApprove = async (action: any) => {
    try {
      // In a real app, this would call the tool execution service
      alert(`Approving action: ${action.label}`);
      // Simulate success
    } catch (error) {
      console.error('Failed to approve action:', error);
    }
  };

  const renderDiarizedTranscript = (text: string) => {
    if (!text.includes('Speaker')) return <p className="voice-note-page__transcript-text">{text}</p>;

    const lines = text.split('\n');
    return (
      <div className="voice-note-page__diarized-transcript">
        {lines.map((line, idx) => {
          const isSpeaker0 = line.startsWith('Speaker 0:');
          const isSpeaker1 = line.startsWith('Speaker 1:');
          const speakerClass = isSpeaker0 ? 'agent' : isSpeaker1 ? 'client' : 'other';

          return (
            <div key={idx} className={`voice-note-page__transcript-line ${speakerClass}`}>
              <span className="voice-note-page__speaker-tag">
                {isSpeaker0 ? 'Agent' : isSpeaker1 ? 'Client' : 'Speaker'}
              </span>
              <p className="voice-note-page__line-text">{line.replace(/Speaker \d: /, '')}</p>
            </div>
          );
        })}
      </div>
    );
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

        {/* Main Content Area */}
        <div className="voice-note-page__main-layout">
          <div className="voice-note-page__content">
            {/* Current Transcription */}
            {currentTranscript && !voiceInteraction.isProcessing && (
              <div className="voice-note-page__current">
                <h2 className="voice-note-page__current-title">Latest Transcription</h2>
                <div className="voice-note-page__transcript">
                  {renderDiarizedTranscript(currentTranscript)}
                </div>

                {currentEntities?.length > 0 && (
                  <div className="voice-note-page__entities">
                    <h3 className="voice-note-page__entities-title">Mentioned Entities</h3>
                    <div className="voice-note-page__entities-grid">
                      {currentEntities?.map((entity, idx) => (
                        <div key={idx} className="voice-note-page__entity-card">
                          <div className="voice-note-page__entity-header">
                            <span className="voice-note-page__entity-icon">
                              {getEntityIcon(entity.type)}
                            </span>
                            <span className="voice-note-page__entity-trust-badge">AI Extracted</span>
                          </div>
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

            {/* Voice Notes History (Elevated when no active note) */}
            {voiceNotes.length > 0 && !currentTranscript && !voiceInteraction.isProcessing && (
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
                      {note.extractedEntities?.length > 0 && (
                        <div className="voice-note-page__note-entities">
                          {note.extractedEntities?.map((entity, idx) => (
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
          </div>

          {/* Intelligence Sidebar */}
          {(voiceInteraction.timelineSummary || voiceInteraction.proposedActions.length > 0) && (
            <div className="voice-note-page__sidebar-container">
              <ZenaIntelligenceSidebar
                summary={voiceInteraction.timelineSummary}
                proposedActions={voiceInteraction.proposedActions}
                onActionApprove={handleActionApprove}
                onChatWithZena={() => window.location.href = '/ask'}
              />
            </div>
          )}
        </div>

        {/* Bottom History (Fallback if transcript is active) */}
        {voiceNotes.length > 0 && (currentTranscript || voiceInteraction.isProcessing) && (
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
                  {note.extractedEntities?.length > 0 && (
                    <div className="voice-note-page__note-entities">
                      {note.extractedEntities?.map((entity, idx) => (
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
