/**
 * Token Tracking Service
 * 
 * Logs all LLM API calls to database for usage analytics.
 * This service provides centralized tracking of AI token usage across all Zena services.
 * 
 * View data via:
 * - Database queries on AIUsageLog table
 * - Server console logs with [TokenTracker] prefix
 * - /api/admin/token-usage endpoint (if enabled)
 */

import prisma from '../config/database.js';

interface TokenUsage {
    userId?: string;
    source: string;
    endpoint?: string;
    model: string;
    inputTokens: number;
    outputTokens?: number;
    durationMs?: number;
}

interface UsageStats {
    source: string;
    _sum: {
        inputTokens: number | null;
        outputTokens: number | null;
    };
    _count: number;
}

class TokenTrackingService {
    /**
     * Estimate tokens from text length
     * Rough estimate: ~4 characters per token for English text
     */
    estimateTokens(text: string): number {
        if (!text) return 0;
        return Math.ceil(text.length / 4);
    }

    /**
     * Log an AI usage event to the database
     * This is designed to be fire-and-forget to not block the main flow
     */
    async log(usage: TokenUsage): Promise<void> {
        try {
            await prisma.aIUsageLog.create({
                data: {
                    userId: usage.userId,
                    source: usage.source,
                    endpoint: usage.endpoint,
                    model: usage.model,
                    inputTokens: usage.inputTokens,
                    outputTokens: usage.outputTokens,
                    durationMs: usage.durationMs,
                }
            });

            console.log(
                `[TokenTracker] ${usage.source}: ~${usage.inputTokens} input` +
                (usage.outputTokens ? ` / ~${usage.outputTokens} output` : '') +
                ` tokens (${usage.model})` +
                (usage.durationMs ? ` [${usage.durationMs}ms]` : '')
            );
        } catch (error) {
            // Don't let logging errors affect the main flow
            console.error('[TokenTracker] Failed to log usage:', error);
        }
    }

    /**
     * Get usage statistics for a time range, grouped by source
     */
    async getStatsBySource(startDate: Date, endDate: Date, userId?: string): Promise<UsageStats[]> {
        const where: any = {
            createdAt: { gte: startDate, lte: endDate }
        };
        if (userId) where.userId = userId;

        const stats = await prisma.aIUsageLog.groupBy({
            by: ['source'],
            where,
            _sum: {
                inputTokens: true,
                outputTokens: true
            },
            _count: true
        });

        return stats as UsageStats[];
    }

    /**
     * Get total usage for a time range
     */
    async getTotals(startDate: Date, endDate: Date, userId?: string) {
        const where: any = {
            createdAt: { gte: startDate, lte: endDate }
        };
        if (userId) where.userId = userId;

        const totals = await prisma.aIUsageLog.aggregate({
            where,
            _sum: {
                inputTokens: true,
                outputTokens: true
            },
            _count: true
        });

        return {
            totalRequests: totals._count,
            totalInputTokens: totals._sum.inputTokens || 0,
            totalOutputTokens: totals._sum.outputTokens || 0
        };
    }

    /**
     * Get daily usage breakdown
     */
    async getDailyUsage(days: number = 7, userId?: string) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const where: any = {
            createdAt: { gte: startDate }
        };
        if (userId) where.userId = userId;

        const logs = await prisma.aIUsageLog.findMany({
            where,
            select: {
                createdAt: true,
                inputTokens: true,
                outputTokens: true,
                source: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Group by day
        const dailyMap = new Map<string, { requests: number; inputTokens: number; outputTokens: number }>();

        for (const log of logs) {
            const day = log.createdAt.toISOString().split('T')[0];
            const existing = dailyMap.get(day) || { requests: 0, inputTokens: 0, outputTokens: 0 };
            existing.requests++;
            existing.inputTokens += log.inputTokens;
            existing.outputTokens += log.outputTokens || 0;
            dailyMap.set(day, existing);
        }

        return Array.from(dailyMap.entries()).map(([date, stats]) => ({
            date,
            ...stats
        }));
    }
}

export const tokenTrackingService = new TokenTrackingService();
