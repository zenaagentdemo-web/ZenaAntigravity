/**
 * ActivityLogger - Utility for generating CRM timeline events from UI interactions
 */

import { DealContact } from '../types';

export type EventType = 'call' | 'sms' | 'email' | 'meeting' | 'note' | 'system' | 'condition_met' | 'marketing' | 'offer';

export interface TimelineEvent {
    id: string;
    type: EventType;
    title: string;
    description: string;
    timestamp: string;
    actor?: string;
    contactId?: string;
}

export const logActivity = (
    type: EventType,
    title: string,
    description: string,
    contact?: DealContact
): TimelineEvent => {
    return {
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        description,
        timestamp: new Date().toISOString(),
        actor: 'You',
        contactId: contact?.id,
    };
};
