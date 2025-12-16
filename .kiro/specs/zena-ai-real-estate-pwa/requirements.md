# Requirements Document

## Introduction

Zena is a progressive web application (PWA) designed for residential real estate agents that functions as an AI-powered chief of staff. The system connects to agents' email accounts and calendars, automatically organizes communications into deals, people, and properties, and provides intelligent assistance through voice and text interfaces. Zena acts as a lightweight CRM that sits on top of the agent's inbox, eliminating the need for manual data entry while surfacing critical information about who needs replies, what deals are at risk, and what actions to take next.

## Glossary

- **Zena**: The AI-powered real estate assistant progressive web application
- **Agent**: A residential real estate professional who uses Zena
- **PWA (Progressive Web App)**: A web application that can be installed on devices and works like a native app
- **Thread**: An email conversation chain between multiple parties
- **Deal**: A real estate transaction opportunity tracked in Zena, typically derived from email threads
- **Contact**: A person (buyer, vendor, market contact, or other party) extracted from communications
- **Property**: A real estate listing or address being tracked in Zena
- **Timeline Event**: A recorded activity (email, call, meeting, task, or note) associated with a deal, contact, or property
- **Focus List**: Threads where the Agent owes someone a reply
- **Waiting List**: Threads where someone else owes the Agent a reply
- **Voice Note**: An audio recording captured or uploaded by the Agent for transcription and processing
- **Ask Zena**: The conversational interface where Agents can query their deal universe
- **Risk Signal**: An indicator that a deal may be going cold or requires urgent attention
- **Stage**: The current phase of a deal (lead, qualified, viewing, offer, conditional, pre-settlement, sold, nurture)
- **OAuth**: A secure authentication protocol for connecting to email and calendar providers
- **STT (Speech-to-Text)**: Technology that converts spoken audio into written text
- **TTS (Text-to-Speech)**: Technology that converts written text into spoken audio
- **MRI Vault**: A third-party CRM system commonly used in real estate

## Requirements

### Requirement 1: Progressive Web App Delivery

**User Story:** As an Agent, I want to access Zena through any modern browser and install it on my device like a native app, so that I can work without App Store friction and have quick access from my home screen.

#### Acceptance Criteria

1. WHEN an Agent accesses Zena through a modern browser THEN the System SHALL render a fully functional web application interface
2. WHEN an Agent chooses to add Zena to their home screen on iOS or Android THEN the System SHALL provide installation prompts and install as a PWA
3. WHEN Zena is launched from the home screen THEN the System SHALL open in full-screen mode without browser chrome
4. WHEN the Agent has poor or no network connectivity THEN the System SHALL provide access to recently synced data with offline resilience
5. WHERE push notifications are supported by the device THEN the System SHALL enable notification delivery for key events

### Requirement 2: Email Provider Integration

**User Story:** As an Agent, I want to connect my email accounts from multiple providers, so that Zena can access and organize all my client communications in one place.

#### Acceptance Criteria

1. WHEN an Agent initiates email connection THEN the System SHALL support OAuth authentication for Gmail, Outlook, Hotmail, iCloud Mail, and Yahoo Mail
2. WHEN an Agent connects an email account THEN the System SHALL securely store authentication credentials and sync recent threads from the last 90 to 180 days
3. WHEN an Agent connects multiple email accounts THEN the System SHALL treat them as one unified inbox
4. WHEN the System syncs email threads THEN the System SHALL periodically fetch new messages and updates without manual intervention
5. WHERE a provider lacks rich API support THEN the System SHALL fall back to IMAP connections for email access

### Requirement 3: Email Thread Classification

**User Story:** As an Agent, I want Zena to automatically classify my email threads by type and participant role, so that I can focus on important communications without manual sorting.

#### Acceptance Criteria

1. WHEN the System processes an email thread THEN the System SHALL classify it as Buyer, Vendor, Market contact, Lawyer/Broker/Other, or Noise/Marketing
2. WHEN the System classifies threads THEN the System SHALL split them into Focus (Agent owes reply) or Waiting (others owe reply) categories
3. WHEN the System extracts thread metadata THEN the System SHALL identify parties involved, associated property, current stage, risk signals, next actions, and relevant dates
4. WHEN multiple threads reference the same property or contact THEN the System SHALL link them together in the data model
5. WHEN the System encounters ambiguous classification signals THEN the System SHALL apply machine learning or rule-based heuristics to determine the most likely category

### Requirement 4: Calendar Integration

**User Story:** As an Agent, I want Zena to connect to my calendar and link events to deals and properties, so that I can see all activity related to my transactions in context.

#### Acceptance Criteria

1. WHEN an Agent connects their calendar THEN the System SHALL support Google Calendar with OAuth authentication
2. WHEN the System syncs calendar events THEN the System SHALL detect viewings, appraisals, vendor meetings, auctions, and settlements
3. WHEN the System processes a calendar event THEN the System SHALL link it to the relevant property, contact, or deal based on event details
4. WHEN an Agent queries about a property or contact THEN the System SHALL include associated calendar events in the response
5. WHEN the System identifies a calendar event related to real estate activity THEN the System SHALL extract and store the event type, participants, property reference, and timing

### Requirement 5: Voice Note Capture and Processing

**User Story:** As an Agent, I want to record voice notes directly in Zena or upload audio files, so that I can capture important information while on the go without typing.

#### Acceptance Criteria

1. WHEN an Agent presses and holds the voice input button THEN the System SHALL record audio until the button is released
2. WHEN an Agent uploads an audio file THEN the System SHALL accept common audio formats (MP3, M4A, WAV, OGG)
3. WHEN the System receives a voice note or audio upload THEN the System SHALL transcribe it using speech-to-text technology
4. WHEN the System transcribes audio THEN the System SHALL extract key facts including who, what property, and what was discussed
5. WHEN the System processes transcribed content THEN the System SHALL create timeline entries, tasks, and relationship notes linked to relevant deals, properties, or contacts

### Requirement 6: Daily Focus and Triage

**User Story:** As an Agent, I want Zena to show me a prioritized list of threads requiring my reply, so that I can efficiently manage my inbox without feeling overwhelmed.

#### Acceptance Criteria

1. WHEN an Agent opens Zena THEN the System SHALL display a Focus list containing 3 to 10 threads where the Agent must reply
2. WHEN the System generates the Focus list THEN the System SHALL order threads by priority and risk level
3. WHEN the System displays a Focus thread THEN the System SHALL provide a draft response that the Agent can send or edit
4. WHEN the System displays the Waiting list THEN the System SHALL show deals where others owe the next move with risk flags for delayed responses
5. WHEN a thread has received no response for 5 or more days THEN the System SHALL flag it as at risk

### Requirement 7: Lightweight CRM Without Manual Data Entry

**User Story:** As an Agent, I want Zena to automatically build a CRM from my communications, so that I can track contacts, properties, and deals without manual data entry.

#### Acceptance Criteria

1. WHEN the System processes email threads THEN the System SHALL automatically extract and deduplicate contacts with names and email addresses
2. WHEN the System creates a contact THEN the System SHALL classify them as Buyer, Vendor, Market contact, or Other
3. WHEN an Agent manually adds a property address THEN the System SHALL attach relevant email threads that mention that address
4. WHEN the System identifies an important email thread THEN the System SHALL create a deal card with stage, next move owner, risk flags, and next actions
5. WHEN the System updates deal information THEN the System SHALL infer changes from communication patterns without requiring Agent input

### Requirement 8: Conversational AI Interface (Ask Zena)

**User Story:** As an Agent, I want to ask Zena natural language questions about my deals, contacts, and properties, so that I can quickly get answers without searching through emails.

#### Acceptance Criteria

1. WHEN an Agent types or speaks a question in Ask Zena THEN the System SHALL process the query using natural language understanding
2. WHEN the System receives a query THEN the System SHALL search across email threads, calendar events, voice note transcripts, timeline entries, and tasks
3. WHEN the System generates a response THEN the System SHALL provide relevant information in bullet points, summaries, or suggested actions
4. WHEN an Agent asks for a draft communication THEN the System SHALL generate contextually appropriate email or message content
5. WHEN the System cannot find relevant information THEN the System SHALL inform the Agent clearly and suggest alternative queries

### Requirement 9: Voice-Native Interaction

**User Story:** As an Agent, I want to interact with Zena using voice commands and hear responses read aloud, so that I can use the app hands-free while driving or between appointments.

#### Acceptance Criteria

1. WHEN an Agent presses and holds the talk button THEN the System SHALL capture audio, transcribe it, and process the query
2. WHEN the System transcribes voice input THEN the System SHALL achieve accuracy sufficient for understanding real estate terminology and names
3. WHEN an Agent requests text-to-speech output THEN the System SHALL read responses aloud using natural-sounding voice synthesis
4. WHEN an Agent asks Zena to read an email or summary THEN the System SHALL retrieve the content and deliver it via text-to-speech
5. WHEN voice interaction is active THEN the System SHALL provide visual feedback indicating listening, processing, and speaking states

### Requirement 10: Contact Management

**User Story:** As an Agent, I want to view consolidated information about each contact including their deals, role, and relationship notes, so that I can understand the full context of my interactions.

#### Acceptance Criteria

1. WHEN an Agent views a contact THEN the System SHALL display all active deals, roles, and key relationship notes
2. WHEN the System deduplicates contacts THEN the System SHALL merge entries with matching email addresses or names
3. WHEN the System stores relationship notes THEN the System SHALL preserve context such as preferences, concerns, and communication style
4. WHEN an Agent searches for a contact THEN the System SHALL return results matching name, email, or associated property
5. WHEN a contact appears in multiple threads THEN the System SHALL link all related communications to their profile

### Requirement 11: Property Tracking

**User Story:** As an Agent, I want to track properties with all associated communications, buyers, and campaign milestones, so that I can manage listings effectively.

#### Acceptance Criteria

1. WHEN an Agent adds a property address THEN the System SHALL create a property record and begin linking relevant threads
2. WHEN the System displays a property THEN the System SHALL show associated buyers, vendor communications, and campaign milestones
3. WHEN an email thread mentions a tracked property address THEN the System SHALL automatically link the thread to that property
4. WHEN the System identifies property-related calendar events THEN the System SHALL associate them with the property record
5. WHEN an Agent views a property THEN the System SHALL display a timeline of all related activity in chronological order

### Requirement 12: Deal Stage Tracking

**User Story:** As an Agent, I want Zena to track each deal through stages from lead to sold, so that I can see where each opportunity stands in the sales process.

#### Acceptance Criteria

1. WHEN the System creates a deal THEN the System SHALL assign an initial stage (lead, qualified, viewing, offer, conditional, pre-settlement, sold, or nurture)
2. WHEN the System detects stage progression signals in communications THEN the System SHALL update the deal stage automatically
3. WHEN an Agent views a deal THEN the System SHALL display the current stage, who has the next move, and risk flags
4. WHEN a deal remains in the same stage for an extended period THEN the System SHALL flag it as potentially at risk
5. WHEN the System updates a deal stage THEN the System SHALL record the change in the timeline with timestamp and reason

### Requirement 13: Risk Detection and Alerts

**User Story:** As an Agent, I want Zena to identify deals that are at risk of going cold, so that I can take action before losing opportunities.

#### Acceptance Criteria

1. WHEN the System analyzes a deal THEN the System SHALL evaluate risk based on response delays, communication frequency, and stage duration
2. WHEN a deal meets risk criteria THEN the System SHALL flag it with a risk indicator and explanation
3. WHEN the System detects a vendor or buyer expressing concerns THEN the System SHALL create a risk signal linked to that deal
4. WHEN an Agent views the Waiting list THEN the System SHALL distinguish between safe deals and at-risk deals
5. WHEN risk signals are present THEN the System SHALL suggest specific next actions to re-engage the party

### Requirement 14: Task Generation and Management

**User Story:** As an Agent, I want Zena to automatically create tasks from communications and voice notes, so that I don't forget important follow-ups.

#### Acceptance Criteria

1. WHEN the System processes an email or voice note containing action items THEN the System SHALL create tasks with labels and optional due dates
2. WHEN the System creates a task THEN the System SHALL link it to the relevant deal, property, or contact
3. WHEN an Agent views a deal or property THEN the System SHALL display associated open tasks
4. WHEN an Agent completes a task THEN the System SHALL update its status and record completion in the timeline
5. WHEN a task is overdue THEN the System SHALL highlight it in the Agent's daily view

### Requirement 15: Draft Response Generation

**User Story:** As an Agent, I want Zena to generate draft email responses for threads in my Focus list, so that I can reply quickly with contextually appropriate messages.

#### Acceptance Criteria

1. WHEN the System displays a Focus thread THEN the System SHALL generate a draft response based on thread context and Agent communication style
2. WHEN an Agent edits a draft response THEN the System SHALL allow full text editing before sending
3. WHEN the System generates a draft THEN the System SHALL include relevant details such as property information, next steps, or answers to questions
4. WHEN an Agent sends a draft response THEN the System SHALL deliver it through the connected email account
5. WHEN the System learns from Agent edits THEN the System SHALL improve future draft quality based on Agent preferences

### Requirement 16: Timeline and Activity History

**User Story:** As an Agent, I want to see a chronological timeline of all activity related to a deal, contact, or property, so that I can understand the full history at a glance.

#### Acceptance Criteria

1. WHEN an Agent views a deal, contact, or property THEN the System SHALL display a timeline of all related events in chronological order
2. WHEN the System records a timeline event THEN the System SHALL capture the event type (email, call, meeting, task, note), timestamp, and summary
3. WHEN a voice note is processed THEN the System SHALL add its summary to the timeline
4. WHEN an email is sent or received THEN the System SHALL add it to relevant timelines automatically
5. WHEN an Agent adds a manual note THEN the System SHALL insert it into the timeline with timestamp

### Requirement 17: Search and Query Capabilities

**User Story:** As an Agent, I want to search across all my deals, contacts, and properties, so that I can quickly find specific information.

#### Acceptance Criteria

1. WHEN an Agent enters a search query THEN the System SHALL return results matching deals, contacts, properties, or communications
2. WHEN the System performs a search THEN the System SHALL rank results by relevance and recency
3. WHEN an Agent searches for an address THEN the System SHALL return the property and all associated threads
4. WHEN an Agent searches for a person's name THEN the System SHALL return the contact and all related deals
5. WHEN search results are displayed THEN the System SHALL provide context snippets showing why each result matched

### Requirement 18: Multi-Account Email Handling

**User Story:** As an Agent, I want to connect multiple email accounts and have Zena treat them as one unified inbox, so that I can manage all communications regardless of which account they arrive in.

#### Acceptance Criteria

1. WHEN an Agent connects a second email account THEN the System SHALL merge threads and contacts across accounts
2. WHEN the System displays threads THEN the System SHALL indicate which email account received each message
3. WHEN an Agent sends a reply THEN the System SHALL use the appropriate email account based on the original recipient address
4. WHEN the System deduplicates contacts THEN the System SHALL merge contacts appearing in multiple connected accounts
5. WHEN an Agent disconnects an email account THEN the System SHALL remove access to that account's data while preserving manually entered information

### Requirement 19: Offline and Poor Network Resilience

**User Story:** As an Agent, I want Zena to work with recently synced data when I have poor or no network connectivity, so that I can access critical information even in areas with weak signal.

#### Acceptance Criteria

1. WHEN the Agent has no network connectivity THEN the System SHALL provide read access to recently synced threads, contacts, properties, and deals
2. WHEN the Agent performs actions offline THEN the System SHALL queue them for synchronization when connectivity is restored
3. WHEN network connectivity is restored THEN the System SHALL sync queued actions and fetch new data automatically
4. WHEN the System operates offline THEN the System SHALL clearly indicate offline status and data freshness
5. WHEN the Agent attempts an action requiring network connectivity while offline THEN the System SHALL inform them and offer to queue the action

### Requirement 20: Push Notifications

**User Story:** As an Agent, I want to receive push notifications for key events, so that I stay informed about important developments without constantly checking the app.

#### Acceptance Criteria

1. WHERE the device supports push notifications THEN the System SHALL request notification permissions from the Agent
2. WHEN a high-priority thread requires the Agent's reply THEN the System SHALL send a push notification
3. WHEN a deal is flagged as at risk THEN the System SHALL send a push notification with risk details
4. WHEN a calendar event is approaching THEN the System SHALL send a reminder notification
5. WHEN an Agent disables notifications for specific categories THEN the System SHALL respect those preferences

### Requirement 21: CRM Data Export and Integration

**User Story:** As an Agent, I want to export or push Zena's cleaned data to my existing CRM system, so that I can maintain my back-office systems without manual data entry while using Zena as my daily cockpit.

#### Acceptance Criteria

1. WHEN an Agent requests a data export THEN the System SHALL generate files in standard formats including CSV, Excel (XLSX), and vCard for contacts
2. WHEN the System exports contacts THEN the System SHALL include name, email addresses, phone numbers, role classification, associated properties, and relationship notes
3. WHEN the System exports properties THEN the System SHALL include address, vendor information, associated contacts, stage, and campaign milestones
4. WHEN the System exports deals THEN the System SHALL include deal stage, participants, property reference, timeline summary, next actions, and risk flags
5. WHEN an Agent connects a supported CRM via API THEN the System SHALL authenticate using OAuth or API keys and establish a sync connection
6. WHERE a CRM provides API integration THEN the System SHALL support direct data push for contacts, properties, and activity notes
7. WHEN the System pushes data to a connected CRM THEN the System SHALL map Zena's data fields to the CRM's schema appropriately
8. WHEN the System detects an existing record in the connected CRM THEN the System SHALL update it rather than create a duplicate
9. WHEN an Agent selects specific records for export THEN the System SHALL allow selective export of contacts, properties, or deals
10. WHEN the System supports CRM integrations THEN the System SHALL prioritize real estate-focused CRMs including MRI Vault, Salesforce Real Estate, Top Producer, kvCORE, and Follow Up Boss

### Requirement 22: Data Privacy and Security

**User Story:** As an Agent, I want my client communications and data to be securely stored and transmitted, so that I can trust Zena with sensitive real estate information.

#### Acceptance Criteria

1. WHEN the System stores authentication credentials THEN the System SHALL encrypt them using industry-standard encryption
2. WHEN the System transmits data between client and server THEN the System SHALL use HTTPS/TLS encryption
3. WHEN the System accesses email or calendar data THEN the System SHALL use OAuth tokens with appropriate scopes and expiration
4. WHEN an Agent disconnects an account or deletes data THEN the System SHALL permanently remove the data from storage
5. WHEN the System processes personal information THEN the System SHALL comply with applicable data protection regulations (GDPR, CCPA, etc.)

### Requirement 23: Performance and Responsiveness

**User Story:** As an Agent, I want Zena to load quickly and respond to my actions without delay, so that I can work efficiently on both desktop and mobile.

#### Acceptance Criteria

1. WHEN an Agent opens Zena THEN the System SHALL display the main interface within 2 seconds on a standard mobile connection
2. WHEN an Agent submits a query to Ask Zena THEN the System SHALL return a response within 5 seconds under normal conditions
3. WHEN the System syncs email in the background THEN the System SHALL not block or slow down the user interface
4. WHEN an Agent navigates between views THEN the System SHALL render the new view within 500 milliseconds
5. WHEN the System processes large email threads THEN the System SHALL paginate or lazy-load content to maintain responsiveness

### Requirement 24: Mobile-First User Interface

**User Story:** As an Agent, I want Zena's interface to be optimized for mobile phones, so that I can efficiently use it on the go as my primary device.

#### Acceptance Criteria

1. WHEN an Agent accesses Zena on a mobile device THEN the System SHALL render a touch-optimized interface with appropriately sized tap targets
2. WHEN the System displays lists or cards THEN the System SHALL use mobile-friendly layouts with clear visual hierarchy
3. WHEN an Agent uses Zena on desktop THEN the System SHALL adapt the layout to take advantage of larger screen space
4. WHEN the System displays text input fields THEN the System SHALL trigger appropriate mobile keyboards (email, phone, text)
5. WHEN an Agent performs gestures (swipe, pinch, long-press) THEN the System SHALL respond with intuitive actions where applicable

### Requirement 25: Vendor Update Generation

**User Story:** As an Agent, I want Zena to generate vendor update emails summarizing buyer feedback and campaign activity, so that I can keep vendors informed without manual report writing.

#### Acceptance Criteria

1. WHEN an Agent requests a vendor update for a property THEN the System SHALL compile buyer feedback, viewing activity, and communication summaries
2. WHEN the System generates a vendor update THEN the System SHALL format it as a professional email draft
3. WHEN the System includes buyer feedback THEN the System SHALL anonymize buyer identities unless explicitly identified
4. WHEN the System creates the update THEN the System SHALL highlight key metrics such as number of viewings, inquiries, and offers
5. WHEN an Agent edits the vendor update THEN the System SHALL allow full customization before sending
