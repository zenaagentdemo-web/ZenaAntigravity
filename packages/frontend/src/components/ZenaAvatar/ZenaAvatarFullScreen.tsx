/**
 * ZenaAvatarFullScreen Component
 * 
 * Large animated orb variant for the Ask Zena page with voice waveform visualization.
 * Features full-screen presence with enhanced animations and audio visualization.
 * 
 * Requirements: 1.1, 1.5
 */

import React, { useEffect, useRef, useState } from 'react';
import { ZenaAvatar, ZenaAvatarState } from './ZenaAvatar';
import './ZenaAvatarFullScreen.css';

export interface ZenaAvatarFullScreenProps {
  /** Current state of the avatar */
  state?: ZenaAvatarState;
  /** Audio level for waveform visualization (0-1) */
  audioLevel?: number;
  /** Whether to show the waveform visualization */
  showWaveform?: boolean;
  /** Number of waveform bars */
  waveformBars?: number;
  /** Greeting message to display */
  greeting?: string;
  /** Status message to display */
  statusMessage?: string;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS class names */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * ZenaAvatarFullScreen - Full-screen AI avatar for Ask Zena page
 * 
 * Features:
 * - Large animated orb as hero element
 * - Voice waveform visualization
 * - Ambient particle effects
 * - State-based animations
 */
export const ZenaAvatarFullScreen: React.FC<ZenaAvatarFullScreenProps> = ({
  state = 'idle',
  audioLevel = 0,
  showWaveform = false,
  waveformBars = 32,
  greeting,
  statusMessage,
  onClick,
  className = '',
  testId = 'zena-avatar-fullscreen',
}) => {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const animationRef = useRef<number | null>(null);

  // Generate waveform data based on audio level
  useEffect(() => {
    if (showWaveform && (state === 'listening' || state === 'speaking')) {
      const generateWaveform = () => {
        const bars = Array.from({ length: waveformBars }, (_, i) => {
          // Create a wave pattern with some randomness
          const baseHeight = audioLevel * 0.8;
          const waveOffset = Math.sin((i / waveformBars) * Math.PI * 2 + Date.now() / 200) * 0.2;
          const randomness = Math.random() * 0.2;
          return Math.max(0.1, Math.min(1, baseHeight + waveOffset + randomness));
        });
        setWaveformData(bars);
        animationRef.current = requestAnimationFrame(generateWaveform);
      };
      
      generateWaveform();
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } else {
      // Reset waveform when not active
      setWaveformData(Array(waveformBars).fill(0.1));
    }
  }, [showWaveform, state, audioLevel, waveformBars]);

  const baseClass = 'zena-avatar-fullscreen';
  const combinedClassName = [baseClass, className].filter(Boolean).join(' ');

  return (
    <div 
      className={combinedClassName} 
      data-testid={testId}
      data-state={state}
    >
      {/* Ambient background particles */}
      <div className={`${baseClass}__ambient`} aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => (
          <span 
            key={`particle-${i}`} 
            className={`${baseClass}__particle`}
            style={{
              '--particle-delay': `${i * 0.5}s`,
              '--particle-x': `${Math.random() * 100}%`,
              '--particle-y': `${Math.random() * 100}%`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Main avatar container */}
      <div className={`${baseClass}__avatar-container`}>
        {/* Outer glow rings */}
        <div className={`${baseClass}__outer-ring ${baseClass}__outer-ring--1`} aria-hidden="true" />
        <div className={`${baseClass}__outer-ring ${baseClass}__outer-ring--2`} aria-hidden="true" />
        <div className={`${baseClass}__outer-ring ${baseClass}__outer-ring--3`} aria-hidden="true" />
        
        {/* Main Zena Avatar */}
        <ZenaAvatar
          state={state}
          size="xl"
          showRings={true}
          ringCount={3}
          onClick={onClick}
          ariaLabel="Zena AI Assistant - Click to interact"
          className={`${baseClass}__avatar`}
        />
      </div>

      {/* Voice waveform visualization */}
      {showWaveform && (
        <div 
          className={`${baseClass}__waveform ${state === 'listening' || state === 'speaking' ? `${baseClass}__waveform--active` : ''}`}
          aria-hidden="true"
        >
          <div className={`${baseClass}__waveform-container`}>
            {waveformData.map((height, i) => (
              <div
                key={`bar-${i}`}
                className={`${baseClass}__waveform-bar`}
                style={{
                  '--bar-height': `${height * 100}%`,
                  '--bar-delay': `${i * 0.02}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      )}

      {/* Greeting and status messages */}
      <div className={`${baseClass}__messages`}>
        {greeting && (
          <h2 className={`${baseClass}__greeting`}>{greeting}</h2>
        )}
        {statusMessage && (
          <p className={`${baseClass}__status`}>{statusMessage}</p>
        )}
      </div>
    </div>
  );
};

export default ZenaAvatarFullScreen;
