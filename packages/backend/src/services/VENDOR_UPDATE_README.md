# Vendor Update Service

The Vendor Update Service generates professional email drafts for property vendors, summarizing campaign activity, buyer feedback, and key metrics.

## Features

- **Automated Compilation**: Gathers viewing activity, buyer inquiries, and offers
- **Buyer Anonymization**: Protects buyer privacy by anonymizing identities in feedback
- **Key Metrics**: Highlights viewings, inquiries, and offers
- **Professional Formatting**: Generates ready-to-send email drafts
- **Communication Summary**: Includes recent activity timeline

## API Endpoint

### Generate Vendor Update

```
POST /api/properties/:propertyId/vendor-update
```

**Authentication**: Required (JWT token)

**Response:**
```json
{
  "propertyAddress": "123 Main Street, Suburb",
  "vendorNames": ["John Smith", "Jane Smith"],
  "emailDraft": "Dear John Smith and Jane Smith,\n\nI wanted to provide you with an update...",
  "metrics": {
    "viewings": 12,
    "inquiries": 8,
    "offers": 2
  },
  "buyerFeedback": [
    "A prospective buyer expressed interest in the property's location",
    "A prospective buyer mentioned the property meets their requirements"
  ],
  "communicationSummary": "- 12/08/2025: buyer communication - Inquiry about property\n- 12/07/2025: buyer communication - Follow-up questions"
}
```

## Vendor Update Components

### 1. Campaign Metrics

The service automatically calculates:
- **Viewings**: Count of viewing appointments from timeline events
- **Inquiries**: Count of buyer threads/communications
- **Offers**: Count of deals in offer stage or beyond

### 2. Buyer Feedback

- Extracted from buyer thread summaries
- Automatically anonymized to protect buyer privacy
- Limited to most recent 10 buyer communications
- Names and email addresses replaced with generic terms

### 3. Communication Summary

- Lists recent communications (up to 5)
- Includes date, type, and subject
- Ordered by most recent first

### 4. Email Draft

Professional email format including:
- Personalized greeting with vendor names
- Campaign metrics section
- Buyer feedback section (if available)
- Recent activity summary
- Professional closing

## Buyer Anonymization

The service automatically anonymizes buyer identities in feedback:

**Before Anonymization:**
```
"John Doe expressed strong interest in the property and mentioned the location is perfect for his family."
```

**After Anonymization:**
```
"A prospective buyer expressed strong interest in the property and mentioned the location is perfect for their family."
```

**Anonymization Rules:**
- Full names → "a prospective buyer"
- First names → "a prospective buyer"
- Email addresses → "[buyer contact]"
- Preserves feedback content while protecting identity

## Usage Example

```typescript
// Generate vendor update for a property
const vendorUpdate = await vendorUpdateService.generateVendorUpdate({
  propertyId: 'property-uuid',
  userId: 'user-uuid'
});

// Access components
console.log(vendorUpdate.metrics);
// { viewings: 12, inquiries: 8, offers: 2 }

console.log(vendorUpdate.buyerFeedback);
// ["A prospective buyer expressed interest...", ...]

console.log(vendorUpdate.emailDraft);
// "Dear John Smith,\n\nI wanted to provide you with an update..."
```

## Email Draft Format

```
Dear [Vendor Names],

I wanted to provide you with an update on the campaign for [Property Address].

**Campaign Metrics:**
- Viewings: [count]
- Inquiries: [count]
- Offers: [count]

**Buyer Feedback:**
- [Anonymized feedback 1]
- [Anonymized feedback 2]
- ...

**Recent Activity:**
- [Date]: [Type] communication - [Subject]
- [Date]: [Type] communication - [Subject]
- ...

Please let me know if you have any questions or would like to discuss the campaign further.

Best regards
```

## Data Sources

The service aggregates data from:
- **Timeline Events**: For viewing counts
- **Threads**: For buyer inquiries and feedback
- **Deals**: For offer counts
- **Property Relations**: For vendor information

## Error Handling

**Property Not Found:**
```json
{
  "error": "Property not found"
}
```

**Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

## Implementation Details

### Metrics Calculation

**Viewings:**
- Counts timeline events of type "meeting"
- Filters by summary containing "viewing"
- Scoped to the specific property

**Inquiries:**
- Counts threads with classification "buyer"
- Linked to the property
- Represents unique buyer communications

**Offers:**
- Counts deals in stages: offer, conditional, pre_settlement, sold
- Linked to the property

### Feedback Extraction

- Retrieves up to 10 most recent buyer threads
- Extracts summary text (minimum 20 characters)
- Applies anonymization to each summary
- Returns as array of anonymized feedback strings

### Communication Summary

- Retrieves up to 5 most recent threads
- Formats as: `[Date]: [Type] communication - [Subject]`
- Ordered by most recent first
- Includes both buyer and vendor communications

## Future Enhancements

1. **Customizable Templates**: Allow agents to customize email format
2. **Sentiment Analysis**: Include sentiment scores for buyer feedback
3. **Comparison Metrics**: Compare to similar properties or previous campaigns
4. **Automated Scheduling**: Send vendor updates on a schedule
5. **Multi-language Support**: Generate updates in different languages
6. **Attachment Support**: Include property photos or documents
7. **Email Sending**: Direct integration to send emails from the platform
8. **Feedback Categories**: Categorize feedback (positive, neutral, concerns)

## Testing

The service includes comprehensive property-based tests:

**Property 92: Vendor update compilation**
- Verifies all components are present
- Tests with varying numbers of viewings, inquiries, and offers
- 10 iterations with random data

**Property 93: Buyer feedback anonymization**
- Verifies buyer names are removed from feedback
- Verifies buyer emails are removed from feedback
- Tests with multiple buyers
- 10 iterations with random buyer data

**Property 94: Vendor update metrics inclusion**
- Verifies metrics are calculated correctly
- Verifies metrics appear in email draft
- Tests with varying metric values
- 10 iterations with random metrics

## Security Considerations

- **Authentication Required**: All endpoints require valid JWT token
- **User Isolation**: Users can only generate updates for their own properties
- **Privacy Protection**: Buyer identities automatically anonymized
- **Data Access**: Only accesses data owned by the authenticated user

## Performance

- **Efficient Queries**: Uses Prisma includes to minimize database round-trips
- **Pagination**: Limits feedback to 10 most recent items
- **Caching Opportunity**: Results could be cached for frequently accessed properties
- **Async Processing**: Could be moved to background job for large datasets
