import { Deal, DealStage, RiskLevel, calculateDaysInStage } from '../types';
import { api } from '../../../utils/apiClient';
import { useState, useEffect } from 'react';

// ============================================================
// TYPES
// ============================================================

export type RiskSignalType =
    | 'stalling'
    | 'cold_buyer'
    | 'finance_risk'
    | 'builder_report_delay'
    | 'lim_delay'
    | 'valuation_gap'
    | 'vendor_expectations'
    | 'long_conditional';

export type RiskSeverity = 'medium' | 'high' | 'critical';

export type EmailSentiment = 'positive' | 'neutral' | 'hesitant' | 'cold';

export type PowerMoveAction = 'email' | 'call' | 'text' | 'viewing' | 'negotiation';

export interface RiskSignal {
    type: RiskSignalType;
    severity: RiskSeverity;
    detectedAt: Date;
    dataPoint?: string;
    description: string;
}

export interface PowerMove {
    id: string;
    action: PowerMoveAction;
    headline: string;
    rationale: string;
    draftContent: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface DealIntelligence {
    dealId: string;
    healthScore: number;
    healthVelocity: number;
    riskSignals: RiskSignal[];
    suggestedPowerMove: PowerMove | null;
    coachingInsight: string;
    executiveSummary?: string; // Phase 5: Deep Brief
    emailSentiment: EmailSentiment;
    needsLiveSession: boolean;
    daysInStage: number;
    stageHealthStatus: 'healthy' | 'warning' | 'critical';
    riskLevel?: string;
    analyzedAt?: string; // Phase 5: Snapshot time
}

export interface ContactIntelligence {
    contactId: string;
    motivation: string;
    urgencyScore: number;
    relationshipHealth: number;
    keyDrivers: string[];
    riskSignals: Array<{ type: string; severity: string; description: string }>;
    strategicAdvice: string;
    recommendedNextStep: string;
    analyzedAt?: string;
}

// ============================================================
// NZ MARKET CONSTANTS (REINZ Data)
// ============================================================

export const NZ_MARKET_DATA = {
    // REINZ 2024 statistics
    nationalMedianDaysToSell: 50,
    aucklandMedianDaysToSell: 51,
    stagedHomesAvgDays: 23,
    unstagedHomesAvgDays: 143,
    stagingPremiumPercent: 6, // 5-7% in Auckland
    nationalMedianPrice: 808000,

    // Condition thresholds (NZ typical)
    financeConditionTypicalDays: 10,
    builderReportTypicalDays: 5,
    limReportTypicalDays: 10,

    // Risk thresholds
    stallingThresholdDays: 5,
    coldBuyerThresholdDays: 3,
    longConditionalThresholdDays: 14,
};

// Stage-specific expected durations (in days)
const STAGE_EXPECTED_DURATION: Record<string, number> = {
    buyer_consult: 14,
    shortlisting: 21,
    viewings: 30,
    offer_made: 7,
    conditional: 14,
    unconditional: 7,
    pre_settlement: 21,
    settled: 0,
    nurture: 365,
    appraisal: 7,
    listing_signed: 5,
    marketing: 28,
    offers_received: 14,
};

// ============================================================
// COACHING CONTENT (NZ Localised)
// ============================================================

const COACHING_INSIGHTS: Record<RiskSignalType, string> = {
    stalling: 'I sense this deal is losing heat. No activity in {days} days. A quick "pulse check" nudge can restart the momentum.',
    cold_buyer: 'The purchaser has gone quiet. Don\'t talk price—nudge them with a lifestyle insight they haven\'t considered yet.',
    finance_risk: 'Finance is reaching the "red zone" for this condition. We need a proactive nudge to the broker to secure that approval.',
    builder_report_delay: 'The builder\'s report is lingering. Usually, this means there\'s a hidden worry. Let\'s nudge them to air it out.',
    lim_delay: 'Council is moving slow on the LIM. Keep the purchaser in the loop so they don\'t feel "ghosted" by the process.',
    valuation_gap: 'The valuation gap is a critical friction point. We need a strategic nudge to the vendor to manage expectations early.',
    vendor_expectations: 'Market days are climbing ({days}). We need a "reality check" nudge for the vendor based on recent REINZ data.',
    long_conditional: 'Extended conditions are momentum killers. Nudge the purchaser to confirm their "intent to proceed" today.',
};

const POWER_MOVE_TEMPLATES: Record<RiskSignalType, PowerMove> = {
    stalling: {
        id: 'pm-stalling',
        action: 'call',
        headline: 'Quick Check-In Call',
        rationale: 'Deals with no activity for 5+ days lose momentum. A brief call can reignite progress.',
        draftContent: 'Hi [Name], I just wanted to touch base on the property at [Address]. Is there anything I can help clarify or any concerns you\'d like to discuss?',
        priority: 'high',
    },
    cold_buyer: {
        id: 'pm-cold-buyer',
        action: 'text',
        headline: 'Lifestyle Reminder Text',
        rationale: 'Research shows 60% of cold buyers re-engage when reminded of lifestyle benefits rather than features.',
        draftContent: 'Hi [Name], I was just thinking about you and [Address]. I know it\'s a big decision—but I genuinely think this home matches what you described wanting. No pressure, but I\'m here if you\'d like to chat through any final thoughts.',
        priority: 'high',
    },
    finance_risk: {
        id: 'pm-finance',
        action: 'email',
        headline: 'Finance Status Check',
        rationale: 'Finance falling through is the most common reason NZ deals fail. Proactive check-ins prevent surprises.',
        draftContent: 'Subject: Quick finance update for [Address]\n\nHi [Agent/Name],\n\nJust checking in on the finance condition for [Address]. Has the purchaser received unconditional approval from their bank?\n\nIf there are any delays, please let me know—we can discuss options like a short extension if helpful.\n\nKind regards',
        priority: 'high',
    },
    builder_report_delay: {
        id: 'pm-builder',
        action: 'call',
        headline: 'Builder\'s Report Follow-Up',
        rationale: 'Unsatisfactory builder\'s reports are a top reason for deal failures in NZ. Address concerns early.',
        draftContent: 'Hi [Name], I noticed the builder\'s report condition is still pending. Has the inspection been completed? If there are any concerns in the report, let\'s discuss how to address them.',
        priority: 'medium',
    },
    lim_delay: {
        id: 'pm-lim',
        action: 'email',
        headline: 'LIM Report Progress Check',
        rationale: 'LIM reports can take 10+ working days from some councils. Keep the purchaser informed.',
        draftContent: 'Subject: LIM report status for [Address]\n\nHi [Name],\n\nI wanted to check on the progress of the LIM report for [Address]. Council processing times can vary—have you received it yet?\n\nPlease let me know if you need an extension to the condition date.\n\nKind regards',
        priority: 'medium',
    },
    valuation_gap: {
        id: 'pm-valuation',
        action: 'call',
        headline: 'Valuation Discussion',
        rationale: 'When bank valuations come in below sale price, quick action can save the deal.',
        draftContent: 'Hi [Name], I understand the bank valuation may have come in below our agreed price. Let\'s discuss options—we can negotiate a price adjustment, explore bridging finance, or see if the purchaser can cover the gap.',
        priority: 'critical',
    },
    vendor_expectations: {
        id: 'pm-vendor',
        action: 'email',
        headline: 'Market Positioning Review',
        rationale: 'Properties above the REINZ median days on market may need pricing or presentation adjustments.',
        draftContent: 'Subject: Marketing review for [Address]\n\nHi [Vendor Name],\n\nI wanted to schedule a time to review our marketing strategy for [Address]. With [X] days on market, we should discuss:\n\n• Current market feedback\n• Pricing position relative to recent sales\n• Potential staging or presentation improvements\n\nResearch shows staged homes sell 6x faster in NZ. Would you be open to discussing options?\n\nKind regards',
        priority: 'medium',
    },
    long_conditional: {
        id: 'pm-long-conditional',
        action: 'call',
        headline: 'Conditional Status Deep-Dive',
        rationale: 'Extended conditional periods often indicate hidden concerns. A direct conversation can uncover issues.',
        draftContent: 'Hi [Name], our conditional sale at [Address] has been pending for [X] days. I want to make sure we\'re addressing any concerns. Can we have a quick call to discuss the status of each condition?',
        priority: 'high',
    },
};

// ============================================================
// INTELLIGENCE ENGINE
// ============================================================

/**
 * Analyse a deal and generate intelligence insights
 */
export function analyseDeal(deal: Deal): DealIntelligence {
    const daysInStage = calculateDaysInStage(deal.stageEnteredAt);
    const riskSignals = detectRiskSignals(deal, daysInStage);
    const healthScore = calculateHealthScore(deal, riskSignals, daysInStage);
    const stageHealthStatus = getStageHealthStatus(healthScore);
    const suggestedPowerMove = selectPowerMove(riskSignals);
    const coachingInsight = generateCoachingInsight(riskSignals, daysInStage);
    const needsLiveSession = riskSignals.some(r => r.severity === 'critical') ||
        riskSignals.length >= 3 ||
        daysInStage > STAGE_EXPECTED_DURATION[deal.stage] * 2;

    // Calculate health velocity (mocked based on signals and duration)
    const velocityFactor = riskSignals.length > 0 ? -2 * riskSignals.length : 2;
    const durationPenalty = daysInStage > STAGE_EXPECTED_DURATION[deal.stage] ? -1 : 0;
    const healthVelocity = velocityFactor + durationPenalty;

    return {
        dealId: deal.id,
        healthScore,
        healthVelocity,
        riskSignals,
        suggestedPowerMove,
        coachingInsight,
        emailSentiment: 'neutral',
        needsLiveSession,
        daysInStage,
        stageHealthStatus,
    };
}

/**
 * Detect risk signals from deal data
 */
function detectRiskSignals(deal: Deal, daysInStage: number): RiskSignal[] {
    const signals: RiskSignal[] = [];
    const now = new Date();

    // Check for stalling (no activity)
    if (deal.lastContactAt) {
        const daysSinceContact = Math.floor(
            (now.getTime() - new Date(deal.lastContactAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceContact >= NZ_MARKET_DATA.stallingThresholdDays) {
            signals.push({
                type: 'stalling',
                severity: daysSinceContact >= 10 ? 'high' : 'medium',
                detectedAt: now,
                dataPoint: `${daysSinceContact} days since last contact`,
                description: `No activity for ${daysSinceContact} days`,
            });
        }
    }

    // Check stage duration
    const expectedDuration = STAGE_EXPECTED_DURATION[deal.stage] || 14;
    if (daysInStage > expectedDuration * 1.5) {
        const severity: RiskSeverity = daysInStage > expectedDuration * 2 ? 'high' : 'medium';
        signals.push({
            type: deal.stage.includes('conditional') ? 'long_conditional' : 'stalling',
            severity,
            detectedAt: now,
            dataPoint: `${daysInStage} days in ${deal.stage}`,
            description: `${daysInStage} days in stage (expected: ${expectedDuration})`,
        });
    }

    // Check conditions for delays
    if (deal.conditions) {
        for (const condition of deal.conditions) {
            if (condition.status === 'pending') {
                const dueDate = new Date(condition.dueDate);
                const daysUntilDue = Math.floor(
                    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysUntilDue <= 2 && condition.type === 'finance') {
                    signals.push({
                        type: 'finance_risk',
                        severity: daysUntilDue <= 0 ? 'critical' : 'high',
                        detectedAt: now,
                        dataPoint: `Finance due in ${daysUntilDue} days`,
                        description: `Finance condition expires ${daysUntilDue <= 0 ? 'today' : 'soon'}`,
                    });
                }

                if (daysUntilDue <= 1 && condition.type === 'building_report') {
                    signals.push({
                        type: 'builder_report_delay',
                        severity: 'high',
                        detectedAt: now,
                        dataPoint: `Builder's report due in ${daysUntilDue} days`,
                        description: 'Builder\'s report condition expiring soon',
                    });
                }

                if (daysUntilDue <= 1 && condition.type === 'lim') {
                    signals.push({
                        type: 'lim_delay',
                        severity: 'medium',
                        detectedAt: now,
                        dataPoint: `LIM due in ${daysUntilDue} days`,
                        description: 'LIM condition expiring soon',
                    });
                }
            }
        }
    }

    // Check for long time on market (seller deals)
    if (deal.pipelineType === 'seller' && deal.goLiveDate) {
        const daysOnMarket = Math.floor(
            (now.getTime() - new Date(deal.goLiveDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysOnMarket > NZ_MARKET_DATA.nationalMedianDaysToSell) {
            signals.push({
                type: 'vendor_expectations',
                severity: daysOnMarket > 70 ? 'high' : 'medium',
                detectedAt: now,
                dataPoint: `${daysOnMarket} days on market`,
                description: `${daysOnMarket} days on market (above NZ median of 50)`,
            });
        }
    }

    return signals;
}

/**
 * Calculate deal health score (0-100)
 */
function calculateHealthScore(
    deal: Deal,
    riskSignals: RiskSignal[],
    daysInStage: number
): number {
    let score = 100;

    // Deduct for risk signals
    for (const signal of riskSignals) {
        switch (signal.severity) {
            case 'critical':
                score -= 30;
                break;
            case 'high':
                score -= 20;
                break;
            case 'medium':
                score -= 10;
                break;
        }
    }

    // Deduct for stage duration
    const expectedDuration = STAGE_EXPECTED_DURATION[deal.stage] || 14;
    if (daysInStage > expectedDuration) {
        const overageRatio = (daysInStage - expectedDuration) / expectedDuration;
        score -= Math.min(overageRatio * 15, 25);
    }

    // Deduct for existing risk level
    switch (deal.riskLevel) {
        case 'critical':
            score -= 15;
            break;
        case 'high':
            score -= 10;
            break;
        case 'medium':
            score -= 5;
            break;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get stage health status from score
 */
function getStageHealthStatus(score: number): 'healthy' | 'warning' | 'critical' {
    if (score >= 70) return 'healthy';
    if (score >= 40) return 'warning';
    return 'critical';
}

/**
 * Select the most urgent power move
 */
function selectPowerMove(riskSignals: RiskSignal[]): PowerMove | null {
    if (riskSignals.length === 0) return null;

    // Sort by severity and return the first matching template
    const sortedSignals = [...riskSignals].sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const topSignal = sortedSignals[0];
    return POWER_MOVE_TEMPLATES[topSignal.type] || null;
}

/**
 * Generate coaching insight text
 */
function generateCoachingInsight(riskSignals: RiskSignal[], daysInStage: number): string {
    if (riskSignals.length === 0) {
        return 'This deal is progressing well. Keep the momentum going!';
    }

    const topSignal = riskSignals.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    })[0];

    let insight = COACHING_INSIGHTS[topSignal.type] || 'This deal needs attention.';
    insight = insight.replace('{days}', String(daysInStage));

    return insight;
}

/**
 * Personalise draft content with deal data
 */
export function personalisePowerMove(powerMove: PowerMove, deal: Deal): PowerMove {
    let content = powerMove.draftContent;

    // Replace placeholders
    content = content.replace(/\[Address\]/g, deal.property?.address || 'the property');
    content = content.replace(/\[Name\]/g, deal.contacts?.[0]?.name || 'there');
    content = content.replace(/\[Vendor Name\]/g, deal.contacts?.[0]?.name || 'there');
    content = content.replace(/\[Agent\]/g, 'there');
    content = content.replace(/\[X\]/g, String(calculateDaysInStage(deal.stageEnteredAt)));

    return {
        ...powerMove,
        draftContent: content,
    };
}

/**
 * Async version that fetches deep AI intelligence from the backend
 */
export async function fetchDealIntelligence(dealId: string, forceRefresh = false): Promise<DealIntelligence> {
    try {
        const response = await api.get(`/api/deals/${dealId}/intelligence`, {
            params: { forceRefresh }
        });
        const data = response.data;

        return {
            ...data,
            dealId,
            riskSignals: data.riskSignals?.map((s: any) => ({
                ...s,
                detectedAt: s.detectedAt ? new Date(s.detectedAt) : new Date()
            })) || []
        };
    } catch (error) {
        console.error(`[ZenaIntelligence] AI analysis failed for ${dealId}:`, error);
        // Fallback to local heuristics if AI fails and not a force refresh
        if (!forceRefresh) {
            const deal = await api.get(`/api/deals/${dealId}`);
            return analyseDeal(deal.data.deal);
        }
        throw error;
    }
}

/**
 * Hook for easy intelligence fetching in components
 */
export function useDealIntelligence(dealId: string) {
    const [intelligence, setIntelligence] = useState<DealIntelligence | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadIntelligence = async (force = false) => {
        setLoading(true);
        try {
            const data = await fetchDealIntelligence(dealId, force);
            setIntelligence(data);
        } catch (err) {
            setError('Failed to load deep intelligence');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (dealId) loadIntelligence();
    }, [dealId]);

    return { intelligence, loading, error, refresh: () => loadIntelligence(true) };
}

/**
 * Contact Intelligence Fetching
 */
export async function fetchContactIntelligence(contactId: string, forceRefresh = false): Promise<ContactIntelligence> {
    const response = await api.get(`/api/contacts/${contactId}/intelligence`, {
        params: { forceRefresh }
    });
    return response.data;
}

/**
 * Hook for Contact Intelligence
 */
export function useContactIntelligence(contactId: string) {
    const [intelligence, setIntelligence] = useState<ContactIntelligence | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadIntelligence = async (force = false) => {
        setLoading(true);
        try {
            const data = await fetchContactIntelligence(contactId, force);
            setIntelligence(data);
        } catch (err) {
            setError('Failed to load relationship intel');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (contactId) loadIntelligence();
    }, [contactId]);

    return { intelligence, loading, error, refresh: () => loadIntelligence(true) };
}

export default {
    analyseDeal,
    fetchDealIntelligence,
    useDealIntelligence,
    personalisePowerMove,
    NZ_MARKET_DATA,
};
