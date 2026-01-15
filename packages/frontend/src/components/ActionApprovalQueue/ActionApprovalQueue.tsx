/**
 * ActionApprovalQueue Component (Command Center)
 * 
 * Enhanced split-view interface for approving autonomous actions.
 * Left Panel: Queue of pending actions
 * Right Panel: Detailed preview and context
 */

import React, { useState, useEffect } from 'react';
import {
    X, Check, Trash2, Mail, Calendar, Tag, Archive,
    CheckCheck, Home, TrendingUp, TrendingDown, Presentation,
    FileText, MessageSquare, Phone, Copy, Quote, Eye,
    Loader2, ChevronRight, Clock, User, Paperclip, Database
} from 'lucide-react';
import ReactDOM from 'react-dom';
import { api } from '../../utils/apiClient';
import { AttachmentChip } from '../AttachmentChip/AttachmentChip';
import { useGodmode, AutonomousAction } from '../../hooks/useGodmode';
import './ActionApprovalQueue.css';


interface ActionApprovalQueueProps {
    isOpen: boolean;
    onClose: () => void;
    onActionTaken?: () => void;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
    send_email: <Mail size={16} />,
    schedule_followup: <Calendar size={16} />,
    update_category: <Tag size={16} />,
    archive_contact: <Archive size={16} />,
    vendor_update: <Presentation size={16} />,
    price_review: <TrendingUp size={16} />,
    price_reduction: <TrendingDown size={16} />,
    buyer_match_intro: <Mail size={16} />,
    generate_weekly_report: <FileText size={16} />,
    schedule_viewing: <Calendar size={16} />,
    crm_sync: <Database size={16} />,
};

const getPriorityColor = (priority: number): string => {
    if (priority >= 8) return '#ef4444';
    if (priority >= 5) return '#f59e0b';
    return '#10b981';
};

export const ActionApprovalQueue: React.FC<ActionApprovalQueueProps> = ({
    isOpen,
    onClose,
    onActionTaken
}) => {
    const {
        pendingActions: actions,
        isLoading,
        approveAction,
        dismissAction,
        settings: godmodeSettings
    } = useGodmode();

    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

    // Edit State
    const [editedBody, setEditedBody] = useState<string>('');
    const [editedSubject, setEditedSubject] = useState<string>('');
    const [editedTo, setEditedTo] = useState<string>('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const selectedAction = actions.find((a: AutonomousAction) => a.id === selectedActionId); // Cast to AutonomousAction

    // Initial selected action
    useEffect(() => {
        if (actions.length > 0 && !selectedActionId) {
            setSelectedActionId(actions[0].id);
        }
    }, [actions.length, selectedActionId]);

    // Sync edited body when selectedAction changes
    useEffect(() => {
        console.log('[ActionApprovalQueue] selectedAction changed', selectedAction?.id);
        if (selectedAction) {
            setEditedBody(selectedAction.draftBody || '');
            setEditedSubject(selectedAction.draftSubject || '');
            // Parse recipient safely
            const recipientEmail = selectedAction.contact?.emails?.[0] || 'email@example.com';
            const recipientName = selectedAction.contact?.name || 'Recipient';
            setEditedTo(`${recipientName} <${recipientEmail}>`);
            setAttachments([]); // Reset attachments
        } else {
            setEditedBody('');
            setEditedSubject('');
            setEditedTo('');
            setAttachments([]);
        }
    }, [selectedAction?.id]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        console.log('[ActionApprovalQueue] handleFileSelect', selectedFiles);

        if (selectedFiles && selectedFiles.length > 0) {
            const filesArray = Array.from(selectedFiles);
            setAttachments(prev => {
                const updated = [...prev, ...filesArray];
                console.log('[ActionApprovalQueue] New attachments state:', updated);
                return updated;
            });
        }

        // Reset input to allow selecting the same file again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handlePreview = (file: File) => {
        const url = URL.createObjectURL(file);
        window.open(url, '_blank');
        // Note: We should revoke this URL eventually, but for a simple open-in-new-tab, browser handles garbage collection mostly fine on navigation.
        // For a robust app, we should track these object URLs.
    };

    const handleRegenerate = async (type: 'quick' | 'detailed') => {
        if (!selectedAction) return;

        // Ask user for feedback to guide the regeneration
        const feedback = window.prompt(
            type === 'detailed'
                ? "What specific improvements or details should I add?"
                : "How should I rewrite this? (e.g. 'make it shorter', 'be more aggressive')",
            type === 'detailed' ? "Add more professional context and market insights." : "Make it more concise and punchy."
        );

        if (feedback === null) return; // User cancelled

        setIsRegenerating(true);
        console.log(`Regenerating ${type} draft for action ${selectedAction.id} with feedback: ${feedback}`);

        try {
            const response = await api.post('/api/ask/rewrite-draft', {
                originalContent: editedBody,
                feedback: feedback
            });

            if (response.data.rewrittenContent) {
                setEditedBody(response.data.rewrittenContent);
                // Also update subject if it's the first time
                if (type === 'detailed' && feedback.toLowerCase().includes('subject')) {
                    // LLM might have included a subject, or we can just stick to body
                }
            }
        } catch (err) {
            console.error('Regeneration failed', err);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleApproveWithEdits = async () => {
        if (!selectedAction) return;
        console.log('[ActionApprovalQueue] handleApproveWithEdits clicked', selectedAction.id);
        setProcessingIds(prev => new Set(prev).add(selectedAction.id));
        try {
            const success = await approveAction(selectedAction.id, {
                finalBody: editedBody,
                finalSubject: editedSubject
            });

            if (success) {
                if (selectedActionId === selectedAction.id) {
                    const remaining = actions.filter(a => a.id !== selectedAction.id);
                    setSelectedActionId(remaining.length > 0 ? remaining[0].id : null);
                }
                onActionTaken?.();
            }
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(selectedAction.id);
                return next;
            });
        }
    };

    // Global fetch logic removed - now handled by GodmodeProvider

    const handleDismiss = async (actionId: string) => {
        console.log('[ActionApprovalQueue] handleDismiss clicked', actionId);
        setProcessingIds(prev => new Set(prev).add(actionId));
        try {
            const success = await dismissAction(actionId);
            if (success) {
                if (selectedActionId === actionId) {
                    const remaining = actions.filter(a => a.id !== actionId);
                    setSelectedActionId(remaining.length > 0 ? remaining[0].id : null);
                }
                onActionTaken?.();
            }
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(actionId);
                return next;
            });
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast here
    };

    if (!isOpen) return null;

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <>
            <div className="action-queue__backdrop" onClick={onClose} />
            <div className="action-queue">
                {/* Header */}
                <div className="action-queue__header">
                    <div className="action-queue__title">
                        <span className="action-queue__title-icon">⚡</span>
                        <h2>Command Centre</h2>
                        {actions.length > 0 && (
                            <span className="action-queue__count">{actions.length}</span>
                        )}
                    </div>
                    <button className="action-queue__close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="action-queue__content">
                    {/* LEFT PANEL: QUEUE LIST */}
                    <div className="action-queue__left-panel">
                        {isLoading && actions.length === 0 ? (
                            <div className="action-queue__loading">
                                <Loader2 className="animate-spin" size={24} />
                                <span>Loading actions...</span>
                            </div>
                        ) : actions.length === 0 ? (
                            <div className="action-queue__empty">
                                <CheckCheck size={40} />
                                <h3>All caught up!</h3>
                                <p>No pending actions to review.</p>
                            </div>
                        ) : (
                            <div className="action-queue__list">
                                {actions.map((action: AutonomousAction) => ( // Cast to AutonomousAction
                                    <div
                                        key={action.id}
                                        className={`action-queue__item ${selectedActionId === action.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedActionId(action.id)}
                                    >
                                        <div className="action-queue__item-header">
                                            <div
                                                className="action-queue__item-icon"
                                                style={{ '--priority-color': getPriorityColor(action.priority) } as React.CSSProperties}
                                            >
                                                {ACTION_ICONS[action.actionType] || <Mail size={16} />}
                                            </div>
                                            <div className="action-queue__item-info">
                                                <div className="action-queue__item-title">{action.title}</div>
                                                <div className="action-queue__item-meta">
                                                    <span className="action-queue__item-time">
                                                        <Clock size={12} />
                                                        {new Date(action.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT PANEL: DETAIL VIEW */}
                    <div className="action-queue__right-panel">
                        {selectedAction ? (
                            <>
                                <div className="detail-view__content">
                                    {/* Reasoning / Context Summary */}
                                    {(selectedAction.contextSummary || selectedAction.reasoning) && (
                                        <div className="detail-view__reasoning">
                                            <h4><TrendingUp size={12} /> Why Zena Recommended This</h4>
                                            <p>{selectedAction.contextSummary || selectedAction.reasoning}</p>
                                        </div>
                                    )}

                                    {/* CRM SYNC SPECIALIZED VIEW */}
                                    {selectedAction.actionType === 'crm_sync' && (
                                        <div className="preview-card crm-sync-preview" style={{ borderLeft: '3px solid #00D4FF', background: 'rgba(0, 212, 255, 0.03)' }}>
                                            <div className="preview-card__header" style={{ background: 'rgba(0, 212, 255, 0.1)', borderColor: 'rgba(0, 212, 255, 0.2)' }}>
                                                <span style={{ color: '#00D4FF', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Database size={14} /> CRM DATA CONGRUENCE
                                                </span>
                                            </div>
                                            <div className="preview-card__body">
                                                <div className="sync-stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                                    <div className="sync-stat-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#00D4FF' }}>{selectedAction.payload?.contacts || 0}</div>
                                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contacts</div>
                                                    </div>
                                                    <div className="sync-stat-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#A78BFA' }}>{selectedAction.payload?.properties || 0}</div>
                                                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Properties</div>
                                                    </div>
                                                </div>

                                                <div className="sync-samples">
                                                    <h5 style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginBottom: '10px' }}>UPDATED RECORDS:</h5>
                                                    <div className="sync-sample-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {selectedAction.payload?.samples?.map((s: any, i: number) => (
                                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}>
                                                                <span style={{ color: 'white' }}>{s.name}</span>
                                                                <span style={{ fontSize: '11px', color: s.type === 'contact' ? '#00D4FF' : '#A78BFA', fontWeight: 600 }}>{s.type.toUpperCase()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Script / Talking Points - High Fidelity Copy Card */}
                                    {selectedAction.script && (
                                        <div className="preview-card" style={{ borderColor: '#8B5CF6', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.1)' }}>
                                            <div className="preview-card__header" style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                                                <span style={{ color: '#DDD6FE', fontWeight: 600 }}>CALL SCRIPT</span>
                                                <button
                                                    onClick={() => handleCopy(selectedAction.script || '')}
                                                    className="action-link-btn"
                                                    style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <Copy size={12} /> Copy
                                                </button>
                                            </div>
                                            <div className="preview-card__body email-preview">
                                                <div className="email-preview__body" style={{ fontSize: '15px', lineHeight: '1.7', color: '#eef2ff', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                                                    {selectedAction.script}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SMS Preview */}
                                    {selectedAction.payload?.smsDraft && (
                                        <div className="preview-card" style={{ borderLeft: '2px solid #FCD34D' }}>
                                            <div className="preview-card__header">
                                                <span>SMS / TEXT DRAFT</span>
                                                <MessageSquare size={14} />
                                            </div>
                                            <div className="preview-card__body">
                                                <div style={{ background: '#333', padding: '12px', borderRadius: '8px', color: '#fff', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>
                                                    {selectedAction.payload.smsDraft}
                                                </div>
                                                <button
                                                    className="btn-secondary"
                                                    style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '8px' }}
                                                    onClick={() => handleCopy(selectedAction.payload.smsDraft)}
                                                >
                                                    <Copy size={12} /> Copy to Clipboard
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ASSET PREVIEW AREA (Command Center 3.0) */}
                                    <div className="preview-card" style={{ border: 'none', background: 'transparent' }}>

                                        {/* 1. PDF REPORT PREVIEW (For Vendor Reports & Price Reductions) */}
                                        {(selectedAction.actionType === 'generate_weekly_report' || selectedAction.actionType === 'price_reduction') && (
                                            <div className="pdf-card" onClick={() => window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank')}>
                                                <div className="pdf-icon">PDF</div>
                                                <div className="pdf-info">
                                                    <h4>{selectedAction.actionType === 'price_reduction'
                                                        ? 'Comparable Sales Analysis (Evidence)'
                                                        : selectedAction.title.replace('Overdue Vendor Report:', 'Weekly Campaign Report')}</h4>
                                                    <p>Generated {new Date().toLocaleDateString()}</p>
                                                </div>
                                                <div style={{ marginLeft: 'auto' }}>
                                                    <button className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                                                        <Eye size={14} /> Preview PDF
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* 2. SMS PREVIEW (For Buyer Matches) */}
                                        {selectedAction.actionType === 'buyer_match_intro' && selectedAction.payload?.smsDraft && (
                                            <div className="sms-preview-container">
                                                <div className="sms-meta">Message Preview</div>
                                                <div className="sms-bubble">
                                                    {selectedAction.payload.smsDraft}
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', textAlign: 'right' }}>
                                                    Sent from Zena
                                                </div>
                                            </div>
                                        )}

                                        {/* 3. EMAIL EDITOR (Standard for all types) */}
                                        <div className="preview-card" style={{ marginTop: '0' }}>
                                            <div className="preview-card__header">
                                                <span>EMAIL DRAFT</span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleFileSelect}
                                                        multiple
                                                        style={{ display: 'none' }}
                                                    />
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="action-link-btn"
                                                        style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <Paperclip size={10} />
                                                        Attach
                                                    </button>
                                                    <button
                                                        onClick={() => handleRegenerate('quick')}
                                                        className="action-link-btn"
                                                        disabled={isRegenerating}
                                                        style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <Loader2 size={10} className={isRegenerating ? "animate-spin" : ""} style={{ display: isRegenerating ? 'block' : 'none' }} />
                                                        Regenerate
                                                    </button>
                                                    <button
                                                        onClick={() => handleRegenerate('detailed')}
                                                        className="action-link-btn"
                                                        disabled={isRegenerating}
                                                        style={{ fontSize: '11px', background: '#8B5CF6', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <FileText size={10} />
                                                        Draft Detailed
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="preview-card__body email-preview">
                                                <div style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                                        <span style={{ width: '60px', color: '#666', fontSize: '13px', fontWeight: 500 }}>To:</span>
                                                        <input
                                                            type="text"
                                                            value={editedTo}
                                                            onChange={(e) => setEditedTo(e.target.value)}
                                                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '13px', flex: 1, outline: 'none' }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                        <span style={{ width: '60px', color: '#666', fontSize: '13px', fontWeight: 500 }}>Subject:</span>
                                                        <input
                                                            type="text"
                                                            value={editedSubject}
                                                            onChange={(e) => setEditedSubject(e.target.value)}
                                                            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '13px', flex: 1, outline: 'none', fontWeight: 600 }}
                                                        />
                                                    </div>
                                                </div>
                                                {attachments.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                                        {attachments.map((file, i) => (
                                                            <AttachmentChip
                                                                key={i}
                                                                file={file}
                                                                onRemove={() => removeAttachment(i)}
                                                                onPreview={() => handlePreview(file)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                <textarea
                                                    className="email-editor-textarea"
                                                    value={editedBody}
                                                    onChange={(e) => setEditedBody(e.target.value)}
                                                    placeholder={isRegenerating ? "Zena is writing..." : "No draft generated yet. Click 'Draft Detailed' to generate one."}
                                                    style={{
                                                        width: '100%',
                                                        minHeight: '200px',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#d1d5db',
                                                        fontSize: '14px',
                                                        lineHeight: '1.6',
                                                        resize: 'none',
                                                        fontFamily: 'inherit',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Legacy JSON Preview Removed in favor of High-Fidelity Cards */}
                                </div>

                                {/* Footer Actions */}
                                <div className="detail-view__footer">
                                    <button
                                        className="btn-large btn-danger"
                                        onClick={() => handleDismiss(selectedAction.id)}
                                        disabled={processingIds.has(selectedAction.id)}
                                    >
                                        <Trash2 size={16} />
                                        Dismiss
                                    </button>
                                    <button
                                        className="btn-large btn-primary"
                                        onClick={handleApproveWithEdits}
                                        disabled={processingIds.has(selectedAction.id)}
                                    >
                                        {selectedAction.actionType === 'crm_sync' ? (
                                            processingIds.has(selectedAction.id) ? (
                                                <Loader2 className="animate-spin" size={16} />
                                            ) : (
                                                <Database size={16} />
                                            )
                                        ) : (
                                            processingIds.has(selectedAction.id) ? (
                                                <Loader2 className="animate-spin" size={16} />
                                            ) : (
                                                <Check size={16} />
                                            )
                                        )}
                                        {selectedAction.actionType === 'crm_sync' ? 'Synchronize All Now' : 'Approve & Send'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="detail-view__empty">
                                <span style={{ opacity: 0.5 }}>Select an action to review details</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

export default ActionApprovalQueue;
