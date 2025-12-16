# CRM Integration Service

## Overview

The CRM Integration Service provides a unified interface for connecting Zena to external CRM systems. It handles authentication, field mapping, duplicate detection, and bidirectional data synchronization with real estate-focused CRM platforms.

## Supported CRM Providers

### Currently Implemented
- **MRI Vault**: Real estate CRM platform with full API support

### Planned Support
- Salesforce Real Estate
- Top Producer
- kvCORE
- Follow Up Boss

## Architecture

### Service Interface

The `ICRMConnector` interface defines the contract that all CRM connectors must implement:

```typescript
interface ICRMConnector {
  authenticate(credentials: CRMCredentials): Promise<boolean>;
  pushContact(contact: any): Promise<string>;
  pushProperty(property: any): Promise<string>;
  pushDeal(deal: any): Promise<string>;
  findExistingRecord(type, identifier): Promise<string | null>;
  updateRecord(type, crmRecordId, data): Promise<void>;
}
```

### Data Flow

1. **Authentication**: User provides CRM credentials → Service validates → Credentials encrypted and stored
2. **Sync Trigger**: User initiates sync → Service fetches Zena data → Maps to CRM format → Checks for duplicates → Creates or updates CRM records
3. **Duplicate Detection**: Before creating records, service searches CRM for existing matches by key identifiers (email, address, etc.)

## API Endpoints

### List Available CRM Providers
```
GET /api/integrations/crm
```

Returns list of supported CRM providers with availability status.

### Get User's CRM Integrations
```
GET /api/integrations/crm/user
```

Returns all CRM integrations configured for the authenticated user.

### Connect CRM Provider
```
POST /api/integrations/crm/:provider/connect
```

**Body:**
```json
{
  "credentials": {
    "apiKey": "...",
    "instanceUrl": "https://..."
  },
  "syncConfig": {
    "syncContacts": true,
    "syncProperties": true,
    "syncDeals": true,
    "syncDirection": "push"
  }
}
```

Authenticates with the CRM provider and stores encrypted credentials.

### Trigger CRM Sync
```
POST /api/integrations/crm/:provider/sync
```

Synchronizes data from Zena to the connected CRM. Returns count of records synced.

**Response:**
```json
{
  "success": true,
  "contactsSynced": 45,
  "propertiesSynced": 12,
  "dealsSynced": 8
}
```

### Disconnect CRM Provider
```
DELETE /api/integrations/crm/:provider
```

Removes the CRM integration and deletes stored credentials.

## Field Mapping

### Contact Mapping (Zena → MRI Vault)

| Zena Field | MRI Vault Field |
|------------|-----------------|
| name (first word) | firstName |
| name (remaining) | lastName |
| emails[0] | email |
| phones[0] | phone |
| role | type |
| relationshipNotes | notes |

### Property Mapping (Zena → MRI Vault)

| Zena Field | MRI Vault Field |
|------------|-----------------|
| address | address |
| vendors | vendors (array of IDs) |
| buyers | buyers (array of IDs) |
| milestones | milestones |
| riskOverview | riskOverview |

### Deal Mapping (Zena → MRI Vault)

| Zena Field | MRI Vault Field |
|------------|-----------------|
| propertyId | propertyId |
| stage | stage |
| riskLevel | riskLevel |
| riskFlags | riskFlags |
| nextAction | nextAction |
| nextActionOwner | nextActionOwner |
| summary | summary |
| contacts | contacts (array of IDs) |

## Duplicate Detection

The service implements intelligent duplicate detection to prevent creating duplicate records in the CRM:

### Contact Deduplication
- Searches by email address
- If match found, updates existing record instead of creating new one

### Property Deduplication
- Searches by address
- If match found, updates existing record instead of creating new one

### Deal Deduplication
- Searches by propertyId and stage combination
- If match found, updates existing record instead of creating new one

## Security

### Credential Encryption
All CRM credentials are encrypted using AES-256-GCM before storage:
- Encryption key from environment variable `ENCRYPTION_KEY`
- Each credential set encrypted separately
- Decrypted only when needed for API calls

### Authentication
- All endpoints require valid JWT token
- User can only access their own CRM integrations
- Credentials never exposed in API responses

## Error Handling

### Common Error Codes

- `AUTH_REQUIRED`: User not authenticated
- `VALIDATION_FAILED`: Invalid input data
- `INTEGRATION_FAILED`: CRM connection or sync failed

### Retry Strategy

- Authentication failures: No retry (user must fix credentials)
- Network errors: Exponential backoff (1min, 10min, 1hr)
- Rate limiting: Respect CRM provider's rate limits
- Individual record failures: Log and continue with remaining records

## Usage Example

### Connecting MRI Vault

```typescript
// 1. Connect to MRI Vault
const response = await fetch('/api/integrations/crm/mri_vault/connect', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    credentials: {
      apiKey: 'your-api-key',
      instanceUrl: 'https://your-instance.mrivault.com'
    },
    syncConfig: {
      syncContacts: true,
      syncProperties: true,
      syncDeals: true,
      syncDirection: 'push'
    }
  })
});

// 2. Trigger sync
const syncResponse = await fetch('/api/integrations/crm/mri_vault/sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await syncResponse.json();
console.log(`Synced ${result.contactsSynced} contacts`);
```

## Adding New CRM Connectors

To add support for a new CRM provider:

1. Create a new class implementing `ICRMConnector`
2. Implement all required methods (authenticate, push*, findExistingRecord, updateRecord)
3. Add field mapping methods for the CRM's schema
4. Update the `getConnector` method in `CRMIntegrationService`
5. Add the provider to the list in the controller

Example skeleton:

```typescript
class NewCRMConnector implements ICRMConnector {
  private apiKey: string = '';
  
  async authenticate(credentials: CRMCredentials): Promise<boolean> {
    // Implement authentication
  }
  
  async pushContact(contact: any): Promise<string> {
    const payload = this.mapContactToNewCRM(contact);
    // Make API call
  }
  
  // ... implement other methods
  
  private mapContactToNewCRM(contact: any): any {
    // Map Zena fields to CRM fields
  }
}
```

## Testing

Property-based tests verify:
- Duplicate detection prevents creating duplicate records
- Field mapping preserves data integrity
- Encryption/decryption round-trips correctly
- Authentication failures are handled gracefully

## Future Enhancements

- Bidirectional sync (pull data from CRM to Zena)
- Webhook support for real-time updates
- Batch sync optimization for large datasets
- Conflict resolution for bidirectional sync
- Custom field mapping configuration
- Sync scheduling (automatic periodic sync)
