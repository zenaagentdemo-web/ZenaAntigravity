import { ActionStrategy, ActionContext, GeneratedActionContent } from '../types.js';
import { actionRegistry } from '../action-registry.js';
import { askZenaService } from '../../ask-zena.service.js';

export class BuyerMatchStrategy implements ActionStrategy {
    actionType = 'buyer_match_intro' as const;

    async shouldTrigger(context: ActionContext): Promise<boolean> {
        const { property } = context;
        if (!property) return false;

        // Trigger for active properties with high momentum (mock condition)
        // In real app: Check if property was just listed or price changed, and high momentum
        const isFresh = (Date.now() - new Date(property.createdAt).getTime()) < (3 * 24 * 60 * 60 * 1000); // < 3 days old

        // MVP: Trigger if active and "fresh"
        return property.status === 'active' && isFresh;
    }

    async generate(context: ActionContext): Promise<GeneratedActionContent> {
        const { property } = context;

        // Mock finding a matched buyer
        const matchedBuyer = {
            name: 'Sarah Jenkins',
            matchScore: 95,
            requirements: '3 bed, 2 bath, Ponsonby/Grey Lynn',
            lastActive: 'Yesterday'
        };

        const address = property.address;

        // Generate SMS Draft
        const promptSMS = `Write a high-converting SMS for agent Hamish to send to buyer ${matchedBuyer.name} about a *just listed* property at ${address}.
        Goal: Get them to reply immediately.
        Tone: Personal, Urgent, Exclusive.
        Constraint: Max 160 characters. No hashtags. strictly plain text.`;

        const smsContent = await askZenaService.askBrain(promptSMS, {
            jsonMode: false,
            systemPrompt: 'You are a top real estate agent. Write only the SMS text.'
        });

        // Generate Email Draft
        const promptEmail = `Draft a high-priority "Off-Market" alert email to ${matchedBuyer.name} regarding ${address}.
        
        Key Selling Points:
        - 95% Match to their requirements (${matchedBuyer.requirements})
        - Launching to public in 48 hours (Exclusive preview)
        - Price guide matches their pre-approval level
        
        Structure:
        1. Hook: "I found it."
        2. Value: Why this specific house fits their specific needs.
        3. Scarcity: "I'm holding keys for 48h before online launch."
        4. CTA: "Can you meet me there [Day] at [Time]?"
        
        Tone: Short, Punchy, Personal (not marketing speak). UK English.`;

        const emailContent = await askZenaService.askBrain(promptEmail, {
            jsonMode: false,
            systemPrompt: 'You are Zena. Write only the email body.'
        });

        return {
            title: `Hot Buyer Match: ${matchedBuyer.name} (${matchedBuyer.matchScore}%)`,
            description: `Sarah matches this property 95% based on her search for "${matchedBuyer.requirements}". She was active yesterday.`,
            reasoning: `High-intent buyer active in this price bracket. Early engagement significantly increases conversion probability.`,
            priority: 9,
            draftSubject: `First look: Perfect match in Ponsonby`,
            draftBody: emailContent,
            script: `(Phone Rings)\n\n"Hey Sarah, Hamish here.\n\nLook, I'm standing in a living room on ${address.split(',')[0]} and I honestly thought of you immediately.\n\nIt's got the [Mention 1 Key Feature] you wanted. I'm literally holding the keys before the photographer comes tomorrow.\n\nCan you get here in 20 mins? You need to see this before it hits TradeMe."`,
            contextSummary: `**Why Sarah?**\n- 95% Match Score\n- Viewed 3 similar open homes this month\n- Mortgage pre-approved\n\n**Action**\nCall her now to lock in a private viewing before the weekend rush.`,
            payload: {
                matchedBuyer,
                smsDraft: smsContent // For "Copy to Clipboard" feature
            }
        };
    }

    async execute(actionId: string, payload: any): Promise<any> {
        // Log execution
        console.log(`[BuyerMatch] Executing match action ${actionId}`);
        return { success: true, message: 'Buyer match processed' };
    }
}

// Auto-register
actionRegistry.register(new BuyerMatchStrategy());
