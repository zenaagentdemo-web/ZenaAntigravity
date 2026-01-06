import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, MapPin, Search, Zap, LineChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/apiClient';
import './ComparableReportModal.css';

interface ComparableReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialAddress?: string;
    initialBedrooms?: number;
}

export const ComparableReportModal: React.FC<ComparableReportModalProps> = ({
    isOpen,
    onClose,
    initialAddress,
    initialBedrooms
}) => {
    const navigate = useNavigate();
    const [address, setAddress] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [bedrooms, setBedrooms] = useState(3);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Sync state when props change or modal opens
    useEffect(() => {
        if (isOpen) {
            setAddress(initialAddress || '');
            setBedrooms(initialBedrooms || 3);
            setShowSuggestions(false);
        }
    }, [isOpen, initialAddress, initialBedrooms]);

    if (!isOpen) return null;

    const fetchSuggestions = async (val: string) => {
        if (val.length < 2) {
            setSuggestions([]);
            return;
        }
        try {
            const res = await api.get<{ suggestions: string[] }>(`/api/market-data/autocomplete?query=${encodeURIComponent(val)}`);
            setSuggestions(res.data.suggestions || []);
            setShowSuggestions(true);
        } catch (err) {
            console.error('Autocomplete failed:', err);
        }
    };

    const handleAddressChange = (val: string) => {
        setAddress(val);
        fetchSuggestions(val);
    };

    const handleOkay = () => {
        if (!address.trim()) return;

        const query = `Perform a comparable market analysis for ${address}${bedrooms ? ` with ${bedrooms} bedrooms` : ''}. Generate a PDF report and list verified sources.`;
        onClose();
        navigate(`/ask-zena?prompt=${encodeURIComponent(query)}`);
    };

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="comparable-report-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-header__title">
                        <LineChart className="header-icon" size={24} />
                        <div>
                            <h2>Comparable Market Analysis</h2>
                            <p>Synthesizing real-time market data across multiple indices</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-content">
                    <div className="report-form">
                        <div className="form-group">
                            <label className="input-label">
                                <Search size={14} /> Subject Property Address
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    className="high-tech-input"
                                    placeholder="Starting typing address..."
                                    value={address}
                                    onChange={(e) => handleAddressChange(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                                {suggestions.length > 0 && (
                                    <div className="autocomplete-suggestions">
                                        {suggestions.map((s, idx) => (
                                            <div
                                                key={idx}
                                                className="suggestion-item"
                                                onClick={() => {
                                                    setAddress(s);
                                                    setSuggestions([]);
                                                }}
                                            >
                                                <Search size={12} /> {s}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="input-label">Bedrooms</label>
                            <div className="bedroom-picker">
                                {[1, 2, 3, 4, 5].map((num) => (
                                    <button
                                        key={num}
                                        type="button"
                                        className={`bed-btn ${bedrooms === num ? 'active' : ''}`}
                                        onClick={() => setBedrooms(num)}
                                    >
                                        {num === 5 ? '5+' : num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            className="generate-btn"
                            onClick={handleOkay}
                            disabled={!address}
                        >
                            <Zap size={20} />
                            Okay
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
