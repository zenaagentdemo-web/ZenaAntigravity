/**
 * Tool Bundles
 * 
 * Predefined bundles of tools for domain-scoped loading.
 * The agent dynamically loads bundles based on user intent and session context.
 */

import { ToolBundle } from './types.js';
import { toolRegistry } from './registry.js';

/**
 * Inbox tools for email management
 */
export const INBOX_BUNDLE: ToolBundle = {
    name: 'inbox',
    tools: [
        'inbox.list_threads',
        'inbox.get_thread',
        'inbox.draft_reply',
        'inbox.send_reply',
        'inbox.archive_thread',
        'inbox.unarchive_thread',
        'inbox.snooze_thread',
        'inbox.classify_thread',
        'inbox.link_to_property',
        'inbox.link_to_contact',
        'inbox.move_to_awaiting'
    ],
    policy: {
        maxToolsPerTurn: 3,
        requiresContext: 'thread'
    }
};

/**
 * Deal tools for deal flow management
 */
export const DEALS_BUNDLE: ToolBundle = {
    name: 'deals',
    tools: [
        'deal.list',
        'deal.get',
        'deal.search',
        'deal.create',
        'deal.update',
        'deal.update_stage',
        'deal.update_conditions',
        'deal.update_risk',
        'deal.add_note',
        'deal.archive',
        'deal.unarchive',
        'deal.delete',
        'deal.assign_contact',
        'deal.remove_contact',
        'deal.generate_report'
    ],
    policy: {
        maxToolsPerTurn: 2,
        requiresContext: 'deal'
    }
};

/**
 * Contact tools for CRM management
 */
export const CONTACTS_BUNDLE: ToolBundle = {
    name: 'contacts',
    tools: [
        'contact.list',
        'contact.get',
        'contact.search',
        'contact.create',
        'contact.update',
        'contact.add_note',
        'contact.add_relationship_note',
        'contact.archive',
        'contact.unarchive',
        'contact.delete',
        'contact.run_discovery',
        'contact.recategorize',
        'contact.link_to_property'
    ],

    policy: {
        maxToolsPerTurn: 2,
        requiresContext: 'contact'
    }
};

/**
 * Property tools for property management
 */
export const PROPERTIES_BUNDLE: ToolBundle = {
    name: 'properties',
    tools: [
        'property.list',
        'property.get',
        'property.search',
        'property.create',
        'property.update',
        'property.delete',
        'property.add_milestone',
        'property.update_milestone',
        'property.delete_milestone',
        'property.refresh_intelligence',
        'property.generate_comparables',
        'property.link_vendor',
        'property.generate_report'
    ],

    policy: {
        maxToolsPerTurn: 2,
        requiresContext: 'property'
    }
};

/**
 * Task tools for task management
 */
export const TASKS_BUNDLE: ToolBundle = {
    name: 'tasks',
    tools: [
        'task.list',
        'task.get',
        'task.search',
        'task.create',
        'task.update',
        'task.complete',
        'task.delete',
        'task.reschedule',
        'task.link_to_deal'
    ],
    policy: {
        maxToolsPerTurn: 3
    }
};

/**
 * Calendar tools for scheduling
 */
export const CALENDAR_BUNDLE: ToolBundle = {
    name: 'calendar',
    tools: [
        'calendar.list_events',
        'calendar.get_event',
        'calendar.create_event',
        'calendar.update_event',
        'calendar.delete_event',
        'calendar.reschedule',
        'calendar.optimize_day'
    ],
    policy: {
        maxToolsPerTurn: 2
    }
};

/**
 * Core tools always available
 */
export const CORE_BUNDLE: ToolBundle = {
    name: 'core',
    tools: [
        // Navigation
        'core.get_dashboard',
        'core.search'
    ],
    policy: {
        maxToolsPerTurn: 1
    }
};

/**
 * Export tools for data export
 */
export const EXPORT_BUNDLE: ToolBundle = {
    name: 'export',
    tools: [
        'export.contacts',
        'export.properties',
        'export.deals'
    ],
    policy: {
        maxToolsPerTurn: 1
    }
};

/**
 * Godmode tools for autonomous action management
 */
export const GODMODE_BUNDLE: ToolBundle = {
    name: 'godmode',
    tools: [
        'godmode.get_pending',
        'godmode.approve',
        'godmode.dismiss'
    ],
    policy: {
        maxToolsPerTurn: 3
    }
};

/**
 * Voice Notes tools for audio note management
 */
export const VOICE_NOTES_BUNDLE: ToolBundle = {
    name: 'voice_notes',
    tools: [
        'voice_note.list',
        'voice_note.get',
        'voice_note.upload'
    ],
    policy: {
        maxToolsPerTurn: 2
    }
};

/**
 * All bundles
 */
export const ALL_BUNDLES = {
    inbox: INBOX_BUNDLE,
    deals: DEALS_BUNDLE,
    contacts: CONTACTS_BUNDLE,
    properties: PROPERTIES_BUNDLE,
    tasks: TASKS_BUNDLE,
    calendar: CALENDAR_BUNDLE,
    core: CORE_BUNDLE,
    export: EXPORT_BUNDLE,
    godmode: GODMODE_BUNDLE,
    voice_notes: VOICE_NOTES_BUNDLE
};

/**
 * Register all bundles with the registry
 */
export function registerAllBundles(): void {
    for (const bundle of Object.values(ALL_BUNDLES)) {
        toolRegistry.registerBundle(bundle);
    }
    console.log(`[ToolBundles] Registered ${Object.keys(ALL_BUNDLES).length} tool bundles`);
}
