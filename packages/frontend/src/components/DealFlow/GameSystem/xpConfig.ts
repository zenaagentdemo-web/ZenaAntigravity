// XP Economy Configuration
// Based on psychology research: variable rewards, speed bonuses, streak multipliers

export const XP_ACTIONS = {
    // Core deal actions
    NEW_LISTING: 100,
    OPEN_HOME_HOSTED: 50,
    VIEWING_SCHEDULED: 25,
    VIEWING_COMPLETED: 35,
    OFFER_RECEIVED: 75,
    OFFER_ACCEPTED: 100,
    DEAL_CONDITIONAL: 150,
    DEAL_UNCONDITIONAL: 200,
    DEAL_SETTLED: 500,

    // Activity rewards
    DEAL_STATUS_UPDATE: 10,
    NOTE_ADDED: 5,
    TASK_COMPLETED: 15,
    LEAD_CONTACTED: 20,

    // Education/tips
    TIP_VIEWED: 5,
    LESSON_COMPLETED: 50,
    SKILL_CHALLENGE_PASSED: 100,

    // Daily engagement
    DAILY_LOGIN: 10,
    QUEST_COMPLETED: 0, // Dynamic based on quest
} as const;

export const SPEED_MULTIPLIERS = {
    SALE_WITHIN_7_DAYS: 3.0,
    SALE_WITHIN_14_DAYS: 2.0,
    SALE_WITHIN_30_DAYS: 1.5,
    SALE_WITHIN_60_DAYS: 1.25,
    SALE_STANDARD: 1.0,
} as const;

export const STREAK_BONUSES = {
    // Daily streak: % bonus per consecutive day (caps at 7)
    DAILY_STREAK_PERCENT_PER_DAY: 10,
    DAILY_STREAK_MAX_DAYS: 7,

    // Weekly listing streak
    WEEKLY_LISTING_STREAK_BONUS: 25, // 25% bonus if you list every week
} as const;

// Level progression - XP required for each level
export const LEVEL_THRESHOLDS: Record<number, number> = {
    1: 0,
    2: 100,
    3: 200,
    4: 350,
    5: 500,
    6: 700,
    7: 950,
    8: 1250,
    9: 1600,
    10: 2000,
    11: 2500,
    12: 3100,
    13: 3800,
    14: 4600,
    15: 5500,
    16: 6500,
    17: 7600,
    18: 8800,
    19: 10100,
    20: 11500,
    21: 13000,
    25: 18000,
    30: 25000,
    40: 40000,
    50: 60000,
    75: 100000,
    100: 150000,
};

export const LEVEL_TITLES: Record<number, string> = {
    1: 'Rookie',
    5: 'Rising Agent',
    10: 'Market Mover',
    15: 'Deal Hunter',
    20: 'Top Producer',
    30: 'Elite Closer',
    50: 'Legend',
    75: 'Market Titan',
    100: 'Tycoon',
};

export const getLevelTitle = (level: number): string => {
    const titles = Object.entries(LEVEL_TITLES)
        .sort(([a], [b]) => Number(b) - Number(a));

    for (const [threshold, title] of titles) {
        if (level >= Number(threshold)) {
            return title;
        }
    }
    return 'Rookie';
};

export const getXPForLevel = (level: number): number => {
    if (LEVEL_THRESHOLDS[level] !== undefined) {
        return LEVEL_THRESHOLDS[level];
    }
    // Linear extrapolation for levels beyond defined thresholds
    const knownLevels = Object.keys(LEVEL_THRESHOLDS).map(Number).sort((a, b) => a - b);
    const maxKnown = knownLevels[knownLevels.length - 1];
    if (level > maxKnown) {
        const baseXP = LEVEL_THRESHOLDS[maxKnown];
        return baseXP + (level - maxKnown) * 2000;
    }
    // Interpolation for gaps
    let lower = 1, upper = 2;
    for (let i = 0; i < knownLevels.length - 1; i++) {
        if (knownLevels[i] <= level && level <= knownLevels[i + 1]) {
            lower = knownLevels[i];
            upper = knownLevels[i + 1];
            break;
        }
    }
    const ratio = (level - lower) / (upper - lower);
    return Math.floor(LEVEL_THRESHOLDS[lower] + ratio * (LEVEL_THRESHOLDS[upper] - LEVEL_THRESHOLDS[lower]));
};

export const getLevelFromXP = (xp: number): number => {
    const levels = Object.entries(LEVEL_THRESHOLDS)
        .map(([level, threshold]) => ({ level: Number(level), threshold }))
        .sort((a, b) => b.threshold - a.threshold);

    for (const { level, threshold } of levels) {
        if (xp >= threshold) {
            return level;
        }
    }
    return 1;
};

// Neon color scheme for game UI
export const GAME_COLORS = {
    xpBar: '#00ff41',       // Neon green
    xpBarGlow: '#00ff4140',
    levelUp: '#ffd700',     // Gold
    streak: '#ff003c',      // Neon red
    quest: '#00f3ff',       // Cyan
    badge: '#bc13fe',       // Neon purple
    warning: '#ff6b35',     // Orange
    success: '#00ff41',
} as const;
