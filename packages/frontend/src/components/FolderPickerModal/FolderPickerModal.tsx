/**
 * FolderPickerModal Component
 * 
 * Modal for selecting a folder to move an email thread to.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { EmailFolder, ALL_FOLDERS, RECENT_FOLDERS } from '../../data/mockFolders';
import './FolderPickerModal.css';

export interface FolderPickerModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Callback to close the modal */
    onClose: () => void;
    /** Callback when a folder is selected */
    onFolderSelect: (folderId: string) => void;
    /** Current folder ID (to exclude from options) */
    currentFolderId?: string;
}

export const FolderPickerModal: React.FC<FolderPickerModalProps> = ({
    isOpen,
    onClose,
    onFolderSelect,
    currentFolderId,
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Reset search on close
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
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

    // Filter folders based on search
    const filteredFolders = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return ALL_FOLDERS.filter(folder =>
            folder.id !== currentFolderId &&
            folder.name.toLowerCase().includes(query)
        );
    }, [searchQuery, currentFolderId]);

    // Get recent folders
    const recentFolders = useMemo(() => {
        return RECENT_FOLDERS
            .map(id => ALL_FOLDERS.find(f => f.id === id))
            .filter((f): f is EmailFolder => f !== undefined && f.id !== currentFolderId);
    }, [currentFolderId]);

    const handleFolderClick = useCallback((folderId: string) => {
        onFolderSelect(folderId);
        onClose();
    }, [onFolderSelect, onClose]);

    if (!isOpen) return null;

    return (
        <div className="folder-picker__overlay" onClick={onClose}>
            <div
                className="folder-picker"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="folder-picker-title"
            >
                {/* Header */}
                <div className="folder-picker__header">
                    <h2 id="folder-picker-title" className="folder-picker__title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        Move to Folder
                    </h2>
                    <button
                        className="folder-picker__close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="folder-picker__search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        className="folder-picker__search-input"
                        placeholder="Search folders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Folder List */}
                <div className="folder-picker__content">
                    {/* Recent Folders */}
                    {!searchQuery && recentFolders.length > 0 && (
                        <div className="folder-picker__section">
                            <div className="folder-picker__section-title">Recent</div>
                            {recentFolders.map(folder => (
                                <button
                                    key={folder.id}
                                    className="folder-picker__item"
                                    onClick={() => handleFolderClick(folder.id)}
                                >
                                    <span
                                        className="folder-picker__color"
                                        style={{ backgroundColor: folder.color || 'rgba(255,255,255,0.3)' }}
                                    />
                                    <span className="folder-picker__name">{folder.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* All Folders */}
                    <div className="folder-picker__section">
                        <div className="folder-picker__section-title">
                            {searchQuery ? 'Search Results' : 'All Folders'}
                        </div>
                        {filteredFolders.length > 0 ? (
                            filteredFolders.map(folder => (
                                <button
                                    key={folder.id}
                                    className="folder-picker__item"
                                    onClick={() => handleFolderClick(folder.id)}
                                >
                                    <span
                                        className="folder-picker__color"
                                        style={{ backgroundColor: folder.color || 'rgba(255,255,255,0.3)' }}
                                    />
                                    <span className="folder-picker__name">{folder.name}</span>
                                    {folder.type === 'synced' && (
                                        <span className="folder-picker__badge">Synced</span>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="folder-picker__empty">
                                No folders found matching "{searchQuery}"
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FolderPickerModal;
