import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Home,
    MapPin,
    DollarSign,
    BedDouble,
    Bath,
    Maximize,
    Users,
    Tag,
    FileText,
    User,
    Sparkles,
    Wand2,
    Minus,
    Plus,
    Loader2,
    Mail,
    Phone,
    Activity
} from 'lucide-react';
import { api } from '../../utils/apiClient';
import './AddPropertyModal.css';

interface AddPropertyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (propertyData: any) => void;
    initialData?: any;
    title?: string;
}

type PropertyType = 'residential' | 'commercial' | 'land';
type PropertyStatus = 'active' | 'under_contract' | 'sold' | 'withdrawn';

// Address suggestion interface
interface AddressSuggestion {
    id: string;
    fullAddress: string;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    title = "Add New Property"
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isParsing, setIsParsing] = useState(false); // Magic state
    const [isEnriching, setIsEnriching] = useState(false); // Enrichment state
    const [magicText, setMagicText] = useState('');
    const [showMagicInput, setShowMagicInput] = useState(false);

    // Address autocomplete state
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
    const [showAddressDropdown, setShowAddressDropdown] = useState(false);

    const [formData, setFormData] = useState(() => {
        if (initialData) {
            const vendor = initialData.vendors?.[0];
            return {
                address: initialData.address || '',
                type: (initialData.type as PropertyType) || 'residential',
                status: (initialData.status as PropertyStatus) || 'active',
                listingPrice: initialData.listingPrice ? String(initialData.listingPrice) : '',
                bedrooms: initialData.bedrooms || 3,
                bathrooms: initialData.bathrooms || 2,
                landSize: initialData.landSize || '',
                floorSize: initialData.floorSize || '',
                description: initialData.description || '',
                vendorFirstName: vendor?.name?.split(' ')[0] || '',
                vendorLastName: vendor?.name?.split(' ').slice(1).join(' ') || '',
                vendorEmail: vendor?.emails?.[0] || '',
                vendorPhone: vendor?.phones?.[0] || '',
                inquiryCount: initialData.inquiryCount ? String(initialData.inquiryCount) : '0',
                viewingCount: initialData.viewingCount ? String(initialData.viewingCount) : '0',
                rateableValue: initialData.rateableValue ? String(initialData.rateableValue) : '',
                lastSalePrice: initialData.lastSalePrice ? String(initialData.lastSalePrice) : '',
                lastSaleDate: initialData.lastSaleDate ? new Date(initialData.lastSaleDate).toLocaleDateString() : '',
                // Deal flow fields - always include defaults for new properties
                createDealFlowCard: true,
                saleMethod: 'auction' as any,
                dealStage: 'buyer_consult'
            };
        }
        return {
            address: '',
            type: 'residential' as PropertyType,
            status: 'active' as PropertyStatus,
            listingPrice: '',
            bedrooms: 3,
            bathrooms: 2,
            landSize: '',
            floorSize: '',
            description: '',
            // Vendor fields
            vendorFirstName: '',
            vendorLastName: '',
            vendorEmail: '',
            vendorPhone: '',
            inquiryCount: '0',
            viewingCount: '0',
            rateableValue: '',
            lastSalePrice: '',
            lastSaleDate: '',
            // Deal flow fields
            createDealFlowCard: true,
            saleMethod: 'auction' as any,
            dealStage: 'buyer_consult'
        };
    });

    // GLOBAL PROACTIVITY INVARIANT 1: Sync form when initialData changes
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                address: initialData.address || prev.address,
                type: (initialData.type as PropertyType) || prev.type,
                // Only override if provided in initialData
            }));
        }
    }, [initialData]);

    // Address autocomplete - fetch suggestions from geocoding API
    useEffect(() => {
        const fetchAddressSuggestions = async () => {
            if (formData.address.length < 3) {
                setAddressSuggestions([]);
                return;
            }

            try {
                const response = await api.get(`/api/geocoding/autocomplete?query=${encodeURIComponent(formData.address)}`);
                const data = response.data;
                setAddressSuggestions(data.suggestions || []);
            } catch (err) {
                console.error('Error fetching address suggestions:', err);
                setAddressSuggestions([]);
            }
        };

        const debounce = setTimeout(fetchAddressSuggestions, 400);
        return () => clearTimeout(debounce);
    }, [formData.address]);

    // Handle selecting an address suggestion
    const handleAddressSelect = async (suggestion: AddressSuggestion) => {
        // Reset fields to valid defaults (prevent data leak from previous address)
        setFormData(prev => ({
            ...prev,
            address: suggestion.fullAddress,
            // Reset numerical counters to reasonable defaults
            bedrooms: 3,
            bathrooms: 2,
            // Reset string fields to empty
            landSize: '',
            floorSize: '',
            rateableValue: '',
            listingPrice: '',
            lastSalePrice: '',
            lastSaleDate: ''
        }));

        setShowAddressDropdown(false);
        setAddressSuggestions([]);

        // Trigger Enrichment
        setIsEnriching(true);
        try {
            const res = await api.get(`/api/geocoding/enrich?address=${encodeURIComponent(suggestion.fullAddress)}`);
            if (res.data.found && res.data.data) {
                const d = res.data.data;
                console.log('Enrichment data:', d);
                setFormData(prev => ({
                    ...prev,
                    // ACCURACY FIX: Do NOT fall back to 'prev' state for enriched fields.
                    // If the API returns null/undefined for a new address, we must show default/empty,
                    // otherwise data from the PREVIOUS address will "leak" through if we use || prev.field
                    bedrooms: d.bedrooms ? Number(d.bedrooms) : 3, // Default 3
                    bathrooms: d.bathrooms ? Number(d.bathrooms) : 2, // Default 2
                    landSize: d.landArea ? d.landArea.replace('m²', '').trim() : '',
                    floorSize: d.floorArea ? d.floorArea.replace('m²', '').trim() : '',
                    rateableValue: d.rateableValue ? String(d.rateableValue) : '',
                    listingPrice: d.listingPrice ? String(d.listingPrice) : '',
                    lastSalePrice: d.lastSoldPrice || '',
                    lastSaleDate: d.lastSoldDate || ''
                }));
            }
        } catch (e) {
            console.error("Enrichment failed", e);
        } finally {
            setIsEnriching(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload: any = {
                address: formData.address,
                type: formData.type,
                status: formData.status,
                ...formData,
                listingPrice: formData.listingPrice ? Number(formData.listingPrice) : null,
                bedrooms: Number(formData.bedrooms),
                bathrooms: Number(formData.bathrooms),
                rateableValue: formData.rateableValue ? Number(formData.rateableValue) : null,
                viewingCount: Number(formData.viewingCount),
                inquiryCount: Number(formData.inquiryCount),
                createDealFlowCard: formData.createDealFlowCard,
                saleMethod: formData.saleMethod,
                dealStage: formData.dealStage,
                lastSalePrice: formData.lastSalePrice ? Number(formData.lastSalePrice.replace(/[^0-9.]/g, '')) : null,
                lastSaleDate: formData.lastSaleDate ? new Date(formData.lastSaleDate).toISOString() : null
            };

            // Include vendor data for both new properties and updates
            if (formData.vendorFirstName || formData.vendorLastName || formData.vendorEmail || formData.vendorPhone) {
                payload.vendor = {
                    firstName: formData.vendorFirstName,
                    lastName: formData.vendorLastName,
                    email: formData.vendorEmail,
                    phone: formData.vendorPhone
                };
            }

            console.log('Submitting property:', payload);
            let response;
            if (initialData?.id) {
                response = await api.put(`/api/properties/${initialData.id}`, payload);
            } else {
                response = await api.post('/api/properties', payload);
            }
            onSave(response.data.property);
            onClose();
        } catch (error: any) {
            console.error('Failed to save property:', error);
            const errorMessage = error.message || 'Failed to save property. Please check all required fields.';
            alert(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    const increment = (field: 'bedrooms' | 'bathrooms') => {
        setFormData(prev => ({ ...prev, [field]: prev[field] + 1 }));
    };

    const decrement = (field: 'bedrooms' | 'bathrooms') => {
        setFormData(prev => ({ ...prev, [field]: Math.max(0, prev[field] - 1) }));
    };

    const handleMagicPaste = async () => {
        if (!magicText.trim()) return;
        setIsParsing(true);
        try {
            const response = await api.post('/api/ask/parse-property', { text: magicText });
            const data = response.data;
            console.log('Magic entry parsed:', data);

            setFormData(prev => ({
                ...prev,
                address: data.address || prev.address,
                type: (data.type as PropertyType) || prev.type,
                listingPrice: data.listingPrice ? String(data.listingPrice) : prev.listingPrice,
                bedrooms: data.bedrooms || prev.bedrooms,
                bathrooms: data.bathrooms || prev.bathrooms,
                landSize: data.landSize || prev.landSize,
                floorSize: data.floorSize || prev.floorSize,
                description: data.description || prev.description,
                // Vendor fields handling - updated to match backend structure
                vendorFirstName: data.vendor?.firstName || prev.vendorFirstName,
                vendorLastName: data.vendor?.lastName || prev.vendorLastName,
                vendorEmail: data.vendor?.email || prev.vendorEmail,
                vendorPhone: data.vendor?.phone || prev.vendorPhone,
                rateableValue: data.rateableValue ? String(data.rateableValue) : prev.rateableValue
            }));

            setShowMagicInput(false);
        } catch (error) {
            console.error('Magic paste failed:', error);
            alert('Could not parse listing. Please fill manually.');
        } finally {
            setIsParsing(false);
        }
    };

    return createPortal(
        <div className="add-property-modal-overlay" onClick={onClose}>
            <div className="add-property-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="apm-header">
                    <div className="apm-title">
                        <h2>{title}</h2>
                        {initialData?.address && (
                            <div className="zena-prefill-badge" style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(129, 140, 248, 0.1))',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                borderRadius: '12px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                color: '#38bdf8',
                                marginLeft: '12px',
                                fontWeight: 500
                            }}>
                                <Sparkles size={12} />
                                <span>Pre-filled from your search</span>
                            </div>
                        )}
                    </div>
                    <button className="apm-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Magic Entry Toggle */}
                {!showMagicInput && (
                    <div className="apm-magic-banner">
                        <button className="apm-magic-btn" onClick={() => setShowMagicInput(true)}>
                            <Sparkles size={16} />
                            <span>Magic Fill from Text/URL</span>
                        </button>
                    </div>
                )}

                {/* Magic Input Area */}
                {showMagicInput && (
                    <div className="apm-magic-area">
                        <div className="apm-magic-header">
                            <Wand2 size={16} />
                            <span>Paste Listing Text</span>
                            <button className="apm-magic-close" onClick={() => setShowMagicInput(false)}><X size={14} /></button>
                        </div>
                        <textarea
                            className="apm-magic-textarea"
                            placeholder="Paste specific property details, a URL summary, or an email info dump here..."
                            value={magicText}
                            onChange={(e) => setMagicText(e.target.value)}
                            autoFocus
                        />
                        <button
                            className="apm-magic-action-btn"
                            onClick={handleMagicPaste}
                            disabled={isParsing || !magicText.trim()}
                        >
                            {isParsing ? <Loader2 size={16} className="apm-spin" /> : <Sparkles size={16} />}
                            {isParsing ? 'Analyzing...' : 'Auto-Fill Form'}
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="apm-body">
                    <form id="apm-form" onSubmit={handleSubmit}>
                        {/* Section 1: Basic Info */}
                        <div className="apm-section">
                            <div className="apm-section-title">
                                Basic Information
                            </div>

                            <div className="apm-field-group">
                                <label className="apm-label">Property Address</label>
                                <div className="apm-input-wrapper" style={{ position: 'relative' }}>
                                    <MapPin size={16} className="apm-input-icon" />
                                    <input
                                        type="text"
                                        className="apm-input"
                                        placeholder="Start typing an address..."
                                        value={formData.address}
                                        onChange={e => {
                                            setFormData({ ...formData, address: e.target.value });
                                            setShowAddressDropdown(true);
                                        }}
                                        onFocus={() => setShowAddressDropdown(true)}
                                        onBlur={() => {
                                            // Delay to allow click on suggestion to register
                                            setTimeout(() => setShowAddressDropdown(false), 200);
                                        }}
                                        required
                                        autoFocus
                                    />
                                    {isEnriching && (
                                        <div style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            color: '#38bdf8',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            animation: 'pulse 1.5s infinite ease-in-out'
                                        }}>
                                            <Loader2 size={12} className="apm-spin" />
                                            <span>Fetching details... (this could take 1-2 minutes)</span>
                                        </div>
                                    )}
                                    {/* Address suggestions dropdown */}
                                    {showAddressDropdown && addressSuggestions.length > 0 && (
                                        <div className="apm-address-dropdown" style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))',
                                            border: '1px solid rgba(56, 189, 248, 0.3)',
                                            borderRadius: '8px',
                                            marginTop: '4px',
                                            maxHeight: '220px',
                                            overflowY: 'auto',
                                            zIndex: 100,
                                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(56, 189, 248, 0.1)',
                                            backdropFilter: 'blur(12px)'
                                        }}>
                                            <div style={{
                                                padding: '8px 12px',
                                                fontSize: '11px',
                                                color: '#38bdf8',
                                                borderBottom: '1px solid rgba(56, 189, 248, 0.1)',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                📍 NZ Addresses
                                            </div>
                                            {addressSuggestions.map(suggestion => (
                                                <button
                                                    key={suggestion.id}
                                                    type="button"
                                                    onClick={() => handleAddressSelect(suggestion)}
                                                    style={{
                                                        display: 'block',
                                                        width: '100%',
                                                        padding: '10px 12px',
                                                        textAlign: 'left',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: '#e2e8f0',
                                                        fontSize: '13px',
                                                        transition: 'background 0.15s ease'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    {suggestion.fullAddress}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="apm-grid-2">
                                <div className="apm-field-group">
                                    <label className="apm-label">Property Type</label>
                                    <div className="apm-input-wrapper">
                                        <Home size={16} className="apm-input-icon" />
                                        <select
                                            className="apm-input"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value as PropertyType })}
                                        >
                                            <option value="residential">Residential</option>
                                            <option value="commercial">Commercial</option>
                                            <option value="land">Land</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="apm-field-group">
                                    <label className="apm-label">Current Status</label>
                                    <div className="apm-input-wrapper">
                                        <Tag size={16} className="apm-input-icon" />
                                        <select
                                            className="apm-input"
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value as PropertyStatus })}
                                        >
                                            <option value="active">Active</option>
                                            <option value="under_contract">Under Contract</option>
                                            <option value="sold">Sold</option>
                                            <option value="withdrawn">Withdrawn</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Specifications */}
                        <div className="apm-section">
                            <div className="apm-section-title">
                                Specifications & Pricing
                            </div>

                            <div className="apm-grid-2">
                                <div className="apm-field-group">
                                    <label className="apm-label">Listing Price</label>
                                    <div className="apm-input-wrapper">
                                        <DollarSign size={16} className="apm-input-icon" />
                                        <input
                                            type="number"
                                            className="apm-input"
                                            placeholder="e.g. 1250000"
                                            value={formData.listingPrice}
                                            onChange={e => setFormData({ ...formData, listingPrice: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="apm-field-group">
                                    <label className="apm-label">Floor Area (e.g. 180m²)</label>
                                    <div className="apm-input-wrapper">
                                        <Maximize size={16} className="apm-input-icon" />
                                        <input
                                            type="text"
                                            className="apm-input"
                                            placeholder="e.g. 180m²"
                                            value={formData.floorSize}
                                            onChange={e => setFormData({ ...formData, floorSize: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="apm-field-group">
                                    <label className="apm-label">Land Area (e.g. 650m²)</label>
                                    <div className="apm-input-wrapper">
                                        <Maximize size={16} className="apm-input-icon" />
                                        <input
                                            type="text"
                                            className="apm-input"
                                            placeholder="e.g. 650m²"
                                            value={formData.landSize}
                                            onChange={e => setFormData({ ...formData, landSize: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="apm-grid-2">
                                <div className="apm-field-group">
                                    <label className="apm-label">Rateable Value (RV)</label>
                                    <div className="apm-input-wrapper">
                                        <DollarSign size={16} className="apm-input-icon" />
                                        <input
                                            type="number"
                                            className="apm-input"
                                            placeholder="e.g. 1000000"
                                            value={formData.rateableValue}
                                            onChange={e => setFormData({ ...formData, rateableValue: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="apm-grid-2">
                                <div className="apm-field-group">
                                    <label className="apm-label">Last Sale Price</label>
                                    <div className="apm-input-wrapper">
                                        <DollarSign size={16} className="apm-input-icon" />
                                        <input
                                            type="text"
                                            className="apm-input"
                                            placeholder="Unknown"
                                            value={formData.lastSalePrice}
                                            onChange={e => setFormData({ ...formData, lastSalePrice: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="apm-field-group">
                                    <label className="apm-label">Last Sale Date</label>
                                    <div className="apm-input-wrapper">
                                        <Activity size={16} className="apm-input-icon" />
                                        <input
                                            type="text"
                                            className="apm-input"
                                            placeholder="Unknown"
                                            value={formData.lastSaleDate}
                                            onChange={e => setFormData({ ...formData, lastSaleDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="apm-grid-2">
                                <div className="apm-field-group">
                                    <label className="apm-label">Bedrooms</label>
                                    <div className="apm-counter">
                                        <button type="button" className="apm-counter-btn" onClick={() => decrement('bedrooms')}><Minus size={14} /></button>
                                        <span className="apm-counter-value">{formData.bedrooms}</span>
                                        <button type="button" className="apm-counter-btn" onClick={() => increment('bedrooms')}><Plus size={14} /></button>
                                    </div>
                                </div>
                                <div className="apm-field-group">
                                    <label className="apm-label">Bathrooms</label>
                                    <div className="apm-counter">
                                        <button type="button" className="apm-counter-btn" onClick={() => decrement('bathrooms')}><Minus size={14} /></button>
                                        <span className="apm-counter-value">{formData.bathrooms}</span>
                                        <button type="button" className="apm-counter-btn" onClick={() => increment('bathrooms')}><Plus size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2b: Engagement Stats */}
                        <div className="apm-section">
                            <div className="apm-section-title">
                                Engagement Stats
                            </div>
                            <div className="apm-grid-2">
                                <div className="apm-field-group">
                                    <label className="apm-label">Inquiries</label>
                                    <div className="apm-input-wrapper">
                                        <Users size={16} className="apm-input-icon" />
                                        <input
                                            type="number"
                                            className="apm-input"
                                            placeholder="0"
                                            value={formData.inquiryCount}
                                            onChange={e => setFormData({ ...formData, inquiryCount: e.target.value })}
                                            min="0"
                                        />
                                    </div>
                                </div>
                                <div className="apm-field-group">
                                    <label className="apm-label">Viewings</label>
                                    <div className="apm-input-wrapper">
                                        <MapPin size={16} className="apm-input-icon" />
                                        <input
                                            type="number"
                                            className="apm-input"
                                            placeholder="0"
                                            value={formData.viewingCount}
                                            onChange={e => setFormData({ ...formData, viewingCount: e.target.value })}
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Additional Details */}
                        <div className="apm-section">
                            <div className="apm-section-title">Details</div>
                            <div className="apm-field-group">
                                <label className="apm-label">Description / Notes</label>
                                <textarea
                                    className="apm-input no-icon"
                                    rows={3}
                                    placeholder="Stunning modern villa with panoramic views..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    style={{ resize: 'none' }}
                                />
                            </div>
                        </div>

                        {/* Section 4: Deal Flow Setup (NEW) */}
                        <div className="apm-section">
                            <div className="apm-section-title">
                                <Sparkles size={16} style={{ marginRight: '8px', color: '#8B5CF6' }} />
                                Deal Flow Integration
                            </div>

                            <div className="apm-deal-flow-section">
                                <div className="apm-toggle-wrapper">
                                    <div className="apm-toggle-info">
                                        <div className="apm-toggle-title">Create Deal Flow Card?</div>
                                        <div className="apm-toggle-desc">Automatically add this to your pipeline for tracking progress</div>
                                    </div>
                                    <label className="apm-toggle">
                                        <input
                                            type="checkbox"
                                            checked={formData.createDealFlowCard}
                                            onChange={e => setFormData({ ...formData, createDealFlowCard: e.target.checked })}
                                        />
                                        <span className="apm-toggle-slider" />
                                    </label>
                                </div>

                                {formData.createDealFlowCard && (
                                    <div className="apm-grid-2" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                        <div className="apm-field-group">
                                            <label className="apm-label">Sale Method</label>
                                            <div className="apm-input-wrapper">
                                                <Tag size={16} className="apm-input-icon" />
                                                <select
                                                    className="apm-input"
                                                    value={formData.saleMethod}
                                                    onChange={e => setFormData({ ...formData, saleMethod: e.target.value as any })}
                                                >
                                                    <option value="auction">Auction</option>
                                                    <option value="negotiation">Negotiation</option>
                                                    <option value="tender">Tender</option>
                                                    <option value="deadline_sale">Deadline Sale</option>
                                                    <option value="asking_price">Asking Price</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="apm-field-group">
                                            <label className="apm-label">Deal Stage</label>
                                            <div className="apm-input-wrapper">
                                                <Activity size={16} className="apm-input-icon" />
                                                <select
                                                    className="apm-input"
                                                    value={formData.dealStage}
                                                    onChange={e => setFormData({ ...formData, dealStage: e.target.value })}
                                                >
                                                    <option value="buyer_consult">Consult (Standard)</option>
                                                    <option value="appraisal">Appraisal</option>
                                                    <option value="listing_signed">Listing Signed</option>
                                                    <option value="marketing">Marketing</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 5: Vendor Contact (Required) */}
                        <div className="apm-section">
                            <div className="apm-section-title">
                                <Users size={16} style={{ marginRight: '8px' }} />
                                Vendor Contact <span className="apm-required">*</span>
                            </div>

                            <div className="apm-grid-2">
                                <div className="apm-field-group">
                                    <label className="apm-label">First Name <span className="apm-required">*</span></label>
                                    <div className="apm-input-wrapper">
                                        <User size={16} className="apm-input-icon" />
                                        <input
                                            type="text"
                                            className="apm-input"
                                            placeholder="e.g. John"
                                            value={formData.vendorFirstName}
                                            onChange={e => setFormData({ ...formData, vendorFirstName: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="apm-field-group">
                                    <label className="apm-label">Last Name <span className="apm-required">*</span></label>
                                    <div className="apm-input-wrapper">
                                        <User size={16} className="apm-input-icon" />
                                        <input
                                            type="text"
                                            className="apm-input"
                                            placeholder="e.g. Smith"
                                            value={formData.vendorLastName}
                                            onChange={e => setFormData({ ...formData, vendorLastName: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="apm-grid-2">
                                <div className="apm-field-group">
                                    <label className="apm-label">Email Address <span className="apm-required">*</span></label>
                                    <div className="apm-input-wrapper">
                                        <Mail size={16} className="apm-input-icon" />
                                        <input
                                            type="email"
                                            className="apm-input"
                                            placeholder="e.g. john.smith@email.com"
                                            value={formData.vendorEmail}
                                            onChange={e => setFormData({ ...formData, vendorEmail: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="apm-field-group">
                                    <label className="apm-label">Phone Number <span className="apm-required">*</span></label>
                                    <div className="apm-input-wrapper">
                                        <Phone size={16} className="apm-input-icon" />
                                        <input
                                            type="tel"
                                            className="apm-input"
                                            placeholder="e.g. +64 21 123 4567"
                                            value={formData.vendorPhone}
                                            onChange={e => setFormData({ ...formData, vendorPhone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="apm-footer">
                    <button type="button" className="apm-btn apm-btn-secondary" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </button>
                    <button type="submit" form="apm-form" className="apm-btn apm-btn-primary" disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="apm-spin" />
                                Saving...
                            </>
                        ) : initialData ? 'Update Property' : 'Add Property'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
