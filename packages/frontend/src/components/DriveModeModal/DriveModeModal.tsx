
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { X, Navigation, Phone, Mic, ChevronRight, MapPin, Clock, Mail, Brain, CheckCircle, BellOff, Volume2, Archive, MessageSquare } from 'lucide-react';
import './DriveModeModal.css';
import { api } from '../../utils/apiClient';
import { useNavigate } from 'react-router-dom';

interface DriveTask {
    id: string;
    type: 'call' | 'voice_note' | 'navigate' | 'email_triage' | 'strategy_session' | 'task_triage';
    title: string;
    subtitle?: string;
    context?: string;
    duration?: string;
    phoneNumber?: string;
    address?: string;
    priority?: number;
    actions?: string[];
    data?: any;
}

interface DriveModeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DriveModeModal: React.FC<DriveModeModalProps> = ({ isOpen, onClose }) => {
    // State
    const [queue, setQueue] = useState<DriveTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const navigate = useNavigate();

    // Fetch Queue on Open
    useEffect(() => {
        if (isOpen) {
            loadDriveQueue();
        }
    }, [isOpen]);

    const loadDriveQueue = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/api/drive-mode/queue');
            if (res.data?.success && res.data?.queue) {
                setQueue(res.data.queue);
            }
        } catch (error) {
            console.error('Failed to load drive queue', error);
            // Fallback: System notification state (using voice_note style for now)
            setQueue([
                {
                    id: 'fallback-1',
                    type: 'voice_note',
                    title: 'System Online',
                    subtitle: 'Drive Mode Initialized. Fetching data...',
                    context: 'System',
                    priority: 0
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const currentTask = queue[currentTaskIndex];

    const handleNext = () => {
        setIsSpeaking(false); // Stop speaking if moving next
        window.speechSynthesis.cancel(); // Cancel any TTS
        if (currentTaskIndex < queue.length - 1) {
            setCurrentTaskIndex(prev => prev + 1);
        } else {
            setCurrentTaskIndex(0);
        }
    };

    const handleAction = (actionType: string) => {
        if (!currentTask) return;

        console.log(`Handling action ${actionType} for task ${currentTask.id}`);

        switch (actionType) {
            // Call Actions
            case 'call':
                if (currentTask.phoneNumber) {
                    window.location.href = `tel:${currentTask.phoneNumber}`;
                } else {
                    console.warn('No phone number for call task');
                }
                break;

            // Navigation Actions
            case 'navigate':
                if (currentTask.address) {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentTask.address)}`, '_blank');
                } else {
                    console.warn('No address for navigation task');
                }
                break;

            // Voice Note/Dictation Actions
            case 'dictate':
                setIsSpeaking(!isSpeaking);
                // Mock ending dictation
                if (!isSpeaking) {
                    setTimeout(() => {
                        setIsSpeaking(false);
                        handleNext();
                    }, 3000);
                }
                break;

            // Email Actions
            case 'read':
                if (currentTask.data?.body) {
                    const utterance = new SpeechSynthesisUtterance(currentTask.data.body);
                    window.speechSynthesis.speak(utterance);
                } else {
                    console.warn('No body content to read');
                }
                break;
            case 'archive':
            case 'reply':
            case 'complete': // Generic complete
                // In real app: call API to perform action
                handleNext();
                break;

            // Strategy Actions
            case 'start_session':
                onClose(); // Close modal first
                navigate(`/ask-zena?mode=handsfree&context=strategy&prompt=${encodeURIComponent(`Let's have a strategy session about: ${currentTask.title}`)}`);
                break;

            // Task Actions
            case 'snooze':
                // In real app: call API to snooze
                handleNext();
                break;

            default:
                break;
        }
    };

    if (!isOpen) return null;

    if (isLoading) {
        return (
            <div className="drive-mode-overlay">
                <div className="drive-mode-content">
                    <div className="pulsing-dot" style={{ width: 40, height: 40 }}></div>
                    <div className="queue-counter">Structuring your drive...</div>
                </div>
            </div>
        );
    }

    // Safety check if queue empty
    if (queue.length === 0) {
        return (
            <div className="drive-mode-overlay">
                <div className="drive-mode-header">
                    {/* Header is now just a container for the status or can be empty if status is not needed here */}
                </div>
                <div className="drive-mode-content">
                    <div className="queue-counter">All caught up!</div>
                    <p style={{ color: '#6b7280' }}>No tasks or appointments found for your drive.</p>
                    <button className="end-drive-button-bottom" onClick={onClose} style={{ marginTop: '3rem' }}>
                        <X size={24} />
                        <span>END DRIVE</span>
                    </button>
                </div>
            </div>
        );
    }

    // Helper to render icon
    const renderIcon = (type: string) => {
        switch (type) {
            case 'navigate': return <Navigation size={64} />;
            case 'call': return <Phone size={64} />;
            case 'voice_note': return <Mic size={64} />;
            case 'email_triage': return <Mail size={64} />;
            case 'strategy_session': return <Brain size={64} />;
            case 'task_triage': return <CheckCircle size={64} />;
            default: return <Clock size={64} />;
        }
    };

    return (
        <div className="drive-mode-overlay">
            <div className="drive-mode-header">
                <div className="drive-status">
                    <div className="pulsing-dot"></div>
                    <span>DRIVE MODE ACTIVE</span>
                </div>
            </div>

            <div className="drive-mode-content">
                <div className="queue-counter">
                    Task {currentTaskIndex + 1} of {queue.length}
                </div>

                <div className={`drive-card ${currentTask.type}`}>
                    <div className="card-icon">
                        {renderIcon(currentTask.type)}
                    </div>

                    <div className="card-details">
                        <h2 className="card-title">{currentTask.title}</h2>
                        <p className="card-subtitle">{currentTask.subtitle}</p>

                        <div className="card-meta">
                            {currentTask.context && (
                                <span className="meta-tag">{currentTask.context}</span>
                            )}
                            {currentTask.duration && (
                                <span className="meta-tag"><Clock size={16} /> {currentTask.duration}</span>
                            )}
                        </div>
                    </div>

                    <div className="card-actions-row">
                        {/* Primary Action Button Logic - Only render if actionable data exists */}
                        {(currentTask.type === 'navigate' && currentTask.address) && (
                            <button className="action-button primary" onClick={() => handleAction('navigate')}>START NAV</button>
                        )}
                        {(currentTask.type === 'call' && currentTask.phoneNumber) && (
                            <button className="action-button primary" onClick={() => handleAction('call')}>CALL NOW</button>
                        )}
                        {(currentTask.type === 'voice_note') && (
                            <button className={`action-button primary ${isSpeaking ? 'recording' : ''}`} onClick={() => handleAction('dictate')}>
                                <Mic size={24} /> {isSpeaking ? 'STOP' : 'DICTATE'}
                            </button>
                        )}
                        {/* Deep Drive Mode Actions */}
                        {(currentTask.type === 'email_triage') && (
                            <>
                                {currentTask.data?.body && (
                                    <button className="action-button secondary" onClick={() => handleAction('read')}><Volume2 /> READ</button>
                                )}
                                <button className="action-button primary" onClick={() => handleAction('reply')}><MessageSquare /> REPLY</button>
                                <button className="action-button secondary" onClick={() => handleAction('archive')}><Archive /> DONE</button>
                            </>
                        )}
                        {(currentTask.type === 'strategy_session') && (
                            <button className="action-button primary" onClick={() => handleAction('start_session')}><Brain /> START SESSION</button>
                        )}
                        {(currentTask.type === 'task_triage') && (
                            <>
                                <button className="action-button primary" onClick={() => handleAction('complete')}><CheckCircle /> DONE</button>
                                <button className="action-button secondary" onClick={() => handleAction('snooze')}><BellOff /> SNOOZE</button>
                            </>
                        )}
                    </div>
                </div>

                <button className="next-button" onClick={handleNext}>
                    <span>NEXT ITEM</span>
                    <ChevronRight size={32} />
                </button>

                <button className="end-drive-button-bottom" onClick={onClose}>
                    <X size={24} />
                    <span>END DRIVE</span>
                </button>
            </div>
        </div>
    );
};
