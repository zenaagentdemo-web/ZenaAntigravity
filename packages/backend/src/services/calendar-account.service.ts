import prisma from '../config/database.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { OAuthTokens } from './oauth.service.js';

/**
 * Calendar Account Service
 * Handles calendar account management and token storage
 */

export interface CreateCalendarAccountParams {
  userId: string;
  provider: string;
  email: string;
  tokens: OAuthTokens;
}

export interface CalendarAccountResponse {
  id: string;
  userId: string;
  provider: string;
  email: string;
  syncEnabled: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
}

/**
 * Create or update calendar account
 */
export async function createCalendarAccount(
  params: CreateCalendarAccountParams
): Promise<CalendarAccountResponse> {
  const { userId, provider, email, tokens } = params;

  // Calculate token expiry
  const tokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);

  // Encrypt tokens
  const encryptedAccessToken = encrypt(tokens.accessToken);
  const encryptedRefreshToken = encrypt(tokens.refreshToken);

  // Check if account already exists
  const existingAccount = await prisma.calendarAccount.findFirst({
    where: {
      userId,
      email,
      provider: mapProviderToDbFormat(provider),
    },
  });

  let account;
  if (existingAccount) {
    // Update existing account
    account = await prisma.calendarAccount.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
        syncEnabled: true,
      },
    });
  } else {
    // Create new account
    account = await prisma.calendarAccount.create({
      data: {
        userId,
        provider: mapProviderToDbFormat(provider),
        email,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
        syncEnabled: true,
      },
    });
  }

  return {
    id: account.id,
    userId: account.userId,
    provider: account.provider,
    email: account.email,
    syncEnabled: account.syncEnabled,
    lastSyncAt: account.lastSyncAt,
    createdAt: account.createdAt,
  };
}

/**
 * Get calendar accounts by user ID
 */
export async function getCalendarAccountsByUserId(
  userId: string
): Promise<CalendarAccountResponse[]> {
  const accounts = await prisma.calendarAccount.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return accounts.map((account) => ({
    id: account.id,
    userId: account.userId,
    provider: account.provider,
    email: account.email,
    syncEnabled: account.syncEnabled,
    lastSyncAt: account.lastSyncAt,
    createdAt: account.createdAt,
  }));
}

/**
 * Get calendar account by ID
 */
export async function getCalendarAccountById(
  id: string
): Promise<CalendarAccountResponse | null> {
  const account = await prisma.calendarAccount.findUnique({
    where: { id },
  });

  if (!account) {
    return null;
  }

  return {
    id: account.id,
    userId: account.userId,
    provider: account.provider,
    email: account.email,
    syncEnabled: account.syncEnabled,
    lastSyncAt: account.lastSyncAt,
    createdAt: account.createdAt,
  };
}

/**
 * Disconnect calendar account
 * Removes the account connection but preserves manually entered data
 */
export async function disconnectCalendarAccount(
  id: string,
  userId: string
): Promise<void> {
  const account = await prisma.calendarAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    throw new Error('Calendar account not found or access denied');
  }

  // Delete timeline events that were auto-generated from calendar events
  await prisma.timelineEvent.deleteMany({
    where: {
      userId,
      type: 'meeting',
      // Only delete calendar-sourced events
      // In production, we'd track the source account ID
    },
  });

  // Note: We preserve:
  // - Contacts (may have been manually created)
  // - Properties (manually added)
  // - Deals (may have manual data)
  // - Manual timeline entries
  // - Tasks

  await prisma.calendarAccount.delete({
    where: { id },
  });
}

/**
 * Get decrypted tokens for calendar account
 */
export async function getDecryptedTokens(
  id: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const account = await prisma.calendarAccount.findUnique({
    where: { id },
  });

  if (!account) {
    return null;
  }

  return {
    accessToken: decrypt(account.accessToken),
    refreshToken: decrypt(account.refreshToken),
  };
}

/**
 * Update calendar account tokens
 */
export async function updateCalendarAccountTokens(
  id: string,
  tokens: OAuthTokens
): Promise<void> {
  const tokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);
  const encryptedAccessToken = encrypt(tokens.accessToken);
  const encryptedRefreshToken = encrypt(tokens.refreshToken);

  await prisma.calendarAccount.update({
    where: { id },
    data: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiry,
    },
  });
}

/**
 * Map OAuth provider name to database format
 */
function mapProviderToDbFormat(provider: string): string {
  if (provider === 'google-calendar') {
    return 'google';
  } else if (provider === 'microsoft-calendar') {
    return 'microsoft';
  }
  return provider;
}

export const calendarAccountService = {
  createCalendarAccount,
  getCalendarAccountsByUserId,
  getCalendarAccountById,
  disconnectCalendarAccount,
  getDecryptedTokens,
  updateCalendarAccountTokens,
};

