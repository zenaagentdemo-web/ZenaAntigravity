# Voice Note Processing Service

## Overview

The Voice Note Processing Service handles the complete lifecycle of voice notes in the Zena AI Real Estate PWA. It provides functionality for:

1. Creating voice note records
2. Transcribing audio using speech-to-text (OpenAI Whisper API)
3. Extracting entities from transcripts using AI
4. Creating tasks and timeline events from extracted information
5. Retrieving voice note data

## Architecture

### Service Flow

```
1. Upload Audio → 2. Create Record → 3. Transcribe → 4. Extract Entities → 5. Create Tasks/Timeline
```

### Components

- **VoiceNoteService**: Core service handling voice note processing
- **VoiceNoteController**: HTTP request handlers for voice note endpoints
- **VoiceNoteRoutes**: API route definitions

## API Endpoints

### POST /api/voice-notes
Upload a new voice note for processing.

**Request Body:**
```json
{
  "audioUrl": "https://storage.example.com/audio/file.mp3"
}
```

**Response:**
```json
{
  "id": "voice-note-uuid",
  "message": "Voice note uploaded and processing started"
}
```

### GET /api/voice-notes
Get all voice notes for the authenticated user.

**Query Parameters:**
- `status` (optional): Filter by processing status (pending, processing, completed, failed)
- `limit` (optional): Number of results to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
[
  {
    "id": "voice-note-uuid",
    "userId": "user-uuid",
    "audioUrl": "https://storage.example.com/audio/file.mp3",
    "transcript": "Met with John Smith about 123 Main St...",
    "extractedEntities": [...],
    "processingStatus": "completed",
    "createdAt": "2024-01-01T00:00:00Z",
    "processedAt": "2024-01-01T00:01:00Z"
  }
]
```

### GET /api/voice-notes/:id
Get details of a specific voice note.

**Response:**
```json
{
  "id": "voice-note-uuid",
  "userId": "user-uuid",
  "audioUrl": "https://storage.example.com/audio/file.mp3",
  "transcript": "Met with John Smith about 123 Main St...",
  "extractedEntities": [
    {
      "type": "contact",
      "data": { "name": "John Smith", "role": "buyer" },
      "confidence": 0.9
    }
  ],
  "processingStatus": "completed",
  "createdAt": "2024-01-01T00:00:00Z",
  "processedAt": "2024-01-01T00:01:00Z"
}
```

### GET /api/voice-notes/:id/audio
Get the audio file URL for a voice note.

**Response:**
```json
{
  "audioUrl": "https://storage.example.com/audio/file.mp3"
}
```

## Processing Pipeline

### 1. Voice Note Creation
When a voice note is uploaded, a record is created with status `pending`.

### 2. Transcription
The audio file is sent to OpenAI Whisper API for transcription.

**Note:** The current implementation includes a placeholder for Whisper API integration. To complete this:
1. Add OpenAI API key to environment variables
2. Implement audio file fetching from storage (S3/similar)
3. Call Whisper API with audio data
4. Handle API errors and retries

### 3. Entity Extraction
The transcript is analyzed using the AI Processing Service to extract:
- **Contacts**: Names and roles (buyer, vendor, lawyer, etc.)
- **Properties**: Addresses mentioned
- **Tasks**: Action items and follow-ups
- **Notes**: Important observations and context

### 4. Entity Storage
Extracted entities are processed and stored:
- **Tasks**: Created in the task system with source `voice_note`
- **Timeline Events**: Created for the voice note and any notes
- **Contacts/Properties**: Can be linked to existing records (future enhancement)

### 5. Status Update
The voice note status is updated to `completed` or `failed` based on processing results.

## Entity Extraction Format

The AI extracts entities in the following format:

```json
[
  {
    "type": "contact",
    "data": {
      "name": "John Smith",
      "role": "buyer",
      "context": "interested in property"
    },
    "confidence": 0.9
  },
  {
    "type": "property",
    "data": {
      "address": "123 Main St",
      "context": "viewing scheduled"
    },
    "confidence": 0.85
  },
  {
    "type": "task",
    "data": {
      "label": "Follow up with John about viewing",
      "dueDate": null
    },
    "confidence": 0.8
  },
  {
    "type": "note",
    "data": {
      "content": "Buyer seemed very interested in the kitchen",
      "context": "property feedback"
    },
    "confidence": 0.75
  }
]
```

## Error Handling

### Processing Errors
If processing fails at any stage:
1. The voice note status is set to `failed`
2. The error is logged
3. The original audio and partial data are preserved

### Retry Strategy
- Transcription failures: Should be retried with exponential backoff
- Entity extraction failures: Return empty array, don't fail the entire process
- Task creation failures: Log error but continue processing other entities

## Configuration

### Environment Variables
```
OPENAI_API_KEY=your-api-key-here
OPENAI_API_ENDPOINT=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4
```

### Audio Storage
Voice notes require a storage solution (S3, Azure Blob, etc.) for audio files. The `audioUrl` should be:
- A publicly accessible URL (with signed URLs for security)
- Or a storage key that can be resolved to a download URL

## Testing

### Unit Tests
Located in `voice-note.service.test.ts`, covering:
- Voice note creation
- Entity extraction
- Error handling
- Status filtering

### Property-Based Tests
Property-based tests should be created for:
- **Property 13**: Voice note transcription
- **Property 14**: Transcript entity extraction
- **Property 15**: Transcript entity creation and linking
- **Property 56**: Voice note timeline integration

## Future Enhancements

1. **Audio File Upload**: Direct file upload endpoint with multipart/form-data
2. **Whisper API Integration**: Complete implementation with error handling
3. **Contact/Property Linking**: Automatically link extracted entities to existing records
4. **Batch Processing**: Process multiple voice notes in parallel
5. **Webhook Notifications**: Notify clients when processing completes
6. **Audio Format Conversion**: Support for various audio formats (MP3, M4A, WAV, OGG)
7. **Speaker Diarization**: Identify different speakers in multi-person recordings
8. **Real-time Transcription**: Stream transcription results as they're generated

## Dependencies

- **Prisma**: Database ORM
- **AI Processing Service**: LLM integration for entity extraction
- **Timeline Service**: Timeline event creation
- **Task Service**: Task creation and management
- **OpenAI Whisper API**: Speech-to-text transcription (to be integrated)

## Related Requirements

- **Requirement 5.1**: Voice recording control
- **Requirement 5.2**: Audio file upload support
- **Requirement 5.3**: Speech-to-text transcription
- **Requirement 5.4**: Entity extraction from transcripts
- **Requirement 5.5**: Entity creation and linking
- **Requirement 16.3**: Voice note timeline integration
