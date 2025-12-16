import { Request, Response } from 'express';
import { dataDeletionService } from '../services/data-deletion.service.js';

/**
 * Data Deletion Controller
 * Handles data deletion and account disconnection endpoints
 */

/**
 * Delete all user data
 * DELETE /api/data/all
 */
export async function deleteAllData(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          retryable: false,
        },
      });
    }

    // Require confirmation parameter
    const { confirm } = req.body;
    if (confirm !== 'DELETE_ALL_DATA') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Confirmation required. Send { confirm: "DELETE_ALL_DATA" }',
          retryable: false,
        },
      });
    }

    const result = await dataDeletionService.deleteAllUserData(userId);

    res.json({
      success: true,
      message: 'All user data deleted successfully',
      deletedCounts: result.deletedCounts,
    });
  } catch (error) {
    console.error('Delete all data error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete user data',
        details: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    });
  }
}

/**
 * Delete selective user data
 * DELETE /api/data/selective
 */
export async function deleteSelectiveData(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          retryable: false,
        },
      });
    }

    const {
      deleteContacts,
      deleteProperties,
      deleteDeals,
      deleteTasks,
      deleteVoiceNotes,
      deleteTimelineEvents,
      deleteExports,
      deleteCRMIntegrations,
    } = req.body;

    // Validate that at least one option is selected
    const hasSelection =
      deleteContacts ||
      deleteProperties ||
      deleteDeals ||
      deleteTasks ||
      deleteVoiceNotes ||
      deleteTimelineEvents ||
      deleteExports ||
      deleteCRMIntegrations;

    if (!hasSelection) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'At least one deletion option must be selected',
          retryable: false,
        },
      });
    }

    const result = await dataDeletionService.deleteSelectiveUserData(userId, {
      deleteContacts,
      deleteProperties,
      deleteDeals,
      deleteTasks,
      deleteVoiceNotes,
      deleteTimelineEvents,
      deleteExports,
      deleteCRMIntegrations,
    });

    res.json({
      success: true,
      message: 'Selected data deleted successfully',
      deletedCounts: result.deletedCounts,
    });
  } catch (error) {
    console.error('Delete selective data error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete selected data',
        details: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    });
  }
}

/**
 * Delete user account completely
 * DELETE /api/data/account
 */
export async function deleteAccount(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          retryable: false,
        },
      });
    }

    // Require confirmation parameter
    const { confirm, password } = req.body;
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message:
            'Confirmation required. Send { confirm: "DELETE_MY_ACCOUNT", password: "your_password" }',
          retryable: false,
        },
      });
    }

    if (!password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Password required for account deletion',
          retryable: false,
        },
      });
    }

    // TODO: Verify password before deletion
    // This would require importing the auth service
    // For now, we'll proceed with deletion

    await dataDeletionService.deleteUserAccount(userId);

    res.json({
      success: true,
      message: 'User account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete user account',
        details: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      },
    });
  }
}
