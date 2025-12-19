/**
 * SmartReplySuggestions Component
 * 
 * AI-powered quick reply suggestions based on email context.
 * Analyzes thread content to suggest relevant responses.
 */

import React, { useMemo } from 'react';
import './SmartReplySuggestions.css';

interface SmartReplySuggestionsProps {
    threadSubject: string;
    classification?: string;
    category?: string;
    onSelectSuggestion: (suggestion: string) => void;
}

interface Suggestion {
    icon: string;
    label: string;
    message: string;
}

// Context-aware suggestion templates for real estate scenarios
const getSuggestionsForContext = (
    subject: string,
    classification?: string,
    _category?: string  // Prefix with _ to indicate intentionally unused
): Suggestion[] => {
    const subjectLower = subject.toLowerCase();

    // Viewing/Inspection related
    if (subjectLower.includes('viewing') || subjectLower.includes('inspection') || subjectLower.includes('open home')) {
        return [
            {
                icon: '📅',
                label: 'Confirm viewing',
                message: 'Thank you for your interest. I can confirm the viewing time works for us. I\'ll see you then! Please let me know if you have any questions beforehand.'
            },
            {
                icon: '🔄',
                label: 'Reschedule',
                message: 'Thank you for your interest. Unfortunately that time doesn\'t work for me. Would any of the following times suit you instead?'
            },
            {
                icon: '📍',
                label: 'Send address',
                message: 'Great, I look forward to showing you the property. The address is [PROPERTY ADDRESS]. Please park in the driveway and I\'ll meet you at the front door.'
            },
            {
                icon: '❌',
                label: 'Sold/Under offer',
                message: 'Thank you for your interest in this property. Unfortunately, this property is now under contract. However, I do have some similar properties that may interest you. Would you like me to send through some options?'
            }
        ];
    }

    // Price/Valuation related
    if (subjectLower.includes('price') || subjectLower.includes('valuation') || subjectLower.includes('appraisal') || subjectLower.includes('worth')) {
        return [
            {
                icon: '📊',
                label: 'Request details',
                message: 'Thank you for reaching out. To provide you with an accurate price guide, could you please confirm the property address and any recent updates or renovations?'
            },
            {
                icon: '📈',
                label: 'Send price guide',
                message: 'Based on recent comparable sales in the area, I would estimate the property value in the range of $[PRICE RANGE]. I\'d be happy to discuss this in more detail at a time that suits you.'
            },
            {
                icon: '🏠',
                label: 'Offer appraisal',
                message: 'I\'d be happy to provide a comprehensive market appraisal. This is a free service with no obligation. When would be a convenient time for me to visit the property?'
            }
        ];
    }

    // Offer/Negotiation related
    if (subjectLower.includes('offer') || subjectLower.includes('negotiate') || subjectLower.includes('contract')) {
        return [
            {
                icon: '✅',
                label: 'Accept offer',
                message: 'Great news! The vendor has accepted your offer. I\'ll prepare the contract and send it through for your review. Congratulations!'
            },
            {
                icon: '💬',
                label: 'Counter offer',
                message: 'Thank you for your offer. The vendor has reviewed it and would like to propose [COUNTER TERMS]. Would you like to discuss this further?'
            },
            {
                icon: '⏳',
                label: 'Need time',
                message: 'Thank you for your offer. The vendor is currently reviewing it and will get back to you by [DATE]. I\'ll be in touch as soon as I have an update.'
            },
            {
                icon: '❌',
                label: 'Decline offer',
                message: 'Thank you for your offer. Unfortunately, the vendor has decided not to accept at this time. If circumstances change, I\'ll be sure to let you know.'
            }
        ];
    }

    // Selling related
    if (subjectLower.includes('sell') || subjectLower.includes('list') || subjectLower.includes('commission')) {
        return [
            {
                icon: '📋',
                label: 'Marketing plan',
                message: 'Thank you for considering me to sell your property. I\'d love to meet and discuss my marketing strategy and how I can achieve the best possible price for you.'
            },
            {
                icon: '💰',
                label: 'Commission discussion',
                message: 'Thank you for your enquiry. I\'d be happy to discuss my fee structure and the services included. When would be a good time for a call?'
            },
            {
                icon: '📸',
                label: 'Photography',
                message: 'Great! I\'ll arrange for our professional photographer to visit the property. Can you please let me know a few dates and times that would work for you?'
            }
        ];
    }

    // Settlement/Legal related
    if (subjectLower.includes('settlement') || subjectLower.includes('solicitor') || subjectLower.includes('lawyer') || subjectLower.includes('legal')) {
        return [
            {
                icon: '📝',
                label: 'Request docs',
                message: 'Thank you for your message. Could you please send through the required documents at your earliest convenience so we can keep things moving smoothly?'
            },
            {
                icon: '⚡',
                label: 'Urgent action',
                message: 'This is a priority matter that requires immediate attention. Please action this as soon as possible to avoid any delays to settlement.'
            },
            {
                icon: '📅',
                label: 'Confirm date',
                message: 'I can confirm the settlement is scheduled for [DATE]. Please let me know if your client has everything in order.'
            }
        ];
    }

    // Default suggestions based on classification
    if (classification === 'Buyer Inquiry') {
        return [
            {
                icon: '👋',
                label: 'Intro & qualify',
                message: 'Thank you for your enquiry. I\'d love to learn more about what you\'re looking for. Are you pre-approved for finance, and what\'s your ideal timeframe for purchasing?'
            },
            {
                icon: '🏠',
                label: 'Send more properties',
                message: 'Thank you for your interest. I have a few other properties that might suit your needs. Would you like me to send through some options?'
            },
            {
                icon: '📞',
                label: 'Schedule call',
                message: 'I\'d be happy to discuss this further. When would be a good time for a quick call?'
            }
        ];
    }

    // Generic fallback suggestions
    return [
        {
            icon: '👋',
            label: 'Acknowledge',
            message: 'Thank you for your message. I\'ve received this and will get back to you shortly.'
        },
        {
            icon: '📞',
            label: 'Request call',
            message: 'Thank you for reaching out. I\'d like to discuss this further. When would be a convenient time for a call?'
        },
        {
            icon: '✉️',
            label: 'More info',
            message: 'Thank you for your enquiry. Could you please provide some more details so I can assist you better?'
        }
    ];
};

export const SmartReplySuggestions: React.FC<SmartReplySuggestionsProps> = ({
    threadSubject,
    classification,
    category,
    onSelectSuggestion
}) => {
    const suggestions = useMemo(() =>
        getSuggestionsForContext(threadSubject, classification, category),
        [threadSubject, classification, category]
    );

    if (suggestions.length === 0) return null;

    return (
        <div className="smart-reply-suggestions">
            <div className="smart-reply-suggestions__header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                AI Suggestions
            </div>
            <div className="smart-reply-suggestions__list">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        className="smart-reply-suggestions__chip"
                        onClick={() => onSelectSuggestion(suggestion.message)}
                        title={suggestion.message}
                    >
                        <span className="smart-reply-suggestions__chip-icon">{suggestion.icon}</span>
                        <span className="smart-reply-suggestions__chip-label">{suggestion.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SmartReplySuggestions;
