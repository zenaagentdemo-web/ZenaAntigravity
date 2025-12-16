# Risk Analysis System

## Overview

The Risk Analysis System evaluates deals and email threads for risk signals based on communication patterns, response delays, and deal stage duration. It automatically flags deals and threads that may be going cold or require urgent attention.

## Features

### Risk Evaluation Criteria

The system evaluates three main risk factors:

1. **Response Delays**
   - Tracks time since last message in waiting threads
   - Low risk: 3-4 days without response
   - Medium risk: 5-9 days without response
   - High risk: 10+ days without response

2. **Communication Frequency**
   - Analyzes message frequency over the last 30 days
   - Low risk: < 2 messages per week
   - Medium risk: < 1 message per week
   - High risk: < 0.5 messages per week or no communication in 30 days

3. **Stage Duration**
   - Monitors how long a deal has been in the same stage
   - Different thresholds for each stage:
     - Lead: 14 days
     - Qualified: 21 days
     - Viewing: 30 days
     - Offer: 14 days
     - Conditional: 45 days
     - Pre-settlement: 60 days
   - Medium risk: Exceeds threshold
   - High risk: Exceeds threshold by 50%

### Risk Levels

- **None**: No risk factors detected
- **Low**: Minor concerns, early warning signs
- **Medium**: Moderate concerns, requires attention
- **High**: Serious concerns, urgent action needed

## API

### RiskAnalysisService

```typescript
import { riskAnalysisService } from './risk-analysis.service.js';

// Analyze risk for a specific deal
const dealRisk = await riskAnalysisService.analyzeDealRisk('deal-id');
console.log(dealRisk.riskLevel); // 'none' | 'low' | 'medium' | 'high'
console.log(dealRisk.riskFlags); // ['response_delay', 'communication_frequency']
console.log(dealRisk.riskReason); // 'No response for 12 days; Low communication frequency'

// Analyze risk for a specific thread
const threadRisk = await riskAnalysisService.analyzeThreadRisk('thread-id');

// Update risk flags in database
await riskAnalysisService.updateDealRisk('deal-id');
await riskAnalysisService.updateThreadRisk('thread-id');

// Batch update all deals/threads for a user
await riskAnalysisService.updateAllDealsRisk('user-id');
await riskAnalysisService.updateAllThreadsRisk('user-id');
```

### Risk Analysis Result

```typescript
interface RiskAnalysisResult {
  riskLevel: RiskLevel; // 'none' | 'low' | 'medium' | 'high'
  riskFlags: string[]; // ['response_delay', 'communication_frequency', 'stage_duration']
  riskReason: string; // Human-readable explanation
}
```

## Usage Examples

### Example 1: Analyze Deal Risk

```typescript
// Get risk analysis for a deal
const result = await riskAnalysisService.analyzeDealRisk('deal-123');

if (result.riskLevel === 'high') {
  // Send notification to agent
  console.log(`URGENT: ${result.riskReason}`);
} else if (result.riskLevel === 'medium') {
  // Add to follow-up list
  console.log(`Follow up needed: ${result.riskReason}`);
}
```

### Example 2: Update Risk Flags

```typescript
// Update risk flags in database after sync
await riskAnalysisService.updateDealRisk('deal-123');

// Retrieve updated deal
const deal = await prisma.deal.findUnique({
  where: { id: 'deal-123' },
});

console.log(deal.riskLevel); // 'high'
console.log(deal.riskFlags); // ['response_delay', 'stage_duration']
```

### Example 3: Batch Risk Update

```typescript
// Update risk for all deals after email sync
await riskAnalysisService.updateAllDealsRisk('user-456');
await riskAnalysisService.updateAllThreadsRisk('user-456');
```

## Integration Points

### Sync Engine Integration

The risk analysis system should be triggered after email synchronization:

```typescript
// In sync-engine.service.ts
async syncEmailAccount(accountId: string) {
  // ... sync emails ...
  
  // Update risk flags for all threads and deals
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  });
  
  if (account) {
    await riskAnalysisService.updateAllThreadsRisk(account.userId);
    await riskAnalysisService.updateAllDealsRisk(account.userId);
  }
}
```

### API Endpoint Integration

Risk analysis can be exposed via API endpoints:

```typescript
// GET /api/deals/:id/risk
router.get('/deals/:id/risk', async (req, res) => {
  const riskAnalysis = await riskAnalysisService.analyzeDealRisk(req.params.id);
  res.json(riskAnalysis);
});

// POST /api/deals/:id/risk/update
router.post('/deals/:id/risk/update', async (req, res) => {
  const deal = await riskAnalysisService.updateDealRisk(req.params.id);
  res.json(deal);
});
```

### WebSocket Notifications

Send real-time notifications when deals are flagged as high risk:

```typescript
// After updating risk
const deal = await riskAnalysisService.updateDealRisk('deal-123');

if (deal.riskLevel === 'high') {
  // Send WebSocket event
  io.to(deal.userId).emit('deal.risk', {
    dealId: deal.id,
    riskLevel: deal.riskLevel,
    riskFlags: deal.riskFlags,
  });
}
```

## Configuration

Risk thresholds can be adjusted in `risk-analysis.service.ts`:

```typescript
const RISK_THRESHOLDS = {
  // Response delay thresholds (in days)
  RESPONSE_DELAY_LOW: 3,
  RESPONSE_DELAY_MEDIUM: 5,
  RESPONSE_DELAY_HIGH: 10,

  // Communication frequency thresholds (messages per week)
  COMM_FREQUENCY_LOW: 2,
  COMM_FREQUENCY_MEDIUM: 1,
  COMM_FREQUENCY_HIGH: 0.5,

  // Stage duration thresholds (in days)
  STAGE_DURATION_LEAD: 14,
  STAGE_DURATION_QUALIFIED: 21,
  STAGE_DURATION_VIEWING: 30,
  STAGE_DURATION_OFFER: 14,
  STAGE_DURATION_CONDITIONAL: 45,
  STAGE_DURATION_PRE_SETTLEMENT: 60,
};
```

## Testing

The risk analysis system includes comprehensive unit tests:

```bash
npm test -- risk-analysis.service.test.ts
```

### Test Coverage

- ✅ No risk for deals with recent communication
- ✅ High risk detection for 10+ days no response
- ✅ Medium risk detection for 5-9 days no response
- ✅ Low risk detection for 3-4 days no response
- ✅ High risk for no communication in 30 days
- ✅ High risk for deals in stage too long
- ✅ Multiple risk factor aggregation
- ✅ Thread risk analysis
- ✅ Batch risk updates

## Performance Considerations

### Batch Updates

When updating risk for many deals/threads, consider using batch operations:

```typescript
// Instead of sequential updates
for (const deal of deals) {
  await riskAnalysisService.updateDealRisk(deal.id);
}

// Use batch update
await riskAnalysisService.updateAllDealsRisk(userId);
```

### Caching

Risk analysis results can be cached since they don't change frequently:

```typescript
// Cache risk analysis for 5 minutes
const cacheKey = `risk:deal:${dealId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await riskAnalysisService.analyzeDealRisk(dealId);
await redis.setex(cacheKey, 300, JSON.stringify(result));
return result;
```

### Background Jobs

Schedule periodic risk updates using a job queue:

```typescript
// Run every hour
cron.schedule('0 * * * *', async () => {
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    await riskAnalysisService.updateAllDealsRisk(user.id);
    await riskAnalysisService.updateAllThreadsRisk(user.id);
  }
});
```

## Future Enhancements

1. **Machine Learning Integration**
   - Train models on historical data to predict deal outcomes
   - Personalize risk thresholds based on agent behavior

2. **Sentiment Analysis**
   - Analyze email sentiment to detect concerns or frustration
   - Flag deals with negative sentiment trends

3. **Predictive Risk Scoring**
   - Predict likelihood of deal closing based on patterns
   - Suggest optimal actions to reduce risk

4. **Custom Risk Rules**
   - Allow agents to define custom risk criteria
   - Support industry-specific risk factors

## Related Requirements

- **Requirement 6.5**: Waiting list risk flagging (5+ days no response)
- **Requirement 12.4**: Deal stagnation risk flagging
- **Requirement 13.1**: Deal risk evaluation based on response delays, communication frequency, and stage duration
- **Requirement 13.2**: Risk flagging with explanation

## Related Properties

- **Property 44**: Deal risk evaluation
- **Property 45**: Risk flag with explanation
- **Property 19**: Waiting list risk flagging
