/**
 * @vitest-environment jsdom
 */
/**
 * Property-based tests for HamburgerMenu component
 * 
 * Feature: email-management
 * Validates: Menu toggle and action callbacks
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { HamburgerMenu } from './HamburgerMenu';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

describe('HamburgerMenu Property Tests', () => {
    describe('Toggle Behavior', () => {
        it('should show menu button initially', () => {
            const onViewFolders = vi.fn();
            const onCreateFolder = vi.fn();

            const { container, unmount } = render(
                <HamburgerMenu
                    onViewFolders={onViewFolders}
                    onCreateFolder={onCreateFolder}
                />
            );

            // Property: Menu trigger button should always be present
            const menuButton = container.querySelector('.hamburger-menu__trigger');
            expect(menuButton).toBeInTheDocument();

            unmount();
        });

        it('should toggle dropdown visibility on button click', () => {
            const onViewFolders = vi.fn();
            const onCreateFolder = vi.fn();

            const { container, unmount } = render(
                <HamburgerMenu
                    onViewFolders={onViewFolders}
                    onCreateFolder={onCreateFolder}
                />
            );

            const menuButton = container.querySelector('.hamburger-menu__trigger');
            expect(menuButton).not.toBeNull();

            // Initially dropdown should not be visible
            let dropdown = container.querySelector('.hamburger-menu__dropdown');
            expect(dropdown).toBeNull();

            // Click to open
            if (menuButton) {
                fireEvent.click(menuButton);
                dropdown = container.querySelector('.hamburger-menu__dropdown');
                expect(dropdown).toBeInTheDocument();
            }

            unmount();
        });

        it('should close dropdown when clicking outside', () => {
            const onViewFolders = vi.fn();
            const onCreateFolder = vi.fn();

            const { container, unmount } = render(
                <div>
                    <div data-testid="outside-element">Outside</div>
                    <HamburgerMenu
                        onViewFolders={onViewFolders}
                        onCreateFolder={onCreateFolder}
                    />
                </div>
            );

            // Open the menu
            const menuButton = container.querySelector('.hamburger-menu__trigger');
            if (menuButton) {
                fireEvent.click(menuButton);

                // Verify dropdown is open
                let dropdown = container.querySelector('.hamburger-menu__dropdown');
                expect(dropdown).toBeInTheDocument();

                // Click outside
                const outsideElement = screen.getByTestId('outside-element');
                fireEvent.mouseDown(outsideElement);

                // Dropdown should close
                dropdown = container.querySelector('.hamburger-menu__dropdown');
                expect(dropdown).toBeNull();
            }

            unmount();
        });
    });

    describe('Menu Actions', () => {
        it('should call onViewFolders when View Folders is clicked', () => {
            const onViewFolders = vi.fn();
            const onCreateFolder = vi.fn();

            const { container, unmount } = render(
                <HamburgerMenu
                    onViewFolders={onViewFolders}
                    onCreateFolder={onCreateFolder}
                />
            );

            // Open menu
            const menuButton = container.querySelector('.hamburger-menu__trigger');
            if (menuButton) {
                fireEvent.click(menuButton);

                // Click View Folders
                const viewFoldersButton = screen.getByText('View Folders');
                fireEvent.click(viewFoldersButton);

                expect(onViewFolders).toHaveBeenCalledTimes(1);
            }

            unmount();
        });

        it('should call onCreateFolder when Create Folder is clicked', () => {
            const onViewFolders = vi.fn();
            const onCreateFolder = vi.fn();

            const { container, unmount } = render(
                <HamburgerMenu
                    onViewFolders={onViewFolders}
                    onCreateFolder={onCreateFolder}
                />
            );

            // Open menu
            const menuButton = container.querySelector('.hamburger-menu__trigger');
            if (menuButton) {
                fireEvent.click(menuButton);

                // Click Create Folder
                const createFolderButton = screen.getByText('Create Folder');
                fireEvent.click(createFolderButton);

                expect(onCreateFolder).toHaveBeenCalledTimes(1);
            }

            unmount();
        });

        it('should close menu after selecting an action', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('View Folders', 'Create Folder'),
                    (actionText) => {
                        const onViewFolders = vi.fn();
                        const onCreateFolder = vi.fn();

                        const { container, unmount } = render(
                            <HamburgerMenu
                                onViewFolders={onViewFolders}
                                onCreateFolder={onCreateFolder}
                            />
                        );

                        // Open menu
                        const menuButton = container.querySelector('.hamburger-menu__trigger');
                        if (menuButton) {
                            fireEvent.click(menuButton);

                            // Click action
                            const actionButton = screen.getByText(actionText);
                            fireEvent.click(actionButton);

                            // Property: Menu should close after action
                            const dropdown = container.querySelector('.hamburger-menu__dropdown');
                            expect(dropdown).toBeNull();
                        }

                        unmount();
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA attributes on menu button', () => {
            const onViewFolders = vi.fn();
            const onCreateFolder = vi.fn();

            const { container, unmount } = render(
                <HamburgerMenu
                    onViewFolders={onViewFolders}
                    onCreateFolder={onCreateFolder}
                />
            );

            const menuButton = container.querySelector('.hamburger-menu__trigger');
            expect(menuButton).toHaveAttribute('aria-label', 'More options');
            expect(menuButton).toHaveAttribute('aria-haspopup', 'menu');

            unmount();
        });
    });
});
