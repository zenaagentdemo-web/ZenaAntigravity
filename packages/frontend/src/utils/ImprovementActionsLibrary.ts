/**
 * ImprovementActionsLibrary.ts
 * 
 * Comprehensive library of improvement actions, tips, and pre-drafted email templates
 * for real estate contact engagement. Powers the "Improve Now" one-click action system.
 */

import { DealStage, ContactRole } from './ContactEngagementScorer';
import { api } from './apiClient';

export interface ImprovementAction {
    id: string;
    tip: string;                    // Short tip displayed in tooltip
    category: 'communication' | 'engagement' | 'profile' | 'follow_up' | 'nurture';
    priority: 'high' | 'medium' | 'low';
    actionType: 'email' | 'call' | 'task' | 'profile_update';
    emailTemplate?: EmailTemplate;   // Pre-drafted email if actionType is 'email'
    callScript?: string;            // Call talking points if actionType is 'call'
}

export interface EmailTemplate {
    subject: string;
    body: string;
    tone: 'warm' | 'professional' | 'urgent' | 'casual';
}

// Placeholder tokens for personalization
// {{CONTACT_NAME}} - Contact's first name
// {{AGENT_NAME}} - Agent's name
// {{PROPERTY_ADDRESS}} - Relevant property
// {{SUBURB}} - Target suburb
// {{DATE}} - Current/relevant date

// ============================================
// BUYER-SPECIFIC IMPROVEMENT ACTIONS
// ============================================
const BUYER_IMPROVEMENTS: Record<string, ImprovementAction[]> = {
    // Lead stage - Need to qualify and engage
    lead: [
        {
            id: 'buyer_lead_intro',
            tip: 'Send a warm introduction email',
            category: 'communication',
            priority: 'high',
            actionType: 'email',
            emailTemplate: {
                subject: "Great to connect, {{CONTACT_NAME}}!",
                body: `Hi {{CONTACT_NAME}},

It was great to connect with you! I'm excited to help you find your perfect home.

To make sure I'm showing you properties that really match what you're looking for, I'd love to learn a bit more about your wish list:

• What suburbs are you focused on?
• How many bedrooms/bathrooms do you need?
• Any must-haves (garage, garden, modern kitchen)?
• What's your ideal timeframe?

I've got some great properties coming up that might be perfect for you. Let me know the best time to chat!

Warm regards,
{{AGENT_NAME}}`,
                tone: 'warm'
            }
        },
        {
            id: 'buyer_lead_preapproval',
            tip: 'Check pre-approval status to assess urgency',
            category: 'follow_up',
            priority: 'high',
            actionType: 'email',
            emailTemplate: {
                subject: "Quick question about your property search",
                body: `Hi {{CONTACT_NAME}},

Hope you're going well! I wanted to touch base as I've got some exciting properties coming up.

Quick question - have you had a chance to chat with a mortgage broker about pre-approval? It's not essential yet, but having it in place means you can move quickly when the right property comes along.

If you'd like, I can connect you with a great broker who works with a lot of my buyers - no pressure, just options!

Chat soon,
{{AGENT_NAME}}`,
                tone: 'casual'
            }
        },
        {
            id: 'buyer_lead_listings',
            tip: 'Send curated listings matching their criteria',
            category: 'engagement',
            priority: 'high',
            actionType: 'email',
            emailTemplate: {
                subject: "Properties I thought you'd love in {{SUBURB}}",
                body: `Hi {{CONTACT_NAME}},

I've been keeping an eye out for you and found a few properties I think could be great matches:

🏠 [Property 1 details]
🏠 [Property 2 details]  
🏠 [Property 3 details]

Would any of these be worth a look? I can arrange private viewings at times that suit you.

Let me know your thoughts!
{{AGENT_NAME}}`,
                tone: 'professional'
            }
        }
    ],

    // Qualified stage - Active engagement
    qualified: [
        {
            id: 'buyer_qualified_viewing',
            tip: 'Invite to open homes in their target areas',
            category: 'engagement',
            priority: 'high',
            actionType: 'email',
            emailTemplate: {
                subject: "Open homes this weekend in {{SUBURB}}",
                body: `Hi {{CONTACT_NAME}},

There are some great open homes this weekend in your target areas:

📍 Saturday:
• {{PROPERTY_ADDRESS}} - 11:00am - 11:30am
• [Property 2] - 12:00pm - 12:30pm

📍 Sunday:
• [Property 3] - 1:00pm - 1:30pm

Would you like me to meet you at any of these? I can give you the inside scoop and help you assess if they're worth pursuing.

See you there?
{{AGENT_NAME}}`,
                tone: 'warm'
            }
        },
        {
            id: 'buyer_qualified_market_update',
            tip: 'Share market insights for their preferred suburbs',
            category: 'nurture',
            priority: 'medium',
            actionType: 'email',
            emailTemplate: {
                subject: "Market update: {{SUBURB}} - what you need to know",
                body: `Hi {{CONTACT_NAME}},

Thought you'd find this interesting - here's what's happening in {{SUBURB}}:

📊 **Market Snapshot**
• Median price this month: $X
• Days on market: X days (down from Y)
• Auction clearance rate: X%

**What this means for you:**
The market is [moving/steady/softening], which could be a good opportunity for buyers like yourself. Properties in the $X-Y range are seeing [strong/moderate] interest.

Want me to keep you updated on anything specific? Happy to be your eyes and ears out there.

{{AGENT_NAME}}`,
                tone: 'professional'
            }
        }
    ],

    // Viewing stage - Peak engagement
    viewing: [
        {
            id: 'buyer_viewing_feedback',
            tip: 'Request feedback after recent viewings',
            category: 'follow_up',
            priority: 'high',
            actionType: 'email',
            emailTemplate: {
                subject: "What did you think of {{PROPERTY_ADDRESS}}?",
                body: `Hi {{CONTACT_NAME}},

It was great catching up at the viewing today! I'd love to hear your thoughts on {{PROPERTY_ADDRESS}}.

• What stood out to you (good or bad)?
• Can you see yourself living there?
• Any concerns we should discuss?

If you're keen, I can find out more about the vendor's situation and what offer might work. Just let me know!

{{AGENT_NAME}}`,
                tone: 'warm'
            }
        },
        {
            id: 'buyer_viewing_compare',
            tip: 'Help them compare properties they\'ve viewed',
            category: 'engagement',
            priority: 'medium',
            actionType: 'email',
            emailTemplate: {
                subject: "Comparing your top properties",
                body: `Hi {{CONTACT_NAME}},

You've been to quite a few viewings now - great work! Let me help you compare your top picks:

| Property | Price Guide | Pros | Cons |
|----------|-------------|------|------|
| {{PROPERTY_ADDRESS}} | $X | [list] | [list] |
| [Property 2] | $X | [list] | [list] |

Which one is sitting at the top of your list? Sometimes it helps to talk through it - happy to jump on a quick call if useful.

{{AGENT_NAME}}`,
                tone: 'professional'
            }
        }
    ],

    // Offer/Conditional - Critical communication
    offer: [
        {
            id: 'buyer_offer_update',
            tip: 'Provide update on offer status',
            category: 'communication',
            priority: 'high',
            actionType: 'email',
            emailTemplate: {
                subject: "Update on your offer for {{PROPERTY_ADDRESS}}",
                body: `Hi {{CONTACT_NAME}},

Just wanted to give you a quick update on your offer for {{PROPERTY_ADDRESS}}.

[Status update here]

I'll keep you posted as soon as I hear anything. In the meantime, let me know if you have any questions.

{{AGENT_NAME}}`,
                tone: 'professional'
            }
        }
    ],

    // Sold stage - Nurture for referrals
    sold: [
        {
            id: 'buyer_sold_congrats',
            tip: 'Send settlement congratulations',
            category: 'nurture',
            priority: 'medium',
            actionType: 'email',
            emailTemplate: {
                subject: "Congratulations on your new home! 🏡🎉",
                body: `Hi {{CONTACT_NAME}},

CONGRATULATIONS! You're officially a homeowner at {{PROPERTY_ADDRESS}}!

I hope settlement day went smoothly. This is such an exciting milestone and I'm thrilled I could be part of your journey.

A few things that might be handy:
• Save my number in case you ever need real estate advice
• If you need any tradesperson recommendations, just ask!
• If any friends or family are looking to buy or sell, I'd love to help them too

Enjoy your new home - you've earned it!

Warmly,
{{AGENT_NAME}}`,
                tone: 'warm'
            }
        },
        {
            id: 'buyer_sold_referral',
            tip: 'Ask for a testimonial or referral',
            category: 'nurture',
            priority: 'low',
            actionType: 'email',
            emailTemplate: {
                subject: "Quick favour? (only if you're happy!)",
                body: `Hi {{CONTACT_NAME}},

Hope you're settling into your new home beautifully!

I have a small favour to ask - if you had a positive experience working with me, would you mind leaving a quick Google review? It really helps other buyers find me.

[Google review link]

And if you know anyone thinking of buying or selling, I'd be honoured if you passed on my details. Word of mouth is how I build my business!

No pressure at all - just thought I'd ask 😊

{{AGENT_NAME}}`,
                tone: 'casual'
            }
        }
    ],

    // Nurture stage - Stay top of mind
    nurture: [
        {
            id: 'buyer_nurture_checkin',
            tip: 'Send a friendly check-in',
            category: 'nurture',
            priority: 'medium',
            actionType: 'email',
            emailTemplate: {
                subject: "Just checking in 👋",
                body: `Hi {{CONTACT_NAME}},

Hope you're doing well! Just wanted to check in and see how the property search is going.

Still actively looking, or taking a breather? Either way, I'm here when you need me.

If your criteria have changed at all, let me know and I'll update my searches for you.

Chat soon,
{{AGENT_NAME}}`,
                tone: 'casual'
            }
        }
    ]
};

// ============================================
// VENDOR-SPECIFIC IMPROVEMENT ACTIONS
// ============================================
const VENDOR_IMPROVEMENTS: Record<string, ImprovementAction[]> = {
    lead: [
        {
            id: 'vendor_lead_appraisal',
            tip: 'Offer a market appraisal',
            category: 'engagement',
            priority: 'high',
            actionType: 'email',
            emailTemplate: {
                subject: "Free market appraisal for your property",
                body: `Hi {{CONTACT_NAME}},

I noticed you might be thinking about selling - great timing as the market is quite active right now!

I'd love to pop by and give you a no-obligation market appraisal. It's completely free and gives you:
• Current market value estimate
• Comparable recent sales
• Recommended selling strategy
• Expected timeframe

Would [suggest 2-3 times] work for a quick visit?

Looking forward to helping you achieve a great result.

{{AGENT_NAME}}`,
                tone: 'professional'
            }
        }
    ],

    viewing: [
        {
            id: 'vendor_viewing_feedback',
            tip: 'Share buyer feedback after open homes',
            category: 'communication',
            priority: 'high',
            actionType: 'email',
            emailTemplate: {
                subject: "Open home feedback for {{PROPERTY_ADDRESS}}",
                body: `Hi {{CONTACT_NAME}},

Great open home today! Here's a summary of how it went:

📊 **Attendance:** X groups through
👍 **Positive feedback:** [bullet points]
🤔 **Common questions:** [bullet points]
📞 **Interested parties:** X have requested follow-up

Next Steps:
• I'll be following up with serious inquiries this week
• Next open home is [date/time]
• [Any recommendations]

How are you feeling about everything? Happy to chat through feedback anytime.

{{AGENT_NAME}}`,
                tone: 'professional'
            }
        }
    ],

    sold: [
        {
            id: 'vendor_sold_thanks',
            tip: 'Send post-sale thank you and celebration',
            category: 'nurture',
            priority: 'medium',
            actionType: 'email',
            emailTemplate: {
                subject: "We did it! 🎉 Congratulations on selling {{PROPERTY_ADDRESS}}",
                body: `Hi {{CONTACT_NAME}},

WE DID IT! Congratulations on the sale of {{PROPERTY_ADDRESS}}!

What an amazing result - you should be very proud. Thank you for trusting me with such an important transaction.

I'll be in touch closer to settlement to make sure everything runs smoothly.

In the meantime, if you need anything at all, you know where to find me!

Warmly,
{{AGENT_NAME}}`,
                tone: 'warm'
            }
        }
    ]
};

// ============================================
// GENERIC IMPROVEMENTS (for all roles)
// ============================================
const GENERIC_IMPROVEMENTS: ImprovementAction[] = [
    {
        id: 'generic_reengagement',
        tip: 'Re-engage with a friendly touchpoint',
        category: 'nurture',
        priority: 'medium',
        actionType: 'email',
        emailTemplate: {
            subject: "Haven't heard from you in a while!",
            body: `Hi {{CONTACT_NAME}},

Just wanted to reach out - it's been a little while since we chatted!

I hope everything is going well. If your real estate plans have changed, or you have any questions, I'm always happy to help.

Even if you're not actively looking right now, feel free to reach out anytime. I'm always here as your go-to property person!

Take care,
{{AGENT_NAME}}`,
            tone: 'casual'
        }
    },
    {
        id: 'generic_phone_missing',
        tip: 'Add phone number to complete profile',
        category: 'profile',
        priority: 'high',
        actionType: 'email',
        emailTemplate: {
            subject: "Best way to reach you?",
            body: `Hi {{CONTACT_NAME}},

Quick one - what's the best number to reach you on? 

Sometimes things move fast in real estate and I want to make sure I can get hold of you quickly if something perfect comes up!

Just reply to this email with your mobile and I'll save it.

Thanks!
{{AGENT_NAME}}`,
            tone: 'casual'
        }
    },
    {
        id: 'generic_schedule_touchpoint',
        tip: 'Schedule a touchpoint this week',
        category: 'follow_up',
        priority: 'high',
        actionType: 'email',
        emailTemplate: {
            subject: "Quick catch up?",
            body: `Hi {{CONTACT_NAME}},

I wanted to schedule a quick catch-up to see how things are going and if there's anything I can help with.

Would you have 10-15 minutes for a call this week? I'm free:
• [Time 1]
• [Time 2]
• [Time 3]

Or just reply with a time that works for you!

{{AGENT_NAME}}`,
            tone: 'professional'
        }
    },
    {
        id: 'generic_try_different_channel',
        tip: 'Try a different communication channel',
        category: 'communication',
        priority: 'medium',
        actionType: 'email',
        emailTemplate: {
            subject: "Just making sure my emails are reaching you!",
            body: `Hi {{CONTACT_NAME}},

I've sent a few emails but haven't heard back - just wanted to make sure they're reaching you okay!

If email isn't your preferred way to communicate, I'm also happy to:
📱 Text/WhatsApp
📞 Quick phone call
💬 Whatever works best for you!

Just let me know what suits and I'll switch things up.

{{AGENT_NAME}}`,
            tone: 'casual'
        }
    }
];

// ============================================
// TRADESPERSON IMPROVEMENTS
// ============================================
const TRADESPERSON_IMPROVEMENTS: ImprovementAction[] = [
    {
        id: 'trades_quote_request',
        tip: 'Request quotes for upcoming jobs',
        category: 'engagement',
        priority: 'high',
        actionType: 'email',
        emailTemplate: {
            subject: "Quote request - upcoming job",
            body: `Hi {{CONTACT_NAME}},

I've got a job coming up that might be right up your alley:

📍 Location: {{PROPERTY_ADDRESS}}
🔧 Work needed: [Description]
📅 Timeframe: [When needed]

Would you be able to take a look and provide a quote? Happy to arrange access whenever suits you.

Let me know!
{{AGENT_NAME}}`,
            tone: 'professional'
        }
    },
    {
        id: 'trades_referral',
        tip: 'Refer to clients needing services',
        category: 'nurture',
        priority: 'medium',
        actionType: 'email',
        emailTemplate: {
            subject: "Referral for you - potential job",
            body: `Hi {{CONTACT_NAME}},

I've got a client who needs [service type] work done and I immediately thought of you!

Their details:
• Name: [Client name]
• Address: [Address]
• What they need: [Description]
• Contact: [Phone/email]

I've given them your details too, so they may reach out directly.

Keep up the great work!
{{AGENT_NAME}}`,
            tone: 'warm'
        }
    }
];

// ============================================
// MAIN FUNCTION: Get improvement actions for a contact
// ============================================
export function getImprovementActions(
    role: ContactRole,
    stage?: DealStage | 'none',
    context?: {
        hasPhone?: boolean;
        hasEmail?: boolean;
        activityCount7d?: number;
        emailsReceived?: number;
        emailsSent?: number;
    }
): ImprovementAction[] {
    const actions: ImprovementAction[] = [];
    const effectiveStage = stage || 'lead';

    // Get role-specific actions
    if (role === 'buyer' && BUYER_IMPROVEMENTS[effectiveStage]) {
        actions.push(...BUYER_IMPROVEMENTS[effectiveStage]);
    } else if (role === 'vendor' && VENDOR_IMPROVEMENTS[effectiveStage]) {
        actions.push(...VENDOR_IMPROVEMENTS[effectiveStage]);
    } else if (role === 'tradesperson') {
        actions.push(...TRADESPERSON_IMPROVEMENTS);
    }

    // Add context-specific generic actions
    if (context) {
        if (!context.hasPhone) {
            actions.push(GENERIC_IMPROVEMENTS.find(a => a.id === 'generic_phone_missing')!);
        }
        if (context.emailsReceived === 0 && (context.emailsSent || 0) > 2) {
            actions.push(GENERIC_IMPROVEMENTS.find(a => a.id === 'generic_try_different_channel')!);
        }
        if ((context.activityCount7d || 0) < 2) {
            actions.push(GENERIC_IMPROVEMENTS.find(a => a.id === 'generic_schedule_touchpoint')!);
        }
    }

    // If no specific actions, add generic nurture
    if (actions.length === 0) {
        actions.push(GENERIC_IMPROVEMENTS.find(a => a.id === 'generic_reengagement')!);
    }

    // Sort by priority and return top 3
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return actions
        .filter(Boolean)
        .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
        .slice(0, 3);
}

/**
 * Get a single best improvement action with email template
 * Used for "Improve Now" one-click action
 */
export function getBestImprovementAction(
    role: ContactRole,
    stage?: DealStage | 'none',
    context?: {
        hasPhone?: boolean;
        hasEmail?: boolean;
        activityCount7d?: number;
        emailsReceived?: number;
        emailsSent?: number;
    }
): ImprovementAction | null {
    const actions = getImprovementActions(role, stage, context);
    // Return the first action that has an email template
    return actions.find(a => a.emailTemplate) || actions[0] || null;
}

/**
 * Personalize an email template with contact details
 */
export function personalizeEmailTemplate(
    template: EmailTemplate,
    contactName: string,
    agentName: string = 'Your Agent',
    propertyAddress?: string,
    suburb?: string
): { subject: string; body: string } {
    const firstName = contactName.split(' ')[0];

    let subject = template.subject
        .replace(/\{\{CONTACT_NAME\}\}/g, firstName)
        .replace(/\{\{AGENT_NAME\}\}/g, agentName)
        .replace(/\{\{PROPERTY_ADDRESS\}\}/g, propertyAddress || '[Property]')
        .replace(/\{\{SUBURB\}\}/g, suburb || '[Suburb]')
        .replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString());

    let body = template.body
        .replace(/\{\{CONTACT_NAME\}\}/g, firstName)
        .replace(/\{\{AGENT_NAME\}\}/g, agentName)
        .replace(/\{\{PROPERTY_ADDRESS\}\}/g, propertyAddress || '[Property]')
        .replace(/\{\{SUBURB\}\}/g, suburb || '[Suburb]')
        .replace(/\{\{DATE\}\}/g, new Date().toLocaleDateString());

    return { subject, body };
}

/**
 * Fetch dynamic AI-generated improvement actions from Zena Brain
 */
export async function fetchImprovementActions(
    contact: { id: string; name: string; role: string;[key: string]: any }
): Promise<ImprovementAction[]> {
    try {
        const response = await api.post<{
            tips: string[];
            bestAction: {
                type: 'email' | 'call' | 'task';
                description: string;
                emailDraft?: { subject: string; body: string };
            };
            explanation: string;
        }>('/api/ask/improvement-actions', {
            contact: {
                id: contact.id,
                name: contact.name,
                role: contact.role,
                ...contact
            }
        });

        if (response.data && Array.isArray(response.data.tips)) {
            const mappedActions: ImprovementAction[] = response.data.tips.map((tip, i) => ({
                id: `dynamic_${i}`,
                tip,
                category: 'engagement',
                priority: i === 0 ? 'high' : 'medium',
                actionType: 'task'
            }));

            // Prepend the best action if it's an email draft
            const best = response.data.bestAction;
            if (best && best.type === 'email' && best.emailDraft) {
                mappedActions.unshift({
                    id: 'dynamic_best',
                    tip: best.description,
                    category: 'communication',
                    priority: 'high',
                    actionType: 'email',
                    emailTemplate: {
                        subject: best.emailDraft.subject,
                        body: best.emailDraft.body,
                        tone: 'professional'
                    }
                });
            }

            return mappedActions;
        }
        return [];
    } catch (error) {
        console.error('[ImprovementActions] Failed to fetch AI actions:', error);
        return []; // Caller should fall back to static actions
    }
}
