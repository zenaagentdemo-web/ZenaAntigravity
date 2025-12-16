import { PrismaClient } from '@prisma/client';
import { encryptToken, decryptToken } from '../utils/encryption';

const prisma = new PrismaClient();

/**
 * CRM provider types
 */
export type CRMProvider = 'mri_vault' | 'salesforce' | 'top_producer' | 'kvcore' | 'follow_up_boss';

/**
 * CRM sync configuration
 */
export interface CRMSyncConfig {
  syncContacts: boolean;
  syncProperties: boolean;
  syncDeals: boolean;
  syncDirection: 'push' | 'pull' | 'bidirectional';
}

/**
 * CRM credentials structure (before encryption)
 */
export interface CRMCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  instanceUrl?: string;
  username?: string;
  password?: string;
  [key: string]: string | undefined;
}

/**
 * CRM integration interface that all connectors must implement
 */
export interface ICRMConnector {
  /**
   * Authenticate with the CRM provider
   */
  authenticate(credentials: CRMCredentials): Promise<boolean>;

  /**
   * Push a contact to the CRM
   * Returns the CRM record ID
   */
  pushContact(contact: any): Promise<string>;

  /**
   * Push a property to the CRM
   * Returns the CRM record ID
   */
  pushProperty(property: any): Promise<string>;

  /**
   * Push a deal to the CRM
   * Returns the CRM record ID
   */
  pushDeal(deal: any): Promise<string>;

  /**
   * Check if a record exists in the CRM
   * Returns the CRM record ID if found, null otherwise
   */
  findExistingRecord(type: 'contact' | 'property' | 'deal', identifier: any): Promise<string | null>;

  /**
   * Update an existing record in the CRM
   */
  updateRecord(type: 'contact' | 'property' | 'deal', crmRecordId: string, data: any): Promise<void>;
}

/**
 * CRM Integration Service
 * Manages connections to external CRM systems
 */
export class CRMIntegrationService {
  /**
   * Connect a CRM provider for a user
   */
  async connectCRM(
    userId: string,
    provider: CRMProvider,
    credentials: CRMCredentials,
    syncConfig: CRMSyncConfig
  ): Promise<{ id: string; success: boolean }> {
    // Get the appropriate connector
    const connector = this.getConnector(provider);

    // Authenticate with the CRM
    const authenticated = await connector.authenticate(credentials);
    if (!authenticated) {
      throw new Error('Failed to authenticate with CRM provider');
    }

    // Encrypt credentials
    const encryptedCredentials = encryptToken(JSON.stringify(credentials));

    // Check if integration already exists
    const existing = await prisma.cRMIntegration.findFirst({
      where: { userId, provider },
    });

    if (existing) {
      // Update existing integration
      const updated = await prisma.cRMIntegration.update({
        where: { id: existing.id },
        data: {
          credentials: encryptedCredentials,
          syncConfig,
          syncEnabled: true,
        },
      });
      return { id: updated.id, success: true };
    }

    // Create new integration
    const integration = await prisma.cRMIntegration.create({
      data: {
        userId,
        provider,
        credentials: encryptedCredentials,
        syncConfig,
        syncEnabled: true,
      },
    });

    return { id: integration.id, success: true };
  }

  /**
   * Disconnect a CRM provider
   */
  async disconnectCRM(userId: string, provider: CRMProvider): Promise<void> {
    await prisma.cRMIntegration.deleteMany({
      where: { userId, provider },
    });
  }

  /**
   * Get CRM integration for a user
   */
  async getCRMIntegration(userId: string, provider: CRMProvider) {
    return await prisma.cRMIntegration.findFirst({
      where: { userId, provider },
    });
  }

  /**
   * List all CRM integrations for a user
   */
  async listCRMIntegrations(userId: string) {
    return await prisma.cRMIntegration.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        syncEnabled: true,
        lastSyncAt: true,
        syncConfig: true,
        createdAt: true,
      },
    });
  }

  /**
   * Sync data to CRM
   */
  async syncToCRM(userId: string, provider: CRMProvider): Promise<{
    contactsSynced: number;
    propertiesSynced: number;
    dealsSynced: number;
  }> {
    const integration = await this.getCRMIntegration(userId, provider);
    if (!integration || !integration.syncEnabled) {
      throw new Error('CRM integration not found or disabled');
    }

    // Decrypt credentials
    const credentials: CRMCredentials = JSON.parse(decryptToken(integration.credentials));
    const syncConfig = integration.syncConfig as CRMSyncConfig;

    // Get the appropriate connector
    const connector = this.getConnector(provider);

    // Re-authenticate
    await connector.authenticate(credentials);

    let contactsSynced = 0;
    let propertiesSynced = 0;
    let dealsSynced = 0;

    // Sync contacts
    if (syncConfig.syncContacts) {
      const contacts = await prisma.contact.findMany({
        where: { userId },
      });

      for (const contact of contacts) {
        try {
          // Check if contact already exists in CRM
          const existingId = await connector.findExistingRecord('contact', {
            email: contact.emails[0],
            name: contact.name,
          });

          if (existingId) {
            // Update existing record
            await connector.updateRecord('contact', existingId, contact);
          } else {
            // Create new record
            await connector.pushContact(contact);
          }
          contactsSynced++;
        } catch (error) {
          console.error(`Failed to sync contact ${contact.id}:`, error);
        }
      }
    }

    // Sync properties
    if (syncConfig.syncProperties) {
      const properties = await prisma.property.findMany({
        where: { userId },
        include: {
          vendors: true,
          buyers: true,
        },
      });

      for (const property of properties) {
        try {
          // Check if property already exists in CRM
          const existingId = await connector.findExistingRecord('property', {
            address: property.address,
          });

          if (existingId) {
            // Update existing record
            await connector.updateRecord('property', existingId, property);
          } else {
            // Create new record
            await connector.pushProperty(property);
          }
          propertiesSynced++;
        } catch (error) {
          console.error(`Failed to sync property ${property.id}:`, error);
        }
      }
    }

    // Sync deals
    if (syncConfig.syncDeals) {
      const deals = await prisma.deal.findMany({
        where: { userId },
        include: {
          contacts: true,
          property: true,
        },
      });

      for (const deal of deals) {
        try {
          // Check if deal already exists in CRM
          const existingId = await connector.findExistingRecord('deal', {
            propertyId: deal.propertyId,
            stage: deal.stage,
          });

          if (existingId) {
            // Update existing record
            await connector.updateRecord('deal', existingId, deal);
          } else {
            // Create new record
            await connector.pushDeal(deal);
          }
          dealsSynced++;
        } catch (error) {
          console.error(`Failed to sync deal ${deal.id}:`, error);
        }
      }
    }

    // Update last sync time
    await prisma.cRMIntegration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() },
    });

    return { contactsSynced, propertiesSynced, dealsSynced };
  }

  /**
   * Get the appropriate connector for a CRM provider
   */
  private getConnector(provider: CRMProvider): ICRMConnector {
    switch (provider) {
      case 'mri_vault':
        return new MRIVaultConnector();
      case 'salesforce':
        throw new Error('Salesforce connector not yet implemented');
      case 'top_producer':
        throw new Error('Top Producer connector not yet implemented');
      case 'kvcore':
        throw new Error('kvCORE connector not yet implemented');
      case 'follow_up_boss':
        throw new Error('Follow Up Boss connector not yet implemented');
      default:
        throw new Error(`Unknown CRM provider: ${provider}`);
    }
  }
}

/**
 * MRI Vault CRM Connector
 * Implements integration with MRI Vault real estate CRM
 */
class MRIVaultConnector implements ICRMConnector {
  private apiKey: string = '';
  private instanceUrl: string = '';

  async authenticate(credentials: CRMCredentials): Promise<boolean> {
    if (!credentials.apiKey || !credentials.instanceUrl) {
      throw new Error('MRI Vault requires apiKey and instanceUrl');
    }

    this.apiKey = credentials.apiKey;
    this.instanceUrl = credentials.instanceUrl;

    // Test authentication by making a simple API call
    try {
      const response = await fetch(`${this.instanceUrl}/api/v1/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('MRI Vault authentication failed:', error);
      return false;
    }
  }

  async pushContact(contact: any): Promise<string> {
    const payload = this.mapContactToMRIVault(contact);

    const response = await fetch(`${this.instanceUrl}/api/v1/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to push contact to MRI Vault: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  }

  async pushProperty(property: any): Promise<string> {
    const payload = this.mapPropertyToMRIVault(property);

    const response = await fetch(`${this.instanceUrl}/api/v1/properties`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to push property to MRI Vault: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  }

  async pushDeal(deal: any): Promise<string> {
    const payload = this.mapDealToMRIVault(deal);

    const response = await fetch(`${this.instanceUrl}/api/v1/deals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to push deal to MRI Vault: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  }

  async findExistingRecord(
    type: 'contact' | 'property' | 'deal',
    identifier: any
  ): Promise<string | null> {
    let endpoint = '';
    let query = '';

    switch (type) {
      case 'contact':
        endpoint = '/api/v1/contacts/search';
        query = `email=${encodeURIComponent(identifier.email)}`;
        break;
      case 'property':
        endpoint = '/api/v1/properties/search';
        query = `address=${encodeURIComponent(identifier.address)}`;
        break;
      case 'deal':
        endpoint = '/api/v1/deals/search';
        query = `propertyId=${identifier.propertyId}&stage=${identifier.stage}`;
        break;
    }

    const response = await fetch(`${this.instanceUrl}${endpoint}?${query}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const results = await response.json();
    return results.length > 0 ? results[0].id : null;
  }

  async updateRecord(
    type: 'contact' | 'property' | 'deal',
    crmRecordId: string,
    data: any
  ): Promise<void> {
    let endpoint = '';
    let payload: any = {};

    switch (type) {
      case 'contact':
        endpoint = `/api/v1/contacts/${crmRecordId}`;
        payload = this.mapContactToMRIVault(data);
        break;
      case 'property':
        endpoint = `/api/v1/properties/${crmRecordId}`;
        payload = this.mapPropertyToMRIVault(data);
        break;
      case 'deal':
        endpoint = `/api/v1/deals/${crmRecordId}`;
        payload = this.mapDealToMRIVault(data);
        break;
    }

    const response = await fetch(`${this.instanceUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to update ${type} in MRI Vault: ${response.statusText}`);
    }
  }

  /**
   * Map Zena contact to MRI Vault format
   */
  private mapContactToMRIVault(contact: any): any {
    return {
      firstName: contact.name.split(' ')[0] || '',
      lastName: contact.name.split(' ').slice(1).join(' ') || '',
      email: contact.emails[0] || '',
      phone: contact.phones[0] || '',
      type: contact.role,
      notes: contact.relationshipNotes?.map((n: any) => n.content).join('\n') || '',
    };
  }

  /**
   * Map Zena property to MRI Vault format
   */
  private mapPropertyToMRIVault(property: any): any {
    return {
      address: property.address,
      vendors: property.vendors?.map((v: any) => v.id) || [],
      buyers: property.buyers?.map((b: any) => b.id) || [],
      milestones: property.milestones || [],
      riskOverview: property.riskOverview || '',
    };
  }

  /**
   * Map Zena deal to MRI Vault format
   */
  private mapDealToMRIVault(deal: any): any {
    return {
      propertyId: deal.propertyId,
      stage: deal.stage,
      riskLevel: deal.riskLevel,
      riskFlags: deal.riskFlags || [],
      nextAction: deal.nextAction || '',
      nextActionOwner: deal.nextActionOwner,
      summary: deal.summary,
      contacts: deal.contacts?.map((c: any) => c.id) || [],
    };
  }
}

export const crmIntegrationService = new CRMIntegrationService();
