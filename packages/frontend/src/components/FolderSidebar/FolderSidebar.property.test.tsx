/**
 * @vitest-environment jsdom
 */
/**
 * Property-based tests for FolderSidebar component
 * 
 * Feature: email-management
 * Validates: Folder navigation slide-in panel
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { FolderSidebar } from './FolderSidebar';
import { EmailFolder } from '../../data/mockFolders';

// Cleanup after each test
afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
});

describe('FolderSidebar Property Tests', () => {
    describe('Visibility Control', () => {
        it('should NOT render anything when isOpen is false', () => {
            const onClose = vi.fn();
            const onFolderSelect = vi.fn();

            const { container, unmount } = render(
                <FolderSidebar
                    isOpen={false}
                    onClose={onClose}
                    activeFolderId="inbox"
                    onFolderSelect={onFolderSelect}
                />
            );

            // Property: When isOpen is false, nothing should be rendered
            expect(container.innerHTML).toBe('');

            unmount();
        });

        it('should render sidebar panel when isOpen is true', () => {
            const onClose = vi.fn();
            const onFolderSelect = vi.fn();

            const { unmount } = render(
                <FolderSidebar
                    isOpen={true}
                    onClose={onClose}
                    activeFolderId="inbox"
                    onFolderSelect={onFolderSelect}
                />
            );

            // Property: When isOpen is true, sidebar should be visible
            const sidebar = screen.getByTestId('folder-sidebar');
            expect(sidebar).toBeInTheDocument();
            expect(sidebar).toHaveClass('folder-sidebar--open');

            unmount();
        });
    });

    describe('Overlay Interactions', () => {
        it('should call onClose when overlay is clicked', () => {
            const onClose = vi.fn();
            const onFolderSelect = vi.fn();

            const { container, unmount } = render(
                <FolderSidebar
                    isOpen={true}
                    onClose={onClose}
                    activeFolderId="inbox"
                    onFolderSelect={onFolderSelect}
                />
            );

            // Find and click overlay
            const overlay = container.querySelector('.folder-sidebar__overlay');
            expect(overlay).not.toBeNull();

            if (overlay) {
                fireEvent.click(overlay);
                expect(onClose).toHaveBeenCalledTimes(1);
            }

            unmount();
        });

        it('should call onClose when Escape key is pressed', () => {
            const onClose = vi.fn();
            const onFolderSelect = vi.fn();

            const { unmount } = render(
                <FolderSidebar
                    isOpen={true}
                    onClose={onClose}
                    activeFolderId="inbox"
                    onFolderSelect={onFolderSelect}
                />
            );

            // Simulate Escape key
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(onClose).toHaveBeenCalledTimes(1);

            unmount();
        });
    });

    describe('Folder Selection', () => {
        it('should call onFolderSelect with folder ID when a folder is clicked', () => {
            const onClose = vi.fn();
            const onFolderSelect = vi.fn();

            const { unmount } = render(
                <FolderSidebar
                    isOpen={true}
                    onClose={onClose}
                    activeFolderId="inbox"
                    onFolderSelect={onFolderSelect}
                />
            );

            // Click on the Inbox folder (using built-in system folders)
            const inboxButton = screen.getByText('Inbox').closest('button');
            if (inboxButton) {
                fireEvent.click(inboxButton);
                expect(onFolderSelect).toHaveBeenCalledWith('inbox');
            }

            unmount();
        });
    });

    describe('Custom Folders Display', () => {
        it('should display custom folders when provided', () => {
            const customFolders: EmailFolder[] = [
                {
                    id: 'custom-1',
                    name: 'My Custom Folder',
                    type: 'custom',
                    unreadCount: 5,
                    color: '#ff0000',
                    totalCount: 10,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'custom-2',
                    name: 'Another Folder',
                    type: 'custom',
                    unreadCount: 0,
                    color: '#00ff00',
                    totalCount: 5,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
            ];

            const onClose = vi.fn();
            const onFolderSelect = vi.fn();

            const { unmount } = render(
                <FolderSidebar
                    isOpen={true}
                    onClose={onClose}
                    activeFolderId="inbox"
                    onFolderSelect={onFolderSelect}
                    customFolders={customFolders}
                />
            );

            // Property: Custom folders should be visible
            expect(screen.getByText('My Custom Folder')).toBeInTheDocument();
            expect(screen.getByText('Another Folder')).toBeInTheDocument();

            unmount();
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA attributes', () => {
            const onClose = vi.fn();
            const onFolderSelect = vi.fn();

            const { unmount } = render(
                <FolderSidebar
                    isOpen={true}
                    onClose={onClose}
                    activeFolderId="inbox"
                    onFolderSelect={onFolderSelect}
                />
            );

            // Property: Sidebar should have navigation role and aria-label
            const sidebar = screen.getByTestId('folder-sidebar');
            expect(sidebar).toHaveAttribute('role', 'navigation');
            expect(sidebar).toHaveAttribute('aria-label', 'Folder navigation');

            unmount();
        });
    });
});
