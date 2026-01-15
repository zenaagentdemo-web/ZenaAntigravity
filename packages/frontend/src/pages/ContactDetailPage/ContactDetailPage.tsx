import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Plus,
  History,
  Sparkles,
  Briefcase,
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
  HelpCircle
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { AddNoteModal } from '../../components/AddNoteModal/AddNoteModal';
import { realTimeDataService } from '../../services/realTimeDataService';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import { LogIntelTooltip } from '../../components/LogIntelTooltip/LogIntelTooltip';
import { ZenaBatchComposeModal } from '../../components/ZenaBatchComposeModal/ZenaBatchComposeModal';
import { ZenaCallTooltip } from '../../components/ZenaCallTooltip/ZenaCallTooltip';
import { NewContactModal } from '../../components/NewContactModal/NewContactModal';
import { Contact, ContactRole, DealStage, EngagementScore } from '../../models/contact.types';
import './ContactDetailPage.css';
import { useDealNavigation } from '../../hooks/useDealNavigation';

interface RelationshipNote {
  id: string;
  content: string;
  source: 'email' | 'voice_note' | 'manual' | 'ai';
  createdAt: string;
}

interface Deal {
  id: string;
  stage: string;
  propertyId?: string;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  nextAction?: string;
  summary: string;
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

interface Thread {
  id: string;
  subject: string;
  summary: string;
  classification: string;
  category: string;
  riskLevel: string;
  lastMessageAt: string;
}



const ROLE_THEME: Record<string, { label: string, color: string, bg: string, border: string }> = {
  buyer: { label: 'Buyer', color: '#00D4FF', bg: 'rgba(0, 212, 255, 0.1)', border: 'rgba(0, 212, 255, 0.3)' },
  vendor: { label: 'Vendor', color: '#FF00FF', bg: 'rgba(255, 0, 255, 0.1)', border: 'rgba(255, 0, 255, 0.3)' },
  tradesperson: { label: 'Trades', color: '#FF6B35', bg: 'rgba(255, 107, 53, 0.1)', border: 'rgba(255, 107, 53, 0.3)' },
  agent: { label: 'Agent', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)' },
  market: { label: 'Market', color: '#00FF88', bg: 'rgba(0, 255, 136, 0.1)', border: 'rgba(0, 255, 136, 0.3)' },
  other: { label: 'Contact', color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)' },
  // Fix for specific data artifact 'Jab' -> Vendor
  jab: { label: 'Vendor', color: '#FF00FF', bg: 'rgba(255, 0, 255, 0.1)', border: 'rgba(255, 0, 255, 0.3)' },
};



export const ContactDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFromDeal, goBackToDeal } = useDealNavigation();
  const location = useLocation();
  const backState = location.state as { from?: string; label?: string; fromCalendar?: boolean; eventId?: string } | null;
  const [contact, setContact] = useState<Contact | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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
  const [isEditingIntel, setIsEditingIntel] = useState(false);
  const [isRefreshingBrain, setIsRefreshingBrain] = useState(false);
  const [showPulseHelp, setShowPulseHelp] = useState(false);

  // Relationship decaying / alerts logic

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
      loadContactData();
    }
  }, [id]);

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = realTimeDataService.onDataUpdate((data: any) => {
      if (data.contactUpdate && data.contactUpdate.contactId === id) {
        console.log('[ContactDetailPage] Received real-time update for contact:', id);
        // We can either update state directly or reload. 
        // Reloading is safer to ensure we get all calculated fields.
        loadContactData();
      }
    });

    return () => unsubscribe();
  }, [id]);

  // Note handlers removed - moved to AddNoteModal

  const loadContactData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load contact details
      const response = await api.get<{ contact: Contact, threads: any }>(`/api/contacts/${id}`);
      const contactData = response.data.contact;

      setContact(contactData);
      setDeals(contactData.deals || []);
      setThreads(response.data.threads || []);

      // Load pending actions
      const actionsResponse = await api.get(`/api/godmode/actions?contactId=${id}`);
      setPendingActions(actionsResponse.data.actions || []);

      // Load timeline
      const timelineResponse = await api.get<TimelineEvent[] | { events: TimelineEvent[] }>(
        `/api/timeline?entityType=contact&entityId=${id}`
      );
      const timelineData = Array.isArray(timelineResponse.data)
        ? timelineResponse.data
        : (timelineResponse.data as any).events || [];
      setTimeline(timelineData);
    } catch (err) {
      console.error('Failed to load contact data:', err);
      setError('Neural data link severed. Refreshing connection...');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async (noteData: { content: string; type: string; linkedPropertyId?: string }) => {
    if (!noteData.content.trim() || !id) return;

    try {
      setAddingNote(true);
      await api.post(`/api/contacts/${id}/notes`, {
        content: noteData.content,
        source: noteData.type === 'voice_note' ? 'voice_note' : 'manual'
      });
      await loadContactData();
      setShowNoteForm(false);
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setAddingNote(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const startRecording = async () => {
    try {
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
        const stream = mediaRecorder.stream;
        stream.getTracks().forEach(track => track.stop());

        // If we have recognition results, they are already in noteContent.
        // If not (no WebSpeech API), we fall back to the placeholder.
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          const timestamp = new Date().toLocaleTimeString();
          setNoteContent(prev => prev + (prev ? '\n' : '') + `[Voice note recorded at ${timestamp}]`);
        }
      };

      // Start Web Speech API for transcription if available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = '';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          // Update the note content in real-time
          // Note: This simple implementation might overwrite previous manual edits if typing while speaking.
          // Ideally, append to cursor or end. Here we append to end of existing content before recording started?? 
          // Simpler: Just append to the *initial* content at start of recording? 
          // For now, let's just append to current.
          // But React state updates are tricky here inside callback.
          // We will just let the user see the transcription appear.

          // Actually, it's safer to just set the transcription text into the area 
          // or append it. Let's try appending.
        };

        // Better approach for React integration:
        // We'll use a specific handler that updates state carefully.
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript.trim()) {
            setNoteContent(prev => {
              // Avoid duplicating if we get same result? 
              // WebSpeech sends cumulative results or partials?
              // resultIndex tells us where to start.
              // For simplicity in this demo, we just append valid results.
              // But interim results cause flickering if we just append.
              // We only want FINAL results to be permanently appended.
              return prev;
            });
          }
        };

        // Simplified approach that works well for demos:
        // Only append FINAL results.
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

      // Stop recognition if active
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
      // Ideally show a toast here
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

      // Update local state
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

  const handleRefreshBrain = async () => {
    if (!id || isRefreshingBrain || cooldownRemaining > 0) return;
    try {
      setIsRefreshingBrain(true);
      await api.post(`/api/contacts/${id}/discovery`);
      await loadContactData();
      setLastPulseTime(Date.now()); // Start cooldown
    } catch (err) {
      console.error('Failed to run neural pulse:', err);
    } finally {
      setIsRefreshingBrain(false);
    }
  };

  const handleUpdateIntelligence = async (updatedData: any) => {
    if (!id || !contact) return;
    try {
      const { firstName, lastName, email, phone, role, intelligence } = updatedData;

      const payload = {
        name: `${firstName} ${lastName}`.trim(),
        emails: [email],
        phones: [phone],
        role,
        zenaIntelligence: intelligence
      };

      await api.put(`/api/contacts/${id}`, payload);

      setContact({
        ...contact,
        name: payload.name,
        emails: payload.emails,
        phones: payload.phones,
        role: payload.role as any,
        zenaIntelligence: payload.zenaIntelligence
      });
      setIsEditingIntel(false);
    } catch (err) {
      console.error('Failed to update contact:', err);
    }
  };

  const handleDeleteContact = async () => {
    if (!id || !contact) return;

    if (!window.confirm(`Are you sure you want to delete ${contact.name}? (Yes/No)`)) {
      return;
    }

    try {
      await api.delete(`/api/contacts/${id}`);
      navigate('/contacts');
    } catch (err) {
      console.error('Failed to delete contact:', err);
      alert('System failed to delete contact record.');
    }
  };

  const roleTheme = contact ? (ROLE_THEME[contact.role] || ROLE_THEME.other) : ROLE_THEME.other;

  if (loading) {
    return (
      <div className="contact-detail-page">
        <AmbientBackground variant="subtle" />
        <div className="contact-detail-page__loading">
          <RefreshCw className="contact-detail-page__spin" size={48} />
          <p>Analyzing Relationship Nodes...</p>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="contact-detail-page">
        <div className="contact-detail-page__container">
          <div className="contact-detail-page__error">{error || 'Entity not found.'}</div>
          <button className="contact-detail-page__back" onClick={() => navigate(backState?.from || '/contacts')}>
            <ArrowLeft size={18} /> {backState?.label ? `Back to ${backState.label}` : 'Re-entry to Contacts'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-detail-page" style={{
      '--role-color': roleTheme.color,
      '--role-bg': roleTheme.bg,
      '--role-border': roleTheme.border
    } as React.CSSProperties}>
      <AmbientBackground variant="default" />

      <div className="contact-detail-page__container">
        <header className="contact-detail-page__header">
          <div className="contact-detail-page__header-left">
            {!isFromDeal && (
              <button className="contact-detail-page__back" onClick={() => {
                if (backState?.fromCalendar) {
                  navigate(`/calendar?openEventId=${backState.eventId || ''}`);
                } else {
                  navigate(backState?.from || '/contacts');
                }
              }}>
                <ArrowLeft size={18} /> {backState?.fromCalendar ? 'Back to Calendar' : (backState?.label || 'Contacts')}
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
                  transition: 'all 0.2s',
                  marginLeft: '8px'
                }}
              >
                <span style={{ fontSize: '1rem' }}>📦</span>
                Return to Deal
              </button>
            )}
            <button className="contact-detail-page__delete-contact-btn" onClick={handleDeleteContact} title="Delete Contact">
              <Trash2 size={16} /> Delete Contact
            </button>
          </div>
          <div className="contact-detail-page__header-title-row">
            <h1 className="contact-detail-page__name">{contact.name}</h1>
            <div className="contact-detail-page__score-group">
              <div className="contact-detail-page__intel-badge" data-heat={contact.engagementScore && contact.engagementScore > 80 ? 'hot' : 'normal'}>
                {contact.engagementScore || 0}% INTEL
              </div>
              {contact.engagementVelocity !== undefined && (
                <div className={`contact-detail-page__velocity ${contact.engagementVelocity >= 0 ? 'positive' : 'negative'}`}>
                  {contact.engagementVelocity >= 0 ? '+' : ''}{contact.engagementVelocity}%
                </div>
              )}
            </div>
          </div>
          <div className="contact-detail-page__role-badge">
            {roleTheme.label}
          </div>
        </header>

        {/* Contact Information Section */}
        <section className="contact-detail-page__section contact-info-section">
          <h2 className="contact-detail-page__section-title">
            <Phone size={18} /> Contact Information
          </h2>
          <div className="contact-info-grid">
            {/* Email Addresses */}
            <div className="contact-info-card">
              <div className="contact-info-card__header">
                <Mail size={16} />
                <span>Email Addresses</span>
              </div>
              <div className="contact-info-card__content">
                {contact.emails && contact.emails.length > 0 ? (
                  contact.emails.map((email, index) => (
                    <button
                      key={index}
                      className="contact-info-item clickable"
                      onClick={() => setShowComposeModal(true)}
                      title="Click to compose email"
                    >
                      <Mail size={14} />
                      <span>{email}</span>
                    </button>
                  ))
                ) : (
                  <span className="contact-info-empty">No email addresses on file</span>
                )}
              </div>
            </div>

            {/* Phone Numbers */}
            <div className="contact-info-card">
              <div className="contact-info-card__header">
                <Phone size={16} />
                <span>Phone Numbers</span>
              </div>
              <div className="contact-info-card__content">
                {contact.phones && contact.phones.length > 0 ? (
                  contact.phones.map((phone, index) => (
                    <a
                      key={index}
                      href={`tel:${phone}`}
                      className="contact-info-item clickable"
                      title="Click to call"
                    >
                      <Phone size={14} />
                      <span>{phone}</span>
                    </a>
                  ))
                ) : (
                  <span className="contact-info-empty">No phone numbers on file</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="contact-detail-page__section">
          <div className="intelligence-section__header">
            <h2 className="contact-detail-page__section-title">
              <Sparkles size={18} /> AI Insight & Intelligence
            </h2>
            <div className="intel-header-actions">
              <div className="neural-pulse-container">
                <button
                  className={`refresh-brain-btn ${isRefreshingBrain ? 'spinning' : ''} ${cooldownRemaining > 0 ? 'cooldown' : ''}`}
                  onClick={handleRefreshBrain}
                  disabled={isRefreshingBrain || cooldownRemaining > 0}
                  title={cooldownRemaining > 0 ? `Cooldown: ${Math.floor(cooldownRemaining / 60)}:${(cooldownRemaining % 60).toString().padStart(2, '0')} remaining` : 'Trigger Neural Pulse'}
                >
                  <RefreshCw size={14} /> {isRefreshingBrain ? 'Pulsing...' : cooldownRemaining > 0 ? `${Math.floor(cooldownRemaining / 60)}:${(cooldownRemaining % 60).toString().padStart(2, '0')}` : 'Neural Pulse'}
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
                      Triggers Zena's AI to re-analyse this contact's activity,
                      engagement patterns, and relationship signals. This refreshes
                      the intelligence snippet and recalculates the Zena category
                      (Hot Lead, Pulse, Cold Nurture, High Intent).
                    </p>
                    <p className="pulse-tip">💡 Use this after logging new intel or before a key meeting.</p>
                  </div>
                )}
              </div>
              <button className="edit-intel-btn" onClick={() => setIsEditingIntel(true)}>
                <Pencil size={14} /> Update Intelligence
              </button>
            </div>
          </div>
          <div className="contact-detail-page__intelligence-summary">
            <Shield size={16} className="zena-shield-icon" />
            <p className="zena-intelligence-text">"{contact.intelligenceSnippet || 'Aggregating neural data...'}"</p>
          </div>
          <div className="contact-detail-page__info-grid">
            <div className="contact-detail-page__info-item">
              <span className="contact-detail-page__info-label">Current Status</span>
              <span className="contact-detail-page__info-value">{contact.lastActivityDetail || 'Analyzing...'}</span>
            </div>
            <div className="contact-detail-page__info-item">
              <span className="contact-detail-page__info-label">Sentiment</span>
              <span className="contact-detail-page__info-value">High Priority / Positive</span>
            </div>
            <div className="contact-detail-page__info-item">
              <span className="contact-detail-page__info-label">Last Interaction</span>
              <span className="contact-detail-page__info-value">{timeline.length > 0 ? formatDate(timeline[0].timestamp) : 'N/A'}</span>
            </div>
          </div>

          {/* Pending Actions Alert */}
          {pendingActions.length > 0 && (
            <div className="contact-detail-page__pending-alert">
              <div className="pending-alert-header">
                <Zap size={18} className="zap-icon" />
                <span>{pendingActions.length} Pending Godmode Action{pendingActions.length > 1 ? 's' : ''}</span>
              </div>
              <div className="pending-actions-list">
                {pendingActions.map(action => (
                  <div key={action.id} className="pending-action-item">
                    <div className="pending-action-main">
                      <div className="pending-action-title-row">
                        <span className="pending-action-title">{action.title}</span>
                        <span className="pending-action-priority" style={{ color: action.priority >= 8 ? '#ff5050' : '#fbbf24' }}>
                          Priority {action.priority}/10
                        </span>
                      </div>
                      {action.description && (
                        <p className="pending-action-reasoning">Why: {action.description}</p>
                      )}
                    </div>
                    <button
                      className="pending-action-view-btn"
                      onClick={() => navigate('/contacts?openQueue=true')}
                    >
                      View in Queue <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="intelligence-grid">
            <div className="intel-card">
              <div className="intel-card-header">
                <Home size={14} /> Property Type
              </div>
              <div className="intel-card-value">
                {contact.zenaIntelligence?.propertyType || 'Not Set'}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-card-header">
                <DollarSign size={14} /> Budget
              </div>
              <div className="intel-card-value">
                {contact.zenaIntelligence?.minBudget ? `$${contact.zenaIntelligence.minBudget}` : ''}
                {contact.zenaIntelligence?.maxBudget ? ` - $${contact.zenaIntelligence.maxBudget}` : 'Flexible'}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-card-header">
                <MapPin size={14} /> Locations
              </div>
              <div className="intel-card-value">
                {contact.zenaIntelligence?.location || 'Anywhere'}
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-card-header">
                <Plus size={14} /> Specs
              </div>
              <div className="intel-card-value">
                {contact.zenaIntelligence?.bedrooms || '0'}+ Beds, {contact.zenaIntelligence?.bathrooms || '0'}+ Baths
              </div>
            </div>

            <div className="intel-card">
              <div className="intel-card-header">
                <Clock size={14} /> Timeline
              </div>
              <div className="intel-card-value">
                {contact.zenaIntelligence?.timeline || 'Unknown'}
              </div>
            </div>
          </div>
        </section>

        <section className="contact-detail-page__section">
          <div className="contact-detail-page__actions">
            <button className="contact-detail-page__action-button" onClick={() => setShowComposeModal(true)}>
              <Mail size={18} /> Email
            </button>
            {contact.phones.length > 0 && (
              <ZenaCallTooltip phones={contact.phones} contactName={contact.name}>
                <button className="contact-detail-page__action-button">
                  <Phone size={18} /> Call
                </button>
              </ZenaCallTooltip>
            )}
            <div className="add-note-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                className={`contact-detail-page__action-button ${showNoteForm ? 'active' : ''}`}
                onClick={() => setShowNoteForm(!showNoteForm)}
              >
                <Plus size={18} /> Add note
              </button>
              <LogIntelTooltip className="log-intel-tooltip-absolute" />
            </div>
          </div>

          <AddNoteModal
            isOpen={showNoteForm}
            onClose={() => setShowNoteForm(false)}
            onSave={handleSaveNote}
            entityId={id}
            entityType="contact"
            entityName={contact?.name}
          />
        </section>

        {threads.length > 0 && (
          <section className="contact-detail-page__section">
            <h2 className="contact-detail-page__section-title">
              <Mail size={18} /> Email Correspondence
            </h2>
            <div className="contact-detail-page__threads-list">
              {threads.map(thread => (
                <div
                  key={thread.id}
                  className="contact-detail-page__thread-item"
                  onClick={() => navigate(`/threads/${thread.id}`)}
                  style={{ cursor: 'pointer' }}
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

        {deals.length > 0 && (
          <section className="contact-detail-page__section">
            <h2 className="contact-detail-page__section-title">
              <Briefcase size={18} /> Active Deal Channels
            </h2>
            <div className="contact-detail-page__info-grid">
              {deals.map(deal => (
                <div key={deal.id} className="contact-card" onClick={() => navigate(`/deals/${deal.id}`)}>
                  <h3 className="contact-detail-page__info-value">{deal.stage}</h3>
                  <p className="contact-detail-page__timeline-detail">{deal.summary}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="contact-detail-page__section">
          <h2 className="contact-detail-page__section-title">
            <History size={18} /> Chronological Timeline
          </h2>
          <div className="contact-detail-page__timeline">
            {timeline.length > 0 ? timeline.map(event => (
              <div key={event.id} className="contact-detail-page__timeline-event">
                <div className={`contact-detail-page__timeline-marker ${event.metadata?.godmode ? 'godmode' : ''}`}>
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
                <div className="contact-detail-page__timeline-content">
                  <div className="contact-detail-page__timeline-header">
                    <span className="contact-detail-page__timeline-type">{event.type.replace(/_/g, ' ').toUpperCase()}</span>
                    <div className="contact-detail-page__timeline-actions">
                      <span className="contact-detail-page__timeline-date">{formatDate(event.timestamp)}</span>
                      {editingEventId !== event.id && (
                        <>
                          <button
                            className="contact-detail-page__timeline-action-btn edit"
                            onClick={(e) => startEditingEvent(event, e)}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="contact-detail-page__timeline-action-btn delete"
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
                    <div className="contact-detail-page__timeline-edit-form">
                      <input
                        type="text"
                        className="contact-detail-page__timeline-edit-summary"
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        placeholder="Summary"
                      />
                      <textarea
                        className="contact-detail-page__timeline-edit-content"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Content"
                        rows={3}
                      />
                      <div className="contact-detail-page__timeline-edit-actions">
                        <button className="contact-detail-page__note-cancel" onClick={cancelEditingEvent}>Cancel</button>
                        <button className="contact-detail-page__note-save" onClick={saveEditedEvent}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h4 className="contact-detail-page__timeline-summary">
                        {event.summary}
                        {event.metadata?.godmode && (
                          <span className={`godmode-badge ${event.metadata.mode}`}>
                            {event.metadata.mode === 'full_god' ? '⚡ God' : '✨ Demi'}
                          </span>
                        )}
                      </h4>
                      {event.content && <p className="contact-detail-page__timeline-detail">{event.content}</p>}

                      {/* Rich Godmode Details */}
                      {event.metadata?.godmode && (
                        <div className="timeline-godmode-details">
                          {event.metadata.draftSubject && (
                            <div className="detail-row">
                              <span className="detail-label">Subject:</span>
                              <span className="detail-value">{event.metadata.draftSubject}</span>
                            </div>
                          )}
                          {event.metadata.draftBody && (
                            <div className="detail-body-preview">
                              {event.metadata.draftBody}
                            </div>
                          )}
                          <div className="detail-meta">
                            <span className={`status-tag ${event.metadata.success ? 'success' : 'failed'}`}>
                              {event.metadata.success ? 'Executed Successfully' : 'Execution Failed'}
                            </span>
                            {event.metadata.autoExecuted && (
                              <span className="auto-tag">Autonomous Action</span>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )) : (
              <p className="contact-detail-page__info-label">No chronological data found.</p>
            )}
          </div>
        </section>
      </div>

      {showComposeModal && contact && (
        <ZenaBatchComposeModal
          selectedContacts={[contact]}
          onClose={() => setShowComposeModal(false)}
        />
      )}

      {isEditingIntel && (
        <NewContactModal
          isOpen={isEditingIntel}
          onClose={() => setIsEditingIntel(false)}
          onSave={handleUpdateIntelligence}
          initialData={contact}
          title="Update Intelligence"
        />
      )}
    </div>
  );
};
