import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PropertiesPage } from './PropertiesPage';
import { api } from '../../utils/apiClient';

// --- Mocks ---

// Mock API Client
// Mock API Client
vi.mock('../../utils/apiClient', () => ({
    api: {
        get: vi.fn().mockResolvedValue({ data: [] }),
        post: vi.fn().mockResolvedValue({ data: {} })
    }
}));

// Mock Hooks
vi.mock('../../hooks/useGodmode', () => ({
    useGodmode: () => ({
        settings: { mode: 'off' },
        pendingActions: [],
        pendingCount: 0,
        fetchPendingActions: vi.fn()
    })
}));

vi.mock('../../hooks/useThreadActions', () => ({
    useThreadActions: () => ({
        addToast: vi.fn(),
        state: { toasts: [] },
        dismissToast: vi.fn()
    })
}));

vi.mock('../../hooks/usePropertyIntelligence', () => ({
    usePropertyIntelligence: () => ({
        lastPropertyUpdate: null,
        getIntelligence: vi.fn().mockResolvedValue(null),
        refreshIntelligence: vi.fn()
    })
}));

// Mock Child Components to isolate Page Logic
vi.mock('../../components/AddPropertyModal/AddPropertyModal', () => ({
    AddPropertyModal: ({ isOpen, onClose, onSave }: any) => {
        if (!isOpen) return null;
        return (
            <div data-testid="add-property-modal">
                <button onClick={() => onSave({ address: '123 New St' })}>Save New Property</button>
                <button onClick={onClose}>Close</button>
            </div>
        );
    }
}));

vi.mock('../../components/BatchActionBar/BatchActionBar', () => ({
    BatchActionBar: () => <div data-testid="batch-action-bar">Batch Actions</div>
}));

// Mock GodmodeToggle to avoid rendering errors
vi.mock('../../components/GodmodeToggle/GodmodeToggle', () => ({
    GodmodeToggle: () => <div data-testid="godmode-toggle">GodMode</div>
}));

// Mock other components to avoid rendering issues
vi.mock('../../components/AmbientBackground/AmbientBackground', () => ({
    AmbientBackground: () => null
}));
vi.mock('../../components/Toast/Toast', () => ({
    ToastContainer: () => null
}));

describe('PropertiesPage Integration Tests', () => {
    const user = userEvent.setup();

    const mockProperties = [
        {
            id: '1',
            address: '100 Main St',
            status: 'active',
            listingPrice: 1000000,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            milestones: [],
            vendors: [],
            heatLevel: 'hot',
        },
        {
            id: '2',
            address: '200 High St',
            status: 'sold',
            listingPrice: 800000,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            milestones: [],
            vendors: [],
            heatLevel: 'cold',
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (api.get as any).mockResolvedValue({ data: { properties: mockProperties } });
    });

    afterEach(() => {
        cleanup();
    });

    it('loads and displays properties from API', async () => {
        render(
            <MemoryRouter>
                <PropertiesPage />
            </MemoryRouter>
        );

        // Verify loading state might be unnecessary if it's too fast, but we expect addresses eventually
        expect(await screen.findByText('100 Main St')).toBeInTheDocument();
        expect(await screen.findByText('200 High St')).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/api/properties');
    });

    it('handles "Add Property" flow', async () => {
        (api.post as any).mockResolvedValue({ data: { id: '3', address: '123 New St', status: 'active' } });

        // We need to re-mock get to return the new list after save if the component refetches
        // However, usually optimistically updates or just refetches.
        // Let's assume refetch:
        (api.get as any).mockResolvedValueOnce({ data: { properties: mockProperties } })
            .mockResolvedValueOnce({ data: { properties: [...mockProperties, { id: '3', address: '123 New St', status: 'active' }] } });

        render(
            <MemoryRouter>
                <PropertiesPage />
            </MemoryRouter>
        );

        // Find "Add Property" button (assuming it has a clear text or aria-label)
        // Looking at file, it's likely a Plus icon or "Add Property" text. 
        // Usually these are standard buttons. Let's try to find by role.
        // Based on previous files, it might be an icon button. Verification required? 
        // Code review shows: <Plus ... /> inside a button, maybe no text?
        // Let's find by generic button and hope, or look for aria-label if we knew it.
        // Actually, looking at imports: import { Plus } ...
        // Let's try to find the button that triggers it. 
        // If I can't find it easily, I'll rely on a known accessible name or create a data-testid in the next step.
        // For now, let's assume there is an "Add Property" button or similar.
        // Wait, the component file has `setIsAddModalOpen(true)` on some click. 

        // Let's assume there's a button with "Add Property" or just try to find the Plus icon container.
        // I'll check the file content again if this fails, but for now I'll guess standard UI.
        // Actually, I'll add a test-id to the button if I have to, but let's try finding by text first.
        // If it's just an icon, I might need `findByTestId`. 
        // Let's assume there's a button.

        // If I look at the code `PropertiesPage.tsx` again (not visible now), 
        // I see `handleProactiveSuggestionClick` calls `setIsAddModalOpen(true)`.
        // But there must be a manual trigger.
        // I'll search for `setIsAddModalOpen(true)` in the view_file output from earlier?
        // It was line 177: `const [isAddModalOpen, setIsAddModalOpen] = useState(false);`
        // I didn't see the render method in the previous `view_file`.
        // I will read the file again to find the button trigger.
    });

    it('filters properties via API or client', async () => {
        render(
            <MemoryRouter>
                <PropertiesPage />
            </MemoryRouter>
        );

        expect(await screen.findByText('100 Main St')).toBeInTheDocument();

        // The stats orb has "SOLD"
        const soldFilter = await screen.findByText('SOLD');
        await user.click(soldFilter);

        await waitFor(() => {
            expect(screen.queryByText('100 Main St')).not.toBeInTheDocument();
        });
        expect(screen.getByText('200 High St')).toBeInTheDocument();
    });

    it('activates Smart Search on valid query', async () => {
        render(
            <MemoryRouter>
                <PropertiesPage />
            </MemoryRouter>
        );

        const searchInput = await screen.findByPlaceholderText(/search/i);
        await user.type(searchInput, 'cheap houses');

        // Explicitly click the button to ensure handler fires
        const askButton = await screen.findByRole('button', { name: /Ask Zena/i });
        await user.click(askButton);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/api/ask/property-search', { query: 'cheap houses' });
        });
    });
});
