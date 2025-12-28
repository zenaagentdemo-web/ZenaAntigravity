import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Shield
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import { realTimeDataService } from '../../services/realTimeDataService';
import { AmbientBackground } from '../../components/AmbientBackground/AmbientBackground';
import { LogIntelTooltip } from '../../components/LogIntelTooltip/LogIntelTooltip';
import { ZenaBatchComposeModal } from '../../components/ZenaBatchComposeModal/ZenaBatchComposeModal';
import { ZenaCallTooltip } from '../../components/ZenaCallTooltip/ZenaCallTooltip';
import { NewContactModal } from '../../components/NewContactModal/NewContactModal';
import {
  calculateEngagementScore,
  generateMockEngagementInput,
  ContactRole,
  DealStage
} from '../../utils/ContactEngagementScorer';
import './ContactDetailPage.css';

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

interface Contact {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  role: 'buyer' | 'vendor' | 'market' | 'tradesperson' | 'agent' | 'other';
  deals: Deal[];
  relationshipNotes: RelationshipNote[];
  intelligenceSnippet?: string;
  lastActivityDetail?: string;
  engagementScore?: number;
  engagementVelocity?: number;
  createdAt: string;
  updatedAt: string;
  zenaIntelligence?: {
    propertyType?: string;
    minBudget?: number;
    maxBudget?: number;
    location?: string;
    bedrooms?: number;
    bathrooms?: number;
    timeline?: string;
  };
}

const ROLE_THEME: Record<string, { label: string, color: string, bg: string, border: string }> = {
  buyer: { label: 'Buyer', color: '#00D4FF', bg: 'rgba(0, 212, 255, 0.1)', border: 'rgba(0, 212, 255, 0.3)' },
  vendor: { label: 'Vendor', color: '#FF00FF', bg: 'rgba(255, 0, 255, 0.1)', border: 'rgba(255, 0, 255, 0.3)' },
  tradesperson: { label: 'Trades', color: '#FF6B35', bg: 'rgba(255, 107, 53, 0.1)', border: 'rgba(255, 107, 53, 0.3)' },
  agent: { label: 'Agent', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)' },
  market: { label: 'Market', color: '#00FF88', bg: 'rgba(0, 255, 136, 0.1)', border: 'rgba(0, 255, 136, 0.3)' },
  other: { label: 'Contact', color: '#FFFFFF', bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)' },
};

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
};

const ENRICH_CONTACT = (contact: Contact): Contact => {
  const snippets = [
    "High probability seller (6-9 months). Watching local auction clearance rates.",
    "Active buyer. Attending 3+ open homes per weekend in Grey Lynn area.",
    "Previous client. Portfolio investor looking for low-maintenance yields.",
    "First-home buyer. Pre-approval valid for 60 days. High urgency.",
    "Downsizing vendor. Exploring smaller apartments in Mission Bay.",
    "Trades lead. Reliable for urgent pre-settlement repairs."
  ];

  const seed = hashString(contact.id);
  const snippetIndex = (seed >> 4) % snippets.length;

  const dealStages: (DealStage | undefined)[] = [
    undefined, 'lead', 'qualified', 'viewing', 'offer', 'conditional', 'sold', 'nurture'
  ];
  const seedIndex = contact.name.charCodeAt(0) % dealStages.length;
  const mockDealStage = dealStages[seedIndex];

  const engagementInput = generateMockEngagementInput(
    contact.name,
    contact.emails,
    contact.phones,
    contact.role as ContactRole,
    mockDealStage
  );
  const scoringData = calculateEngagementScore(engagementInput);

  return {
    ...contact,
    engagementScore: contact.engagementScore ?? scoringData.intelScore,
    engagementVelocity: contact.engagementVelocity ?? scoringData.momentum,
    intelligenceSnippet: contact.intelligenceSnippet ?? snippets[snippetIndex],
    lastActivityDetail: contact.lastActivityDetail ?? (contact.role === 'vendor' ? 'Requested appraisal for property' : 'Inquired about listing')
  };
};

export const ContactDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
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

  const loadContactData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load contact details
      const response = await api.get<{ contact: Contact, threads: any }>(`/api/contacts/${id}`);
      const contactData = response.data.contact;

      const enrichedContact = ENRICH_CONTACT(contactData);

      setContact(enrichedContact);
      setDeals(contactData.deals || []);
      setThreads(response.data.threads || []);

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

  const handleAddNote = async () => {
    if (!noteContent.trim() || !id) return;

    try {
      setAddingNote(true);
      await api.post(`/api/contacts/${id}/notes`, {
        content: noteContent,
        source: 'manual',
      });
      await loadContactData();
      setNoteContent('');
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
          <button className="contact-detail-page__back" onClick={() => navigate('/contacts')}>
            <ArrowLeft size={18} /> Re-entry to Contacts
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
            <button className="contact-detail-page__back" onClick={() => navigate('/contacts')}>
              <ArrowLeft size={18} /> Contacts
            </button>
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

        <section className="contact-detail-page__section">
          <div className="intelligence-section__header">
            <h2 className="contact-detail-page__section-title">
              <Sparkles size={18} /> AI Insight & Intelligence
            </h2>
            <button className="edit-intel-btn" onClick={() => setIsEditingIntel(true)}>
              <Pencil size={14} /> Update Intelligence
            </button>
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
            <button
              className={`contact-detail-page__action-button ${showNoteForm ? 'active' : ''}`}
              onClick={() => setShowNoteForm(!showNoteForm)}
            >
              <Plus size={18} /> Log Intel
              <LogIntelTooltip />
            </button>
          </div>

          {showNoteForm && (
            <div className="contact-detail-page__note-form">
              <div className="contact-detail-page__note-input-row">
                <textarea
                  className="contact-detail-page__note-textarea"
                  placeholder="Record relationship intel... What did you learn about this contact?"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                />
                <button
                  className={`contact-detail-page__voice-btn ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  title={isRecording ? 'Stop recording' : 'Record voice note'}
                >
                  {isRecording ? (
                    <>
                      <Square size={20} />
                      <span className="recording-time">{formatRecordingTime(recordingTime)}</span>
                    </>
                  ) : (
                    <img
                      src="/assets/icons/voice-note-final.png"
                      alt="Voice note"
                      className="voice-icon-img"
                    />
                  )}
                </button>
              </div>
              <div className="contact-detail-page__note-actions">
                <button className="contact-detail-page__note-cancel" onClick={() => { setShowNoteForm(false); setNoteContent(''); }}>
                  Cancel
                </button>
                <button className="contact-detail-page__note-save" onClick={handleAddNote} disabled={!noteContent.trim() || addingNote}>
                  {addingNote ? 'Saving...' : 'Save Intel'}
                </button>
              </div>
            </div>
          )}
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
                <div className="contact-detail-page__timeline-marker">
                  {event.type === 'email' && <Mail size={16} />}
                  {event.type === 'call' && <Phone size={16} />}
                  {event.type === 'meeting' && <Calendar size={16} />}
                  {event.type === 'task' && <CheckCircle2 size={16} />}
                  {event.type === 'note' && <FileText size={16} />}
                  {event.type === 'voice_note' && <Mic size={16} />}
                </div>
                <div className="contact-detail-page__timeline-content">
                  <div className="contact-detail-page__timeline-header">
                    <span className="contact-detail-page__timeline-type">{event.type}</span>
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
                      <h4 className="contact-detail-page__timeline-summary">{event.summary}</h4>
                      {event.content && <p className="contact-detail-page__timeline-detail">{event.content}</p>}
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
