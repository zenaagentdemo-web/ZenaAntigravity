/**
 * Intelligence Simulator Service
 * 
 * Orchestrates multi-persona roleplay scenarios for Zena's Brain.
 * This service seeds complex, interconnected data and injects events
 * to verify "Brain Steam" without a browser.
 */

import prisma from '../config/database.js';
import { actionScannerService } from './action-scanner.service.js';
import { godmodeService } from './godmode.service.js';
import { calendarActionsService } from './calendar-actions.service.js';
import { pdfGenerationService } from './pdf-generation.service.js';
import { ActionType, GodmodeMode } from '../models/types.js';

export interface ScenarioDefinition {
    name: string;
    description: string;
    personas: PersonaDefinition[];
    properties: PropertyDefinition[];
    events: EventSimulation[];
}

interface PersonaDefinition {
    id: string;
    name: string;
    email: string;
    role: 'vendor' | 'buyer' | 'agent';
}

interface PropertyDefinition {
    id: string;
    address: string;
    ownerId: string;
    listingPrice: number;
    status: 'listing' | 'under_contract' | 'settled';
}

interface EventSimulation {
    type: 'email' | 'voice_note' | 'milestone' | 'property_crud' | 'contact_crud' | 'deal_crud' | 'toggle_godmode' | 'inbox_action' | 'approval_action' | 'deal_update' | 'neural_pulse' | 'calendar_action' | 'task_action';
    delayMs: number;
    payload: any;
}

export interface SimulationAuditLog {
    scenario: string;
    timestamp: string;
    steps: Array<{
        step: string;
        timestamp: string;
        input: any;
        brainResponse: any;
        outcomes: any[];
    }>;
}

class IntelligenceSimulatorService {
    private auditLog: SimulationAuditLog | null = null;

    /**
     * Run a full roleplay scenario
     */
    async runScenario(userId: string, scenario: ScenarioDefinition): Promise<SimulationAuditLog> {
        console.log(`[Simulator] Starting Scenario: ${scenario.name}`);

        this.auditLog = {
            scenario: scenario.name,
            timestamp: new Date().toISOString(),
            steps: []
        };

        // 1. Reset & Seed Base Data
        await this.clearUserData(userId);
        await this.seedState(userId, scenario);

        // 2. Play Events
        for (const event of scenario.events) {
            if (event.delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, event.delayMs));
            }
            await this.executeEvent(userId, event);
        }

        return this.auditLog;
    }

    /**
     * Clear all Zena data for a specific user to ensure test isolation
     */
    private async clearUserData(userId: string) {
        // Ensure total isolation for the simulation
        await prisma.autonomousAction.deleteMany({ where: { userId } });
        await prisma.task.deleteMany({ where: { userId } });
        await prisma.deal.deleteMany({ where: { userId } });
        await prisma.message.deleteMany({ where: { thread: { userId } } });
        await prisma.thread.deleteMany({ where: { userId } });
        await prisma.voiceNote.deleteMany({ where: { userId } });
        await prisma.property.deleteMany({ where: { userId } });
        await prisma.contact.deleteMany({ where: { userId } });
        await prisma.calendarAccount.deleteMany({ where: { userId } });
        await prisma.emailAccount.deleteMany({ where: { userId } });
    }

    /**
     * Seed initial scenario state
     */
    private async seedState(userId: string, scenario: ScenarioDefinition) {
        // Seed Contacts
        for (const persona of scenario.personas) {
            await prisma.contact.upsert({
                where: { id: persona.id },
                update: {
                    userId,
                    name: persona.name,
                    emails: [persona.email],
                    role: persona.role,
                },
                create: {
                    id: persona.id,
                    userId,
                    name: persona.name,
                    emails: [persona.email],
                    role: persona.role,
                }
            });
        }

        // Seed Properties
        for (const property of scenario.properties) {
            await prisma.property.upsert({
                where: { id: property.id },
                update: {
                    userId,
                    address: property.address,
                    listingPrice: property.listingPrice,
                    status: property.status,
                },
                create: {
                    id: property.id,
                    userId,
                    address: property.address,
                    listingPrice: property.listingPrice,
                    status: property.status,
                }
            });
        }

        // Seed Deals
        for (const prop of scenario.properties) {
            if (prop.status !== 'listing') {
                await prisma.deal.create({
                    data: {
                        userId,
                        propertyId: prop.id,
                        stage: prop.status === 'settled' ? 'settled' : 'conditional',
                        status: prop.status === 'settled' ? 'closed' : 'active',
                        pipelineType: 'buyer',
                        saleMethod: 'negotiation',
                        nextActionOwner: 'agent',
                        summary: `Simulation deal for ${prop.address}`,
                    }
                });
            }
        }

        // Seed Default Accounts
        await prisma.emailAccount.upsert({
            where: { id: `email-acc-${userId}` },
            update: {},
            create: {
                id: `email-acc-${userId}`,
                userId,
                provider: 'gmail',
                email: 'agent@stress.test',
                accessToken: 'mock',
                refreshToken: 'mock',
                tokenExpiry: new Date(Date.now() + 3600000),
            }
        });

        this.recordStep('SEED_STATE', scenario, 'Database primed with personas, properties and accounts', []);
    }

    /**
     * Execute a simulated event and trace the Brain Steam
     */
    private async executeEvent(userId: string, event: EventSimulation) {
        const startTime = new Date();
        let brainResponse: any = null;
        let outcomes: any[] = [];

        console.log(`[Simulator] 💥 EXECUTING EVENT: ${event.type}`);
        console.log(`[Simulator] Payload: ${JSON.stringify(event.payload)}`);

        switch (event.type) {
            case 'email':
                // Find contact for this email to link thread
                const contact = await prisma.contact.findFirst({
                    where: { userId, emails: { has: event.payload.from } }
                });

                // Find property if mentioned in payload (for context linking)
                let property = null;
                if (event.payload.propertyId) {
                    property = await prisma.property.findUnique({
                        where: { id: event.payload.propertyId }
                    });
                } else if (event.payload.body) {
                    // Fallback to searching by address mention in body
                    const properties = await prisma.property.findMany({ where: { userId } });
                    property = properties.find(p => event.payload.body.toLowerCase().includes(p.address.toLowerCase()));
                }

                // Seed Thread & Message
                await prisma.thread.create({
                    data: {
                        id: event.payload.threadId || `thread-${Date.now()}`,
                        userId,
                        emailAccountId: `email-acc-${userId}`,
                        externalId: event.payload.threadId || `thread-${Date.now()}`,
                        subject: event.payload.subject || 'Simulation Thread',
                        participants: [
                            { name: contact?.name || 'Simulation', email: event.payload.from, role: contact?.role || 'buyer' },
                            { name: 'Agent Alice', email: 'agent@zena.ai', role: 'agent' }
                        ],
                        classification: 'buyer',
                        category: 'focus',
                        nextActionOwner: 'agent',
                        lastMessageAt: new Date(),
                        summary: 'Simulated email thread',
                        propertyId: property?.id,
                        messages: {
                            create: {
                                id: event.payload.emailId || `email-${Date.now()}`,
                                externalId: event.payload.emailId || `email-${Date.now()}`,
                                from: { email: event.payload.from, name: contact?.name || 'Simulation' },
                                subject: event.payload.subject || 'Simulation Email',
                                body: event.payload.body || '',
                                bodyHtml: `<div>${event.payload.body}</div>`,
                                sentAt: new Date(),
                                receivedAt: new Date(),
                            }
                        }
                    }
                });

                brainResponse = await actionScannerService.onEmailReceived(
                    event.payload.emailId || `email-${Date.now()}`,
                    event.payload.threadId || `thread-${Date.now()}`,
                    userId
                );
                console.log(`[Simulator] Brain response for email: ${JSON.stringify(brainResponse)}`);
                break;

            case 'property_crud':
                if (event.payload.action === 'create') {
                    brainResponse = await prisma.property.create({
                        data: { ...event.payload.data, userId }
                    });
                } else if (event.payload.action === 'update') {
                    brainResponse = await prisma.property.update({
                        where: { id: event.payload.propertyId },
                        data: event.payload.data
                    });
                }
                outcomes = [brainResponse];
                break;

            case 'contact_crud':
                if (event.payload.action === 'create') {
                    brainResponse = await prisma.contact.create({
                        data: { ...event.payload.data, userId }
                    });
                } else if (event.payload.action === 'update') {
                    brainResponse = await prisma.contact.update({
                        where: { id: event.payload.contactId },
                        data: event.payload.data
                    });
                }
                outcomes = [brainResponse];
                break;

            case 'deal_crud':
                if (event.payload.action === 'create') {
                    brainResponse = await prisma.deal.create({
                        data: { ...event.payload.data, userId, nextActionOwner: 'agent', status: 'active', summary: 'Simulated deal' }
                    });
                } else if (event.payload.action === 'archive') {
                    brainResponse = await prisma.deal.updateMany({
                        where: { userId, status: 'active' }, // Simple mock for "last created"
                        data: { status: 'closed' }
                    });
                }
                outcomes = [brainResponse];
                break;

            case 'voice_note':
                await prisma.voiceNote.create({
                    data: {
                        id: event.payload.id,
                        userId,
                        audioUrl: 'mock-audio.mp3',
                        transcript: event.payload.transcript,
                        processingStatus: 'completed',
                        processedAt: new Date(),
                    }
                });

                brainResponse = await actionScannerService.onVoiceNoteCreated(
                    event.payload.id,
                    userId
                );
                break;

            case 'milestone':
                brainResponse = await actionScannerService.onPropertyMilestone(
                    event.payload.propertyId,
                    event.payload.type,
                    userId
                );
                break;

            case 'toggle_godmode':
                brainResponse = await godmodeService.updateSettings(userId, {
                    mode: event.payload.mode,
                    featureConfig: event.payload.features.reduce((acc: any, f: string) => ({ ...acc, [f]: event.payload.mode }), {})
                });
                break;
        }

        // Capture resulting actions/tasks
        outcomes = outcomes.length > 0 ? outcomes : await prisma.autonomousAction.findMany({
            where: { userId, createdAt: { gte: startTime } }
        });

        console.log(`[Simulator] ✨ Step outcomes: ${outcomes.length} actions/results captured.`);
        this.recordStep(`EVENT_${event.type.toUpperCase()}`, event.payload, brainResponse, outcomes);
    }

    private recordStep(step: string, input: any, response: any, outcomes: any[]) {
        this.auditLog?.steps.push({
            step,
            timestamp: new Date().toISOString(),
            input,
            brainResponse: response,
            outcomes
        });
    }

    public getAuditLog() {
        return this.auditLog;
    }
}

export const intelligenceSimulatorService = new IntelligenceSimulatorService();
