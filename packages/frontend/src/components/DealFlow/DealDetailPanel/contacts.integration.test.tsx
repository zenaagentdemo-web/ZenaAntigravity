
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickContacts } from './sections/QuickContacts';
import { api } from '../../../utils/apiClient';
import type { Deal } from '../../types';

// Mock dependencies
vi.mock('../../../utils/apiClient', () => ({
    api: {
        put: vi.fn(),
        patch: vi.fn(),
        get: vi.fn().mockResolvedValue({ data: { contacts: [] } })
    }
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
    useLocation: () => ({ state: null })
}));

vi.mock('../../../../hooks/useDealNavigation', () => ({
    useDealNavigation: () => ({ navigateToFromDeal: vi.fn() })
}));

vi.mock('react-hot-toast', () => ({
    toast: { success: vi.fn(), error: vi.fn() }
}));

// Mock NewContactModal to avoid complex rendering
vi.mock('../../NewContactModal/NewContactModal', () => ({
    NewContactModal: ({ onSave, onClose }: any) => (
        <div data-testid="edit-modal">
            <button onClick={() => onSave({ firstName: 'Jane', lastName: 'Doe', role: 'buyer', email: 'jane@test.com' })}>
                Save Change
            </button>
            <button onClick={onClose}>Close</button>
        </div>
    )
}));

describe('QuickContacts Integration', () => {
    const mockContact = { id: 'c1', name: 'John Doe', role: 'vendor', email: 'john@test.com' };
    const mockDeal: Deal = {
        id: 'deal-1',
        contacts: [mockContact],
        property: { address: '123 Test St' }
    } as any;

    const mockOnUpdate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should call api.put when unlinking a contact', async () => {
        // Mock confirmed window.confirm
        vi.spyOn(window, 'confirm').mockImplementation(() => true);

        render(<QuickContacts deal={mockDeal} onUpdate={mockOnUpdate} />);

        // Expand contact
        fireEvent.click(screen.getByText('John Doe'));

        // Click Unlink
        const unlinkBtn = screen.getByText('Unlink');
        fireEvent.click(unlinkBtn);

        // Verify API call
        expect(api.put).toHaveBeenCalledWith(`/api/deals/${mockDeal.id}`, {
            contacts: [] // Should be empty after removing the only contact
        });

        // Verify Optimistic Update
        expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({
            contacts: []
        }));
    });

});
