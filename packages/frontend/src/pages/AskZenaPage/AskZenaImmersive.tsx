import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './AskZenaPage.immersive.css';

/**
 * AskZenaImmersive (Rebuilt)
 * A clean, minimalist "blank slate" experience for Zena.
 */
export const AskZenaImmersive: React.FC = () => {
    const navigate = useNavigate();
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        console.log('Query submitted:', inputValue);
        // Reset input for now - further logic to be added in future tasks
        setInputValue('');
    }, [inputValue]);

    return (
        <div className="ask-zena-immersive-rebuilt">
            {/* Header */}
            <header className="ask-zena-rebuilt-header">
                <button
                    className="ask-zena-rebuilt-back-btn"
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                >
                    ←
                </button>
            </header>

            {/* Main Stage - Initially Blank */}
            <main className="ask-zena-rebuilt-stage">
                {/* Reserved for future avatar/interaction content */}
            </main>

            {/* Bottom Input Area */}
            <footer className="ask-zena-rebuilt-footer">
                <div className="ask-zena-rebuilt-input-container">
                    <form onSubmit={handleSubmit} className="ask-zena-rebuilt-form">
                        <input
                            type="text"
                            className="ask-zena-rebuilt-input"
                            placeholder="Type your message..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="ask-zena-rebuilt-send-btn"
                            disabled={!inputValue.trim()}
                        >
                            ➤
                        </button>
                    </form>
                </div>
            </footer>
        </div>
    );
};

export default AskZenaImmersive;
