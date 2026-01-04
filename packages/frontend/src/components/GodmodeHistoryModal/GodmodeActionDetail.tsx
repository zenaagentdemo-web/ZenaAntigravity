import React from 'react';
import { X, CheckCircle2, XCircle, Slash, Mail, Calendar, User, Home, Info, Link as LinkIcon, ChevronLeft } from 'lucide-react';
import './GodmodeHistoryModal.css';

interface ActionDetailProps {
    action: {
        id: string;
        title: string;
        description: string;
        reasoning?: string;
        intelligenceSources?: any[];
        actionType: string;
        status: 'completed' | 'failed' | 'dismissed';
        executedAt: string;
        draftSubject?: string;
        draftBody?: string;
        contact?: { name: string };
        property?: { address: string };
        mode: string;
    };
    onBack: () => void;
}

export const GodmodeActionDetail: React.FC<ActionDetailProps> = ({ action, onBack }) => {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="status-icon status-icon--completed" size={20} />;
            case 'failed': return <XCircle className="status-icon status-icon--failed" size={20} />;
            case 'dismissed': return <Slash className="status-icon status-icon--dismissed" size={20} />;
            default: return null;
        }
    };

    return (
        <div className="action-detail">
            <div className="action-detail-header">
                <button className="back-btn" onClick={onBack}>
                    <ChevronLeft size={20} />
                    <span>Back to Activity</span>
                </button>
                <div className="detail-status">
                    {getStatusIcon(action.status)}
                    <span className={`status-label status-label--${action.status}`}>
                        {action.status.toUpperCase()}
                    </span>
                </div>
            </div>

            <div className="action-detail-content">
                <div className="detail-section detail-section--main">
                    <div className="mode-badge" data-mode={action.mode}>
                        {action.mode === 'full_god' ? 'FULL GOD MODE' : 'DEMI-GOD (APPROVED)'}
                    </div>
                    <h2 className="detail-title">{action.title}</h2>
                    <p className="detail-timestamp">
                        {new Date(action.executedAt || Date.now()).toLocaleString([], {
                            weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                    </p>
                </div>

                {action.reasoning && (
                    <div className="detail-section detail-section--why">
                        <div className="section-label">
                            <Info size={14} />
                            <span>THE WHY (RATIONALE)</span>
                        </div>
                        <div className="why-content">
                            {action.reasoning}
                        </div>
                    </div>
                )}

                {(action.draftSubject || action.draftBody) && (
                    <div className="detail-section detail-section--draft">
                        <div className="section-label">
                            <Mail size={14} />
                            <span>EXECUTED CONTENT</span>
                        </div>
                        <div className="draft-box">
                            {action.draftSubject && (
                                <div className="draft-subject"><strong>Subject:</strong> {action.draftSubject}</div>
                            )}
                            <div className="draft-body">{action.draftBody}</div>
                        </div>
                    </div>
                )}

                {action.intelligenceSources && action.intelligenceSources.length > 0 && (
                    <div className="detail-section detail-section--evidence">
                        <div className="section-label">
                            <LinkIcon size={14} />
                            <span>VERIFIABLE EVIDENCE</span>
                        </div>
                        <div className="evidence-list">
                            {action.intelligenceSources.map((source: any, idx: number) => (
                                <div key={idx} className="evidence-chip">
                                    <div className="source-icon">
                                        {source.type === 'prediction' ? <Info size={12} /> : <Home size={12} />}
                                    </div>
                                    <div className="source-info">
                                        <span className="source-summary">{source.summary}</span>
                                        <span className="source-type">{source.type.toUpperCase()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="detail-section detail-section--context">
                    <div className="section-label">CONTEXT</div>
                    <div className="context-links">
                        {action.contact && (
                            <div className="context-link">
                                <User size={14} />
                                <span>{action.contact.name}</span>
                            </div>
                        )}
                        {action.property && (
                            <div className="context-link">
                                <Home size={14} />
                                <span>{action.property.address}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
