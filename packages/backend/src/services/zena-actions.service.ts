// Zena Actions Service - AI-powered proactive deal actions
import { PrismaClient, Deal, ZenaAction } from '@prisma/client';
import { DealCondition } from '../models/types.js';
import { askZenaService } from './ask-zena.service.js';

const prisma = new PrismaClient();

// Action types
export type ZenaActionType =
    | 'nudge_client'
    | 'finance_followup'
    | 'lim_reminder'
    | 'pre_settlement_check'
    | 'insurance_reminder'
    | 'vendor_update'
    | 'offer_summary'
    | 'stale_deal_alert';

// Action config with prompt templates
interface ActionConfig {
    label: string;
    emoji: string;
    description: string;
    promptTemplate: string;
}

export const ACTION_CONFIGS: Record<ZenaActionType, ActionConfig> = {
    nudge_client: {
        label: 'Nudge Client',
        emoji: '📧',
        description: 'Send a friendly check-in message',
        promptTemplate: `Draft a friendly, professional check-in email for a real estate client. 
    
Context:
- Client name: {contactName}
- Property: {propertyAddress}
- Their role: {contactRole}
- Last contact: {daysSinceContact} days ago
- Current deal stage: {stage}

Keep it warm, brief (3-4 sentences), and ask if they need any assistance.`
    },

    finance_followup: {
        label: 'Finance Follow-up',
        emoji: '🏦',
        description: 'Check on bank approval status',
        promptTemplate: `Draft a polite email to check on finance approval status.

Context:
- Client name: {contactName}
- Property: {propertyAddress}
- Finance condition due: {dueDate}
- Days remaining: {daysRemaining}

Ask about bank approval status, offer to help with any documentation needed. Be supportive, not pushy.`
    },

    lim_reminder: {
        label: 'LIM Reminder',
        emoji: '📋',
        description: 'Remind about LIM report deadline',
        promptTemplate: `Draft an email reminding about the LIM (Land Information Memorandum) report deadline.

Context:
- Client name: {contactName}
- Property: {propertyAddress}
- LIM condition due: {dueDate}
- Days remaining: {daysRemaining}

Explain what a LIM is if needed, offer to order it for them if they haven't already. Be helpful and proactive.`
    },

    pre_settlement_check: {
        label: 'Pre-Settlement Check',
        emoji: '🔑',
        description: 'Book pre-settlement inspection',
        promptTemplate: `Draft an email to schedule the pre-settlement inspection.

Context:
- Client name: {contactName}
- Property: {propertyAddress}
- Settlement date: {settlementDate}
- Days until settlement: {daysRemaining}

Suggest available times for the inspection, explain what they should look for. Be organized and helpful.`
    },

    insurance_reminder: {
        label: 'Insurance Reminder',
        emoji: '🛡️',
        description: 'Confirm house insurance',
        promptTemplate: `Draft an email reminding about house insurance requirement.

Context:
- Client name: {contactName}
- Property: {propertyAddress}
- Settlement date: {settlementDate}
- Days until settlement: {daysRemaining}

Remind them insurance must be active from settlement date. Suggest contacting their insurer ASAP if not done.`
    },

    vendor_update: {
        label: 'Vendor Update',
        emoji: '📊',
        description: 'Update vendor on marketing progress',
        promptTemplate: `Draft a vendor update email summarizing recent marketing activity.

Context:
- Vendor names: {vendorNames}
- Property: {propertyAddress}
- Days since last update: {daysSinceUpdate}
- Recent viewings: {viewingCount}
- Recent inquiries: {inquiryCount}
- Sale method: {saleMethod}

Provide a professional summary of market interest and any feedback received. Be positive but realistic.`
    },

    offer_summary: {
        label: 'Offer Summary',
        emoji: '💰',
        description: 'Summarize offer for vendor',
        promptTemplate: `Create a professional summary of an offer to present to the vendor.

Context:
- Property: {propertyAddress}
- Offer price: {offerPrice}
- Buyer conditions: {buyerConditions}
- Settlement date requested: {requestedSettlement}

Present the offer terms clearly and professionally for vendor consideration.`
    },

    stale_deal_alert: {
        label: 'Stale Deal Alert',
        emoji: '⏰',
        description: 'Flag deal needing attention',
        promptTemplate: `This deal has had no progress for an extended period.

Context:
- Property: {propertyAddress}
- Current stage: {stage}
- Days in stage: {daysInStage}
- Last activity: {lastActivity}

Suggest next steps to move this deal forward or consider archiving if client interest has waned.`
    }
};

// Get days since last contact for a deal
function getDaysSinceContact(deal: Deal): number {
    if (!deal.lastContactAt) {
        return Math.floor((Date.now() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    }
    return Math.floor((Date.now() - deal.lastContactAt.getTime()) / (1000 * 60 * 60 * 24));
}

// Calculate days remaining for a date
function getDaysRemaining(date: Date): number {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Stage labels for display
const STAGE_LABELS: Record<string, string> = {
    buyer_consult: 'Buyer Consultation',
    shortlisting: 'Shortlisting',
    viewings: 'Viewings',
    offer_made: 'Offer Made',
    appraisal: 'Appraisal',
    listing_signed: 'Listing Signed',
    marketing: 'Marketing',
    offers_received: 'Offers Received',
    conditional: 'Conditional',
    unconditional: 'Unconditional',
    pre_settlement: 'Pre-Settlement',
    settled: 'Settled',
    nurture: 'Nurture'
};

export interface ActionContext {
    contactName?: string;
    contactRole?: string;
    propertyAddress?: string;
    stage?: string;
    daysSinceContact?: number;
    dueDate?: string;
    daysRemaining?: number;
    settlementDate?: string;
    vendorNames?: string;
    viewingCount?: number;
    inquiryCount?: number;
    saleMethod?: string;
    offerPrice?: string;
    buyerConditions?: string;
    requestedSettlement?: string;
    daysInStage?: number;
    lastActivity?: string;
    daysSinceUpdate?: number;
}

export interface PendingAction {
    type: ZenaActionType;
    reason: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    context: ActionContext;
}

interface DealWithRelations extends Deal {
    property?: { address: string } | null;
    contacts?: { id: string; name: string }[];
}

export class ZenaActionsService {
    /**
     * Generate AI draft for a specific action
     */
    async generateAction(
        userId: string,
        dealId: string,
        actionType: ZenaActionType,
        context: ActionContext
    ): Promise<ZenaAction> {
        const config = ACTION_CONFIGS[actionType];
        if (!config) {
            throw new Error(`Unknown action type: ${actionType}`);
        }

        // Build prompt with context
        let prompt = config.promptTemplate;
        for (const [key, value] of Object.entries(context)) {
            prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value || 'Unknown'));
        }

        // Generate draft using Gemini (Brain-First)
        let output: string;
        try {
            output = await askZenaService.askBrain(prompt, {
                jsonMode: false,
                systemPrompt: 'You are Zena, a world-class real estate assistant. Write ONLY the email body (no subject). Use warm, professional NZ tone.'
            });
        } catch (error) {
            console.error('Error generating action:', error);
            output = `[Draft generation failed. Context: ${JSON.stringify(context)}]`;
        }

        // Store the action
        const action = await prisma.zenaAction.create({
            data: {
                userId,
                dealId,
                type: actionType,
                status: 'pending',
                output
            }
        });

        return action;
    }

    /**
     * Get pending actions for a deal based on conditions and dates
     */
    getPendingActions(deal: DealWithRelations): PendingAction[] {
        const actions: PendingAction[] = [];
        const now = new Date();

        const propertyAddress = deal.property?.address || 'Property';
        const contactName = deal.contacts?.[0]?.name || 'Client';
        const daysSinceContact = getDaysSinceContact(deal);
        const daysInStage = Math.floor((now.getTime() - deal.stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24));

        // Check for stale deal (>14 days in same stage)
        if (daysInStage > 14 && !['settled', 'nurture'].includes(deal.stage)) {
            actions.push({
                type: 'stale_deal_alert',
                reason: `No progress for ${daysInStage} days`,
                priority: daysInStage > 21 ? 'high' : 'medium',
                context: {
                    propertyAddress,
                    stage: STAGE_LABELS[deal.stage] || deal.stage,
                    daysInStage,
                    lastActivity: deal.updatedAt.toLocaleDateString()
                }
            });
        }

        // Check conditions
        if (deal.conditions) {
            const conditions = deal.conditions as unknown as DealCondition[];
            for (const condition of conditions) {
                if (condition.status !== 'pending') continue;

                const dueDate = new Date(condition.dueDate);
                const daysRemaining = getDaysRemaining(dueDate);

                // Finance follow-up
                if (condition.type === 'finance' && daysRemaining <= 3 && daysRemaining >= 0) {
                    actions.push({
                        type: 'finance_followup',
                        reason: `Finance due in ${daysRemaining} days`,
                        priority: daysRemaining <= 1 ? 'critical' : 'high',
                        context: {
                            contactName,
                            propertyAddress,
                            dueDate: dueDate.toLocaleDateString(),
                            daysRemaining
                        }
                    });
                }

                // LIM reminder
                if (condition.type === 'lim' && daysRemaining <= 3 && daysRemaining >= 0) {
                    actions.push({
                        type: 'lim_reminder',
                        reason: `LIM due in ${daysRemaining} days`,
                        priority: daysRemaining <= 1 ? 'critical' : 'high',
                        context: {
                            contactName,
                            propertyAddress,
                            dueDate: dueDate.toLocaleDateString(),
                            daysRemaining
                        }
                    });
                }
            }
        }

        // Check settlement date for pre-settlement and insurance
        if (deal.settlementDate) {
            const daysToSettlement = getDaysRemaining(deal.settlementDate);

            if (daysToSettlement <= 5 && daysToSettlement >= 0 && ['conditional', 'unconditional', 'pre_settlement'].includes(deal.stage)) {
                actions.push({
                    type: 'pre_settlement_check',
                    reason: `Settlement in ${daysToSettlement} days`,
                    priority: daysToSettlement <= 2 ? 'critical' : 'high',
                    context: {
                        contactName,
                        propertyAddress,
                        settlementDate: deal.settlementDate.toLocaleDateString(),
                        daysRemaining: daysToSettlement
                    }
                });
            }

            if (daysToSettlement <= 3 && daysToSettlement >= 0 && deal.pipelineType === 'buyer') {
                actions.push({
                    type: 'insurance_reminder',
                    reason: `Insurance needed before settlement in ${daysToSettlement} days`,
                    priority: daysToSettlement <= 1 ? 'critical' : 'high',
                    context: {
                        contactName,
                        propertyAddress,
                        settlementDate: deal.settlementDate.toLocaleDateString(),
                        daysRemaining: daysToSettlement
                    }
                });
            }
        }

        // Vendor update (seller deals with no update in 7+ days)
        if (deal.pipelineType === 'seller' && deal.stage === 'marketing' && daysSinceContact >= 7) {
            actions.push({
                type: 'vendor_update',
                reason: `No vendor update for ${daysSinceContact} days`,
                priority: daysSinceContact > 10 ? 'high' : 'medium',
                context: {
                    propertyAddress,
                    daysSinceUpdate: daysSinceContact,
                    saleMethod: deal.saleMethod
                }
            });
        }

        // Nudge client (no contact in 5+ days for active deals)
        if (daysSinceContact >= 5 && !['settled', 'nurture'].includes(deal.stage)) {
            actions.push({
                type: 'nudge_client',
                reason: `No contact for ${daysSinceContact} days`,
                priority: daysSinceContact > 7 ? 'medium' : 'low',
                context: {
                    contactName,
                    propertyAddress,
                    stage: STAGE_LABELS[deal.stage] || deal.stage,
                    daysSinceContact,
                    contactRole: deal.pipelineType === 'buyer' ? 'buyer' : 'vendor'
                }
            });
        }

        // Sort by priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return actions;
    }

    /**
     * Execute an action (mark as executed)
     */
    async executeAction(actionId: string): Promise<ZenaAction> {
        return prisma.zenaAction.update({
            where: { id: actionId },
            data: {
                status: 'executed',
                executedAt: new Date()
            }
        });
    }

    /**
     * Dismiss an action
     */
    async dismissAction(actionId: string): Promise<ZenaAction> {
        return prisma.zenaAction.update({
            where: { id: actionId },
            data: {
                status: 'dismissed',
                dismissedAt: new Date()
            }
        });
    }

    /**
     * Get action history for a deal
     */
    async getActionHistory(dealId: string): Promise<ZenaAction[]> {
        return prisma.zenaAction.findMany({
            where: { dealId },
            orderBy: { triggeredAt: 'desc' }
        });
    }

    /**
     * Get pending actions for user across all deals
     */
    async getUserPendingActions(userId: string): Promise<ZenaAction[]> {
        return prisma.zenaAction.findMany({
            where: { userId, status: 'pending' },
            orderBy: { triggeredAt: 'desc' }
        });
    }

    /**
     * Call Gemini API for draft generation
     */
    private async callGemini(prompt: string): Promise<string> {
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_AI_API_KEY not configured');
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are Zena, an AI assistant for real estate agents in New Zealand. Generate a professional, friendly email draft based on this request:\n\n${prompt}\n\nWrite ONLY the email body (no subject line). Use a warm, professional tone appropriate for NZ real estate.`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API error: ${error}`);
        }

        const data = await response.json() as any;
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '[No response generated]';
    }
}

export const zenaActionsService = new ZenaActionsService();
