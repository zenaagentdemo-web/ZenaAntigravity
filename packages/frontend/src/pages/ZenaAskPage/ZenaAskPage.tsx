import React, { useState, useCallback } from 'react';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import { ZenaHighTechAvatar } from '../../components/ZenaHighTechAvatar/ZenaHighTechAvatar';
import { ZenaPromptInput } from '../../components/ZenaPromptInput/ZenaPromptInput';
import { ZenaTalkButton, TalkButtonState } from '../../components/ZenaTalkButton/ZenaTalkButton';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { DissolvePhase } from '../../components/DissolveParticleSystem/DissolveParticleSystem';
import { decodeHTMLEntities } from '../../utils/text-utils';
import { ProductNavigation, ProductButtonInfo } from '../../components/ProductNavigation/ProductNavigation';
import './ZenaAskPage.css';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * ZenaAskPage - High-tech AI assistant interface
 * 
 * State Flow: idle → dissolving → vortex → speaking → reforming → idle
 * 
 * - dissolving: Zena breaks apart (1s)
 * - vortex: Thinking/waiting for API (particles swirl)
 * - speaking: Delivering answer (sound waves, effects)
 * - reforming: Speech done, reforms (0.8s)
 */
export const ZenaAskPage: React.FC = () => {
    const [voiceState, setVoiceState] = useState<TalkButtonState>('idle');
    const [audioLevel, setAudioLevel] = useState(0);
    const [isTextLoading, setIsTextLoading] = useState(false);
    const [dissolvePhase, setDissolvePhase] = useState<DissolvePhase>('idle');

    // Response state
    const [zenaResponse, setZenaResponse] = useState<string>('');
    const [displayedWords, setDisplayedWords] = useState<string[]>([]);
    const [isDisplayingResponse, setIsDisplayingResponse] = useState(false);
    const [productButtons, setProductButtons] = useState<ProductButtonInfo[]>([]);

    // Simulated audio level for speaking effects
    const [simulatedAudioLevel, setSimulatedAudioLevel] = useState(0);

    const { sendVoiceQuery } = useVoiceInteraction({
        onError: (error) => {
            console.error('Voice interaction error:', error);
            setVoiceState('idle');
            setDissolvePhase('idle');
        },
    });

    // Simulate audio from text for visual effects
    const simulateTextAudio = useCallback(async (text: string) => {
        // Parse buttons out of text: [PRODUCT_BUTTON: label, path, id]
        const buttonRegex = /\[PRODUCT_BUTTON:\s*(.*?),\s*(.*?),\s*(.*?)\]/g;
        const buttons: ProductButtonInfo[] = [];
        let cleanText = text;

        let match;
        while ((match = buttonRegex.exec(text)) !== null) {
            buttons.push({
                label: match[1],
                path: match[2],
                id: match[3]
            });
        }

        // Remove button tokens from displayed text
        cleanText = text.replace(buttonRegex, '').trim();
        setProductButtons(buttons);

        const decodedText = decodeHTMLEntities(cleanText);
        const words = decodedText.split(/\s+/);
        const wordDelay = 80; // ms per word

        setDisplayedWords([]);
        setIsDisplayingResponse(true);

        for (let i = 0; i < words.length; i++) {
            // Add word to display
            setDisplayedWords(prev => [...prev, words[i]]);

            // Simulate audio level based on word length
            const level = 0.3 + (words[i].length / 15) * 0.7;
            setSimulatedAudioLevel(level);
            setAudioLevel(level);

            await new Promise(resolve => setTimeout(resolve, wordDelay));

            // Brief pause between words
            setSimulatedAudioLevel(0.1);
            await new Promise(resolve => setTimeout(resolve, 20));
        }

        // Fade out
        setSimulatedAudioLevel(0);
        setAudioLevel(0);
        setIsDisplayingResponse(false);
    }, []);

    // Handle dissolve phase transitions
    const handleDissolvePhaseComplete = useCallback((completedPhase: DissolvePhase) => {
        if (completedPhase === 'dissolving') {
            // Dissolve done, enter vortex (thinking)
            setDissolvePhase('vortex');
        } else if (completedPhase === 'reforming') {
            // Reform done, back to idle
            setDissolvePhase('idle');
            setZenaResponse('');
            setDisplayedWords([]);
        }
    }, []);

    // Handle text question submission
    const handleTextSubmit = useCallback(async (question: string) => {
        setIsTextLoading(true);
        setVoiceState('processing');
        setZenaResponse('');
        setDisplayedWords([]);

        // Start dissolve effect - the callback will trigger vortex
        setDissolvePhase('dissolving');

        // Wait for dissolve animation (1 second)
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Now in vortex - call API while swirling
        try {
            console.log('Submitting question to API:', question);

            const response = await fetch(`${API_BASE}/api/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer demo-token',
                },
                body: JSON.stringify({
                    query: question,
                    conversationHistory: []
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const answerText = data.response || data.answer || 'I apologize, I could not process that request.';

            console.log('Got response:', answerText);
            setZenaResponse(answerText);

            // Stay in vortex a moment to see the swirl
            await new Promise(resolve => setTimeout(resolve, 500));

            // Transition to speaking - this phase should show original image
            setDissolvePhase('speaking');

            // Simulate audio and display words
            await simulateTextAudio(answerText);

            // Speaking done - trigger reform
            setDissolvePhase('reforming');

        } catch (error) {
            console.error('Failed to submit question:', error);

            // Use mock response on error
            const mockResponse = "I'm Zena, your AI real estate assistant. I can help you with property information, buyer inquiries, and more!";
            setZenaResponse(mockResponse);
            setDissolvePhase('speaking');
            await simulateTextAudio(mockResponse);
            setDissolvePhase('reforming');

        } finally {
            setIsTextLoading(false);
            setVoiceState('idle');
        }
    }, [simulateTextAudio]);

    // Handle voice recording complete
    const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
        setVoiceState('processing');
        setDissolvePhase('dissolving'); // Start dissolve effect!

        try {
            const response = await sendVoiceQuery(audioBlob);
            if (response) {
                console.log('Voice response:', response);
                // Handle different response shapes
                const responseText = typeof response === 'string'
                    ? response
                    : (response as any).response || (response as any).answer || 'Response received';
                setZenaResponse(responseText);
                setDissolvePhase('speaking');
                await simulateTextAudio(responseText);
            }

            // Speaking done - trigger reform
            setDissolvePhase('reforming');

        } catch (error) {
            console.error('Failed to process voice recording:', error);
            setDissolvePhase('idle');
        } finally {
            setVoiceState('idle');
        }
    }, [sendVoiceQuery, simulateTextAudio]);

    // Handle audio level changes from voice recording
    const handleAudioLevelChange = useCallback((level: number) => {
        setAudioLevel(level);
        if (level > 0) {
            setVoiceState('listening');
        }
    }, []);

    // Get effective audio level (real or simulated)
    const effectiveAudioLevel = dissolvePhase === 'speaking' ? simulatedAudioLevel : audioLevel;

    return (
        <div className="zena-ask-page" data-theme="high-tech">
            <AmbientBackground variant="subtle" />

            <header className="zena-ask-page__header">
                <h1 className="zena-ask-page__title">
                    <span className="title-glow">ASK</span> ZENA
                </h1>
            </header>

            <main className="zena-ask-page__content">
                {/* High-Tech Avatar with Dissolve Effect */}
                <div className="zena-ask-page__avatar-container">
                    <ZenaHighTechAvatar
                        imageSrc="/assets/zena-avatar.jpg"
                        size={280}
                        voiceState={voiceState}
                        dissolvePhase={dissolvePhase}
                        audioLevel={effectiveAudioLevel}
                        particleCount={300}
                        onDissolvePhaseComplete={handleDissolvePhaseComplete}
                    />
                </div>

                {/* Response Display Area */}
                {(dissolvePhase === 'speaking' || isDisplayingResponse) && (
                    <div className="zena-ask-page__response">
                        <div className="response-bubble">
                            <div className="response-text">
                                {displayedWords.map((word, i) => (
                                    <span
                                        key={i}
                                        className="response-word"
                                        style={{ animationDelay: `${i * 0.05}s` }}
                                    >
                                        {word}{' '}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {/* Product Navigation Buttons */}
                        {!isDisplayingResponse && productButtons.length > 0 && (
                            <ProductNavigation buttons={productButtons} />
                        )}
                    </div>
                )}

                {/* Input Section */}
                <div className="zena-ask-page__input-section">
                    {/* Text Prompt Input */}
                    <ZenaPromptInput
                        onSubmit={handleTextSubmit}
                        placeholder="Ask Zena anything..."
                        isLoading={isTextLoading}
                        disabled={voiceState === 'listening' || dissolvePhase !== 'idle'}
                    />

                    {/* Divider */}
                    <div className="zena-ask-page__divider">
                        <span className="divider-line" />
                        <span className="divider-text">or</span>
                        <span className="divider-line" />
                    </div>

                    {/* Tap to Talk Button */}
                    <ZenaTalkButton
                        onRecordingComplete={handleRecordingComplete}
                        onAudioLevelChange={handleAudioLevelChange}
                        disabled={isTextLoading || dissolvePhase !== 'idle'}
                    />
                </div>
            </main>
        </div>
    );
};

export default ZenaAskPage;
