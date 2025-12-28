// Deal Flow Types - Frontend TypeScript definitions

// Pipeline type
export type PipelineType = 'buyer' | 'seller';

// Sale method - NZ-specific sale types
export type SaleMethod = 'negotiation' | 'auction' | 'tender' | 'deadline_sale';

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

// Commission tier
export interface CommissionTier {
    minPrice: number;
    maxPrice: number | null;
    rate: number;
    fixedFee?: number;
}

// Deal interface for frontend
export interface Deal {
    id: string;
    userId: string;
    pipelineType: PipelineType;
    saleMethod: SaleMethod;
    stage: DealStage;
    riskLevel: RiskLevel;
    riskFlags: string[];
    nextAction?: string;
    nextActionOwner: 'agent' | 'other';
    summary: string;

    // Financial
    dealValue?: number;
    commissionFormulaId?: string;
    estimatedCommission?: number;

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
    };
    contacts?: {
        id: string;
        name: string;
    }[];

    // Conjunctional Sales (Phase 3)
    isConjunctional?: boolean;
    conjunctionalAgencyName?: string;
    conjunctionalSplit?: number;      // 0.5 = 50% our share
    isListingAgent?: boolean;         // true = we're listing, false = selling agent

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
        totalCommission: number;
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
    totalPendingCommission: number;
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
    settled: 'Closed',
    nurture: 'Nurture'
};

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
