import { ScenarioDefinition } from './intelligence-simulator.service.js';

/**
 * SCENARIO 1: The Agency Architect (CRUD & Setup)
 * 
 * Goal: Test 100% of creation, editing, and deletion logic for core entities.
 */
export const AGENCY_ARCHITECT_SCENARIO: ScenarioDefinition = {
    name: 'The Agency Architect',
    description: 'Exhaustive test of Property, Contact, and Deal CRUD operations, including archiving and role transitions.',
    personas: [
        { id: 'vicki-vendor', name: 'Vicki Vendor', email: 'vicki@example.com', role: 'vendor' },
        { id: 'benny-buyer', name: 'Benny Buyer', email: 'benny@example.com', role: 'buyer' }
    ],
    properties: [
        { id: 'cloud-st', address: '123 Cloud St', listingPrice: 1250000, status: 'listing' }
    ],
    events: [
        {
            type: 'property_crud',
            delayMs: 100,
            payload: { action: 'create', data: { address: '45 Oak Ave', listingPrice: 850000, status: 'listing' } }
        },
        {
            type: 'contact_crud',
            delayMs: 100,
            payload: { action: 'update', contactId: 'benny-buyer', data: { role: 'hot_buyer', phones: ['021 555 1234'] } }
        },
        {
            type: 'deal_crud',
            delayMs: 100,
            payload: { action: 'create', data: { propertyId: 'cloud-st', stage: 'lead', pipelineType: 'seller' } }
        },
        {
            type: 'deal_crud',
            delayMs: 100,
            payload: { action: 'archive', dealId: 'last-created-deal' }
        }
    ]
};

/**
 * SCENARIO 2: The Hyper-Focus Pulse (Inbox & Comms)
 * 
 * Goal: Test every button and filter in the Inbox ecosystem.
 */
export const HYPER_FOCUS_PULSE_SCENARIO: ScenarioDefinition = {
    name: 'The Hyper-Focus Pulse',
    description: 'Deep dive into Inbox tabs, filters, reply styles, and batch operations.',
    personas: [
        { id: 'sally-spam', name: 'Sally Spam', email: 'spam@marketing.com', role: 'other' },
        { id: 'urgent-buyer', name: 'Urgent Buyer', email: 'urgent@example.com', role: 'buyer' }
    ],
    properties: [],
    events: [
        {
            type: 'email',
            delayMs: 100,
            payload: {
                emailId: 'e-spam', threadId: 't-spam', from: 'spam@marketing.com',
                subject: 'Cheap Rolex Watches', body: 'Buy now and save 90%!'
            }
        },
        {
            type: 'email',
            delayMs: 100,
            payload: {
                emailId: 'e-urgent', threadId: 't-urgent', from: 'urgent@example.com',
                subject: 'OFFER: 123 Cloud St', body: 'I want to make an unconditional offer of $1.3M for Cloud St.'
            }
        },
        {
            type: 'inbox_action',
            delayMs: 200,
            payload: { action: 'reply', threadId: 't-urgent', tone: 'professional' }
        },
        {
            type: 'inbox_action',
            delayMs: 200,
            payload: { action: 'batch_archive', threadIds: ['t-spam'] }
        }
    ]
};

/**
 * SCENARIO 3: The Neural Commander (Approvals & God Mode)
 * 
 * Goal: Test Command Center and God Mode authority transitions.
 */
export const NEURAL_COMMANDER_SCENARIO: ScenarioDefinition = {
    name: 'The Neural Commander',
    description: 'Verifies God Mode toggle safety, approval queue interaction, and history filtering.',
    personas: [
        { id: 'benny-buyer', name: 'Benny Buyer', email: 'benny@example.com', role: 'buyer' }
    ],
    properties: [
        { id: 'prop-1', address: '1 Neural Path', listingPrice: 500000, status: 'listing' }
    ],
    events: [
        {
            type: 'toggle_godmode',
            delayMs: 100,
            payload: { mode: 'full_god', features: ['inbox:draft_reply'] }
        },
        {
            type: 'email',
            delayMs: 100,
            payload: { from: 'benny@example.com', subject: 'Confirming viewing', body: 'I will be there.' }
        },
        {
            type: 'approval_action',
            delayMs: 500,
            payload: { action: 'approve', actionType: 'send_email' }
        }
    ]
};

/**
 * SCENARIO 4: The Transactional Detailer (Sub-pages & Milestones)
 * 
 * Goal: Exhaustive coverage of Detail pages, checklists, and milestones.
 */
export const TRANSACTIONAL_DETAILER_SCENARIO: ScenarioDefinition = {
    name: 'The Transactional Detailer',
    description: 'Tests condition checklists, milestone creation, and financial updates on detail pages.',
    personas: [
        { id: 'vicki-vendor', name: 'Vicki Vendor', email: 'vicki@example.com', role: 'vendor' }
    ],
    properties: [
        { id: 'pine-rd', address: '12 Pine Rd', listingPrice: 2100000, status: 'listing' }
    ],
    events: [
        {
            type: 'milestone',
            delayMs: 100,
            payload: { propertyId: 'pine-rd', type: 'open_home', date: new Date().toISOString() }
        },
        {
            type: 'deal_update',
            delayMs: 200,
            payload: {
                propertyId: 'pine-rd',
                data: { checklist: { 'Finance': 'completed', 'Building': 'pending' }, commission: 45000 }
            }
        },
        {
            type: 'neural_pulse',
            delayMs: 100,
            payload: { entityType: 'property', entityId: 'pine-rd' }
        }
    ]
};

/**
 * SCENARIO 5: The Time-Space Optimizer (Calendar & Tasks)
 * 
 * Goal: Test scheduling, task prioritization, and AI optimization.
 */
export const TIME_SPACE_OPTIMIZER_SCENARIO: ScenarioDefinition = {
    name: 'The Time-Space Optimizer',
    description: 'Tests AI-driven calendar optimization and high-priority task generation from varied sources.',
    personas: [
        { id: 'vicki-vendor', name: 'Vicki Vendor', email: 'vicki@example.com', role: 'vendor' }
    ],
    properties: [],
    events: [
        {
            type: 'voice_note',
            delayMs: 100,
            payload: { id: 'vn-urgent', transcript: 'URGENT: Need to call Vicki about the Pine Rd settlement today at 4 PM.' }
        },
        {
            type: 'calendar_action',
            delayMs: 300,
            payload: { action: 'optimize', date: new Date().toISOString() }
        },
        {
            type: 'task_action',
            delayMs: 100,
            payload: { action: 'create_manual', title: 'Buy Gift for Vendor', priority: 'high' }
        }
    ]
};
