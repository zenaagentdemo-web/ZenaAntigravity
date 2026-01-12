/**
 * Tools Index
 * 
 * Main entry point for the Zena Agent tool system.
 * Imports all tools and registers them with the registry.
 */

// Export core types
export * from './types.js';

// Export registry
import { toolRegistry } from './registry.js';
export { toolRegistry };

// Export bundles
export * from './bundles.js';

// Import domain tools to trigger auto-registration
import './inbox/index.js';
import './deals/index.js';
import './contacts/index.js';
import './tasks/index.js';
import './properties/index.js';
import './calendar/index.js';
import './portfolio/index.js';
import './memory/index.js';
import './export/index.js';
import './godmode/index.js';
import './voice-notes/index.js';

// Register all bundles
import { registerAllBundles } from './bundles.js';
registerAllBundles();

// 🧠 ZENA GLOBAL HARMONIZATION: Alias tools for bundle and legacy compatibility
// This ensures multi-action chains work regardless of naming variations
import { listCalendarEventsTool, getCalendarEventTool, createCalendarEventTool, updateCalendarEventTool, deleteCalendarEventTool } from './calendar/index.js';
import { updateTaskTool, createTaskTool, listTasksTool } from './tasks/index.js';
import { getDealBriefTool, analyzeDealTool } from './deals/index.js';
import { createContactTool, updateContactTool, listContactsTool } from './contacts/index.js';
import { createPropertyTool, updatePropertyTool, listPropertiesTool, generatePropertyReportTool } from './properties/index.js';
import { portfolioGetGlobalBrief } from './portfolio/index.js';
import { searchMemoryTool } from './memory/index.js';

// --- CORE ---
toolRegistry.register({ ...portfolioGetGlobalBrief, name: 'core.get_dashboard' });
toolRegistry.register({ ...searchMemoryTool, name: 'core.search' });

// --- DEALS ---
toolRegistry.register({ ...getDealBriefTool, name: 'deal.generate_report' });
toolRegistry.register({ ...analyzeDealTool, name: 'deal.update_risk' });

// --- CALENDAR ---
toolRegistry.register({ ...listCalendarEventsTool, name: 'calendar.list_events' });
toolRegistry.register({ ...getCalendarEventTool, name: 'calendar.get_event' });
toolRegistry.register({ ...createCalendarEventTool, name: 'calendar.create_event' });
toolRegistry.register({ ...updateCalendarEventTool, name: 'calendar.update_event' });
toolRegistry.register({ ...deleteCalendarEventTool, name: 'calendar.delete_event' });
toolRegistry.register({ ...updateCalendarEventTool, name: 'calendar.reschedule' });

// --- TASKS ---
toolRegistry.register({ ...listTasksTool, name: 'task.list_tasks' });
toolRegistry.register({ ...createTaskTool, name: 'task.create_task' });
toolRegistry.register({ ...updateTaskTool, name: 'task.update_task' });
toolRegistry.register({ ...updateTaskTool, name: 'task.link_to_deal' });

// --- CONTACTS ---
toolRegistry.register({ ...listContactsTool, name: 'contact.list_contacts' });
toolRegistry.register({ ...createContactTool, name: 'contact.create_contact' });
toolRegistry.register({ ...updateContactTool, name: 'contact.update_contact' });

// --- PROPERTIES ---
toolRegistry.register({ ...listPropertiesTool, name: 'property.list_properties' });
toolRegistry.register({ ...createPropertyTool, name: 'property.create_property' });
toolRegistry.register({ ...updatePropertyTool, name: 'property.update_property' });

// Log stats on import
const stats = toolRegistry.getStats();
console.log(`[Tools] Agent tool system initialized: ${stats.totalTools} tools across ${Object.keys(stats.toolsByDomain).length} domains`);
