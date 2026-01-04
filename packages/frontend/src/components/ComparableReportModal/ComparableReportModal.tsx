import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, MapPin, BedDouble, Loader2, ExternalLink } from 'lucide-react';
import { api } from '../../utils/apiClient';
import './ComparableReportModal.css';

interface ComparableSale {
    address: string;
    soldPrice: string;
    soldDate: string;
    agency?: string;
    bedrooms?: number;
    bathrooms?: number;
    distance?: string;
}

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
    const [address, setAddress] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [bedrooms, setBedrooms] = useState(3);
    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<ComparableSale[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Sync state when props change or modal opens
    useEffect(() => {
        if (isOpen) {
            setAddress(initialAddress || '');
            setBedrooms(initialBedrooms || 3);
            setResults(null);
            setError(null);
            setShowSuggestions(false);

            if (initialAddress) {
                // Auto-trigger for property cards
                const timer = setTimeout(() => {
                    handleManualGenerate(initialAddress, initialBedrooms || 3);
                }, 300);
                return () => clearTimeout(timer);
            }
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

    const handleSelectSuggestion = (suggestion: string) => {
        setAddress(suggestion);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleManualGenerate = async (targetAddr: string, targetBeds: number) => {
        setIsGenerating(true);
        setError(null);
        setResults(null);
        setShowSuggestions(false);

        try {
            console.log(`[ComparableReportModal] Scraping for: ${targetAddr} (${targetBeds} beds)`);
            const response = await api.post('/api/market-data/scrape', {
                address: targetAddr,
                bedrooms: targetBeds
            });

            if (response.data.success && response.data.comparables && response.data.comparables.length > 0) {
                setResults(response.data.comparables);
            } else {
                setError('No results found for this area. Try adding more detail to the address.');
            }
        } catch (err: any) {
            console.error('Failed to generate report:', err);
            setError(err.response?.data?.error || 'Failed to generate report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!address.trim()) return;
        await handleManualGenerate(address, bedrooms);
    };

    const handleReset = () => {
        setAddress('');
        setSuggestions([]);
        setBedrooms(3);
        setResults(null);
        setError(null);
    };

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="comparable-report-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-header__title">
                        <TrendingUp size={24} className="header-icon" />
                        <div>
                            <h2>Comparable Analysis Report</h2>
                            <p>Enter any address to scrape real-time market data</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-content">
                    {!results ? (
                        <form onSubmit={handleGenerate} className="report-form">
                            <div className="form-group">
                                <label className="input-label">
                                    <MapPin size={16} />
                                    Target Property Address
                                </label>
                                <input
                                    type="text"
                                    className="high-tech-input"
                                    placeholder="e.g. 3/186 Point Chevalier Road, Point Chevalier, Auckland"
                                    value={address}
                                    onChange={e => handleAddressChange(e.target.value)}
                                    onFocus={() => address.length >= 2 && setShowSuggestions(true)}
                                    autoFocus
                                    required
                                />
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="autocomplete-suggestions">
                                        {suggestions.map((s, i) => (
                                            <div
                                                key={i}
                                                className="suggestion-item"
                                                onClick={() => handleSelectSuggestion(s)}
                                            >
                                                <MapPin size={12} />
                                                <span>{s}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="input-label">
                                    <BedDouble size={16} />
                                    Bedrooms
                                </label>
                                <div className="bedroom-picker">
                                    {[1, 2, 3, 4, 5].map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            className={`bed-btn ${bedrooms === num ? 'active' : ''}`}
                                            onClick={() => setBedrooms(num)}
                                        >
                                            {num}{num === 5 ? '+' : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && <div className="report-error">{error}</div>}

                            <button
                                type="submit"
                                className={`generate-btn ${isGenerating ? 'loading' : ''}`}
                                disabled={isGenerating || !address.trim()}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={20} className="spin" />
                                        <span>Zena is scraping the net...</span>
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp size={20} />
                                        <span>Generate Analysis</span>
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="report-results">
                            <div className="results-summary">
                                <h3>Found {results.length} Comparable Sales</h3>
                                <p>Based on {address} area scan</p>
                            </div>

                            <div className="sales-list">
                                {results.map((sale, idx) => (
                                    <div key={idx} className="sale-card">
                                        <div className="sale-card__header">
                                            <span className="sale-address">{sale.address}</span>
                                            <span className="sale-price">{sale.soldPrice}</span>
                                        </div>
                                        <div className="sale-card__meta">
                                            <span>{sale.bedrooms} Bed | {sale.bathrooms} Bath</span>
                                            <span className="sale-date">Sold {sale.soldDate}</span>
                                        </div>
                                        {sale.distance && <div className="sale-distance">{sale.distance} away</div>}
                                        {sale.agency && <div className="sale-agency">{sale.agency}</div>}
                                    </div>
                                ))}
                            </div>

                            <div className="results-footer">
                                <button className="secondary-btn" onClick={handleReset}>
                                    New Analysis
                                </button>
                                <button className="primary-btn" onClick={onClose}>
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
