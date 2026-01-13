/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ContactsPage } from './ContactsPage';
import { api } from '../../utils/apiClient';

// Mock Dependencies
vi.mock('../../utils/apiClient');
vi.mock('../../hooks/useGodmode', () => ({
    useGodmode: () => ({
        settings: { mode: 'off' },
        pendingActions: [],
        pendingCount: 0,
        fetchPendingActions: vi.fn(),
    })
}));
vi.mock('../../hooks/useOracle', () => ({
    useOracle: () => ({
        predictions: {},
        fetchPrediction: vi.fn(),
        batchAnalyze: vi.fn(),
    })
}));
vi.mock('../../hooks/useContactIntelligence', () => ({
    useContactIntelligence: () => ({
        lastEngagementUpdate: null,
        lastCategoryUpdate: null,
        lastBatchUpdate: null,
        lastDiscoveryUpdate: null,
        isConnected: true,
    })
}));
vi.mock('../../hooks/useThreadActions', () => ({
    useThreadActions: () => ({
        addToast: vi.fn(),
        state: { toasts: [] },
        dismissToast: vi.fn(),
    })
}));

// Mock Child Components to reduce noise/dependencies
vi.mock('../../components/GodmodeToggle/GodmodeToggle', () => ({
    GodmodeToggle: () => <div data-testid="godmode-toggle">Godmode Toggle</div>
}));
vi.mock('../../components/AmbientBackground/AmbientBackground', () => ({
    AmbientBackground: () => <div data-testid="ambient-background" />
}));
// Mock NewContactModal to bypass complex internal logic/portals
vi.mock('../../components/NewContactModal/NewContactModal', () => ({
    NewContactModal: ({ isOpen, onClose, onSave }: any) => {
        if (!isOpen) return null;
        return (
            <div data-testid="new-contact-modal">
                <input placeholder="Name" onChange={(e) => { }} />
                <input placeholder="Email" onChange={(e) => { }} />
                <button onClick={() => onSave({ name: 'Charlie Lead', email: 'charlie@test.com' })}>
                    Save
                </button>
            </div>
        );
    }
}));

describe('ContactsPage Comprehensive Integration', () => {
    const mockContacts = [
        {
            id: 'c1',
            name: 'Alice Buyer',
            emails: ['alice@example.com'],
            phones: ['1234567890'],
            role: 'buyer',
            intelligenceSnippet: 'Looking for a home',
            engagementScore: 80
        },
        {
            id: 'c2',
            name: 'Bob Vendor',
            emails: ['bob@example.com'],
            phones: ['0987654321'],
            role: 'vendor',
            intelligenceSnippet: 'Selling downtown apt',
            engagementScore: 60
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Default Mock: Return list of contacts
        (api.get as any).mockImplementation((url: string) => {
            if (url.includes('/api/contacts')) {
                return Promise.resolve({ data: { contacts: mockContacts } });
            }
            return Promise.resolve({ data: {} });
        });
        // Mock Post catch-all
        (api.post as any).mockResolvedValue({ data: {} });
    });

    it('should load and display contacts from API', async () => {
        render(
            <MemoryRouter>
                <ContactsPage />
            </MemoryRouter>
        );

        // Verify API Call
        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/api/contacts'));
        });

        // Verify Content
        expect(await screen.findByText('Alice Buyer')).toBeInTheDocument();
        expect(await screen.findByText('Bob Vendor')).toBeInTheDocument();
    });

    it('should open "Add Contact" modal and submit new contact', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <ContactsPage />
            </MemoryRouter>
        );

        // 1. Click Add Contact
        const addButton = screen.getByRole('button', { name: /add contact/i });
        await user.click(addButton);

        // 2. Mock specific create response
        (api.post as any).mockResolvedValueOnce({
            data: {
                contact: {
                    id: 'new-1',
                    name: 'Charlie Lead',
                    email: 'charlie@test.com',
                    phone: '55555555',
                    role: 'buyer'
                }
            }
        });

        // 3. Fill Form & Submit (Mock handles payload)
        const saveButton = await screen.findByText('Save');
        await user.click(saveButton);

        // 5. Verify API Call
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/api/contacts', expect.objectContaining({
                name: 'Charlie Lead',
                email: 'charlie@test.com'
            }));
        });

        // 6. Verify List Refresh (Mock loadContacts being called again)
        expect(api.get).toHaveBeenCalledTimes(2); // Initial load + refresh
    });

    it('should filtering by Role triggers new API call', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter>
                <ContactsPage />
            </MemoryRouter>
        );

        // Wait for initial load
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

        // Find and click 'Buyer' filter button
        const buyerFilter = await screen.findByRole('button', { name: /buyer/i });
        await user.click(buyerFilter);

        // Verify API Call triggered with new params
        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith(expect.stringContaining('role=buyer'));
        });

        // Ensure standard load count is now 2
        expect(api.get).toHaveBeenCalledTimes(2);
    });
});
