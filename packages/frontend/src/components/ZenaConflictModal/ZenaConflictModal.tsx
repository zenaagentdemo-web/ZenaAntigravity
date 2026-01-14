import React from 'react';
import { createPortal } from 'react-dom';
// @ts-ignore
import { AlertTriangle, Clock, CheckCircle2, ArrowRight, X } from 'lucide-react';
import './ZenaConflictModal.css';

interface ConflictData {
    hasConflict: boolean;
    conflict: {
        id: string;
        title: string;
        startTime: string;
        endTime: string;
    };
    proposal: {
        startTime: string;
        endTime: string;
        reason: string;
    } | null;
}

interface ZenaConflictModalProps {
    isOpen: boolean;
    onClose: () => void;
    conflictData: ConflictData;
    onAcceptProposal: () => void;
    onForceCreate: () => void;
    requestedTime: {
        date: string;
        time: string;
    };
    newEventTitle: string;
}

export const ZenaConflictModal: React.FC<ZenaConflictModalProps> = ({
    isOpen,
    onClose,
    conflictData,
    onAcceptProposal,
    onForceCreate,
    requestedTime,
    newEventTitle
}) => {
    if (!isOpen) return null;

    const { conflict, proposal } = conflictData;

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
    };

    return createPortal(
        <div className="zena-conflict-modal-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="zena-conflict-modal">
                <button
                    className="close-btn"
                    onClick={onClose}
                    style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                >
                    <X size={20} />
                </button>

                <div className="conflict-header">
                    <div className="conflict-icon-wrapper">
                        <AlertTriangle size={24} />
                    </div>
                    <div className="conflict-title">
                        <h2>Schedule Conflict Detected</h2>
                        <p>Zena intelligence intervention</p>
                    </div>
                </div>

                <div className="conflict-details-card">
                    <div className="conflict-message" style={{ padding: '16px', fontSize: '15px', lineHeight: '1.5', color: 'rgba(255,255,255,0.9)' }}>
                        Requested appointment at <span style={{ color: '#00d4ff', fontWeight: 600 }}>{requestedTime.time}</span> <span style={{ fontWeight: 600 }}>{newEventTitle}</span> conflicts with existing appointment <span style={{ color: '#ff4d4d', fontWeight: 600 }}>{conflict.title}</span> <span style={{ opacity: 0.7 }}>({formatTime(conflict.startTime)}-{formatTime(conflict.endTime)})</span>
                    </div>
                </div>

                {proposal ? (
                    <div className="proposal-section">
                        <div className="proposal-label">
                            <CheckCircle2 size={16} />
                            Zena Suggests
                        </div>
                        <div className="proposed-time">
                            {formatTime(proposal.startTime)}
                        </div>
                        <div className="proposed-date">
                            {formatDate(proposal.startTime)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
                            {proposal.reason}
                        </div>
                    </div>
                ) : (
                    <div className="proposal-section" style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)' }}>
                        <div className="proposal-label" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            <Clock size={16} />
                            No Alternative Found
                        </div>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                            Unable to find an immediate alternative slot.
                        </p>
                    </div>
                )}

                <div className="modal-actions">
                    <button className="force-btn" onClick={onForceCreate}>
                        Keep {requestedTime.time}
                    </button>

                    {proposal && (
                        <button className="accept-btn" onClick={onAcceptProposal}>
                            Accept {formatTime(proposal.startTime)}
                            <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
