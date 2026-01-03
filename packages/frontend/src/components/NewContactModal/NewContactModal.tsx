import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    User,
    Mail,
    Phone,
    Briefcase,
    MapPin,
    Home,
    DollarSign,
    Clock,
    Sparkles,
    Minus,
    Plus,
    Brain,
    Loader2
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import './NewContactModal.css';

interface NewContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (contactData: any) => void;
    initialData?: any;
    title?: string;
}

type Role = 'buyer' | 'vendor' | 'agent' | 'investor' | 'tradesperson' | 'market' | 'other';

export const NewContactModal: React.FC<NewContactModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    title = "Add New Contact"
}) => {
    if (!isOpen) return null;

    const [formData, setFormData] = useState(() => {
        if (initialData) {
            // If we have a full contact object with 'name'
            if (initialData.name) {
                const parts = initialData.name.split(' ');
                return {
                    firstName: parts[0] || '',
                    lastName: parts.slice(1).join(' ') || '',
                    email: initialData.emails?.[0] || '',
                    phone: initialData.phones?.[0] || '',
                    role: initialData.role || 'buyer',
                    context: initialData.context || '',
                };
            }
        }
        return {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            role: 'buyer' as Role,
            context: '',
        };
    });

    const [intelligence, setIntelligence] = useState(initialData?.zenaIntelligence || {
        propertyType: 'House',
        minBudget: '',
        maxBudget: '',
        bedrooms: 3,
        bathrooms: 2,
        location: '',
        timeline: '3 months'
    });

    // AI Contact Type Prediction
    const [aiPrediction, setAiPrediction] = useState<{
        suggestedRole: string;
        suggestedCategory: string;
        confidence: number;
        reason: string;
        intelligenceHint?: string;
    } | null>(null);
    const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);

    // Debounced AI prediction when email changes
    const predictContactType = useCallback(async (email: string, name: string) => {
        if (!email && !name) {
            setAiPrediction(null);
            return;
        }

        // Only call API if email has @ symbol (valid email format)
        if (email && !email.includes('@')) return;

        setIsLoadingPrediction(true);
        try {
            const response = await api.post<{
                suggestedRole: string;
                suggestedCategory: string;
                confidence: number;
                reason: string;
                intelligenceHint?: string;
            }>('/api/ask/predict-contact-type', { email, name });

            if (response.data) {
                setAiPrediction(response.data);

                // Auto-apply high-confidence predictions
                if (response.data.confidence >= 0.8) {
                    setFormData(prev => ({ ...prev, role: response.data.suggestedRole as Role }));
                }
            }
        } catch (error) {
            console.warn('[NewContactModal] AI prediction failed:', error);
        } finally {
            setIsLoadingPrediction(false);
        }
    }, []);

    // Trigger prediction on email blur
    const handleEmailBlur = () => {
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        predictContactType(formData.email, fullName);
    };

    const handleRolesSelect = (role: Role) => {
        setFormData(prev => ({ ...prev, role }));
    };

    const increment = (field: 'bedrooms' | 'bathrooms') => {
        setIntelligence(prev => ({ ...prev, [field]: prev[field] + 1 }));
    };

    const decrement = (field: 'bedrooms' | 'bathrooms') => {
        setIntelligence(prev => ({ ...prev, [field]: Math.max(0, prev[field] - 1) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            intelligence
        });
        onClose();
    };

    return createPortal(
        <div className="new-contact-modal-overlay" onClick={onClose}>
            <div className="new-contact-modal" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="ncm-header">
                    <div className="ncm-title">
                        <h2>{title}</h2>
                    </div>
                    <button className="ncm-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="ncm-body">
                    <form id="ncm-form" onSubmit={handleSubmit}>
                        {/* Section 1: Essentials */}
                        <div className="ncm-section">
                            <div className="ncm-section-title">
                                Essentials
                            </div>

                            <div className="ncm-grid-2">
                                <div className="ncm-field-group">
                                    <label className="ncm-label">First Name</label>
                                    <div className="ncm-input-wrapper">
                                        <User size={16} className="ncm-input-icon" />
                                        <input
                                            type="text"
                                            className="ncm-input"
                                            placeholder="e.g. Sarah"
                                            value={formData.firstName}
                                            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="ncm-field-group">
                                    <label className="ncm-label">Last Name</label>
                                    <div className="ncm-input-wrapper">
                                        <input
                                            type="text"
                                            className="ncm-input no-icon"
                                            placeholder="e.g. Miller"
                                            value={formData.lastName}
                                            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="ncm-grid-2">
                                <div className="ncm-field-group">
                                    <label className="ncm-label">Email Address</label>
                                    <div className="ncm-input-wrapper">
                                        <Mail size={16} className="ncm-input-icon" />
                                        <input
                                            type="email"
                                            className="ncm-input"
                                            placeholder="sarah.miller@example.com"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            onBlur={handleEmailBlur}
                                        />
                                        {isLoadingPrediction && (
                                            <Loader2 size={14} className="ncm-loading-icon" />
                                        )}
                                    </div>
                                    {/* AI Prediction Hint */}
                                    {aiPrediction && aiPrediction.confidence >= 0.5 && (
                                        <div className="ncm-ai-hint">
                                            <Brain size={12} />
                                            <span>{aiPrediction.reason}</span>
                                            {aiPrediction.intelligenceHint && (
                                                <span className="ncm-ai-intel"> • {aiPrediction.intelligenceHint}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="ncm-field-group">
                                    <label className="ncm-label">Phone Number</label>
                                    <div className="ncm-input-wrapper">
                                        <Phone size={16} className="ncm-input-icon" />
                                        <input
                                            type="tel"
                                            className="ncm-input"
                                            placeholder="+64 21 123 4567"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="ncm-field-group">
                                <label className="ncm-label">Primary Role</label>
                                <div className="ncm-roles">
                                    {(['buyer', 'vendor', 'agent', 'investor', 'tradesperson', 'market', 'other'] as Role[]).map(role => (
                                        <div
                                            key={role}
                                            className={`ncm-role-pill ${formData.role === role ? 'active' : ''}`}
                                            onClick={() => handleRolesSelect(role)}
                                        >
                                            {role.charAt(0).toUpperCase() + role.slice(1)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>


                        {/* Section 2: Zena Intelligence */}
                        <div className="ncm-section">
                            <div className="ncm-section-title">
                                <Sparkles size={14} className="text-emerald-400" />
                                Zena Intelligence
                                <span className="intel-badge">Initial Preferences</span>
                            </div>

                            <div className="ncm-grid-2">
                                <div className="ncm-field-group">
                                    <label className="ncm-label">Looking For</label>
                                    <div className="ncm-input-wrapper">
                                        <Home size={16} className="ncm-input-icon" />
                                        <select
                                            className="ncm-input"
                                            value={intelligence.propertyType}
                                            onChange={e => setIntelligence({ ...intelligence, propertyType: e.target.value })}
                                        >
                                            <option>House</option>
                                            <option>Apartment</option>
                                            <option>Townhouse</option>
                                            <option>Lifestyle</option>
                                            <option>Land</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="ncm-field-group">
                                    <label className="ncm-label">Target Locations</label>
                                    <div className="ncm-input-wrapper">
                                        <MapPin size={16} className="ncm-input-icon" />
                                        <input
                                            type="text"
                                            className="ncm-input"
                                            placeholder="e.g. Ponsonby, Grey Lynn"
                                            value={intelligence.location}
                                            onChange={e => setIntelligence({ ...intelligence, location: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="ncm-grid-2">
                                <div className="ncm-field-group">
                                    <label className="ncm-label">Budget Range</label>
                                    <div className="ncm-budget-range">
                                        <div className="ncm-input-wrapper" style={{ flex: 1 }}>
                                            <DollarSign size={16} className="ncm-input-icon" />
                                            <input
                                                type="text"
                                                className="ncm-input"
                                                placeholder="Min"
                                                value={intelligence.minBudget}
                                                onChange={e => setIntelligence({ ...intelligence, minBudget: e.target.value })}
                                            />
                                        </div>
                                        <span className="ncm-budget-separator">-</span>
                                        <div className="ncm-input-wrapper" style={{ flex: 1 }}>
                                            <DollarSign size={16} className="ncm-input-icon" />
                                            <input
                                                type="text"
                                                className="ncm-input"
                                                placeholder="Max"
                                                value={intelligence.maxBudget}
                                                onChange={e => setIntelligence({ ...intelligence, maxBudget: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="ncm-grid-2">
                                    <div className="ncm-field-group">
                                        <label className="ncm-label">Bedrooms</label>
                                        <div className="ncm-counter">
                                            <button className="ncm-counter-btn" onClick={() => decrement('bedrooms')}><Minus size={14} /></button>
                                            <span className="ncm-counter-value">{intelligence.bedrooms}+</span>
                                            <button className="ncm-counter-btn" onClick={() => increment('bedrooms')}><Plus size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="ncm-field-group">
                                        <label className="ncm-label">Bathrooms</label>
                                        <div className="ncm-counter">
                                            <button className="ncm-counter-btn" onClick={() => decrement('bathrooms')}><Minus size={14} /></button>
                                            <span className="ncm-counter-value">{intelligence.bathrooms}+</span>
                                            <button className="ncm-counter-btn" onClick={() => increment('bathrooms')}><Plus size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="ncm-field-group">
                                <label className="ncm-label">Timeline / Urgency</label>
                                <div className="ncm-input-wrapper">
                                    <Clock size={16} className="ncm-input-icon" />
                                    <select
                                        className="ncm-input"
                                        value={intelligence.timeline}
                                        onChange={e => setIntelligence({ ...intelligence, timeline: e.target.value })}
                                    >
                                        <option>ASAP (High Urgency)</option>
                                        <option>3 months</option>
                                        <option>6 months</option>
                                        <option>12 months+</option>
                                        <option>Just Watching</option>
                                    </select>
                                </div>
                            </div>

                        </div>

                        {/* Section 3: Context */}
                        {!initialData && (
                            <div className="ncm-section">
                                <div className="ncm-section-title">Context</div>
                                <div className="ncm-field-group">
                                    <label className="ncm-label">Initial Notes</label>
                                    <textarea
                                        className="ncm-input no-icon"
                                        rows={3}
                                        placeholder="Met at 21 Main St open home..."
                                        value={formData.context}
                                        onChange={e => setFormData({ ...formData, context: e.target.value })}
                                        style={{ resize: 'none' }}
                                    />
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="ncm-footer">
                    <button type="button" className="ncm-btn ncm-btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" form="ncm-form" className="ncm-btn ncm-btn-primary">
                        {initialData ? 'Update Contact' : 'Create Contact'}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};
