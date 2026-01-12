import prisma from '../config/database.js';
import { logger } from './logger.service.js';
import { askZenaService } from './ask-zena.service.js';

export interface UserPersona {
    tone: {
        formality: number; // 0-1 (0 = casual, 1 = formal)
        lengthPreference: 'concise' | 'balanced' | 'detailed';
        sentimentBias: number; // -1 to 1 (negative to positive)
        linguisticMarkers: string[]; // ['emoji_user', 'bullet_point_lover', 'industry_jargon']
    };
    actionWeights: Record<string, number>; // type -> strength (0-1)
    peakActivityHours: number[]; // 0-23
    maturityLevel: number; // 0-3 (Learning, Observing, Profiling, Predicting)
}

const DEFAULT_PERSONA: UserPersona = {
    tone: {
        formality: 0.6,
        lengthPreference: 'balanced',
        sentimentBias: 0.2,
        linguisticMarkers: []
    },
    actionWeights: {},
    peakActivityHours: [9, 10, 11, 14, 15, 16],
    maturityLevel: 0
};

export class UserPersonaService {
    /**
     * Get or synthesize the latest persona for a user
     */
    async getPersona(userId: string): Promise<UserPersona> {
        try {
            // Check if we have a persona cached in user preferences
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { preferences: true }
            });

            const preferences = user?.preferences as any;
            if (preferences?.mlPersona) {
                return preferences.mlPersona as UserPersona;
            }

            // If not found or stale, synthesize a new one
            return await this.synthesizePersona(userId);
        } catch (error) {
            logger.error(`[UserPersona] Error getting persona for ${userId}:`, error);
            return DEFAULT_PERSONA;
        }
    }

    /**
     * Analyze interaction history to build a persona
     */
    async synthesizePersona(userId: string): Promise<UserPersona> {
        logger.info(`[UserPersona] Synthesizing persona for user ${userId}...`);

        // 1. Fetch Chat History (last 50 messages)
        const messages = await prisma.chatMessage.findMany({
            where: { conversation: { userId }, role: 'user' },
            take: 50,
            orderBy: { createdAt: 'desc' }
        });

        // 2. Fetch ZenaAction History
        const actions = await prisma.zenaAction.findMany({
            where: { userId },
            take: 100,
            orderBy: { triggeredAt: 'desc' }
        });

        // 3. Analyze Tone via AI (Brain-First)
        let tone = DEFAULT_PERSONA.tone;
        if (messages.length > 5) {
            tone = await this.analyzeLinguisticStyle(messages.map(m => m.content));
        }

        // 4. Analyze Action Success Rates
        const actionWeights: Record<string, number> = {};
        const actionGroups: Record<string, { approved: number, total: number }> = {};

        actions.forEach(action => {
            if (!actionGroups[action.type]) {
                actionGroups[action.type] = { approved: 0, total: 0 };
            }
            actionGroups[action.type].total++;
            if (action.status === 'executed') {
                actionGroups[action.type].approved++;
            }
        });

        Object.entries(actionGroups).forEach(([type, stats]) => {
            actionWeights[type] = stats.approved / stats.total;
        });

        // 5. Activity Hours
        const peakHours = this.calculatePeakHours(messages, actions);

        const newPersona: UserPersona = {
            tone,
            actionWeights,
            peakActivityHours: peakHours,
            maturityLevel: this.calculateMaturity(messages.length, actions.length)
        };

        // Cache the persona
        await this.cachePersona(userId, newPersona);

        return newPersona;
    }

    private async analyzeLinguisticStyle(samples: string[]): Promise<UserPersona['tone']> {
        try {
            const prompt = `Analyze the following user messages (real estate agent) to determine their linguistic persona for an AI assistant to mimic.

SAMPLE MESSAGES:
${samples.join('\n---\n')}

RETURN JSON ONLY:
{
  "formality": float (0-1),
  "lengthPreference": "concise" | "balanced" | "detailed",
  "sentimentBias": float (-1 to 1),
  "linguisticMarkers": ["bullet_points", "emoji_heavy", "industry_slang", "etc"]
}`;

            const result = await askZenaService.askBrain(prompt, { jsonMode: true });
            return JSON.parse(result);
        } catch (error) {
            logger.warn('[UserPersona] Failed to analyze tone using AI, using defaults');
            return DEFAULT_PERSONA.tone;
        }
    }

    private calculatePeakHours(messages: any[], actions: any[]): number[] {
        const hourCounts: Record<number, number> = {};
        [...messages, ...actions].forEach(item => {
            const date = item.createdAt || item.triggeredAt;
            const hour = new Date(date).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        return Object.entries(hourCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([hour]) => parseInt(hour));
    }

    private calculateMaturity(msgCount: number, actionCount: number): number {
        if (msgCount > 50 && actionCount > 20) return 3; // Predicting
        if (msgCount > 20 || actionCount > 10) return 2; // Profiling
        if (msgCount > 5 || actionCount > 2) return 1; // Observing
        return 0; // Learning
    }

    private async cachePersona(userId: string, persona: UserPersona) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const prefs = (user?.preferences as any) || {};
        prefs.mlPersona = persona;
        prefs.mlPersonaUpdatedAt = new Date();

        await prisma.user.update({
            where: { id: userId },
            data: { preferences: prefs }
        });
    }

    /**
     * Provide a system prompt snippet based on persona
     */
    getSystemPromptSnippet(persona: UserPersona): string {
        const { tone } = persona;
        let snippet = `\n[Linguistic Persona Matching]\n`;
        snippet += `- Formality: ${tone.formality > 0.7 ? 'Formal and Precise' : tone.formality < 0.3 ? 'Casual and Breezy' : 'Professional yet Friendly'}\n`;
        snippet += `- Response Length: ${tone.lengthPreference}\n`;
        if (tone.linguisticMarkers.includes('emoji_heavy')) snippet += `- Use emojis naturally as the user does.\n`;
        if (tone.linguisticMarkers.includes('bullet_points')) snippet += `- Use bullet points for structured data.\n`;

        return snippet;
    }
}

export const userPersonaService = new UserPersonaService();
