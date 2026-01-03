import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, User, Clock, Check, Brain, Loader2 } from 'lucide-react';
import { api } from '../../utils/apiClient';
import './ZenaBatchTagModal.css';

interface ZenaBatchTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { role?: string; zenaIntelligence?: any }) => void;
    selectedCount: number;
    selectedContactIds?: string[]; // New: pass contact IDs for AI analysis
}

interface AISuggestion {
    contactId: string;
    suggestedRole: string;
    suggestedCategory: string;
    confidence: number;
    reason: string;
}

type Role = 'buyer' | 'vendor' | 'agent' | 'investor' | 'tradesperson' | 'market' | 'other';

export const ZenaBatchTagModal: React.FC<ZenaBatchTagModalProps> = ({
    isOpen,
    onClose,
    onSave,
    selectedCount,
    selectedContactIds = []
}) => {
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [selectedTimeline, setSelectedTimeline] = useState<string | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
    const [commonThemes, setCommonThemes] = useState<string[]>([]);
    const [showAISuggestions, setShowAISuggestions] = useState(false);

    // Memoize contact IDs to prevent infinite re-renders
    const selectedContactIdsKey = selectedContactIds.join(',');

    // Fetch AI suggestions when modal opens with contact IDs
    useEffect(() => {
        if (isOpen && selectedContactIds.length > 0) {
            fetchAISuggestions();
        } else {
            // Reset state when modal closes
            setAiSuggestions([]);
            setCommonThemes([]);
            setShowAISuggestions(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, selectedContactIdsKey]);

    const fetchAISuggestions = async () => {
        setIsLoadingAI(true);
        try {
            const response = await api.post<{
                suggestions: AISuggestion[];
                commonThemes: string[];
            }>('/api/ask/suggest-batch-tags', {
                contactIds: selectedContactIds
            });

            if (response.data) {
                setAiSuggestions(response.data.suggestions || []);
                setCommonThemes(response.data.commonThemes || []);
                setShowAISuggestions(true);

                // Auto-select the most common role if high confidence
                const roleCounts: Record<string, number> = {};
                response.data.suggestions?.forEach(s => {
                    if (s.confidence >= 0.7) {
                        roleCounts[s.suggestedRole] = (roleCounts[s.suggestedRole] || 0) + 1;
                    }
                });
                const topRole = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0];
                if (topRole && topRole[1] >= selectedContactIds.length * 0.6) {
                    setSelectedRole(topRole[0] as Role);
                }
            }
        } catch (error) {
            console.warn('[ZenaBatchTagModal] Failed to fetch AI suggestions:', error);
        } finally {
            setIsLoadingAI(false);
        }
    };

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

    // Calculate AI recommendation summary
    const getAIRecommendationSummary = () => {
        if (aiSuggestions.length === 0) return null;

        const roleDistribution: Record<string, number> = {};
        aiSuggestions.forEach(s => {
            roleDistribution[s.suggestedRole] = (roleDistribution[s.suggestedRole] || 0) + 1;
        });

        const avgConfidence = aiSuggestions.reduce((sum, s) => sum + s.confidence, 0) / aiSuggestions.length;

        return { roleDistribution, avgConfidence };
    };

    const aiSummary = getAIRecommendationSummary();

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
                    {/* AI Suggestions Panel */}
                    {selectedContactIds.length > 0 && (
                        <div className="zbt-ai-panel">
                            <div className="zbt-ai-header">
                                <Brain size={16} />
                                <span>Zena AI Analysis</span>
                                {isLoadingAI && <Loader2 size={14} className="zbt-spinner" />}
                            </div>

                            {showAISuggestions && aiSummary && (
                                <div className="zbt-ai-content">
                                    <div className="zbt-ai-confidence">
                                        <span className="zbt-ai-confidence-value">
                                            {Math.round(aiSummary.avgConfidence * 100)}%
                                        </span>
                                        <span className="zbt-ai-confidence-label">Avg Confidence</span>
                                    </div>
                                    <div className="zbt-ai-distribution">
                                        {Object.entries(aiSummary.roleDistribution).map(([role, count]) => (
                                            <div key={role} className="zbt-ai-role-chip">
                                                <span className="zbt-ai-role-name">{role}</span>
                                                <span className="zbt-ai-role-count">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {commonThemes.length > 0 && (
                                        <div className="zbt-ai-themes">
                                            <span className="zbt-ai-themes-label">Common themes:</span>
                                            <span className="zbt-ai-themes-list">{commonThemes.join(', ')}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isLoadingAI && !showAISuggestions && (
                                <button
                                    className="zbt-ai-analyze-btn"
                                    onClick={fetchAISuggestions}
                                >
                                    <Brain size={14} />
                                    Analyze with Zena AI
                                </button>
                            )}
                        </div>
                    )}

                    <p className="zbt-intro">
                        {showAISuggestions
                            ? 'Zena has analyzed your contacts. Override or accept the suggestions below.'
                            : 'Bulk apply intelligence markers and roles to your selected contacts.'}
                    </p>

                    <div className="zbt-section">
                        <div className="zbt-section-label">
                            <User size={14} /> Assign Primary Role
                            {selectedRole && showAISuggestions && (
                                <span className="zbt-ai-badge">AI Suggested</span>
                            )}
                        </div>
                        <div className="zbt-roles-grid">
                            {(['buyer', 'vendor', 'investor', 'agent', 'market', 'other'] as Role[]).map(role => {
                                const aiCount = aiSuggestions.filter(s => s.suggestedRole === role).length;
                                return (
                                    <button
                                        key={role}
                                        className={`zbt-role-card ${selectedRole === role ? 'active' : ''} ${aiCount > 0 ? 'ai-suggested' : ''}`}
                                        onClick={() => setSelectedRole(selectedRole === role ? null : role)}
                                    >
                                        <span className="zbt-role-name">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                                        {aiCount > 0 && <span className="zbt-ai-count">{aiCount}</span>}
                                        {selectedRole === role && <Check size={14} className="zbt-check" />}
                                    </button>
                                );
                            })}
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
