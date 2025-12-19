/**
 * HamburgerMenu Component
 * 
 * Three-dot overflow menu for the New page header providing access to
 * folder management and other email functions.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import './HamburgerMenu.css';

export interface HamburgerMenuProps {
    /** Callback when View Folders is clicked */
    onViewFolders: () => void;
    /** Callback when Create Folder is clicked */
    onCreateFolder: () => void;
    /** Callback when Refresh is clicked */
    onRefresh?: () => void;
    /** Callback when Settings is clicked */
    onSettings?: () => void;
    /** Callback when Help is clicked */
    onHelp?: () => void;
    /** Optional className */
    className?: string;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
    onViewFolders,
    onCreateFolder,
    onRefresh,
    onSettings,
    onHelp,
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const toggleMenu = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    const handleMenuItemClick = useCallback((action: () => void) => {
        action();
        setIsOpen(false);
    }, []);

    return (
        <div className={`hamburger-menu ${className}`}>
            <button
                ref={buttonRef}
                className="hamburger-menu__trigger"
                onClick={toggleMenu}
                aria-label="More options"
                aria-expanded={isOpen}
                aria-haspopup="menu"
                data-testid="hamburger-menu-trigger"
            >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                </svg>
            </button>

            {isOpen && (
                <div
                    ref={menuRef}
                    className="hamburger-menu__dropdown"
                    role="menu"
                    aria-label="Email options"
                    data-testid="hamburger-menu-dropdown"
                >
                    {/* Primary Actions */}
                    <button
                        className="hamburger-menu__item"
                        onClick={() => handleMenuItemClick(onViewFolders)}
                        role="menuitem"
                        data-testid="menu-view-folders"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hamburger-menu__icon">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>View Folders</span>
                    </button>

                    <button
                        className="hamburger-menu__item"
                        onClick={() => handleMenuItemClick(onCreateFolder)}
                        role="menuitem"
                        data-testid="menu-create-folder"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hamburger-menu__icon">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            <line x1="12" y1="11" x2="12" y2="17" />
                            <line x1="9" y1="14" x2="15" y2="14" />
                        </svg>
                        <span>Create Folder</span>
                    </button>

                    <div className="hamburger-menu__divider" role="separator" />

                    {/* Secondary Actions */}
                    {onRefresh && (
                        <button
                            className="hamburger-menu__item"
                            onClick={() => handleMenuItemClick(onRefresh)}
                            role="menuitem"
                            data-testid="menu-refresh"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hamburger-menu__icon">
                                <polyline points="23 4 23 10 17 10" />
                                <polyline points="1 20 1 14 7 14" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                            <span>Refresh Inbox</span>
                        </button>
                    )}

                    {onSettings && (
                        <button
                            className="hamburger-menu__item"
                            onClick={() => handleMenuItemClick(onSettings)}
                            role="menuitem"
                            data-testid="menu-settings"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hamburger-menu__icon">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                            <span>Settings</span>
                        </button>
                    )}

                    {onHelp && (
                        <button
                            className="hamburger-menu__item"
                            onClick={() => handleMenuItemClick(onHelp)}
                            role="menuitem"
                            data-testid="menu-help"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hamburger-menu__icon">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <span>Help</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default HamburgerMenu;
