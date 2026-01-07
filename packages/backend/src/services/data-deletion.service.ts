import prisma from '../config/database.js';

/**
 * Data Deletion Service
 * Handles complete data deletion for user accounts
 */

export interface DataDeletionOptions {
  deleteContacts?: boolean;
  deleteProperties?: boolean;
  deleteDeals?: boolean;
  deleteTasks?: boolean;
  deleteVoiceNotes?: boolean;
  deleteTimelineEvents?: boolean;
  deleteExports?: boolean;
  deleteCRMIntegrations?: boolean;
}

export interface DataDeletionResult {
  success: boolean;
  deletedCounts: {
    emailAccounts: number;
    calendarAccounts: number;
    threads: number;
    contacts: number;
    properties: number;
    deals: number;
    tasks: number;
    voiceNotes: number;
    timelineEvents: number;
    exports: number;
    crmIntegrations: number;
    pushSubscriptions: number;
  };
}

/**
 * Delete all user data
 * This is a complete account deletion that removes everything
 */
export async function deleteAllUserData(
  userId: string
): Promise<DataDeletionResult> {
  const deletedCounts = {
    emailAccounts: 0,
    calendarAccounts: 0,
    threads: 0,
    contacts: 0,
    properties: 0,
    deals: 0,
    tasks: 0,
    voiceNotes: 0,
    timelineEvents: 0,
    exports: 0,
    crmIntegrations: 0,
    pushSubscriptions: 0,
  };

  try {
    // Use a transaction to ensure all-or-nothing deletion
    await prisma.$transaction(async (tx) => {
      // Delete email accounts (will cascade to threads)
      const emailAccountsResult = await tx.emailAccount.deleteMany({
        where: { userId },
      });
      deletedCounts.emailAccounts = emailAccountsResult.count;

      // Delete calendar accounts
      const calendarAccountsResult = await tx.calendarAccount.deleteMany({
        where: { userId },
      });
      deletedCounts.calendarAccounts = calendarAccountsResult.count;

      // Delete threads (if not already deleted by cascade)
      const threadsResult = await tx.thread.deleteMany({
        where: { userId },
      });
      deletedCounts.threads = threadsResult.count;

      // Delete contacts
      const contactsResult = await tx.contact.deleteMany({
        where: { userId },
      });
      deletedCounts.contacts = contactsResult.count;

      // Delete properties
      const propertiesResult = await tx.property.deleteMany({
        where: { userId },
      });
      deletedCounts.properties = propertiesResult.count;

      // Delete deals
      const dealsResult = await tx.deal.deleteMany({
        where: { userId },
      });
      deletedCounts.deals = dealsResult.count;

      // Delete tasks
      const tasksResult = await tx.task.deleteMany({
        where: { userId },
      });
      deletedCounts.tasks = tasksResult.count;

      // Delete voice notes
      const voiceNotesResult = await tx.voiceNote.deleteMany({
        where: { userId },
      });
      deletedCounts.voiceNotes = voiceNotesResult.count;

      // Delete timeline events
      const timelineEventsResult = await tx.timelineEvent.deleteMany({
        where: { userId },
      });
      deletedCounts.timelineEvents = timelineEventsResult.count;

      // Delete exports
      const exportsResult = await tx.export.deleteMany({
        where: { userId },
      });
      deletedCounts.exports = exportsResult.count;

      // Delete CRM integrations
      const crmIntegrationsResult = await tx.cRMIntegration.deleteMany({
        where: { userId },
      });
      deletedCounts.crmIntegrations = crmIntegrationsResult.count;

      // Delete push subscriptions
      const pushSubscriptionsResult = await tx.pushSubscription.deleteMany({
        where: { userId },
      });
      deletedCounts.pushSubscriptions = pushSubscriptionsResult.count;

      // Delete notification preferences
      await tx.notificationPreferences.deleteMany({
        where: { userId },
      });
    });

    return {
      success: true,
      deletedCounts,
    };
  } catch (error) {
    console.error('Data deletion error:', error);
    throw new Error('Failed to delete user data');
  }
}

/**
 * Delete specific types of user data
 * Allows selective deletion based on options
 */
export async function deleteSelectiveUserData(
  userId: string,
  options: DataDeletionOptions
): Promise<DataDeletionResult> {
  const deletedCounts = {
    emailAccounts: 0,
    calendarAccounts: 0,
    threads: 0,
    contacts: 0,
    properties: 0,
    deals: 0,
    tasks: 0,
    voiceNotes: 0,
    timelineEvents: 0,
    exports: 0,
    crmIntegrations: 0,
    pushSubscriptions: 0,
  };

  try {
    await prisma.$transaction(async (tx) => {
      if (options.deleteContacts) {
        const result = await tx.contact.deleteMany({
          where: { userId },
        });
        deletedCounts.contacts = result.count;
      }

      if (options.deleteProperties) {
        const result = await tx.property.deleteMany({
          where: { userId },
        });
        deletedCounts.properties = result.count;
      }

      if (options.deleteDeals) {
        const result = await tx.deal.deleteMany({
          where: { userId },
        });
        deletedCounts.deals = result.count;
      }

      if (options.deleteTasks) {
        const result = await tx.task.deleteMany({
          where: { userId },
        });
        deletedCounts.tasks = result.count;
      }

      if (options.deleteVoiceNotes) {
        const result = await tx.voiceNote.deleteMany({
          where: { userId },
        });
        deletedCounts.voiceNotes = result.count;
      }

      if (options.deleteTimelineEvents) {
        const result = await tx.timelineEvent.deleteMany({
          where: { userId },
        });
        deletedCounts.timelineEvents = result.count;
      }

      if (options.deleteExports) {
        const result = await tx.export.deleteMany({
          where: { userId },
        });
        deletedCounts.exports = result.count;
      }

      if (options.deleteCRMIntegrations) {
        const result = await tx.cRMIntegration.deleteMany({
          where: { userId },
        });
        deletedCounts.crmIntegrations = result.count;
      }
    });

    return {
      success: true,
      deletedCounts,
    };
  } catch (error) {
    console.error('Selective data deletion error:', error);
    throw new Error('Failed to delete selected user data');
  }
}

/**
 * Delete user account completely
 * This removes the user and all associated data
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  try {
    // First delete all user data
    await deleteAllUserData(userId);

    // Then delete the user account itself
    // This will cascade delete any remaining related data
    await prisma.user.delete({
      where: { id: userId },
    });
  } catch (error) {
    console.error('User account deletion error:', error);
    throw new Error('Failed to delete user account');
  }
}

export const dataDeletionService = {
  deleteAllUserData,
  deleteSelectiveUserData,
  deleteUserAccount,
};
