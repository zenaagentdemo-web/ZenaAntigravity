/**
 * FolderSidebar Component
 * 
 * Slide-in sidebar panel displaying all email folders.
 * Shows folder hierarchy with unread counts.
 */

import React, { useEffect, useCallback } from 'react';
import { EmailFolder, SYSTEM_FOLDERS, SYNCED_FOLDERS, CUSTOM_FOLDERS, getChildFolders } from '../../data/mockFolders';
import './FolderSidebar.css';

export interface FolderSidebarProps {
    /** Whether the sidebar is open */
    isOpen: boolean;
    /** Callback to close the sidebar */
    onClose: () => void;
    /** Currently active folder ID */
    activeFolderId?: string;
    /** Callback when a folder is selected */
    onFolderSelect: (folderId: string) => void;
    /** Callback when Create Folder is clicked */
    onCreateFolder?: () => void;
    /** Callback when a folder is deleted */
    onDeleteFolder?: (folderId: string) => void;
    /** Custom folders (for dynamic updates) */
    customFolders?: EmailFolder[];
}

// Folder icon mapping
const getFolderIcon = (folder: EmailFolder): JSX.Element => {
    const iconProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" };

    switch (folder.icon || folder.id) {
        case 'inbox':
            return (
                <svg {...iconProps}>
                    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
            );
        case 'send':
        case 'sent':
            return (
                <svg {...iconProps}>
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
            );
        case 'drafts':
        case 'file-text':
            return (
                <svg {...iconProps}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                </svg>
            );
        case 'archive':
            return (
                <svg {...iconProps}>
                    <polyline points="21 8 21 21 3 21 3 8" />
                    <rect x="1" y="3" width="22" height="5" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                </svg>
            );
        case 'trash':
            return (
                <svg {...iconProps}>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
            );
        case 'spam':
        case 'alert-circle':
            return (
                <svg {...iconProps}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            );
        default:
            return (
                <svg {...iconProps}>
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
            );
    }
};

export const FolderSidebar: React.FC<FolderSidebarProps> = ({
    isOpen,
    onClose,
    activeFolderId,
    onFolderSelect,
    onCreateFolder,
    onDeleteFolder,
    customFolders = CUSTOM_FOLDERS,
}) => {
    // Close on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when sidebar is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleFolderClick = useCallback((folderId: string) => {
        onFolderSelect(folderId);
        onClose();
    }, [onFolderSelect, onClose]);

    const renderFolderItem = (folder: EmailFolder, depth: number = 0) => {
        const children = getChildFolders(folder.id);
        const isActive = activeFolderId === folder.id;

        return (
            <div key={folder.id}>
                <button
                    className={`folder-sidebar__item ${isActive ? 'folder-sidebar__item--active' : ''}`}
                    style={{ paddingLeft: `${16 + depth * 16}px` }}
                    onClick={() => handleFolderClick(folder.id)}
                    data-testid={`folder-item-${folder.id}`}
                >
                    <span
                        className="folder-sidebar__icon"
                        style={folder.color ? { color: folder.color } : undefined}
                    >
                        {getFolderIcon(folder)}
                    </span>
                    <span className="folder-sidebar__name">{folder.name}</span>
                    {folder.unreadCount > 0 && (
                        <span className="folder-sidebar__badge">{folder.unreadCount}</span>
                    )}
                </button>
                {children.map(child => renderFolderItem(child, depth + 1))}
            </div>
        );
    };

    // Don't render anything when closed to prevent z-index conflicts
    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="folder-sidebar__overlay folder-sidebar__overlay--visible"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sidebar Panel */}
            <aside
                className="folder-sidebar folder-sidebar--open"
                role="navigation"
                aria-label="Folder navigation"
                data-testid="folder-sidebar"
            >
                {/* Header */}
                <div className="folder-sidebar__header">
                    <h2 className="folder-sidebar__title">Folders</h2>
                    <button
                        className="folder-sidebar__close"
                        onClick={onClose}
                        aria-label="Close folders"
                        data-testid="folder-sidebar-close"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Folder List */}
                <div className="folder-sidebar__content">
                    {/* System Folders */}
                    <div className="folder-sidebar__section">
                        <div className="folder-sidebar__section-title">System</div>
                        {SYSTEM_FOLDERS.filter(f => !f.parentId).map(folder => renderFolderItem(folder))}
                    </div>

                    {/* Synced Folders */}
                    {SYNCED_FOLDERS.length > 0 && (
                        <div className="folder-sidebar__section">
                            <div className="folder-sidebar__section-title">
                                Synced
                                <span className="folder-sidebar__sync-badge">Gmail</span>
                            </div>
                            {SYNCED_FOLDERS.filter(f => !f.parentId).map(folder => renderFolderItem(folder))}
                        </div>
                    )}

                    {/* Custom Folders */}
                    {customFolders.length > 0 && (
                        <div className="folder-sidebar__section">
                            <div className="folder-sidebar__section-title">Custom</div>
                            {customFolders.filter(f => !f.parentId).map(folder => (
                                <div key={folder.id} className="folder-sidebar__custom-item">
                                    {renderFolderItem(folder)}
                                    {onDeleteFolder && (
                                        <button
                                            className="folder-sidebar__delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteFolder(folder.id);
                                            }}
                                            aria-label={`Delete folder ${folder.name}`}
                                            data-testid={`delete-folder-${folder.id}`}
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with Create Folder */}
                {onCreateFolder && (
                    <div className="folder-sidebar__footer">
                        <button
                            className="folder-sidebar__create-btn"
                            onClick={onCreateFolder}
                            data-testid="folder-sidebar-create"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Create New Folder
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
};

export default FolderSidebar;
