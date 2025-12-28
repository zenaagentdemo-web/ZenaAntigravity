import React, { useState, useEffect } from 'react';
import { PipelineType, SaleMethod, BuyerStage, SellerStage, DealCondition } from './types';
import './NewDealModal.css';

// API base URL
const API_BASE = '/api';

// Fetch function with auth token
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('authToken');
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
}

interface Property {
    id: string;
    address: string;
}

interface Contact {
    id: string;
    name: string;
    email?: string;
}

interface NewDealModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDealCreated?: () => void;
    initialPipelineType?: PipelineType;
}

const BUYER_STAGES: { value: BuyerStage; label: string }[] = [
    { value: 'buyer_consult', label: 'Buyer Consult' },
    { value: 'shortlisting', label: 'Shortlisting' },
    { value: 'viewings', label: 'Viewings' },
    { value: 'offer_made', label: 'Offer Made' },
    { value: 'conditional', label: 'Conditional' },
    { value: 'unconditional', label: 'Unconditional' },
    { value: 'pre_settlement', label: 'Pre-Settlement' }
];

const SELLER_STAGES: { value: SellerStage; label: string }[] = [
    { value: 'appraisal', label: 'Appraisal' },
    { value: 'listing_signed', label: 'Listing Signed' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'offers_received', label: 'Offers Received' },
    { value: 'conditional', label: 'Conditional' },
    { value: 'unconditional', label: 'Unconditional' },
    { value: 'pre_settlement', label: 'Pre-Settlement' }
];

const SALE_METHODS: { value: SaleMethod; label: string }[] = [
    { value: 'negotiation', label: 'Negotiation / By Enquiry' },
    { value: 'auction', label: 'Auction' },
    { value: 'tender', label: 'Tender' },
    { value: 'deadline_sale', label: 'Deadline Sale' }
];

const DEFAULT_CONDITIONS: Partial<DealCondition>[] = [
    { type: 'finance', label: 'Finance Approval' },
    { type: 'building_report', label: 'Building Report' },
    { type: 'lim', label: 'LIM Report' },
    { type: 'solicitor', label: 'Solicitor Approval' }
];

export const NewDealModal: React.FC<NewDealModalProps> = ({
    isOpen,
    onClose,
    onDealCreated,
    initialPipelineType = 'buyer'
}) => {
    // Form state
    const [pipelineType, setPipelineType] = useState<PipelineType>(initialPipelineType);
    const [saleMethod, setSaleMethod] = useState<SaleMethod>('negotiation');
    const [stage, setStage] = useState<string>('');
    const [summary, setSummary] = useState('');
    const [dealValue, setDealValue] = useState('');
    const [propertyId, setPropertyId] = useState('');
    const [propertySearch, setPropertySearch] = useState('');
    const [contactId, setContactId] = useState('');
    const [contactSearch, setContactSearch] = useState('');
    const [settlementDate, setSettlementDate] = useState('');
    const [auctionDate, setAuctionDate] = useState('');
    const [tenderCloseDate, setTenderCloseDate] = useState('');
    const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

    // Search results
    const [properties, setProperties] = useState<Property[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
    const [showContactDropdown, setShowContactDropdown] = useState(false);

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setPipelineType(initialPipelineType);
            setSaleMethod('negotiation');
            setStage(initialPipelineType === 'buyer' ? 'buyer_consult' : 'appraisal');
            setSummary('');
            setDealValue('');
            setPropertyId('');
            setPropertySearch('');
            setContactId('');
            setContactSearch('');
            setSettlementDate('');
            setAuctionDate('');
            setTenderCloseDate('');
            setSelectedConditions([]);
            setError(null);
        }
    }, [isOpen, initialPipelineType]);

    // Update default stage when pipeline type changes
    useEffect(() => {
        setStage(pipelineType === 'buyer' ? 'buyer_consult' : 'appraisal');
    }, [pipelineType]);

    // Search properties
    useEffect(() => {
        const searchProperties = async () => {
            if (propertySearch.length < 2) {
                setProperties([]);
                return;
            }

            try {
                const response = await fetchWithAuth(`${API_BASE}/properties?search=${encodeURIComponent(propertySearch)}&limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    setProperties(data.properties || []);
                }
            } catch (err) {
                console.error('Error searching properties:', err);
            }
        };

        const debounce = setTimeout(searchProperties, 300);
        return () => clearTimeout(debounce);
    }, [propertySearch]);

    // Search contacts
    useEffect(() => {
        const searchContacts = async () => {
            if (contactSearch.length < 2) {
                setContacts([]);
                return;
            }

            try {
                const response = await fetchWithAuth(`${API_BASE}/contacts?search=${encodeURIComponent(contactSearch)}&limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    setContacts(data.contacts || []);
                }
            } catch (err) {
                console.error('Error searching contacts:', err);
            }
        };

        const debounce = setTimeout(searchContacts, 300);
        return () => clearTimeout(debounce);
    }, [contactSearch]);

    const handlePropertySelect = (property: Property) => {
        setPropertyId(property.id);
        setPropertySearch(property.address);
        setSummary(property.address);
        setShowPropertyDropdown(false);
    };

    const handleContactSelect = (contact: Contact) => {
        setContactId(contact.id);
        setContactSearch(contact.name);
        setShowContactDropdown(false);
    };

    const toggleCondition = (conditionType: string) => {
        setSelectedConditions(prev =>
            prev.includes(conditionType)
                ? prev.filter(c => c !== conditionType)
                : [...prev, conditionType]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!summary.trim()) {
            setError('Please enter a deal summary');
            return;
        }

        if (!stage) {
            setError('Please select a stage');
            return;
        }

        try {
            setLoading(true);

            // Build conditions array
            const conditions: Partial<DealCondition>[] = [];
            if (selectedConditions.length > 0) {
                for (const conditionType of selectedConditions) {
                    const config = DEFAULT_CONDITIONS.find(c => c.type === conditionType);
                    if (config) {
                        // Default deadline: 10 working days for most conditions
                        const defaultDays = conditionType === 'lim' ? 5 : 10;
                        const dueDate = new Date();
                        dueDate.setDate(dueDate.getDate() + defaultDays);

                        conditions.push({
                            id: crypto.randomUUID(),
                            type: config.type,
                            label: config.label || conditionType,
                            dueDate: dueDate.toISOString(),
                            status: 'pending'
                        });
                    }
                }
            }

            const dealData: Record<string, unknown> = {
                pipelineType,
                saleMethod,
                stage,
                summary: summary.trim(),
                dealValue: dealValue ? parseFloat(dealValue.replace(/[^0-9.]/g, '')) : undefined,
                propertyId: propertyId || undefined,
                contactIds: contactId ? [contactId] : undefined,
                conditions: conditions.length > 0 ? conditions : undefined,
                settlementDate: settlementDate ? new Date(settlementDate).toISOString() : undefined,
                auctionDate: auctionDate ? new Date(auctionDate).toISOString() : undefined,
                tenderCloseDate: tenderCloseDate ? new Date(tenderCloseDate).toISOString() : undefined
            };

            const response = await fetchWithAuth(`${API_BASE}/deals`, {
                method: 'POST',
                body: JSON.stringify(dealData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error?.message || 'Failed to create deal');
            }

            onClose();
            onDealCreated?.();
        } catch (err) {
            console.error('Error creating deal:', err);
            setError(err instanceof Error ? err.message : 'Failed to create deal');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const stages = pipelineType === 'buyer' ? BUYER_STAGES : SELLER_STAGES;
    const showAuctionDate = saleMethod === 'auction';
    const showTenderDate = saleMethod === 'tender' || saleMethod === 'deadline_sale';
    const showConditions = saleMethod !== 'auction'; // Auctions are unconditional

    return (
        <>
            {/* Backdrop */}
            <div className="new-deal-modal__backdrop" onClick={onClose} />

            {/* Modal */}
            <div className="new-deal-modal">
                <div className="new-deal-modal__header">
                    <h2 className="new-deal-modal__title">New Deal</h2>
                    <button className="new-deal-modal__close" onClick={onClose}>×</button>
                </div>

                <form className="new-deal-modal__form" onSubmit={handleSubmit}>
                    {/* Pipeline Type Toggle */}
                    <div className="new-deal-modal__field">
                        <label className="new-deal-modal__label">Pipeline</label>
                        <div className="new-deal-modal__toggle">
                            <button
                                type="button"
                                className={`new-deal-modal__toggle-btn ${pipelineType === 'buyer' ? 'new-deal-modal__toggle-btn--active' : ''}`}
                                onClick={() => setPipelineType('buyer')}
                            >
                                Buyer
                            </button>
                            <button
                                type="button"
                                className={`new-deal-modal__toggle-btn ${pipelineType === 'seller' ? 'new-deal-modal__toggle-btn--active' : ''}`}
                                onClick={() => setPipelineType('seller')}
                            >
                                Seller
                            </button>
                        </div>
                    </div>

                    {/* Sale Method */}
                    <div className="new-deal-modal__field">
                        <label className="new-deal-modal__label">Sale Method</label>
                        <select
                            className="new-deal-modal__select"
                            value={saleMethod}
                            onChange={(e) => setSaleMethod(e.target.value as SaleMethod)}
                        >
                            {SALE_METHODS.map(method => (
                                <option key={method.value} value={method.value}>{method.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Property Search */}
                    <div className="new-deal-modal__field">
                        <label className="new-deal-modal__label">Property</label>
                        <div className="new-deal-modal__autocomplete">
                            <input
                                type="text"
                                className="new-deal-modal__input"
                                placeholder="Search property address..."
                                value={propertySearch}
                                onChange={(e) => {
                                    setPropertySearch(e.target.value);
                                    setPropertyId('');
                                    setShowPropertyDropdown(true);
                                }}
                                onFocus={() => setShowPropertyDropdown(true)}
                            />
                            {showPropertyDropdown && properties.length > 0 && (
                                <div className="new-deal-modal__dropdown">
                                    {properties.map(property => (
                                        <button
                                            key={property.id}
                                            type="button"
                                            className="new-deal-modal__dropdown-item"
                                            onClick={() => handlePropertySelect(property)}
                                        >
                                            {property.address}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contact Search */}
                    <div className="new-deal-modal__field">
                        <label className="new-deal-modal__label">{pipelineType === 'buyer' ? 'Buyer' : 'Vendor'}</label>
                        <div className="new-deal-modal__autocomplete">
                            <input
                                type="text"
                                className="new-deal-modal__input"
                                placeholder="Search contact..."
                                value={contactSearch}
                                onChange={(e) => {
                                    setContactSearch(e.target.value);
                                    setContactId('');
                                    setShowContactDropdown(true);
                                }}
                                onFocus={() => setShowContactDropdown(true)}
                            />
                            {showContactDropdown && contacts.length > 0 && (
                                <div className="new-deal-modal__dropdown">
                                    {contacts.map(contact => (
                                        <button
                                            key={contact.id}
                                            type="button"
                                            className="new-deal-modal__dropdown-item"
                                            onClick={() => handleContactSelect(contact)}
                                        >
                                            {contact.name}
                                            {contact.email && <span className="new-deal-modal__dropdown-sub">{contact.email}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="new-deal-modal__field">
                        <label className="new-deal-modal__label">Summary *</label>
                        <input
                            type="text"
                            className="new-deal-modal__input"
                            placeholder="Deal summary (e.g., property address)"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            required
                        />
                    </div>

                    {/* Deal Value */}
                    <div className="new-deal-modal__field">
                        <label className="new-deal-modal__label">Deal Value (NZD)</label>
                        <input
                            type="text"
                            className="new-deal-modal__input"
                            placeholder="e.g., 850000"
                            value={dealValue}
                            onChange={(e) => setDealValue(e.target.value)}
                        />
                    </div>

                    {/* Stage */}
                    <div className="new-deal-modal__field">
                        <label className="new-deal-modal__label">Initial Stage</label>
                        <select
                            className="new-deal-modal__select"
                            value={stage}
                            onChange={(e) => setStage(e.target.value)}
                        >
                            {stages.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Key Dates */}
                    <div className="new-deal-modal__field">
                        <label className="new-deal-modal__label">
                            {showAuctionDate ? 'Auction Date' : showTenderDate ? 'Tender Close Date' : 'Settlement Date'}
                        </label>
                        {showAuctionDate ? (
                            <input
                                type="date"
                                className="new-deal-modal__input"
                                value={auctionDate}
                                onChange={(e) => setAuctionDate(e.target.value)}
                            />
                        ) : showTenderDate ? (
                            <input
                                type="date"
                                className="new-deal-modal__input"
                                value={tenderCloseDate}
                                onChange={(e) => setTenderCloseDate(e.target.value)}
                            />
                        ) : (
                            <input
                                type="date"
                                className="new-deal-modal__input"
                                value={settlementDate}
                                onChange={(e) => setSettlementDate(e.target.value)}
                            />
                        )}
                    </div>

                    {/* Conditions (for non-auction sales) */}
                    {showConditions && (
                        <div className="new-deal-modal__field">
                            <label className="new-deal-modal__label">Conditions</label>
                            <div className="new-deal-modal__conditions">
                                {DEFAULT_CONDITIONS.map(condition => (
                                    <button
                                        key={condition.type}
                                        type="button"
                                        className={`new-deal-modal__condition ${selectedConditions.includes(condition.type!) ? 'new-deal-modal__condition--selected' : ''}`}
                                        onClick={() => toggleCondition(condition.type!)}
                                    >
                                        {condition.label}
                                    </button>
                                ))}
                            </div>
                            <p className="new-deal-modal__hint">
                                Select conditions to track. Default deadlines will be set.
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="new-deal-modal__error">{error}</div>
                    )}

                    {/* Actions */}
                    <div className="new-deal-modal__actions">
                        <button
                            type="button"
                            className="new-deal-modal__btn new-deal-modal__btn--cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="new-deal-modal__btn new-deal-modal__btn--submit"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Deal'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default NewDealModal;
