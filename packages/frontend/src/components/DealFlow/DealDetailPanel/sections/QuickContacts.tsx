/**
 * QuickContacts - One-tap contact list with call/SMS/email buttons
 */

import React from 'react';
import { Deal } from '../../types';
import './sections.css';

interface QuickContactsProps {
    deal: Deal;
    onCommunicationClick?: (type: 'call' | 'sms' | 'email') => void;
    onNavigateToContact?: (contactId: string) => void;
}

export const QuickContacts: React.FC<QuickContactsProps> = ({ deal, onCommunicationClick, onNavigateToContact }) => {
    return (
        <div className="section-card">
            <div className="section-card__header">
                <span className="section-card__icon">👥</span>
                <span className="section-card__title">Primary Contacts</span>
            </div>

            <div className="contacts-list">
                {deal.contacts?.map((contact) => (
                    <div key={contact.id} className="contact-item">
                        <div className="contact-info" onClick={() => onNavigateToContact?.(contact.id)}>
                            <div className="contact-avatar">{contact.name.charAt(0)}</div>
                            <div className="contact-details">
                                <span className="contact-name">{contact.name}</span>
                                <span className="contact-role">{contact.role}</span>
                            </div>
                        </div>
                        <div className="contact-actions">
                            <button className="contact-action-btn" onClick={() => onCommunicationClick?.('call')}>
                                📞
                            </button>
                            <button className="contact-action-btn" onClick={() => onCommunicationClick?.('sms')}>
                                💬
                            </button>
                            <button className="contact-action-btn" onClick={() => onCommunicationClick?.('email')}>
                                ✉️
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button className="section-action-btn">
                ➕ Add Contact
            </button>
        </div>
    );
};

export default QuickContacts;
