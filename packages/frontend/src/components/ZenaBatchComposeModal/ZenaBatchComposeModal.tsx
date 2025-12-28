import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Shield, RefreshCw, ArrowRight, Send, Users, TrendingUp, Target, FileText } from 'lucide-react';
import './ZenaBatchComposeModal.css';
import { api } from '../../utils/apiClient';

// Minimal contact interface needed for the modal
export interface ContactForCompose {
    id: string;
    name: string;
    emails: string[];
    role: string;
    engagementScore?: number;
    lastActivityDetail?: string;
    intelligenceSnippet?: string;
    zenaCategory?: string;
}

interface ZenaBatchComposeModalProps {
    selectedContacts: ContactForCompose[];
    onClose: () => void;
    initialSubject?: string;
    initialMessage?: string;
}

// Helper to aggregate role counts
const aggregateRoles = (contacts: ContactForCompose[]): string => {
    const roleCounts: Record<string, number> = {};
    contacts.forEach(c => {
        const role = c.role || 'contact';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
    });
    return Object.entries(roleCounts)
        .map(([role, count]) => `${count} ${role}${count > 1 ? 's' : ''}`)
        .join(', ');
};

// Helper to calculate average engagement
const calculateAvgEngagement = (contacts: ContactForCompose[]): number => {
    const scores = contacts.filter(c => c.engagementScore != null).map(c => c.engagementScore!);
    if (scores.length === 0) return 50; // default
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
};

// Helper to extract common themes from intelligence snippets
const extractCommonThemes = (contacts: ContactForCompose[]): string[] => {
    const themes: string[] = [];
    const snippets = contacts.map(c => c.intelligenceSnippet || c.lastActivityDetail || '').filter(Boolean);

    // Simple keyword extraction - look for common real estate themes
    const keywords = [
        'downsizing', 'upsizing', 'investment', 'first home', 'quick sale',
        'property', 'market', 'Mission Bay', 'Auckland', 'appraisal',
        'active buyer', 'seller', 'vendor', 'investor', 'development',
        'off-market', 'rental', 'mortgage', 'viewing', 'interested'
    ];

    const combinedText = snippets.join(' ').toLowerCase();
    keywords.forEach(keyword => {
        if (combinedText.includes(keyword.toLowerCase()) && themes.length < 3) {
            themes.push(keyword);
        }
    });

    return themes.length > 0 ? themes : ['General outreach'];
};

export const ZenaBatchComposeModal: React.FC<ZenaBatchComposeModalProps> = ({
    selectedContacts,
    onClose,
    initialSubject,
    initialMessage
}) => {
    const [subject, setSubject] = useState(initialSubject || '');
    const [message, setMessage] = useState(initialMessage || '');
    const [previousMessage, setPreviousMessage] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [draftType, setDraftType] = useState<'quick' | 'detailed'>('quick');

    const isGroupEmail = selectedContacts.length > 1;
    const primaryContact = selectedContacts[0];

    // Single contact context (for 1 recipient)
    const singleContactContext = primaryContact ? {
        name: primaryContact.name.split(' ')[0],
        role: primaryContact.role,
        intel: primaryContact.engagementScore || 50,
        activity: primaryContact.lastActivityDetail || 'recent market activity',
        snippet: primaryContact.intelligenceSnippet || ''
    } : null;

    // Group context (for multiple recipients)
    const groupContext = useMemo(() => {
        if (!isGroupEmail) return null;
        return {
            roleMix: aggregateRoles(selectedContacts),
            avgEngagement: calculateAvgEngagement(selectedContacts),
            themes: extractCommonThemes(selectedContacts),
            names: selectedContacts.map(c => c.name.split(' ')[0])
        };
    }, [selectedContacts, isGroupEmail]);

    // Generate AI-powered draft via Zena's brain (backend API)
    const generateAIDraft = async (type: 'quick' | 'detailed' = 'quick') => {
        console.log('[ZenaBatchComposeModal] generateAIDraft called via Zena API', { type, isGroupEmail });
        setIsGenerating(true);
        setPreviousMessage(message);
        setDraftType(type);

        try {
            // Call Zena's AI brain endpoint
            const response = await api.post('/api/ask/compose-email', {
                contacts: selectedContacts.map(c => ({
                    id: c.id,
                    name: c.name,
                    role: c.role,
                    emails: c.emails,
                    engagementScore: c.engagementScore,
                    intelligenceSnippet: c.intelligenceSnippet,
                    lastActivityDetail: c.lastActivityDetail,
                    zenaCategory: c.zenaCategory
                })),
                draftType: type
            });

            console.log('[ZenaBatchComposeModal] API response:', response.data);

            if (response.data?.body) {
                setMessage(response.data.body);
                if (response.data.subject && !subject) {
                    setSubject(response.data.subject);
                }
            } else {
                // Fallback if API returns unexpected format
                console.warn('[ZenaBatchComposeModal] Unexpected API response format, using fallback');
                setMessage(getFallbackDraft(type));
            }
        } catch (error) {
            console.error('[ZenaBatchComposeModal] API error, using fallback:', error);
            // Use fallback draft on error
            setMessage(getFallbackDraft(type));
        } finally {
            setIsGenerating(false);
        }
    };

    // Fallback draft if API fails
    const getFallbackDraft = (type: 'quick' | 'detailed'): string => {
        const firstName = primaryContact?.name.split(' ')[0] || 'there';
        const greeting = isGroupEmail ? 'Hi everyone' : `Hi ${firstName}`;

        if (type === 'detailed') {
            return `${greeting},

I hope this message finds you well! I wanted to reach out with some valuable market insights.

📊 **Current Market Overview:**

The Auckland property market is showing interesting dynamics right now:
• Buyer activity is increasing as confidence returns
• Quality stock remains limited, supporting pricing
• Interest rate stability is encouraging both buyers and sellers

💡 **What This Means For You:**

Based on our previous conversations, I have some specific recommendations I'd like to discuss with you.

📅 **Next Steps:**

I'd love to schedule a brief catch-up to discuss how these market conditions impact your situation. Would you be available for a quick call this week?

Warm regards`;
        }

        return `${greeting},

I wanted to touch base and see how things are going. I've been keeping an eye on the market and have some updates that might interest you.

Would you be available for a quick chat this week?

Best regards`;
    };

    // Generate detailed draft
    const generateDetailedDraft = () => generateAIDraft('detailed');

    const handleRedo = () => {
        if (previousMessage) {
            setMessage(previousMessage);
            setPreviousMessage('');
        }
    };

    const handleSend = async () => {
        setIsGenerating(true); // Reuse generating state for sending status
        console.log('Sending email to:', selectedContacts.map(c => c.emails[0]).join(', '));

        try {
            await api.post('/api/communications/send', {
                recipients: selectedContacts.map(c => c.emails[0]).filter(Boolean),
                subject,
                body: message
            });
            // Show toast or success UI here? (Assuming parent handles refresh or we just close)
            onClose();
        } catch (error) {
            console.error('Failed to send email:', error);
            alert('Failed to send email. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return createPortal(
        <div className="zena-modal-overlay">
            <div className="batch-compose-modal">
                <header className="zena-modal-header">
                    <div className="modal-title-group">
                        <Sparkles className="zena-sparkle-icon" size={20} />
                        <h2>Compose with Zena AI</h2>
                    </div>
                    <button className="zena-modal-close" onClick={onClose}><X size={20} /></button>
                </header>

                <div className="zena-modal-content">
                    {/* Email Recipients */}
                    <div className="compose-field">
                        <label className="compose-field__label">TO:</label>
                        <div className="compose-field__emails">
                            {selectedContacts.map(c => (
                                <span key={c.id} className="email-pill">
                                    <span className="email-pill__name">{c.name}</span>
                                    <span className="email-pill__address">{c.emails[0]}</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Subject Line */}
                    <div className="compose-field">
                        <label className="compose-field__label">SUBJECT:</label>
                        <input
                            type="text"
                            className="compose-field__input"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter subject..."
                        />
                    </div>

                    {/* Zena AI Context Insight - Group or Single */}
                    {isGroupEmail && groupContext ? (
                        <div className="zena-context-insight zena-context-insight--group">
                            <div className="zena-context-insight__header">
                                <Users size={14} />
                                <span>Group Intelligence</span>
                                <span className="group-count">({selectedContacts.length} contacts)</span>
                            </div>
                            <div className="zena-group-intel__body">
                                <div className="intel-stat">
                                    <Users size={12} />
                                    <span className="intel-stat__label">Mix:</span>
                                    <span className="intel-stat__value">{groupContext.roleMix}</span>
                                </div>
                                <div className="intel-stat">
                                    <TrendingUp size={12} />
                                    <span className="intel-stat__label">Avg. Engagement:</span>
                                    <span className={`intel-badge ${groupContext.avgEngagement > 80 ? 'hot' : groupContext.avgEngagement > 50 ? 'warm' : 'cold'}`}>
                                        {groupContext.avgEngagement}%
                                    </span>
                                </div>
                                <div className="intel-stat">
                                    <Target size={12} />
                                    <span className="intel-stat__label">Common themes:</span>
                                    <span className="intel-stat__themes">{groupContext.themes.join(', ')}</span>
                                </div>
                            </div>
                        </div>
                    ) : singleContactContext && (
                        <div className="zena-context-insight">
                            <div className="zena-context-insight__header">
                                <Shield size={14} />
                                <span>Zena Intelligence</span>
                            </div>
                            <p className="zena-context-insight__text">
                                <strong>{singleContactContext.name}</strong> is a <strong>{singleContactContext.role}</strong> with
                                <span className={`intel-badge ${singleContactContext.intel > 80 ? 'hot' : singleContactContext.intel > 50 ? 'warm' : 'cold'}`}>
                                    {Math.round(singleContactContext.intel)}% engagement
                                </span>.
                                Recent: "{singleContactContext.activity}".
                                {singleContactContext.snippet && <em> — {singleContactContext.snippet}</em>}
                            </p>
                        </div>
                    )}

                    {/* Message Compose Area */}
                    <div className="compose-area">
                        <div className="compose-area__header">
                            <label>Message</label>
                            <div className="compose-area__actions">
                                {!message && (
                                    <>
                                        <button
                                            className="ai-action-btn ai-action-btn--generate"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                console.log('[ZenaBatchComposeModal] AI Draft clicked');
                                                generateAIDraft();
                                            }}
                                            disabled={isGenerating}
                                            type="button"
                                        >
                                            <Sparkles size={14} />
                                            {isGenerating ? 'Drafting...' : 'AI Draft'}
                                        </button>
                                        <button
                                            className="ai-action-btn ai-action-btn--detailed"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                console.log('[ZenaBatchComposeModal] Detailed Draft clicked');
                                                generateDetailedDraft();
                                            }}
                                            disabled={isGenerating}
                                            type="button"
                                        >
                                            <FileText size={14} />
                                            {isGenerating ? 'Drafting...' : 'Draft Detailed Message'}
                                        </button>
                                    </>
                                )}
                                {message && (
                                    <>
                                        <button
                                            className="ai-action-btn ai-action-btn--regenerate"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                console.log('[ZenaBatchComposeModal] Regenerate clicked - draftType:', draftType);
                                                if (draftType === 'detailed') {
                                                    generateDetailedDraft();
                                                } else {
                                                    generateAIDraft();
                                                }
                                            }}
                                            disabled={isGenerating}
                                            type="button"
                                        >
                                            <RefreshCw size={14} className={isGenerating ? 'spinning' : ''} />
                                            {isGenerating ? 'Regenerating...' : 'Regenerate'}
                                        </button>
                                        <button
                                            className="ai-action-btn ai-action-btn--detailed"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                console.log('[ZenaBatchComposeModal] Detailed Draft clicked');
                                                generateDetailedDraft();
                                            }}
                                            disabled={isGenerating}
                                            type="button"
                                        >
                                            <FileText size={14} />
                                            {isGenerating ? 'Drafting...' : 'Detailed'}
                                        </button>
                                        {previousMessage && (
                                            <button
                                                className="ai-action-btn ai-action-btn--redo"
                                                onClick={handleRedo}
                                            >
                                                <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
                                                Undo
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message here, or let Zena draft one based on context..."
                            rows={8}
                        />
                    </div>
                </div>

                <footer className="zena-modal-footer">
                    <button className="zena-secondary-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="zena-primary-btn"
                        onClick={handleSend}
                        disabled={!message.trim() || !selectedContacts.length}
                    >
                        <Send size={16} /> Send to {selectedContacts.length} Recipient{selectedContacts.length > 1 ? 's' : ''}
                    </button>
                </footer>
            </div>
        </div>,
        document.body
    );
};
