/**
 * contact.types.ts
 * Core types for Zena Contact Intelligence
 */

export type DealStage =
    | 'lead'
    | 'qualified'
    | 'viewing'
    | 'offer'
    | 'conditional'
    | 'pre_settlement'
    | 'sold'
    | 'nurture';

export type ContactRole = 'buyer' | 'vendor' | 'market' | 'tradesperson' | 'agent' | 'other';

export interface EngagementScore {
    intelScore: number;           // 0-100
    momentum: number;             // -100 to +100
    adjustedTarget: number;       // Expected target
    isOnTrack: boolean;           // Is score >= target?
    dealStage: DealStage | 'none'; // The stage used for scoring
    stageContext: string;         // Human-readable context
    reasoning?: string;           // AI-generated reasoning for the score
    improvementTips: string[];    // suggestions
}

export interface Contact {
    id: string;
    name: string;
    emails: string[];
    phones: string[];
    role: ContactRole;
    deals?: any[];
    relationshipNotes?: any[];
    intelligenceSnippet?: string;
    engagementReasoning?: string;
    lastActivityDetail?: string;
    engagementScore?: number;
    engagementVelocity?: number;
    scoringData?: EngagementScore;
    createdAt: string;
    updatedAt: string;
    zenaIntelligence?: {
        propertyType?: string;
        minBudget?: number;
        maxBudget?: number;
        location?: string;
        bedrooms?: number;
        bathrooms?: number;
        timeline?: string;
    };
}
