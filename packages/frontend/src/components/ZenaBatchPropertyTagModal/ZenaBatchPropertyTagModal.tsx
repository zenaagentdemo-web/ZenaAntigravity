import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Home, Building2, MapPin, Check } from 'lucide-react';
import { api } from '../../utils/apiClient';
import './ZenaBatchPropertyTagModal.css';

interface ZenaBatchPropertyTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { status?: string; type?: string }) => void;
    selectedCount: number;
    selectedPropertyIds: string[];
}

type PropertyStatus = 'active' | 'under_contract' | 'sold' | 'withdrawn';
type PropertyType = 'residential' | 'commercial' | 'land';

const STATUS_OPTIONS: Array<{ value: PropertyStatus; label: string; color: string }> = [
    { value: 'active', label: 'Active', color: '#00FF88' },
    { value: 'under_contract', label: 'Under Contract', color: '#FFD700' },
    { value: 'sold', label: 'Sold', color: '#FF6B6B' },
    { value: 'withdrawn', label: 'Withdrawn', color: '#888888' },
];


export const ZenaBatchPropertyTagModal: React.FC<ZenaBatchPropertyTagModalProps> = ({
    isOpen,
    onClose,
    onSave,
    selectedCount,
    selectedPropertyIds
}) => {
    const [selectedStatus, setSelectedStatus] = useState<PropertyStatus | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        const data: { status?: string; type?: string } = {};
        if (selectedStatus) data.status = selectedStatus;

        if (Object.keys(data).length === 0) {
            onClose();
            return;
        }

        setIsSaving(true);
        try {
            await api.patch('/api/properties/bulk', { ids: selectedPropertyIds, data });
            onSave(data);
            onClose();
        } catch (error) {
            console.error('[ZenaBatchPropertyTagModal] Bulk update failed:', error);
            alert('Failed to update properties. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="zbt-modal-overlay" onClick={onClose}>
            <div className="zbt-modal" onClick={e => e.stopPropagation()}>
                <div className="zbt-header">
                    <div className="zbt-header-title">
                        <Sparkles size={18} className="text-emerald-400" />
                        <h2>Batch Update Properties</h2>
                        <span className="zbt-count-badge">{selectedCount} Properties</span>
                    </div>
                    <button className="zbt-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="zbt-body">
                    <p className="zbt-intro">
                        Bulk update the status and type of your selected properties.
                    </p>

                    <div className="zbt-section">
                        <div className="zbt-section-label">
                            Update Status
                        </div>
                        <div className="zbt-roles-grid">
                            {STATUS_OPTIONS.map(status => (
                                <button
                                    key={status.value}
                                    className={`zbt-role-card ${selectedStatus === status.value ? 'active' : ''}`}
                                    onClick={() => setSelectedStatus(selectedStatus === status.value ? null : status.value)}
                                    style={{ '--status-color': status.color } as React.CSSProperties}
                                >
                                    <span
                                        className="status-indicator"
                                        style={{ background: status.color }}
                                    />
                                    <span className="zbt-role-name">{status.label}</span>
                                    {selectedStatus === status.value && <Check size={14} className="zbt-check" />}
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
                        disabled={!selectedStatus || isSaving}
                    >
                        {isSaving ? 'Updating...' : 'Apply Changes'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ZenaBatchPropertyTagModal;
