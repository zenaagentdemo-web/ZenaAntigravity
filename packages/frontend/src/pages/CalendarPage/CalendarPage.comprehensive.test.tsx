import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CalendarPage } from './CalendarPage';
import React from 'react';

// Mock API Client
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../../utils/apiClient', () => ({
    api: {
        get: (...args: any[]) => mockGet(...args),
        post: (...args: any[]) => mockPost(...args)
    }
}));

// Mock Child Components to isolate page logic
vi.mock('../../components/ScheduleOpenHomeModal/ScheduleOpenHomeModal', () => ({
    ScheduleOpenHomeModal: ({ isOpen, onClose, onSuccess }: any) => isOpen ? (
        <div data-testid="schedule-modal">
            <button onClick={() => onSuccess({ id: 'new-event' })}>Save Event</button>
            <button onClick={onClose}>Close</button>
        </div>
    ) : null
}));

vi.mock('../../components/CalendarMiniPicker/CalendarMiniPicker', () => ({
    CalendarMiniPicker: ({ onDateSelect }: any) => (
        <div data-testid="mini-picker">
            <button onClick={() => onDateSelect(new Date('2024-01-01T10:00:00Z'))}>Select Jan 1</button>
        </div>
    )
}));

vi.mock('../../components/GodmodeToggle/GodmodeToggle', () => ({
    GodmodeToggle: () => <div data-testid="godmode-toggle">GodMode</div>
}));

vi.mock('../../hooks/useGodmode', () => ({
    useGodmode: () => ({
        pendingCount: 0,
        isGodmode: false,
        toggleGodmode: vi.fn(),
        pendingActions: [],
        isLoading: false,
        approveAction: vi.fn(),
        dismissAction: vi.fn(),
        settings: {}
    })
}));

// Mock Lucide Icons to avoid rendering issues if any
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        ...actual as any,
        Sparkles: () => <span data-testid="icon-sparkles" />,
        Calendar: () => <span data-testid="icon-calendar" />,
        CheckCircle2: () => <span data-testid="icon-check" />,
        MapPin: () => <span data-testid="icon-map-pin" />,
        Clock: () => <span data-testid="icon-clock" />,
        ArrowRight: () => <span data-testid="icon-arrow-right" />,
        ChevronLeft: () => <span data-testid="icon-chevron-left" />,
        ChevronRight: () => <span data-testid="icon-chevron-right" />,
        AlertTriangle: () => <span data-testid="icon-alert" />,
        X: () => <span data-testid="icon-x" />,
        Plus: () => <span data-testid="icon-plus" />
    };
});

describe('CalendarPage Integration Tests', () => {
    const mockProperties = [
        {
            id: 'prop-1',
            address: '123 Test St',
            type: 'residential',
            milestones: [
                { id: 'm-1', type: 'open_home', date: '2024-01-01T01:00:00Z', title: 'Open Home' }
            ]
        }
    ];

    const mockTasks = [
        { id: 'task-1', label: 'Call Vendor', dueDate: '2024-01-01T02:00:00Z', propertyId: 'prop-1' }
    ];

    const mockTimeline = [
        { id: 'event-1', summary: 'Meeting with Buyer', timestamp: '2024-01-01T03:00:00Z', type: 'meeting', metadata: { location: 'Office' } }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default API responses
        mockGet.mockImplementation((url) => {
            if (url.startsWith('/api/properties')) return Promise.resolve({ data: { properties: mockProperties } });
            if (url.startsWith('/api/tasks?status=open')) return Promise.resolve({ data: { tasks: mockTasks } });
            if (url.startsWith('/api/timeline?entityType=calendar_event')) return Promise.resolve({ data: { events: mockTimeline } });
            if (url === '/api/calendar-optimization/briefing') return Promise.resolve({ data: { success: true, briefing: 'Test Briefing' } });
            return Promise.resolve({ data: {} });
        });

        mockPost.mockImplementation((url) => {
            if (url === '/api/calendar-optimization/analyze-intelligence') {
                return Promise.resolve({ data: { success: true, warnings: [] } });
            }
            return Promise.resolve({ data: {} });
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    const renderPage = (initialEntries = ['/calendar']) => {
        return render(
            <MemoryRouter initialEntries={initialEntries}>
                <Routes>
                    <Route path="/calendar" element={<CalendarPage />} />
                </Routes>
            </MemoryRouter>
        );
    };

    it('loads and aggregates events from all sources', async () => {
        // Set system time to Jan 1 2024 for consistent "Today" view
        vi.setSystemTime(new Date('2024-01-01T09:00:00Z'));

        renderPage();

        // Wait for data loading
        await waitFor(() => {
            expect(mockGet).toHaveBeenCalledTimes(4);
        });

        // Check if events derived from different sources are rendered
        // 1. Property Milestone (Open Home) - Appears in Agenda AND Next Up sidebar
        const openHomeEvents = await screen.findAllByText(/Open Home: 123 Test St/i);
        expect(openHomeEvents.length).toBeGreaterThanOrEqual(1);

        // 2. Task (Call Vendor)
        expect(screen.getByText(/Call Vendor/i)).toBeInTheDocument();

        // 3. Timeline Event (Meeting)
        // Note: Timeline event happens at 14:00 which is later in the day
        expect(screen.getByText(/Meeting with Buyer/i)).toBeInTheDocument();

        vi.useRealTimers();
    });

    it('handles view mode switching', async () => {
        // Mock a specific date context
        vi.setSystemTime(new Date('2024-01-01T09:00:00Z'));
        renderPage();

        await waitFor(() => expect(mockGet).toHaveBeenCalled());

        const weekButton = screen.getByText('Week');
        fireEvent.click(weekButton);

        expect(screen.getByText("This Week's Schedule")).toBeInTheDocument();

        const monthButton = screen.getByText('Month');
        fireEvent.click(monthButton);

        expect(screen.getByText(/Schedule for January 2024/i)).toBeInTheDocument();

        vi.useRealTimers();
    });

    it('opens "Add Appointment" modal', async () => {
        renderPage();

        const addButton = screen.getByText('Add Appointment');
        fireEvent.click(addButton);

        expect(screen.getByTestId('schedule-modal')).toBeInTheDocument();
    });

    it('handles AI suggestions from URL params', async () => {
        const suggestions = ['10th January 2024 10:00 AM', '12th January 2024 2:00 PM'];
        const params = new URLSearchParams({
            suggestions: JSON.stringify(suggestions),
            property: '123 Test St',
            propertyId: 'prop-1'
        });

        renderPage([`/calendar?${params.toString()}`]);

        // Specific text matcher for the AI suggestion header
        expect(await screen.findByText((content, element) => {
            return element?.tagName.toLowerCase() === 'h2' &&
                content.includes('AI-Suggested Open Home Times');
        })).toBeInTheDocument();

        expect(screen.getByText('10th January 2024 10:00 AM')).toBeInTheDocument();
        expect(screen.getByText('12th January 2024 2:00 PM')).toBeInTheDocument();
    });
});
