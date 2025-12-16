# Search Service Implementation

## Overview

The search service provides comprehensive search functionality across all entity types in the Zena system: deals, contacts, properties, and threads. It implements relevance ranking based on query match quality and recency ranking to surface the most relevant and recent results.

## Features

### Multi-Entity Search
- **Deals**: Search by summary, next action, and associated property address
- **Contacts**: Search by name, email addresses, and relationship notes
- **Properties**: Search by address
- **Threads**: Search by subject, summary, and participant information

### Intelligent Ranking
The search service uses a hybrid ranking algorithm that combines:
- **Relevance Score (70%)**: Based on query match quality
  - Exact matches score highest
  - Prefix matches score high
  - Phrase matches score medium
  - Word matches score lower
  - Earlier fields (e.g., name) weighted more than later fields
- **Recency Score (30%)**: Based on how recently the entity was updated
  - Recent items (within 90 days) get higher scores
  - Older items get progressively lower scores

### Context Snippets
Each search result includes a context snippet that shows:
- Where the query matched in the content
- Surrounding context (50 characters before, remaining space after)
- Ellipsis indicators when content is truncated

## API Endpoint

### GET /api/search

Search across all entity types with optional filtering.

**Query Parameters:**
- `q` or `query` (required): The search query string
- `types` (optional): Comma-separated list of entity types to search. Valid values: `deal`, `contact`, `property`, `thread`. Default: all types
- `limit` (optional): Maximum number of results to return (1-100). Default: 50

**Example Requests:**
```bash
# Search all entity types
GET /api/search?q=123+Main+Street

# Search only properties and threads
GET /api/search?q=John+Smith&types=contact,thread

# Limit results to 20
GET /api/search?q=buyer&limit=20
```

**Response Format:**
```json
{
  "query": "123 Main Street",
  "results": [
    {
      "type": "property",
      "id": "uuid",
      "title": "123 Main Street",
      "snippet": "...123 Main Street is a beautiful property with...",
      "relevanceScore": 150.5,
      "timestamp": "2024-01-15T10:30:00Z",
      "metadata": {
        "vendorCount": 1,
        "buyerCount": 3,
        "threadCount": 12,
        "dealCount": 2
      }
    },
    {
      "type": "thread",
      "id": "uuid",
      "title": "Re: Viewing at 123 Main Street",
      "snippet": "...interested in viewing 123 Main Street this weekend...",
      "relevanceScore": 145.2,
      "timestamp": "2024-01-14T15:20:00Z",
      "metadata": {
        "classification": "buyer",
        "category": "focus",
        "riskLevel": "none",
        "propertyAddress": "123 Main Street",
        "participantCount": 3
      }
    }
  ],
  "count": 2
}
```

## Implementation Details

### Search Algorithm

1. **Parallel Search**: All entity types are searched in parallel for performance
2. **Case-Insensitive Matching**: All searches are case-insensitive
3. **Partial Matching**: Supports partial word matching using PostgreSQL's `ILIKE` operator
4. **Result Combination**: Results from all entity types are combined and ranked together
5. **Top-K Selection**: Only the top N results (based on limit) are returned

### Relevance Scoring

The relevance score is calculated based on multiple factors:

```typescript
// Exact match in field
if (fieldLower === queryLower) {
  score += 100 * (fields.length - fieldIndex);
}

// Field starts with query
if (fieldLower.startsWith(queryLower)) {
  score += 50 * (fields.length - fieldIndex);
}

// Field contains query as whole phrase
if (fieldLower.includes(queryLower)) {
  score += 30 * (fields.length - fieldIndex);
}

// Count matching words
queryWords.forEach(word => {
  if (fieldLower.includes(word)) {
    score += 5 * (fields.length - fieldIndex);
  }
});
```

### Recency Scoring

Recency is calculated as a decay function over 90 days:

```typescript
const recency = Math.max(0, 1 - (now - timestamp) / (90 * dayInMs));
```

### Final Ranking

```typescript
const finalScore = relevanceScore * 0.7 + recency * 100 * 0.3;
```

## Performance Considerations

### Database Indexes
The following indexes are used to optimize search performance:
- `Contact.emails` - Array index for email searches
- `Property.address` - Text index for address searches
- `Thread.subject` and `Thread.summary` - Text indexes for thread searches
- `Deal.summary` - Text index for deal searches

### Query Limits
- Each entity type query is limited to 100 results before ranking
- Final results are limited to the specified limit (default 50)
- This prevents excessive memory usage and ensures fast response times

### Parallel Execution
All entity type searches execute in parallel using `Promise.all()`, reducing total search time.

## Testing

### Property-Based Tests

The search service includes property-based tests that validate:

1. **Property 59: Search result matching** - All results match the query
2. **Property 60: Search result ranking** - Results are ranked by relevance and recency
3. **Property 61: Address search completeness** - Address searches return property and threads

### Unit Tests

Unit tests cover:
- Relevance score calculation
- Recency score calculation
- Snippet generation
- Result ranking
- Query parameter validation

## Error Handling

The search service handles the following error cases:

1. **Missing Query**: Returns 400 with `VALIDATION_FAILED` error
2. **Invalid Types**: Returns 400 with `VALIDATION_FAILED` error
3. **Invalid Limit**: Returns 400 with `VALIDATION_FAILED` error
4. **Database Errors**: Returns 500 with `SEARCH_FAILED` error
5. **Authentication Errors**: Returns 401 with `AUTH_REQUIRED` error

## Future Enhancements

Potential improvements for future iterations:

1. **Full-Text Search**: Implement PostgreSQL full-text search for better performance
2. **Fuzzy Matching**: Add support for typo-tolerant search
3. **Search Filters**: Add filters for date ranges, entity types, risk levels, etc.
4. **Search History**: Track and suggest previous searches
5. **Search Analytics**: Track popular searches and result click-through rates
6. **Highlighting**: Return highlighted matches in snippets
7. **Faceted Search**: Provide counts by entity type before filtering
8. **Saved Searches**: Allow users to save and reuse common searches

## Requirements Validation

This implementation validates the following requirements:

- **Requirement 17.1**: Search returns results matching deals, contacts, properties, or communications
- **Requirement 17.2**: Results are ranked by relevance and recency
- **Requirement 17.3**: Address searches return the property and all associated threads
- **Requirement 17.4**: Name searches return the contact and all related deals
- **Requirement 17.5**: Search results provide context snippets showing why each result matched
