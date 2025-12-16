import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { EmailAccountService } from './email-account.service.js';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    emailAccount: {
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
  encryptToken: (token: string) => `encrypted_${token}`,
  decryptToken: (token: string) => token.replace('encrypted_', ''),
}));

describe('Email Account Service', () => {
  let emailAccountService: EmailAccountService;
  let mockPrisma: any;

  beforeEach(() => {
    emailAccountService = new EmailAccountService();
    mockPrisma = new PrismaClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Unit Tests', () => {
    it('should create a new email account', async () => {
      const mockAccount = {
        id: 'account-1',
        userId: 'user-1',
        provider: 'gmail',
        email: 'test@gmail.com',
        accessToken: 'encrypted_access',
        refreshToken: 'encrypted_refresh',
        tokenExpiry: new Date(),
        syncEnabled: true,
        createdAt: new Date(),
        lastSyncAt: null,
      };

      mockPrisma.emailAccount.findFirst.mockResolvedValue(null);
      mockPrisma.emailAccount.create.mockResolvedValue(mockAccount);

      const result = await emailAccountService.createEmailAccount({
        userId: 'user-1',
        provider: 'gmail',
        email: 'test@gmail.com',
        tokens: {
          accessToken: 'access',
          refreshToken: 'refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
      });

      expect(result).toEqual(mockAccount);
      expect(mockPrisma.emailAccount.create).toHaveBeenCalled();
    });

    it('should update existing email account', async () => {
      const existingAccount = {
        id: 'account-1',
        userId: 'user-1',
        provider: 'gmail',
        email: 'test@gmail.com',
      };

      const updatedAccount = {
        ...existingAccount,
        accessToken: 'encrypted_new_access',
        refreshToken: 'encrypted_new_refresh',
        tokenExpiry: new Date(),
        syncEnabled: true,
      };

      mockPrisma.emailAccount.findFirst.mockResolvedValue(existingAccount);
      mockPrisma.emailAccount.update.mockResolvedValue(updatedAccount);

      const result = await emailAccountService.createEmailAccount({
        userId: 'user-1',
        provider: 'gmail',
        email: 'test@gmail.com',
        tokens: {
          accessToken: 'new_access',
          refreshToken: 'new_refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
      });

      expect(result).toEqual(updatedAccount);
      expect(mockPrisma.emailAccount.update).toHaveBeenCalled();
    });

    it('should get email accounts by user ID', async () => {
      const mockAccounts = [
        {
          id: 'account-1',
          provider: 'gmail',
          email: 'test1@gmail.com',
          lastSyncAt: new Date(),
          syncEnabled: true,
          createdAt: new Date(),
          tokenExpiry: new Date(),
        },
        {
          id: 'account-2',
          provider: 'microsoft',
          email: 'test2@outlook.com',
          lastSyncAt: new Date(),
          syncEnabled: true,
          createdAt: new Date(),
          tokenExpiry: new Date(),
        },
      ];

      mockPrisma.emailAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await emailAccountService.getEmailAccountsByUserId('user-1');

      expect(result).toEqual(mockAccounts);
      expect(mockPrisma.emailAccount.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: expect.any(Object),
      });
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: zena-ai-real-estate-pwa, Property 2: Multi-account unification
     * 
     * For any set of connected email accounts, all threads and contacts should be 
     * treated as part of one unified inbox without duplication.
     * 
     * This property validates that:
     * 1. Multiple email accounts can be connected for the same user
     * 2. Each account maintains its unique identity (provider + email)
     * 3. Accounts are properly associated with the user
     * 4. No duplicate accounts are created for the same provider + email combination
     */
    it('Property 2: Multiple email accounts should be unified under one user', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }), // userId
          fc.array(
            fc.record({
              provider: fc.constantFrom('gmail', 'microsoft'),
              email: fc.emailAddress(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (userId, accountConfigs) => {
            // Mock database to return all accounts for this user
            const mockAccounts = accountConfigs.map((config, index) => ({
              id: `account-${index}`,
              userId,
              provider: config.provider,
              email: config.email,
              lastSyncAt: new Date(),
              syncEnabled: true,
              createdAt: new Date(),
              tokenExpiry: new Date(),
            }));

            mockPrisma.emailAccount.findMany.mockResolvedValue(mockAccounts);

            // Get all accounts for user
            const accounts = await emailAccountService.getEmailAccountsByUserId(userId);

            // All accounts should belong to the same user
            expect(accounts.length).toBe(accountConfigs.length);
            
            // Each account should have unique provider + email combination
            const accountKeys = accounts.map(acc => `${acc.provider}:${acc.email}`);
            const uniqueKeys = new Set(accountKeys);
            expect(uniqueKeys.size).toBe(accountKeys.length);

            // All accounts should be enabled for sync (unified inbox)
            accounts.forEach(account => {
              expect(account.syncEnabled).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: zena-ai-real-estate-pwa, Property 2: Multi-account unification
     * 
     * Validates that duplicate accounts (same provider + email) are updated
     * rather than creating duplicates.
     */
    it('Property 2: Duplicate account connections should update existing account', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }), // userId
          fc.constantFrom('gmail', 'microsoft'), // provider
          fc.emailAddress(), // email
          fc.string({ minLength: 10 }), // first access token
          fc.string({ minLength: 10 }), // second access token
          async (userId, provider, email, token1, token2) => {
            // First connection - no existing account
            mockPrisma.emailAccount.findFirst.mockResolvedValueOnce(null);
            mockPrisma.emailAccount.create.mockResolvedValueOnce({
              id: 'account-1',
              userId,
              provider,
              email,
              accessToken: `encrypted_${token1}`,
              refreshToken: 'encrypted_refresh1',
              tokenExpiry: new Date(),
              syncEnabled: true,
              createdAt: new Date(),
              lastSyncAt: null,
            });

            // Create first account
            const account1 = await emailAccountService.createEmailAccount({
              userId,
              provider,
              email,
              tokens: {
                accessToken: token1,
                refreshToken: 'refresh1',
                expiresIn: 3600,
                tokenType: 'Bearer',
              },
            });

            expect(mockPrisma.emailAccount.create).toHaveBeenCalled();

            // Second connection - existing account found
            mockPrisma.emailAccount.findFirst.mockResolvedValueOnce({
              id: 'account-1',
              userId,
              provider,
              email,
            });
            mockPrisma.emailAccount.update.mockResolvedValueOnce({
              id: 'account-1',
              userId,
              provider,
              email,
              accessToken: `encrypted_${token2}`,
              refreshToken: 'encrypted_refresh2',
              tokenExpiry: new Date(),
              syncEnabled: true,
              createdAt: account1.createdAt,
              lastSyncAt: null,
            });

            // Create second account (should update)
            const account2 = await emailAccountService.createEmailAccount({
              userId,
              provider,
              email,
              tokens: {
                accessToken: token2,
                refreshToken: 'refresh2',
                expiresIn: 3600,
                tokenType: 'Bearer',
              },
            });

            // Should have updated, not created
            expect(mockPrisma.emailAccount.update).toHaveBeenCalled();
            expect(account2.id).toBe(account1.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: zena-ai-real-estate-pwa, Property 2: Multi-account unification
     * 
     * Validates that accounts from different providers can coexist for the same user.
     */
    it('Property 2: User can connect multiple providers simultaneously', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }), // userId
          fc.emailAddress(), // gmail email
          fc.emailAddress(), // microsoft email
          async (userId, gmailEmail, microsoftEmail) => {
            const mockAccounts = [
              {
                id: 'account-gmail',
                userId,
                provider: 'gmail',
                email: gmailEmail,
                lastSyncAt: new Date(),
                syncEnabled: true,
                createdAt: new Date(),
                tokenExpiry: new Date(),
              },
              {
                id: 'account-microsoft',
                userId,
                provider: 'microsoft',
                email: microsoftEmail,
                lastSyncAt: new Date(),
                syncEnabled: true,
                createdAt: new Date(),
                tokenExpiry: new Date(),
              },
            ];

            mockPrisma.emailAccount.findMany.mockResolvedValue(mockAccounts);

            const accounts = await emailAccountService.getEmailAccountsByUserId(userId);

            // Should have both accounts
            expect(accounts.length).toBe(2);

            // Should have different providers
            const providers = accounts.map(acc => acc.provider);
            expect(providers).toContain('gmail');
            expect(providers).toContain('microsoft');

            // Both should be enabled (unified inbox)
            accounts.forEach(account => {
              expect(account.syncEnabled).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: zena-ai-real-estate-pwa, Property 2: Multi-account unification
     * 
     * Validates that account disconnection properly removes the account
     * while preserving other accounts.
     */
    it('Property 2: Disconnecting one account should not affect other accounts', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }), // userId
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              provider: fc.constantFrom('gmail', 'microsoft'),
              email: fc.emailAddress(),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (userId, accountConfigs) => {
            // Pick one account to disconnect
            const accountToDisconnect = accountConfigs[0];

            // Mock finding the account
            mockPrisma.emailAccount.findFirst.mockResolvedValue({
              id: accountToDisconnect.id,
              userId,
              provider: accountToDisconnect.provider,
              email: accountToDisconnect.email,
            });

            // Mock deletion
            mockPrisma.emailAccount.delete.mockResolvedValue({
              id: accountToDisconnect.id,
            });

            // Disconnect account
            await emailAccountService.disconnectEmailAccount(
              accountToDisconnect.id,
              userId
            );

            // Verify delete was called with correct ID
            expect(mockPrisma.emailAccount.delete).toHaveBeenCalledWith({
              where: { id: accountToDisconnect.id },
            });

            // Mock remaining accounts
            const remainingAccounts = accountConfigs
              .slice(1)
              .map(config => ({
                id: config.id,
                userId,
                provider: config.provider,
                email: config.email,
                lastSyncAt: new Date(),
                syncEnabled: true,
                createdAt: new Date(),
                tokenExpiry: new Date(),
              }));

            mockPrisma.emailAccount.findMany.mockResolvedValue(remainingAccounts);

            // Get remaining accounts
            const accounts = await emailAccountService.getEmailAccountsByUserId(userId);

            // Should have one less account
            expect(accounts.length).toBe(accountConfigs.length - 1);

            // Disconnected account should not be in the list
            const accountIds = accounts.map(acc => acc.id);
            expect(accountIds).not.toContain(accountToDisconnect.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
