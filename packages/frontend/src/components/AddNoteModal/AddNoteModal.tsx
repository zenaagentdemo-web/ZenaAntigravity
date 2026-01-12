import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Mic, Calendar, Home, Briefcase, Plus, Loader2, Check } from 'lucide-react';
import { api } from '../../utils/apiClient';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import './AddNoteModal.css';

interface AddNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (noteData: { content: string; type: string; linkedPropertyId?: string; linkedDealId?: string }) => Promise<void>;
    initialContent?: string;
    entityId?: string;
    entityType?: 'contact' | 'property' | 'deal';
    entityName?: string;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialContent = '',
    entityId,
    entityType,
    entityName
}) => {
    const [content, setContent] = useState(initialContent);
    const [isSaving, setIsSaving] = useState(false);
    const [detectedEntities, setDetectedEntities] = useState<{ addresses: string[]; dates: string[] }>({ addresses: [], dates: [] });
    const [suggestions, setSuggestions] = useState<{ type: 'property' | 'task'; message: string; data: any }[]>([]);

    const { isRecording, isProcessing, startRecording, stopRecording } = useVoiceInteraction({
        onTranscriptionComplete: (text) => {
            setContent(prev => prev + (prev ? '\n' : '') + text);
        }
    });

    // Detect entities (Addresses and Dates) as user types
    useEffect(() => {
        if (!content.trim() || content.length < 5) {
            setDetectedEntities({ addresses: [], dates: [] });
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            const newSuggestions: typeof suggestions = [];
            const newDetected: typeof detectedEntities = { addresses: [], dates: [] };

            // 1. Address Detection (NZ Pattern)
            const addressPattern = /\b(\d+[A-Za-z]?\s+[A-Za-z][A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Place|Pl|Terrace|Tce|Way|Close|Cl|Crescent|Cres|Boulevard|Blvd))\b/gi;
            const addressMatches = content.match(addressPattern) || [];

            if (addressMatches.length > 0) {
                newDetected.addresses = addressMatches;

                try {
                    const res = await api.get<{ properties: { id: string; address: string }[] }>('/api/properties');
                    const allProperties = res.data.properties || [];

                    for (const addr of addressMatches) {
                        const matchedProp = allProperties.find(p =>
                            p.address.toLowerCase().includes(addr.toLowerCase()) ||
                            addr.toLowerCase().includes(p.address.toLowerCase().split(',')[0])
                        );

                        if (matchedProp) {
                            newSuggestions.push({
                                type: 'property',
                                message: `Link to property "${matchedProp.address}"?`,
                                data: { id: matchedProp.id, address: matchedProp.address }
                            });
                        } else {
                            newSuggestions.push({
                                type: 'property',
                                message: `Create new property for "${addr}"?`,
                                data: { address: addr }
                            });
                        }
                    }
                } catch (err) {
                    console.warn('Property lookup failed:', err);
                }
            }

            // 2. Date/Time Detection (Simple patterns for MVP)
            const dateKeywords = ['tomorrow', 'friday', 'monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday', 'next week', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const foundDates = dateKeywords.filter(k => content.toLowerCase().includes(k));

            if (foundDates.length > 0) {
                newDetected.dates = foundDates;
                newSuggestions.push({
                    type: 'task',
                    message: `Found date reference. Create a follow-up task?`,
                    data: { title: `Follow up: ${content.substring(0, 30)}...`, dateHint: foundDates[0] }
                });
            }

            setDetectedEntities(newDetected);
            setSuggestions(newSuggestions);
        }, 800);

        return () => clearTimeout(timer);
    }, [content]);

    const handleSave = async (linkedPropertyId?: string, linkedDealId?: string) => {
        if (!content.trim()) return;

        setIsSaving(true);
        try {
            await onSave({
                content,
                type: 'note',
                linkedPropertyId,
                linkedDealId
            });
            onClose();
        } catch (err) {
            console.error('Failed to save note:', err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="add-note-modal-overlay" onClick={onClose}>
            <div className="add-note-modal" onClick={e => e.stopPropagation()}>
                <header className="anm-header">
                    <div className="anm-title-group">
                        <Sparkles size={20} className="anm-sparkle-icon" />
                        <h2>
                            {entityName ? `Add Note for ${entityName}` : 'Add New Note'}
                            {initialContent && (
                                <div className="zena-prefill-badge">
                                    <Sparkles size={12} />
                                    <span>Pre-filled</span>
                                </div>
                            )}
                        </h2>
                    </div>
                    <button className="anm-close-btn" onClick={onClose}><X size={20} /></button>
                </header>

                <div className="anm-body">
                    <div className="anm-input-area">
                        <textarea
                            className="anm-textarea"
                            placeholder="Type your notes here... Zena will detect addresses and dates automatically."
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            autoFocus
                        />

                        <div className="anm-proactive-bar">
                            {detectedEntities.addresses.length > 0 && (
                                <div className="anm-badge">
                                    <Home size={12} />
                                    <span>{detectedEntities.addresses.length} Address{detectedEntities.addresses.length > 1 ? 'es' : ''} detected</span>
                                </div>
                            )}
                            {detectedEntities.dates.length > 0 && (
                                <div className="anm-badge">
                                    <Calendar size={12} />
                                    <span>Date reference found</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {suggestions.map((suggestion, idx) => (
                        <div key={idx} className="anm-suggestion-banner">
                            <div className="anm-suggestion-text">
                                {suggestion.type === 'property' ? <Home size={14} style={{ marginRight: 8 }} /> : <Calendar size={14} style={{ marginRight: 8 }} />}
                                {suggestion.message}
                            </div>
                            <button
                                className="anm-suggestion-btn"
                                onClick={() => {
                                    if (suggestion.type === 'property' && suggestion.data.id) {
                                        handleSave(suggestion.data.id);
                                    } else {
                                        // Handle task creation or new property modal
                                        console.log('Action triggered:', suggestion);
                                    }
                                }}
                            >
                                {suggestion.type === 'property' ? 'Link Property' : 'Create Task'}
                            </button>
                        </div>
                    ))}
                </div>

                <footer className="anm-footer">
                    <div className="anm-controls-left">
                        <button
                            className={`anm-voice-btn ${isRecording ? 'recording' : ''}`}
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 size={16} className="anm-spin" /> : <Mic size={16} />}
                            {isRecording ? 'Stop Recording' : 'Voice Note'}
                        </button>
                    </div>
                    <div className="anm-actions-right">
                        <button className="anm-btn anm-btn-secondary" onClick={onClose}>Cancel</button>
                        <button
                            className="anm-btn anm-btn-primary"
                            disabled={!content.trim() || isSaving}
                            onClick={() => handleSave()}
                        >
                            {isSaving ? <Loader2 size={16} className="anm-spin" /> : <Check size={16} />}
                            {isSaving ? 'Saving...' : 'Save Note'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};
