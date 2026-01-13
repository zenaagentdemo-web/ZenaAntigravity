// Deal Flow Service - Core business logic for Deal Flow feature
import { Deal, CommissionFormula } from '@prisma/client';
import {
    PipelineType,
    BuyerStage,
    SellerStage,
    RiskLevel,
    DealCondition,
    CommissionTier
} from '../models/types.js';
import prisma from '../config/database.js';

// Stage definitions for each pipeline
export const BUYER_STAGES: BuyerStage[] = [
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

export const SELLER_STAGES: SellerStage[] = [
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

// Stage display labels
export const STAGE_LABELS: Record<string, string> = {
    // Buyer stages
    buyer_consult: 'Buyer Consult',
    shortlisting: 'Shortlisting',
    viewings: 'Viewings',
    offer_made: 'Offer Made',
    // Seller stages
    appraisal: 'Appraisal',
    listing_signed: 'Listing Signed',
    marketing: 'Marketing',
    offers_received: 'Offers Received',
    // Shared stages
    conditional: 'Conditional',
    unconditional: 'Unconditional',
    pre_settlement: 'Pre-Settlement',
    settled: 'Settled',
    nurture: 'Nurture'
};

// Default condition deadlines (working days) for NZ real estate
export const DEFAULT_CONDITION_DAYS: Record<string, number> = {
    finance: 10,
    building_report: 10,
    lim: 5,
    solicitor: 10,
    insurance: 1 // 1 day before settlement
};

interface DealWithRelations extends Deal {
    property?: { id: string; address: string } | null;
    contacts?: { id: string; name: string }[];
    commissionFormula?: CommissionFormula | null;
}

interface PipelineColumn {
    stage: string;
    label: string;
    deals: DealWithRelations[];
    totalValue: number;
    count: number;
}

interface PipelineResponse {
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

interface DashboardStats {
    buyerDeals: number;
    sellerDeals: number;
    atRiskDeals: number;
    overdueDeals: number;
    todayDeals: number;
    totalPipelineValue: number;
    totalPendingCommission: number;
    dealsClosedThisMonth: number;
}

interface NextDeadline {
    label: string;
    date: Date;
    daysRemaining: number;
    isOverdue: boolean;
}

// Stage display labels

export class DealFlowService {
    /**
     * Get deals grouped by stage for kanban view
     */
    async getPipelineDeals(userId: string, pipelineType: PipelineType): Promise<PipelineResponse> {
        const stages = pipelineType === 'buyer' ? BUYER_STAGES : SELLER_STAGES;

        // Fetch all deals for this pipeline type
        const deals = await prisma.deal.findMany({
            where: {
                userId,
                pipelineType
            },
            include: {
                property: {
                    select: { id: true, address: true }
                },
                contacts: {
                    select: { id: true, name: true }
                },
                commissionFormula: true
            },
            orderBy: { stageEnteredAt: 'asc' }
        });

        // Group deals by stage
        const dealsByStage = new Map<string, DealWithRelations[]>();
        stages.forEach(stage => dealsByStage.set(stage, []));

        deals.forEach(deal => {
            const stageDeals = dealsByStage.get(deal.stage);
            if (stageDeals) {
                stageDeals.push(deal);
            }
        });

        // Build columns
        const columns: PipelineColumn[] = stages.map(stage => {
            const stageDeals = dealsByStage.get(stage) || [];
            const totalValue = stageDeals.reduce((sum, d) =>
                sum + (d.dealValue ? Number(d.dealValue) : 0), 0
            );

            return {
                stage,
                label: STAGE_LABELS[stage] || stage,
                deals: stageDeals,
                totalValue,
                count: stageDeals.length
            };
        });

        // Calculate summary stats

        let atRiskCount = 0;
        let overdueCount = 0;
        let todayCount = 0;
        let totalValue = 0;
        let totalCommission = 0;

        for (const deal of deals) {
            totalValue += deal.dealValue ? Number(deal.dealValue) : 0;
            totalCommission += deal.estimatedCommission ? Number(deal.estimatedCommission) : 0;

            if (deal.riskLevel === 'high' || deal.riskLevel === 'critical') {
                atRiskCount++;
            }

            const nextDeadline = this.getNextDeadline(deal);
            if (nextDeadline) {
                if (nextDeadline.isOverdue) {
                    overdueCount++;
                } else if (nextDeadline.daysRemaining === 0) {
                    todayCount++;
                }
            }
        }

        return {
            pipelineType,
            columns,
            summary: {
                totalDeals: deals.length,
                totalValue,
                totalCommission,
                atRiskCount,
                overdueCount,
                todayCount
            }
        };
    }

    /**
     * Calculate days in current stage
     */
    calculateDaysInStage(stageEnteredAt: Date): number {
        const now = new Date();
        const diffMs = now.getTime() - stageEnteredAt.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    /**
     * Get the next upcoming deadline for a deal
     */
    getNextDeadline(deal: Deal): NextDeadline | null {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let earliestDeadline: NextDeadline | null = null;

        // Check conditions
        if (deal.conditions) {
            const conditions = deal.conditions as unknown as DealCondition[];
            for (const condition of conditions) {
                if (condition.status === 'pending') {
                    const dueDate = new Date(condition.dueDate);
                    const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const isOverdue = daysRemaining < 0;

                    if (!earliestDeadline || dueDate < earliestDeadline.date) {
                        earliestDeadline = {
                            label: condition.label,
                            date: dueDate,
                            daysRemaining,
                            isOverdue
                        };
                    }
                }
            }
        }

        // Check key dates
        const keyDates: { label: string; date: Date | null }[] = [
            { label: 'Settlement', date: deal.settlementDate },
            { label: 'Auction', date: deal.auctionDate },
            { label: 'Tender closes', date: deal.tenderCloseDate },
            { label: 'Marketing goes live', date: deal.goLiveDate }
        ];

        for (const { label, date } of keyDates) {
            if (date) {
                const daysRemaining = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysRemaining < 0;

                if (!earliestDeadline || date < earliestDeadline.date) {
                    earliestDeadline = {
                        label,
                        date,
                        daysRemaining,
                        isOverdue
                    };
                }
            }
        }

        return earliestDeadline;
    }

    /**
     * Calculate commission using tiered formula
     * Commission is calculated cumulatively across tiers
     */
    async checkStagnation(dealId: string, userId: string): Promise<void> {
        const deal = await prisma.deal.findUnique({ where: { id: dealId } });
        if (!deal || !deal.updatedAt) return;

        const lastUpdate = new Date(deal.updatedAt);
        const now = new Date();
        const diffDays = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

        // --- SCENARIO S47: Deal Stagnation ---
        if (diffDays >= 21) {
            console.log(`[Deals] S47: Deal ${dealId} has stagnated for ${diffDays} days. alerting AI.`);
            await prisma.timelineEvent.create({
                data: {
                    userId,
                    type: 'note',
                    entityType: 'deal',
                    entityId: dealId,
                    summary: 'Deal Stagnation: No progress for 21 days',
                    content: 'This deal is currently marked as "Cold". Consider a re-engagement strategy.',
                    timestamp: new Date()
                }
            });
        }
    }

    async monitorConditions(dealId: string, userId: string): Promise<void> {
        const deal = await prisma.deal.findUnique({ where: { id: dealId } });
        if (!deal || !deal.conditions) return;

        const conditions = deal.conditions as any[];
        const now = new Date();

        // --- SCENARIO S44: Condition Watchdog ---
        for (const cond of conditions) {
            if (cond.dueDate && !cond.satisfied) {
                const dueDate = new Date(cond.dueDate);
                const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

                if (diffHours < 48 && diffHours > 0) {
                    console.log(`[Deals] S44: Condition ${cond.title} expires in ${Math.round(diffHours)} hours. Alerting.`);
                    await prisma.timelineEvent.create({
                        data: {
                            userId,
                            type: 'note',
                            entityType: 'deal',
                            entityId: dealId,
                            summary: `URGENT: Condition "${cond.title}" expires soon!`,
                            timestamp: new Date()
                        }
                    });
                }
            }
        }
    }

    async checkSettlementAutomation(dealId: string, userId: string): Promise<void> {
        const deal = await prisma.deal.findUnique({ where: { id: dealId } });
        if (!deal || !deal.settlementDate) return;

        const settlementDate = new Date(deal.settlementDate);
        const now = new Date();
        const diffDays = Math.ceil((settlementDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // --- SCENARIO S41: Settlement Tracker ---
        if (diffDays <= 7 && diffDays > 0) {
            console.log(`[Deals] S41: Settlement approaching for deal ${dealId} (${diffDays} days). Creating task.`);
            await prisma.task.create({
                data: {
                    userId,
                    dealId,
                    propertyId: deal.propertyId,
                    label: 'Pre-settlement walkthrough',
                    dueDate: new Date(settlementDate.getTime() - (2 * 1000 * 60 * 60 * 24)), // 2 days before
                    priority: 'high',
                    status: 'pending'
                }
            });
        }
    }

    calculateCommission(dealValue: number, tiers: CommissionTier[]): number {
        if (!tiers || tiers.length === 0 || dealValue <= 0) {
            return 0;
        }

        // Sort tiers by minPrice
        const sortedTiers = [...tiers].sort((a, b) => a.minPrice - b.minPrice);

        let totalCommission = 0;
        let remainingValue = dealValue;

        for (const tier of sortedTiers) {
            if (remainingValue <= 0) break;

            const tierMin = tier.minPrice;
            const tierMax = tier.maxPrice ?? Infinity;

            // Calculate the portion of the deal value in this tier
            const tierStart = Math.max(0, tierMin);
            const tierEnd = tierMax;
            const valueInTier = Math.min(remainingValue, tierEnd - tierStart);

            if (valueInTier > 0) {
                // Add percentage-based commission for this tier
                totalCommission += valueInTier * tier.rate;

                // Add fixed fee if present (only once per tier)
                if (tier.fixedFee) {
                    totalCommission += tier.fixedFee;
                }

                remainingValue -= valueInTier;
            }
        }

        return Math.round(totalCommission * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Get dashboard statistics for the user
     */
    async getDashboardStats(userId: string): Promise<DashboardStats> {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Fetch all active deals
        const deals = await prisma.deal.findMany({
            where: {
                userId,
                stage: { notIn: ['settled', 'nurture'] }
            }
        });

        // Fetch closed deals this month
        const closedThisMonth = await prisma.deal.count({
            where: {
                userId,
                stage: 'settled',
                updatedAt: { gte: monthStart }
            }
        });

        let buyerDeals = 0;
        let sellerDeals = 0;
        let atRiskDeals = 0;
        let overdueDeals = 0;
        let todayDeals = 0;
        let totalPipelineValue = 0;
        let totalPendingCommission = 0;

        for (const deal of deals) {
            if (deal.pipelineType === 'buyer') buyerDeals++;
            else sellerDeals++;

            if (deal.riskLevel === 'high' || deal.riskLevel === 'critical') {
                atRiskDeals++;
            }

            totalPipelineValue += deal.dealValue ? Number(deal.dealValue) : 0;
            totalPendingCommission += deal.estimatedCommission ? Number(deal.estimatedCommission) : 0;

            const nextDeadline = this.getNextDeadline(deal);
            if (nextDeadline) {
                if (nextDeadline.isOverdue) overdueDeals++;
                else if (nextDeadline.daysRemaining === 0) todayDeals++;
            }
        }

        return {
            buyerDeals,
            sellerDeals,
            atRiskDeals,
            overdueDeals,
            todayDeals,
            totalPipelineValue,
            totalPendingCommission,
            dealsClosedThisMonth: closedThisMonth
        };
    }

    /**
     * Assess and update risk level for a deal based on conditions and dates
     */
    async assessDealRisk(deal: Deal): Promise<{ riskLevel: RiskLevel; riskFlags: string[] }> {
        const riskFlags: string[] = [];
        let maxRiskLevel: RiskLevel = 'none';

        const updateRisk = (level: RiskLevel, flag: string) => {
            riskFlags.push(flag);
            const levels: RiskLevel[] = ['none', 'low', 'medium', 'high', 'critical'];
            if (levels.indexOf(level) > levels.indexOf(maxRiskLevel)) {
                maxRiskLevel = level;
            }
        };

        // Check days in stage
        const daysInStage = this.calculateDaysInStage(deal.stageEnteredAt);
        if (daysInStage > 21) {
            updateRisk('medium', `Deal stuck in stage for ${daysInStage} days`);
        } else if (daysInStage > 14) {
            updateRisk('low', `${daysInStage} days in current stage`);
        }

        // Check conditions
        if (deal.conditions) {
            const conditions = deal.conditions as unknown as DealCondition[];
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            for (const condition of conditions) {
                if (condition.status === 'pending') {
                    const dueDate = new Date(condition.dueDate);
                    const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    if (daysRemaining < 0) {
                        updateRisk('critical', `${condition.label} overdue by ${Math.abs(daysRemaining)} days`);
                    } else if (daysRemaining <= 2) {
                        updateRisk('critical', `${condition.label} due in ${daysRemaining} days`);
                    } else if (daysRemaining <= 5) {
                        updateRisk('high', `${condition.label} due in ${daysRemaining} days`);
                    }
                } else if (condition.status === 'failed') {
                    updateRisk('critical', `${condition.label} failed`);
                }
            }
        }

        // Check last contact
        if (deal.lastContactAt) {
            const daysSinceContact = Math.floor(
                (new Date().getTime() - deal.lastContactAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceContact > 7) {
                updateRisk('medium', `No contact for ${daysSinceContact} days`);
            } else if (daysSinceContact > 5) {
                updateRisk('low', `Last contact ${daysSinceContact} days ago`);
            }
        }

        // --- SCENARIO S33: High Condition Risk ---
        // If more than 3 pending/total conditions, increase risk
        if (deal.conditions) {
            const conditions = deal.conditions as unknown as any[];
            if (conditions.length > 3) {
                updateRisk('medium', `High condition count (${conditions.length}) increases fall-through risk`);
            }
        }

        // Check settlement date proximity
        if (deal.settlementDate) {
            const daysToSettlement = Math.ceil(
                (deal.settlementDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysToSettlement <= 5 && daysToSettlement > 0) {
                // Check if pre-settlement tasks are done (would need more data)
                updateRisk('medium', `Settlement in ${daysToSettlement} days`);
            }
        }

        return { riskLevel: maxRiskLevel, riskFlags };
    }

    /**
     * Move a deal to a new stage
     */
    async moveDealToStage(
        dealId: string,
        userId: string,
        newStage: string,
        reason?: string
    ): Promise<Deal> {
        const deal = await prisma.deal.findFirst({
            where: { id: dealId, userId }
        });

        if (!deal) {
            throw new Error('Deal not found');
        }

        const oldStage = deal.stage;

        // Update deal
        const updatedDeal = await prisma.deal.update({
            where: { id: dealId },
            data: {
                stage: newStage,
                stageEnteredAt: new Date()
            }
        });

        // Create timeline event
        await prisma.timelineEvent.create({
            data: {
                userId,
                type: 'note',
                entityType: 'deal',
                entityId: dealId,
                summary: `Stage changed from ${STAGE_LABELS[oldStage] || oldStage} to ${STAGE_LABELS[newStage] || newStage}`,
                content: reason,
                timestamp: new Date()
            }
        });

        return updatedDeal;
    }

    /**
     * Create a new deal with commission calculation
     */
    async createDeal(data: {
        userId: string;
        pipelineType: PipelineType;
        saleMethod: string;
        stage: string;
        summary: string;
        propertyId?: string;
        dealValue?: number;
        commissionFormulaId?: string;
        conditions?: DealCondition[];
        settlementDate?: Date;
        goLiveDate?: Date;
        auctionDate?: Date;
        tenderCloseDate?: Date;
        contactIds?: string[];
        // Phase 3: Conjunctional sale fields
        isConjunctional?: boolean;
        conjunctionalAgencyName?: string;
        conjunctionalSplit?: number;  // Our share (0.5 = 50%)
        isListingAgent?: boolean;
    }): Promise<Deal> {
        const { contactIds, ...dealData } = data;

        // Calculate commission if we have both value and formula
        let estimatedCommission: number | undefined;
        if (data.dealValue && data.commissionFormulaId) {
            const formula = await prisma.commissionFormula.findUnique({
                where: { id: data.commissionFormulaId }
            });
            if (formula) {
                const tiers = formula.tiers as unknown as CommissionTier[];
                let fullCommission = this.calculateCommission(data.dealValue, tiers);

                // Phase 3: Apply conjunctional split if applicable
                if (data.isConjunctional && data.conjunctionalSplit) {
                    estimatedCommission = fullCommission * data.conjunctionalSplit;
                } else {
                    estimatedCommission = fullCommission;
                }
            }
        }

        const deal = await prisma.deal.create({
            data: {
                userId: dealData.userId,
                pipelineType: dealData.pipelineType,
                saleMethod: dealData.saleMethod,
                stage: dealData.stage,
                summary: dealData.summary,
                propertyId: dealData.propertyId,
                dealValue: dealData.dealValue,
                commissionFormulaId: dealData.commissionFormulaId,
                estimatedCommission,
                conditions: dealData.conditions ? JSON.parse(JSON.stringify(dealData.conditions)) : undefined,
                settlementDate: dealData.settlementDate,
                goLiveDate: dealData.goLiveDate,
                auctionDate: dealData.auctionDate,
                tenderCloseDate: dealData.tenderCloseDate,
                nextActionOwner: 'agent',
                stageEnteredAt: new Date(),
                // Phase 3: Conjunctional sale fields
                isConjunctional: dealData.isConjunctional ?? false,
                conjunctionalAgencyName: dealData.conjunctionalAgencyName,
                conjunctionalSplit: dealData.conjunctionalSplit,
                isListingAgent: dealData.isListingAgent ?? true,
                contacts: contactIds ? {
                    connect: contactIds.map(id => ({ id }))
                } : undefined
            }
        });

        return deal;
    }

    /**
     * Get or create default commission formula for a user
     */
    async getDefaultCommissionFormula(userId: string): Promise<CommissionFormula> {
        let formula = await prisma.commissionFormula.findFirst({
            where: { userId, isDefault: true }
        });

        if (!formula) {
            // Create default NZ commission formula
            formula = await prisma.commissionFormula.create({
                data: {
                    userId,
                    name: 'Standard Residential',
                    isDefault: true,
                    tiers: JSON.parse(JSON.stringify([
                        { minPrice: 0, maxPrice: 400000, rate: 0.04 },
                        { minPrice: 400000, maxPrice: 1000000, rate: 0.025 },
                        { minPrice: 1000000, maxPrice: null, rate: 0.02 }
                    ]))
                }
            });
        }

        return formula;
    }

}

export const dealFlowService = new DealFlowService();
