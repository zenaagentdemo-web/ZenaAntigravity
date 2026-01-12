import prisma from '../config/database.js';
import { askZenaService } from './ask-zena.service.js';
import { contextRetrieverService } from './context-retriever.service.js';
import { logger } from './logger.service.js';
import { userPersonaService } from './user-persona.service.js';

export interface ContactAnalysis {
    motivation: string;
    urgencyScore: number; // 0-100
    relationshipHealth: number; // 0-100
    keyDrivers: string[];
    riskSignals: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
    }>;
    strategicAdvice: string;
    recommendedNextStep: string;
}

export class ContactIntelligenceService {
    /**
     * Performs deep intelligence analysis on a contact
     */
    async analyzeContact(userId: string, contactId: string): Promise<ContactAnalysis> {
        try {
            // 1. Fetch contact context (Synapse Layer)
            const synapseContext = await contextRetrieverService.getUnifiedContext(userId, 'contact', contactId);
            const humanContext = contextRetrieverService.formatForPrompt(synapseContext);

            const contact = await prisma.contact.findUnique({
                where: { id: contactId }
            });

            if (!contact) throw new Error('Contact not found');

            // 1b. Fetch User Persona
            const persona = await userPersonaService.getPersona(userId);
            const personaSnippet = userPersonaService.getSystemPromptSnippet(persona);

            // 2. Data Sufficiency Check (GLOBAL RULE: ZERO FABRICATION)
            // If we have no context, no notes, and no previous snippet, we DO NOT ask the AI.
            const hasContext = synapseContext.timelineEvents.length > 0 ||
                synapseContext.recentTasks.length > 0 ||
                synapseContext.voiceNotes.length > 0;

            const hasNotes = (contact.relationshipNotes as any[])?.length > 0;
            const hasSnippet = !!contact.intelligenceSnippet && contact.intelligenceSnippet.length > 10;

            if (!hasContext && !hasNotes && !hasSnippet) {
                logger.info(`[ContactIntelligence] insufficient data for ${contact.name}. Skipping AI analysis.`);
                return {
                    motivation: 'Insufficient data to determine motivation.',
                    urgencyScore: 0,
                    relationshipHealth: 50,
                    keyDrivers: [],
                    riskSignals: [],
                    strategicAdvice: 'Engage with this contact to build intelligence.',
                    recommendedNextStep: 'Log a call or meeting note to generate insights.'
                };
            }

            // 3. Build Prompt
            const prompt = `
You are Zena's Strategic Advisor. Perform a deep relationship audit for this contact:
${personaSnippet}

GLOBAL MANDATE: You are forbidden from hallucinating facts. If you do not have data, say 'Unknown'.

CONTACT: ${contact.name} (${contact.role})
INTEL SNIPPET: ${contact.intelligenceSnippet || 'None'}

HUMAN CONTEXT (SYNAPSE LAYER):
${humanContext}

ANALYSIS REQUIREMENTS:
1. Motivation: Deep dive into WHY they are in the market. IF UNKNOWN, state "Unknown".
2. Urgency Score: 0-100 based on their timeline and interaction frequency.
3. Relationship Health: 0-100 based on sentiment and responsive patterns.
4. Key Drivers: List 3 main things they care about most.
5. Risk Signals: Identify potential issues.
6. Strategic Advice: High-level coaching for the agent (max 30 words).
7. Recommended Next Step: The single most effective action right now.

FORMAT:
Respond ONLY with a JSON object in this exact format:
{
  "motivation": "string",
  "urgencyScore": number,
  "relationshipHealth": number,
  "keyDrivers": ["string"],
  "riskSignals": [{"type": "string", "severity": "low|medium|high|critical", "description": "string"}],
  "strategicAdvice": "string",
  "recommendedNextStep": "string"
}
`;

            // 4. Call Gemini
            const response = await askZenaService.askBrain(prompt, { jsonMode: true });
            const analysis = JSON.parse(response) as ContactAnalysis;

            // 5. Persist to Contact record
            await prisma.contact.update({
                where: { id: contactId },
                data: {
                    intelligenceSnippet: `[Brief] ${analysis.strategicAdvice.split('.')[0]}`,
                    zenaIntelligence: {
                        ...(contact.zenaIntelligence as object || {}),
                        brief: analysis,
                        lastDeepAnalysisAt: new Date().toISOString()
                    }
                }
            });

            logger.info(`[ContactIntelligence] Deep analysis complete for ${contact.name}. Urgency: ${analysis.urgencyScore}`);

            return analysis;
        } catch (error) {
            logger.error(`[ContactIntelligence] Error analyzing contact ${contactId}:`, error);
            throw error; // No more mock fallback
        }
    }
}

export const contactIntelligenceService = new ContactIntelligenceService();
