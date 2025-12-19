/**
 * CreateFolderModal Component
 * 
 * Modal for creating a new email folder.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import './CreateFolderModal.css';

// Color options for folders
const FOLDER_COLORS = [
    '#00D4FF', // Cyan
    '#8B5CF6', // Purple
    '#00FF88', // Green
    '#FFAA00', // Orange
    '#FF4444', // Red
    '#FFD700', // Gold
    '#FF69B4', // Pink
    '#4ECDC4', // Teal
];

export interface CreateFolderModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback to close the modal */
    onClose: () => void;
    /** Callback when folder is created */
    onCreateFolder: (folder: { name: string; color: string }) => void;
    /** Existing folder names (for validation) */
    existingFolderNames?: string[];
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
    isOpen,
    onClose,
    onCreateFolder,
    existingFolderNames = [],
}) => {
    const [name, setName] = useState('');
    const [color, setColor] = useState(FOLDER_COLORS[0]);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setName('');
            setColor(FOLDER_COLORS[0]);
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Validate folder name
    const validateName = useCallback((value: string): string | null => {
        if (!value.trim()) {
            return 'Folder name is required';
        }
        if (value.trim().length < 2) {
            return 'Folder name must be at least 2 characters';
        }
        if (value.trim().length > 50) {
            return 'Folder name must be less than 50 characters';
        }
        if (existingFolderNames.some(n => n.toLowerCase() === value.trim().toLowerCase())) {
            return 'A folder with this name already exists';
        }
        return null;
    }, [existingFolderNames]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validateName(name);
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsCreating(true);
        try {
            await onCreateFolder({ name: name.trim(), color });
            onClose();
        } finally {
            setIsCreating(false);
        }
    }, [name, color, validateName, onCreateFolder, onClose]);

    const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
        if (error) {
            setError(null);
        }
    }, [error]);

    if (!isOpen) return null;

    return (
        <div className="create-folder-modal__overlay" onClick={onClose}>
            <div
                className="create-folder-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-folder-title"
            >
                {/* Header */}
                <div className="create-folder-modal__header">
                    <h2 id="create-folder-title" className="create-folder-modal__title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            <line x1="12" y1="11" x2="12" y2="17" />
                            <line x1="9" y1="14" x2="15" y2="14" />
                        </svg>
                        Create New Folder
                    </h2>
                    <button
                        className="create-folder-modal__close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form className="create-folder-modal__form" onSubmit={handleSubmit}>
                    {/* Folder Name */}
                    <div className="create-folder-modal__field">
                        <label htmlFor="folder-name" className="create-folder-modal__label">
                            Folder Name
                        </label>
                        <input
                            ref={inputRef}
                            id="folder-name"
                            type="text"
                            className={`create-folder-modal__input ${error ? 'create-folder-modal__input--error' : ''}`}
                            placeholder="e.g., Important Clients"
                            value={name}
                            onChange={handleNameChange}
                            maxLength={50}
                        />
                        {error && (
                            <span className="create-folder-modal__error">{error}</span>
                        )}
                    </div>

                    {/* Color Selection */}
                    <div className="create-folder-modal__field">
                        <label className="create-folder-modal__label">Folder Color</label>
                        <div className="create-folder-modal__colors">
                            {FOLDER_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    className={`create-folder-modal__color-btn ${color === c ? 'create-folder-modal__color-btn--selected' : ''}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setColor(c)}
                                    aria-label={`Select color ${c}`}
                                    aria-pressed={color === c}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="create-folder-modal__preview">
                        <span className="create-folder-modal__preview-label">Preview</span>
                        <div className="create-folder-modal__preview-folder">
                            <span
                                className="create-folder-modal__preview-color"
                                style={{ backgroundColor: color }}
                            />
                            <span className="create-folder-modal__preview-name">
                                {name.trim() || 'New Folder'}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="create-folder-modal__actions">
                        <button
                            type="button"
                            className="create-folder-modal__btn create-folder-modal__btn--cancel"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="create-folder-modal__btn create-folder-modal__btn--create"
                            disabled={!name.trim() || isCreating}
                        >
                            {isCreating ? (
                                <>
                                    <span className="create-folder-modal__spinner" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Create Folder
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFolderModal;
