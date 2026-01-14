
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScheduleOpenHomeModal } from './ScheduleOpenHomeModal';
import React from 'react';

// Mock dependencies
const mockApiPost = vi.fn();
const mockApiGet = vi.fn();
const mockApiPut = vi.fn();

vi.mock('../../utils/apiClient', () => ({
    api: {
        post: (...args: any[]) => mockApiPost(...args),
        get: (...args: any[]) => mockApiGet(...args),
        put: (...args: any[]) => mockApiPut(...args),
    }
}));

// Mock Portal
vi.mock('react-dom', async () => {
    const actual = await vi.importActual('react-dom');
    return {
        ...actual,
        createPortal: (node: React.ReactNode) => node,
    };
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

// Mock components
vi.mock('../ZenaDatePicker/ZenaDatePicker', () => ({
    ZenaDatePicker: ({ onChange }: any) => (
        <input
            data-testid="date-picker"
            onChange={e => onChange(e.target.value)}
        />
    )
}));

vi.mock('../ZenaTimePicker/ZenaTimePicker', () => ({
    ZenaTimePicker: ({ onChange, value }: any) => (
        <input
            data-testid="time-picker"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="zena-time-picker-stub"
        />
    )
}));

vi.mock('../ZenaConflictModal/ZenaConflictModal', () => ({
    ZenaConflictModal: () => <div data-testid="conflict-modal" />
}));

describe('ScheduleOpenHomeModal Tests - Link Contacts', () => {

    // We mock contacts to be returned by listProperties if used, 
    // BUT the requirement says we should fetch contacts.
    // The implementation plan says: "Fetches contacts via api.get('/api/contacts')"

    const mockContacts = [
        { id: 'c1', name: 'John Doe', role: 'Buyer' },
        { id: 'c2', name: 'Jane Smith', role: 'Vendor' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiGet.mockImplementation((url) => {
            if (url.includes('/api/contacts')) {
                return Promise.resolve({ data: { contacts: mockContacts } });
            }
            if (url === '/api/properties?limit=100') {
                return Promise.resolve({ data: { properties: [] } });
            }
            return Promise.resolve({ data: {} });
        });
        mockApiPost.mockResolvedValue({ data: { success: true } });
    });

    it('should render Link Contact button', () => {
        render(<ScheduleOpenHomeModal isOpen={true} onClose={() => { }} onSuccess={() => { }} />);
        expect(screen.getByText('Link Contact?')).toBeInTheDocument();
    });

    it('should show contact selector when Link Contact is toggled on', async () => {
        render(<ScheduleOpenHomeModal isOpen={true} onClose={() => { }} onSuccess={() => { }} />);

        const toggleBtn = screen.getByText('Link Contact?');
        fireEvent.click(toggleBtn);

        await waitFor(() => {
            expect(screen.getByText('Linked Context')).toBeInTheDocument(); // Button text changes
            expect(screen.getByRole('combobox')).toBeInTheDocument(); // Selector appears
        });
    });

    it('should submit with contactId when contact is selected', async () => {
        render(<ScheduleOpenHomeModal isOpen={true} onClose={() => { }} onSuccess={() => { }} />);

        const toggleBtn = screen.getByText('Link Contact?');
        fireEvent.click(toggleBtn);

        // Wait for contacts to load and selector to appear
        await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

        // This relies on Implementation fetching contacts. 
        // Need to ensure implementation actually fetches contacts first.

        // Simulate selecting contact
        const select = screen.getByRole('combobox');
        // We need to make sure options are populated. 
        // Since we haven't implemented it yet, this test will fail as expected (TDD). 
    });

    it('invariant: submitting with Link Contact enabled BUT no contact selected should fail/error', async () => {
        render(<ScheduleOpenHomeModal isOpen={true} onClose={() => { }} onSuccess={() => { }} />);
        const toggleBtn = screen.getByText('Link Contact?');
        fireEvent.click(toggleBtn);

        // Fill required fields
        fireEvent.change(screen.getByPlaceholderText(/e.g. Lunch/i), { target: { value: 'Test Event' } });

        const submitBtn = screen.getByText('Create Event');
        fireEvent.click(submitBtn);

        // Expect error or no submission
        await waitFor(() => {
            // Check for error logic (if we plan to prevent submission)
            // Or check mockApiPost not called
            expect(mockApiPost).not.toHaveBeenCalled();
        });
    });
});
describe('ScheduleOpenHomeModal Tests - Reminders', () => {
    it('should show the reminder select dropdown', () => {
        render(<ScheduleOpenHomeModal isOpen={true} onClose={() => { }} onSuccess={() => { }} />);
        // This should fail initially until implemented
        expect(screen.getByLabelText(/Reminder/i)).toBeInTheDocument();
    });

    it('should have correct reminder options', () => {
        render(<ScheduleOpenHomeModal isOpen={true} onClose={() => { }} onSuccess={() => { }} />);
        const reminderSelect = screen.getByLabelText(/Reminder/i) as HTMLSelectElement;
        const options = Array.from(reminderSelect.options).map(o => o.text);

        expect(options).toContain('None');
        expect(options).toContain('5 minutes before');
        expect(options).toContain('15 minutes before');
        expect(options).toContain('30 minutes before');
        expect(options).toContain('1 hour before');
        expect(options).toContain('1 day before');
    });

    it('property: reminder value should persist through submission', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom('5m', '15m', '30m', '1h', '1d', null),
                async (reminderValue) => {
                    vi.clearAllMocks();
                    render(<ScheduleOpenHomeModal isOpen={true} onClose={() => { }} onSuccess={() => { }} />);

                    // Fill basic info
                    fireEvent.change(screen.getByPlaceholderText(/e.g. Lunch/i), { target: { value: 'Test Event' } });

                    // Select reminder
                    const select = screen.getByLabelText(/Reminder/i) as HTMLSelectElement;
                    fireEvent.change(select, { target: { value: reminderValue || '' } });

                    // Submit
                    const submitBtn = screen.getByText('Create Event');
                    fireEvent.click(submitBtn);

                    await waitFor(() => {
                        expect(mockApiPost).toHaveBeenCalled();
                        const lastCall = mockApiPost.mock.calls[0][1];
                        // Depending on implementation, it might be in metadata or top level
                        // Based on plan, it should be in metadata for events
                        expect(lastCall.reminder).toBe(reminderValue);
                    });
                }
            ),
            { numRuns: 10 }
        );
    });
});
