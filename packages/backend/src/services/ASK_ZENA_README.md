# Ask Zena Service

## Overview

The Ask Zena service provides a conversational AI interface that allows real estate agents to query their data using natural language. The service processes queries, searches across all data sources, and generates contextually appropriate responses.

## Features

### Natural Language Query Processing
- Processes any natural language question typed or spoken by the agent
- Extracts search terms and intent from queries
- Handles various query patterns (questions, commands, keywords)

### Comprehensive Context Retrieval
The service searches across all data sources:
- **Email Threads**: Subject, summary, participants
- **Contacts**: Names, emails, roles
- **Properties**: Addresses, associated contacts
- **Deals**: Stage, summary, next actions, risk level
- **Tasks**: Labels, status, due dates
- **Timeline Events**: Summaries, content, timestamps
- **Voice Notes**: Transcripts, extracted entities

### LLM-Powered Response Generation
- Uses OpenAI GPT-4 (configurable) for intelligent responses
- Provides fallback responses when LLM is unavailable
- Formats responses with bullet points, summaries, and suggested actions
- Maintains conversation history for context-aware responses

### Draft Communication Generation
- Generates draft emails and messages based on context
- Maintains professional yet friendly tone
- Includes relevant details and next steps

## API Endpoints

### POST /api/ask
Submit a natural language query.

**Request Body:**
```json
{
  "query": "What deals do I have?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous question",
      "timestamp": "2024-01-01T00:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Previous answer",
      "timestamp": "2024-01-01T00:00:01Z"
    }
  ]
}
```

**Response:**
```json
{
  "answer": "You have 3 active deals:\n\n• Deal 1: Viewing stage at 123 Main St\n• Deal 2: Offer stage at 456 Oak Ave\n• Deal 3: Conditional stage at 789 Pine Rd",
  "sources": [
    {
      "type": "deal",
      "id": "deal-id-1",
      "snippet": "Viewing stage: Property viewing scheduled...",
      "relevance": 0.9
    }
  ],
  "suggestedActions": [
    "Follow up on conditional deal at 789 Pine Rd",
    "Prepare for viewing at 123 Main St"
  ]
}
```

### POST /api/ask/voice
Submit a voice query (with transcribed text).

**Request Body:**
```json
{
  "transcript": "What deals need my attention?",
  "conversationHistory": []
}
```

**Response:** Same format as POST /api/ask

### GET /api/ask/history
Get conversation history.

**Response:**
```json
{
  "history": [
    {
      "role": "user",
      "content": "What deals do I have?",
      "timestamp": "2024-01-01T00:00:00Z"
    },
    {
      "role": "assistant",
      "content": "You have 3 active deals...",
      "timestamp": "2024-01-01T00:00:01Z"
    }
  ]
}
```

### POST /api/ask/draft
Generate a draft communication.

**Request Body:**
```json
{
  "request": "Draft an email to follow up with the buyer about the viewing"
}
```

**Response:**
```json
{
  "draft": "Hi [Buyer Name],\n\nI hope this email finds you well. I wanted to follow up regarding the property viewing we discussed...\n\nBest regards"
}
```

## Configuration

The service uses environment variables for configuration:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your-api-key-here
OPENAI_API_ENDPOINT=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4

# If OPENAI_API_KEY is not set, the service will use fallback responses
```

## Implementation Details

### Search Term Extraction
The service extracts meaningful search terms by:
1. Converting query to lowercase
2. Removing common stop words (what, when, where, etc.)
3. Filtering words shorter than 3 characters
4. Deduplicating terms

### Context Building
For each query, the service:
1. Searches all data sources using extracted terms
2. Retrieves up to 10 results per source type
3. Orders results by relevance (most recent first)
4. Builds a comprehensive context summary

### Response Generation
The LLM receives:
- The agent's question
- Relevant context from all data sources
- Conversation history (if provided)
- Instructions for formatting and tone

The response includes:
- A detailed answer based on context
- Source references with snippets
- Optional suggested actions

### Fallback Behavior
When the LLM is unavailable, the service:
- Analyzes query keywords to determine intent
- Provides structured responses based on available data
- Returns relevant sources and basic summaries

## Property-Based Tests

The service includes comprehensive property-based tests that verify:

### Property 24: Query NLU Processing
*For any* question typed or spoken in Ask Zena, the system should process it using natural language understanding without errors.

### Property 25: Query Search Comprehensiveness
*For any* Ask Zena query, the system should search across all data sources: email threads, calendar events, voice note transcripts, timeline entries, and tasks.

### Property 26: Response Structure
*For any* Ask Zena response, it should be formatted as bullet points, summaries, or suggested actions with proper structure.

## Usage Examples

### Query About Deals
```typescript
const response = await askZenaService.processQuery({
  userId: 'user-id',
  query: 'What deals are at risk?',
  conversationHistory: []
});
```

### Query About Contacts
```typescript
const response = await askZenaService.processQuery({
  userId: 'user-id',
  query: 'Who is John Smith?',
  conversationHistory: []
});
```

### Query About Properties
```typescript
const response = await askZenaService.processQuery({
  userId: 'user-id',
  query: 'Tell me about 123 Main Street',
  conversationHistory: []
});
```

### Generate Draft
```typescript
const draft = await askZenaService.generateDraft(
  'user-id',
  'Draft a follow-up email for the buyer interested in the Oak Avenue property'
);
```

## Error Handling

The service handles errors gracefully:
- LLM API failures fall back to rule-based responses
- Invalid queries return helpful error messages
- Database errors are logged and return user-friendly messages
- Empty or malformed queries are processed without throwing errors

## Performance Considerations

- Search queries are limited to 10 results per source type
- LLM requests have a 1000 token limit for responses
- Context summaries are truncated to prevent token limit issues
- Database queries use indexes for efficient searching

## Future Enhancements

Potential improvements:
- Conversation history storage in database
- Streaming responses for real-time feedback
- Multi-turn conversation context management
- Query intent classification for better routing
- Semantic search using embeddings
- Voice-to-voice responses with TTS integration
- Query suggestions based on user patterns
