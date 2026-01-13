
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContactsPage } from './ContactsPage';
import { api } from '../../utils/apiClient';
import { BrowserRouter } from 'react-router-dom';

// Mock API
vi.mock('../../utils/apiClient', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

// Mock Hooks that might cause issues if unmocked
vi.mock('../../hooks/useThreadActions', () => ({
    useThreadActions: () => ({
        state: { toasts: [] },
        addToast: vi.fn(),
        dismissToast: vi.fn(),
    }),
}));

vi.mock('../../hooks/useContactIntelligence', () => ({
    useContactIntelligence: () => ({
        lastEngagementUpdate: null,
        lastCategoryUpdate: null,
        lastBatchUpdate: null,
        lastDiscoveryUpdate: null,
        isConnected: true,
    }),
}));

vi.mock('../../hooks/useOracle', () => ({
    useOracle: () => ({
        predictions: {},
        fetchPrediction: vi.fn(),
        batchAnalyze: vi.fn(),
    }),
}));

vi.mock('../../hooks/useGodmode', () => ({
    useGodmode: () => ({
        settings: {},
        pendingActions: [],
        pendingCount: 0,
        fetchPendingActions: vi.fn(),
    }),
}));

describe('Scenario 1: Contact Creation & Proactive Enrichment', () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    beforeEach(() => {
        vi.useFakeTimers();
        window.scrollTo = vi.fn(); // Mock scrollTo

        // Default mocks
        (api.get as any).mockResolvedValue({ data: { contacts: [] } }); // No contacts initially
        (api.post as any).mockImplementation((url: string) => {
            if (url === '/api/godmode/heartbeat') return Promise.resolve({});
            return Promise.resolve({ data: {} });
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('should detect intent from search, suggest adding contact, and prefill the modal', async () => {
        // --------------------------------------------------------
        // Step 1: User visits the Contacts Page
        // --------------------------------------------------------
        render(
            <BrowserRouter>
                <ContactsPage />
            </BrowserRouter>
        );

        // Verify page loaded
        expect(screen.getByPlaceholderText(/Search or Ask Zena/i)).toBeInTheDocument();

        // --------------------------------------------------------
        // Step 2: User types a name "John Doe"
        // --------------------------------------------------------
        const searchInput = screen.getByPlaceholderText(/Search or Ask Zena/i);

        // Mock the Intent Analysis API response
        (api.post as any).mockImplementation(async (url: string, body: any) => {
            if (url === '/api/ask/analyze-intent') {
                if (body.text === 'John Doe') {
                    return {
                        data: {
                            intentDetected: true,
                            intentType: 'create_contact',
                            suggestion: {
                                message: 'Is this John Doe from ReMax?',
                                action: 'open_new_contact_modal',
                                prefill: { name: 'John Doe' }
                            }
                        }
                    };
                }
            }
            return { data: {} };
        });

        await user.type(searchInput, 'John Doe');

        // --------------------------------------------------------
        // Step 3: Wait for Debounce & Proactive Suggestion
        // --------------------------------------------------------
        // ContactsPage has a 600ms debounce
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        // Verify Zena's suggestion appears (Proactivity Check)
        expect(await screen.findByText('Is this John Doe from ReMax?', {}, { timeout: 3000 })).toBeInTheDocument();

        // --------------------------------------------------------
        // Step 4: User accepts the suggestion
        // --------------------------------------------------------
        const addContactBtn = screen.getByRole('button', { name: /Add Contact/i });
        await user.click(addContactBtn);

        // --------------------------------------------------------
        // Step 5: Verify the "Reasoning Chain" Result
        // --------------------------------------------------------

        // Check for Modal Title
        expect(await screen.findByText(/Add Contact: John Doe/i)).toBeInTheDocument();

        // Check for Input Value
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();

        // Check for Zena Badge
        expect(screen.getByText(/Pre-filled from your search/i)).toBeInTheDocument();
    });
});
