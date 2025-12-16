import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calendarAccountService } from './calendar-account.service.js';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    calendarAccount: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

// Mock encryption utilities
vi.mock('../utils/encryption.js', () => ({
  encrypt: (token: string) => `encrypted_${token}`,
  decrypt: (token: string) => token.replace('encrypted_', ''),
}));

describe('Calendar Account Service', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Unit Tests', () => {
    it('should create a new calendar account', async () => {
      const mockAccount = {
        id: 'calendar-account-1',
        userId: 'user-1',
        provider: 'google',
        email: 'test@gmail.com',
        accessToken: 'encrypted_access',
        refreshToken: 'encrypted_refresh',
        tokenExpiry: new Date(),
        syncEnabled: true,
        createdAt: new Date(),
        lastSyncAt: null,
      };

      mockPrisma.calendarAccount.findFirst.mockResolvedValue(null);
      mockPrisma.calendarAccount.create.mockResolvedValue(mockAccount);

      const result = await calendarAccountService.createCalendarAccount({
        userId: 'user-1',
        provider: 'google-calendar',
        email: 'test@gmail.com',
        tokens: {
          accessToken: 'access',
          refreshToken: 'refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
      });

      expect(result.id).toBe(mockAccount.id);
      expect(result.provider).toBe('google');
      expect(mockPrisma.calendarAccount.create).toHaveBeenCalled();
    });

    it('should update existing calendar account', async () => {
      const existingAccount = {
        id: 'calendar-account-1',
        userId: 'user-1',
        provider: 'google',
        email: 'test@gmail.com',
      };

      const updatedAccount = {
        ...existingAccount,
        accessToken: 'encrypted_new_access',
        refreshToken: 'encrypted_new_refresh',
        tokenExpiry: new Date(),
        syncEnabled: true,
        createdAt: new Date(),
        lastSyncAt: null,
      };

      mockPrisma.calendarAccount.findFirst.mockResolvedValue(existingAccount);
      mockPrisma.calendarAccount.update.mockResolvedValue(updatedAccount);

      const result = await calendarAccountService.createCalendarAccount({
        userId: 'user-1',
        provider: 'google-calendar',
        email: 'test@gmail.com',
        tokens: {
          accessToken: 'new_access',
          refreshToken: 'new_refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
      });

      expect(result.id).toBe(existingAccount.id);
      expect(mockPrisma.calendarAccount.update).toHaveBeenCalled();
    });

    it('should get calendar accounts by user ID', async () => {
      const mockAccounts = [
        {
          id: 'calendar-account-1',
          userId: 'user-1',
          provider: 'google',
          email: 'test1@gmail.com',
          lastSyncAt: new Date(),
          syncEnabled: true,
          createdAt: new Date(),
        },
        {
          id: 'calendar-account-2',
          userId: 'user-1',
          provider: 'microsoft',
          email: 'test2@outlook.com',
          lastSyncAt: new Date(),
          syncEnabled: true,
          createdAt: new Date(),
        },
      ];

      mockPrisma.calendarAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await calendarAccountService.getCalendarAccountsByUserId('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].provider).toBe('google');
      expect(result[1].provider).toBe('microsoft');
      expect(mockPrisma.calendarAccount.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should disconnect calendar account', async () => {
      const mockAccount = {
        id: 'calendar-account-1',
        userId: 'user-1',
        provider: 'google',
        email: 'test@gmail.com',
      };

      mockPrisma.calendarAccount.findFirst.mockResolvedValue(mockAccount);
      mockPrisma.calendarAccount.delete.mockResolvedValue(mockAccount);

      await calendarAccountService.disconnectCalendarAccount('calendar-account-1', 'user-1');

      expect(mockPrisma.calendarAccount.delete).toHaveBeenCalledWith({
        where: { id: 'calendar-account-1' },
      });
    });

    it('should throw error when disconnecting non-existent account', async () => {
      mockPrisma.calendarAccount.findFirst.mockResolvedValue(null);

      await expect(
        calendarAccountService.disconnectCalendarAccount('non-existent', 'user-1')
      ).rejects.toThrow('Calendar account not found or access denied');
    });

    it('should get decrypted tokens', async () => {
      const mockAccount = {
        id: 'calendar-account-1',
        accessToken: 'encrypted_access_token',
        refreshToken: 'encrypted_refresh_token',
      };

      mockPrisma.calendarAccount.findUnique.mockResolvedValue(mockAccount);

      const result = await calendarAccountService.getDecryptedTokens('calendar-account-1');

      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
    });

    it('should update calendar account tokens', async () => {
      const mockAccount = {
        id: 'calendar-account-1',
        accessToken: 'encrypted_new_access',
        refreshToken: 'encrypted_new_refresh',
        tokenExpiry: new Date(),
      };

      mockPrisma.calendarAccount.update.mockResolvedValue(mockAccount);

      await calendarAccountService.updateCalendarAccountTokens('calendar-account-1', {
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      expect(mockPrisma.calendarAccount.update).toHaveBeenCalledWith({
        where: { id: 'calendar-account-1' },
        data: expect.objectContaining({
          accessToken: 'encrypted_new_access',
          refreshToken: 'encrypted_new_refresh',
        }),
      });
    });

    it('should map google-calendar provider to google in database', async () => {
      const mockAccount = {
        id: 'calendar-account-1',
        userId: 'user-1',
        provider: 'google',
        email: 'test@gmail.com',
        accessToken: 'encrypted_access',
        refreshToken: 'encrypted_refresh',
        tokenExpiry: new Date(),
        syncEnabled: true,
        createdAt: new Date(),
        lastSyncAt: null,
      };

      mockPrisma.calendarAccount.findFirst.mockResolvedValue(null);
      mockPrisma.calendarAccount.create.mockResolvedValue(mockAccount);

      await calendarAccountService.createCalendarAccount({
        userId: 'user-1',
        provider: 'google-calendar',
        email: 'test@gmail.com',
        tokens: {
          accessToken: 'access',
          refreshToken: 'refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
      });

      // Verify that the provider was mapped to 'google' in the database
      expect(mockPrisma.calendarAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'google',
        }),
      });
    });

    it('should map microsoft-calendar provider to microsoft in database', async () => {
      const mockAccount = {
        id: 'calendar-account-1',
        userId: 'user-1',
        provider: 'microsoft',
        email: 'test@outlook.com',
        accessToken: 'encrypted_access',
        refreshToken: 'encrypted_refresh',
        tokenExpiry: new Date(),
        syncEnabled: true,
        createdAt: new Date(),
        lastSyncAt: null,
      };

      mockPrisma.calendarAccount.findFirst.mockResolvedValue(null);
      mockPrisma.calendarAccount.create.mockResolvedValue(mockAccount);

      await calendarAccountService.createCalendarAccount({
        userId: 'user-1',
        provider: 'microsoft-calendar',
        email: 'test@outlook.com',
        tokens: {
          accessToken: 'access',
          refreshToken: 'refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
      });

      // Verify that the provider was mapped to 'microsoft' in the database
      expect(mockPrisma.calendarAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'microsoft',
        }),
      });
    });
  });
});

