# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Initialize monorepo with frontend (PWA) and backend workspaces
  - Configure TypeScript, ESLint, Prettier
  - Set up package.json with core dependencies (React/Vue, Node.js, Express)
  - Configure build tools (Vite/Webpack for frontend, tsc for backend)
  - Set up environment variable management (.env files)
  - Create basic folder structure (src/components, src/services, src/models, etc.)
  - _Requirements: All_

- [x] 2. Implement database schema and models
  - Set up PostgreSQL database connection
  - Create database migration system (using Prisma or TypeORM)
  - Implement User model with authentication fields
  - Implement EmailAccount and CalendarAccount models
  - Implement Thread model with classification and categorization fields
  - Implement Contact model with deduplication support
  - Implement Property model with milestone tracking
  - Implement Deal model with stage and risk tracking
  - Implement TimelineEvent model
  - Implement Task model
  - Implement VoiceNote model
  - Implement CRMIntegration and Export models
  - Create database indexes for performance
  - _Requirements: All data models from design_

- [x] 3. Build authentication system
  - Implement user registration endpoint (POST /api/auth/register)
  - Implement user login endpoint with JWT token generation (POST /api/auth/login)
  - Implement token refresh endpoint (POST /api/auth/refresh)
  - Implement logout endpoint (POST /api/auth/logout)
  - Create authentication middleware for protected routes
  - Implement password hashing with bcrypt
  - Set up session management
  - _Requirements: 22.1, 22.2_

- [x] 3.1 Write property test for authentication
  - **Property 80: Credential encryption**
  - **Validates: Requirements 22.1**

- [x] 3.2 Write property test for transport security
  - **Property 81: Transport encryption**
  - **Validates: Requirements 22.2**

- [x] 4. Implement OAuth flow for email providers
  - Create OAuth service for Gmail (Google OAuth 2.0)
  - Create OAuth service for Microsoft (Outlook/Hotmail)
  - Implement OAuth initiation endpoint (POST /api/accounts/email/connect)
  - Implement OAuth callback handler (POST /api/accounts/email/callback)
  - Implement token storage with encryption
  - Implement token refresh logic
  - Add IMAP fallback connector for unsupported providers
  - _Requirements: 2.1, 2.2, 22.1, 22.3_


- [x] 4.1 Write property test for OAuth token validation
  - **Property 82: OAuth token scope validation**
  - **Validates: Requirements 22.3**

- [x] 4.2 Write property test for multi-account unification
  - **Property 2: Multi-account unification**
  - **Validates: Requirements 2.3, 18.1**

- [x] 5. Implement OAuth flow for calendar providers
  - Create OAuth service for Google Calendar
  - Create OAuth service for Microsoft Calendar
  - Implement calendar OAuth endpoints (connect and callback)
  - Implement token storage and refresh for calendar accounts
  - _Requirements: 4.1_

- [x] 6. Build email synchronization engine
  - Create sync engine service with periodic job scheduling (using node-cron or Bull)
  - Implement Gmail API thread fetching
  - Implement Microsoft Graph API thread fetching
  - Implement IMAP thread fetching for fallback
  - Create thread parser to extract subject, participants, body, dates
  - Implement incremental sync (fetch only new/updated threads)
  - Store threads in database with external IDs
  - Handle sync errors with retry logic and exponential backoff
  - _Requirements: 2.2, 2.4, 3.3_

- [x] 6.1 Write property test for automatic synchronization
  - **Property 3: Automatic email synchronization**
  - **Validates: Requirements 2.4**

- [x] 6.2 Write property test for thread metadata extraction
  - **Property 6: Thread metadata extraction completeness**
  - **Validates: Requirements 3.3**

- [x] 7. Build calendar synchronization engine
  - Create calendar sync service with periodic scheduling
  - Implement Google Calendar event fetching
  - Implement Microsoft Calendar event fetching
  - Parse calendar events to extract type, participants, timing
  - Store events in database
  - _Requirements: 4.2, 4.5_

- [x] 7.1 Write property test for calendar event extraction
  - **Property 11: Calendar event extraction completeness**
  - **Validates: Requirements 4.5**

- [x] 8. Implement AI processing service for thread classification
  - Set up LLM API client (OpenAI or Anthropic Claude)
  - Create classification prompt for thread types (Buyer, Vendor, Market, Lawyer/Broker, Noise)
  - Implement classification endpoint that processes threads
  - Store classification results in Thread model
  - Implement categorization logic (Focus vs Waiting based on who owes reply)
  - Add error handling and fallback for AI failures
  - _Requirements: 3.1, 3.2_

- [x] 8.1 Write property test for thread classification
  - **Property 4: Thread classification completeness**
  - **Validates: Requirements 3.1**

- [x] 8.2 Write property test for thread categorization
  - **Property 5: Thread categorization exclusivity**
  - **Validates: Requirements 3.2**

- [x] 9. Implement entity extraction from threads
  - Create entity extraction prompt for LLM (extract contacts, properties, dates, actions)
  - Implement contact extraction and deduplication logic
  - Implement property address extraction
  - Implement deal stage detection
  - Implement risk signal detection
  - Implement next action extraction
  - Store extracted entities in respective models
  - _Requirements: 3.3, 7.1, 7.2_

- [x] 9.1 Write property test for contact deduplication
  - **Property 20: Contact deduplication**
  - **Validates: Requirements 7.1, 10.2, 18.4**

- [x] 9.2 Write property test for contact classification
  - **Property 21: Contact classification**
  - **Validates: Requirements 7.2**

- [x] 9.3 Write property test for entity linking
  - **Property 7: Entity linking consistency**
  - **Validates: Requirements 3.4**

- [x] 10. Implement thread linking to properties and contacts
  - Create linking service that matches threads to properties by address
  - Create linking service that matches threads to contacts by email
  - Update Thread model with propertyId and contactIds
  - Implement automatic linking when new threads are synced
  - _Requirements: 3.4, 7.3, 11.3_

- [x] 10.1 Write property test for property thread attachment
  - **Property 22: Property thread attachment**
  - **Validates: Requirements 7.3, 11.3**

- [x] 11. Implement calendar event linking
  - Create event linking service that matches events to properties
  - Create event linking service that matches events to contacts
  - Detect event types (viewing, appraisal, meeting, auction, settlement)
  - Store event links in database
  - _Requirements: 4.2, 4.3, 4.4, 11.4_

- [x] 11.1 Write property test for calendar event type detection
  - **Property 8: Calendar event type detection**
  - **Validates: Requirements 4.2**

- [x] 11.2 Write property test for calendar event linking
  - **Property 9: Calendar event linking**
  - **Validates: Requirements 4.3**

- [x] 12. Build risk analysis system
  - Implement risk evaluation logic (response delays, communication frequency, stage duration)
  - Create risk scoring algorithm
  - Implement risk flagging for deals
  - Store risk level and reason in Deal model
  - Implement time-based risk detection (5+ days no response)
  - _Requirements: 6.5, 12.4, 13.1, 13.2_

- [x] 12.1 Write property test for risk evaluation
  - **Property 44: Deal risk evaluation**
  - **Validates: Requirements 13.1**

- [x] 12.2 Write property test for risk flagging
  - **Property 45: Risk flag with explanation**
  - **Validates: Requirements 13.2**

- [x] 12.3 Write property test for waiting list risk flagging
  - **Property 19: Waiting list risk flagging**
  - **Validates: Requirements 6.5**

- [x] 13. Implement draft response generation
  - Create draft generation prompt for LLM
  - Implement draft generation service that considers thread context
  - Store draft responses in Thread model
  - Generate drafts for all Focus threads
  - _Requirements: 6.3, 15.1_

- [x] 13.1 Write property test for focus thread draft generation
  - **Property 18: Focus thread draft generation**
  - **Validates: Requirements 6.3**

- [x] 14. Build Focus and Waiting list logic
  - Implement Focus list query (threads where agent owes reply, ordered by priority/risk)
  - Implement Waiting list query (threads where others owe reply)
  - Implement priority ordering algorithm
  - Enforce Focus list size constraint (3-10 threads)
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 14.1 Write property test for focus list size constraint
  - **Property 16: Focus list size constraint**
  - **Validates: Requirements 6.1**

- [x] 14.2 Write property test for focus list ordering
  - **Property 17: Focus list priority ordering**
  - **Validates: Requirements 6.2**

- [x] 15. Implement backend API endpoints for threads
  - Create GET /api/threads endpoint with filters (focus/waiting/all)
  - Create GET /api/threads/:id endpoint for thread details
  - Create PUT /api/threads/:id endpoint for updating thread metadata
  - Create POST /api/threads/:id/reply endpoint for sending replies
  - Create POST /api/threads/:id/snooze endpoint
  - Implement email sending through connected accounts
  - _Requirements: 15.4, 18.3_

- [x] 15.1 Write property test for draft response delivery
  - **Property 53: Draft response delivery**
  - **Validates: Requirements 15.4**

- [x] 15.2 Write property test for reply account selection
  - **Property 65: Reply account selection**
  - **Validates: Requirements 18.3**

- [x] 16. Implement backend API endpoints for contacts
  - Create GET /api/contacts endpoint with search and filters
  - Create GET /api/contacts/:id endpoint for contact details
  - Create PUT /api/contacts/:id endpoint for updating contacts
  - Create POST /api/contacts/:id/notes endpoint for adding relationship notes
  - _Requirements: 10.1, 10.3, 10.4_

- [x] 16.1 Write property test for contact view completeness
  - **Property 31: Contact view completeness**
  - **Validates: Requirements 10.1**

- [x] 16.2 Write property test for contact search
  - **Property 33: Contact search matching**
  - **Validates: Requirements 10.4**

- [x] 17. Implement backend API endpoints for properties
  - Create GET /api/properties endpoint
  - Create POST /api/properties endpoint for creating properties
  - Create GET /api/properties/:id endpoint for property details
  - Create PUT /api/properties/:id endpoint for updating properties
  - Create POST /api/properties/:id/milestones endpoint for adding milestones
  - _Requirements: 11.1, 11.2_

- [x] 17.1 Write property test for property creation and linking
  - **Property 35: Property creation and linking**
  - **Validates: Requirements 11.1**

- [x] 17.2 Write property test for property view completeness
  - **Property 36: Property view completeness**
  - **Validates: Requirements 11.2**

- [x] 18. Implement backend API endpoints for deals
  - Create GET /api/deals endpoint with filters by stage and risk
  - Create GET /api/deals/:id endpoint for deal details
  - Create PUT /api/deals/:id/stage endpoint for updating deal stage
  - Create POST /api/deals/:id/tasks endpoint for creating tasks
  - Implement automatic deal creation from important threads
  - _Requirements: 7.4, 12.1, 12.2, 12.3, 12.5_

- [x] 18.1 Write property test for deal card completeness
  - **Property 23: Deal card completeness**
  - **Validates: Requirements 7.4**

- [x] 18.2 Write property test for deal initial stage
  - **Property 39: Deal initial stage assignment**
  - **Validates: Requirements 12.1**

- [x] 18.3 Write property test for deal stage progression
  - **Property 40: Deal stage progression**
  - **Validates: Requirements 12.2**

- [x] 18.4 Write property test for deal stage recording
  - **Property 43: Deal stage change recording**
  - **Validates: Requirements 12.5**

- [x] 19. Implement timeline system
  - Create timeline event recording service
  - Implement automatic timeline creation for emails
  - Implement timeline creation for calendar events
  - Implement timeline creation for tasks
  - Implement timeline creation for manual notes
  - Create GET /api/timeline endpoint with entity filters
  - Create POST /api/timeline/notes endpoint for manual notes
  - Ensure chronological ordering
  - _Requirements: 16.1, 16.2, 16.4, 16.5_

- [x] 19.1 Write property test for timeline chronological ordering
  - **Property 54: Timeline chronological ordering**
  - **Validates: Requirements 16.1, 11.5**

- [x] 19.2 Write property test for timeline event recording
  - **Property 55: Timeline event recording completeness**
  - **Validates: Requirements 16.2**

- [x] 19.3 Write property test for email timeline automation
  - **Property 57: Email timeline automation**
  - **Validates: Requirements 16.4**

- [x] 20. Implement task management system
  - Create task extraction service using LLM
  - Implement automatic task creation from emails and voice notes
  - Create GET /api/tasks endpoint with filters
  - Create POST /api/tasks endpoint for manual task creation
  - Create PUT /api/tasks/:id endpoint for updating tasks
  - Create DELETE /api/tasks/:id endpoint
  - Implement task completion with timeline recording
  - Implement overdue task detection
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 20.1 Write property test for task extraction
  - **Property 47: Task extraction from communications**
  - **Validates: Requirements 14.1**

- [x] 20.2 Write property test for task linking
  - **Property 48: Task entity linking**
  - **Validates: Requirements 14.2**

- [x] 20.3 Write property test for task completion
  - **Property 50: Task completion recording**
  - **Validates: Requirements 14.4**

- [x] 21. Implement voice note processing
  - Set up speech-to-text API client (OpenAI Whisper or Google Speech-to-Text)
  - Create POST /api/voice-notes endpoint for uploading audio
  - Implement audio file storage to S3
  - Implement transcription service
  - Implement entity extraction from transcripts using LLM
  - Create timeline entries from voice notes
  - Create tasks from voice notes
  - Store extracted entities
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 16.3_

- [x] 21.1 Write property test for voice note transcription
  - **Property 13: Voice note transcription**
  - **Validates: Requirements 5.3**

- [x] 21.2 Write property test for transcript entity extraction
  - **Property 14: Transcript entity extraction**
  - **Validates: Requirements 5.4**

- [x] 21.3 Write property test for transcript entity creation
  - **Property 15: Transcript entity creation and linking**
  - **Validates: Requirements 5.5**

- [x] 21.4 Write property test for voice note timeline integration
  - **Property 56: Voice note timeline integration**
  - **Validates: Requirements 16.3**

- [x] 22. Implement Ask Zena conversational AI
  - Create natural language query processing service
  - Implement context retrieval (search across threads, events, transcripts, tasks)
  - Create LLM prompt for answering queries with context
  - Implement POST /api/ask endpoint for text queries
  - Implement POST /api/ask/voice endpoint for voice queries
  - Implement GET /api/ask/history endpoint
  - Format responses as bullet points, summaries, or actions
  - Implement draft generation on request
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 22.1 Write property test for query NLU processing
  - **Property 24: Query natural language processing**
  - **Validates: Requirements 8.1**

- [x] 22.2 Write property test for query search comprehensiveness
  - **Property 25: Query search comprehensiveness**
  - **Validates: Requirements 8.2**

- [x] 22.3 Write property test for response structure
  - **Property 26: Response structure**
  - **Validates: Requirements 8.3**

- [x] 23. Implement search functionality
  - Create search service that queries across deals, contacts, properties, threads
  - Implement relevance ranking algorithm
  - Implement recency ranking
  - Create search endpoint with query parameter
  - Generate context snippets for results
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 23.1 Write property test for search result matching
  - **Property 59: Search result matching**
  - **Validates: Requirements 17.1**

- [x] 23.2 Write property test for search ranking
  - **Property 60: Search result ranking**
  - **Validates: Requirements 17.2**

- [x] 23.3 Write property test for address search
  - **Property 61: Address search completeness**
  - **Validates: Requirements 17.3**

- [x] 24. Implement export functionality
  - Create export generation service
  - Implement CSV export for contacts, properties, deals
  - Implement Excel (XLSX) export
  - Implement vCard export for contacts
  - Create POST /api/export/contacts endpoint
  - Create POST /api/export/properties endpoint
  - Create POST /api/export/deals endpoint
  - Create GET /api/export/:id/download endpoint
  - Store export files in S3
  - Implement selective export (only selected records)
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.9_

- [x] 24.1 Write property test for contact export completeness
  - **Property 75: Contact export completeness**
  - **Validates: Requirements 21.2**

- [x] 24.2 Write property test for property export completeness
  - **Property 76: Property export completeness**
  - **Validates: Requirements 21.3**

- [x] 24.3 Write property test for deal export completeness
  - **Property 77: Deal export completeness**
  - **Validates: Requirements 21.4**

- [x] 24.4 Write property test for selective export
  - **Property 79: Selective export**
  - **Validates: Requirements 21.9**

- [x] 25. Implement CRM integration framework
  - Create CRM integration service interface
  - Implement MRI Vault API connector
  - Implement field mapping service (Zena fields to CRM fields)
  - Implement duplicate detection logic
  - Create POST /api/integrations/crm/:provider/connect endpoint
  - Create POST /api/integrations/crm/:provider/sync endpoint
  - Create DELETE /api/integrations/crm/:provider endpoint
  - Store CRM credentials encrypted
  - _Requirements: 21.5, 21.6, 21.8_

- [x] 25.1 Write property test for CRM duplicate prevention
  - **Property 78: CRM duplicate prevention**
  - **Validates: Requirements 21.8**

- [x] 26. Implement vendor update generation
  - Create vendor update compilation service
  - Gather buyer feedback, viewing activity, communication summaries
  - Implement buyer identity anonymization
  - Calculate and include key metrics (viewings, inquiries, offers)
  - Format as professional email draft
  - _Requirements: 25.1, 25.3, 25.4_

- [x] 26.1 Write property test for vendor update compilation
  - **Property 92: Vendor update compilation**
  - **Validates: Requirements 25.1**

- [x] 26.2 Write property test for buyer anonymization
  - **Property 93: Buyer feedback anonymization**
  - **Validates: Requirements 25.3**

- [x] 26.3 Write property test for vendor update metrics
  - **Property 94: Vendor update metrics inclusion**
  - **Validates: Requirements 25.4**

- [x] 27. Implement WebSocket real-time updates
  - Set up WebSocket server (using Socket.io or ws)
  - Implement client connection handling
  - Implement sync status events (sync.started, sync.completed, sync.progress)
  - Implement thread update events (thread.new, thread.updated)
  - Implement deal risk events (deal.risk)
  - Implement task creation events (task.created)
  - Implement Ask Zena streaming responses (ask.response)
  - _Requirements: Real-time updates_

- [x] 28. Implement push notification system
  - Set up push notification service (using web-push or Firebase Cloud Messaging)
  - Create POST /api/notifications/register endpoint
  - Implement notification preferences storage
  - Create GET /api/notifications/preferences endpoint
  - Create PUT /api/notifications/preferences endpoint
  - Implement notification triggers (high-priority threads, risk deals, calendar reminders)
  - Respect user notification preferences
  - _Requirements: 1.5, 20.1, 20.2, 20.3, 20.4, 20.5_

- [x] 28.1 Write property test for notification preference respect
  - **Property 74: Notification preference respect**
  - **Validates: Requirements 20.5**

- [x] 29. Build PWA frontend shell
  - Initialize React or Vue project with TypeScript
  - Set up routing (React Router or Vue Router)
  - Create app shell with navigation bar
  - Implement bottom navigation for mobile
  - Create offline indicator component
  - Create notification badge component
  - Set up responsive layout (mobile-first)
  - Configure PWA manifest.json
  - Set up service worker for offline support
  - _Requirements: 1.1, 1.2, 1.3, 24.1, 24.3_

- [x] 29.1 Write property test for mobile tap target sizing
  - **Property 89: Mobile tap target sizing**
  - **Validates: Requirements 24.1**

- [x] 29.2 Write property test for desktop layout adaptation
  - **Property 90: Desktop layout adaptation**
  - **Validates: Requirements 24.3**

- [x] 30. Implement service worker for offline functionality
  - Create service worker with caching strategies
  - Implement offline data caching in IndexedDB
  - Implement offline action queue
  - Implement sync queue for when connectivity is restored
  - Show offline status indicator
  - Handle offline actions with user notification
  - _Requirements: 1.4, 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 30.1 Write property test for offline data accessibility
  - **Property 1: Offline data accessibility**
  - **Validates: Requirements 1.4, 19.1**

- [x] 30.2 Write property test for offline action queuing
  - **Property 67: Offline action queuing**
  - **Validates: Requirements 19.2**

- [x] 30.3 Write property test for reconnection sync
  - **Property 68: Reconnection synchronization**
  - **Validates: Requirements 19.3**

- [x] 30.4 Write property test for offline status indication
  - **Property 69: Offline status indication**
  - **Validates: Requirements 19.4**

- [x] 31. Build Focus View component
  - Create Focus list component with thread cards
  - Display priority and risk indicators
  - Show thread preview (participants, subject)
  - Show draft response preview
  - Implement quick actions (send draft, edit, snooze)
  - Connect to backend API (GET /api/threads?filter=focus)
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 32. Build Waiting View component
  - Create Waiting list component with thread cards
  - Display risk flags for delayed responses
  - Show thread preview
  - Show follow-up actions
  - Connect to backend API (GET /api/threads?filter=waiting)
  - _Requirements: 6.4, 6.5_

- [x] 33. Build Ask Zena interface
  - Create large text input area
  - Implement voice input button (hold-to-talk)
  - Create conversation history display
  - Implement response rendering (text, bullets, drafts)
  - Show suggested follow-up questions
  - Connect to backend API (POST /api/ask)
  - Implement WebSocket for streaming responses
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 34. Build voice interaction components
  - Create voice recording button with hold-to-talk functionality
  - Implement audio waveform visualization
  - Show transcription display
  - Show processing status
  - Show extracted entities preview
  - Implement text-to-speech playback
  - Show visual feedback for voice states (listening, processing, speaking)
  - Connect to backend APIs (POST /api/voice-notes, POST /api/ask/voice)
  - _Requirements: 5.1, 9.1, 9.3, 9.4, 9.5_

- [x] 34.1 Write property test for voice recording control
  - **Property 12: Voice recording control**
  - **Validates: Requirements 5.1**

- [x] 34.2 Write property test for voice query pipeline
  - **Property 27: Voice query pipeline**
  - **Validates: Requirements 9.1**

- [x] 34.3 Write property test for voice interaction feedback
  - **Property 30: Voice interaction visual feedback**
  - **Validates: Requirements 9.5**

- [x] 35. Build Contact Detail View
  - Create contact information display (name, email, phone, role)
  - Show active deals list
  - Display relationship notes
  - Show communication timeline
  - Implement quick actions (email, call, add note)
  - Connect to backend API (GET /api/contacts/:id)
  - _Requirements: 10.1, 10.3_

- [x] 36. Build Property Detail View
  - Create property address and details display
  - Show associated contacts (buyers, vendors)
  - Display deal stage and status
  - Show campaign milestones
  - Display activity timeline
  - Implement quick actions (add note, update stage)
  - Connect to backend API (GET /api/properties/:id)
  - _Requirements: 11.2, 11.5_

- [x] 37. Build Deal Card component
  - Create deal summary display (property, participants, stage)
  - Show next action and owner
  - Display risk indicators
  - Show latest email preview
  - Show draft response
  - Implement timeline view
  - Connect to backend API (GET /api/deals/:id)
  - _Requirements: 12.3_

- [x] 38. Build Settings page
  - Create connected accounts management UI
  - Implement email account connection flow (OAuth)
  - Implement calendar account connection flow (OAuth)
  - Create notification preferences UI
  - Create export/sync configuration UI
  - Create voice settings UI (STT/TTS preferences)
  - Connect to backend APIs
  - _Requirements: 2.1, 4.1, 20.5_

- [x] 39. Implement authentication UI
  - Create login page
  - Create registration page
  - Implement JWT token storage in localStorage
  - Implement automatic token refresh
  - Implement logout functionality
  - Add authentication guards to routes
  - _Requirements: 22.1, 22.2_

- [x] 40. Implement search UI
  - Create search bar component
  - Display search results with context snippets
  - Implement result filtering (deals, contacts, properties, threads)
  - Connect to backend search API
  - _Requirements: 17.1, 17.2, 17.5_

- [x] 41. Implement export UI
  - Create export dialog with format selection (CSV, Excel, vCard)
  - Implement record selection for selective export
  - Show export progress
  - Provide download link when complete
  - Connect to backend export APIs
  - _Requirements: 21.1, 21.9_

- [x] 42. Implement CRM integration UI
  - Create CRM connection dialog
  - Show available CRM providers
  - Implement CRM authentication flow
  - Show sync status and last sync time
  - Provide manual sync trigger
  - Connect to backend CRM APIs
  - _Requirements: 21.5, 21.6_

- [x] 43. Implement mobile keyboard type handling
  - Set appropriate input types for email fields (type="email")
  - Set appropriate input types for phone fields (type="tel")
  - Set appropriate input types for text fields (type="text")
  - _Requirements: 24.4_

- [x] 43.1 Write property test for mobile keyboard triggering
  - **Property 91: Mobile keyboard type triggering**
  - **Validates: Requirements 24.4**

- [x] 44. Implement performance optimizations
  - Add lazy loading for large thread lists
  - Implement pagination for timeline events
  - Add code splitting for route-based chunks
  - Optimize bundle size
  - Implement image lazy loading
  - Add loading skeletons for better perceived performance
  - _Requirements: 23.1, 23.4, 23.5_

- [x] 44.1 Write property test for initial load performance
  - **Property 84: Initial load performance**
  - **Validates: Requirements 23.1**

- [x] 44.2 Write property test for navigation performance
  - **Property 87: Navigation performance**
  - **Validates: Requirements 23.4**

- [x] 44.3 Write property test for large thread pagination
  - **Property 88: Large thread pagination**
  - **Validates: Requirements 23.5**

- [x] 45. Implement data deletion and account disconnection
  - Implement account disconnection logic (preserve manual data)
  - Implement data deletion endpoints
  - Add confirmation dialogs in UI
  - _Requirements: 18.5, 22.4_

- [x] 45.1 Write property test for account disconnection
  - **Property 66: Account disconnection data handling**
  - **Validates: Requirements 18.5**

- [x] 45.2 Write property test for data deletion
  - **Property 83: Data deletion completeness**
  - **Validates: Requirements 22.4**

- [x] 46. Set up monitoring and logging
  - Implement error logging (Sentry or similar)
  - Set up performance monitoring
  - Create health check endpoints
  - Set up alerts for critical errors
  - Implement request logging with context
  - _Requirements: Error handling strategy_

- [x] 47. Set up deployment infrastructure
  - Configure production database (PostgreSQL)
  - Set up Redis for job queues
  - Configure S3 or equivalent for file storage
  - Set up environment variables for production
  - Configure HTTPS/TLS certificates
  - Set up CI/CD pipeline
  - Deploy backend services
  - Deploy PWA frontend
  - Configure CDN for static assets
  - _Requirements: 22.2_

- [x] 48. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
