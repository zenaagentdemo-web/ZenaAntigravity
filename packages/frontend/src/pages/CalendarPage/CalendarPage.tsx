import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Sparkles, Calendar, CheckCircle2, MapPin, ArrowRight, Clock, ChevronLeft, ChevronRight, AlertTriangle, X, Plus, Brain } from 'lucide-react';
import { CalendarAppointment } from '../../components/CalendarWidget/CalendarWidget';
import { ScheduleOpenHomeModal } from '../../components/ScheduleOpenHomeModal/ScheduleOpenHomeModal';
import { CalendarMiniPicker } from '../../components/CalendarMiniPicker/CalendarMiniPicker';
import { GodmodeToggle } from '../../components/GodmodeToggle/GodmodeToggle';
import { useGodmode } from '../../hooks/useGodmode';
import { ActionApprovalQueue } from '../../components/ActionApprovalQueue/ActionApprovalQueue';
import { api } from '../../utils/apiClient';
import { getLocalISODate } from '../../utils/dateUtils';
import { OptimiseProposalModal } from '../../components/CalendarOptimizationModal/OptimiseProposalModal';
import { toast } from 'react-hot-toast';
import './CalendarPage.css';
import { useDealNavigation } from '../../hooks/useDealNavigation';
import { Deal, STAGE_LABELS } from '../../components/DealFlow/types';

interface Property {
    id: string;
    address: string;
    type?: string;
    milestones?: Array<{
        id: string;
        title?: string;
        type: string;
        date: string;
        endTime?: string;
        notes?: string;
        reminder?: string;
    }>;
}

export const CalendarPage: React.FC = () => {
    console.log('[DEBUG] CalendarPage component rendering');
    const navigate = useNavigate();
    const location = useLocation();
    const { isFromDeal, propertyName, goBackToDeal } = useDealNavigation();
    const [searchParams] = useSearchParams();
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
    const { pendingCount } = useGodmode();
    const [isActionQueueOpen, setIsActionQueueOpen] = useState(false);
    const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const scrollTargetRef = useRef<HTMLDivElement>(null);
    const mainViewRef = useRef<HTMLElement>(null);
    const hasInitialScrolled = useRef(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);
    const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
    const [selectedAgendaDate, setSelectedAgendaDate] = useState<Date | null>(new Date());

    const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

    const formatDateSafe = (date: Date | null | undefined, options: Intl.DateTimeFormatOptions, fallback: string = '--') => {
        if (!date || !isValidDate(date)) return fallback;
        try {
            return date.toLocaleDateString('en-NZ', options);
        } catch (e) {
            console.error('Safe date formatting failed', e);
            return fallback;
        }
    };

    const sanitizeTitle = (title: string) => {
        return title.replace(/\s*\/\s*Aotearoa/gi, '');
    };

    const navigateDate = (direction: number) => {
        const current = isValidDate(selectedAgendaDate) ? selectedAgendaDate : new Date();
        const newDate = new Date(current);
        if (viewMode === 'day') {
            newDate.setDate(newDate.getDate() + direction);
        } else if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + (direction * 7));
        } else if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + direction);
        }
        setSelectedAgendaDate(newDate);
    };

    // AI Suggestions state
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [propertyAddress, setPropertyAddress] = useState<string>('');
    const [propertyId, setPropertyId] = useState<string>('');
    const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');
    const [isConfirming, setIsConfirming] = useState(false);

    // Route Optimization State
    const [routeWarnings, setRouteWarnings] = useState<any[]>([]);

    // Optimise My Day State
    const [isOptimiseModalOpen, setIsOptimiseModalOpen] = useState(false);
    const [optimiseProposal, setOptimiseProposal] = useState(null);
    const [isOptimising, setIsOptimising] = useState(false);

    // 🧪 VISUAL FEEDBACK: Modified fields for pulsating effect
    const [modifiedApptIds, setModifiedApptIds] = useState<Set<string>>(new Set());

    const triggerPulsate = (id: string, duration?: number) => {
        setModifiedApptIds(prev => new Set([...prev, id]));
        setTimeout(() => {
            setModifiedApptIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }, duration || 5000); // Default to 5 second pulse
    };

    const [pulsatingApptId, setPulsatingApptId] = useState<string | null>(null);

    // 🧠 AUTO-NAV: Part 1 - Sync Date, switch mode, and set highlight
    useEffect(() => {
        const state = location.state as any;
        if (state?.highlightId) {
            console.log('[CalendarPage] Targeted appt:', state.highlightId);
            setPulsatingApptId(state.highlightId);

            // Handle date synchronization
            if (state.targetDate) {
                const target = new Date(state.targetDate);
                if (!isNaN(target.getTime())) {
                    setSelectedAgendaDate(target);
                }
            } else {
                // Try to find the appt date if targetDate wasn't provided
                const appt = appointments.find(a => a.id === state.highlightId);
                if (appt) {
                    setSelectedAgendaDate(appt.time);
                }
            }

            setViewMode('day');

            // Duration is 5 seconds as requested
            const timer = setTimeout(() => {
                setPulsatingApptId(null);
                // After pulse, we can safely clear the state to prevent re-triggering
                window.history.replaceState({}, document.title);
            }, 5000);

            return () => clearTimeout(timer);
        } else if (state?.targetDate) {
            // Only date, no highlight (fallback)
            const target = new Date(state.targetDate);
            if (!isNaN(target.getTime())) {
                setSelectedAgendaDate(target);
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, appointments.length]);

    // 🚀 ZENA AUTO-NAV: Part 2 - Scroll once the date is synced and data is rendered
    useEffect(() => {
        if (pulsatingApptId && viewMode === 'day') {
            const appt = appointments.find(a => a.id === pulsatingApptId);
            if (appt && selectedAgendaDate && getLocalISODate(appt.time) === getLocalISODate(selectedAgendaDate)) {
                console.log('[CalendarPage] Targeted appt is visible. Attempting scroll.');
                setTimeout(() => {
                    const element = document.getElementById(`appt-card-${pulsatingApptId}`);
                    if (element) {
                        console.log('[CalendarPage] Scrolling to appt:', pulsatingApptId);
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300); // Wait for render
            }
        }
    }, [pulsatingApptId, selectedAgendaDate, appointments.length, viewMode]);

    // Parse URL params for AI suggestions
    useEffect(() => {
        const suggestionsParam = searchParams.get('suggestions');
        const property = searchParams.get('property');
        const propId = searchParams.get('propertyId');
        const selected = searchParams.get('selected');

        if (suggestionsParam) {
            try {
                const parsed = JSON.parse(suggestionsParam);
                setAiSuggestions(Array.isArray(parsed) ? parsed : []);
            } catch {
                setAiSuggestions([]);
            }
        }
        if (property) setPropertyAddress(property);
        if (propId) setPropertyId(propId);
        if (selected) setSelectedSuggestion(selected);

        // Check for openEventId parameter
        const openEventId = searchParams.get('openEventId');
        if (openEventId && appointments.length > 0 && !isScheduleModalOpen) {
            const appt = appointments.find(a => a.id === openEventId);
            if (appt) {
                setSelectedPropId(appt.property?.id || null);
                setSelectedMilestone({
                    id: appt.id,
                    title: appt.title,
                    date: appt.time.toISOString(),
                    location: appt.location || '',
                    notes: (appt as any).notes || '',
                    type: appt.type,
                    isTimelineEvent: (appt as any).isTimelineEvent,
                    isMilestone: (appt as any).isMilestone,
                    isTask: (appt as any).isTask,
                    endTime: appt.endTime ? appt.endTime.toISOString() : undefined,
                    contactId: (appt as any).contactId,
                    propertyId: appt.property?.id,
                    reminder: (appt as any).reminder
                });
                setIsScheduleModalOpen(true);
            }
        }
    }, [searchParams, appointments]); // Added appointments dependency

    const [dailyBriefing, setDailyBriefing] = useState<string>('');
    const [briefingLoading, setBriefingLoading] = useState(true);

    const [isScheduling, setIsScheduling] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);

    // Fetch Daily Briefing
    useEffect(() => {
        const fetchBriefing = async () => {
            try {
                const response = await api.get('/api/calendar-optimization/briefing');
                if (response.data.success) {
                    setDailyBriefing(response.data.briefing);
                }
            } catch (error) {
                console.error('Failed to fetch briefing:', error);
            } finally {
                setBriefingLoading(false);
            }
        };
        fetchBriefing();
    }, []);

    // Analyze routes with backend intelligence
    const analyzeRoutes = async (appts: CalendarAppointment[]) => {
        try {
            const response = await api.post('/api/calendar-optimization/analyze-intelligence', {
                appointments: appts
            });
            if (response.data.success) {
                setRouteWarnings(response.data.warnings);
            }
        } catch (error) {
            console.error('Failed to analyze intelligence:', error);
            setRouteWarnings([]);
        }
    };

    // Check for search param to pre-select property
    useEffect(() => {
        const searchAddress = searchParams.get('search');
        if (searchAddress && properties.length > 0) {
            const found = properties.find(p => p.address === searchAddress);
            if (found) {
                setSelectedPropId(found.id);
                setIsScheduleModalOpen(true);
            }
        }
    }, [searchParams, properties]);

    // Removed previous targetDate handler as it's merged above

    useEffect(() => {
        loadData();
        // Reset scroll flag on load
        hasInitialScrolled.current = false;
    }, []);

    // Auto-scroll to NOW line when appointments are loaded
    useEffect(() => {
        const isViewingToday = selectedAgendaDate && getLocalISODate(selectedAgendaDate) === getLocalISODate(currentTime);

        if (isViewingToday && appointments.length > 0 && !hasInitialScrolled.current && mainViewRef.current && scrollTargetRef.current) {
            console.log('[DEBUG] CLICKING SCROLL');
            scrollTargetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            hasInitialScrolled.current = true;
        }
    }, [appointments, viewMode, selectedAgendaDate, currentTime]);

    const loadData = async () => {
        try {
            const [propRes, taskRes, timelineRes, dealRes] = await Promise.all([
                api.get(`/api/properties?_t=${Date.now()}`),
                api.get(`/api/tasks?status=open&_t=${Date.now()}`),
                api.get(`/api/timeline?entityType=calendar_event&_t=${Date.now()}`),
                api.get(`/api/deals?_t=${Date.now()}`)
            ]);


            const loadedProps = propRes.data?.properties || [];
            const loadedTasks = taskRes.data?.tasks || [];
            const loadedTimeline = timelineRes.data?.events || [];
            const loadedDeals = dealRes.data?.deals || [];

            setProperties(loadedProps);

            const propAppts = generateAppointmentsFromProperties(loadedProps);
            const taskAppts = generateAppointmentsFromTasks(loadedTasks, loadedProps);
            const timelineAppts = generateAppointmentsFromTimeline(loadedTimeline, loadedProps);
            const dealAppts = generateAppointmentsFromDeals(loadedDeals, loadedProps);

            // Deduplicate: If a timeline event shadows a milestone (via linkedEntityId), hide the milestone
            const shadowIds = new Set(timelineAppts.map(t => t.linkedEntityId).filter(Boolean));
            const filteredPropAppts = propAppts.filter(p => !shadowIds.has(p.id));

            const allAppts = [...filteredPropAppts, ...taskAppts, ...timelineAppts, ...dealAppts]
                .sort((a, b) => a.time.getTime() - b.time.getTime());


            // Detect new/modified appointments to trigger pulsate
            allAppts.forEach(appt => {
                const isRecent = (appt as any).updatedAt && (Date.now() - new Date((appt as any).updatedAt).getTime() < 10000);
                if (isRecent) triggerPulsate(appt.id);
            });

            setAppointments(allAppts);
            analyzeRoutes(allAppts);
        } catch (err) {
            console.error('Failed to load combined calendar data', err);
        }
    };


    const generateAppointmentsFromTasks = (tasks: any[], props: Property[]): CalendarAppointment[] => {
        return tasks
            .filter(t => t.dueDate)
            .map(t => {
                const property = props.find(p => p.id === t.propertyId);
                const startTime = new Date(t.dueDate);
                return {
                    id: t.id,
                    time: startTime,
                    endTime: new Date(startTime.getTime() + (t.estimatedDuration || 60) * 60000),
                    title: sanitizeTitle(t.label),
                    location: sanitizeTitle(property?.address || 'Personal Task'),
                    property: property ? {
                        id: property.id,
                        address: sanitizeTitle(property.address),
                        type: property.type
                    } : undefined,
                    type: 'task',
                    urgency: 'medium',
                    isTask: true
                };
            });
    };

    const generateAppointmentsFromTimeline = (events: any[], props: Property[]): CalendarAppointment[] => {
        return events.map(e => {
            // Check all possible locations for propertyId (metadata.propertyId, metadata.propertyReference, or entityId if type is property)
            const propertyId = e.metadata?.propertyId || e.metadata?.propertyReference || (e.entityType === 'property' ? e.entityId : undefined);

            // Check all locations for contactId
            const contactId = e.metadata?.contactId || e.metadata?.contactReference || (e.entityType === 'contact' ? e.entityId : undefined);

            const property = props.find(p => p.id === propertyId);
            const startTime = new Date(e.timestamp);
            return {
                id: e.entityId || e.id,
                time: startTime,
                title: sanitizeTitle(e.summary),
                location: e.metadata?.location || (property ? sanitizeTitle(property.address) : ''),
                property: property ? {
                    id: property.id,
                    address: sanitizeTitle(property.address),
                    type: property.type
                } : undefined,
                type: e.type === 'meeting' ? 'meeting' : 'other',
                urgency: e.metadata?.urgency || 'low',
                isTimelineEvent: true, // Flag for deletion/update logic
                linkedEntityId: e.entityId, // ID of the shadowed entity (e.g. property milestone)
                endTime: e.metadata?.endTime ? new Date(e.metadata.endTime) : new Date(startTime.getTime() + 60 * 60000),
                contactId: contactId,
                reminder: e.metadata?.reminder,
                notes: e.content
            } as any;
        });
    };

    const generateAppointmentsFromProperties = (props: Property[]): CalendarAppointment[] => {
        const appts: CalendarAppointment[] = [];

        props.forEach(property => {
            if (property.milestones) {
                property.milestones.forEach(milestone => {
                    const date = new Date(milestone.date);
                    if (!isNaN(date.getTime())) {
                        appts.push({
                            id: milestone.id,
                            time: date,
                            title: formatTitle(milestone.type || 'other', property.address, (milestone as any).title),
                            location: (milestone as any).location || sanitizeTitle(property.address),
                            property: {
                                id: property.id,
                                address: sanitizeTitle(property.address),
                                type: property.type
                            },
                            type: mapType(milestone.type || 'other'),
                            urgency: determineUrgency(milestone.type || 'low'),
                            isMilestone: true, // Flag for deletion/update logic
                            notes: (milestone as any).notes,
                            endTime: milestone.endTime ? new Date(milestone.endTime) : new Date(date.getTime() + 60 * 60000),
                            reminder: (milestone as any).reminder
                        } as any);
                    }
                });
            }
        });

        return appts.sort((a, b) => a.time.getTime() - b.time.getTime());
    };

    const formatTitle = (type: string, address: string, customTitle?: string) => {
        if (customTitle) return `${customTitle}: ${sanitizeTitle(address)}`;

        const cleanAddress = sanitizeTitle(address);
        switch (type) {
            case 'open_home': return `Open Home: ${cleanAddress}`;
            case 'first_open': return `First Open Home: ${cleanAddress}`;
            case 'viewing': return `Private Viewing: ${cleanAddress}`;
            case 'auction': return `Auction: ${cleanAddress}`;
            case 'settlement': return `Settlement: ${cleanAddress}`;
            default: return `${type.charAt(0).toUpperCase() + type.slice(1)}: ${cleanAddress}`;
        }
    };

    const mapType = (type: string): 'viewing' | 'meeting' | 'call' | 'other' => {
        if (type.includes('open') || type.includes('viewing')) return 'viewing';
        if (type.includes('meeting') || type.includes('auction')) return 'meeting';
        if (type.includes('call')) return 'call';
        return 'other';
    };

    const generateAppointmentsFromDeals = (deals: Deal[], props: Property[]): CalendarAppointment[] => {
        const appts: CalendarAppointment[] = [];

        deals.forEach(deal => {
            const property = props.find(p => p.id === deal.propertyId);
            const address = property?.address || 'Untitled Real Estate';
            const cleanAddress = sanitizeTitle(address);

            // 1. Stage Entry
            if (deal.stageEnteredAt) {
                const stageLabel = STAGE_LABELS[deal.stage] || deal.stage;
                appts.push({
                    id: `deal-stage-${deal.id}-${deal.stage}`,
                    time: new Date(deal.stageEnteredAt),
                    title: `Entered ${stageLabel}: ${cleanAddress}`,
                    location: cleanAddress,
                    property: property ? {
                        id: property.id,
                        address: cleanAddress,
                        type: property.type
                    } : undefined,
                    type: 'other',
                    urgency: 'medium',
                    isVirtual: true,
                    notes: `Deal moved to ${stageLabel}`
                } as any);
            }

            // 2. Auction Date
            if (deal.auctionDate) {
                appts.push({
                    id: `deal-auction-${deal.id}`,
                    time: new Date(deal.auctionDate),
                    title: `Auction: ${cleanAddress}`,
                    location: cleanAddress,
                    property: property ? {
                        id: property.id,
                        address: cleanAddress,
                        type: property.type
                    } : undefined,
                    type: 'meeting',
                    urgency: 'high',
                    isVirtual: true,
                    notes: 'Auction for property'
                } as any);
            }

            // 3. Tender Close
            if (deal.tenderCloseDate) {
                appts.push({
                    id: `deal-tender-${deal.id}`,
                    time: new Date(deal.tenderCloseDate),
                    title: `Tender Close: ${cleanAddress}`,
                    location: cleanAddress,
                    property: property ? {
                        id: property.id,
                        address: cleanAddress,
                        type: property.type
                    } : undefined,
                    type: 'other',
                    urgency: 'high',
                    isVirtual: true,
                    notes: 'Tender submission deadline'
                } as any);
            }

            // 4. Settlement Date
            if (deal.settlementDate) {
                appts.push({
                    id: `deal-settlement-${deal.id}`,
                    time: new Date(deal.settlementDate),
                    title: `Settlement: ${cleanAddress}`,
                    location: cleanAddress,
                    property: property ? {
                        id: property.id,
                        address: cleanAddress,
                        type: property.type
                    } : undefined,
                    type: 'other',
                    urgency: 'high',
                    isVirtual: true,
                    notes: 'Property settlement date'
                } as any);
            }
        });

        return appts;
    };

    const determineUrgency = (type: string): 'low' | 'medium' | 'high' => {
        if (type === 'auction' || type === 'settlement') return 'high';
        if (type.includes('open')) return 'medium';
        return 'low';
    };

    const handleConfirmSuggestion = async (suggestion: string) => {
        if (!propertyId) return;

        try {
            // Parse the suggestion to extract date/time
            const dateMatch = suggestion.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
            const timeMatch = suggestion.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);

            let targetDate = new Date();
            if (dateMatch) {
                const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
                const day = parseInt(dateMatch[1]);
                const month = months.indexOf(dateMatch[2].toLowerCase());
                const year = parseInt(dateMatch[3]);
                targetDate = new Date(year, month, day);
            }

            if (timeMatch) {
                const [time, period] = timeMatch[1].split(/\s+/);
                const [hours, minutes] = time.split(':').map(Number);
                let adjustedHours = hours;
                if (period.toUpperCase() === 'PM' && hours !== 12) adjustedHours += 12;
                if (period.toUpperCase() === 'AM' && hours === 12) adjustedHours = 0;
                targetDate.setHours(adjustedHours, minutes, 0, 0);
            }

            await api.post(`/api/properties/${propertyId}/milestones`, {
                type: 'open_home',
                title: `Open Home - ${propertyAddress}`,
                date: targetDate.toISOString(),
                notes: suggestion
            });

            // Clear suggestions and refresh
            setAiSuggestions([]);
            setSelectedSuggestion('');
            loadData();
        } catch (err) {
            console.error('Failed to create open home:', err);
        }
    };

    const selectedProperty = properties.find(p => p.id === selectedPropId);

    const handleApptClick = (appt: CalendarAppointment) => {
        setSelectedPropId(appt.property?.id || null);
        setSelectedMilestone({
            id: appt.id,
            title: appt.title,
            date: appt.time.toISOString(),
            location: appt.location || '',
            notes: (appt as any).notes || '',
            type: appt.type,
            isTimelineEvent: (appt as any).isTimelineEvent,
            isMilestone: (appt as any).isMilestone,
            isTask: (appt as any).isTask,
            endTime: appt.endTime ? appt.endTime.toISOString() : undefined,
            contactId: (appt as any).contactId,
            propertyId: appt.property?.id,
            reminder: (appt as any).reminder
        });
        setIsScheduleModalOpen(true);
        // Set URL param for persistence
        const newParams = new URLSearchParams(searchParams);
        newParams.set('openEventId', appt.id);
        navigate({ search: newParams.toString() }, { replace: true });
    };

    const handleCloseScheduleModal = () => {
        setIsScheduleModalOpen(false);
        setSelectedMilestone(null);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('openEventId');
        navigate({ search: newParams.toString() }, { replace: true });
    };

    const handleOptimiseClick = async () => {
        setIsOptimiseModalOpen(true);
        setIsOptimising(true);
        try {
            const response = await api.post('/api/calendar-optimization/optimise', {
                date: selectedAgendaDate || new Date(),
                userId: 'user-123'
            });

            if (response.data.success) {
                setOptimiseProposal(response.data.data);
            } else {
                toast.error('Could not generate optimization.');
                setIsOptimiseModalOpen(false);
            }
        } catch (error) {
            console.error('Optimise error:', error);
            toast.error('Failed to optimise schedule.');
            setIsOptimiseModalOpen(false);
        } finally {
            setIsOptimising(false);
        }
    };

    const handleApplyOptimisation = async () => {
        if (!optimiseProposal) return;

        // Use local loading state to prevent UI flash or use distinct state if desired
        // reusing isOptimising will verify if Modal handles it gracefully (it shows fulllscreen loader)
        setIsOptimising(true);

        try {
            await api.post('/api/calendar-optimization/apply', {
                userId: 'user-123',
                schedule: (optimiseProposal as any).proposedSchedule
            });

            toast.success("Schedule optimised and saved successfully!");
            setIsOptimiseModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Failed to apply schedule:', error);
            toast.error("Failed to save schedule changes.");
        } finally {
            setIsOptimising(false);
        }
    };

    const handleApplyAndStart = async () => {
        if (!optimiseProposal) return;

        setIsOptimising(true);

        try {
            await api.post('/api/calendar-optimization/apply', {
                userId: 'user-123',
                schedule: (optimiseProposal as any).proposedSchedule
            });

            toast.success("Schedule optimised! Transitioning to Mission Mode...");
            setIsOptimiseModalOpen(false);
            navigate('/ask-zena?mode=live&context=optimised_day');
        } catch (error) {
            console.error('Failed to apply schedule:', error);
            toast.error("Failed to save schedule changes.");
        } finally {
            setIsOptimising(false);
        }
    };

    return (
        <div className="calendar-page">
            <header className="calendar-page__header">
                {/* Top Row: Back, Title, Nav, Godmode Controls */}
                <div className="calendar-header-top-row">
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {location.state?.fromZena ? (
                            <button
                                className="back-button zena-back-btn"
                                onClick={() => navigate('/ask-zena')}
                                style={{
                                    background: 'rgba(168, 85, 247, 0.2)',
                                    border: '1px solid rgba(168, 85, 247, 0.4)',
                                    color: '#d8b4fe',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Sparkles size={16} /> Back to Zena
                            </button>
                        ) : (
                            <button className="back-button" onClick={() => navigate(-1)}>
                                ← Back
                            </button>
                        )}
                        {isFromDeal && (
                            <button
                                className="back-to-deal-btn"
                                onClick={goBackToDeal}
                                style={{
                                    background: 'rgba(0, 255, 65, 0.15)',
                                    border: '1px solid rgba(0, 255, 65, 0.4)',
                                    color: '#00ff41',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: '1rem' }}>📦</span>
                                Return to {propertyName ? propertyName.split(',')[0] : 'Deal'}
                            </button>
                        )}
                    </div>
                    <div className="calendar-header-main">
                        <h1 className="calendar-page__title">Your Schedule</h1>
                    </div>

                    <div className="calendar-page__godmode-controls">
                        <GodmodeToggle compact />
                        {pendingCount > 0 && (
                            <button
                                className="calendar-page__pending-actions-btn"
                                onClick={() => setIsActionQueueOpen(true)}
                            >
                                ⚡ {pendingCount} Pending Actions
                            </button>
                        )}
                    </div>
                </div>

                {/* Bottom Row: Nav Controls (Left) and View Toggles (Right) */}
                <div className="calendar-header-bottom-row">
                    <div className="calendar-nav-controls">
                        <button className="nav-btn" onClick={() => navigateDate(-1)}><ChevronLeft size={20} /></button>
                        <span className="current-date-display">
                            {viewMode === 'day'
                                ? formatDateSafe(selectedAgendaDate, { day: 'numeric', month: 'short', year: 'numeric' })
                                : viewMode === 'week'
                                    ? `Week of ${formatDateSafe(selectedAgendaDate, { day: 'numeric', month: 'short' })}`
                                    : formatDateSafe(selectedAgendaDate, { month: 'long', year: 'numeric' })
                            }
                        </span>
                        <button className="nav-btn" onClick={() => navigateDate(1)}><ChevronRight size={20} /></button>
                    </div>

                    <div className="calendar-view-toggles">
                        <button
                            className="view-toggle today-btn"
                            onClick={() => {
                                const today = new Date();
                                setSelectedAgendaDate(today);
                                setViewMode('day');
                                const todayKey = getLocalISODate(today);
                                const element = document.getElementById(todayKey);
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }}
                        >
                            Today
                        </button>
                        <button
                            className={`view-toggle ${viewMode === 'day' ? 'active' : ''}`}
                            onClick={() => setViewMode('day')}
                        >
                            Day
                        </button>
                        <button
                            className={`view-toggle ${viewMode === 'week' ? 'active' : ''}`}
                            onClick={() => setViewMode('week')}
                        >
                            Week
                        </button>
                        <button
                            className={`view-toggle ${viewMode === 'month' ? 'active' : ''}`}
                            onClick={() => setViewMode('month')}
                        >
                            Month
                        </button>
                        <div className="header-separator" style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }}></div>
                        <button
                            className="calendar-page__add-btn"
                            onClick={() => {
                                setSelectedPropId(null);
                                setIsScheduleModalOpen(true);
                            }}
                        >
                            <Plus size={18} />
                            <span>Add Appointment</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="calendar-page__content">
                <section ref={mainViewRef} className="calendar-main-view">

                    {/* Daily Briefing Banner */}
                    {dailyBriefing && (
                        <div className="calendar-daily-briefing" style={{
                            marginBottom: '20px',
                            background: 'rgba(124, 58, 237, 0.1)',
                            border: '1px solid rgba(124, 58, 237, 0.3)',
                            borderRadius: '16px',
                            padding: '16px 20px',
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'center',
                            boxShadow: '0 8px 32px rgba(124, 58, 237, 0.1)',
                            borderLeft: '4px solid #7c3aed'
                        }}>
                            <div className="briefing-icon" style={{
                                width: '40px',
                                height: '40px',
                                background: 'rgba(124, 58, 237, 0.2)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#a78bfa',
                                flexShrink: 0
                            }}>
                                <Brain size={24} style={{ margin: 'auto' }} />
                            </div>
                            <div className="briefing-content" style={{ flex: 1 }}>
                                <h4 style={{ margin: 0, fontSize: '13px', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Daily Strategy Briefing</h4>
                                <p style={{ margin: '4px 0 0 0', fontSize: '15px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                                    {dailyBriefing}
                                </p>
                            </div>
                            <button
                                className="briefing-close"
                                onClick={() => setDailyBriefing('')}
                                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}

                    {/* Route Intelligence Banner */}
                    {routeWarnings.length > 0 && (
                        <div className="calendar-route-intelligence" style={{ marginBottom: '20px' }}>
                            {routeWarnings.map(warning => (
                                <div key={warning.id} className={`route-warning route-warning--${warning.type}`}>
                                    <div className="route-warning__icon">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div className="route-warning__content">
                                        <p>{warning.message}</p>
                                        {warning.actionLabel && (
                                            <button
                                                className="route-warning__btn"
                                                onClick={() => {
                                                    if (typeof warning.action === 'function') {
                                                        warning.action();
                                                    } else if (warning.action === 'optimise_day') {
                                                        handleOptimiseClick();
                                                    }
                                                }}
                                            >
                                                <Sparkles size={12} />
                                                {warning.actionLabel}
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        className="route-warning__close"
                                        onClick={() => setRouteWarnings(prev => prev.filter(w => w.id !== warning.id))}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* AI Suggested Open Home Times */}
                    {aiSuggestions.length > 0 && (
                        <div className="high-tech-card ai-suggestions-panel" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 255, 136, 0.05))', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
                            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00D4FF' }}>
                                <Sparkles size={18} />
                                AI-Suggested Open Home Times
                                {propertyAddress && <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: 'normal' }}>for {propertyAddress}</span>}
                            </h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                                {aiSuggestions.map((suggestion, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '14px 16px',
                                            background: selectedSuggestion === suggestion ? 'rgba(0, 255, 136, 0.15)' : 'rgba(0, 212, 255, 0.08)',
                                            border: selectedSuggestion === suggestion ? '2px solid rgba(0, 255, 136, 0.5)' : '1px solid rgba(0, 212, 255, 0.2)',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                            <Calendar size={18} style={{ color: selectedSuggestion === suggestion ? '#00FF88' : '#00D4FF', flexShrink: 0 }} />
                                            <span style={{ color: 'white', fontSize: '14px' }}>{suggestion}</span>
                                        </div>
                                        <button
                                            onClick={() => handleConfirmSuggestion(suggestion)}
                                            style={{
                                                padding: '8px 16px',
                                                background: 'linear-gradient(135deg, #00FF88, #00D4FF)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: '#0a1628',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                fontSize: '13px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                flexShrink: 0
                                            }}
                                        >
                                            <CheckCircle2 size={14} />
                                            Confirm
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setAiSuggestions([])}
                                style={{ marginTop: '12px', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '13px' }}
                            >
                                Dismiss Suggestions
                            </button>
                        </div>
                    )}

                    <div className="calendar-agenda-container">
                        <div className="agenda-header-info">
                            <h2 className="section-title">
                                {viewMode === 'day' ? (
                                    selectedAgendaDate?.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' }) === currentTime.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
                                        ? "Today's Agenda"
                                        : `Agenda for ${selectedAgendaDate?.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long' })}`
                                ) : viewMode === 'week' ? (
                                    "This Week's Schedule"
                                ) : (
                                    `Schedule for ${selectedAgendaDate?.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' })}`
                                )}
                            </h2>
                        </div>

                        {(() => {
                            const reducedAppointments = appointments.reduce((groups, appt) => {
                                const dateKey = getLocalISODate(appt.time);
                                if (!groups[dateKey]) groups[dateKey] = [];
                                groups[dateKey].push(appt);
                                return groups;
                            }, {} as Record<string, CalendarAppointment[]>);
                            const filteredGroups = Object.entries(reducedAppointments).filter(([dateKey]) => {
                                const anchor = selectedAgendaDate || new Date();
                                const anchorKey = getLocalISODate(anchor);

                                if (viewMode === 'day') {
                                    return dateKey === anchorKey;
                                }

                                const date = new Date(dateKey + 'T00:00:00'); // Use local time for week/month checks
                                if (viewMode === 'week') {
                                    const startOfWeek = new Date(anchor);
                                    startOfWeek.setHours(0, 0, 0, 0);
                                    startOfWeek.setDate(anchor.getDate() - anchor.getDay() + (anchor.getDay() === 0 ? -6 : 1));

                                    const endOfWeek = new Date(startOfWeek);
                                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                                    endOfWeek.setHours(23, 59, 59, 999);

                                    return date >= startOfWeek && date <= endOfWeek;
                                }
                                if (viewMode === 'month') {
                                    return date.getMonth() === anchor.getMonth() && date.getFullYear() === anchor.getFullYear();
                                }
                                return true;
                            });

                            if (filteredGroups.length === 0) {
                                return (
                                    <div className="high-tech-card empty-state">
                                        <div className="zena-intelligence-badge">
                                            <Sparkles size={14} /> No Events Found
                                        </div>
                                        <p>There are no appointments scheduled for this {viewMode}.</p>
                                        <button className="zena-action-btn" onClick={() => {
                                            setSelectedAgendaDate(new Date());
                                            setViewMode('month');
                                        }}>
                                            View Full Month
                                        </button>
                                    </div>
                                );
                            }

                            return filteredGroups.map(([dateKey, dayAppts]) => {
                                const dateObj = new Date(dateKey);
                                const isToday = dateKey === getLocalISODate(currentTime);
                                const isPreSelection = selectedSuggestion && dateKey === getLocalISODate(new Date(selectedSuggestion));
                                let nowLineInjected = false;
                                const appointmentsWithNow = [];

                                for (let i = 0; i < dayAppts.length; i++) {
                                    const appt = dayAppts[i];
                                    if (isToday && !nowLineInjected && appt.time > currentTime) {
                                        appointmentsWithNow.push(<div key="now-line" className="calendar-now-line" />);
                                        nowLineInjected = true;
                                    }
                                    appointmentsWithNow.push(appt);
                                }
                                if (isToday && !nowLineInjected) {
                                    appointmentsWithNow.push(<div key="now-line-end" className="calendar-now-line" />);
                                }

                                return (
                                    <div key={dateKey} id={dateKey} className={`calendar-day-group ${isToday ? 'is-today' : ''} ${isPreSelection ? 'is-suggestion' : ''}`}>
                                        <div className="calendar-date-header">
                                            <div className="date-main">
                                                <span className="date-number">{dateObj.getDate()}</span>
                                                <div className="date-details">
                                                    <span className="day-name">{formatDateSafe(dateObj, { weekday: 'long' })}</span>
                                                    <span className="month-year">{formatDateSafe(dateObj, { month: 'long', year: 'numeric' })}</span>
                                                </div>
                                            </div>
                                            {isToday && <span className="today-badge">Today</span>}
                                        </div>

                                        <div className="appointment-list">
                                            <div className="timeline-trail"></div>
                                            {appointmentsWithNow.map((item, index) => {
                                                const isNowLine = React.isValidElement(item) && (item.key === "now-line" || item.key === "now-line-end");

                                                if (isNowLine) {
                                                    return (
                                                        <div
                                                            key={(item as any).key}
                                                            ref={(el) => {
                                                                // @ts-ignore
                                                                scrollTargetRef.current = el;
                                                            }}
                                                            className="calendar-now-line"
                                                        />
                                                    );
                                                }

                                                const appt = item as CalendarAppointment;
                                                const isPast = appt.time < currentTime;
                                                return (
                                                    <div
                                                        id={`appt-card-${appt.id}`}
                                                        key={appt.id}
                                                        className={`appt-card appt-card--${appt.urgency || 'low'} appt-card--${appt.type} ${isPast ? 'appt-card--past' : ''} ${(modifiedApptIds.has(appt.id) || pulsatingApptId === appt.id) ? 'pulsate-purple' : ''}`}
                                                        onClick={() => handleApptClick(appt)}
                                                    >
                                                        <div className="appt-time-column">
                                                            <div className="appt-time">
                                                                {appt.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}{appt.endTime ? ' - ' + appt.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                                                            </div>
                                                            <div className="appt-dot"></div>
                                                        </div>
                                                        <div className="appt-main-info">
                                                            <div className="appt-type-tag">{appt.type.replace('_', ' ')}</div>
                                                            <div className="appt-title">{appt.title}</div>
                                                            {appt.location && (
                                                                <div className="appt-location">
                                                                    <MapPin size={12} />
                                                                    {appt.location}
                                                                </div>
                                                            )}
                                                            {appt.property?.type && (
                                                                <div className="appt-prop-type">
                                                                    {appt.property.type}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {(appt.property?.id || appt.contactId) && (
                                                            <div className="appt-actions">
                                                                {appt.property?.id && (
                                                                    <button
                                                                        className="appt-btn"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigate(`/properties/${appt.property.id}`, { state: { fromCalendar: true, eventId: appt.id } });
                                                                        }}
                                                                    >
                                                                        View Property
                                                                    </button>
                                                                )}
                                                                {appt.contactId && (
                                                                    <button
                                                                        className="appt-btn appt-btn--contact"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigate(`/contacts/${appt.contactId}`, { state: { fromCalendar: true, eventId: appt.id } });
                                                                        }}
                                                                    >
                                                                        View Contact
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </section>

                <aside className="calendar-sidebar">
                    {/* Focus: Next Up - TOP of sidebar for immediate attention */}
                    <div className="sidebar-section">
                        <h2 className="section-title focus-section-title">Focus: Next Up</h2>
                        {appointments.filter(a => isValidDate(a.time) && a.time > new Date()).length > 0 ? (
                            (() => {
                                const nextAppt = appointments
                                    .filter(a => isValidDate(a.time) && a.time > new Date())
                                    .sort((a, b) => a.time.getTime() - b.time.getTime())[0];

                                return (
                                    <div className="high-tech-card next-event-spotlight" onClick={() => handleApptClick(nextAppt)}>
                                        <div className="spotlight-header">
                                            <div className="spotlight-time-info">
                                                <Clock size={16} />
                                                <span>Starts in {Math.round((nextAppt.time.getTime() - Date.now()) / (1000 * 60))} mins</span>
                                            </div>
                                            <div className="spotlight-time-range">
                                                {nextAppt.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
                                                {nextAppt.endTime && ` - ${nextAppt.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}`}
                                            </div>
                                        </div>
                                        <div className="spotlight-title">{nextAppt.title}</div>
                                        <div className="spotlight-footer">
                                            <MapPin size={12} />
                                            <span>{nextAppt.location}</span>
                                        </div>
                                        <button className="spotlight-action">
                                            Details <ArrowRight size={14} />
                                        </button>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="high-tech-card spotlight-empty">
                                <p>No more events today. Time to catch up on admin!</p>
                            </div>
                        )}
                    </div>

                    {/* Zena's Intelligence - Between Focus and Navigation */}
                    <div className="high-tech-card zena-suggestions sidebar-section">
                        <h2 className="section-title">Zena's Intelligence</h2>
                        <div className="suggestion-item">
                            <span className="suggestion-icon">💡</span>
                            <p>You have {appointments.filter(a => isValidDate(a.time) && a.time.toDateString() === new Date().toDateString()).length} events scheduled for today.</p>
                        </div>
                        <button
                            className={`zena-action-btn zena-optimise-btn--pulsating ${isOptimising ? 'is-loading' : ''}`}
                            onClick={handleOptimiseClick}
                            disabled={isOptimising}
                        >
                            {isOptimising ? 'Analysing...' : 'Optimise My Day'}
                        </button>
                    </div>

                    {/* Navigation Calendar */}
                    <div className="sidebar-section">
                        <CalendarMiniPicker
                            selectedDate={isValidDate(selectedAgendaDate) ? selectedAgendaDate : new Date()}
                            appointments={appointments}
                            onDateSelect={(date) => {
                                if (!isValidDate(date)) return;
                                setSelectedAgendaDate(date);
                                // Scroll to date section
                                const dateKey = getLocalISODate(date);
                                const element = document.getElementById(dateKey);
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }}
                        />
                    </div>


                </aside>
                {isOptimiseModalOpen && createPortal(
                    <OptimiseProposalModal
                        isOpen={isOptimiseModalOpen}
                        onClose={() => setIsOptimiseModalOpen(false)}
                        onApply={handleApplyOptimisation}
                        onApplyAndStart={handleApplyAndStart}
                        proposal={optimiseProposal}
                        isLoading={isOptimising}
                    />,
                    document.body
                )}  {/* Removed FAB - Moved to Header */}

                <ScheduleOpenHomeModal
                    isOpen={isScheduleModalOpen}
                    onClose={handleCloseScheduleModal}
                    property={selectedProperty as any}
                    allProperties={properties as any}
                    milestone={selectedMilestone}
                    onSuccess={() => {
                        loadData(); // Refresh calendar
                    }}
                />

                <ActionApprovalQueue
                    isOpen={isActionQueueOpen}
                    onClose={() => setIsActionQueueOpen(false)}
                    onActionTaken={() => {
                        loadData();
                    }}
                />
            </main>
        </div>
    );
};
