import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RiskAnalysisService, RiskLevel } from './risk-analysis.service.js';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    deal: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    thread: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
  };
});

const prisma = new PrismaClient();

describe('RiskAnalysisService', () => {
  let service: RiskAnalysisService;

  beforeEach(() => {
    service = new RiskAnalysisService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeDealRisk', () => {
    it('should return no risk for a deal with recent communication', async () => {
      const mockDeal = {
        id: 'deal-1',
        userId: 'user-1',
        stage: 'viewing',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        threads: [
          {
            id: 'thread-1',
            category: 'focus',
            lastMessageAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          },
          {
            id: 'thread-2',
            category: 'waiting',
            lastMessageAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          },
        ],
      };

      vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as any);

      const result = await service.analyzeDealRisk('deal-1');

      expect(result.riskLevel).toBe(RiskLevel.NONE);
      expect(result.riskFlags).toHaveLength(0);
    });

    it('should detect high risk for deal with no response for 10+ days', async () => {
      const mockDeal = {
        id: 'deal-1',
        userId: 'user-1',
        stage: 'viewing',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        threads: [
          {
            id: 'thread-1',
            category: 'waiting',
            lastMessageAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
          },
        ],
      };

      vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as any);

      const result = await service.analyzeDealRisk('deal-1');

      expect(result.riskLevel).toBe(RiskLevel.HIGH);
      expect(result.riskFlags).toContain('response_delay');
      expect(result.riskReason).toContain('12 days');
    });

    it('should detect medium risk for deal with no response for 5-9 days', async () => {
      const mockDeal = {
        id: 'deal-1',
        userId: 'user-1',
        stage: 'viewing',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        threads: [
          {
            id: 'thread-1',
            category: 'waiting',
            lastMessageAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          },
        ],
      };

      vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as any);

      const result = await service.analyzeDealRisk('deal-1');

      expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(result.riskFlags).toContain('response_delay');
    });

    it('should detect low risk for deal with no response for 3-4 days', async () => {
      const mockDeal = {
        id: 'deal-1',
        userId: 'user-1',
        stage: 'viewing',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        threads: [
          {
            id: 'thread-1',
            category: 'waiting',
            lastMessageAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
          },
        ],
      };

      vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as any);

      const result = await service.analyzeDealRisk('deal-1');

      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.riskFlags).toContain('response_delay');
    });

    it('should detect high risk for deal with no communication in 30 days', async () => {
      const mockDeal = {
        id: 'deal-1',
        userId: 'user-1',
        stage: 'viewing',
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        threads: [
          {
            id: 'thread-1',
            category: 'focus',
            lastMessageAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
          },
        ],
      };

      vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as any);

      const result = await service.analyzeDealRisk('deal-1');

      expect(result.riskLevel).toBe(RiskLevel.HIGH);
      expect(result.riskFlags).toContain('communication_frequency');
      expect(result.riskReason).toContain('No communication in the last 30 days');
    });

    it('should detect high risk for deal in lead stage for too long', async () => {
      const mockDeal = {
        id: 'deal-1',
        userId: 'user-1',
        stage: 'lead',
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago (threshold is 14)
        updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        threads: [
          {
            id: 'thread-1',
            category: 'focus',
            lastMessageAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          },
        ],
      };

      vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as any);

      const result = await service.analyzeDealRisk('deal-1');

      expect(result.riskLevel).toBe(RiskLevel.HIGH);
      expect(result.riskFlags).toContain('stage_duration');
      expect(result.riskReason).toContain('lead stage');
    });

    it('should aggregate multiple risk factors correctly', async () => {
      const mockDeal = {
        id: 'deal-1',
        userId: 'user-1',
        stage: 'viewing',
        createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000), // 50 days (threshold is 30)
        updatedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
        threads: [
          {
            id: 'thread-1',
            category: 'waiting',
            lastMessageAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
          },
        ],
      };

      vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as any);

      const result = await service.analyzeDealRisk('deal-1');

      expect(result.riskLevel).toBe(RiskLevel.HIGH);
      expect(result.riskFlags.length).toBeGreaterThan(1);
      expect(result.riskFlags).toContain('response_delay');
      expect(result.riskFlags).toContain('stage_duration');
    });

    it('should throw error for non-existent deal', async () => {
      vi.mocked(prisma.deal.findUnique).mockResolvedValue(null);

      await expect(service.analyzeDealRisk('non-existent')).rejects.toThrow(
        'Deal not found: non-existent'
      );
    });
  });

  describe('analyzeThreadRisk', () => {
    it('should return no risk for thread with recent message', async () => {
      const mockThread = {
        id: 'thread-1',
        category: 'waiting',
        lastMessageAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      };

      vi.mocked(prisma.thread.findUnique).mockResolvedValue(mockThread as any);

      const result = await service.analyzeThreadRisk('thread-1');

      expect(result.riskLevel).toBe(RiskLevel.NONE);
    });

    it('should detect high risk for waiting thread with 10+ days no response', async () => {
      const mockThread = {
        id: 'thread-1',
        category: 'waiting',
        lastMessageAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
      };

      vi.mocked(prisma.thread.findUnique).mockResolvedValue(mockThread as any);

      const result = await service.analyzeThreadRisk('thread-1');

      expect(result.riskLevel).toBe(RiskLevel.HIGH);
      expect(result.riskFlags).toContain('response_delay');
      expect(result.riskReason).toContain('12 days');
    });

    it('should detect medium risk for waiting thread with 5-9 days no response', async () => {
      const mockThread = {
        id: 'thread-1',
        category: 'waiting',
        lastMessageAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      };

      vi.mocked(prisma.thread.findUnique).mockResolvedValue(mockThread as any);

      const result = await service.analyzeThreadRisk('thread-1');

      expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(result.riskFlags).toContain('response_delay');
    });

    it('should not flag focus threads as at risk', async () => {
      const mockThread = {
        id: 'thread-1',
        category: 'focus',
        lastMessageAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
      };

      vi.mocked(prisma.thread.findUnique).mockResolvedValue(mockThread as any);

      const result = await service.analyzeThreadRisk('thread-1');

      expect(result.riskLevel).toBe(RiskLevel.NONE);
    });

    it('should throw error for non-existent thread', async () => {
      vi.mocked(prisma.thread.findUnique).mockResolvedValue(null);

      await expect(service.analyzeThreadRisk('non-existent')).rejects.toThrow(
        'Thread not found: non-existent'
      );
    });
  });

  describe('updateDealRisk', () => {
    it('should update deal with risk analysis results', async () => {
      const mockDeal = {
        id: 'deal-1',
        userId: 'user-1',
        stage: 'viewing',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        threads: [
          {
            id: 'thread-1',
            category: 'waiting',
            lastMessageAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        ],
      };

      const updatedDeal = {
        ...mockDeal,
        riskLevel: RiskLevel.MEDIUM,
        riskFlags: ['response_delay'],
      };

      vi.mocked(prisma.deal.findUnique).mockResolvedValue(mockDeal as any);
      vi.mocked(prisma.deal.update).mockResolvedValue(updatedDeal as any);

      const result = await service.updateDealRisk('deal-1');

      expect(prisma.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-1' },
        data: {
          riskLevel: RiskLevel.MEDIUM,
          riskFlags: ['response_delay'],
        },
      });
      expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
    });
  });

  describe('updateThreadRisk', () => {
    it('should update thread with risk analysis results', async () => {
      const mockThread = {
        id: 'thread-1',
        category: 'waiting',
        lastMessageAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      };

      const updatedThread = {
        ...mockThread,
        riskLevel: RiskLevel.MEDIUM,
        riskReason: 'No response for 7 days',
      };

      vi.mocked(prisma.thread.findUnique).mockResolvedValue(mockThread as any);
      vi.mocked(prisma.thread.update).mockResolvedValue(updatedThread as any);

      const result = await service.updateThreadRisk('thread-1');

      expect(prisma.thread.update).toHaveBeenCalledWith({
        where: { id: 'thread-1' },
        data: {
          riskLevel: RiskLevel.MEDIUM,
          riskReason: 'No response for 7 days',
        },
      });
      expect(result.riskLevel).toBe(RiskLevel.MEDIUM);
    });
  });

  describe('updateAllDealsRisk', () => {
    it('should update risk for all user deals', async () => {
      const mockDeals = [
        {
          id: 'deal-1',
          userId: 'user-1',
          stage: 'viewing',
          createdAt: new Date(),
          updatedAt: new Date(),
          threads: [],
        },
        {
          id: 'deal-2',
          userId: 'user-1',
          stage: 'offer',
          createdAt: new Date(),
          updatedAt: new Date(),
          threads: [],
        },
      ];

      vi.mocked(prisma.deal.findMany).mockResolvedValue(mockDeals as any);
      vi.mocked(prisma.deal.findUnique).mockImplementation(async ({ where }: any) => {
        return mockDeals.find((d) => d.id === where.id) as any;
      });
      vi.mocked(prisma.deal.update).mockImplementation(async ({ where }: any) => {
        const deal = mockDeals.find((d) => d.id === where.id);
        return { ...deal, riskLevel: RiskLevel.NONE, riskFlags: [] } as any;
      });

      await service.updateAllDealsRisk('user-1');

      expect(prisma.deal.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.deal.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateAllThreadsRisk', () => {
    it('should update risk for all user threads', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          userId: 'user-1',
          category: 'waiting',
          lastMessageAt: new Date(),
        },
        {
          id: 'thread-2',
          userId: 'user-1',
          category: 'focus',
          lastMessageAt: new Date(),
        },
      ];

      vi.mocked(prisma.thread.findMany).mockResolvedValue(mockThreads as any);
      vi.mocked(prisma.thread.findUnique).mockImplementation(async ({ where }: any) => {
        return mockThreads.find((t) => t.id === where.id) as any;
      });
      vi.mocked(prisma.thread.update).mockImplementation(async ({ where }: any) => {
        const thread = mockThreads.find((t) => t.id === where.id);
        return { ...thread, riskLevel: RiskLevel.NONE, riskReason: '' } as any;
      });

      await service.updateAllThreadsRisk('user-1');

      expect(prisma.thread.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.thread.update).toHaveBeenCalledTimes(2);
    });
  });
});
