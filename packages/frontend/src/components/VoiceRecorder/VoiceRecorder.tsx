import React, { useState, useRef, useEffect } from 'react';
import './VoiceRecorder.css';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface ExtractedEntity {
  type: 'contact' | 'property' | 'task' | 'note';
  data: any;
  confidence: number;
}

export interface VoiceRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onTranscriptionReceived?: (transcript: string) => void;
  onEntitiesExtracted?: (entities: ExtractedEntity[]) => void;
  showTranscription?: boolean;
  showEntities?: boolean;
  showWaveform?: boolean;
  autoStart?: boolean;
  showButton?: boolean;
  disabled?: boolean;
  className?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onTranscriptionReceived,
  onEntitiesExtracted,
  showTranscription = true,
  showEntities = true,
  showWaveform = true,
  autoStart = false,
  showButton = true,
  disabled = false,
  className = '',
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntity[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup and Auto-start
  useEffect(() => {
    if (autoStart) {
      startRecording();
    }
    return () => {
      stopRecording();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio context for waveform visualization
      if (showWaveform) {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;

        // Start visualizing audio levels
        visualizeAudio();
      }

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || 'audio/webm'
        });
        handleRecordingComplete(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setVoiceState('listening');
      recordingStartTimeRef.current = Date.now();

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
          setRecordingDuration(duration);
        }
      }, 100);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setAudioLevel(0);
    setRecordingDuration(0);
    recordingStartTimeRef.current = null;
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const updateLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average audio level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = average / 255;

      setAudioLevel(normalizedLevel);

      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setVoiceState('processing');

    if (onRecordingComplete) {
      onRecordingComplete(audioBlob);
    }

    // Simulate processing (in real implementation, this would call the API)
    // For now, we'll just reset after a delay
    setTimeout(() => {
      setVoiceState('idle');
      setTranscript('');
      setExtractedEntities([]);
    }, 2000);
  };

  const handleToggleRecording = () => {
    if (disabled || voiceState === 'processing') return;

    if (voiceState === 'idle') {
      startRecording();
    } else if (voiceState === 'listening') {
      stopRecording();
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStateIcon = (): string => {
    switch (voiceState) {
      case 'listening':
        return '🔴';
      case 'processing':
        return '⏳';
      case 'speaking':
        return '🔊';
      default:
        return '🎤';
    }
  };

  const getStateLabel = (): string => {
    switch (voiceState) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      case 'speaking':
        return 'Speaking...';
      default:
        return 'Tap to record';
    }
  };

  return (
    <div className={`voice-recorder ${className}`}>
      {/* Voice Button */}
      {showButton && (
        <button
          className={`voice-recorder__button voice-recorder__button--${voiceState}`}
          onClick={handleToggleRecording}
          disabled={disabled || voiceState === 'processing'}
          type="button"
          aria-label={getStateLabel()}
        >
          <span className="voice-recorder__icon">{getStateIcon()}</span>
          <span className="voice-recorder__label">{getStateLabel()}</span>
        </button>
      )}

      {/* Waveform Visualization */}
      {showWaveform && voiceState === 'listening' && (
        <div className="voice-recorder__waveform">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="voice-recorder__waveform-bar"
              style={{
                height: `${Math.max(10, audioLevel * 100 * (0.5 + Math.random() * 0.5))}%`,
              }}
            />
          ))}
        </div>
      )}

      {/* Processing Indicator */}
      {voiceState === 'processing' && (
        <div className="voice-recorder__processing">
          <div className="voice-recorder__spinner" />
          <p className="voice-recorder__processing-text">
            Transcribing your voice note...
          </p>
        </div>
      )}

      {/* Transcription Display */}
      {showTranscription && transcript && (
        <div className="voice-recorder__transcription">
          <h3 className="voice-recorder__transcription-title">Transcription</h3>
          <p className="voice-recorder__transcription-text">{transcript}</p>
        </div>
      )}

      {/* Extracted Entities Preview */}
      {showEntities && extractedEntities.length > 0 && (
        <div className="voice-recorder__entities">
          <h3 className="voice-recorder__entities-title">Extracted Information</h3>
          <div className="voice-recorder__entities-list">
            {extractedEntities.map((entity, idx) => (
              <div key={idx} className="voice-recorder__entity">
                <span className="voice-recorder__entity-type">{entity.type}</span>
                <span className="voice-recorder__entity-confidence">
                  {Math.round(entity.confidence * 100)}% confidence
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
