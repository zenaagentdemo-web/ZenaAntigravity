import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Plus,
  History,
  Sparkles,
  RefreshCw,
  Calendar,
  CheckCircle2,
  FileText,
  Mic,
  Square,
  Pencil,
  Trash2,
  Home,
  DollarSign,
  MapPin,
  Clock,
  Shield,
  Zap,
  ArrowRight,
  Users,
  TrendingUp,
  Building2,
  AlertTriangle,
  Brain,
  Target,
  HelpCircle
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { AddNoteModal } from '../../components/AddNoteModal/AddNoteModal';
import { usePropertyIntelligence, PropertyPrediction } from '../../hooks/usePropertyIntelligence';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import { LogIntelTooltip } from '../../components/LogIntelTooltip/LogIntelTooltip';
import { ZenaBatchComposeModal } from '../../components/ZenaBatchComposeModal/ZenaBatchComposeModal';
import { ZenaCallTooltip } from '../../components/ZenaCallTooltip/ZenaCallTooltip';
import { AddPropertyModal } from '../../components/AddPropertyModal/AddPropertyModal';
import { ZenaDatePicker } from '../../components/ZenaDatePicker/ZenaDatePicker';
import './PropertyDetailPage.css';

interface Contact {
  id: string;
  name: string;
  role: string;
  emails: string[];
  phones: string[];
  engagementScore?: number;
}

interface Property {
  id: string;
  address: string;
  type?: 'residential' | 'commercial' | 'land';
  status?: 'active' | 'under_contract' | 'sold' | 'withdrawn';
  listingPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  landSize?: string;
  floorSize?: string;
  dealId?: string;
  milestones: Milestone[];
  riskOverview?: string;
  createdAt: string;
  updatedAt: string;
  vendors?: Contact[];
  buyers?: Contact[];
}

interface Milestone {
  id: string;
  type: 'listed' | 'first_viewing' | 'offer_received' | 'contract_signed' | 'settlement' | 'custom';
  title: string;
  date: string;
  notes?: string;
}

interface Deal {
  id: string;
  stage: string;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  riskFlags?: string[];
  nextAction?: string;
  summary: string;
}

interface Thread {
  id: string;
  subject: string;
  summary: string;
  classification: string;
  category: string;
  riskLevel: string;
  lastMessageAt: string;
  participants?: any[];
}

interface TimelineEvent {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'task' | 'note' | 'voice_note';
  summary: string;
  content?: string;
  timestamp: string;
  metadata?: {
    godmode?: boolean;
    mode?: string;
    actionType?: string;
    draftSubject?: string;
    draftBody?: string;
    executionResult?: any;
    success?: boolean;
    autoExecuted?: boolean;
  };
}

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, border: string }> = {
  active: { label: 'Active', color: '#00FF88', bg: 'rgba(0, 255, 136, 0.1)', border: 'rgba(0, 255, 136, 0.3)' },
  under_contract: { label: 'Under Contract', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.1)', border: 'rgba(255, 215, 0, 0.3)' },
  sold: { label: 'Sold', color: '#FF6B6B', bg: 'rgba(255, 107, 107, 0.1)', border: 'rgba(255, 107, 107, 0.3)' },
  withdrawn: { label: 'Withdrawn', color: '#888888', bg: 'rgba(136, 136, 136, 0.1)', border: 'rgba(136, 136, 136, 0.2)' },
};

const TYPE_CONFIG: Record<string, { label: string, icon: React.ReactNode }> = {
  residential: { label: 'Residential', icon: <Home size={14} /> },
  commercial: { label: 'Commercial', icon: <Building2 size={14} /> },
  land: { label: 'Land', icon: <MapPin size={14} /> },
};

const ROLE_THEME: Record<string, { label: string, color: string, bg: string, border: string }> = {
  buyer: { label: 'Buyer', color: '#00D4FF', bg: 'rgba(0, 212, 255, 0.1)', border: 'rgba(0, 212, 255, 0.3)' },
  vendor: { label: 'Vendor', color: '#FF00FF', bg: 'rgba(255, 0, 255, 0.1)', border: 'rgba(255, 0, 255, 0.3)' },
  tradesperson: { label: 'Trades', color: '#FF6B35', bg: 'rgba(255, 107, 53, 0.1)', border: 'rgba(255, 107, 53, 0.3)' },
  agent: { label: 'Agent', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)' },
  market: { label: 'Market', color: '#00FF88', bg: 'rgba(0, 255, 136, 0.1)', border: 'rgba(0, 255, 136, 0.3)' },
  other: { label: 'Contact', color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)' },
};

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backState = location.state as { fromCalendar?: boolean; eventId?: string } | null;
  const [property, setProperty] = useState<Property | null>(null);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [usedVoiceRecording, setUsedVoiceRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneNotes, setMilestoneNotes] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneType, setMilestoneType] = useState<string>('custom');

  // Intelligence Hook
  const { getIntelligence, refreshIntelligence, lastPropertyUpdate, isConnected } = usePropertyIntelligence();
  const [prediction, setPrediction] = useState<PropertyPrediction | null>(null);
  const [isRefreshingIntel, setIsRefreshingIntel] = useState(false);
  const [isEditingProperty, setIsEditingProperty] = useState(false);

  // AI Enhancement States (Gaps 2-4)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleSuggestions, setScheduleSuggestions] = useState<string[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [milestoneSuggestions, setMilestoneSuggestions] = useState<string[]>([]);
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(false);
  const [timelineSummary, setTimelineSummary] = useState<string | null>(null);
  const [isLoadingTimelineSummary, setIsLoadingTimelineSummary] = useState(false);
  const [showPulseHelp, setShowPulseHelp] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isConfirmingSlot, setIsConfirmingSlot] = useState(false);

  // Throttle state for Neural Pulse (5 minute cooldown)
  const [lastPulseTime, setLastPulseTime] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const PULSE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  // Cooldown timer effect
  useEffect(() => {
    if (!lastPulseTime) return;

    const interval = setInterval(() => {
      const remaining = PULSE_COOLDOWN_MS - (Date.now() - lastPulseTime);
      if (remaining <= 0) {
        setCooldownRemaining(0);
        clearInterval(interval);
      } else {
        setCooldownRemaining(Math.ceil(remaining / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastPulseTime]);

  useEffect(() => {
    if (id) {
      loadPropertyData();
      // Load initial intelligence
      getIntelligence(id).then(p => {
        if (p) setPrediction(p);
      });
    }
  }, [id]);

  // Listen for real-time intelligence updates
  useEffect(() => {
    if (lastPropertyUpdate && lastPropertyUpdate.propertyId === id) {
      setPrediction(lastPropertyUpdate.prediction);
    }
  }, [lastPropertyUpdate, id]);

  const loadPropertyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load property details - FIXED: Extract from response correctly
      const response = await api.get<{ property: Property, threads: Thread[], timeline: TimelineEvent[] }>(`/api/properties/${id}`);

      const propertyData = response.data.property;
      setProperty(propertyData);
      setThreads(response.data.threads || []);
      setTimeline(response.data.timeline || []);

      // Load associated deal if exists
      if (propertyData.dealId) {
        try {
          const dealResponse = await api.get<Deal>(`/api/deals/${propertyData.dealId}`);
          setDeal(dealResponse.data);
        } catch (e) {
          console.warn('Could not load deal:', e);
        }
      }
    } catch (err) {
      console.error('Failed to load property data:', err);
      setError('Failed to load property details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async (noteData: { content: string; type: string }) => {
    if (!noteData.content.trim() || !id) return;

    try {
      setAddingNote(true);
      await api.post(`/api/timeline/notes`, {
        entityType: 'property',
        entityId: id,
        summary: noteData.content,
        type: noteData.type
      });
      await loadPropertyData();
      setShowNoteForm(false);

      // IMMEDIATE FEEDBACK LOOP: Trigger AI re-analysis
      handleRefreshIntelligence();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddMilestone = async () => {
    if (!milestoneTitle.trim() || !milestoneDate || !id) return;

    try {
      setAddingMilestone(true);
      if (editingMilestoneId) {
        // UPDATE existing milestone
        await api.put(`/api/properties/${id}/milestones/${editingMilestoneId}`, {
          type: milestoneType,
          title: milestoneTitle,
          date: milestoneDate,
          notes: milestoneNotes || undefined,
        });
      } else {
        // CREATE new milestone
        await api.post(`/api/properties/${id}/milestones`, {
          type: milestoneType || 'custom',
          title: milestoneTitle,
          date: milestoneDate,
          notes: milestoneNotes || undefined,
        });
      }

      await loadPropertyData();
      setMilestoneTitle('');
      setMilestoneDate('');
      setMilestoneNotes('');
      setMilestoneType('custom');
      setEditingMilestoneId(null);
      setShowMilestoneForm(false);

      // IMMEDIATE FEEDBACK LOOP: Trigger AI re-analysis
      handleRefreshIntelligence();
    } catch (err) {
      console.error('Failed to save milestone:', err);
      alert('Failed to save milestone. Please try again.');
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!id || !window.confirm('Are you sure you want to delete this milestone?')) return;

    try {
      setAddingMilestone(true);
      await api.delete(`/api/properties/${id}/milestones/${milestoneId}`);
      await loadPropertyData();
      setShowMilestoneForm(false);
      setMilestoneTitle('');
      setMilestoneDate('');
      setMilestoneNotes('');
      setEditingMilestoneId(null);
      handleRefreshIntelligence();
    } catch (err) {
      console.error('Failed to delete milestone:', err);
      alert('Failed to delete milestone.');
    } finally {
      setAddingMilestone(false);
    }
  };


  const handleComposeClose = () => {
    setShowComposeModal(false);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NZ', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Pacific/Auckland'
    });
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${(price / 1000).toFixed(0)}K`;
  };

  const getDaysOnMarket = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleRefreshIntelligence = async () => {
    if (!id || isRefreshingIntel || cooldownRemaining > 0) return;
    setIsRefreshingIntel(true);

    // Add short artificial delay for UX - ensures the user sees the "Pulsing..." animation
    const startTime = Date.now();
    const minDelay = 1200; // 1.2s pulse for visual feedback

    try {
      const newPred = await refreshIntelligence(id, true); // Force refresh

      const elapsed = Date.now() - startTime;
      if (elapsed < minDelay) {
        await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
      }

      if (newPred) {
        setPrediction(newPred);
        setLastPulseTime(Date.now()); // Start cooldown
        // Success state is implicit as "Pulsing..." disappears and data updates
        console.log('[ZenaBrain] Neural Pulse complete.');
      }
    } catch (e) {
      console.error('Failed to refresh intelligence:', e);
    } finally {
      setIsRefreshingIntel(false);
    }
  };

  const handleUpdateProperty = async (updatedData: any) => {
    // Refresh local state after update
    await loadPropertyData();
    // Also trigger intelligence refresh
    handleRefreshIntelligence();
  };

  // Gap 2: Fetch AI-suggested open home times
  const fetchScheduleSuggestions = async () => {
    if (!id || !property) return;
    setIsLoadingSchedule(true);
    try {
      const response = await api.post<{ suggestions: string[]; reasoning: string }>('/api/ask/schedule-suggestions', {
        propertyId: id,
        address: property.address,
        type: property.type,
        daysOnMarket: getDaysOnMarket(property.createdAt),
        buyerInterest: prediction?.buyerInterestLevel || 'Medium'
      });
      if (response.data?.suggestions) {
        setScheduleSuggestions(response.data.suggestions);
      }
    } catch (e) {
      console.error('Failed to fetch schedule suggestions:', e);
      // Fallback suggestions
      setScheduleSuggestions([
        'Saturday 11:00 AM - 12:00 PM (Peak buyer activity)',
        'Sunday 1:00 PM - 2:00 PM (Family-friendly time)',
        'Wednesday 5:30 PM - 6:30 PM (After-work viewings)'
      ]);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Gap 3: Fetch AI-suggested milestones
  const fetchMilestoneSuggestions = async () => {
    if (!property || isLoadingMilestones) return;
    setIsLoadingMilestones(true);
    try {
      const response = await api.post<{ suggestions: string[] }>('/api/ask/milestone-suggestions', {
        propertyId: id,
        status: property.status,
        daysOnMarket: getDaysOnMarket(property.createdAt),
        existingMilestones: property.milestones?.map(m => m.title) || []
      });
      if (response.data?.suggestions) {
        setMilestoneSuggestions(response.data.suggestions);
      }
    } catch (e) {
      console.error('Failed to fetch milestone suggestions:', e);
      // Fallback based on status
      const fallback = property.status === 'active'
        ? ['First Open Home', 'Marketing Review', 'Price Strategy Meeting']
        : property.status === 'under_contract'
          ? ['Finance Approval', 'LIM Report', 'Pre-Settlement Inspection']
          : ['Settlement Complete', 'Key Handover'];
      setMilestoneSuggestions(fallback);
    } finally {
      setIsLoadingMilestones(false);
    }
  };

  // Gap 4: Fetch AI timeline summary
  const fetchTimelineSummary = async () => {
    if (!id || timeline.length === 0 || isLoadingTimelineSummary) return;
    setIsLoadingTimelineSummary(true);
    try {
      const response = await api.post<{ summary: string }>('/api/ask/timeline-summary', {
        propertyId: id,
        events: timeline.slice(0, 10).map(e => ({
          type: e.type,
          summary: e.summary,
          timestamp: e.timestamp
        }))
      });
      if (response.data?.summary) {
        setTimelineSummary(response.data.summary);
      }
    } catch (e) {
      console.error('Failed to fetch timeline summary:', e);
      // Generate simple fallback
      const recentCount = timeline.filter(e => {
        const d = new Date(e.timestamp);
        return d > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }).length;
      setTimelineSummary(`${recentCount} activities in the last 7 days. ${timeline.length} total events recorded.`);
    } finally {
      setIsLoadingTimelineSummary(false);
    }
  };

  // Trigger timeline summary when timeline loads
  useEffect(() => {
    if (timeline.length > 0 && !timelineSummary) {
      fetchTimelineSummary();
    }
  }, [timeline]);

  const startRecording = async () => {
    try {
      setUsedVoiceRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          const timestamp = new Date().toLocaleTimeString();
          setNoteContent(prev => prev + (prev ? '\n' : '') + `[Voice note recorded at ${timestamp}]`);
        }
      };

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript;
              setNoteContent(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + text);
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsTranscribing(true);
      }

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsTranscribing(false);
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/api/timeline/${eventId}`);
      setTimeline(prev => prev.filter(e => e.id !== eventId));
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const startEditingEvent = (event: TimelineEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEventId(event.id);
    setEditSummary(event.summary);
    setEditContent(event.content || '');
  };

  const cancelEditingEvent = () => {
    setEditingEventId(null);
    setEditSummary('');
    setEditContent('');
  };

  const saveEditedEvent = async () => {
    if (!editingEventId) return;
    try {
      await api.put(`/api/timeline/${editingEventId}`, {
        summary: editSummary,
        content: editContent
      });

      setTimeline(prev => prev.map(e => {
        if (e.id === editingEventId) {
          return { ...e, summary: editSummary, content: editContent };
        }
        return e;
      }));

      cancelEditingEvent();
    } catch (err) {
      console.error('Failed to update event:', err);
    }
  };

  const handleDeleteProperty = async () => {
    if (!id || !property) return;

    if (!window.confirm(`Are you sure you want to delete ${property.address}?`)) {
      return;
    }

    try {
      await api.delete(`/api/properties/${id}`);
      navigate('/properties');
    } catch (err) {
      console.error('Failed to delete property:', err);
      alert('Failed to delete property.');
    }
  };


  // Get all contacts for compose modal
  const allContacts = [
    ...(property?.vendors || []),
    ...(property?.buyers || []),
  ].map(c => ({
    id: c.id,
    name: c.name,
    emails: c.emails,
    role: c.role
  }));

  const statusConfig = property ? (STATUS_CONFIG[property.status || 'active'] || STATUS_CONFIG.active) : STATUS_CONFIG.active;
  const typeConfig = property ? (TYPE_CONFIG[property.type || 'residential'] || TYPE_CONFIG.residential) : TYPE_CONFIG.residential;

  if (loading) {
    return (
      <div className="property-detail-page">
        <AmbientBackground variant="subtle" />
        <div className="property-detail-page__loading">
          <RefreshCw className="property-detail-page__spin" size={48} />
          <p>Loading Property Intelligence...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="property-detail-page">
        <AmbientBackground variant="subtle" />
        <div className="property-detail-page__container">
          <div className="property-detail-page__error">{error || 'Property not found.'}</div>
          <button className="property-detail-page__back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back to Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="property-detail-page" style={{
      '--status-color': statusConfig.color,
      '--status-bg': statusConfig.bg,
      '--status-border': statusConfig.border
    } as React.CSSProperties}>
      <AmbientBackground variant="default" />

      <div className="property-detail-page__container">
        <header className="property-detail-page__header">
          <div className="property-detail-page__header-left">
            <button className="property-detail-page__back" onClick={() => {
              if (backState?.fromCalendar) {
                navigate(`/calendar?openEventId=${backState.eventId || ''}`);
              } else {
                navigate(-1);
              }
            }}>
              <ArrowLeft size={18} /> {backState?.fromCalendar ? 'Back to Calendar' : 'Properties'}
            </button>
            <button className="property-detail-page__delete-btn" onClick={handleDeleteProperty} title="Delete Property">
              <Trash2 size={16} /> Delete Property
            </button>
          </div>
          <div className="property-detail-page__header-title-row">
            <h1 className="property-detail-page__address">{property.address}</h1>
          </div>
          <div className="property-detail-page__badges">
            <span
              className="property-detail-page__status-badge"
              style={{ background: statusConfig.bg, color: statusConfig.color, borderColor: statusConfig.color }}
            >
              {statusConfig.label}
            </span>
            <span className="property-detail-page__type-badge">
              {typeConfig.icon}
              {typeConfig.label}
            </span>
          </div>
        </header>

        <section className="property-detail-page__section">
          <div className="property-detail-page__intel-header">
            <h2 className="property-detail-page__section-title">
              <Sparkles size={18} /> AI Property Intelligence
            </h2>
            <div className="property-detail-page__intel-actions">
              <div className="neural-pulse-container">
                <button
                  className={`refresh-brain-btn ${isRefreshingIntel ? 'spinning' : ''} ${cooldownRemaining > 0 ? 'cooldown' : ''}`}
                  onClick={handleRefreshIntelligence}
                  disabled={isRefreshingIntel || cooldownRemaining > 0}
                  title={cooldownRemaining > 0 ? `Cooldown: ${Math.floor(cooldownRemaining / 60)}:${(cooldownRemaining % 60).toString().padStart(2, '0')} remaining` : 'Trigger Neural Pulse'}
                >
                  <RefreshCw size={14} /> {isRefreshingIntel ? 'Pulsing...' : cooldownRemaining > 0 ? `${Math.floor(cooldownRemaining / 60)}:${(cooldownRemaining % 60).toString().padStart(2, '0')}` : 'Neural Pulse'}
                </button>
                <button
                  className="neural-pulse-help-btn"
                  onClick={() => setShowPulseHelp(!showPulseHelp)}
                  title="What is Neural Pulse?"
                >
                  <HelpCircle size={14} />
                </button>
                {showPulseHelp && (
                  <div className="neural-pulse-tooltip">
                    <strong>Neural Pulse</strong>
                    <p>
                      Triggers Zena's AI to re-analyse this property's market position,
                      engagement velocity, and buyer interest patterns. This refreshes
                      the intelligence snippets and recalculates the momentum score.
                    </p>
                    <p className="pulse-tip">💡 Use this after adding new viewing intel or making a price adjustment.</p>
                  </div>
                )}
              </div>
              <button
                className="property-detail-page__edit-intel-btn"
                onClick={() => setIsEditingProperty(true)}
              >
                <Pencil size={14} /> Update Intelligence
              </button>
            </div>
          </div>



          <div className="property-detail-page__info-grid">
            <div className="property-detail-page__info-item">
              <span className="property-detail-page__info-label">Listing Price</span>
              <span className="property-detail-page__info-value property-detail-page__info-value--price">
                {property.listingPrice ? formatPrice(property.listingPrice) : 'Price on Application'}
              </span>
            </div>
            <div className="property-detail-page__info-item">
              <span className="property-detail-page__info-label">Days on Market</span>
              <span className="property-detail-page__info-value">{getDaysOnMarket(property.createdAt)} days</span>
            </div>
            <div className="property-detail-page__info-item">
              <span className="property-detail-page__info-label">Buyer Matches</span>
              <span className="property-detail-page__info-value">{property.buyers?.length || 0} interested</span>
            </div>
          </div>

          {/* Risk Indicators */}
          {deal && deal.riskLevel !== 'none' && (
            <div className="property-detail-page__risk-alert">
              <div className="risk-alert-header">
                <AlertTriangle size={18} className="risk-icon" />
                <span>Risk Level: {deal.riskLevel.toUpperCase()}</span>
              </div>
              <p className="risk-alert-summary">{property.riskOverview || deal.summary}</p>
            </div>
          )}

          <div className="property-detail-page__intel-grid">
            <div className="intel-card">
              <div className="intel-card-header">
                <Home size={14} /> Property Type
              </div>
              <div className="intel-card-value">
                {typeConfig.label}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-card-header">
                <DollarSign size={14} /> Price
              </div>
              <div className="intel-card-value">
                {property.listingPrice ? formatPrice(property.listingPrice) : 'POA'}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-card-header">
                <MapPin size={14} /> Specs
              </div>
              <div className="intel-card-value">
                {property.bedrooms || '0'} Beds, {property.bathrooms || '0'} Baths
                {(property.landSize || property.floorSize) && (
                  <div className="intel-card-subvalue" style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                    {property.floorSize && <span>{property.floorSize} Floor</span>}
                    {property.floorSize && property.landSize && <span> • </span>}
                    {property.landSize && <span>{property.landSize} Land</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-card-header">
                <Clock size={14} /> Last Activity
              </div>
              <div className="intel-card-value">
                {timeline.length > 0 ? formatDate(timeline[0].timestamp) : 'No activity'}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-card-header">
                <Users size={14} /> Vendors
              </div>
              <div className="intel-card-value">
                {property.vendors?.length || 0} linked
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="property-detail-page__section">
          <div className="property-detail-page__actions">
            <button className="property-detail-page__action-button" onClick={() => setShowComposeModal(true)}>
              <Mail size={18} /> Email
            </button>
            {property.vendors && property.vendors.length > 0 && (
              <ZenaCallTooltip
                contactId={property.vendors[0].id}
                phones={property.vendors[0].phones}
                contactName={property.vendors[0].name}
              >
                <button className="property-detail-page__action-button">
                  <Phone size={18} /> Call Vendor
                </button>
              </ZenaCallTooltip>
            )}
            <button
              className={`property-detail-page__action-button ${showNoteForm ? 'active' : ''}`}
              onClick={() => setShowNoteForm(!showNoteForm)}
            >
              <Plus size={18} /> Add note
              <LogIntelTooltip />
            </button>
            <button
              className="property-detail-page__action-button"
              onClick={() => {
                setShowScheduleModal(true);
                fetchScheduleSuggestions();
              }}
            >
              <Calendar size={18} /> Schedule Open Home
              <Sparkles size={12} style={{ marginLeft: '4px', color: '#00D4FF' }} />
            </button>
          </div>

          <AddNoteModal
            isOpen={showNoteForm}
            onClose={() => setShowNoteForm(false)}
            onSave={handleSaveNote}
            entityId={id}
            entityType="property"
            entityName={property?.address}
          />
        </section>

        {/* Email Correspondence Section */}
        {threads.length > 0 && (
          <section className="property-detail-page__section">
            <h2 className="property-detail-page__section-title">
              <Mail size={18} /> Email Correspondence
            </h2>
            <div className="property-detail-page__threads-list">
              {threads.map(thread => (
                <div
                  key={thread.id}
                  className="property-detail-page__thread-item"
                  onClick={() => navigate(`/threads/${thread.id}`)}
                >
                  <div className="thread-item__header">
                    <span className="thread-item__subject">{thread.subject}</span>
                    <span className="thread-item__date">{formatDate(thread.lastMessageAt)}</span>
                  </div>
                  <p className="thread-item__summary">{thread.summary}</p>
                  <div className="thread-item__badges">
                    <span className={`thread-badge ${thread.classification}`}>{thread.classification}</span>
                    {thread.riskLevel !== 'none' && (
                      <span className={`thread-badge risk-${thread.riskLevel}`}>Risk: {thread.riskLevel}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Contacts Section */}
        {(property.vendors?.length || property.buyers?.length) && (
          <section className="property-detail-page__section">
            <h2 className="property-detail-page__section-title">
              <Users size={18} /> Related Contacts
            </h2>
            <div className="property-detail-page__contacts-grid">
              {property.vendors?.map(contact => {
                const roleTheme = ROLE_THEME[contact.role] || ROLE_THEME.vendor;
                return (
                  <div
                    key={contact.id}
                    className="property-detail-page__contact-card"
                    onClick={() => navigate(`/contacts/${contact.id}`, { state: { from: location.pathname, label: property.address } })}
                    style={{ '--contact-color': roleTheme.color } as React.CSSProperties}
                  >
                    <div className="contact-card__header">
                      <span className="contact-card__name">{contact.name}</span>
                      <span className="contact-card__role" style={{ background: roleTheme.bg, color: roleTheme.color }}>
                        Vendor
                      </span>
                    </div>
                    {contact.emails[0] && <p className="contact-card__email">{contact.emails[0]}</p>}
                    {contact.phones[0] && <p className="contact-card__phone">{contact.phones[0]}</p>}
                  </div>
                );
              })}
              {property.buyers?.map(contact => {
                const roleTheme = ROLE_THEME.buyer;
                return (
                  <div
                    key={contact.id}
                    className="property-detail-page__contact-card"
                    onClick={() => navigate(`/contacts/${contact.id}`, { state: { from: location.pathname, label: property.address } })}
                    style={{ '--contact-color': roleTheme.color } as React.CSSProperties}
                  >
                    <div className="contact-card__header">
                      <span className="contact-card__name">{contact.name}</span>
                      <span className="contact-card__role" style={{ background: roleTheme.bg, color: roleTheme.color }}>
                        Buyer
                      </span>
                    </div>
                    {contact.emails[0] && <p className="contact-card__email">{contact.emails[0]}</p>}
                    {contact.phones[0] && <p className="contact-card__phone">{contact.phones[0]}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Campaign Milestones */}
        <section className="property-detail-page__section">
          <div className="property-detail-page__section-header">
            <h2 className="property-detail-page__section-title">
              <TrendingUp size={18} /> Campaign Milestones
            </h2>
            <button
              className="property-detail-page__add-btn"
              onClick={() => setShowMilestoneForm(!showMilestoneForm)}
            >
              <Plus size={16} /> Add Milestone
            </button>
          </div>

          {showMilestoneForm && (
            <div className="property-detail-page__milestone-form">
              <h3 style={{ color: 'white', fontSize: '16px', marginBottom: '16px' }}>
                {editingMilestoneId ? 'Edit Milestone' : 'Add Milestone'}
              </h3>
              {/* AI Milestone Suggestions */}
              {!editingMilestoneId && milestoneSuggestions.length === 0 && !isLoadingMilestones && (
                <button
                  className="property-detail-page__ai-suggest-btn"
                  onClick={fetchMilestoneSuggestions}
                  style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '6px', color: '#00D4FF', cursor: 'pointer', fontSize: '12px' }}
                >
                  <Sparkles size={14} /> Get AI Suggestions
                </button>
              )}
              {!editingMilestoneId && isLoadingMilestones && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '12px' }}>Loading AI suggestions...</div>}
              {!editingMilestoneId && milestoneSuggestions.length > 0 && (
                <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {milestoneSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setMilestoneTitle(s)}
                      style={{ padding: '6px 10px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '20px', color: '#00D4FF', cursor: 'pointer', fontSize: '11px' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="text"
                className="property-detail-page__milestone-input"
                placeholder="Milestone title (e.g., First Open Home)"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
              />
              <div style={{ marginBottom: '16px' }}>
                <ZenaDatePicker
                  value={milestoneDate}
                  onChange={(val) => setMilestoneDate(val)}
                  placeholder="Select milestone date & time"
                  appointments={[
                    ...timeline.map(e => ({ id: e.id, time: new Date(e.timestamp), title: e.summary })),
                    ...(property.milestones?.filter(m => m.id !== editingMilestoneId).map(m => ({ id: m.id, time: new Date(m.date), title: m.title })) || [])
                  ]}
                />
              </div>
              <textarea
                className="property-detail-page__milestone-textarea"
                placeholder="Notes (optional)"
                value={milestoneNotes}
                onChange={(e) => setMilestoneNotes(e.target.value)}
                rows={3}
              />
              <div className="property-detail-page__milestone-actions">
                {editingMilestoneId && (
                  <button
                    className="property-detail-page__delete-btn"
                    onClick={() => handleDeleteMilestone(editingMilestoneId)}
                    disabled={addingMilestone}
                    style={{ marginRight: 'auto', background: 'rgba(255, 107, 107, 0.1)', color: '#FF6B6B', border: '1px solid rgba(255, 107, 107, 0.2)', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
                <button
                  className="property-detail-page__note-cancel"
                  onClick={() => {
                    setShowMilestoneForm(false);
                    setMilestoneTitle('');
                    setMilestoneDate('');
                    setMilestoneNotes('');
                    setMilestoneType('custom');
                    setEditingMilestoneId(null);
                  }}
                  disabled={addingMilestone}
                >
                  Cancel
                </button>
                <button
                  className="property-detail-page__note-save"
                  onClick={handleAddMilestone}
                  disabled={!milestoneTitle.trim() || !milestoneDate || addingMilestone}
                >
                  {addingMilestone ? 'Saving...' : editingMilestoneId ? 'Update Milestone' : 'Save Milestone'}
                </button>
              </div>
            </div>
          )}

          {/* AI Predicted Roadmap */}
          {prediction?.milestoneForecasts && prediction.milestoneForecasts.length > 0 && (
            <div className="property-detail-page__predicted-roadmap">
              <div className="property-detail-page__predicted-roadmap-header">
                <Brain size={16} />
                <span>AI Predicted Roadmap</span>
              </div>
              <div className="property-detail-page__predicted-milestones">
                {prediction.milestoneForecasts.map((forecast, idx) => (
                  <div key={`forecast-${idx}`} className="property-detail-page__predicted-milestone">
                    <div className="property-detail-page__predicted-milestone-info">
                      <span className="property-detail-page__predicted-milestone-type">{forecast.type}</span>
                      <span className="property-detail-page__predicted-milestone-date">{formatDate(forecast.date)}</span>
                    </div>
                    <div className="property-detail-page__predicted-milestone-confidence">
                      <div
                        className="property-detail-page__predicted-milestone-bar"
                        style={{ width: `${forecast.confidence * 100}%` }}
                      />
                      <span className="property-detail-page__predicted-milestone-percentage">
                        {Math.round(forecast.confidence * 100)}% Confidence
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {property.milestones && property.milestones.length > 0 ? (
            <div className="property-detail-page__milestones">
              {property.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`property-detail-page__milestone ${editingMilestoneId === milestone.id ? 'editing' : ''}`}
                  onClick={() => {
                    setEditingMilestoneId(milestone.id);
                    setMilestoneTitle(milestone.title);
                    setMilestoneDate(milestone.date);
                    setMilestoneNotes(milestone.notes || '');
                    setMilestoneType(milestone.type);
                    setShowMilestoneForm(true);
                  }}
                  style={{ cursor: 'pointer', transition: 'all 0.2s', border: editingMilestoneId === milestone.id ? '1px solid #00D4FF' : '1px solid transparent' }}
                >
                  <div className="property-detail-page__milestone-header">
                    <span className="property-detail-page__milestone-title">
                      {milestone.title}
                    </span>
                    <span className="property-detail-page__milestone-date">
                      {formatDate(milestone.date)}
                    </span>
                  </div>
                  {milestone.notes && (
                    <p className="property-detail-page__milestone-notes">{milestone.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="property-detail-page__empty-state">
              No milestones yet. Add one to track campaign progress.
            </p>
          )}
        </section>

        {/* Activity Timeline */}
        <section className="property-detail-page__section">
          <h2 className="property-detail-page__section-title">
            <History size={18} /> Chronological Timeline
          </h2>
          {/* AI Timeline Summary */}
          {(timelineSummary || isLoadingTimelineSummary) && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 255, 136, 0.05))', borderRadius: '8px', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={14} style={{ color: '#00D4FF' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#00D4FF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Activity Summary</span>
              </div>
              {isLoadingTimelineSummary ? (
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Analyzing activity...</div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: 1.5 }}>{timelineSummary}</div>
              )}
            </div>
          )}
          <div className="property-detail-page__timeline">
            {timeline.length > 0 ? timeline.map(event => (
              <div key={event.id} className="property-detail-page__timeline-event">
                <div className={`property-detail-page__timeline-marker ${event.metadata?.godmode ? 'godmode' : ''}`}>
                  {event.metadata?.godmode ? (
                    <Zap size={18} fill="currentColor" />
                  ) : (
                    <>
                      {event.type === 'email' && <Mail size={16} />}
                      {event.type === 'call' && <Phone size={16} />}
                      {event.type === 'meeting' && <Calendar size={16} />}
                      {event.type === 'task' && <CheckCircle2 size={16} />}
                      {event.type === 'note' && <FileText size={16} />}
                      {event.type === 'voice_note' && <Mic size={16} />}
                    </>
                  )}
                </div>
                <div className="property-detail-page__timeline-content">
                  <div className="property-detail-page__timeline-header">
                    <span className="property-detail-page__timeline-type">{event.type.replace(/_/g, ' ').toUpperCase()}</span>
                    <div className="property-detail-page__timeline-actions">
                      <span className="property-detail-page__timeline-date">{formatDate(event.timestamp)}</span>
                      {editingEventId !== event.id && (
                        <>
                          <button
                            className="property-detail-page__timeline-action-btn edit"
                            onClick={(e) => startEditingEvent(event, e)}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="property-detail-page__timeline-action-btn delete"
                            onClick={(e) => handleDeleteEvent(event.id, e)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {editingEventId === event.id ? (
                    <div className="property-detail-page__timeline-edit-form">
                      <input
                        type="text"
                        className="property-detail-page__timeline-edit-summary"
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        placeholder="Summary"
                      />
                      <textarea
                        className="property-detail-page__timeline-edit-content"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Content"
                        rows={3}
                      />
                      <div className="property-detail-page__timeline-edit-actions">
                        <button className="property-detail-page__note-cancel" onClick={cancelEditingEvent}>Cancel</button>
                        <button className="property-detail-page__note-save" onClick={saveEditedEvent}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="property-detail-page__timeline-summary">
                        {event.summary}
                        {event.metadata?.godmode && (
                          <span className={`godmode-badge ${event.metadata.mode}`}>
                            {event.metadata.mode === 'full_god' ? '⚡ God' : '✨ Demi'}
                          </span>
                        )}
                      </h4>
                      {event.content && <p className="property-detail-page__timeline-detail">{event.content}</p>}
                    </>
                  )}
                </div>
              </div>
            )) : (
              <p className="property-detail-page__empty-state">
                No activity recorded yet.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Compose Modal */}
      {showComposeModal && (
        <ZenaBatchComposeModal
          selectedContacts={allContacts}
          onClose={handleComposeClose}
          oraclePredictions={{}}
        />
      )}
      {showComposeModal && allContacts.length === 0 && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.9)', padding: '24px', borderRadius: '12px', zIndex: 9999, color: 'white', textAlign: 'center' }}>
          <p>No contacts associated with this property.</p>
          <button onClick={() => setShowComposeModal(false)} style={{ marginTop: '16px', padding: '8px 16px', background: '#00D4FF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
        </div>
      )}

      {/* Schedule Modal with AI Suggestions - using Portal for proper centering */}
      {showScheduleModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ background: 'linear-gradient(135deg, #0a1628, #0d1f35)', padding: '24px', borderRadius: '16px', maxWidth: '520px', width: '100%', border: '1px solid rgba(0, 212, 255, 0.2)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: 'white', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Sparkles size={20} style={{ color: '#00D4FF' }} />
                {isConfirmingSlot ? 'Confirm Open Home' : 'AI-Suggested Open Home Times'}
              </h3>
              <button onClick={() => { setShowScheduleModal(false); setSelectedSlot(null); setIsConfirmingSlot(false); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>

            {isLoadingSchedule ? (
              <div style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', padding: '20px' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '12px' }}>Analyzing buyer activity patterns...</p>
              </div>
            ) : isConfirmingSlot && selectedSlot ? (
              /* Confirmation View */
              <>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ padding: '16px', background: 'rgba(0, 255, 136, 0.1)', border: '2px solid rgba(0, 255, 136, 0.4)', borderRadius: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <CheckCircle2 size={20} style={{ color: '#00FF88' }} />
                      <span style={{ color: '#00FF88', fontWeight: 600, fontSize: '14px' }}>Selected Time</span>
                    </div>
                    <p style={{ color: 'white', fontSize: '15px', margin: 0 }}>{selectedSlot}</p>
                  </div>

                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '12px' }}>Other suggested times:</p>
                  {scheduleSuggestions.filter(s => s !== selectedSlot).map((suggestion, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedSlot(suggestion)}
                      style={{
                        padding: '12px 14px',
                        background: 'rgba(0, 212, 255, 0.05)',
                        border: '1px solid rgba(0, 212, 255, 0.1)',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Calendar size={16} style={{ color: '#00D4FF' }} />
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setIsConfirmingSlot(false)}
                    style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={async () => {
                      if (!property || !selectedSlot) return;
                      try {
                        // Parse the slot to extract date/time info - now includes full date
                        const dateMatch = selectedSlot.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
                        const timeMatch = selectedSlot.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);

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

                        await api.post(`/api/properties/${property.id}/milestones`, {
                          type: 'open_home',
                          title: `Open Home - ${property.address}`,
                          date: targetDate.toISOString(),
                          notes: selectedSlot
                        });

                        // Refresh property data
                        loadPropertyData();
                        setShowScheduleModal(false);
                        setSelectedSlot(null);
                        setIsConfirmingSlot(false);
                      } catch (err) {
                        console.error('Failed to create open home:', err);
                      }
                    }}
                    style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #00FF88, #00D4FF)', border: 'none', borderRadius: '8px', color: '#0a1628', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <CheckCircle2 size={18} />
                    Confirm Open Home
                  </button>
                </div>
              </>
            ) : (
              /* Slot Selection View */
              <>
                <div style={{ marginBottom: '20px' }}>
                  {scheduleSuggestions.map((suggestion, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        // Navigate to calendar with this slot selected and all suggestions
                        const suggestionsParam = encodeURIComponent(JSON.stringify(scheduleSuggestions));
                        navigate(`/calendar?property=${encodeURIComponent(property?.address || '')}&propertyId=${property?.id || ''}&suggestions=${suggestionsParam}&selected=${encodeURIComponent(suggestion)}`);
                        setShowScheduleModal(false);
                      }}
                      style={{
                        padding: '14px 16px',
                        background: 'rgba(0, 212, 255, 0.08)',
                        border: '1px solid rgba(0, 212, 255, 0.15)',
                        borderRadius: '8px',
                        marginBottom: '10px',
                        cursor: 'pointer',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Calendar size={18} style={{ color: '#00D4FF', flexShrink: 0 }} />
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      // Navigate to calendar with all suggestions
                      const suggestionsParam = encodeURIComponent(JSON.stringify(scheduleSuggestions));
                      navigate(`/calendar?property=${encodeURIComponent(property?.address || '')}&propertyId=${property?.id || ''}&suggestions=${suggestionsParam}`);
                      setShowScheduleModal(false);
                    }}
                    style={{ flex: 1, padding: '12px', background: 'rgba(0, 212, 255, 0.2)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '8px', color: '#00D4FF', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Open Calendar
                  </button>
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {isEditingProperty && property && (
        <AddPropertyModal
          isOpen={isEditingProperty}
          onClose={() => setIsEditingProperty(false)}
          onSave={handleUpdateProperty}
          initialData={property}
          title="Update Intelligence"
        />
      )}
    </div>
  );
};
