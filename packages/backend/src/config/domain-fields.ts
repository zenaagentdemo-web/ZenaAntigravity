export interface FieldDefinition {
    key: string;            // Property key (e.g., 'email', 'metadata.location')
    label: string;          // Human readable label
    required: boolean;      // Is this field strictly required for the entity to function?
    priority: 'critical' | 'high' | 'medium' | 'low'; // How important is this gap?
    question: string;       // Context-aware question to ask if missing
    contextKeys?: string[]; // Alternative keys to check (e.g., synonyms)
    condition?: (data: any) => boolean; // Logic to determine if this field is relevant
}

export type DomainFieldSchema = Record<string, FieldDefinition[]>;

/**
 * Zena's "Brain Map" of Domain Fields.
 * This is the source of truth for Proactiveness.
 */
export const DOMAIN_FIELD_LIBRARY: DomainFieldSchema = {
    // ------------------------------------------------------------------
    // 1. CONTACTS
    // ------------------------------------------------------------------
    'contact': [
        // Identity
        {
            key: 'name',
            label: 'Full Name',
            required: true,
            priority: 'critical',
            question: "What is the contact's full name?"
        },
        {
            key: 'role',
            label: 'Role',
            required: true,
            priority: 'critical',
            question: "What is their role? (e.g., Vendor, Buyer, Lawyer, Tenant)"
        },
        // Communication
        {
            key: 'emails',
            label: 'Email Address',
            required: false,
            priority: 'high',
            question: "Do you have an email address for them?",
            contextKeys: ['email'] // Check singular 'email' too
        },
        {
            key: 'phones',
            label: 'Phone Number',
            required: false,
            priority: 'high',
            question: "Do you have a mobile number for them?",
            contextKeys: ['phone']
        },
        // Buyer Intelligence
        {
            key: 'zenaIntelligence.location',
            label: 'Location Preference',
            required: false,
            priority: 'medium',
            question: "What areas are they interested in?",
            condition: (data) => data.role?.toLowerCase() === 'buyer'
        },
        {
            key: 'zenaIntelligence.minBudget',
            label: 'Min Budget',
            required: false,
            priority: 'medium',
            question: "Do they have a minimum budget?",
            condition: (data) => data.role?.toLowerCase() === 'buyer'
        },
        {
            key: 'zenaIntelligence.maxBudget',
            label: 'Max Budget',
            required: false,
            priority: 'medium',
            question: "What is their maximum budget?",
            condition: (data) => data.role?.toLowerCase() === 'buyer'
        }
    ],

    // ------------------------------------------------------------------
    // 2. PROPERTIES
    // ------------------------------------------------------------------
    'property': [
        {
            key: 'address',
            label: 'Address',
            required: true,
            priority: 'critical',
            question: "What is the property address?"
        },
        {
            key: 'type',
            label: 'Property Type',
            required: false,
            priority: 'high',
            question: "Is this Residential, Commercial, or Lifestyle?"
        },
        {
            key: 'bedrooms',
            label: 'Bedrooms',
            required: false,
            priority: 'high',
            question: "How many bedrooms?"
        },
        {
            key: 'bathrooms',
            label: 'Bathrooms',
            required: false,
            priority: 'high',
            question: "How many bathrooms?"
        },
        {
            key: 'listingPrice',
            label: 'Listing Price',
            required: false,
            priority: 'medium',
            question: "Is there a listing price or estimate?"
        }
    ],

    // ------------------------------------------------------------------
    // 3. DEAL FLOW (Pipeline)
    // ------------------------------------------------------------------
    'deal': [
        {
            key: 'pipelineType',
            label: 'Pipeline Type',
            required: true,
            priority: 'critical',
            question: "Is this a Buyer or Seller deal?"
        },
        {
            key: 'propertyId',
            label: 'Property',
            required: true,
            priority: 'critical',
            question: "Which property is this deal for?",
            contextKeys: ['propertyAddress', 'property']
        },
        {
            key: 'saleMethod',
            label: 'Sale Method',
            required: false,
            priority: 'high',
            question: "What is the sale method? (Auction, Tender, Negotiation)",
            condition: (data) => data.pipelineType === 'seller'
        },
        {
            key: 'dealValue',
            label: 'Deal Value',
            required: false,
            priority: 'medium',
            question: "What is the estimated total deal value?"
        }
    ],

    // ------------------------------------------------------------------
    // 4. CALENDAR (Appointments)
    // ------------------------------------------------------------------
    'calendar': [
        {
            key: 'title',
            label: 'Title',
            required: true,
            priority: 'critical',
            question: "What should I title this event?"
        },
        {
            key: 'time',
            label: 'Start Time',
            required: true,
            priority: 'critical',
            question: "What time does it start?"
        },
        {
            key: 'endTime',
            label: 'End Time',
            required: true,
            priority: 'critical',
            question: "When does it end? (or how long is it?)"
        },
        {
            key: 'type',
            label: 'Event Type',
            required: true,
            priority: 'high',
            question: "Is this a Meeting, Open Home, Viewing, or Auction?"
        },
        {
            key: 'location',
            label: 'Location',
            required: false,
            priority: 'high',
            question: "Where is this taking place?",
            contextKeys: ['metadata.location', 'event.metadata.location']
        },
        {
            key: 'contactId',
            label: 'Linked Contact',
            required: false,
            priority: 'high',
            question: "Who are you meeting with?"
        }
    ],

    // Alias for consistency
    'calendar_event': [],

    // ------------------------------------------------------------------
    // 5. TASKS
    // ------------------------------------------------------------------
    'task': [
        {
            key: 'label',
            label: 'Task Name',
            required: true,
            priority: 'critical',
            question: "What is the task?"
        },
        {
            key: 'dueDate',
            label: 'Due Date',
            required: false,
            priority: 'high',
            question: "When is this due?"
        },
        {
            key: 'priority',
            label: 'Priority',
            required: false,
            priority: 'medium',
            question: "Is this High, Medium, or Low priority?"
        },
        {
            key: 'dealId',
            label: 'Linked Deal',
            required: false,
            priority: 'low',
            question: "Is this related to a specific deal?"
        }
    ],

    // ------------------------------------------------------------------
    // 6. INBOX (Emails)
    // ------------------------------------------------------------------
    'inbox': [
        {
            key: 'to',
            label: 'Recipient',
            required: true,
            priority: 'critical',
            question: "Who should I send this to?",
            contextKeys: ['recipient', 'email']
        },
        {
            key: 'subject',
            label: 'Subject',
            required: true,
            priority: 'critical',
            question: "What is the subject of the email?"
        },
        {
            key: 'body',
            label: 'Message',
            required: true,
            priority: 'critical',
            question: "What should I say in the email?",
            contextKeys: ['content', 'message']
        }
    ],
    // ------------------------------------------------------------------
    // 5. MARKETING
    // ------------------------------------------------------------------
    'marketing': [
        {
            key: 'campaign.scheduled',
            label: 'Marketing Schedule',
            required: false,
            priority: 'high',
            question: "Shall I generate the marketing campaign schedule (Photos, Signboard, Launch)?",
            condition: (data) => data.status === 'active'
        },
        {
            key: 'campaign.copy',
            label: 'Ad Copy',
            required: false,
            priority: 'medium',
            question: "Do you need the listing description written?"
        }
    ],

    // ------------------------------------------------------------------
    // 6. VENDOR REPORTING
    // ------------------------------------------------------------------
    'vendor_reporting': [
        {
            key: 'lastReportDate',
            label: 'Weekly Report',
            required: false,
            priority: 'medium',
            question: "Shall I compile and send the weekly vendor report?",
            // Simple check: if we are in a deal context and it's active
            condition: (data) => data.status === 'active' || data.stage === 'marketing'
        }
    ]
};

// Map alias
DOMAIN_FIELD_LIBRARY['calendar_event'] = DOMAIN_FIELD_LIBRARY['calendar'];
DOMAIN_FIELD_LIBRARY['email'] = DOMAIN_FIELD_LIBRARY['inbox'];
