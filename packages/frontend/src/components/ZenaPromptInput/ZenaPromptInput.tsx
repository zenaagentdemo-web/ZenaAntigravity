import React, { useState, useCallback, useRef, memo } from 'react';
import './ZenaPromptInput.css';

export interface ZenaPromptInputProps {
    /** Callback when question is submitted */
    onSubmit: (question: string) => void;
    /** Placeholder text */
    placeholder?: string;
    /** Whether input is disabled */
    disabled?: boolean;
    /** Whether submission is in progress */
    isLoading?: boolean;
    /** Additional CSS class */
    className?: string;
}

/**
 * ZenaPromptInput - High-tech text input for asking Zena questions
 * 
 * Features:
 * - Sleek glowing border on focus
 * - Integrated submit button with icon
 * - Enter key submission
 * - Loading state with spinner
 */
export const ZenaPromptInput: React.FC<ZenaPromptInputProps> = memo(({
    onSubmit,
    placeholder = 'Ask Zena anything...',
    disabled = false,
    isLoading = false,
    className = '',
}) => {
    const [value, setValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const isDisabled = disabled || isLoading;
    const canSubmit = value.trim().length > 0 && !isDisabled;

    const handleSubmit = useCallback(() => {
        const trimmed = value.trim();
        if (trimmed.length === 0 || isDisabled) return;

        onSubmit(trimmed);
        setValue('');
    }, [value, isDisabled, onSubmit]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
    }, []);

    const handleFocus = useCallback(() => {
        setIsFocused(true);
    }, []);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
    }, []);

    const containerClasses = [
        'zena-prompt-input',
        isFocused ? 'zena-prompt-input--focused' : '',
        isLoading ? 'zena-prompt-input--loading' : '',
        isDisabled ? 'zena-prompt-input--disabled' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClasses}>
            {/* Glow effect layer */}
            <div className="zena-prompt-input__glow" />

            <div className="zena-prompt-input__container">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    disabled={isDisabled}
                    className="zena-prompt-input__input"
                    aria-label="Ask Zena a question"
                    autoComplete="off"
                />

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="zena-prompt-input__submit"
                    aria-label={isLoading ? 'Sending...' : 'Send question'}
                >
                    {isLoading ? (
                        <span className="zena-prompt-input__spinner" />
                    ) : (
                        <svg
                            className="zena-prompt-input__icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M22 2L11 13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
});

ZenaPromptInput.displayName = 'ZenaPromptInput';

export default ZenaPromptInput;
