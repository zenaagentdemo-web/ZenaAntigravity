/**
 * TasksPage - AI-Powered Task Management
 * 
 * Timeline-based task view with filters for Property/Deal and Client.
 * Supports AI-suggested tasks (approve/dismiss) and manual task creation.
 * 
 * High-tech UI consistent with other Zena pages.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
    ChevronUp
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import { GodmodeToggle } from '../../components/GodmodeToggle/GodmodeToggle';
import './TasksPage.css';

// Types
type TaskPriority = 'urgent' | 'important' | 'normal' | 'low';
type TaskStatus = 'pending' | 'in_progress' | 'completed';
type TaskSource = 'manual' | 'voice_note' | 'email' | 'ask_zena' | 'calendar' | 'deal';
type ViewFilter = 'timeline' | 'property' | 'client' | 'priority';
type TimelineSection = 'overdue' | 'today' | 'this_week' | 'later';

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

const SOURCE_ICONS: Record<TaskSource, string> = {
    manual: '✏️',
    voice_note: '🎤',
    email: '📧',
    ask_zena: '✨',
    calendar: '📅',
    deal: '💼'
};

// Mock data for demonstration
const MOCK_TASKS: Task[] = [
    {
        id: '1',
        title: 'Call Smith family about viewing feedback',
        description: 'Follow up on the 42 Oak Avenue viewing from yesterday',
        dueDate: new Date(Date.now() - 86400000), // Yesterday
        priority: 'urgent',
        status: 'pending',
        clientId: 'c1',
        clientName: 'Smith Family',
        propertyId: 'p1',
        propertyName: '42 Oak Avenue',
        source: 'voice_note',
        isSuggestion: false,
        createdAt: new Date(Date.now() - 172800000)
    },
    {
        id: '2',
        title: 'Submit offer for Peterson family',
        dueDate: new Date(Date.now() + 7200000), // 2 hours from now
        priority: 'urgent',
        status: 'pending',
        clientId: 'c2',
        clientName: 'Peterson Family',
        propertyId: 'p2',
        propertyName: '15 Queen Street',
        source: 'email',
        isSuggestion: false,
        createdAt: new Date(Date.now() - 43200000)
    },
    {
        id: '3',
        title: 'Prepare property brief for viewing',
        dueDate: new Date(Date.now() + 28800000), // Later today
        priority: 'important',
        status: 'pending',
        propertyId: 'p3',
        propertyName: '88 Beach Road',
        source: 'calendar',
        isSuggestion: false,
        createdAt: new Date(Date.now() - 86400000)
    },
    {
        id: '4',
        title: 'Order LIM report',
        dueDate: new Date(Date.now() + 259200000), // 3 days from now
        priority: 'normal',
        status: 'pending',
        propertyId: 'p2',
        propertyName: '15 Queen Street',
        source: 'deal',
        isSuggestion: false,
        createdAt: new Date(Date.now() - 86400000)
    }
];

const MOCK_SUGGESTIONS: Task[] = [
    {
        id: 'sug1',
        title: 'Respond to John about viewing request',
        description: 'From: Email received yesterday',
        priority: 'important',
        status: 'pending',
        clientId: 'c3',
        clientName: 'John Williams',
        source: 'email',
        isSuggestion: true,
        createdAt: new Date()
    },
    {
        id: 'sug2',
        title: 'Send market comparables to Sarah',
        description: 'From: Ask Zena conversation yesterday',
        priority: 'normal',
        status: 'pending',
        clientId: 'c4',
        clientName: 'Sarah Chen',
        source: 'ask_zena',
        isSuggestion: true,
        createdAt: new Date()
    }
];

// Helper functions
const getTimelineSection = (dueDate?: Date): TimelineSection => {
    if (!dueDate) return 'later';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 7) return 'this_week';
    return 'later';
};

const formatDueDate = (dueDate?: Date): string => {
    if (!dueDate) return 'No due date';

    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === -1) return 'Yesterday';
    if (diffHours < 0 && diffHours > -24) return 'Earlier today';
    if (diffHours >= 0 && diffHours < 1) return 'Less than 1 hour';
    if (diffHours < 24) return `${diffHours} hours`;
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;

    return dueDate.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' });
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
    const [priority, setPriority] = useState<TaskPriority>(initialData?.priority || 'normal');
    const [selectedProperty, setSelectedProperty] = useState<string>(initialData?.propertyId || '');
    const [selectedClient, setSelectedClient] = useState<string>(initialData?.clientId || '');
    const [titleError, setTitleError] = useState('');

    // Handle due date preset selection
    const handleDueDatePreset = (preset: string) => {
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
                setDueDate(null);
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
            id: `task-${Date.now()}`,
            title: title.trim(),
            description: notes.trim() || undefined,
            dueDate: dueDate || undefined,
            priority,
            status: 'pending',
            propertyId: selectedProperty || undefined,
            propertyName: propertyEntry?.[1],
            clientId: selectedClient || undefined,
            clientName: clientEntry?.[1],
            source: 'manual',
            isSuggestion: false,
            createdAt: new Date()
        };

        onSubmit(newTask);
    };

    return (
        <div className="tasks-modal-overlay" onClick={onClose}>
            <div className="tasks-modal" onClick={(e) => e.stopPropagation()}>
                <div className="tasks-modal__header">
                    <h2>Add New Task</h2>
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
                            <input
                                type="datetime-local"
                                className="form-input form-input--date"
                                value={dueDate ? dueDate.toISOString().slice(0, 16) : ''}
                                onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value) : null)}
                            />
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
                            <Plus size={16} />
                            Add Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const TasksPage: React.FC = () => {
    const [viewFilter, setViewFilter] = useState<ViewFilter>('timeline');
    const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
    const [suggestions, setSuggestions] = useState<Task[]>(MOCK_SUGGESTIONS);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [propertyFilter, setPropertyFilter] = useState<string | null>(null);
    const [clientFilter, setClientFilter] = useState<string | null>(null);

    // Ecosystem data (Real Properties & Contacts)
    const [realProperties, setRealProperties] = useState<[string, string][]>([]);
    const [realClients, setRealClients] = useState<[string, string][]>([]);

    // Load ecosystem data
    useEffect(() => {
        const fetchEcosystemData = async () => {
            try {
                const [propRes, contactRes] = await Promise.all([
                    api.get<any>('/api/properties'),
                    api.get<any>('/contacts')
                ]);

                const propsData = propRes.data?.properties || (Array.isArray(propRes.data) ? propRes.data : []);
                const contactsData = Array.isArray(contactRes.data) ? contactRes.data : [];

                setRealProperties(propsData.map((p: any) => [p.id, p.address]));
                setRealClients(contactsData.map((c: any) => [c.id, c.name]));
            } catch (err) {
                console.error('Failed to fetch ecosystem data', err);
            }
        };

        fetchEcosystemData();
    }, []);

    // Persistence: Load from localStorage on mount
    useEffect(() => {
        const savedTasks = localStorage.getItem('zena_tasks');
        const savedSuggestions = localStorage.getItem('zena_suggestions');

        if (savedTasks) {
            try {
                const parsed = JSON.parse(savedTasks);
                // Convert string dates back to Date objects
                const revived = parsed.map((t: any) => ({
                    ...t,
                    dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                    createdAt: new Date(t.createdAt)
                }));
                setTasks(revived);
            } catch (e) {
                console.error('Failed to parse saved tasks', e);
            }
        }

        if (savedSuggestions) {
            try {
                const parsed = JSON.parse(savedSuggestions);
                const revived = parsed.map((t: any) => ({
                    ...t,
                    dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                    createdAt: new Date(t.createdAt)
                }));
                setSuggestions(revived);
            } catch (e) {
                console.error('Failed to parse saved suggestions', e);
            }
        }
    }, []);

    // Persistence: Save to localStorage when state changes
    useEffect(() => {
        localStorage.setItem('zena_tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
        localStorage.setItem('zena_suggestions', JSON.stringify(suggestions));
    }, [suggestions]);

    // Filter tasks based on current view and filters
    const filteredTasks = useMemo(() => {
        let filtered = tasks.filter(t => t.status !== 'completed');

        if (propertyFilter) {
            filtered = filtered.filter(t => t.propertyId === propertyFilter);
        }
        if (clientFilter) {
            filtered = filtered.filter(t => t.clientId === clientFilter);
        }

        return filtered;
    }, [tasks, propertyFilter, clientFilter]);

    // Group tasks by timeline section
    const groupedByTimeline = useMemo(() => {
        const groups: Record<TimelineSection, Task[]> = {
            overdue: [],
            today: [],
            this_week: [],
            later: []
        };

        filteredTasks.forEach(task => {
            const section = getTimelineSection(task.dueDate);
            groups[section].push(task);
        });

        // Sort each group by priority then due date
        const priorityOrder: TaskPriority[] = ['urgent', 'important', 'normal', 'low'];
        Object.keys(groups).forEach(key => {
            groups[key as TimelineSection].sort((a, b) => {
                const priorityDiff = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
                if (priorityDiff !== 0) return priorityDiff;
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
    const handleCompleteTask = useCallback((taskId: string) => {
        setTasks((prev: Task[]) => prev.map((t: Task) =>
            t.id === taskId ? { ...t, status: 'completed' as TaskStatus } : t
        ));
    }, []);

    const handleApproveSuggestion = useCallback((suggestionId: string) => {
        const suggestion = suggestions.find((s: Task) => s.id === suggestionId);
        if (suggestion) {
            setTasks((prev: Task[]) => [...prev, { ...suggestion, isSuggestion: false }]);
            setSuggestions((prev: Task[]) => prev.filter((s: Task) => s.id !== suggestionId));
        }
    }, [suggestions]);

    const handleDismissSuggestion = useCallback((suggestionId: string) => {
        setSuggestions((prev: Task[]) => prev.filter((s: Task) => s.id !== suggestionId));
    }, []);

    const handleDeleteTask = useCallback((taskId: string) => {
        setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== taskId));
    }, []);

    const handleSnoozeTask = useCallback((taskId: string) => {
        // Move to 'Later' by setting due date to 1 week from now
        const snoozeDate = new Date();
        snoozeDate.setDate(snoozeDate.getDate() + 7);
        snoozeDate.setHours(17, 0, 0, 0);

        setTasks((prev: Task[]) => prev.map((t: Task) =>
            t.id === taskId ? { ...t, dueDate: snoozeDate, priority: 'low' as TaskPriority } : t
        ));
    }, []);

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
                className="task-card"
                style={{
                    '--priority-color': config.color,
                    '--priority-glow': config.glow,
                    '--priority-bg': config.bg
                } as React.CSSProperties}
            >
                <button
                    className="task-card__checkbox"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteTask(task.id);
                    }}
                    aria-label={`Mark "${task.title}" as complete`}
                >
                    <Circle size={22} />
                </button>

                <div className="task-card__content" onClick={() => toggleExpandTask(task.id)}>
                    <h3 className="task-card__title">{task.title}</h3>

                    <div className="task-card__meta">
                        {task.dueDate && (
                            <span className={`task-card__due ${getTimelineSection(task.dueDate) === 'overdue' ? 'task-card__due--overdue' : ''}`}>
                                <Clock size={14} />
                                {formatDueDate(task.dueDate)}
                            </span>
                        )}

                        {task.clientName && (
                            <span className="task-card__tag task-card__tag--client">
                                <User size={12} />
                                {task.clientName}
                            </span>
                        )}

                        {task.propertyName && (
                            <span className="task-card__tag task-card__tag--property">
                                <Home size={12} />
                                {task.propertyName}
                            </span>
                        )}

                        {expandedTaskId === task.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>

                    {expandedTaskId === task.id && (
                        <div className="task-card__expanded">
                            {task.description ? (
                                <p className="task-card__description">{task.description}</p>
                            ) : (
                                <p className="task-card__description task-card__description--none">No additional notes.</p>
                            )}

                            <div className="task-card__actions-row">
                                <button
                                    className="task-card__action-btn"
                                    onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                >
                                    <Edit3 size={14} /> Edit
                                </button>
                                <button
                                    className="task-card__action-btn"
                                    onClick={(e) => { e.stopPropagation(); handleSnoozeTask(task.id); }}
                                >
                                    <Clock size={14} /> Snooze
                                </button>
                                <button
                                    className="task-card__action-btn task-card__action-btn--danger"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <span className="task-card__source" title={`Source: ${task.source}`}>
                    {SOURCE_ICONS[task.source]}
                </span>
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

        const sectionConfig: Record<TimelineSection, { label: string; icon: React.ReactNode; className: string }> = {
            overdue: { label: 'Overdue', icon: <AlertTriangle size={18} />, className: 'section--overdue' },
            today: { label: 'Today', icon: <Clock size={18} />, className: 'section--today' },
            this_week: { label: 'This Week', icon: <Calendar size={18} />, className: 'section--week' },
            later: { label: 'Later', icon: <ChevronRight size={18} />, className: 'section--later' }
        };

        const config = sectionConfig[section];

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
    const renderGroupedView = (groups: Record<string, Task[]>, icon: React.ReactNode) => {
        return Object.entries(groups).map(([groupName, groupTasks]) => (
            <div key={groupName} className="tasks-section">
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
        <div className="tasks-page">
            <AmbientBackground variant="default" showParticles={true} />

            <div className="tasks-page__container">
                {/* Header */}
                <header className="tasks-page__header">
                    <div className="tasks-page__title-group">
                        <span className="tasks-page__subtitle">Zena Task Intelligence</span>
                        <h1 className="tasks-page__title">Tasks</h1>
                    </div>
                    <div className="tasks-page__actions">
                        <GodmodeToggle compact />
                        <button
                            className="tasks-page__add-btn"
                            onClick={() => setShowAddModal(true)}
                        >
                            <Plus size={18} />
                            <span>Add Task</span>
                        </button>
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

                    {/* Secondary Filters */}
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
                            {viewFilter === 'timeline' && (
                                <>
                                    {renderTimelineSection('overdue', groupedByTimeline.overdue)}
                                    {renderTimelineSection('today', groupedByTimeline.today)}
                                    {renderTimelineSection('this_week', groupedByTimeline.this_week)}
                                    {renderTimelineSection('later', groupedByTimeline.later)}
                                </>
                            )}

                            {viewFilter === 'property' && renderGroupedView(groupedByProperty, <Home size={18} />)}
                            {viewFilter === 'client' && renderGroupedView(groupedByClient, <User size={18} />)}
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
                    onSubmit={(taskData) => {
                        if (editingTask) {
                            setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...taskData, id: editingTask.id } : t));
                        } else {
                            setTasks(prev => [taskData, ...prev]);
                        }
                        setShowAddModal(false);
                        setEditingTask(null);
                    }}
                    properties={uniqueProperties}
                    clients={uniqueClients}
                    initialData={editingTask || undefined}
                />
            )}
        </div>
    );
};

export default TasksPage;
