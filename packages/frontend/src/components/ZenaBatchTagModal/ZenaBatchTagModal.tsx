import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, User, Clock, Check } from 'lucide-react';
import './ZenaBatchTagModal.css';

interface ZenaBatchTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { role?: string; zenaIntelligence?: any }) => void;
    selectedCount: number;
}

type Role = 'buyer' | 'vendor' | 'agent' | 'investor' | 'tradesperson' | 'market' | 'other';

export const ZenaBatchTagModal: React.FC<ZenaBatchTagModalProps> = ({
    isOpen,
    onClose,
    onSave,
    selectedCount
}) => {
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [selectedTimeline, setSelectedTimeline] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSave = () => {
        const data: any = {};
        if (selectedRole) data.role = selectedRole;
        if (selectedTimeline) {
            data.zenaIntelligence = { timeline: selectedTimeline };
        }
        onSave(data);
        onClose();
    };

    return createPortal(
        <div className="zbt-modal-overlay" onClick={onClose}>
            <div className="zbt-modal" onClick={e => e.stopPropagation()}>
                <div className="zbt-header">
                    <div className="zbt-header-title">
                        <Sparkles size={18} className="text-emerald-400" />
                        <h2>Batch Tag Intel</h2>
                        <span className="zbt-count-badge">{selectedCount} Records</span>
                    </div>
                    <button className="zbt-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="zbt-body">
                    <p className="zbt-intro">
                        Bulk apply intelligence markers and roles to your selected contacts.
                        This will override existing values for the specific fields you select.
                    </p>

                    <div className="zbt-section">
                        <div className="zbt-section-label">
                            <User size={14} /> Assign Primary Role
                        </div>
                        <div className="zbt-roles-grid">
                            {(['buyer', 'vendor', 'investor', 'agent', 'market', 'other'] as Role[]).map(role => (
                                <button
                                    key={role}
                                    className={`zbt-role-card ${selectedRole === role ? 'active' : ''}`}
                                    onClick={() => setSelectedRole(selectedRole === role ? null : role)}
                                >
                                    <span className="zbt-role-name">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                                    {selectedRole === role && <Check size={14} className="zbt-check" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="zbt-section">
                        <div className="zbt-section-label">
                            <Clock size={14} /> Update Urgency / Timeline
                        </div>
                        <div className="zbt-timeline-list">
                            {[
                                'ASAP (High Urgency)',
                                '3 months',
                                '6 months',
                                '12 months+',
                                'Just Watching'
                            ].map(time => (
                                <button
                                    key={time}
                                    className={`zbt-timeline-item ${selectedTimeline === time ? 'active' : ''}`}
                                    onClick={() => setSelectedTimeline(selectedTimeline === time ? null : time)}
                                >
                                    <span>{time}</span>
                                    <div className={`zbt-radio ${selectedTimeline === time ? 'checked' : ''}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="zbt-footer">
                    <button className="zbt-btn zbt-btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="zbt-btn zbt-btn-primary"
                        onClick={handleSave}
                        disabled={!selectedRole && !selectedTimeline}
                    >
                        Apply Batch Intelligence
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ZenaBatchTagModal;
