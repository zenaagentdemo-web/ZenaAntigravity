// Deal Flow Types - Frontend TypeScript definitions

// Pipeline type
export type PipelineType = 'buyer' | 'seller';

// Sale method - NZ-specific sale types
export type SaleMethod =
    | 'auction'           // Competitive bidding, unconditional on fall of hammer
    | 'tender'            // Sealed written offers by deadline
    | 'deadline_sale'     // Offers by set date, can sell prior
    | 'negotiation'       // Open negotiation, no set price/date
    | 'asking_price'      // Fixed advertised price
    | 'poa'               // Price on Application
    | 'beo'               // Buyer Enquiry Over
    | 'set_date'          // Set Date of Sale
    | 'custom';           // User-defined method

// Buyer pipeline stages
export type BuyerStage =
    | 'buyer_consult'
    | 'shortlisting'
    | 'viewings'
    | 'offer_made'
    | 'conditional'
    | 'unconditional'
    | 'pre_settlement'
    | 'settled'
    | 'nurture';

// Seller pipeline stages
export type SellerStage =
    | 'buyer_consult'
    | 'appraisal'
    | 'listing_signed'
    | 'marketing'
    | 'offers_received'
    | 'conditional'
    | 'unconditional'
    | 'pre_settlement'
    | 'settled'
    | 'nurture';

// Combined deal stage type
export type DealStage = BuyerStage | SellerStage;

// Risk level 
export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

// Condition types
export type ConditionType =
    | 'finance'
    | 'building_report'
    | 'lim'
    | 'solicitor'
    | 'insurance'
    | 'other';

export type ConditionStatus = 'pending' | 'satisfied' | 'waived' | 'failed';

// Deal condition
export interface DealCondition {
    id: string;
    type: ConditionType;
    label: string;
    dueDate: string;
    status: ConditionStatus;
    notes?: string;
    satisfiedAt?: string;
}

// Shared property/viewing types
export interface SharedProperty {
    id: string;
    address: string;
    image?: string;
    feedback?: 'like' | 'dislike' | 'neutral';
    isFavourite?: boolean;
    isHot?: boolean;
    auctionDate?: string;
}

export interface Viewing {
    id: string;
    propertyId: string;
    address: string;
    date: string;
    time: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    feedback?: string;
}

export interface Offer {
    id: string;
    amount: number;
    conditions: string[];
    settlementDate: string;
    status: 'submitted' | 'under_review' | 'countered' | 'accepted' | 'rejected';
    expiryDate: string;
    buyerName?: string; // For seller side view
    isMultiOffer?: boolean;
}

export interface PreSettlementInspection {
    date: string;
    time: string;
    status: 'pending' | 'completed' | 'issues_found';
    issues?: string[];
    isFundsReady?: boolean;
    isKeysArranged?: boolean;
}

export interface SearchCriteria {
    propertyType: string;
    location: string[];
    priceRange: { min: number; max: number };
    bedrooms: string;
    bathrooms: string;
    mustHaves: string[];
}

export interface MarketingStats {
    views: number;
    watchlist: number;
    inquiries: number;
    viewings: number;
    daysOnMarket: number;
    trend: 'up' | 'down';
}

// Deal interface for frontend
export interface Deal {
    id: string;
    userId: string;
    pipelineType: PipelineType;
    saleMethod: SaleMethod;
    customSaleMethod?: string;  // User-defined sale method when saleMethod is 'custom'
    stage: DealStage;
    riskLevel: RiskLevel;
    riskFlags: string[];
    nextAction?: string;
    nextActionOwner: 'agent' | 'other';
    summary: string;

    // Financial
    dealValue?: number;

    // Dates
    conditions?: DealCondition[];
    settlementDate?: string;
    goLiveDate?: string;
    auctionDate?: string;
    tenderCloseDate?: string;
    stageEnteredAt: string;
    lastContactAt?: string;

    // Relations
    property?: {
        id: string;
        address: string;
        bedrooms?: number;
        bathrooms?: number;
        floorArea?: string;  // e.g., "220 m²"
        landArea?: string;   // e.g., "650 m²"
        listingPrice?: number;
        lastSalePrice?: number;
        lastSaleDate?: string; // ISO date
    };
    contacts?: {
        id: string;
        name: string;
        role?: string;
        email?: string;
        phone?: string;
    }[];
    timelineEvents?: any[]; // Array of TimelineEvent from ActivityLogger

    // Extended stage data
    searchCriteria?: SearchCriteria;
    propertiesShared?: SharedProperty[];
    viewings?: Viewing[];
    activeOffer?: Offer;
    preSettlementInspection?: PreSettlementInspection;
    marketingStats?: MarketingStats;
    offers?: Offer[]; // For seller side

    createdAt: string;
    updatedAt: string;
}

// Pipeline column for kanban view
export interface PipelineColumn {
    stage: string;
    label: string;
    deals: Deal[];
    totalValue: number;
    count: number;
}

// Pipeline response from API
export interface PipelineResponse {
    pipelineType: PipelineType;
    columns: PipelineColumn[];
    summary: {
        totalDeals: number;
        totalValue: number;
        atRiskCount: number;
        overdueCount: number;
        todayCount: number;
    };
}

// Dashboard stats
export interface DashboardStats {
    buyerDeals: number;
    sellerDeals: number;
    atRiskDeals: number;
    overdueDeals: number;
    todayDeals: number;
    totalPipelineValue: number;
    dealsClosedThisMonth: number;
}

// Stage info with label
export interface StageInfo {
    value: string;
    label: string;
}

// Stage labels mapping
export const STAGE_LABELS: Record<string, string> = {
    // Buyer stages
    buyer_consult: 'Consult',
    shortlisting: 'Shortlist',
    viewings: 'Viewings',
    offer_made: 'Offer Made',
    // Seller stages
    appraisal: 'Appraisal',
    listing_signed: 'Listed',
    marketing: 'Marketing',
    offers_received: 'Offers',
    // Shared stages
    conditional: 'Conditional',
    unconditional: 'Unconditional',
    pre_settlement: 'Pre-Settlement',
    settled: 'Settled',
    nurture: 'Nurture'
};

// Canonical stage sequences - SINGLE SOURCE OF TRUTH
// All components should import these instead of defining their own
export const BUYER_STAGE_SEQUENCE: DealStage[] = [
    'buyer_consult',
    'shortlisting',
    'viewings',
    'offer_made',
    'conditional',
    'unconditional',
    'pre_settlement',
    'settled',
    'nurture'
];

export const SELLER_STAGE_SEQUENCE: DealStage[] = [
    'buyer_consult',  // Initial consultation with seller
    'appraisal',
    'listing_signed',
    'marketing',
    'offers_received',
    'conditional',
    'unconditional',
    'pre_settlement',
    'settled',
    'nurture'
];

// Risk level badge info
export const RISK_BADGES: Record<RiskLevel, { emoji: string; color: string; label: string }> = {
    none: { emoji: '✅', color: '#22c55e', label: 'On Track' },
    low: { emoji: '⚪', color: '#6b7280', label: 'Low Risk' },
    medium: { emoji: '🟡', color: '#eab308', label: 'Medium Risk' },
    high: { emoji: '🟠', color: '#f97316', label: 'High Risk' },
    critical: { emoji: '🔴', color: '#ef4444', label: 'Critical' }
};

// Format currency for NZ
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-NZ', {
        style: 'currency',
        currency: 'NZD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

// Calculate days in stage
export function calculateDaysInStage(stageEnteredAt: string): number {
    const entered = new Date(stageEnteredAt);
    const now = new Date();
    const diffMs = now.getTime() - entered.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Format days remaining/overdue
export function formatDaysRemaining(daysRemaining: number): string {
    if (daysRemaining < 0) {
        return `${Math.abs(daysRemaining)}d overdue`;
    } else if (daysRemaining === 0) {
        return 'Today';
    } else if (daysRemaining === 1) {
        return 'Tomorrow';
    } else {
        return `${daysRemaining}d`;
    }
}

// ============================================================
// STRATEGY SESSION CONTEXT
// ============================================================

/**
 * Context passed to Zena Live for deal-aware strategy sessions.
 * Stored in sessionStorage and read by AskZenaPage on mount.
 */
export interface StrategySessionContext {
    dealId: string;
    address: string;
    stage: string;
    stageLabel: string;
    dealValue?: number;
    daysInStage: number;
    healthScore: number;
    healthStatus: 'healthy' | 'warning' | 'critical';
    primaryRisk: string;        // Top risk signal description
    riskType: string;           // e.g. 'finance_risk', 'stalling', 'long_conditional'
    coachingInsight: string;    // Zena's coaching insight
    suggestedAction?: string;   // e.g. "Call the broker"
    contactName?: string;       // Primary contact for this deal
}

/**
 * SessionStorage key for strategy session context
 */
export const STRATEGY_SESSION_KEY = 'zena_strategy_session';

/**
 * Build a conversational opener for Zena based on the risk type
 */
export function buildStrategyOpener(context: StrategySessionContext): string {
    const { address, healthScore, primaryRisk, riskType, coachingInsight } = context;

    // Extract short address (first part before comma)
    const shortAddress = address.split(',')[0];

    switch (riskType) {
        case 'finance_risk':
            return `Hey, I see ${shortAddress} has a finance condition that's getting tight. At ${healthScore}% health, we should probably move on this. What's your read on the buyer's broker situation?`;

        case 'stalling':
        case 'cold_buyer':
            return `Hey, ${shortAddress} hasn't had much activity lately — the buyer might be cooling off. ${coachingInsight} Want to brainstorm what to say to get things moving again?`;

        case 'long_conditional':
            return `${shortAddress} has been conditional for a while now, and extended conditionals often signal hidden concerns. Let's figure out what's really blocking progress. Walk me through what you know.`;

        case 'builder_report_delay':
            return `I'm looking at ${shortAddress} — the builder's report seems to be causing some hesitation. Often that means there's a worry the buyer isn't voicing. What vibe are you getting from them?`;

        case 'vendor_expectations':
            return `Hey, ${shortAddress} has been on market longer than the NZ median. ${coachingInsight} Want to talk through how to have that conversation with the vendor?`;

        default:
            return `Hey, I'm looking at ${shortAddress}. ${coachingInsight} Let's work through this together — what's on your mind?`;
    }
}
