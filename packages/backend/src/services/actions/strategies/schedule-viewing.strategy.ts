import { ActionStrategy, ActionContext, GeneratedActionContent } from '../types.js';
import { actionRegistry } from '../action-registry.js';
import { askZenaService } from '../../ask-zena.service.js';

export class ScheduleViewingStrategy implements ActionStrategy {
    actionType = 'schedule_viewing' as const;

    async shouldTrigger(context: ActionContext): Promise<boolean> {
        const { property, userId } = context;
        if (!property) return false;

        // Trigger logic:
        // Real world: Check 'high_intent' buyers who haven't viewed yet
        // MVP: Trigger randomly if property is active > 2 days
        const daysOnMarket = Math.floor((Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        return property.status === 'active' && daysOnMarket > 2;
    }

    async generate(context: ActionContext): Promise<GeneratedActionContent> {
        const { property } = context;

        // Mock finding a high-intent buyer
        const buyer = {
            name: 'Michael Chang',
            interest: 'High',
            viewedOnline: 12,
            lastActivity: 'Clicked projected ROI'
        };

        const address = property.address;

        // Mock available slots
        const proposedTime = "Friday at 2:00 PM";

        // Generate Email Draft
        const promptEmail = `Draft an email to ${buyer.name} inviting them to a private viewing of ${address}.
        Context: They have viewed it online 12 times.
        Proposed slot: ${proposedTime}.
        Tone: Professional, helpful. UK English.`;

        const emailContent = await askZenaService.askBrain(promptEmail, {
            jsonMode: false,
            systemPrompt: 'You are Zena. Write only the email body.'
        });

        return {
            title: `Schedule Viewing: ${buyer.name}`,
            description: `Michael has shown high online engagement (12 views). Propose a private viewing to convert interest.`,
            reasoning: `High online activity often precedes a request for viewing. Proactively scheduling removes friction.`,
            priority: 7,
            draftSubject: `Private viewing for ${address}`,
            draftBody: emailContent,
            script: `Hi Michael, Hamish here.\n\nI noticed you've been taking a good look at ${address} online.\n\nIt's even better in person. I'm heading there ${proposedTime} if you want me to show you through?\n\nNo pressure, just easier than waiting for the open home.`,
            contextSummary: `**Why Michael?**\n- 12 Online Views (Top 5%)\n- Engaged with ROI calculator\n\n**Proposed Slot**\n${proposedTime} (Fits your calendar gap)`,
            payload: {
                buyerId: 'mock-buyer-id',
                proposedTime,
                calendarEventId: 'mock-event-id'
            }
        };
    }

    async execute(actionId: string, payload: any): Promise<any> {
        console.log(`[ScheduleViewing] Sending invite to buyer`);
        return { success: true, message: 'Invite sent' };
    }
}

// Auto-register
actionRegistry.register(new ScheduleViewingStrategy());
