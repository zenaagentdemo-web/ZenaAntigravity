/**
 * ContactEngagementScorer.ts
 * 
 * Context-aware engagement scoring system for real estate contacts.
 * Calculates Intel % and Velocity % with stage-aware adjustments.
 */

// Deal stages from the system
export type DealStage =
    | 'lead'
    | 'qualified'
    | 'viewing'
    | 'offer'
    | 'conditional'
    | 'pre_settlement'
    | 'sold'
    | 'nurture';

export type ContactRole = 'buyer' | 'vendor' | 'market' | 'tradesperson' | 'agent' | 'other';

export interface EngagementInput {
    // Profile completeness
    hasName: boolean;
    hasEmail: boolean;
    hasPhone: boolean;
    hasRole: boolean;

    // Activity metrics
    activityCount7d: number;  // Activities in last 7 days
    activityCount14d: number; // Activities in last 14 days (includes 7d)

    // Engagement depth
    emailsSent: number;
    emailsReceived: number;
    viewingsAttended: number;
    offersMade: number;

    // Context
    role: ContactRole;
    dealStage?: DealStage;
    daysSinceSettlement?: number; // If they've recently transacted
}

export interface EngagementScore {
    intelScore: number;           // 0-100
    momentum: number;             // -100 to +100 (was velocity)
    adjustedTarget: number;       // Expected target for this contact type
    isOnTrack: boolean;           // Is score >= adjusted target?
    dealStage: DealStage | 'none'; // The deal stage used for scoring
    stageContext: string;         // Human-readable context
    improvementTips: string[];    // Actionable suggestions
}

// Stage configuration with expected engagement levels
const STAGE_CONFIG: Record<DealStage | 'none', {
    baseTarget: number;
    momentumExpectation: 'high' | 'positive' | 'stable' | 'declining_ok' | 'low';
    context: string;
}> = {
    lead: {
        baseTarget: 60,
        momentumExpectation: 'high',
        context: 'New lead - needs active engagement to qualify'
    },
    qualified: {
        baseTarget: 70,
        momentumExpectation: 'positive',
        context: 'Qualified lead - building momentum'
    },
    viewing: {
        baseTarget: 80,
        momentumExpectation: 'high',
        context: 'Active viewings - peak engagement period'
    },
    offer: {
        baseTarget: 85,
        momentumExpectation: 'positive',
        context: 'Offer stage - critical communication period'
    },
    conditional: {
        baseTarget: 75,
        momentumExpectation: 'stable',
        context: 'Conditional - waiting on conditions to clear'
    },
    pre_settlement: {
        baseTarget: 65,
        momentumExpectation: 'declining_ok',
        context: 'Pre-settlement - transaction winding down'
    },
    sold: {
        baseTarget: 30,
        momentumExpectation: 'low',
        context: 'Recently settled - hibernation mode is normal'
    },
    nurture: {
        baseTarget: 40,
        momentumExpectation: 'stable',
        context: 'Nurture phase - periodic touchpoints maintain relationship'
    },
    none: {
        baseTarget: 50,
        momentumExpectation: 'stable',
        context: 'No active deal - general contact'
    }
};

// Role-specific tips
const ROLE_TIPS: Record<ContactRole, string[]> = {
    buyer: [
        'Send new listings matching their criteria',
        'Invite to open homes in their target areas',
        'Share market insights for their preferred suburbs'
    ],
    vendor: [
        'Provide regular campaign updates',
        'Share buyer feedback after viewings',
        'Send comparable sales data'
    ],
    market: [
        'Add to newsletter for market updates',
        'Invite to community events',
        'Share suburb reports'
    ],
    tradesperson: [
        'Request quotes for upcoming jobs',
        'Refer to clients needing services',
        'Keep availability updated'
    ],
    agent: [
        'Discuss conjunctional opportunities',
        'Share off-market listings',
        'Coordinate on mutual clients'
    ],
    other: [
        'Clarify their real estate needs',
        'Determine if buyer/vendor potential',
        'Add to general database'
    ]
};

/**
 * Calculate engagement score for a contact
 */
export function calculateEngagementScore(input: EngagementInput): EngagementScore {
    // 1. Calculate raw Intel Score (0-100)
    let rawScore = 0;

    // Profile completeness (20 points max)
    if (input.hasName) rawScore += 5;
    if (input.hasEmail) rawScore += 8;
    if (input.hasPhone) rawScore += 5;
    if (input.hasRole) rawScore += 2;

    // Recent activity (30 points max)
    // Score more for frequent activity, diminishing returns
    const activityScore = Math.min(30, input.activityCount7d * 6);
    rawScore += activityScore;

    // Response rate (25 points max)
    // Based on ratio of emails received vs sent
    const totalEmails = input.emailsSent + input.emailsReceived;
    if (totalEmails > 0) {
        const responseRatio = input.emailsReceived / Math.max(1, input.emailsSent);
        // Ideal is 0.5-1.5 (they respond about as much as you reach out)
        if (responseRatio >= 0.3 && responseRatio <= 2) {
            rawScore += 25;
        } else if (responseRatio > 0) {
            rawScore += 15;
        } else {
            rawScore += 5;
        }
    }

    // Engagement depth (25 points max)
    if (input.viewingsAttended > 0) rawScore += Math.min(15, input.viewingsAttended * 5);
    if (input.offersMade > 0) rawScore += 10;

    // Cap at 100
    const intelScore = Math.min(100, Math.round(rawScore));

    // 2. Calculate Momentum (-100 to +100)
    // Compare first 7 days to second 7 days
    const firstWeekActivity = input.activityCount7d;
    const previousWeekActivity = input.activityCount14d - input.activityCount7d;

    let momentum = 0;
    if (previousWeekActivity > 0) {
        momentum = Math.round(((firstWeekActivity - previousWeekActivity) / previousWeekActivity) * 100);
    } else if (firstWeekActivity > 0) {
        momentum = 50; // New activity from zero = positive trend
    }
    // Clamp to -100 to +100
    momentum = Math.max(-100, Math.min(100, momentum));

    // 3. Get stage context and adjusted target
    const stage = input.dealStage || 'none';
    const stageConfig = STAGE_CONFIG[stage];
    let adjustedTarget = stageConfig.baseTarget;

    // Additional adjustment for recently settled contacts
    if (input.daysSinceSettlement !== undefined) {
        if (input.daysSinceSettlement < 30) {
            // First month after settlement - very low expectations
            adjustedTarget = Math.min(adjustedTarget, 25);
        } else if (input.daysSinceSettlement < 180) {
            // 1-6 months after - entering nurture phase
            adjustedTarget = Math.min(adjustedTarget, 40);
        }
    }

    // 4. Determine if on track
    const isOnTrack = intelScore >= adjustedTarget;

    // 5. Get improvement tips based on what's missing
    const tips: string[] = [];

    if (!input.hasPhone) {
        tips.push('Add phone number to complete profile');
    }
    if (input.activityCount7d < 2) {
        tips.push('Schedule a touchpoint this week');
    }
    if (input.emailsReceived === 0 && input.emailsSent > 0) {
        tips.push('Try a different communication channel');
    }

    // Add role-specific tips
    const roleTips = ROLE_TIPS[input.role] || ROLE_TIPS.other;
    if (!isOnTrack && tips.length < 3) {
        tips.push(roleTips[Math.floor(Math.random() * roleTips.length)]);
    }

    return {
        intelScore,
        momentum,
        adjustedTarget,
        isOnTrack,
        dealStage: stage,
        stageContext: stageConfig.context,
        improvementTips: tips.slice(0, 3)
    };
}

/**
 * Get a human-readable explanation of the Intel score
 */
export function getIntelExplanation(score: EngagementScore, role: ContactRole): string {
    const { intelScore, adjustedTarget, isOnTrack, stageContext } = score;

    if (isOnTrack) {
        if (intelScore >= 80) {
            return role === 'buyer'
                ? 'Hot lead! High engagement suggests they\'re ready to make a move.'
                : role === 'vendor'
                    ? 'Strong vendor relationship. Campaign communication is solid.'
                    : 'Excellent engagement level for this contact.';
        }
        return `On track. ${stageContext}`;
    } else {
        const gap = adjustedTarget - intelScore;
        if (gap > 30) {
            return `Needs attention. Currently ${gap}% below target for this stage.`;
        }
        return `Slightly below target. ${stageContext}`;
    }
}

/**
 * Get a human-readable explanation of the Momentum
 */
export function getMomentumExplanation(momentum: number, dealStage?: DealStage): string {
    const stage = dealStage || 'none';
    const stageConfig = STAGE_CONFIG[stage];

    // Check if momentum is expected for this stage
    const expectation = stageConfig.momentumExpectation;

    if (momentum > 20) {
        return 'Building momentum - they\'re heating up!';
    } else if (momentum > 0) {
        return 'Slight upward momentum.';
    } else if (momentum === 0) {
        return 'Engagement is steady.';
    } else if (momentum > -20) {
        if (expectation === 'declining_ok' || expectation === 'low') {
            return 'Normal cooling as transaction completes.';
        }
        return 'Slight slowdown in engagement.';
    } else {
        if (expectation === 'declining_ok' || expectation === 'low') {
            return 'Expected reduction post-transaction.';
        }
        return 'Momentum dropping - may need re-engagement.';
    }
}

/**
 * Generate mock engagement data for demo purposes
 * This simulates what would come from real activity tracking
 */
export function generateMockEngagementInput(
    name: string,
    emails: string[],
    phones: string[],
    role: ContactRole,
    dealStage?: DealStage
): EngagementInput {
    // Seed randomness based on name for consistency
    const seed = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rand = (max: number) => Math.floor((seed * 9301 + 49297) % 233280 / 233280 * max);

    // Stage-aware activity generation
    let activityMultiplier = 1;
    if (dealStage === 'viewing' || dealStage === 'offer') {
        activityMultiplier = 2;
    } else if (dealStage === 'sold' || dealStage === 'nurture') {
        activityMultiplier = 0.3;
    }

    const baseActivity = rand(5);

    return {
        hasName: !!name,
        hasEmail: emails.length > 0,
        hasPhone: phones.length > 0,
        hasRole: !!role && role !== 'other',
        activityCount7d: Math.floor(baseActivity * activityMultiplier),
        activityCount14d: Math.floor((baseActivity + rand(3)) * activityMultiplier * 1.5),
        emailsSent: rand(10),
        emailsReceived: rand(8),
        viewingsAttended: role === 'buyer' ? rand(4) : 0,
        offersMade: role === 'buyer' && rand(10) > 7 ? rand(2) : 0,
        role,
        dealStage,
        daysSinceSettlement: dealStage === 'sold' ? rand(180) : undefined
    };
}
