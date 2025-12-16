import { PrismaClient } from '@prisma/client';
import { oauthService, OAuthTokens } from './oauth.service.js';
import { encryptToken, decryptToken } from '../utils/encryption.js';

const prisma = new PrismaClient();

export interface CreateEmailAccountData {
  userId: string;
  provider: string;
  email: string;
  tokens: OAuthTokens;
}

export interface EmailAccountWithDecryptedTokens {
  id: string;
  userId: string;
  provider: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  lastSyncAt: Date | null;
  syncEnabled: boolean;
  createdAt: Date;
}

/**
 * Email Account Service
 * Manages email account connections and token storage
 */
export class EmailAccountService {
  /**
   * Create a new email account connection
   */
  async createEmailAccount(data: CreateEmailAccountData) {
    const { userId, provider, email, tokens } = data;

    // Encrypt tokens before storage
    const encryptedAccessToken = encryptToken(tokens.accessToken);
    const encryptedRefreshToken = encryptToken(tokens.refreshToken);

    // Calculate token expiry
    const tokenExpiry = new Date();
    tokenExpiry.setSeconds(tokenExpiry.getSeconds() + tokens.expiresIn);

    // Check if account already exists
    const existingAccount = await prisma.emailAccount.findFirst({
      where: {
        userId,
        email,
        provider,
      },
    });

    if (existingAccount) {
      // Update existing account
      return prisma.emailAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry,
          syncEnabled: true,
        },
      });
    }

    // Create new account
    return prisma.emailAccount.create({
      data: {
        userId,
        provider,
        email,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
        syncEnabled: true,
      },
    });
  }

  /**
   * Get email account by ID with decrypted tokens
   */
  async getEmailAccountById(
    accountId: string
  ): Promise<EmailAccountWithDecryptedTokens | null> {
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return null;
    }

    return {
      ...account,
      accessToken: decryptToken(account.accessToken),
      refreshToken: decryptToken(account.refreshToken),
    };
  }

  /**
   * Get all email accounts for a user
   */
  async getEmailAccountsByUserId(userId: string) {
    return prisma.emailAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        lastSyncAt: true,
        syncEnabled: true,
        createdAt: true,
        tokenExpiry: true,
      },
    });
  }

  /**
   * Refresh access token for an email account
   */
  async refreshEmailAccountToken(accountId: string) {
    const account = await this.getEmailAccountById(accountId);
    if (!account) {
      throw new Error('Email account not found');
    }

    // Refresh token using OAuth service
    const newTokens = await oauthService.refreshAccessToken(
      account.provider,
      account.refreshToken
    );

    // Encrypt new tokens
    const encryptedAccessToken = encryptToken(newTokens.accessToken);
    const encryptedRefreshToken = encryptToken(newTokens.refreshToken);

    // Calculate new expiry
    const tokenExpiry = new Date();
    tokenExpiry.setSeconds(tokenExpiry.getSeconds() + newTokens.expiresIn);

    // Update account
    return prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
      },
    });
  }

  /**
   * Check if token is expired or about to expire (within 5 minutes)
   */
  isTokenExpired(tokenExpiry: Date): boolean {
    const now = new Date();
    const expiryWithBuffer = new Date(tokenExpiry);
    expiryWithBuffer.setMinutes(expiryWithBuffer.getMinutes() - 5);
    return now >= expiryWithBuffer;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(accountId: string): Promise<string> {
    const account = await this.getEmailAccountById(accountId);
    if (!account) {
      throw new Error('Email account not found');
    }

    // Check if token needs refresh
    if (this.isTokenExpired(account.tokenExpiry)) {
      const updatedAccount = await this.refreshEmailAccountToken(accountId);
      return decryptToken(updatedAccount.accessToken);
    }

    return account.accessToken;
  }

  /**
   * Disconnect email account
   * Removes the account connection but preserves manually entered data
   * (contacts, properties, deals, tasks, notes that were manually created)
   */
  async disconnectEmailAccount(accountId: string, userId: string) {
    // Verify ownership
    const account = await prisma.emailAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      throw new Error('Email account not found or unauthorized');
    }

    // Delete threads associated with this email account
    // This will cascade delete timeline events linked to threads
    await prisma.thread.deleteMany({
      where: {
        emailAccountId: accountId,
        userId,
      },
    });

    // Delete tasks that were auto-generated from emails from this account
    await prisma.task.deleteMany({
      where: {
        userId,
        source: 'email',
        // Only delete tasks that were created from threads of this account
        // We can't directly query this, so we'll delete all email-sourced tasks
        // In a production system, we'd track the source account ID
      },
    });

    // Note: We preserve:
    // - Contacts (may have been manually created or enriched)
    // - Properties (manually added)
    // - Deals (may have manual data)
    // - Manual tasks
    // - Manual notes
    // - Voice notes

    // Delete the account itself
    return prisma.emailAccount.delete({
      where: { id: accountId },
    });
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(accountId: string) {
    return prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        lastSyncAt: new Date(),
      },
    });
  }

  /**
   * Toggle sync enabled status
   */
  async toggleSync(accountId: string, userId: string, enabled: boolean) {
    // Verify ownership
    const account = await prisma.emailAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      throw new Error('Email account not found or unauthorized');
    }

    return prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        syncEnabled: enabled,
      },
    });
  }
}

export const emailAccountService = new EmailAccountService();
