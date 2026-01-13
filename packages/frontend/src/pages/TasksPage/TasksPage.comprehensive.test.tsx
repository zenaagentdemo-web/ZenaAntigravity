import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { TasksPage } from './TasksPage';
import { BrowserRouter } from 'react-router-dom';
import { api } from '../../utils/apiClient';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock dependencies
vi.mock('../../utils/apiClient');
vi.mock('../../services/realTimeDataService', () => ({
    realTimeDataService: {
        onAgentToolCall: vi.fn(() => () => { }),
        onDataUpdate: vi.fn(() => () => { })
    }
}));
vi.mock('../../components/GodmodeToggle/GodmodeToggle', () => ({
    GodmodeToggle: () => <div data-testid="godmode-toggle">Godmode Toggle</div>
}));
vi.mock('../../hooks/useGodmode', () => ({
    useGodmode: () => ({
        settings: { mode: 'off' },
        pendingCount: 0,
        fetchPendingActions: vi.fn(),
        pendingActions: [],
        isLoading: false,
        approveAction: vi.fn(),
        dismissAction: vi.fn()
    })
}));
vi.mock('../../hooks/useTaskIntelligence', () => ({
    useTaskIntelligence: () => ({
        suggestions: [],
        getDealIntel: vi.fn(),
        getDeal: vi.fn(),
        loading: false
    })
}));

describe('TasksPage Comprehensive Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default happy path mocks
        (api.get as any).mockImplementation((url: string) => {
            if (url === '/api/tasks') {
                return Promise.resolve({ data: { tasks: [] } });
            }
            if (url === '/api/properties') return Promise.resolve({ data: { properties: [] } });
            if (url === '/api/contacts') return Promise.resolve({ data: { contacts: [] } });
            return Promise.resolve({ data: {} });
        });
    });

    it('should open "Add Task" modal and submit a new task', async () => {
        const user = userEvent.setup();

        render(
            <BrowserRouter>
                <TasksPage />
            </BrowserRouter>
        );

        // 1. Click Add Task button
        const addButton = screen.getByText('Add Task');
        await user.click(addButton);

        // 2. Verify Modal Opens
        expect(screen.getByText('Add New Task')).toBeInTheDocument();

        // 3. Fill Form
        const titleInput = screen.getByPlaceholderText(/e.g., Call client/i);
        await user.type(titleInput, 'New Integration Test Task');

        // 4. Submit
        const saveButton = screen.getByText('Add Task', { selector: 'button' });

        // Mock the POST
        (api.post as any).mockResolvedValue({ data: { success: true, task: { id: 'new-1' } } });
        (api.get as any).mockResolvedValue({
            data: { tasks: [{ id: 'new-1', label: 'New Integration Test Task', status: 'open', createdAt: new Date().toISOString() }] }
        });

        await user.click(saveButton);

        // 5. Verify API Call
        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
                label: 'New Integration Test Task',
                contactId: undefined,
                dueDate: undefined,
                propertyId: undefined
            }));
        });
    });

    it('should filter tasks by property', async () => {
        const mockTasks = [
            { id: '1', label: 'Task Prop A', propertyId: 'prop-a', status: 'open', createdAt: new Date().toISOString() },
            { id: '2', label: 'Task Prop B', propertyId: 'prop-b', status: 'open', createdAt: new Date().toISOString() }
        ];
        const mockProps = [
            { id: 'prop-a', address: '123 A Street' },
            { id: 'prop-b', address: '456 B Avenue' }
        ];

        (api.get as any).mockImplementation((url: string) => {
            if (url === '/api/tasks') {
                // Return tasks only on initial load or subsequent fetches
                return Promise.resolve({ data: { tasks: mockTasks } });
            }
            if (url === '/api/properties') return Promise.resolve({ data: { properties: mockProps } });
            if (url === '/api/contacts') return Promise.resolve({ data: { contacts: [] } });
            return Promise.resolve({ data: {} });
        });

        render(
            <BrowserRouter>
                <TasksPage />
            </BrowserRouter>
        );

        // Wait for output
        await screen.findByText('Task Prop A');
        await screen.findByText('Task Prop B');
    });
});
