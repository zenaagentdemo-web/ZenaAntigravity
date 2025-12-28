import create, { SetState, GetState } from 'zustand';
import { persist, StoreApiWithPersist } from 'zustand/middleware';
import {
    XP_ACTIONS,
    STREAK_BONUSES,
    getLevelFromXP,
    getXPForLevel,
    getLevelTitle
} from './xpConfig';

// Types
export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
    earnedAt?: Date;
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    xpReward: number;
    mysteryBonus?: boolean;
    progress: number;
    target: number;
    type: 'daily' | 'weekly' | 'achievement';
    expiresAt?: Date;
    completed: boolean;
}

export interface XPEvent {
    id: string;
    action: keyof typeof XP_ACTIONS;
    baseXP: number;
    multiplier: number;
    totalXP: number;
    timestamp: Date;
    description?: string;
}

export interface GameState {
    // Core stats
    totalXP: number;
    level: number;
    levelTitle: string;
    xpToNextLevel: number;
    xpProgress: number;

    // Streaks
    dailyStreak: number;
    lastLoginDate: string | null;
    weeklyListingStreak: number;
    lastListingWeek: string | null;

    // Collections
    badges: Badge[];
    completedQuestIds: string[];
    recentXPEvents: XPEvent[];

    // Session
    sessionXP: number;
    mysteryBonusActive: boolean;
    mysteryBonusMultiplier: number;
    mysteryBonusEndsAt: Date | null;

    // Leaderboard position
    leaderboardRank: number;

    // Actions
    awardXP: (action: keyof typeof XP_ACTIONS, options?: {
        description?: string;
        customMultiplier?: number;
        silent?: boolean;
    }) => XPEvent;
    recordDailyLogin: () => void;
    recordListing: () => void;
    activateMysteryBonus: (multiplier: number, durationMs: number) => void;
    checkMysteryBonusExpired: () => void;
    awardBadge: (badge: Omit<Badge, 'earnedAt'>) => void;
    hasBadge: (badgeId: string) => boolean;
    markQuestComplete: (questId: string) => void;
    isQuestComplete: (questId: string) => boolean;
    getStreakMultiplier: () => number;
    getCurrentMultiplier: () => number;
    resetSession: () => void;
}

const calculateLevelProgress = (totalXP: number, level: number) => {
    const currentLevelXP = getXPForLevel(level);
    const nextLevelXP = getXPForLevel(level + 1);
    const xpIntoLevel = totalXP - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;
    return {
        xpToNextLevel: xpNeeded - xpIntoLevel,
        xpProgress: Math.min(100, (xpIntoLevel / xpNeeded) * 100)
    };
};

const getWeekString = (date: Date = new Date()): string => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return `${date.getFullYear()}-W${Math.ceil((days + 1) / 7)}`;
};

const getDateString = (date: Date = new Date()): string => {
    return date.toISOString().split('T')[0];
};

// Zustand v3 store with persist
export const useGameStore = create<GameState>(
    persist(
        (set, get) => ({
            // Initial state
            totalXP: 0,
            level: 1,
            levelTitle: 'Rookie',
            xpToNextLevel: 100,
            xpProgress: 0,
            dailyStreak: 0,
            lastLoginDate: null,
            weeklyListingStreak: 0,
            lastListingWeek: null,
            badges: [],
            completedQuestIds: [],
            recentXPEvents: [],
            sessionXP: 0,
            mysteryBonusActive: false,
            mysteryBonusMultiplier: 1,
            mysteryBonusEndsAt: null,
            leaderboardRank: 1,

            // Award XP with multipliers
            awardXP: (action, options = {}) => {
                const state = get();
                const baseXP = XP_ACTIONS[action];

                // Calculate total multiplier
                let multiplier = options.customMultiplier ?? 1;
                multiplier *= state.getStreakMultiplier();
                if (state.mysteryBonusActive) {
                    multiplier *= state.mysteryBonusMultiplier;
                }

                const totalXP = Math.floor(baseXP * multiplier);

                const event: XPEvent = {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    action,
                    baseXP,
                    multiplier,
                    totalXP,
                    timestamp: new Date(),
                    description: options.description
                };

                const newTotalXP = state.totalXP + totalXP;
                const newLevel = getLevelFromXP(newTotalXP);
                const { xpToNextLevel, xpProgress } = calculateLevelProgress(newTotalXP, newLevel);

                set({
                    totalXP: newTotalXP,
                    level: newLevel,
                    levelTitle: getLevelTitle(newLevel),
                    xpToNextLevel,
                    xpProgress,
                    sessionXP: state.sessionXP + totalXP,
                    recentXPEvents: [event, ...state.recentXPEvents.slice(0, 19)]
                });

                return event;
            },

            // Record daily login for streak
            recordDailyLogin: () => {
                const state = get();
                const today = getDateString();
                const yesterday = getDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

                if (state.lastLoginDate === today) return;

                let newStreak = 1;
                if (state.lastLoginDate === yesterday) {
                    newStreak = Math.min(state.dailyStreak + 1, STREAK_BONUSES.DAILY_STREAK_MAX_DAYS);
                }

                set({
                    dailyStreak: newStreak,
                    lastLoginDate: today
                });

                get().awardXP('DAILY_LOGIN', { description: `Day ${newStreak} login bonus!` });
            },

            // Record listing for weekly streak
            recordListing: () => {
                const state = get();
                const thisWeek = getWeekString();
                const lastWeek = getWeekString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

                let newStreak = 1;
                if (state.lastListingWeek === lastWeek) {
                    newStreak = state.weeklyListingStreak + 1;
                } else if (state.lastListingWeek === thisWeek) {
                    newStreak = state.weeklyListingStreak;
                }

                set({
                    weeklyListingStreak: newStreak,
                    lastListingWeek: thisWeek
                });
            },

            // Activate mystery bonus
            activateMysteryBonus: (multiplier: number, durationMs: number) => {
                set({
                    mysteryBonusActive: true,
                    mysteryBonusMultiplier: multiplier,
                    mysteryBonusEndsAt: new Date(Date.now() + durationMs)
                });
            },

            // Check if mystery bonus expired
            checkMysteryBonusExpired: () => {
                const state = get();
                if (state.mysteryBonusActive && state.mysteryBonusEndsAt) {
                    if (new Date() > new Date(state.mysteryBonusEndsAt)) {
                        set({
                            mysteryBonusActive: false,
                            mysteryBonusMultiplier: 1,
                            mysteryBonusEndsAt: null
                        });
                    }
                }
            },

            // Award badge
            awardBadge: (badge: Omit<Badge, 'earnedAt'>) => {
                const state = get();
                if (state.hasBadge(badge.id)) return;

                set({
                    badges: [...state.badges, { ...badge, earnedAt: new Date() }]
                });
            },

            hasBadge: (badgeId: string) => {
                return get().badges.some((b: Badge) => b.id === badgeId);
            },

            // Quest management
            markQuestComplete: (questId: string) => {
                const state = get();
                if (!state.completedQuestIds.includes(questId)) {
                    set({
                        completedQuestIds: [...state.completedQuestIds, questId]
                    });
                }
            },

            isQuestComplete: (questId: string) => {
                return get().completedQuestIds.includes(questId);
            },

            // Calculate streak multiplier
            getStreakMultiplier: () => {
                const state = get();
                const streakBonus = state.dailyStreak * (STREAK_BONUSES.DAILY_STREAK_PERCENT_PER_DAY / 100);
                return 1 + streakBonus;
            },

            // Get current total multiplier
            getCurrentMultiplier: () => {
                const state = get();
                let mult = state.getStreakMultiplier();
                if (state.mysteryBonusActive) {
                    mult *= state.mysteryBonusMultiplier;
                }
                return mult;
            },

            // Reset session XP
            resetSession: () => {
                set({ sessionXP: 0 });
            }
        }),
        {
            name: 'zena-game-state',
            getStorage: () => localStorage,
            partialize: (state: GameState) => ({
                totalXP: state.totalXP,
                level: state.level,
                levelTitle: state.levelTitle,
                dailyStreak: state.dailyStreak,
                lastLoginDate: state.lastLoginDate,
                weeklyListingStreak: state.weeklyListingStreak,
                lastListingWeek: state.lastListingWeek,
                badges: state.badges,
                completedQuestIds: state.completedQuestIds,
            })
        }
    )
);
