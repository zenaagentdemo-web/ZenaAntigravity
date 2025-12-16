import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Service for managing Focus and Waiting list logic
 * 
 * Focus list: Threads where the agent owes a reply (3-10 threads, ordered by priority/risk)
 * Waiting list: Threads where others owe a reply
 */
export class FocusWaitingService {
  /**
   * Get Focus list for a user
   * Returns threads where agent owes reply, ordered by priority/risk
   * Enforces size constraint of 3-10 threads
   * 
   * @param userId - The user ID
   * @returns Array of focus threads (3-10 threads, or fewer if insufficient threads)
   */
  async getFocusList(userId: string) {
    const MAX_FOCUS_SIZE = 10;

    // Fetch all focus threads ordered by priority
    const focusThreads = await prisma.thread.findMany({
      where: {
        userId,
        category: 'focus',
      },
      orderBy: this.getPriorityOrderBy(),
      select: {
        id: true,
        subject: true,
        participants: true,
        classification: true,
        category: true,
        riskLevel: true,
        riskReason: true,
        nextAction: true,
        nextActionOwner: true,
        lastMessageAt: true,
        lastReplyAt: true,
        summary: true,
        draftResponse: true,
        propertyId: true,
        dealId: true,
        stage: true,
        createdAt: true,
        updatedAt: true,
        property: {
          select: {
            id: true,
            address: true,
          },
        },
        deal: {
          select: {
            id: true,
            stage: true,
            riskLevel: true,
          },
        },
      },
    });

    // Apply size constraint: return 3-10 threads (or fewer if insufficient)
    const constrainedList = focusThreads.slice(0, MAX_FOCUS_SIZE);

    return {
      threads: constrainedList,
      total: focusThreads.length,
      displayed: constrainedList.length,
      hasMore: focusThreads.length > MAX_FOCUS_SIZE,
    };
  }

  /**
   * Get Waiting list for a user
   * Returns threads where others owe reply
   * 
   * @param userId - The user ID
   * @param options - Optional filters and pagination
   * @returns Array of waiting threads
   */
  async getWaitingList(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      riskOnly?: boolean;
    } = {}
  ) {
    const { limit = 50, offset = 0, riskOnly = false } = options;

    const where: any = {
      userId,
      category: 'waiting',
    };

    // Filter for at-risk threads only if requested
    if (riskOnly) {
      where.riskLevel = {
        in: ['low', 'medium', 'high'],
      };
    }

    const waitingThreads = await prisma.thread.findMany({
      where,
      orderBy: [
        { riskLevel: 'desc' },
        { lastMessageAt: 'desc' },
      ],
      take: limit,
      skip: offset,
      select: {
        id: true,
        subject: true,
        participants: true,
        classification: true,
        category: true,
        riskLevel: true,
        riskReason: true,
        nextAction: true,
        nextActionOwner: true,
        lastMessageAt: true,
        lastReplyAt: true,
        summary: true,
        propertyId: true,
        dealId: true,
        stage: true,
        createdAt: true,
        updatedAt: true,
        property: {
          select: {
            id: true,
            address: true,
          },
        },
        deal: {
          select: {
            id: true,
            stage: true,
            riskLevel: true,
          },
        },
      },
    });

    const total = await prisma.thread.count({ where });

    return {
      threads: waitingThreads,
      total,
      displayed: waitingThreads.length,
      pagination: {
        limit,
        offset,
        hasMore: total > offset + waitingThreads.length,
      },
    };
  }

  /**
   * Calculate priority ordering for Focus list
   * Priority is based on:
   * 1. Risk level (high > medium > low > none)
   * 2. Last message time (older messages = higher priority)
   * 
   * @returns Prisma orderBy clause
   */
  private getPriorityOrderBy() {
    return [
      // First, order by risk level (descending: high, medium, low, none)
      { riskLevel: 'desc' as const },
      // Then by last message time (ascending: older first)
      { lastMessageAt: 'asc' as const },
    ];
  }

  /**
   * Get statistics for Focus and Waiting lists
   * 
   * @param userId - The user ID
   * @returns Statistics about focus and waiting threads
   */
  async getListStatistics(userId: string) {
    const [focusCount, waitingCount, atRiskCount] = await Promise.all([
      prisma.thread.count({
        where: {
          userId,
          category: 'focus',
        },
      }),
      prisma.thread.count({
        where: {
          userId,
          category: 'waiting',
        },
      }),
      prisma.thread.count({
        where: {
          userId,
          category: 'waiting',
          riskLevel: {
            in: ['low', 'medium', 'high'],
          },
        },
      }),
    ]);

    return {
      focus: {
        total: focusCount,
        displayed: Math.min(focusCount, 10),
      },
      waiting: {
        total: waitingCount,
        atRisk: atRiskCount,
      },
    };
  }
}

export const focusWaitingService = new FocusWaitingService();
