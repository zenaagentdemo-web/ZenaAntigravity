import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Deal } from '../../types';
import './sections.css';
import { useDealNavigation } from '../../../../hooks/useDealNavigation';
import { api } from '../../../../utils/apiClient';
import { Phone, Mail, ExternalLink, Copy, Check, X, Sparkles, ChevronDown, Plus, Briefcase, Users, Shield, Hammer, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ContactDetailsFetcher } from './ContactDetailsFetcher';
import { NewContactModal } from '../../../../components/NewContactModal/NewContactModal';

interface Contact {
    id: string;
    name: string;
    role: string;
    email?: string;
    phone?: string;
}

// Role configuration for styled pills - matches ContactsPage styling
const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    vendor: { label: 'Vendor', color: '#FF00FF', bg: 'rgba(255, 0, 255, 0.15)', border: 'rgba(255, 0, 255, 0.4)' },
    buyer: { label: 'Buyer', color: '#00D4FF', bg: 'rgba(0, 212, 255, 0.15)', border: 'rgba(0, 212, 255, 0.4)' },
    agent: { label: 'Agent', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.4)' },
    tradesperson: { label: 'Trades', color: '#FF6B35', bg: 'rgba(255, 107, 53, 0.15)', border: 'rgba(255, 107, 53, 0.4)' },
    solicitor: { label: 'Solicitor', color: '#FACC15', bg: 'rgba(250, 204, 21, 0.15)', border: 'rgba(250, 204, 21, 0.4)' },
    other: { label: 'Contact', color: '#ffffff', bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)' },
    // Fix for specific data artifact 'Jab' -> Vendor
    jab: { label: 'Vendor', color: '#FF00FF', bg: 'rgba(255, 0, 255, 0.15)', border: 'rgba(255, 0, 255, 0.4)' },
};

interface QuickContactsProps {
    deal: Deal;
    onCommunicationClick?: (type: 'call' | 'sms' | 'email') => void;
    onNavigateToContact?: (contactId: string) => void;
    onUpdate?: (deal: Deal) => void;
}

export const QuickContacts: React.FC<QuickContactsProps> = ({
    deal,
    onCommunicationClick,
    onNavigateToContact,
    onUpdate
}) => {
    console.log('[QuickContacts] Rendered. onUpdate exists:', !!onUpdate);
    console.log('[QuickContacts] Rendered. onUpdate exists:', !!onUpdate);
    const navigate = useNavigate();
    const { navigateToFromDeal } = useDealNavigation();
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [allContacts, setAllContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
    const [showPhoneFor, setShowPhoneFor] = useState<string | null>(null);
    const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
    const [emailModalContact, setEmailModalContact] = useState<Contact | null>(null);

    const [emailContext, setEmailContext] = useState('');
    const [isDraftingEmail, setIsDraftingEmail] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const emailModalRef = useRef<HTMLDivElement>(null);

    // Filter out contacts already in the deal
    const currentContactIds = new Set(deal.contacts?.map(c => c.id) || []);

    // Pre-load all contacts on mount for instant dropdown
    const loadAllContacts = async () => {
        if (allContacts.length > 0) return; // Already loaded, skip
        setIsLoading(true);
        try {
            const response = await api.get('/api/contacts');
            if (response.data?.contacts) {
                setAllContacts(response.data.contacts);
            }
        } catch (error) {
            console.error('Failed to load contacts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Pre-fetch contacts when component mounts for instant dropdown experience
    useEffect(() => {
        loadAllContacts();
    }, []);

    // Open dropdown (contacts already loaded)
    const handleOpenDropdown = () => {
        setIsAdding(true);
    };

    // Filter contacts based on search query AND exclude already linked contacts
    const filteredContacts = allContacts.filter(c =>
        !currentContactIds.has(c.id) &&
        (searchQuery.length === 0 ||
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.role?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const handleAddContact = async (contact: Contact) => {
        if (!onUpdate) return;

        const updatedDeal = {
            ...deal,
            contacts: [...(deal.contacts || []), {
                id: contact.id,
                name: contact.name,
                role: contact.role || 'Partner',
                email: contact.email,
                phone: contact.phone
            }]
        };

        onUpdate(updatedDeal);
        setIsAdding(false);
        setSearchQuery('');
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsAdding(false);
            }
            if (emailModalRef.current && !emailModalRef.current.contains(event.target as Node)) {
                setEmailModalContact(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleContactClick = (contactId: string) => {
        navigateToFromDeal(`/contacts/${contactId}`, deal.id, deal.property?.address);
    };

    const handlePhoneClick = (contact: Contact, e: React.MouseEvent) => {
        e.stopPropagation();
        setShowPhoneFor(showPhoneFor === contact.id ? null : contact.id);
    };

    const handleCopyPhone = async (phone: string, contactId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(phone);
            setCopiedPhone(contactId);
            toast.success('Phone number copied!');
            setTimeout(() => setCopiedPhone(null), 2000);
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    const handleEmailClick = (contact: Contact, e: React.MouseEvent) => {
        e.stopPropagation();
        setEmailModalContact(contact);
        setEmailContext('');
    };

    const handleDraftEmail = () => {
        if (!emailModalContact) return;

        const context = emailContext.trim() || `Update regarding ${deal.property?.address?.split(',')[0] || 'the property'}`;

        navigate('/ask-zena', {
            state: {
                initialMessage: `Zena, please draft a professional email to ${emailModalContact.name} (${emailModalContact.role}). Context: ${context}`,
                dealContext: {
                    id: deal.id,
                    address: deal.property?.address,
                    contactEmail: emailModalContact.email
                }
            }
        });
        setEmailModalContact(null);
    };

    const handleUnlinkContact = async (contactId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onUpdate) return;

        if (window.confirm('Are you sure you want to unlink this contact from the deal?')) {
            const updatedContacts = deal.contacts?.filter(c => c.id !== contactId) || [];

            // Optimistic Update
            onUpdate({ ...deal, contacts: updatedContacts });
            toast.success('Contact unlinked');

            // Persistent Update
            try {
                // If the backend accepts partial updates to contacts array via PUT /deals/:id
                await api.put(`/api/deals/${deal.id}`, {
                    contacts: updatedContacts
                });
            } catch (err) {
                console.error('[QuickContacts] Failed to persist unlink:', err);
                toast.error('Failed to save changes');
                // Revert optimistic update? Complex without reload, but for now we warn.
            }
        }
    };


    return (
        <div className="section-card linked-contacts-card" ref={dropdownRef}>
            <div className="section-card__header">
                <ExternalLink size={16} className="section-card__icon-lucide" />
                <span className="section-card__title">Linked Contacts</span>
                <span className="linked-badge">Linked</span>
            </div>

            <div className="linked-contacts-list">
                {deal.contacts?.map((contact) => (
                    <div key={contact.id} className="linked-contact-card">
                        <div
                            className="linked-contact-main"
                            onClick={() => setExpandedContactId(expandedContactId === contact.id ? null : contact.id)}
                        >
                            <div className="linked-contact-info">
                                <span className="linked-contact-name">{contact.name}</span>
                                {(contact.role || contact.name.includes('Jimmy Jab')) && (
                                    <span
                                        className="linked-contact-role-pill"
                                        style={{
                                            color: ROLE_CONFIG[(contact.role || 'vendor').toLowerCase()]?.color || ROLE_CONFIG.other.color,
                                            background: ROLE_CONFIG[(contact.role || 'vendor').toLowerCase()]?.bg || ROLE_CONFIG.other.bg,
                                            border: `1px solid ${ROLE_CONFIG[(contact.role || 'vendor').toLowerCase()]?.border || ROLE_CONFIG.other.border}`,
                                        }}
                                    >
                                        {ROLE_CONFIG[(contact.role || (contact.name.includes('Jimmy Jab') ? 'vendor' : 'other')).toLowerCase()]?.label || contact.role}
                                    </span>
                                )}
                            </div>
                            <ChevronDown
                                size={18}
                                className={`linked-contact-chevron ${expandedContactId === contact.id ? 'expanded' : ''}`}
                            />
                        </div>

                        {/* Fetch missing details on expand */}
                        <ContactDetailsFetcher
                            contactId={contact.id}
                            isExpanded={expandedContactId === contact.id}
                            currentEmail={contact.email}
                            currentPhone={contact.phone}
                            onDetailsLoaded={(details) => {
                                if (onUpdate) {
                                    const updatedContacts = deal.contacts?.map(c =>
                                        c.id === contact.id ? { ...c, ...details } : c
                                    );
                                    // Only update if data actually changed to avoid loop
                                    if (updatedContacts && (details.email !== contact.email || details.phone !== contact.phone)) {
                                        onUpdate({ ...deal, contacts: updatedContacts });
                                    }
                                }
                            }}
                        />

                        {expandedContactId === contact.id && (
                            <div className="linked-contact-expanded">
                                <div className="linked-contact-actions">
                                    <button
                                        className="linked-action-btn"
                                        onClick={(e) => handlePhoneClick(contact, e)}
                                    >
                                        <Phone size={16} />
                                        <span>Phone</span>
                                    </button>
                                    <button
                                        className="linked-action-btn"
                                        onClick={(e) => handleEmailClick(contact, e)}
                                    >
                                        <Mail size={16} />
                                        <span>Email</span>
                                    </button>
                                    <button
                                        className="linked-action-btn linked-action-btn--view"
                                        onClick={() => handleContactClick(contact.id)}
                                    >
                                        <ExternalLink size={16} />
                                        <span>View</span>
                                    </button>
                                    <button
                                        className="linked-action-btn linked-action-btn--unlink"
                                        onClick={(e) => handleUnlinkContact(contact.id, e)}
                                        style={{ color: '#ef4444', marginLeft: 'auto' }}
                                    >
                                        <Trash2 size={16} />
                                        <span>Unlink</span>
                                    </button>
                                </div>

                                {showPhoneFor === contact.id && (
                                    <div className="phone-display">
                                        <span className="phone-number">{contact.phone || 'No phone number'}</span>
                                        {contact.phone && (
                                            <button
                                                className="copy-btn"
                                                onClick={(e) => handleCopyPhone(contact.phone!, contact.id, e)}
                                            >
                                                {copiedPhone === contact.id ? (
                                                    <Check size={14} className="copied-icon" />
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {isAdding ? (
                <div className="add-contact-dropdown">
                    <input
                        type="text"
                        className="add-contact-input"
                        placeholder="Filter contacts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <div className="contact-search-results">
                        {isLoading && <div className="contact-search-loading">Loading contacts...</div>}
                        {!isLoading && filteredContacts.length === 0 && (
                            <div className="contact-search-no-results">No contacts found</div>
                        )}
                        {filteredContacts.map(contact => (
                            <div
                                key={contact.id}
                                className="contact-search-item"
                                onClick={() => handleAddContact(contact)}
                            >
                                <span className="contact-search-name">{contact.name}</span>
                                <span className="contact-search-role">{contact.role}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <button className="linked-add-btn" onClick={handleOpenDropdown}>
                    <Plus size={16} />
                    <span>Link Contact</span>
                </button>
            )}

            {/* Email Modal */}
            {emailModalContact && (
                <div className="email-modal-overlay">
                    <div className="email-modal" ref={emailModalRef}>
                        <div className="email-modal__header">
                            <Mail size={20} className="email-modal__icon" />
                            <span>Email {emailModalContact.name}</span>
                            <button className="email-modal__close" onClick={() => setEmailModalContact(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="email-modal__body">
                            <div className="email-modal__recipient">
                                <span className="email-modal__label">To:</span>
                                <span className="email-modal__email">{emailModalContact.email || 'No email address'}</span>
                            </div>
                            <div className="email-modal__context">
                                <label className="email-modal__label">Context for AI draft:</label>
                                <textarea
                                    className="email-modal__textarea"
                                    placeholder="What would you like to say? e.g., 'Follow up on the offer', 'Schedule a viewing', 'Request documents'..."
                                    value={emailContext}
                                    onChange={(e) => setEmailContext(e.target.value)}
                                    rows={4}
                                />
                            </div>
                        </div>
                        <div className="email-modal__footer">
                            <button className="email-modal__btn email-modal__btn--cancel" onClick={() => setEmailModalContact(null)}>
                                Cancel
                            </button>
                            <button className="email-modal__btn email-modal__btn--draft" onClick={handleDraftEmail}>
                                <Sparkles size={16} />
                                Draft with Zena
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default QuickContacts;

