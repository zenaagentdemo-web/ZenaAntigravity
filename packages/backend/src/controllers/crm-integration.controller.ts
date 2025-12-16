import { Request, Response } from 'express';
import { crmIntegrationService, CRMProvider, CRMCredentials, CRMSyncConfig } from '../services/crm-integration.service';

/**
 * List available CRM integrations
 */
export async function listAvailableCRMs(req: Request, res: Response) {
  try {
    const availableProviders = [
      {
        provider: 'mri_vault',
        name: 'MRI Vault',
        description: 'Real estate CRM platform',
        supported: true,
      },
      {
        provider: 'salesforce',
        name: 'Salesforce Real Estate',
        description: 'Salesforce CRM for real estate',
        supported: false,
      },
      {
        provider: 'top_producer',
        name: 'Top Producer',
        description: 'Real estate CRM and lead management',
        supported: false,
      },
      {
        provider: 'kvcore',
        name: 'kvCORE',
        description: 'Real estate platform with CRM',
        supported: false,
      },
      {
        provider: 'follow_up_boss',
        name: 'Follow Up Boss',
        description: 'Real estate CRM and lead management',
        supported: false,
      },
    ];

    res.json({ providers: availableProviders });
  } catch (error) {
    console.error('Error listing CRM providers:', error);
    res.status(500).json({
      error: {
        code: 'INTEGRATION_FAILED',
        message: 'Failed to list CRM providers',
        retryable: false,
      },
    });
  }
}

/**
 * Get user's CRM integrations
 */
export async function getUserCRMIntegrations(req: Request, res: Response) {
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

    const integrations = await crmIntegrationService.listCRMIntegrations(userId);
    res.json({ integrations });
  } catch (error) {
    console.error('Error getting CRM integrations:', error);
    res.status(500).json({
      error: {
        code: 'INTEGRATION_FAILED',
        message: 'Failed to get CRM integrations',
        retryable: true,
      },
    });
  }
}

/**
 * Connect a CRM provider
 */
export async function connectCRM(req: Request, res: Response) {
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

    const { provider } = req.params;
    const { credentials, syncConfig } = req.body;

    // Validate provider
    const validProviders: CRMProvider[] = ['mri_vault', 'salesforce', 'top_producer', 'kvcore', 'follow_up_boss'];
    if (!validProviders.includes(provider as CRMProvider)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid CRM provider',
          retryable: false,
        },
      });
    }

    // Validate credentials
    if (!credentials || typeof credentials !== 'object') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Credentials are required',
          retryable: false,
        },
      });
    }

    // Validate sync config
    if (!syncConfig || typeof syncConfig !== 'object') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Sync configuration is required',
          retryable: false,
        },
      });
    }

    const result = await crmIntegrationService.connectCRM(
      userId,
      provider as CRMProvider,
      credentials as CRMCredentials,
      syncConfig as CRMSyncConfig
    );

    res.json({
      success: true,
      integrationId: result.id,
      message: `Successfully connected to ${provider}`,
    });
  } catch (error: any) {
    console.error('Error connecting CRM:', error);
    res.status(500).json({
      error: {
        code: 'INTEGRATION_FAILED',
        message: error.message || 'Failed to connect CRM',
        retryable: true,
      },
    });
  }
}

/**
 * Trigger CRM sync
 */
export async function syncCRM(req: Request, res: Response) {
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

    const { provider } = req.params;

    // Validate provider
    const validProviders: CRMProvider[] = ['mri_vault', 'salesforce', 'top_producer', 'kvcore', 'follow_up_boss'];
    if (!validProviders.includes(provider as CRMProvider)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid CRM provider',
          retryable: false,
        },
      });
    }

    const result = await crmIntegrationService.syncToCRM(userId, provider as CRMProvider);

    res.json({
      success: true,
      contactsSynced: result.contactsSynced,
      propertiesSynced: result.propertiesSynced,
      dealsSynced: result.dealsSynced,
      message: 'Sync completed successfully',
    });
  } catch (error: any) {
    console.error('Error syncing CRM:', error);
    res.status(500).json({
      error: {
        code: 'INTEGRATION_FAILED',
        message: error.message || 'Failed to sync CRM',
        retryable: true,
      },
    });
  }
}

/**
 * Disconnect a CRM provider
 */
export async function disconnectCRM(req: Request, res: Response) {
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

    const { provider } = req.params;

    // Validate provider
    const validProviders: CRMProvider[] = ['mri_vault', 'salesforce', 'top_producer', 'kvcore', 'follow_up_boss'];
    if (!validProviders.includes(provider as CRMProvider)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid CRM provider',
          retryable: false,
        },
      });
    }

    await crmIntegrationService.disconnectCRM(userId, provider as CRMProvider);

    res.json({
      success: true,
      message: `Successfully disconnected from ${provider}`,
    });
  } catch (error: any) {
    console.error('Error disconnecting CRM:', error);
    res.status(500).json({
      error: {
        code: 'INTEGRATION_FAILED',
        message: error.message || 'Failed to disconnect CRM',
        retryable: true,
      },
    });
  }
}
