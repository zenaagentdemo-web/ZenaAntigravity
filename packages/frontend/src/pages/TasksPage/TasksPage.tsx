/**
 * TasksPage - AI-Powered Task Management
 * 
 * Timeline-based task view with filters for Property/Deal and Client.
 * Supports AI-suggested tasks (approve/dismiss) and manual task creation.
 * 
 * High-tech UI consistent with other Zena pages.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    CheckCircle,
    Circle,
    Clock,
    AlertTriangle,
    Calendar,
    Home,
    User,
    Filter,
    Plus,
    Sparkles,
    X,
    Check,
    ChevronRight,
    Trash2,
    Edit3,
    ChevronDown,
    ChevronUp,
    RotateCcw,
    Zap
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { realTimeDataService } from '../../services/realTimeDataService';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import { GodmodeToggle } from '../../components/GodmodeToggle/GodmodeToggle';
import { ZenaDatePicker } from '../../components/ZenaDatePicker/ZenaDatePicker';
import { ZenaTimePicker } from '../../components/ZenaTimePicker/ZenaTimePicker';
import { SnoozePicker } from '../../components/SnoozePicker/SnoozePicker';
import { useTaskIntelligence, TaskSuggestion } from '../../hooks/useTaskIntelligence';
import { useGodmode } from '../../hooks/useGodmode';
import { ZenaDealCard } from '../../components/DealFlow/ZenaIntelligence/ZenaDealCard';
import { ContactIntelligenceCard } from '../../components/ContactIntelligenceCard/ContactIntelligenceCard';
import { ConfirmationModal } from '../../components/ConfirmationModal/ConfirmationModal';
import { ActionApprovalQueue } from '../../components/ActionApprovalQueue/ActionApprovalQueue';
import './TasksPage.css';

// Types
type TaskPriority = 'urgent' | 'important' | 'normal' | 'low';
type TaskStatus = 'pending' | 'in_progress' | 'completed';
type TaskSource = 'manual' | 'voice_note' | 'email' | 'ask_zena' | 'calendar' | 'deal';
type ViewFilter = 'timeline' | 'property' | 'client' | 'priority';
type TimelineSection = 'overdue' | 'today' | 'tomorrow' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'next_week' | 'later';
type StatusFilter = 'current' | 'completed' | 'overdue' | 'all';

interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate?: Date;
    priority: TaskPriority;
    status: TaskStatus;
    propertyId?: string;
    propertyName?: string;
    clientId?: string;
    clientName?: string;
    source: TaskSource;
    isSuggestion: boolean;
    detectedComplete?: boolean;
    completing?: boolean;
    createdAt: Date;
}

// Priority config
const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; glow: string; bg: string }> = {
    urgent: {
        label: 'Urgent',
        color: '#FF4757',
        glow: 'rgba(255, 71, 87, 0.5)',
        bg: 'rgba(255, 71, 87, 0.1)'
    },
    important: {
        label: 'Important',
        color: '#FFA502',
        glow: 'rgba(255, 165, 2, 0.5)',
        bg: 'rgba(255, 165, 2, 0.1)'
    },
    normal: {
        label: 'Normal',
        color: '#00D4FF',
        glow: 'rgba(0, 212, 255, 0.5)',
        bg: 'rgba(0, 212, 255, 0.1)'
    },
    low: {
        label: 'Low',
        color: 'rgba(255, 255, 255, 0.5)',
        glow: 'rgba(255, 255, 255, 0.2)',
        bg: 'rgba(255, 255, 255, 0.05)'
    }
};

// Mock data for demonstration
// Mock data removed in favor of API
const MOCK_TASKS: Task[] = [];
const MOCK_SUGGESTIONS: Task[] = [];

// Mock suggestions removed


// Helper functions
export const getTimelineSection = (dueDate?: Date): TimelineSection => {
    if (!dueDate) return 'later';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays < 7) {
        return taskDate.toLocaleDateString('en-NZ', { weekday: 'long' }).toLowerCase() as TimelineSection;
    }
    if (diffDays < 14) return 'next_week';
    return 'later';
};

export const formatDueDate = (dueDate?: Date): string => {
    if (!dueDate) return 'No due date';

    // Helper to get ordinal suffix
    const getOrdinal = (n: number): string => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // Format time as "3pm" or "10am"
    const formatTime = (date: Date): string => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        const hour12 = hours % 12 || 12;
        if (minutes === 0) {
            return `${hour12}${ampm}`;
        }
        return `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}`;
    };

    const day = dueDate.getDate();
    const month = dueDate.toLocaleDateString('en-NZ', { month: 'short' });
    const dayName = dueDate.toLocaleDateString('en-NZ', { weekday: 'short' });
    const time = formatTime(dueDate);

    // Check if the time is midnight/default (no specific time set)
    const hasSpecificTime = dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0;

    if (hasSpecificTime) {
        return `${dayName} ${getOrdinal(day)} ${month} - ${time}`;
    }
    return `${dayName} ${getOrdinal(day)} ${month}`;
};

// AddTaskModal Component
interface AddTaskModalProps {
    onClose: () => void;
    onSubmit: (task: Task) => void;
    properties: [string, string][];
    clients: [string, string][];
    initialData?: Task;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onSubmit, properties, clients, initialData }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [notes, setNotes] = useState(initialData?.description || '');
    const [dueDate, setDueDate] = useState<Date | null>(initialData?.dueDate || null);
    const [dueDatePreset, setDueDatePreset] = useState<string>(initialData?.dueDate ? 'custom' : '');
    const [customDate, setCustomDate] = useState<string>('');
    const [customTime, setCustomTime] = useState<string>('');
    const [priority, setPriority] = useState<TaskPriority>(initialData?.priority || 'normal');
    const [selectedProperty, setSelectedProperty] = useState<string>(initialData?.propertyId || '');
    const [selectedClient, setSelectedClient] = useState<string>(initialData?.clientId || '');
    const [titleError, setTitleError] = useState('');

    // GLOBAL PROACTIVITY INVARIANT 1: Sync form when initialData changes
    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || '');
            setNotes(initialData.description || '');
            setDueDate(initialData.dueDate || null);
            setPriority(initialData.priority || 'normal');
            setSelectedProperty(initialData.propertyId || '');
            setSelectedClient(initialData.clientId || '');
            setDueDatePreset(initialData.dueDate ? 'custom' : '');

            if (initialData.dueDate) {
                // Use local date string to avoid timezone shifts
                const year = initialData.dueDate.getFullYear();
                const month = String(initialData.dueDate.getMonth() + 1).padStart(2, '0');
                const day = String(initialData.dueDate.getDate()).padStart(2, '0');
                setCustomDate(`${year}-${month}-${day}`);

                setCustomTime(initialData.dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
            } else {
                setCustomDate('');
                setCustomTime('');
            }
        }
    }, [initialData]);

    // Handle custom date/time changes
    useEffect(() => {
        if (dueDatePreset === 'custom') {
            if (customDate) {
                const dateStr = customDate.split('T')[0]; // YYYY-MM-DD
                const timeStr = customTime || '12:00';
                const newDate = new Date(`${dateStr}T${timeStr}:00`);
                setDueDate(newDate);
            } else {
                setDueDate(null);
            }
        }
    }, [customDate, customTime, dueDatePreset]);

    // Handle due date preset selection
    const handleDueDatePreset = (preset: string) => {
        // ... previous code
        setDueDatePreset(preset);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (preset) {
            case 'today':
                setDueDate(new Date(today.getTime() + 17 * 3600000)); // 5 PM today
                break;
            case 'tomorrow':
                setDueDate(new Date(today.getTime() + 24 * 3600000 + 17 * 3600000)); // 5 PM tomorrow
                break;
            case 'this_week':
                // Next Friday
                const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
                setDueDate(new Date(today.getTime() + daysUntilFriday * 24 * 3600000 + 17 * 3600000));
                break;
            case 'custom':
                // Initialize custom date/time if empty
                if (!customDate) {
                    const d = new Date();
                    setCustomDate(d.toISOString());
                    setCustomTime('12:00');
                }
                // Don't setDueDate(null) here, let the effect handle it
                break;
            default:
                setDueDate(null);
        }
    };

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        if (!title.trim()) {
            setTitleError('Task title is required');
            return;
        }

        // Get property/client names
        const propertyEntry = properties.find(([id]) => id === selectedProperty);
        const clientEntry = clients.find(([id]) => id === selectedClient);

        const newTask: Task = {
            // Preserve existing data if editing, or set defaults for new task
            ...(initialData ? initialData : {
                id: `task-${Date.now()}`,
                status: 'pending',
                source: 'manual',
                isSuggestion: false,
                createdAt: new Date()
            }),
            // Override with form values
            title: title.trim(),
            description: notes.trim() || undefined,
            dueDate: dueDate || undefined,
            priority,
            propertyId: selectedProperty || undefined,
            propertyName: propertyEntry?.[1],
            clientId: selectedClient || undefined,
            clientName: clientEntry?.[1]
        };

        onSubmit(newTask);
    };

    return createPortal(
        <div className="tasks-modal-overlay" onClick={onClose}>
            <div className="tasks-modal" onClick={(e) => e.stopPropagation()}>
                <div className="tasks-modal__header">
                    <h2>
                        {initialData?.id ? 'Edit Task' : 'Add New Task'}
                        {initialData?.title && !initialData?.id && (
                            <div className="zena-prefill-badge" style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(129, 140, 248, 0.1))',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                borderRadius: '12px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                color: '#38bdf8',
                                marginLeft: '12px',
                                fontWeight: 500,
                                verticalAlign: 'middle'
                            }}>
                                <Sparkles size={12} />
                                <span>Pre-filled from context</span>
                            </div>
                        )}
                    </h2>
                    <button className="tasks-modal__close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form className="tasks-modal__body" onSubmit={handleSubmit}>
                    {/* Title Field */}
                    <div className="form-group">
                        <label htmlFor="task-title" className="form-label">
                            Task Title <span className="required">*</span>
                        </label>
                        <input
                            id="task-title"
                            type="text"
                            className={`form-input ${titleError ? 'form-input--error' : ''}`}
                            placeholder="e.g., Call client about viewing feedback"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                setTitleError('');
                            }}
                            autoFocus
                        />
                        {titleError && <span className="form-error">{titleError}</span>}
                    </div>

                    {/* Due Date Presets */}
                    <div className="form-group">
                        <label className="form-label">Due Date</label>
                        <div className="due-date-presets">
                            <button
                                type="button"
                                className={`preset-btn ${dueDatePreset === 'today' ? 'preset-btn--active' : ''}`}
                                onClick={() => handleDueDatePreset('today')}
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                className={`preset-btn ${dueDatePreset === 'tomorrow' ? 'preset-btn--active' : ''}`}
                                onClick={() => handleDueDatePreset('tomorrow')}
                            >
                                Tomorrow
                            </button>
                            <button
                                type="button"
                                className={`preset-btn ${dueDatePreset === 'this_week' ? 'preset-btn--active' : ''}`}
                                onClick={() => handleDueDatePreset('this_week')}
                            >
                                This Week
                            </button>
                            <button
                                type="button"
                                className={`preset-btn ${dueDatePreset === 'custom' ? 'preset-btn--active' : ''}`}
                                onClick={() => handleDueDatePreset('custom')}
                            >
                                Custom
                            </button>
                        </div>
                        {dueDatePreset === 'custom' && (
                            <div className="custom-date-picker-container" style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <ZenaDatePicker
                                        value={customDate}
                                        onChange={setCustomDate}
                                        placeholder="Select date"
                                    />
                                </div>
                                <div style={{ width: '120px' }}>
                                    <ZenaTimePicker
                                        value={customTime}
                                        onChange={setCustomTime}
                                    />
                                </div>
                            </div>
                        )}
                        {dueDate && dueDatePreset !== 'custom' && (
                            <span className="due-date-preview">
                                <Clock size={14} />
                                {dueDate.toLocaleDateString('en-NZ', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })}
                            </span>
                        )}
                    </div>

                    {/* Priority Selector */}
                    <div className="form-group">
                        <label className="form-label">Priority</label>
                        <div className="priority-selector">
                            {(['urgent', 'important', 'normal', 'low'] as TaskPriority[]).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    className={`priority-btn priority-btn--${p} ${priority === p ? 'priority-btn--active' : ''}`}
                                    onClick={() => setPriority(p)}
                                    style={{
                                        '--btn-color': PRIORITY_CONFIG[p].color,
                                        '--btn-glow': PRIORITY_CONFIG[p].glow,
                                        '--btn-bg': PRIORITY_CONFIG[p].bg
                                    } as React.CSSProperties}
                                >
                                    {PRIORITY_CONFIG[p].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Property Association */}
                    <div className="form-group form-group--row">
                        <div className="form-group__half">
                            <label htmlFor="task-property" className="form-label">
                                <Home size={14} /> Property
                            </label>
                            <select
                                id="task-property"
                                className="form-select"
                                value={selectedProperty}
                                onChange={(e) => setSelectedProperty(e.target.value)}
                            >
                                <option value="">None</option>
                                {properties.map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Client Association */}
                        <div className="form-group__half">
                            <label htmlFor="task-client" className="form-label">
                                <User size={14} /> Client
                            </label>
                            <select
                                id="task-client"
                                className="form-select"
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                            >
                                <option value="">None</option>
                                {clients.map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="form-group">
                        <label htmlFor="task-notes" className="form-label">Notes</label>
                        <textarea
                            id="task-notes"
                            className="form-textarea"
                            placeholder="Add any additional details..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Actions */}
                    <div className="tasks-modal__actions">
                        <button type="button" className="btn btn--secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn--primary">
                            {initialData?.id ? <Check size={16} /> : <Plus size={16} />}
                            {initialData?.id ? 'Save Task' : 'Add Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export const TasksPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [viewFilter, setViewFilter] = useState<ViewFilter>('timeline');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('current');
    const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
    const [suggestions, setSuggestions] = useState<Task[]>(MOCK_SUGGESTIONS);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [taskToSnooze, setTaskToSnooze] = useState<Task | null>(null);

    // God Mode integration
    const { settings: godmodeSettings, pendingCount, fetchPendingActions } = useGodmode();
    const [isActionQueueOpen, setIsActionQueueOpen] = useState(false);
    const [isSnoozePickerOpen, setIsSnoozePickerOpen] = useState(false);

    // 24-hour snooze for Power Hour suggestion (persisted to localStorage)
    const POWER_HOUR_SNOOZE_KEY = 'zena_power_hour_snoozed_until';
    const [isPowerHourDismissed, setIsPowerHourDismissedState] = useState(() => {
        const snoozedUntil = localStorage.getItem(POWER_HOUR_SNOOZE_KEY);
        if (snoozedUntil) {
            const snoozeTime = parseInt(snoozedUntil, 10);
            if (Date.now() < snoozeTime) {
                return true; // Still snoozed
            }
            // Snooze expired, clear it
            localStorage.removeItem(POWER_HOUR_SNOOZE_KEY);
        }
        return false;
    });

    // Wrapper to set dismissed state with 24-hour localStorage persistence
    const setIsPowerHourDismissed = useCallback((dismissed: boolean) => {
        if (dismissed) {
            const snoozeUntil = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
            localStorage.setItem(POWER_HOUR_SNOOZE_KEY, snoozeUntil.toString());
        } else {
            localStorage.removeItem(POWER_HOUR_SNOOZE_KEY);
        }
        setIsPowerHourDismissedState(dismissed);
    }, []);

    const [undoToast, setUndoToast] = useState<{ taskId: string; label: string } | null>(null);
    const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [propertyFilter, setPropertyFilter] = useState<string | null>(null);
    const [clientFilter, setClientFilter] = useState<string | null>(null);
    const [realProperties, setRealProperties] = useState<[string, string][]>([]);
    const [realClients, setRealClients] = useState<[string, string][]>([]);

    // AI Intelligence Hook
    const { suggestions: aiSuggestions, getDealIntel, getDeal, loading: intelLoading } = useTaskIntelligence();

    // Sync AI Suggestions to local state (merging with any manual ones if needed, but here replacing)
    useEffect(() => {
        if (aiSuggestions.length > 0) {
            // Map TaskSuggestion to Task type
            const mappedSuggestions: Task[] = aiSuggestions.map(s => ({
                id: s.id,
                title: s.title,
                description: s.description,
                priority: s.priority,
                status: 'pending',
                source: 'ask_zena',
                isSuggestion: true,
                createdAt: new Date(),
                dealId: s.dealId,
            }));
            setSuggestions(mappedSuggestions);
        }
    }, [aiSuggestions]);

    // Power Hour logic (Original logic kept as fallback or supplementary?)
    // Making it supplementary if no AI suggestions
    useEffect(() => {
        const pendingCount = tasks.filter(t => t.status === 'pending').length;
        if (!isPowerHourDismissed && aiSuggestions.length === 0 && pendingCount >= 5 && !suggestions.some(s => s.id === 'power-hour')) {
            const powerHourSuggestion: Task = {
                id: 'power-hour',
                title: 'Schedule Zena Power Hour',
                description: `You have ${pendingCount} pending tasks. Zena suggests a 60-min focus block at 3:00 PM today to clear them all.`,
                priority: 'important',
                status: 'pending',
                source: 'manual', // Mark as manual logic
                isSuggestion: true,
                createdAt: new Date(),
            };
            setSuggestions(prev => [...prev, powerHourSuggestion]);
        }
    }, [tasks, suggestions, aiSuggestions, isPowerHourDismissed]);

    // 🧠 ZENA INTELLIGENCE: Real AI-powered completion detection
    useEffect(() => {
        const detectCompletions = async () => {
            try {
                const response = await api.get('/api/tasks/detect-completions');
                if (response.data?.detections && response.data.detections.length > 0) {
                    // Mark detected tasks as potentially complete
                    setTasks(prev => prev.map(task => {
                        const detection = response.data.detections.find(
                            (d: { taskId: string }) => d.taskId === task.id
                        );
                        if (detection) {
                            return {
                                ...task,
                                detectedComplete: true,
                                detectionConfidence: detection.confidence,
                                detectionReason: detection.reason
                            };
                        }
                        return task;
                    }));
                }
            } catch (error) {
                console.log('[TasksPage] Completion detection skipped:', error);
                // Silent fail - completion detection is optional enhancement
            }
        };

        // Only run if we have tasks and haven't already detected
        if (tasks.length > 0 && !tasks.some(t => t.detectedComplete)) {
            detectCompletions();
        }
    }, [tasks.length]);

    // GLOBAL PROACTIVITY: Check for pre-fill data from navigation
    useEffect(() => {
        const state = location.state as { newTaskPrefill?: any } | null;
        if (state?.newTaskPrefill) {
            setEditingTask(state.newTaskPrefill);
            setShowAddModal(true);
            window.history.replaceState({}, document.title);
        }
    }, [location]);
    // Load tasks from API
    const fetchTasksFromApi = useCallback(async () => {
        try {
            const response = await api.get<{ tasks: any[] }>('/api/tasks');
            const apiTasks = response.data.tasks || [];

            // Map API tasks to frontend Task type
            const mappedTasks: Task[] = apiTasks.map(t => ({
                id: t.id,
                title: t.label,
                description: undefined, // Backend doesn't have description yet
                dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                priority: 'normal' as TaskPriority, // Default priority
                status: t.status === 'open' ? 'pending' : 'completed' as TaskStatus,
                propertyId: t.propertyId || t.property?.id || undefined,
                propertyName: t.property?.address || undefined, // From API entity join
                clientId: t.contactId || t.contact?.id || undefined, // contactId maps to clientId
                clientName: t.contact?.name || undefined, // From API entity join
                source: (t.source || 'manual') as TaskSource,
                isSuggestion: false, // Already in DB, so not a "suggestion" in the approve/dismiss sense
                createdAt: new Date(t.createdAt)
            }));

            setTasks(mappedTasks);
        } catch (err) {
            console.error('Failed to fetch tasks', err);
        }
    }, []);

    useEffect(() => {
        fetchTasksFromApi();
    }, [fetchTasksFromApi]);

    // Listen for agent tool calls to refresh tasks
    useEffect(() => {
        const unsubscribe = realTimeDataService.onAgentToolCall((payload) => {
            if (payload.toolName === 'task.create' || payload.toolName === 'task.update' || payload.toolName === 'task.delete') {
                console.log('[TasksPage] Refreshing tasks due to agent action:', payload.toolName);
                fetchTasksFromApi();
            }
        });
        return unsubscribe;
    }, [fetchTasksFromApi]);

    // Monitor suggestions for auto-approval in Full God mode
    useEffect(() => {
        if (godmodeSettings.mode === 'full_god' && suggestions.length > 0) {
            // Auto-approve high-priority suggestions
            const highPrioritySuggestions = suggestions.filter(s =>
                s.priority === 'urgent' || s.priority === 'important'
            );

            if (highPrioritySuggestions.length > 0) {
                console.log(`[Godmode] Auto-approving ${highPrioritySuggestions.length} high-priority tasks`);
                highPrioritySuggestions.forEach(suggestion => {
                    handleApproveSuggestion(suggestion.id);
                });
            }
        }
    }, [suggestions, godmodeSettings.mode]);

    // Load ecosystem data
    useEffect(() => {
        const fetchEcosystemData = async () => {
            try {
                const [propRes, contactRes] = await Promise.all([
                    api.get<any>('/api/properties'),
                    api.get<any>('/api/contacts')
                ]);

                console.log('[TasksPage] Properties response:', propRes.data);
                console.log('[TasksPage] Contacts response:', contactRes.data);

                const propsData = propRes.data?.properties || (Array.isArray(propRes.data) ? propRes.data : []);
                const contactsData = contactRes.data?.contacts || (Array.isArray(contactRes.data) ? contactRes.data : []);

                console.log('[TasksPage] Parsed properties:', propsData.length, 'items');
                console.log('[TasksPage] Parsed contacts:', contactsData.length, 'items');

                setRealProperties(propsData.map((p: any) => [p.id, p.address]));
                setRealClients(contactsData.map((c: any) => [c.id, c.name]));
            } catch (err) {
                console.error('Failed to fetch ecosystem data', err);
            }
        };

        fetchEcosystemData();
    }, []);

    // Refresh names when ecosystem data changes
    useEffect(() => {
        if (realProperties.length > 0 || realClients.length > 0) {
            setTasks(prev => prev.map(task => {
                const prop = realProperties.find(([id]) => id === task.propertyId);
                const client = realClients.find(([id]) => id === task.clientId);
                return {
                    ...task,
                    propertyName: prop ? prop[1] : task.propertyName,
                    clientName: client ? client[1] : task.clientName
                };
            }));
        }
    }, [realProperties, realClients]);


    // Filter tasks based on current view, status filter, and property/client filters
    const filteredTasks = useMemo(() => {
        const now = new Date();
        let filtered = [...tasks];

        // Apply status filter
        switch (statusFilter) {
            case 'current':
                // Open tasks that are not overdue
                filtered = filtered.filter(t => {
                    if (t.status === 'completed') return false;
                    if (t.dueDate && t.dueDate < now) return false; // Exclude overdue
                    return true;
                });
                break;
            case 'completed':
                filtered = filtered.filter(t => t.status === 'completed');
                break;
            case 'overdue':
                filtered = filtered.filter(t => {
                    if (t.status === 'completed') return false;
                    return t.dueDate && t.dueDate < now;
                });
                break;
            case 'all':
                // Show everything
                break;
        }

        // Apply property filter
        if (propertyFilter) {
            filtered = filtered.filter(t => t.propertyId === propertyFilter);
        }

        // Apply client filter
        if (clientFilter) {
            filtered = filtered.filter(t => t.clientId === clientFilter);
        }

        return filtered;
    }, [tasks, statusFilter, propertyFilter, clientFilter]);

    // Group tasks by timeline section
    const groupedByTimeline = useMemo(() => {
        const groups: Record<TimelineSection, Task[]> = {
            overdue: [],
            today: [],
            tomorrow: [],
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
            next_week: [],
            later: []
        };

        filteredTasks.forEach(task => {
            const section = getTimelineSection(task.dueDate);
            groups[section].push(task);
        });

        // Sort each group by priority then due date, with AI Risk Boosting
        const priorityOrder: TaskPriority[] = ['urgent', 'important', 'normal', 'low'];
        Object.keys(groups).forEach(key => {
            groups[key as TimelineSection].sort((a, b) => {
                // 0. AI Risk Boost (Critical Deal Health = Virtual Urgent)
                const aRiskScore = (a.dealId ? (getDealIntel(a.dealId)?.healthScore || 100) : 100);
                const bRiskScore = (b.dealId ? (getDealIntel(b.dealId)?.healthScore || 100) : 100);

                // If one deal is critical (<40) and other isn't, boost it
                if (aRiskScore < 40 && bRiskScore >= 40) return -1;
                if (bRiskScore < 40 && aRiskScore >= 40) return 1;

                // 1. Priority
                const priorityDiff = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
                if (priorityDiff !== 0) return priorityDiff;

                // 2. Due Date
                return (a.dueDate?.getTime() || Infinity) - (b.dueDate?.getTime() || Infinity);
            });
        });

        return groups;
    }, [filteredTasks]);

    // Group by property
    const groupedByProperty = useMemo(() => {
        const groups: Record<string, Task[]> = {};
        filteredTasks.forEach(task => {
            const key = task.propertyName || 'No Property';
            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });
        return groups;
    }, [filteredTasks]);

    // Group by client
    const groupedByClient = useMemo(() => {
        const groups: Record<string, Task[]> = {};
        filteredTasks.forEach(task => {
            const key = task.clientName || 'No Client';
            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });
        return groups;
    }, [filteredTasks]);

    // Get unique properties and clients (Combine Real Data + Task Data)
    const uniqueProperties = useMemo(() => {
        const props = new Map<string, string>();

        // Add real properties first
        realProperties.forEach(([id, name]) => props.set(id, name));

        // Add properties from tasks (in case they aren't in the real list)
        tasks.forEach(t => {
            if (t.propertyId && t.propertyName) {
                props.set(t.propertyId, t.propertyName);
            }
        });
        return Array.from(props.entries());
    }, [tasks, realProperties]);

    const uniqueClients = useMemo(() => {
        const clients = new Map<string, string>();

        // Add real clients first
        realClients.forEach(([id, name]) => clients.set(id, name));

        // Add clients from tasks
        tasks.forEach(t => {
            if (t.clientId && t.clientName) {
                clients.set(t.clientId, t.clientName);
            }
        });
        return Array.from(clients.entries());
    }, [tasks, realClients]);

    // Handlers
    const handleCompleteTask = useCallback(async (taskId: string) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            // Step 1: Set "completing" state for local UI animation
            setTasks((prev: Task[]) => prev.map((t: Task) =>
                t.id === taskId ? { ...t, completing: true } : t
            ));

            // Step 2: Wait for animation to play
            await new Promise(resolve => setTimeout(resolve, 600));

            // Step 3: Call API and update final status
            await api.put(`/api/tasks/${taskId}`, { status: 'completed' });

            setTasks((prev: Task[]) => prev.map((t: Task) =>
                t.id === taskId ? { ...t, status: 'completed' as TaskStatus, completing: false } : t
            ));

            // Step 4: Show improved undo toast
            if (task) {
                if (undoTimeoutId) {
                    clearTimeout(undoTimeoutId);
                }
                setUndoToast({ taskId, taskTitle: task.title });

                const timeoutId = setTimeout(() => {
                    setUndoToast(null);
                }, 5000);
                setUndoTimeoutId(timeoutId);
            }
        } catch (err) {
            console.error('Failed to complete task', err);
            // Revert completing state on error
            setTasks((prev: Task[]) => prev.map((t: Task) =>
                t.id === taskId ? { ...t, completing: false } : t
            ));
        }
    }, [tasks, undoTimeoutId]);

    // Reopen task (undo completion)
    const handleReopenTask = useCallback(async (taskId: string) => {
        try {
            await api.patch(`/api/tasks/${taskId}/reopen`);
            setTasks((prev: Task[]) => prev.map((t: Task) =>
                t.id === taskId ? { ...t, status: 'pending' as TaskStatus } : t
            ));
            setUndoToast(null);
            if (undoTimeoutId) {
                clearTimeout(undoTimeoutId);
                setUndoTimeoutId(null);
            }
        } catch (err) {
            console.error('Failed to reopen task', err);
        }
    }, [undoTimeoutId]);

    const handleApproveSuggestion = useCallback(async (suggestionId: string) => {
        const suggestion = suggestions.find((s: Task) => s.id === suggestionId);
        if (suggestion) {
            try {
                // If it's a Power Move (ask_zena) OR Power Hour (mock local), persist to backend
                const isPowerHour = suggestionId === 'power-hour';

                // Calculate due date
                let dueDate = new Date();
                if (isPowerHour) {
                    dueDate.setHours(15, 0, 0, 0); // 3:00 PM today
                }

                const res = await api.post('/api/tasks', {
                    label: suggestion.title,
                    status: 'open',
                    dueDate: dueDate,
                    priority: suggestion.priority,
                    dealId: suggestion.dealId,
                    propertyId: suggestion.propertyId,
                    contactId: suggestion.clientId,
                    source: 'ai_suggested'
                });

                const newTask = {
                    ...suggestion,
                    id: res.data.id || suggestion.id, // Use backend ID
                    isSuggestion: false,
                    dueDate: dueDate
                };

                setTasks((prev: Task[]) => [...prev, newTask]);

                if (isPowerHour) {
                    setIsPowerHourDismissed(true);
                }

                setSuggestions((prev: Task[]) => prev.filter((s: Task) => s.id !== suggestionId));
            } catch (err) {
                console.error('Failed to approve suggestion', err);
            }
        }
    }, [suggestions]);

    const handleDismissSuggestion = useCallback((suggestionId: string) => {
        if (suggestionId === 'power-hour') {
            setIsPowerHourDismissed(true);
        }
        setSuggestions((prev: Task[]) => prev.filter((s: Task) => s.id !== suggestionId));
    }, []);

    const handleDeleteTask = useCallback((task: Task) => {
        setTaskToDelete(task);
    }, []);

    const confirmDeleteTask = useCallback(async () => {
        if (!taskToDelete) return;

        try {
            await api.delete(`/api/tasks/${taskToDelete.id}`);
            setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== taskToDelete.id));
            setTaskToDelete(null);
        } catch (err) {
            console.error('Failed to delete task', err);
        }
    }, [taskToDelete]);

    const handleSnoozeTask = useCallback((task: Task) => {
        setTaskToSnooze(task);
        setIsSnoozePickerOpen(true);
    }, []);

    const handleSnoozeConfirm = useCallback(async (snoozeUntil: Date) => {
        if (!taskToSnooze) return;

        try {
            await api.put(`/api/tasks/${taskToSnooze.id}`, {
                dueDate: snoozeUntil
            });

            setTasks((prev: Task[]) => prev.map((t: Task) =>
                t.id === taskToSnooze.id ? { ...t, dueDate: snoozeUntil } : t
            ));

            setIsSnoozePickerOpen(false);
            setTaskToSnooze(null);
        } catch (err) {
            console.error('Failed to snooze task', err);
        }
    }, [taskToSnooze]);

    const handleEditTask = useCallback((task: Task) => {
        setEditingTask(task);
        setShowAddModal(true);
    }, []);

    const clearFilters = useCallback(() => {
        setPropertyFilter(null);
        setClientFilter(null);
    }, []);

    const toggleExpandTask = useCallback((taskId: string) => {
        setExpandedTaskId((prev: string | null) => prev === taskId ? null : taskId);
    }, []);

    // Render task card
    const renderTaskCard = (task: Task) => {
        const config = PRIORITY_CONFIG[task.priority];

        return (
            <div
                key={task.id}
                className={`task-card ${task.completing ? 'task-card--completing' : ''}`}
                style={{
                    '--priority-color': config.color,
                    '--priority-glow': config.glow,
                    '--priority-bg': config.bg
                } as React.CSSProperties}
            >
                <div
                    className={`task-card__checkbox ${task.detectedComplete ? 'task-card__checkbox--detected-done' : ''} ${task.status === 'completed' ? 'task-card__checkbox--completed' : ''}`}
                >
                    {task.status === 'completed' ? <CheckCircle size={22} /> : <Circle size={22} />}
                    {task.detectedComplete && task.status !== 'completed' && <Check size={12} className="detected-check" />}
                </div>

                <div className="task-card__content" onClick={() => toggleExpandTask(task.id)}>
                    <div className="task-card__title-row">
                        <h3 className="task-card__title">{task.title}</h3>
                        {task.detectedComplete && (
                            <div className="detected-badge">
                                <Sparkles size={10} />
                                ZENA DETECTED DONE
                            </div>
                        )}
                    </div>

                    <div className="task-card__meta">
                        {task.dueDate && (
                            <span className={`task-card__due ${getTimelineSection(task.dueDate) === 'overdue' ? 'task-card__due--overdue' : ''}`}>
                                <Clock size={14} />
                                {formatDueDate(task.dueDate)}
                            </span>
                        )}

                        {task.clientName && (
                            task.clientId ? (
                                <button
                                    className="task-card__tag task-card__tag--client task-card__tag--clickable"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/contacts/${task.clientId}`, { state: { from: '/tasks', label: 'Tasks' } });
                                    }}
                                >
                                    <User size={12} />
                                    {task.clientName}
                                </button>
                            ) : (
                                <span className="task-card__tag task-card__tag--client">
                                    <User size={12} />
                                    {task.clientName}
                                </span>
                            )
                        )}

                        {task.propertyName && (
                            task.propertyId ? (
                                <button
                                    className="task-card__tag task-card__tag--property task-card__tag--clickable"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/properties/${task.propertyId}`, { state: { from: '/tasks', label: 'Tasks' } });
                                    }}
                                >
                                    <Home size={12} />
                                    {task.propertyName}
                                </button>
                            ) : (
                                <span className="task-card__tag task-card__tag--property">
                                    <Home size={12} />
                                    {task.propertyName}
                                </span>
                            )
                        )}

                        {expandedTaskId === task.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>

                    {expandedTaskId === task.id && (
                        <div className="task-card__expanded">
                            {/* Zena Intelligence Context */}
                            <div className="task-card__intelligence-context" style={{ marginBottom: '12px' }}>
                                {task.dealId && getDeal(task.dealId) && (
                                    <div style={{ marginBottom: '8px' }}>
                                        <ZenaDealCard
                                            deal={getDeal(task.dealId)}
                                            precomputedIntelligence={getDealIntel(task.dealId)}
                                            compact={true}
                                        />
                                    </div>
                                )}
                                {task.clientId && task.clientName && (
                                    <ContactIntelligenceCard
                                        contactId={task.clientId}
                                        contactName={task.clientName}
                                        compact={true}
                                    />
                                )}
                            </div>

                            {task.description ? (
                                <p className="task-card__description">{task.description}</p>
                            ) : (
                                <p className="task-card__description task-card__description--none">No additional notes.</p>
                            )}

                            <div className="task-card__actions-row">
                                {task.status === 'completed' ? (
                                    <button
                                        className="task-card__action-btn task-card__action-btn--reopen"
                                        onClick={(e) => { e.stopPropagation(); handleReopenTask(task.id); }}
                                    >
                                        <RotateCcw size={14} /> Mark as incomplete
                                    </button>
                                ) : (
                                    <button
                                        className="task-card__action-btn task-card__action-btn--complete"
                                        onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }}
                                    >
                                        <CheckCircle size={14} /> Mark Complete
                                    </button>
                                )}
                                <button
                                    className="task-card__action-btn"
                                    onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                >
                                    <Edit3 size={14} /> Edit
                                </button>
                                <button
                                    className="task-card__action-btn"
                                    onClick={(e) => { e.stopPropagation(); handleSnoozeTask(task); }}
                                >
                                    <Clock size={14} /> Snooze
                                </button>
                                <button
                                    className="task-card__action-btn task-card__action-btn--danger"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }}
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Render suggestion card
    const renderSuggestionCard = (suggestion: Task) => (
        <div key={suggestion.id} className="suggestion-card">
            <div className="suggestion-card__icon">
                <Sparkles size={20} />
            </div>

            <div className="suggestion-card__content">
                <h4 className="suggestion-card__title">{suggestion.title}</h4>
                {suggestion.description && (
                    <p className="suggestion-card__source">{suggestion.description}</p>
                )}
                {suggestion.clientName && (
                    <span className="suggestion-card__client">
                        <User size={12} />
                        {suggestion.clientName}
                    </span>
                )}
            </div>

            <div className="suggestion-card__actions">
                <button
                    className="suggestion-card__btn suggestion-card__btn--approve"
                    onClick={() => handleApproveSuggestion(suggestion.id)}
                    aria-label="Approve task"
                >
                    <Check size={18} />
                </button>
                <button
                    className="suggestion-card__btn suggestion-card__btn--dismiss"
                    onClick={() => handleDismissSuggestion(suggestion.id)}
                    aria-label="Dismiss suggestion"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );

    // Render timeline section
    const renderTimelineSection = (section: TimelineSection, tasks: Task[]) => {
        if (tasks.length === 0) return null;

        const sectionConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
            overdue: { label: 'Overdue', icon: <AlertTriangle size={18} />, className: 'section--overdue' },
            today: { label: 'Today', icon: <Clock size={18} />, className: 'section--today' },
            tomorrow: { label: 'Tomorrow', icon: <Calendar size={18} />, className: 'section--tomorrow section--green' },
            monday: { label: 'Monday', icon: <Calendar size={18} />, className: 'section--day section--green' },
            tuesday: { label: 'Tuesday', icon: <Calendar size={18} />, className: 'section--day section--green' },
            wednesday: { label: 'Wednesday', icon: <Calendar size={18} />, className: 'section--day section--green' },
            thursday: { label: 'Thursday', icon: <Calendar size={18} />, className: 'section--day section--green' },
            friday: { label: 'Friday', icon: <Calendar size={18} />, className: 'section--day section--green' },
            saturday: { label: 'Saturday', icon: <Calendar size={18} />, className: 'section--day section--green' },
            sunday: { label: 'Sunday', icon: <Calendar size={18} />, className: 'section--day section--green' },
            next_week: { label: 'Next Week', icon: <Calendar size={18} />, className: 'section--week section--green' },
            later: { label: 'Later', icon: <ChevronRight size={18} />, className: 'section--later section--green' }
        };

        const config = sectionConfig[section] || {
            label: section.charAt(0).toUpperCase() + section.slice(1),
            icon: <Calendar size={18} />,
            className: 'section--green'
        };

        return (
            <div key={section} className={`tasks-section ${config.className}`}>
                <div className="tasks-section__header">
                    {config.icon}
                    <h2 className="tasks-section__title">{config.label}</h2>
                    <span className="tasks-section__count">{tasks.length}</span>
                </div>
                <div className="tasks-section__list">
                    {tasks.map(renderTaskCard)}
                </div>
            </div>
        );
    };

    // Render grouped view
    const renderGroupedView = (groups: Record<string, Task[]>, icon: React.ReactNode, type?: 'client' | 'property') => {
        return Object.entries(groups).map(([groupName, groupTasks]) => (
            <div key={groupName} className={`tasks-section ${type === 'client' ? 'section--client' : type === 'property' ? 'section--property' : ''}`}>
                <div className="tasks-section__header">
                    {icon}
                    <h2 className="tasks-section__title">{groupName}</h2>
                    <span className="tasks-section__count">{groupTasks.length}</span>
                </div>
                <div className="tasks-section__list">
                    {groupTasks.map(renderTaskCard)}
                </div>
            </div>
        ));
    };

    return (
        <div className="tasks-page" data-godmode={godmodeSettings.mode}>
            <AmbientBackground variant="default" showParticles={true} />

            <div className="tasks-page__container">
                {/* God Mode System Overlay */}
                {(godmodeSettings.mode === 'full_god' || godmodeSettings.mode === 'demi_god') && (
                    <div className={`godmode-system-status ${godmodeSettings.mode}`}>
                        <div className="godmode-status-content">
                            <Zap size={16} className="godmode-icon" />
                            <div className="godmode-info">
                                <span className="godmode-title">
                                    {godmodeSettings.mode === 'full_god' ? 'God Mode Active' : 'Demi-God Mode Active'}
                                </span>
                                <span className="godmode-description">
                                    {godmodeSettings.mode === 'full_god'
                                        ? 'Zena is fully autonomous. High-confidence tasks are being handled automatically.'
                                        : 'Zena is proactively drafting tasks for your review. You retain full control.'}
                                </span>
                            </div>
                        </div>
                        <div className="godmode-banner-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('zena-show-godmode-history'))}
                                className="godmode-banner-btn"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Clock size={14} />
                                View God Mode Activity
                            </button>
                            <div className="godmode-pulse-indicator" />
                        </div>
                    </div>
                )}
                {/* Header */}
                <header className="tasks-page__header">
                    <div className="tasks-page__title-group">
                        <span className="tasks-page__subtitle">Zena Task Intelligence</span>
                        <h1 className="tasks-page__title">Tasks</h1>
                    </div>
                    <div className="tasks-page__actions">
                        <button
                            className="tasks-page__add-btn"
                            onClick={() => setShowAddModal(true)}
                        >
                            <Plus size={18} />
                            <span>Add Task</span>
                        </button>
                        <GodmodeToggle compact />
                        {pendingCount > 0 && (
                            <button
                                className="tasks-page__pending-actions-btn"
                                onClick={() => setIsActionQueueOpen(true)}
                            >
                                ⚡ {pendingCount} Pending Actions
                            </button>
                        )}
                    </div>
                </header>

                {/* View Filters */}
                <section className="tasks-page__controls">
                    <div className="tasks-page__view-filters">
                        <button
                            className={`tasks-page__filter ${viewFilter === 'timeline' ? 'tasks-page__filter--active' : ''}`}
                            onClick={() => setViewFilter('timeline')}
                        >
                            <Calendar size={16} />
                            Timeline
                        </button>
                        <button
                            className={`tasks-page__filter ${viewFilter === 'property' ? 'tasks-page__filter--active' : ''}`}
                            onClick={() => setViewFilter('property')}
                        >
                            <Home size={16} />
                            By Property
                        </button>
                        <button
                            className={`tasks-page__filter ${viewFilter === 'client' ? 'tasks-page__filter--active' : ''}`}
                            onClick={() => setViewFilter('client')}
                        >
                            <User size={16} />
                            By Client
                        </button>
                    </div>

                    {/* Status Filter Tabs */}
                    <div className="tasks-page__status-filters">
                        <button
                            className={`tasks-page__status-tab ${statusFilter === 'current' ? 'tasks-page__status-tab--active' : ''}`}
                            onClick={() => setStatusFilter('current')}
                        >
                            Current
                            <span className="tasks-page__status-count">
                                {tasks.filter(t => t.status !== 'completed' && (!t.dueDate || t.dueDate >= new Date())).length}
                            </span>
                        </button>
                        <button
                            className={`tasks-page__status-tab ${statusFilter === 'overdue' ? 'tasks-page__status-tab--active tasks-page__status-tab--overdue' : ''}`}
                            onClick={() => setStatusFilter('overdue')}
                        >
                            Overdue
                            <span className="tasks-page__status-count tasks-page__status-count--overdue">
                                {tasks.filter(t => t.status !== 'completed' && t.dueDate && t.dueDate < new Date()).length}
                            </span>
                        </button>
                        <button
                            className={`tasks-page__status-tab ${statusFilter === 'completed' ? 'tasks-page__status-tab--active tasks-page__status-tab--completed' : ''}`}
                            onClick={() => setStatusFilter('completed')}
                        >
                            Completed
                            <span className="tasks-page__status-count tasks-page__status-count--completed">
                                {tasks.filter(t => t.status === 'completed').length}
                            </span>
                        </button>
                        <button
                            className={`tasks-page__status-tab ${statusFilter === 'all' ? 'tasks-page__status-tab--active' : ''}`}
                            onClick={() => setStatusFilter('all')}
                        >
                            All
                        </button>
                    </div>
                    <div className="tasks-page__secondary-filters">
                        <div className="tasks-page__filter-group">
                            <Filter size={14} />
                            <select
                                className="tasks-page__select"
                                value={propertyFilter || ''}
                                onChange={(e) => setPropertyFilter(e.target.value || null)}
                            >
                                <option value="">All Properties</option>
                                {uniqueProperties.map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="tasks-page__filter-group">
                            <User size={14} />
                            <select
                                className="tasks-page__select"
                                value={clientFilter || ''}
                                onChange={(e) => setClientFilter(e.target.value || null)}
                            >
                                <option value="">All Clients</option>
                                {uniqueClients.map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                ))}
                            </select>
                        </div>

                        {(propertyFilter || clientFilter) && (
                            <button className="tasks-page__clear-filters" onClick={clearFilters}>
                                <X size={14} />
                                Clear Filters
                            </button>
                        )}
                    </div>
                </section>

                {/* AI Suggestions */}
                {suggestions.length > 0 && (
                    <section className="tasks-page__suggestions">
                        <div className="tasks-page__suggestions-header">
                            <Sparkles size={18} className="sparkle-icon" />
                            <h2>Zena Suggestions</h2>
                            <span className="tasks-page__suggestions-count">{suggestions.length}</span>
                        </div>
                        <div className="tasks-page__suggestions-list">
                            {suggestions.map(renderSuggestionCard)}
                        </div>
                    </section>
                )}

                {/* Task Content */}
                <section className="tasks-page__content">
                    {filteredTasks.length === 0 ? (
                        <div className="tasks-page__empty">
                            <CheckCircle size={48} />
                            <p>All caught up! No pending tasks.</p>
                        </div>
                    ) : (
                        <>
                            {viewFilter === 'timeline' && Object.entries(groupedByTimeline).map(([section, tasks]) =>
                                renderTimelineSection(section as TimelineSection, tasks)
                            )}
                            {viewFilter === 'property' && renderGroupedView(groupedByProperty, <Home size={18} />, 'property')}
                            {viewFilter === 'client' && renderGroupedView(groupedByClient, <User size={18} />, 'client')}
                        </>
                    )}
                </section>
            </div>

            {/* Task Modal (Create/Edit) */}
            {showAddModal && (
                <AddTaskModal
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingTask(null);
                    }}
                    onSubmit={async (taskData) => {
                        try {
                            if (editingTask) {
                                await api.put(`/api/tasks/${editingTask.id}`, {
                                    label: taskData.title,
                                    dueDate: taskData.dueDate,
                                    propertyId: taskData.propertyId,
                                    contactId: taskData.clientId
                                });
                                setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...taskData, id: editingTask.id } : t));
                            } else {
                                const response = await api.post<{ task: any }>('/api/tasks', {
                                    label: taskData.title,
                                    dueDate: taskData.dueDate,
                                    propertyId: taskData.propertyId,
                                    contactId: taskData.clientId
                                });
                                const newTask = {
                                    ...taskData,
                                    id: response.data.task.id
                                };
                                setTasks(prev => [newTask, ...prev]);
                            }
                            setShowAddModal(false);
                            setEditingTask(null);
                        } catch (err) {
                            console.error('Failed to save task', err);
                        }
                    }}
                    properties={uniqueProperties}
                    clients={uniqueClients}
                    initialData={editingTask || undefined}
                />
            )}

            {/* Undo Toast */}
            {undoToast && (
                <div className="tasks-page__undo-toast">
                    <div className="undo-toast__content">
                        <CheckCircle size={18} className="undo-toast__icon" />
                        <span className="undo-toast__message">
                            <strong>Task Completed:</strong> "{undoToast.taskTitle}"
                        </span>
                    </div>
                    <button
                        className="undo-toast__undo-btn"
                        onClick={() => handleReopenTask(undoToast.taskId)}
                    >
                        <RotateCcw size={14} />
                        Undo
                    </button>
                    <button
                        className="undo-toast__dismiss"
                        onClick={() => setUndoToast(null)}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Snooze Picker Modal */}
            <SnoozePicker
                isOpen={isSnoozePickerOpen}
                onClose={() => {
                    setIsSnoozePickerOpen(false);
                    setTaskToSnooze(null);
                }}
                onSnooze={handleSnoozeConfirm}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!taskToDelete}
                onClose={() => setTaskToDelete(null)}
                onConfirm={confirmDeleteTask}
                title="Delete Task"
                message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
                confirmText="Delete Task"
                cancelText="Cancel"
                type="danger"
            />

            {/* Godmode Action Approval Queue */}
            <ActionApprovalQueue
                isOpen={isActionQueueOpen}
                onClose={() => setIsActionQueueOpen(false)}
                onActionTaken={fetchPendingActions}
            />
        </div>
    );
};

export default TasksPage;
