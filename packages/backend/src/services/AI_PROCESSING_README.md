# AI Processing Service

## Overview

The AI Processing Service handles automatic classification and categorization of email threads using Large Language Models (LLMs). It integrates with OpenAI's GPT models to intelligently classify threads by type and determine who needs to take action next.

## Features

### Thread Classification

Classifies email threads into one of five categories:
- **Buyer**: Communications with potential property buyers
- **Vendor**: Communications with property sellers/vendors
- **Market**: Communications with other agents or market contacts
- **Lawyer/Broker**: Communications with legal professionals or brokers
- **Noise**: Marketing emails, spam, or irrelevant communications

### Thread Categorization

Determines the action category:
- **Focus**: Agent needs to reply (agent owes action)
- **Waiting**: Waiting for others to reply (others owe action)

### Next Action Owner

Identifies who should take the next action:
- **Agent**: The real estate agent should respond
- **Other**: Waiting for someone else to respond

## Configuration

Set the following environment variables in your `.env` file:

```bash
# Required for AI classification
OPENAI_API_KEY=your-openai-api-key

# Optional - defaults shown
OPENAI_MODEL=gpt-4
OPENAI_API_ENDPOINT=https://api.openai.com/v1/chat/completions
```

## Usage

### Automatic Classification

Threads are automatically classified when synced from email providers. The sync engine calls the AI processing service after storing new threads.

### Manual Classification

You can manually trigger classification through the API:

```bash
# Classify a specific thread
POST /api/threads/:id/classify

# Classify multiple threads in batch
POST /api/threads/classify-batch
{
  "threadIds": ["thread-id-1", "thread-id-2"]
}

# Classify all unclassified threads for current user
POST /api/threads/classify-unclassified
```

### Programmatic Usage

```typescript
import { aiProcessingService } from './services/ai-processing.service.js';

// Classify a single thread
await aiProcessingService.processThread(threadId);

// Batch process multiple threads
await aiProcessingService.batchProcessThreads([threadId1, threadId2]);

// Process all unclassified threads for a user
await aiProcessingService.processUnclassifiedThreads(userId);
```

## Fallback Classification

If the OpenAI API key is not configured or the API call fails, the service automatically falls back to rule-based classification using keyword matching:

- Searches for keywords like "buyer", "purchase", "viewing" → Buyer
- Searches for keywords like "vendor", "seller", "listing" → Vendor
- Searches for keywords like "lawyer", "solicitor", "legal" → Lawyer/Broker
- Searches for keywords like "unsubscribe", "newsletter" → Noise
- Searches for keywords like "agent", "market" → Market

The fallback ensures the system continues to function even without AI capabilities.

## Error Handling

The service includes comprehensive error handling:

1. **API Failures**: Falls back to rule-based classification
2. **Invalid Responses**: Validates and sanitizes LLM outputs
3. **Network Errors**: Logs errors and continues processing other threads
4. **Missing Data**: Handles threads with minimal information gracefully

## Classification Prompt

The service uses a carefully crafted prompt that:
- Provides context about the real estate domain
- Defines clear classification categories
- Requests structured JSON output
- Asks for confidence scores and reasoning

## Integration with Sync Engine

The AI processing service is integrated into the email sync workflow:

1. Sync engine fetches new threads from email providers
2. Threads are stored in the database with default classification
3. AI processing service classifies each thread
4. Thread records are updated with classification results

This ensures all threads are automatically classified without manual intervention.

## Performance Considerations

- **Batch Processing**: Processes multiple threads efficiently
- **Async Operations**: Non-blocking classification
- **Error Isolation**: Failures in one thread don't affect others
- **Rate Limiting**: Respects OpenAI API rate limits
- **Caching**: Thread classifications are stored and not re-computed

## Testing

The service includes comprehensive unit tests covering:
- Classification of all thread types
- Fallback classification logic
- Validation of outputs
- Edge cases and error handling

Run tests with:
```bash
npm test ai-processing.service.test.ts
```

## Future Enhancements

Potential improvements:
- Support for additional LLM providers (Anthropic Claude, etc.)
- Fine-tuned models for real estate domain
- Confidence threshold-based routing
- Learning from user corrections
- Multi-language support
- Sentiment analysis
- Priority scoring
