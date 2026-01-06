import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ConnectionCentrePage } from './ConnectionCentrePage';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the apiClient module
vi.mock('../../utils/apiClient', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn()
    }
}));

// Import the mocked module
import { api } from '../../utils/apiClient';

const mockConnections = {
    success: true,
    connections: [
        { id: 'oneroof', name: 'OneRoof', status: 'connected', type: 'portal' },
        { id: 'mri_vault', name: 'MRI Vault', status: 'disconnected', type: 'crm' }
    ]
};

describe('ConnectionCentrePage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (api.get as any).mockResolvedValue({ data: mockConnections });
        (api.post as any).mockResolvedValue({ data: { success: true, id: 'mri_vault' } });
    });

    it('renders and fetches connections on mount', async () => {
        render(
            <BrowserRouter>
                <ConnectionCentrePage />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('OneRoof')).toBeInTheDocument();
            expect(screen.getByText('MRI Vault')).toBeInTheDocument();
        });

        expect(api.get).toHaveBeenCalledWith('/api/connections');
    });

    it('toggles connection status when button is clicked', async () => {
        render(
            <BrowserRouter>
                <ConnectionCentrePage />
            </BrowserRouter>
        );

        const vaultCard = await waitFor(() => {
            const el = screen.getByText('MRI Vault').closest('.connection-card');
            if (!el) throw new Error('Not found yet');
            return el;
        });
        if (!vaultCard) throw new Error('Could not find MRI Vault card');

        const connectButton = within(vaultCard as HTMLElement).getByRole('button', { name: /SECURE CONNECT/i });
        fireEvent.click(connectButton);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/api/connections/mri_vault/toggle');
        });
    });

    it('opens Link New Tool modal when clicking the add card', async () => {
        render(
            <BrowserRouter>
                <ConnectionCentrePage />
            </BrowserRouter>
        );

        const addCard = screen.getByText(/LINK NEW TOOL/i).closest('.connection-card--add-full');
        if (!addCard) throw new Error('Could not find Link New Tool card');
        fireEvent.click(addCard);

        expect(screen.getByText(/LINK NEW APPLICATION/i)).toBeInTheDocument();
        expect(screen.getByText(/INITIATE LINK/i)).toBeInTheDocument();
    });
});

