import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TasksPage } from './TasksPage';
import fc from 'fast-check';
import { BrowserRouter } from 'react-router-dom';
import * as router from 'react-router-dom';
import { api } from '../../utils/apiClient';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../utils/apiClient');
vi.mock('../../services/realTimeDataService', () => ({
    realTimeDataService: {
        onAgentToolCall: vi.fn(() => () => { }),
        onDataUpdate: vi.fn(() => () => { })
    }
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

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({
            state: null,
            key: 'default',
            pathname: '/tasks',
            search: '',
            hash: ''
        }),
        BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
    };
});

describe('TasksPage Clickable Links (Property Tests)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default API mock
        (api.get as any).mockImplementation((url: string) => {
            if (url === '/api/godmode/settings') {
                return Promise.resolve({ data: { mode: 'demi_god', enabledActionTypes: [] } });
            }
            return Promise.resolve({ data: { tasks: [], properties: [], contacts: [] } });
        });
    });

    it('should navigate to contact detail when contact badge is clicked', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    id: fc.uuid(),
                    label: fc.string({ minLength: 1 }),
                    status: fc.constant('open'),
                    priority: fc.constant('normal'),
                    // Sometimes omit contactId to test fallback
                    contactId: fc.option(fc.uuid(), { nil: undefined }),
                    clientName: fc.string({ minLength: 1 }),
                    contact: fc.record({
                        id: fc.uuid(),
                        name: fc.string({ minLength: 1 })
                    }),
                    createdAt: fc.date().map(d => d.toISOString())
                }),
                async (taskData) => {
                    // Sync clientName with contact.name for finding by text
                    // Use contact.id as the source of truth for navigation if contactId is missing
                    const effectiveId = taskData.contactId || taskData.contact.id;
                    const data = { ...taskData, clientName: taskData.contact.name };
                    // Setup
                    mockNavigate.mockClear();
                    (api.get as any).mockImplementation((url: string) => {
                        if (url === '/api/tasks') {
                            return Promise.resolve({ data: { tasks: [taskData] } });
                        }
                        if (url === '/api/godmode/settings') {
                            return Promise.resolve({ data: { mode: 'demi_god', enabledActionTypes: [] } });
                        }
                        return Promise.resolve({ data: {} });
                    });

                    // Render
                    render(
                        <BrowserRouter>
                            <TasksPage />
                        </BrowserRouter>
                    );

                    // Wait for task to load
                    const contactBadge = await screen.findByText(taskData.contact.name);

                    // Verify it's clickable (we'll check if it's a button or has role button, or just click it)
                    // In implementation we will make it a button. For now, we assume it's the element with the text.
                    fireEvent.click(contactBadge);

                    // Assert
                    expect(mockNavigate).toHaveBeenCalledWith(
                        `/contacts/${effectiveId}`,
                        { state: { from: '/tasks', label: 'Tasks' } }
                    );
                }
            ),
            { numRuns: 1 }
        );
    }, 30000);

    it('should navigate to property detail when property badge is clicked', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    id: fc.uuid(),
                    label: fc.string({ minLength: 1 }),
                    status: fc.constant('open'),
                    priority: fc.constant('normal'),
                    // Sometimes omit propertyId to test fallback
                    propertyId: fc.option(fc.uuid(), { nil: undefined }),
                    propertyName: fc.string({ minLength: 1 }),
                    property: fc.record({
                        id: fc.uuid(),
                        address: fc.string({ minLength: 1 })
                    }),
                    createdAt: fc.date().map(d => d.toISOString())
                }),
                async (taskData) => {
                    // Sync propertyName with property.address
                    const effectiveId = taskData.propertyId || taskData.property.id;
                    const data = { ...taskData, propertyName: taskData.property.address };
                    // Setup
                    mockNavigate.mockClear();
                    (api.get as any).mockImplementation((url: string) => {
                        if (url === '/api/tasks') {
                            return Promise.resolve({ data: { tasks: [taskData] } });
                        }
                        if (url === '/api/godmode/settings') {
                            return Promise.resolve({ data: { mode: 'demi_god', enabledActionTypes: [] } });
                        }
                        return Promise.resolve({ data: {} });
                    });

                    // Render
                    render(
                        <BrowserRouter>
                            <TasksPage />
                        </BrowserRouter>
                    );

                    // Wait for task to load
                    const propertyBadge = await screen.findByText(taskData.property.address);

                    // Click
                    fireEvent.click(propertyBadge);

                    // Assert
                    expect(mockNavigate).toHaveBeenCalledWith(
                        `/properties/${effectiveId}`,
                        { state: { from: '/tasks', label: 'Tasks' } }
                    );
                }
            ),
            { numRuns: 1 }
        );
    }, 30000);

    it('should not expand task card when clicking navigation badges', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    id: fc.uuid(),
                    label: fc.string({ minLength: 1 }),
                    status: fc.constant('open'),
                    priority: fc.constant('normal'),
                    contactId: fc.uuid(),
                    clientName: fc.string({ minLength: 1 }),
                    contact: fc.record({ name: fc.string({ minLength: 1 }) }),
                    createdAt: fc.date().map(d => d.toISOString()),
                    description: fc.constant('Should be visible if expanded')
                }),
                async (taskData) => {
                    // Sync clientName with contact.name for finding by text
                    const data = { ...taskData, clientName: taskData.contact.name };
                    // Setup
                    mockNavigate.mockClear();
                    (api.get as any).mockImplementation((url: string) => {
                        if (url === '/api/tasks') {
                            return Promise.resolve({ data: { tasks: [data] } });
                        }
                        if (url === '/api/godmode/settings') {
                            return Promise.resolve({ data: { mode: 'demi_god', enabledActionTypes: [] } });
                        }
                        return Promise.resolve({ data: {} });
                    });

                    const { container } = render(
                        <BrowserRouter>
                            <TasksPage />
                        </BrowserRouter>
                    );

                    // Wait for task
                    const contactBadge = await screen.findByText(taskData.contact.name);

                    // Click badge
                    fireEvent.click(contactBadge);

                    // Verify navigation happened
                    expect(mockNavigate).toHaveBeenCalled();

                    // Verify card did NOT expand
                    // We check for the description text or the expanded class
                    const description = screen.queryByText('Should be visible if expanded');
                    expect(description).not.toBeInTheDocument();
                }
            ),
            { numRuns: 5 }
        );
    }, 30000);
});
