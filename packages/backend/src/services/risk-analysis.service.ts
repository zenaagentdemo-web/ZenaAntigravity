import { PrismaClient, Deal, Thread } from '@prisma/client';
import { websocketService } from './websocket.service.js';

const prisma = new PrismaClient();

/**
 * Risk level enumeration
 */
export enum RiskLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Risk factor interface
 */
interface RiskFactor {
  type: string;
  severity: RiskLevel;
  reason: string;
}

/**
 * Risk analysis result
 */
export interface RiskAnalysisResult {
  riskLevel: RiskLevel;
  riskFlags: string[];
  riskReason: string;
}

/**
 * Configuration for risk thresholds
 */
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

/**
 * Risk Analysis Service
 * Evaluates deals and threads for risk signals based on communication patterns
 */
export class RiskAnalysisService {
  /**
   * Analyze risk for a specific deal
   */
  async analyzeDealRisk(dealId: string): Promise<RiskAnalysisResult> {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        threads: {
          orderBy: { lastMessageAt: 'desc' },
        },
      },
    });

    if (!deal) {
      throw new Error(`Deal not found: ${dealId}`);
    }

    const riskFactors: RiskFactor[] = [];

    // Evaluate response delays
    const responseDelayRisk = this.evaluateResponseDelay(deal.threads);
    if (responseDelayRisk) {
      riskFactors.push(responseDelayRisk);
    }

    // Evaluate communication frequency
    const commFrequencyRisk = this.evaluateCommunicationFrequency(deal.threads);
    if (commFrequencyRisk) {
      riskFactors.push(commFrequencyRisk);
    }

    // Evaluate stage duration
    const stageDurationRisk = this.evaluateStageDuration(deal);
    if (stageDurationRisk) {
      riskFactors.push(stageDurationRisk);
    }

    // Aggregate heuristic risk factors
    const heuristicResult = this.aggregateRiskFactors(riskFactors);

    // BRAIN-FIRST: Sentiment & Strategic Risk Analysis
    try {
      const brainRisk = await this.analyzeRiskWithLLM(dealId, 'deal', {
        stage: deal.stage,
        threads: deal.threads.map(t => ({
          subject: t.subject,
          summary: t.summary,
          riskLevel: t.riskLevel,
          lastMessageAt: t.lastMessageAt
        }))
      });

      if (brainRisk && this.getRiskSeverityScore(brainRisk.riskLevel) >= this.getRiskSeverityScore(heuristicResult.riskLevel)) {
        return brainRisk;
      }
    } catch (error) {
      console.warn('[ZenaBrain] LLM Risk Analysis failed:', error);
    }

    return heuristicResult;
  }

  /**
   * Analyze risk for a specific thread
   */
  async analyzeThreadRisk(threadId: string): Promise<RiskAnalysisResult> {
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    const riskFactors: RiskFactor[] = [];

    // Check if thread is in waiting category and has delayed response
    if (thread.category === 'waiting') {
      const daysSinceLastMessage = this.getDaysSince(thread.lastMessageAt);

      if (daysSinceLastMessage >= RISK_THRESHOLDS.RESPONSE_DELAY_HIGH) {
        riskFactors.push({
          type: 'response_delay',
          severity: RiskLevel.HIGH,
          reason: `No response for ${daysSinceLastMessage} days`,
        });
      } else if (daysSinceLastMessage >= RISK_THRESHOLDS.RESPONSE_DELAY_MEDIUM) {
        riskFactors.push({
          type: 'response_delay',
          severity: RiskLevel.MEDIUM,
          reason: `No response for ${daysSinceLastMessage} days`,
        });
      } else if (daysSinceLastMessage >= RISK_THRESHOLDS.RESPONSE_DELAY_LOW) {
        riskFactors.push({
          type: 'response_delay',
          severity: RiskLevel.LOW,
          reason: `No response for ${daysSinceLastMessage} days`,
        });
      }
    }

    const heuristicResult = this.aggregateRiskFactors(riskFactors);

    // BRAIN-FIRST: Thread Sentiment Analysis
    try {
      const brainRisk = await this.analyzeRiskWithLLM(threadId, 'thread', {
        subject: thread.subject,
        summary: thread.summary,
        category: thread.category
      });

      if (brainRisk && this.getRiskSeverityScore(brainRisk.riskLevel) >= this.getRiskSeverityScore(heuristicResult.riskLevel)) {
        return brainRisk;
      }
    } catch (error) {
      console.warn('[ZenaBrain] LLM Thread Risk Analysis failed:', error);
    }

    return heuristicResult;
  }

  /**
   * BRAIN-FIRST: Use LLM to identify subtle risk factors from content
   */
  private async analyzeRiskWithLLM(id: string, type: 'deal' | 'thread', context: any): Promise<RiskAnalysisResult | null> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) return null;

    const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

    const prompt = `You are Zena, a high-intelligence real estate risk analyst. Analyze this ${type} and identify potential risks based on sentiment and behavior.
    
CONTEXT:
${JSON.stringify(context, null, 2)}

INSTRUCTIONS:
1. Look for subtle signs of risk: fading interest, pricing objections, competitive listings mentioned, or lack of urgency.
2. Determine an overall Risk Level: "none", "low", "medium", or "high". 
3. Provide a concise reason for the risk level.
4. Return ONLY a JSON object: {"riskLevel": "high", "riskFlags": ["sentiment_negative", "stale_interest"], "riskReason": "Buyer mentioned looking at another property in the same street."}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json'
          }
        })
      });

      if (!response.ok) return null;
      const data = await response.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      const result = JSON.parse(text);
      return {
        riskLevel: result.riskLevel as RiskLevel,
        riskFlags: result.riskFlags || [],
        riskReason: result.riskReason || ''
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Update risk flags for a deal
   */
  async updateDealRisk(dealId: string): Promise<Deal> {
    const riskAnalysis = await this.analyzeDealRisk(dealId);

    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        riskLevel: riskAnalysis.riskLevel,
        riskFlags: riskAnalysis.riskFlags,
      },
    });

    // Emit deal.risk event if risk level is medium or high
    if (riskAnalysis.riskLevel === RiskLevel.MEDIUM || riskAnalysis.riskLevel === RiskLevel.HIGH) {
      websocketService.broadcastToUser(updatedDeal.userId, 'deal.risk', {
        dealId,
        riskLevel: riskAnalysis.riskLevel,
        riskFlags: riskAnalysis.riskFlags,
        riskReason: riskAnalysis.riskReason,
      });
    }

    return updatedDeal;
  }

  /**
   * Update risk flags for a thread
   */
  async updateThreadRisk(threadId: string): Promise<Thread> {
    const riskAnalysis = await this.analyzeThreadRisk(threadId);

    const updatedThread = await prisma.thread.update({
      where: { id: threadId },
      data: {
        riskLevel: riskAnalysis.riskLevel,
        riskReason: riskAnalysis.riskReason,
      },
    });

    return updatedThread;
  }

  /**
   * Batch update risk for all deals belonging to a user
   */
  async updateAllDealsRisk(userId: string): Promise<void> {
    const deals = await prisma.deal.findMany({
      where: { userId },
    });

    for (const deal of deals) {
      await this.updateDealRisk(deal.id);
    }
  }

  /**
   * Batch update risk for all threads belonging to a user
   */
  async updateAllThreadsRisk(userId: string): Promise<void> {
    const threads = await prisma.thread.findMany({
      where: { userId },
    });

    for (const thread of threads) {
      await this.updateThreadRisk(thread.id);
    }
  }

  /**
   * Evaluate response delay risk
   */
  private evaluateResponseDelay(threads: Thread[]): RiskFactor | null {
    if (threads.length === 0) {
      return null;
    }

    // Find the most recent thread in waiting category
    const waitingThreads = threads.filter((t) => t.category === 'waiting');
    if (waitingThreads.length === 0) {
      return null;
    }

    const mostRecentWaiting = waitingThreads[0];
    const daysSinceLastMessage = this.getDaysSince(mostRecentWaiting.lastMessageAt);

    if (daysSinceLastMessage >= RISK_THRESHOLDS.RESPONSE_DELAY_HIGH) {
      return {
        type: 'response_delay',
        severity: RiskLevel.HIGH,
        reason: `No response for ${daysSinceLastMessage} days`,
      };
    } else if (daysSinceLastMessage >= RISK_THRESHOLDS.RESPONSE_DELAY_MEDIUM) {
      return {
        type: 'response_delay',
        severity: RiskLevel.MEDIUM,
        reason: `No response for ${daysSinceLastMessage} days`,
      };
    } else if (daysSinceLastMessage >= RISK_THRESHOLDS.RESPONSE_DELAY_LOW) {
      return {
        type: 'response_delay',
        severity: RiskLevel.LOW,
        reason: `No response for ${daysSinceLastMessage} days`,
      };
    }

    return null;
  }

  /**
   * Evaluate communication frequency risk
   */
  private evaluateCommunicationFrequency(threads: Thread[]): RiskFactor | null {
    if (threads.length === 0) {
      return null;
    }

    // Calculate messages per week over the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentThreads = threads.filter(
      (t) => t.lastMessageAt >= thirtyDaysAgo
    );

    if (recentThreads.length === 0) {
      return {
        type: 'communication_frequency',
        severity: RiskLevel.HIGH,
        reason: 'No communication in the last 30 days',
      };
    }

    const messagesPerWeek = (recentThreads.length / 30) * 7;

    if (messagesPerWeek < RISK_THRESHOLDS.COMM_FREQUENCY_HIGH) {
      return {
        type: 'communication_frequency',
        severity: RiskLevel.HIGH,
        reason: `Low communication frequency: ${messagesPerWeek.toFixed(1)} messages/week`,
      };
    } else if (messagesPerWeek < RISK_THRESHOLDS.COMM_FREQUENCY_MEDIUM) {
      return {
        type: 'communication_frequency',
        severity: RiskLevel.MEDIUM,
        reason: `Moderate communication frequency: ${messagesPerWeek.toFixed(1)} messages/week`,
      };
    } else if (messagesPerWeek < RISK_THRESHOLDS.COMM_FREQUENCY_LOW) {
      return {
        type: 'communication_frequency',
        severity: RiskLevel.LOW,
        reason: `Below normal communication frequency: ${messagesPerWeek.toFixed(1)} messages/week`,
      };
    }

    return null;
  }

  /**
   * Evaluate stage duration risk
   */
  private evaluateStageDuration(deal: Deal): RiskFactor | null {
    const daysSinceCreated = this.getDaysSince(deal.createdAt);
    const daysSinceUpdated = this.getDaysSince(deal.updatedAt);

    // Use the more recent of the two dates
    const daysInStage = Math.min(daysSinceCreated, daysSinceUpdated);

    let threshold: number;
    switch (deal.stage) {
      case 'lead':
        threshold = RISK_THRESHOLDS.STAGE_DURATION_LEAD;
        break;
      case 'qualified':
        threshold = RISK_THRESHOLDS.STAGE_DURATION_QUALIFIED;
        break;
      case 'viewing':
        threshold = RISK_THRESHOLDS.STAGE_DURATION_VIEWING;
        break;
      case 'offer':
        threshold = RISK_THRESHOLDS.STAGE_DURATION_OFFER;
        break;
      case 'conditional':
        threshold = RISK_THRESHOLDS.STAGE_DURATION_CONDITIONAL;
        break;
      case 'pre_settlement':
        threshold = RISK_THRESHOLDS.STAGE_DURATION_PRE_SETTLEMENT;
        break;
      default:
        return null; // No threshold for sold or nurture stages
    }

    if (daysInStage > threshold * 1.5) {
      return {
        type: 'stage_duration',
        severity: RiskLevel.HIGH,
        reason: `Deal in ${deal.stage} stage for ${daysInStage} days (threshold: ${threshold})`,
      };
    } else if (daysInStage > threshold) {
      return {
        type: 'stage_duration',
        severity: RiskLevel.MEDIUM,
        reason: `Deal in ${deal.stage} stage for ${daysInStage} days (threshold: ${threshold})`,
      };
    }

    return null;
  }

  /**
   * Aggregate risk factors into overall risk level
   */
  private aggregateRiskFactors(riskFactors: RiskFactor[]): RiskAnalysisResult {
    if (riskFactors.length === 0) {
      return {
        riskLevel: RiskLevel.NONE,
        riskFlags: [],
        riskReason: '',
      };
    }

    // Determine overall risk level (highest severity wins)
    let overallRisk = RiskLevel.NONE;
    const riskFlags: string[] = [];
    const reasons: string[] = [];

    for (const factor of riskFactors) {
      riskFlags.push(factor.type);
      reasons.push(factor.reason);

      // Update overall risk to highest severity
      if (this.getRiskSeverityScore(factor.severity) > this.getRiskSeverityScore(overallRisk)) {
        overallRisk = factor.severity;
      }
    }

    return {
      riskLevel: overallRisk,
      riskFlags,
      riskReason: reasons.join('; '),
    };
  }

  /**
   * Get numeric score for risk severity (for comparison)
   */
  private getRiskSeverityScore(level: RiskLevel): number {
    switch (level) {
      case RiskLevel.NONE:
        return 0;
      case RiskLevel.LOW:
        return 1;
      case RiskLevel.MEDIUM:
        return 2;
      case RiskLevel.HIGH:
        return 3;
      default:
        return 0;
    }
  }

  /**
   * Calculate days since a given date
   */
  private getDaysSince(date: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
}

export const riskAnalysisService = new RiskAnalysisService();
