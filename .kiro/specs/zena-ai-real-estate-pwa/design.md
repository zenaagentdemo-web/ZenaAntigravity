# Design Document

## Overview

Zena is a mobile-first progressive web application that serves as an AI-powered chief of staff for residential real estate agents. The system integrates with email providers and calendars to automatically extract, classify, and organize communications into a structured CRM-like interface. By leveraging large language models (LLMs) for natural language understanding, classification, and generation, Zena transforms unstructured email threads into actionable insights, draft responses, and relationship intelligence.

The architecture follows a client-server model where the PWA client provides an offline-capable, responsive interface optimized for mobile devices, while the backend handles email synchronization, AI processing, data storage, and third-party integrations. The system is designed to minimize manual data entry by inferring CRM data from communication patterns, making it feel lightweight and effortless compared to traditional CRM systems.

Key design principles:
- **Mobile-first**: Touch-optimized UI with voice interaction as a first-class citizen
- **Offline-resilient**: Local caching and sync queues for poor network conditions
- **Privacy-focused**: End-to-end encryption for sensitive real estate data
- **Inference over entry**: Automatically extract CRM data rather than requiring manual input
- **Integration-friendly**: Export and sync capabilities to work alongside existing CRMs

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PWA Client                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   UI Layer   │  │ Service      │  │  Local       │      │
│  │  (React/Vue) │  │ Worker       │  │  Storage     │      │
│  │              │  │              │  │  (IndexedDB) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTPS/WebSocket
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                    Backend Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   API        │  │  Auth        │  │  Sync        │      │
│  │   Gateway    │  │  Service     │  │  Engine      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   AI         │  │  Email       │  │  Calendar    │      │
│  │   Processing │  │  Connector   │  │  Connector   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Database    │  │  Queue       │  │  Storage     │      │
│  │  (Postgres)  │  │  (Redis)     │  │  (S3)        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
                             │
                             │ External APIs
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                   External Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Gmail API   │  │  MS Graph    │  │  LLM API     │      │
│  │              │  │  API         │  │  (OpenAI/    │      │
│  │              │  │              │  │   Claude)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Speech-to-  │  │  Text-to-    │  │  CRM APIs    │      │
│  │  Text API    │  │  Speech API  │  │  (MRI Vault, │      │
│  │              │  │              │  │   etc.)      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**PWA Client:**
- Render mobile-first, responsive UI
- Handle user interactions (touch, voice, text)
- Manage local data cache in IndexedDB
- Queue actions when offline
- Register and handle push notifications
- Provide service worker for offline functionality

**API Gateway:**
- Route requests to appropriate backend services
- Handle authentication and authorization
- Rate limiting and request validation
- WebSocket management for real-time updates

**Auth Service:**
- User authentication (email/password, social login)
- OAuth flow management for email/calendar providers
- Token management and refresh
- Session management

**Sync Engine:**
- Periodic email synchronization (every 5-15 minutes)
- Calendar event synchronization
- Conflict resolution for offline changes
- Change detection and incremental sync

**Email Connector:**
- Unified interface for multiple email providers
- Gmail API, Microsoft Graph, IMAP fallback
- Thread fetching and parsing
- Email sending through connected accounts

**Calendar Connector:**
- Google Calendar and Microsoft Calendar integration
- Event fetching and parsing
- Event type detection (viewing, meeting, etc.)

**AI Processing Service:**
- Email thread classification
- Entity extraction (contacts, properties, dates)
- Sentiment and risk analysis
- Draft response generation
- Voice note transcription processing
- Natural language query handling

**Database (PostgreSQL):**
- Structured storage for users, contacts, properties, deals
- Timeline events and tasks
- Relationship notes and metadata
- Email thread summaries

**Queue (Redis):**
- Background job processing
- Email sync jobs
- AI processing tasks
- Export generation

**Storage (S3 or equivalent):**
- Voice note audio files
- Uploaded documents
- Export files (CSV, Excel)

## Components and Interfaces

### Frontend Components

#### 1. App Shell
- Navigation bar with "Focus", "Waiting", "Ask Zena", "Contacts", "Properties"
- Bottom navigation for mobile
- Offline indicator
- Notification badge

#### 2. Focus View
- List of threads requiring agent reply
- Priority/risk indicators
- Thread preview with participants and subject
- Draft response preview
- Quick actions (send draft, edit, snooze)

#### 3. Waiting View
- List of threads where others owe replies
- Risk flags for delayed responses
- Thread preview
- Follow-up actions

#### 4. Ask Zena Interface
- Large text input area
- Voice input button (hold-to-talk)
- Conversation history
- Response rendering (text, bullets, drafts)
- Suggested follow-up questions

#### 5. Contact Detail View
- Contact information (name, email, phone, role)
- Active deals list
- Relationship notes
- Communication timeline
- Quick actions (email, call, add note)

#### 6. Property Detail View
- Property address and details
- Associated contacts (buyers, vendors)
- Deal stage and status
- Campaign milestones
- Activity timeline
- Quick actions (add note, update stage)

#### 7. Deal Card
- Deal summary (property, participants, stage)
- Next action and owner
- Risk indicators
- Latest email preview
- Draft response
- Timeline view

#### 8. Voice Note Recorder
- Hold-to-talk button with visual feedback
- Audio waveform visualization
- Transcription display
- Processing status
- Extracted entities preview

#### 9. Settings
- Connected accounts management
- Notification preferences
- Export/sync configuration
- Voice settings (STT/TTS preferences)

### Backend API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh access token

#### Email Accounts
- `POST /api/accounts/email/connect` - Initiate OAuth flow
- `POST /api/accounts/email/callback` - OAuth callback handler
- `GET /api/accounts/email` - List connected email accounts
- `DELETE /api/accounts/email/:id` - Disconnect email account
- `POST /api/accounts/email/:id/sync` - Trigger manual sync

#### Calendar Accounts
- `POST /api/accounts/calendar/connect` - Initiate OAuth flow
- `POST /api/accounts/calendar/callback` - OAuth callback handler
- `GET /api/accounts/calendar` - List connected calendars
- `DELETE /api/accounts/calendar/:id` - Disconnect calendar

#### Threads
- `GET /api/threads` - List threads (with filters: focus/waiting/all)
- `GET /api/threads/:id` - Get thread details
- `PUT /api/threads/:id` - Update thread metadata
- `POST /api/threads/:id/reply` - Send reply to thread
- `POST /api/threads/:id/snooze` - Snooze thread

#### Contacts
- `GET /api/contacts` - List contacts (with search/filter)
- `GET /api/contacts/:id` - Get contact details
- `PUT /api/contacts/:id` - Update contact
- `POST /api/contacts/:id/notes` - Add relationship note

#### Properties
- `GET /api/properties` - List properties
- `POST /api/properties` - Create property
- `GET /api/properties/:id` - Get property details
- `PUT /api/properties/:id` - Update property
- `POST /api/properties/:id/milestones` - Add campaign milestone

#### Deals
- `GET /api/deals` - List deals (with filters by stage/risk)
- `GET /api/deals/:id` - Get deal details
- `PUT /api/deals/:id/stage` - Update deal stage
- `POST /api/deals/:id/tasks` - Create task for deal

#### Ask Zena
- `POST /api/ask` - Submit natural language query
- `POST /api/ask/voice` - Submit voice query (with audio file)
- `GET /api/ask/history` - Get conversation history

#### Voice Notes
- `POST /api/voice-notes` - Upload voice note
- `GET /api/voice-notes/:id` - Get voice note details
- `GET /api/voice-notes/:id/audio` - Download audio file

#### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

#### Timeline
- `GET /api/timeline` - Get timeline events (with filters by entity)
- `POST /api/timeline/notes` - Add manual note

#### Export
- `POST /api/export/contacts` - Generate contact export
- `POST /api/export/properties` - Generate property export
- `POST /api/export/deals` - Generate deal export
- `GET /api/export/:id/download` - Download export file

#### CRM Integration
- `GET /api/integrations/crm` - List available CRM integrations
- `POST /api/integrations/crm/:provider/connect` - Connect CRM
- `POST /api/integrations/crm/:provider/sync` - Trigger CRM sync
- `DELETE /api/integrations/crm/:provider` - Disconnect CRM

#### Sync
- `GET /api/sync/status` - Get sync status for all accounts
- `POST /api/sync/trigger` - Trigger manual sync

#### Notifications
- `POST /api/notifications/register` - Register push notification endpoint
- `GET /api/notifications/preferences` - Get notification preferences
- `PUT /api/notifications/preferences` - Update notification preferences

### WebSocket Events

#### Client → Server
- `sync.request` - Request immediate sync
- `thread.view` - Mark thread as viewed
- `typing.start` - Agent started typing in Ask Zena

#### Server → Client
- `sync.started` - Sync operation started
- `sync.completed` - Sync operation completed
- `sync.progress` - Sync progress update
- `thread.new` - New thread detected
- `thread.updated` - Thread metadata updated
- `deal.risk` - Deal flagged as at risk
- `task.created` - New task created
- `ask.response` - Response chunk for Ask Zena query

## Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
}

interface UserPreferences {
  notificationSettings: NotificationSettings;
  voiceSettings: VoiceSettings;
  uiSettings: UISettings;
}
```

### EmailAccount
```typescript
interface EmailAccount {
  id: string;
  userId: string;
  provider: 'gmail' | 'outlook' | 'icloud' | 'yahoo' | 'imap';
  email: string;
  accessToken: string; // encrypted
  refreshToken: string; // encrypted
  tokenExpiry: Date;
  lastSyncAt: Date;
  syncEnabled: boolean;
  createdAt: Date;
}
```

### CalendarAccount
```typescript
interface CalendarAccount {
  id: string;
  userId: string;
  provider: 'google' | 'microsoft' | 'icloud';
  email: string;
  accessToken: string; // encrypted
  refreshToken: string; // encrypted
  tokenExpiry: Date;
  lastSyncAt: Date;
  syncEnabled: boolean;
  createdAt: Date;
}
```

### Thread
```typescript
interface Thread {
  id: string;
  userId: string;
  emailAccountId: string;
  externalId: string; // provider's thread ID
  subject: string;
  participants: Participant[];
  classification: 'buyer' | 'vendor' | 'market' | 'lawyer_broker' | 'noise';
  category: 'focus' | 'waiting';
  propertyId?: string;
  dealId?: string;
  stage?: DealStage;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  riskReason?: string;
  nextAction?: string;
  nextActionOwner: 'agent' | 'other';
  lastMessageAt: Date;
  lastReplyAt?: Date;
  summary: string;
  draftResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Participant {
  name: string;
  email: string;
  role?: 'buyer' | 'vendor' | 'agent' | 'lawyer' | 'broker' | 'other';
}

type DealStage = 'lead' | 'qualified' | 'viewing' | 'offer' | 'conditional' | 'pre_settlement' | 'sold' | 'nurture';
```

### Contact
```typescript
interface Contact {
  id: string;
  userId: string;
  name: string;
  emails: string[];
  phones: string[];
  role: 'buyer' | 'vendor' | 'market' | 'other';
  dealIds: string[];
  relationshipNotes: RelationshipNote[];
  createdAt: Date;
  updatedAt: Date;
}

interface RelationshipNote {
  id: string;
  content: string;
  source: 'email' | 'voice_note' | 'manual';
  createdAt: Date;
}
```

### Property
```typescript
interface Property {
  id: string;
  userId: string;
  address: string;
  vendorContactIds: string[];
  buyerContactIds: string[];
  dealIds: string[];
  milestones: CampaignMilestone[];
  riskOverview?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CampaignMilestone {
  id: string;
  type: 'listing' | 'first_open' | 'offer_received' | 'conditional' | 'unconditional' | 'settled';
  date: Date;
  notes?: string;
}
```

### Deal
```typescript
interface Deal {
  id: string;
  userId: string;
  threadId: string;
  propertyId?: string;
  contactIds: string[];
  stage: DealStage;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  riskFlags: string[];
  nextAction?: string;
  nextActionOwner: 'agent' | 'other';
  summary: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### TimelineEvent
```typescript
interface TimelineEvent {
  id: string;
  userId: string;
  type: 'email' | 'call' | 'meeting' | 'task' | 'note' | 'voice_note';
  entityType: 'thread' | 'contact' | 'property' | 'deal';
  entityId: string;
  summary: string;
  content?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
}
```

### Task
```typescript
interface Task {
  id: string;
  userId: string;
  label: string;
  status: 'open' | 'completed';
  dueDate?: Date;
  dealId?: string;
  propertyId?: string;
  contactId?: string;
  source: 'email' | 'voice_note' | 'manual' | 'ai_suggested';
  createdAt: Date;
  completedAt?: Date;
}
```

### VoiceNote
```typescript
interface VoiceNote {
  id: string;
  userId: string;
  audioUrl: string;
  transcript: string;
  extractedEntities: ExtractedEntity[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
}

interface ExtractedEntity {
  type: 'contact' | 'property' | 'task' | 'note';
  data: any;
  confidence: number;
}
```

### CRMIntegration
```typescript
interface CRMIntegration {
  id: string;
  userId: string;
  provider: 'mri_vault' | 'salesforce' | 'top_producer' | 'kvcore' | 'follow_up_boss';
  credentials: string; // encrypted
  syncEnabled: boolean;
  lastSyncAt?: Date;
  syncConfig: CRMSyncConfig;
  createdAt: Date;
}

interface CRMSyncConfig {
  syncContacts: boolean;
  syncProperties: boolean;
  syncDeals: boolean;
  syncDirection: 'push' | 'pull' | 'bidirectional';
}
```

### Export
```typescript
interface Export {
  id: string;
  userId: string;
  type: 'contacts' | 'properties' | 'deals';
  format: 'csv' | 'xlsx' | 'vcard';
  fileUrl: string;
  recordCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}
```

## Error Handling

### Error Categories

1. **Authentication Errors**
   - Invalid credentials
   - Expired tokens
   - OAuth failures
   - Insufficient permissions

2. **Sync Errors**
   - Email provider API failures
   - Rate limiting
   - Network timeouts
   - Invalid tokens

3. **AI Processing Errors**
   - LLM API failures
   - Transcription failures
   - Classification errors
   - Generation timeouts

4. **Data Errors**
   - Validation failures
   - Duplicate detection conflicts
   - Missing required fields
   - Invalid references

5. **Integration Errors**
   - CRM API failures
   - Export generation failures
   - File upload failures

### Error Handling Strategy

**Client-Side:**
- Display user-friendly error messages
- Retry transient failures automatically (with exponential backoff)
- Queue actions when offline
- Show sync status and errors in UI
- Provide manual retry options

**Server-Side:**
- Log all errors with context (user ID, request ID, stack trace)
- Return structured error responses with error codes
- Implement circuit breakers for external APIs
- Use dead letter queues for failed background jobs
- Send alerts for critical errors (auth failures, data corruption)

**Error Response Format:**
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
}
```

**Common Error Codes:**
- `AUTH_INVALID_CREDENTIALS` - Invalid login credentials
- `AUTH_TOKEN_EXPIRED` - Access token expired
- `AUTH_OAUTH_FAILED` - OAuth flow failed
- `SYNC_PROVIDER_ERROR` - Email/calendar provider error
- `SYNC_RATE_LIMITED` - Rate limit exceeded
- `AI_PROCESSING_FAILED` - AI processing error
- `AI_TIMEOUT` - AI request timeout
- `VALIDATION_FAILED` - Input validation error
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict (duplicate)
- `INTEGRATION_FAILED` - CRM integration error
- `EXPORT_FAILED` - Export generation error

### Retry Logic

**Email Sync:**
- Retry on transient failures (network, timeout)
- Exponential backoff: 1min, 5min, 15min, 1hr
- Skip permanently failed threads after 3 attempts
- Alert user after 24 hours of sync failures

**AI Processing:**
- Retry on timeout or rate limit
- Exponential backoff: 5s, 30s, 2min
- Fall back to simpler classification if LLM fails
- Queue for manual review if all retries fail

**CRM Sync:**
- Retry on transient failures
- Exponential backoff: 1min, 10min, 1hr
- Log conflicts for manual resolution
- Alert user of sync failures

## Testing Strategy

### Unit Testing

Unit tests will verify individual functions and components in isolation:

**Frontend:**
- Component rendering with various props
- User interaction handlers (click, input, voice)
- Local storage operations
- Service worker registration and caching
- Offline queue management

**Backend:**
- API endpoint handlers
- Authentication and authorization logic
- Data validation functions
- Email/calendar parsing logic
- Entity extraction functions
- Export generation logic

**Test Framework:** Jest for both frontend and backend unit tests

**Coverage Target:** 80% code coverage for critical paths

### Property-Based Testing

Property-based tests will verify universal properties that should hold across all inputs using **fast-check** (JavaScript/TypeScript property-based testing library).

**Configuration:** Each property-based test will run a minimum of 100 iterations to ensure thorough coverage of the input space.

**Test Tagging:** Each property-based test will include a comment explicitly referencing the correctness property from this design document using the format:
```typescript
// Feature: zena-ai-real-estate-pwa, Property {number}: {property_text}
```

### Integration Testing

Integration tests will verify interactions between components:

- Email provider OAuth flows (Gmail, Outlook)
- Email sync and thread parsing
- Calendar sync and event linking
- AI processing pipeline (classification, extraction, generation)
- CRM export and sync workflows
- WebSocket real-time updates
- Push notification delivery

**Test Framework:** Jest with supertest for API testing, Playwright for end-to-end PWA testing

### Performance Testing

- Load testing for concurrent users
- Email sync performance with large inboxes
- AI processing latency
- Database query performance
- Mobile network simulation (3G, 4G, offline)

**Tools:** k6 for load testing, Lighthouse for PWA performance audits

### Security Testing

- OAuth flow security
- Token encryption and storage
- API authentication and authorization
- Input validation and sanitization
- SQL injection prevention
- XSS prevention

**Tools:** OWASP ZAP for security scanning, manual penetration testing

### Accessibility Testing

- Screen reader compatibility
- Keyboard navigation
- Touch target sizes (minimum 44x44px)
- Color contrast ratios (WCAG AA)
- Focus indicators

**Tools:** axe-core for automated accessibility testing, manual testing with screen readers


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Offline data accessibility

*For any* recently synced data (threads, contacts, properties, deals), when the agent has no network connectivity, all synced data should remain accessible for reading.

**Validates: Requirements 1.4, 19.1**

### Property 2: Multi-account unification

*For any* set of connected email accounts, all threads and contacts should be treated as part of one unified inbox without duplication.

**Validates: Requirements 2.3, 18.1**

### Property 3: Automatic email synchronization

*For any* connected email account with sync enabled, new messages and updates should be fetched periodically without manual intervention.

**Validates: Requirements 2.4**

### Property 4: Thread classification completeness

*For any* processed email thread, it should be classified into exactly one of the following categories: Buyer, Vendor, Market contact, Lawyer/Broker/Other, or Noise/Marketing.

**Validates: Requirements 3.1**

### Property 5: Thread categorization exclusivity

*For any* classified thread, it should be placed in exactly one category: either Focus (agent owes reply) or Waiting (others owe reply).

**Validates: Requirements 3.2**

### Property 6: Thread metadata extraction completeness

*For any* processed thread, the system should extract all required metadata fields: parties involved, associated property (if any), current stage, risk signals, next actions, and relevant dates.

**Validates: Requirements 3.3**

### Property 7: Entity linking consistency

*For any* set of threads that reference the same property address or contact email, all threads should be linked together in the data model.

**Validates: Requirements 3.4**

### Property 8: Calendar event type detection

*For any* synced calendar event, if it contains real estate keywords (viewing, appraisal, vendor meeting, auction, settlement), the system should detect and classify the event type.

**Validates: Requirements 4.2**

### Property 9: Calendar event linking

*For any* processed calendar event with property or contact references, the event should be linked to the relevant property, contact, or deal.

**Validates: Requirements 4.3**

### Property 10: Query response completeness

*For any* agent query about a property or contact, the response should include all associated calendar events.

**Validates: Requirements 4.4**

### Property 11: Calendar event extraction completeness

*For any* real estate-related calendar event, the system should extract and store the event type, participants, property reference, and timing.

**Validates: Requirements 4.5**

### Property 12: Voice recording control

*For any* voice input session, audio recording should start when the button is pressed and stop when the button is released.

**Validates: Requirements 5.1**

### Property 13: Voice note transcription

*For any* received voice note or audio upload, the system should attempt transcription using speech-to-text technology.

**Validates: Requirements 5.3**

### Property 14: Transcript entity extraction

*For any* transcribed voice note, the system should extract key facts including who, what property, and what was discussed.

**Validates: Requirements 5.4**

### Property 15: Transcript entity creation and linking

*For any* processed transcript with extracted entities, the system should create timeline entries, tasks, and relationship notes linked to the relevant deals, properties, or contacts.

**Validates: Requirements 5.5**

### Property 16: Focus list size constraint

*For any* agent's Focus list, it should contain between 3 and 10 threads (or fewer if insufficient threads require replies).

**Validates: Requirements 6.1**

### Property 17: Focus list priority ordering

*For any* Focus list, threads should be ordered such that higher priority and higher risk threads appear before lower priority and lower risk threads.

**Validates: Requirements 6.2**

### Property 18: Focus thread draft generation

*For any* thread in the Focus list, the system should provide a draft response.

**Validates: Requirements 6.3**

### Property 19: Waiting list risk flagging

*For any* thread in the Waiting list, if no response has been received for 5 or more days, the thread should be flagged as at risk.

**Validates: Requirements 6.5**

### Property 20: Contact deduplication

*For any* set of contacts with matching email addresses or names, the system should merge them into a single contact record.

**Validates: Requirements 7.1, 10.2, 18.4**

### Property 21: Contact classification

*For any* created contact, the system should classify them as Buyer, Vendor, Market contact, or Other.

**Validates: Requirements 7.2**

### Property 22: Property thread attachment

*For any* manually added property address, all email threads that mention that address should be automatically attached to the property.

**Validates: Requirements 7.3, 11.3**

### Property 23: Deal card completeness

*For any* created deal card, it should include stage, next move owner, risk flags, and next actions.

**Validates: Requirements 7.4**

### Property 24: Query natural language processing

*For any* question typed or spoken in Ask Zena, the system should process it using natural language understanding.

**Validates: Requirements 8.1**

### Property 25: Query search comprehensiveness

*For any* Ask Zena query, the system should search across all data sources: email threads, calendar events, voice note transcripts, timeline entries, and tasks.

**Validates: Requirements 8.2**

### Property 26: Response structure

*For any* Ask Zena response, it should be formatted as bullet points, summaries, or suggested actions.

**Validates: Requirements 8.3**

### Property 27: Voice query pipeline

*For any* voice query (press and hold talk button), the system should capture audio, transcribe it, and process the query.

**Validates: Requirements 9.1**

### Property 28: Text-to-speech generation

*For any* agent request for text-to-speech output, the system should generate and play audio using voice synthesis.

**Validates: Requirements 9.3**

### Property 29: Content text-to-speech delivery

*For any* request to read an email or summary aloud, the system should retrieve the content and deliver it via text-to-speech.

**Validates: Requirements 9.4**

### Property 30: Voice interaction visual feedback

*For any* active voice interaction, the system should display visual feedback indicating the current state (listening, processing, or speaking).

**Validates: Requirements 9.5**

### Property 31: Contact view completeness

*For any* contact viewed by an agent, the display should include all active deals, roles, and key relationship notes.

**Validates: Requirements 10.1**

### Property 32: Relationship note preservation

*For any* stored relationship note, the system should preserve all context including preferences, concerns, and communication style.

**Validates: Requirements 10.3**

### Property 33: Contact search matching

*For any* contact search query, the system should return results matching the name, email, or associated property.

**Validates: Requirements 10.4**

### Property 34: Contact communication linking

*For any* contact appearing in multiple threads, all related communications should be linked to their profile.

**Validates: Requirements 10.5**

### Property 35: Property creation and linking

*For any* property address added by an agent, the system should create a property record and begin linking relevant threads.

**Validates: Requirements 11.1**

### Property 36: Property view completeness

*For any* property viewed by an agent, the display should show associated buyers, vendor communications, and campaign milestones.

**Validates: Requirements 11.2**

### Property 37: Property calendar event association

*For any* property-related calendar event, the system should associate it with the property record.

**Validates: Requirements 11.4**

### Property 38: Property timeline chronological ordering

*For any* property timeline, all related activity should be displayed in chronological order.

**Validates: Requirements 11.5**

### Property 39: Deal initial stage assignment

*For any* created deal, the system should assign an initial stage from the valid set: lead, qualified, viewing, offer, conditional, pre-settlement, sold, or nurture.

**Validates: Requirements 12.1**

### Property 40: Deal stage progression

*For any* deal with stage progression signals detected in communications, the system should update the deal stage automatically.

**Validates: Requirements 12.2**

### Property 41: Deal view completeness

*For any* deal viewed by an agent, the display should show the current stage, who has the next move, and risk flags.

**Validates: Requirements 12.3**

### Property 42: Deal stagnation risk flagging

*For any* deal remaining in the same stage for an extended period (threshold to be defined), the system should flag it as potentially at risk.

**Validates: Requirements 12.4**

### Property 43: Deal stage change recording

*For any* deal stage update, the system should record the change in the timeline with timestamp and reason.

**Validates: Requirements 12.5**

### Property 44: Deal risk evaluation

*For any* analyzed deal, the system should evaluate risk based on response delays, communication frequency, and stage duration.

**Validates: Requirements 13.1**

### Property 45: Risk flag with explanation

*For any* deal meeting risk criteria, the system should flag it with a risk indicator and explanation.

**Validates: Requirements 13.2**

### Property 46: Waiting list risk categorization

*For any* deal in the Waiting list, the system should correctly categorize it as either safe or at-risk.

**Validates: Requirements 13.4**

### Property 47: Task extraction from communications

*For any* email or voice note containing action items, the system should create tasks with labels and optional due dates.

**Validates: Requirements 14.1**

### Property 48: Task entity linking

*For any* created task, the system should link it to the relevant deal, property, or contact.

**Validates: Requirements 14.2**

### Property 49: Task display in entity views

*For any* deal or property view, all associated open tasks should be displayed.

**Validates: Requirements 14.3**

### Property 50: Task completion recording

*For any* completed task, the system should update its status and record the completion in the timeline.

**Validates: Requirements 14.4**

### Property 51: Overdue task highlighting

*For any* task that is overdue, the system should highlight it in the agent's daily view.

**Validates: Requirements 14.5**

### Property 52: Draft response editability

*For any* draft response, the agent should be able to perform full text editing before sending.

**Validates: Requirements 15.2**

### Property 53: Draft response delivery

*For any* draft response sent by an agent, the system should deliver it through the connected email account.

**Validates: Requirements 15.4**

### Property 54: Timeline chronological ordering

*For any* timeline for a deal, contact, or property, all related events should be displayed in chronological order.

**Validates: Requirements 16.1, 11.5**

### Property 55: Timeline event recording completeness

*For any* recorded timeline event, the system should capture the event type (email, call, meeting, task, note), timestamp, and summary.

**Validates: Requirements 16.2**

### Property 56: Voice note timeline integration

*For any* processed voice note, its summary should be added to the relevant timeline.

**Validates: Requirements 16.3**

### Property 57: Email timeline automation

*For any* email sent or received, the system should automatically add it to relevant timelines.

**Validates: Requirements 16.4**

### Property 58: Manual note timeline insertion

*For any* manual note added by an agent, the system should insert it into the timeline with a timestamp.

**Validates: Requirements 16.5**

### Property 59: Search result matching

*For any* search query, the system should return results matching deals, contacts, properties, or communications.

**Validates: Requirements 17.1**

### Property 60: Search result ranking

*For any* search results, they should be ranked such that more relevant and more recent items appear before less relevant and older items.

**Validates: Requirements 17.2**

### Property 61: Address search completeness

*For any* search query containing a property address, the system should return the property and all associated threads.

**Validates: Requirements 17.3**

### Property 62: Name search completeness

*For any* search query containing a person's name, the system should return the contact and all related deals.

**Validates: Requirements 17.4**

### Property 63: Search result context snippets

*For any* search result, the system should provide a context snippet showing why the result matched.

**Validates: Requirements 17.5**

### Property 64: Thread account indication

*For any* displayed thread, the system should indicate which email account received each message.

**Validates: Requirements 18.2**

### Property 65: Reply account selection

*For any* reply sent by an agent, the system should use the appropriate email account based on the original recipient address.

**Validates: Requirements 18.3**

### Property 66: Account disconnection data handling

*For any* disconnected email account, the system should remove access to that account's data while preserving manually entered information.

**Validates: Requirements 18.5**

### Property 67: Offline action queuing

*For any* action performed by an agent while offline, the system should queue it for synchronization when connectivity is restored.

**Validates: Requirements 19.2**

### Property 68: Reconnection synchronization

*For any* restoration of network connectivity, the system should sync all queued actions and fetch new data automatically.

**Validates: Requirements 19.3**

### Property 69: Offline status indication

*For any* offline operation, the system should clearly indicate offline status and data freshness.

**Validates: Requirements 19.4**

### Property 70: Offline action user notification

*For any* action requiring network connectivity attempted while offline, the system should inform the agent and offer to queue the action.

**Validates: Requirements 19.5**

### Property 71: High-priority thread notifications

*For any* high-priority thread requiring the agent's reply, the system should send a push notification.

**Validates: Requirements 20.2**

### Property 72: Risk deal notifications

*For any* deal flagged as at risk, the system should send a push notification with risk details.

**Validates: Requirements 20.3**

### Property 73: Calendar event reminder notifications

*For any* approaching calendar event, the system should send a reminder notification.

**Validates: Requirements 20.4**

### Property 74: Notification preference respect

*For any* notification category disabled by an agent, the system should not send notifications for that category.

**Validates: Requirements 20.5**

### Property 75: Contact export completeness

*For any* contact export, the file should include name, email addresses, phone numbers, role classification, associated properties, and relationship notes.

**Validates: Requirements 21.2**

### Property 76: Property export completeness

*For any* property export, the file should include address, vendor information, associated contacts, stage, and campaign milestones.

**Validates: Requirements 21.3**

### Property 77: Deal export completeness

*For any* deal export, the file should include deal stage, participants, property reference, timeline summary, next actions, and risk flags.

**Validates: Requirements 21.4**

### Property 78: CRM duplicate prevention

*For any* data push to a connected CRM, if an existing record is detected, the system should update it rather than create a duplicate.

**Validates: Requirements 21.8**

### Property 79: Selective export

*For any* selective export request, the system should export only the specific records (contacts, properties, or deals) selected by the agent.

**Validates: Requirements 21.9**

### Property 80: Credential encryption

*For any* stored authentication credentials, the system should encrypt them using industry-standard encryption.

**Validates: Requirements 22.1**

### Property 81: Transport encryption

*For any* data transmission between client and server, the system should use HTTPS/TLS encryption.

**Validates: Requirements 22.2**

### Property 82: OAuth token scope validation

*For any* email or calendar data access, the system should use OAuth tokens with appropriate scopes and expiration.

**Validates: Requirements 22.3**

### Property 83: Data deletion completeness

*For any* account disconnection or data deletion request, the system should permanently remove the data from storage.

**Validates: Requirements 22.4**

### Property 84: Initial load performance

*For any* agent opening Zena on a standard mobile connection, the main interface should display within 2 seconds.

**Validates: Requirements 23.1**

### Property 85: Query response performance

*For any* Ask Zena query under normal conditions, the system should return a response within 5 seconds.

**Validates: Requirements 23.2**

### Property 86: Background sync non-blocking

*For any* background email sync operation, the user interface should remain responsive and not be blocked or slowed down.

**Validates: Requirements 23.3**

### Property 87: Navigation performance

*For any* navigation between views, the new view should render within 500 milliseconds.

**Validates: Requirements 23.4**

### Property 88: Large thread pagination

*For any* large email thread, the system should paginate or lazy-load content to maintain responsiveness.

**Validates: Requirements 23.5**

### Property 89: Mobile tap target sizing

*For any* interactive element on mobile, tap targets should be appropriately sized (minimum 44x44 pixels).

**Validates: Requirements 24.1**

### Property 90: Desktop layout adaptation

*For any* agent using Zena on desktop, the layout should adapt to take advantage of larger screen space.

**Validates: Requirements 24.3**

### Property 91: Mobile keyboard type triggering

*For any* text input field, the system should trigger the appropriate mobile keyboard type (email, phone, text).

**Validates: Requirements 24.4**

### Property 92: Vendor update compilation

*For any* vendor update request for a property, the system should compile buyer feedback, viewing activity, and communication summaries.

**Validates: Requirements 25.1**

### Property 93: Buyer feedback anonymization

*For any* vendor update including buyer feedback, buyer identities should be anonymized unless explicitly identified.

**Validates: Requirements 25.3**

### Property 94: Vendor update metrics inclusion

*For any* vendor update, the system should highlight key metrics including number of viewings, inquiries, and offers.

**Validates: Requirements 25.4**

### Property 95: Vendor update editability

*For any* generated vendor update, the agent should be able to perform full customization before sending.

**Validates: Requirements 25.5**
