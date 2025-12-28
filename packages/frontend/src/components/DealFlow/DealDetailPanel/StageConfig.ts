/**
 * StageConfig - Stage-specific configuration for deal detail panel
 * Defines what sections to show, priority, and quick actions per stage
 */

import { DealStage, PipelineType } from '../types';

export type SectionId =
    | 'blocker'
    | 'contacts'
    | 'searchCriteria'
    | 'properties'
    | 'viewings'
    | 'offerDetails'
    | 'conditions'
    | 'keyDates'
    | 'settlement'
    | 'preInspection'
    | 'commission'
    | 'zenaCoaching'
    | 'followUp'
    | 'marketingStats'
    | 'offers';

export type SectionPriority = 'always' | 'when_relevant' | 'collapsed' | 'hidden';

export interface SectionConfig {
    id: SectionId;
    priority: SectionPriority;
    order: number;
}

export interface QuickAction {
    id: string;
    label: string;
    icon: string;
    primary?: boolean;
    action: 'call' | 'sms' | 'email' | 'schedule' | 'navigate' | 'custom';
    target?: string; // e.g., 'buyer', 'seller', 'solicitor'
}

export interface StageConfiguration {
    stage: DealStage;
    pipelineType: PipelineType;
    sections: SectionConfig[];
    primaryFocus: string;
    blockerTypes: string[];
    coachingFocus: string;
    quickActions: QuickAction[];
}

// ============================================================
// BUYER PIPELINE STAGE CONFIGS
// ============================================================

const BUYER_CONSULT_CONFIG: StageConfiguration = {
    stage: 'buyer_consult',
    pipelineType: 'buyer',
    primaryFocus: 'Qualifying the buyer and understanding their needs',
    blockerTypes: ['no_preapproval', 'unclear_criteria', 'unresponsive'],
    coachingFocus: 'Qualification and relationship building',
    sections: [
        { id: 'contacts', priority: 'always', order: 1 },
        { id: 'searchCriteria', priority: 'always', order: 2 },
        { id: 'blocker', priority: 'when_relevant', order: 3 },
        { id: 'zenaCoaching', priority: 'always', order: 4 },
        { id: 'keyDates', priority: 'when_relevant', order: 5 },
    ],
    quickActions: [
        { id: 'call-buyer', label: 'Call', icon: '📞', primary: true, action: 'call', target: 'buyer' },
        { id: 'sms-buyer', label: 'Text', icon: '💬', action: 'sms', target: 'buyer' },
        { id: 'schedule', label: 'Schedule', icon: '📅', action: 'schedule' },
        { id: 'refer-broker', label: 'Refer Broker', icon: '🏦', action: 'custom' },
    ],
};

const SHORTLISTING_CONFIG: StageConfiguration = {
    stage: 'shortlisting',
    pipelineType: 'buyer',
    primaryFocus: 'Matching properties to buyer criteria',
    blockerTypes: ['no_response', 'criteria_mismatch', 'disengaged'],
    coachingFocus: 'Engagement and property matching',
    sections: [
        { id: 'searchCriteria', priority: 'always', order: 1 },
        { id: 'properties', priority: 'always', order: 2 },
        { id: 'contacts', priority: 'always', order: 3 },
        { id: 'blocker', priority: 'when_relevant', order: 4 },
        { id: 'zenaCoaching', priority: 'always', order: 5 },
    ],
    quickActions: [
        { id: 'share-properties', label: 'Share', icon: '🏠', primary: true, action: 'custom' },
        { id: 'call-buyer', label: 'Call', icon: '📞', action: 'call', target: 'buyer' },
        { id: 'book-viewings', label: 'Viewings', icon: '📅', action: 'schedule' },
    ],
};

const VIEWINGS_CONFIG: StageConfiguration = {
    stage: 'viewings',
    pipelineType: 'buyer',
    primaryFocus: 'Managing viewings and gathering feedback',
    blockerTypes: ['scheduling', 'indecisive', 'partner_disagreement', 'competing_buyers'],
    coachingFocus: 'Moving from browsing to buying',
    sections: [
        { id: 'viewings', priority: 'always', order: 1 },
        { id: 'properties', priority: 'always', order: 2 },
        { id: 'contacts', priority: 'always', order: 3 },
        { id: 'blocker', priority: 'when_relevant', order: 4 },
        { id: 'zenaCoaching', priority: 'always', order: 5 },
    ],
    quickActions: [
        { id: 'schedule-viewing', label: 'Book Viewing', icon: '📅', primary: true, action: 'schedule' },
        { id: 'call-feedback', label: 'Get Feedback', icon: '📞', action: 'call', target: 'buyer' },
        { id: 'hot-property', label: 'Hot Property!', icon: '🔥', action: 'custom' },
    ],
};

const OFFER_MADE_CONFIG: StageConfiguration = {
    stage: 'offer_made',
    pipelineType: 'buyer',
    primaryFocus: 'Tracking offer and negotiation strategy',
    blockerTypes: ['waiting_response', 'multi_offer', 'cold_feet'],
    coachingFocus: 'Negotiation and closing',
    sections: [
        { id: 'offerDetails', priority: 'always', order: 1 },
        { id: 'blocker', priority: 'always', order: 2 },
        { id: 'contacts', priority: 'always', order: 3 },
        { id: 'keyDates', priority: 'always', order: 4 },
        { id: 'zenaCoaching', priority: 'always', order: 5 },
        { id: 'commission', priority: 'when_relevant', order: 6 },
    ],
    quickActions: [
        { id: 'call-listing-agent', label: 'Call Agent', icon: '📞', primary: true, action: 'call', target: 'listing_agent' },
        { id: 'update-buyer', label: 'Update Buyer', icon: '💬', action: 'sms', target: 'buyer' },
        { id: 'revise-offer', label: 'Revise Offer', icon: '✏️', action: 'custom' },
    ],
};

const CONDITIONAL_CONFIG: StageConfiguration = {
    stage: 'conditional',
    pipelineType: 'buyer',
    primaryFocus: 'Tracking conditions and ensuring satisfaction',
    blockerTypes: ['finance_delay', 'building_issues', 'lim_concerns', 'solicitor_delays'],
    coachingFocus: 'Condition management and de-risking',
    sections: [
        { id: 'conditions', priority: 'always', order: 1 },
        { id: 'blocker', priority: 'always', order: 2 },
        { id: 'keyDates', priority: 'always', order: 3 },
        { id: 'contacts', priority: 'always', order: 4 },
        { id: 'zenaCoaching', priority: 'always', order: 5 },
        { id: 'commission', priority: 'always', order: 6 },
    ],
    quickActions: [
        { id: 'chase-finance', label: 'Chase Finance', icon: '📞', primary: true, action: 'call', target: 'broker' },
        { id: 'check-report', label: 'Check Report', icon: '📋', action: 'custom' },
        { id: 'call-solicitor', label: 'Solicitor', icon: '⚖️', action: 'call', target: 'solicitor' },
        { id: 'mark-satisfied', label: 'Satisfied', icon: '✅', action: 'custom' },
    ],
};

const UNCONDITIONAL_CONFIG: StageConfiguration = {
    stage: 'unconditional',
    pipelineType: 'buyer',
    primaryFocus: 'Confirming all conditions and preparing for settlement',
    blockerTypes: ['settlement_date_change', 'funding_issues', 'insurance_gap'],
    coachingFocus: 'Smooth path to settlement',
    sections: [
        { id: 'settlement', priority: 'always', order: 1 },
        { id: 'conditions', priority: 'collapsed', order: 2 },
        { id: 'keyDates', priority: 'always', order: 3 },
        { id: 'contacts', priority: 'always', order: 4 },
        { id: 'zenaCoaching', priority: 'always', order: 5 },
        { id: 'commission', priority: 'always', order: 6 },
    ],
    quickActions: [
        { id: 'confirm-settlement', label: 'Confirm Date', icon: '📞', primary: true, action: 'call', target: 'solicitor' },
        { id: 'book-inspection', label: 'Book Inspection', icon: '📅', action: 'schedule' },
        { id: 'insurance-reminder', label: 'Insurance', icon: '🛡️', action: 'custom' },
    ],
};

const PRE_SETTLEMENT_CONFIG: StageConfiguration = {
    stage: 'pre_settlement',
    pipelineType: 'buyer',
    primaryFocus: 'Final preparations and de-risking settlement day',
    blockerTypes: ['inspection_issues', 'solicitor_delays', 'funds_delayed', 'property_issues', 'chattels_missing'],
    coachingFocus: 'De-risking the final days',
    sections: [
        { id: 'settlement', priority: 'always', order: 1 },
        { id: 'preInspection', priority: 'always', order: 2 },
        { id: 'blocker', priority: 'always', order: 3 },
        { id: 'contacts', priority: 'always', order: 4 },
        { id: 'zenaCoaching', priority: 'always', order: 5 },
        { id: 'commission', priority: 'always', order: 6 },
    ],
    quickActions: [
        { id: 'book-inspection', label: 'Book Inspection', icon: '📅', primary: true, action: 'schedule' },
        { id: 'call-solicitor', label: 'Solicitors', icon: '📞', action: 'call', target: 'solicitor' },
        { id: 'confirm-funds', label: 'Funds Ready', icon: '✅', action: 'custom' },
        { id: 'key-handover', label: 'Keys', icon: '🔑', action: 'custom' },
    ],
};

const SETTLED_CONFIG: StageConfiguration = {
    stage: 'settled',
    pipelineType: 'buyer',
    primaryFocus: 'Celebration, follow-up, and referral generation',
    blockerTypes: [],
    coachingFocus: 'Relationship nurturing',
    sections: [
        { id: 'commission', priority: 'always', order: 1 },
        { id: 'followUp', priority: 'always', order: 2 },
        { id: 'contacts', priority: 'always', order: 3 },
        { id: 'keyDates', priority: 'collapsed', order: 4 },
        { id: 'zenaCoaching', priority: 'when_relevant', order: 5 },
    ],
    quickActions: [
        { id: 'send-gift', label: 'Send Gift', icon: '🎁', primary: true, action: 'custom' },
        { id: 'get-testimonial', label: 'Testimonial', icon: '⭐', action: 'custom' },
        { id: 'ask-referral', label: 'Referral', icon: '🔗', action: 'custom' },
    ],
};

const NURTURE_CONFIG: StageConfiguration = {
    stage: 'nurture',
    pipelineType: 'buyer',
    primaryFocus: 'Long-term relationship and future opportunity',
    blockerTypes: [],
    coachingFocus: 'Staying top of mind',
    sections: [
        { id: 'contacts', priority: 'always', order: 1 },
        { id: 'keyDates', priority: 'always', order: 2 },
        { id: 'zenaCoaching', priority: 'when_relevant', order: 3 },
    ],
    quickActions: [
        { id: 'check-in', label: 'Check In', icon: '💬', primary: true, action: 'sms', target: 'buyer' },
        { id: 'market-update', label: 'Market Update', icon: '📊', action: 'custom' },
        { id: 'call', label: 'Call', icon: '📞', action: 'call', target: 'buyer' },
    ],
};

// ============================================================
// SELLER PIPELINE STAGE CONFIGS
// ============================================================

const APPRAISAL_CONFIG: StageConfiguration = {
    stage: 'appraisal',
    pipelineType: 'seller',
    primaryFocus: 'Valuation, rapport building, winning the listing',
    blockerTypes: ['unrealistic_expectations', 'not_ready', 'competing_agents'],
    coachingFocus: 'Winning the listing and setting expectations',
    sections: [
        { id: 'contacts', priority: 'always', order: 1 },
        { id: 'blocker', priority: 'when_relevant', order: 2 },
        { id: 'zenaCoaching', priority: 'always', order: 3 },
        { id: 'keyDates', priority: 'when_relevant', order: 4 },
    ],
    quickActions: [
        { id: 'send-report', label: 'Send CMA', icon: '📋', primary: true, action: 'custom' },
        { id: 'follow-up', label: 'Follow Up', icon: '📞', action: 'call', target: 'seller' },
        { id: 'send-agreement', label: 'Agreement', icon: '📝', action: 'custom' },
    ],
};

const LISTING_SIGNED_CONFIG: StageConfiguration = {
    stage: 'listing_signed',
    pipelineType: 'seller',
    primaryFocus: 'Preparing for launch',
    blockerTypes: ['photos_pending', 'property_prep', 'copy_approval', 'vendor_not_ready'],
    coachingFocus: 'Launch preparation excellence',
    sections: [
        { id: 'contacts', priority: 'always', order: 1 },
        { id: 'keyDates', priority: 'always', order: 2 },
        { id: 'blocker', priority: 'when_relevant', order: 3 },
        { id: 'zenaCoaching', priority: 'always', order: 4 },
    ],
    quickActions: [
        { id: 'book-photos', label: 'Photos', icon: '📷', primary: true, action: 'schedule' },
        { id: 'staging', label: 'Staging', icon: '🏠', action: 'schedule' },
        { id: 'draft-copy', label: 'Draft Copy', icon: '✍️', action: 'custom' },
        { id: 'set-golive', label: 'Go-Live', icon: '📅', action: 'schedule' },
    ],
};

const MARKETING_CONFIG: StageConfiguration = {
    stage: 'marketing',
    pipelineType: 'seller',
    primaryFocus: 'Generating interest and managing vendor expectations',
    blockerTypes: ['low_inquiries', 'overpriced', 'poor_presentation', 'vendor_frustrated'],
    coachingFocus: 'Generating offers and managing vendor expectations',
    sections: [
        { id: 'marketingStats', priority: 'always', order: 1 },
        { id: 'blocker', priority: 'when_relevant', order: 2 },
        { id: 'keyDates', priority: 'always', order: 3 },
        { id: 'contacts', priority: 'always', order: 4 },
        { id: 'zenaCoaching', priority: 'always', order: 5 },
    ],
    quickActions: [
        { id: 'open-home', label: 'Open Home', icon: '📅', primary: true, action: 'schedule' },
        { id: 'vendor-update', label: 'Update', icon: '📞', action: 'call', target: 'seller' },
        { id: 'marketing-report', label: 'Report', icon: '📊', action: 'custom' },
        { id: 'price-discuss', label: 'Price Talk', icon: '💰', action: 'call', target: 'seller' },
    ],
};

const OFFERS_RECEIVED_CONFIG: StageConfiguration = {
    stage: 'offers_received',
    pipelineType: 'seller',
    primaryFocus: 'Presenting offers and negotiating best outcome',
    blockerTypes: ['below_expectations', 'risky_conditions', 'multi_offer', 'vendor_indecisive'],
    coachingFocus: 'Securing the best deal for the vendor',
    sections: [
        { id: 'offers', priority: 'always', order: 1 },
        { id: 'blocker', priority: 'when_relevant', order: 2 },
        { id: 'contacts', priority: 'always', order: 3 },
        { id: 'keyDates', priority: 'always', order: 4 },
        { id: 'zenaCoaching', priority: 'always', order: 5 },
        { id: 'commission', priority: 'when_relevant', order: 6 },
    ],
    quickActions: [
        { id: 'present-offer', label: 'Present', icon: '📞', primary: true, action: 'call', target: 'seller' },
        { id: 'counter', label: 'Counter', icon: '📝', action: 'custom' },
        { id: 'accept', label: 'Accept', icon: '✅', action: 'custom' },
        { id: 'best-final', label: 'Best & Final', icon: '🔄', action: 'custom' },
    ],
};

// Seller uses same configs for shared stages but with different primary contacts
const SELLER_CONDITIONAL_CONFIG: StageConfiguration = {
    ...CONDITIONAL_CONFIG,
    pipelineType: 'seller',
    quickActions: [
        { id: 'chase-updates', label: 'Chase Updates', icon: '📞', primary: true, action: 'call', target: 'buyer_agent' },
        { id: 'confirm-progress', label: 'Progress', icon: '✅', action: 'custom' },
        { id: 'call-seller', label: 'Seller', icon: '📞', action: 'call', target: 'seller' },
    ],
};

// ============================================================
// CONFIG LOOKUP
// ============================================================

const STAGE_CONFIGS: Record<string, StageConfiguration> = {
    // Buyer stages
    'buyer_consult': BUYER_CONSULT_CONFIG,
    'shortlisting': SHORTLISTING_CONFIG,
    'viewings': VIEWINGS_CONFIG,
    'offer_made': OFFER_MADE_CONFIG,
    // Seller stages
    'appraisal': APPRAISAL_CONFIG,
    'listing_signed': LISTING_SIGNED_CONFIG,
    'marketing': MARKETING_CONFIG,
    'offers_received': OFFERS_RECEIVED_CONFIG,
    // Shared stages (defaulting to buyer, override for seller below)
    'conditional': CONDITIONAL_CONFIG,
    'unconditional': UNCONDITIONAL_CONFIG,
    'pre_settlement': PRE_SETTLEMENT_CONFIG,
    'settled': SETTLED_CONFIG,
    'nurture': NURTURE_CONFIG,
};

/**
 * Get stage configuration for a deal
 */
export function getStageConfig(stage: DealStage, pipelineType: PipelineType): StageConfiguration {
    // Check for seller-specific overrides for shared stages
    if (pipelineType === 'seller' && stage === 'conditional') {
        return SELLER_CONDITIONAL_CONFIG;
    }

    const config = STAGE_CONFIGS[stage];
    if (!config) {
        // Return a sensible default
        return {
            stage,
            pipelineType,
            primaryFocus: 'Deal progress',
            blockerTypes: [],
            coachingFocus: 'General guidance',
            sections: [
                { id: 'contacts', priority: 'always', order: 1 },
                { id: 'keyDates', priority: 'always', order: 2 },
                { id: 'zenaCoaching', priority: 'always', order: 3 },
            ],
            quickActions: [
                { id: 'call', label: 'Call', icon: '📞', primary: true, action: 'call' },
            ],
        };
    }

    return config;
}

/**
 * Check if a section should be visible for a stage
 */
export function isSectionVisible(
    sectionId: SectionId,
    stage: DealStage,
    pipelineType: PipelineType,
    hasRelevantData?: boolean
): boolean {
    const config = getStageConfig(stage, pipelineType);
    const section = config.sections.find(s => s.id === sectionId);

    if (!section || section.priority === 'hidden') return false;
    if (section.priority === 'always') return true;
    if (section.priority === 'when_relevant') return hasRelevantData ?? false;
    if (section.priority === 'collapsed') return true; // Render but collapsed

    return false;
}
