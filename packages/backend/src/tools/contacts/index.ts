/**
 * Contacts Tools Index
 * 
 * Exports all contact domain tools and registers them with the tool registry.
 */

// Import all contact tools (auto-registers on import)
import './list-contacts.tool.js';
import './get-contact.tool.js';
import './create-contact.tool.js';
import './update-contact.tool.js';
import './delete-contact.tool.js';
import './archive-contact.tool.js';
import './add-relationship-note.tool.js';
import './get-brief.tool.js';
import './run-discovery.tool.js';
import './recategorize-contact.tool.js';
import './bulk-delete-contacts.tool.js';
import './bulk-update-contacts.tool.js';
import './search-contact.tool.js';
import './link-to-property.tool.js';


// Re-export for convenience
export { listContactsTool } from './list-contacts.tool.js';
export { getContactTool } from './get-contact.tool.js';
export { createContactTool } from './create-contact.tool.js';
export { updateContactTool } from './update-contact.tool.js';
export { deleteContactTool } from './delete-contact.tool.js';
export { archiveContactTool } from './archive-contact.tool.js';
export { addRelationshipNoteTool } from './add-relationship-note.tool.js';
export { getContactBriefTool } from './get-brief.tool.js';
export { runDiscoveryTool } from './run-discovery.tool.js';
export { recategorizeContactTool } from './recategorize-contact.tool.js';
export { bulkDeleteContactsTool } from './bulk-delete-contacts.tool.js';
export { bulkUpdateContactsTool } from './bulk-update-contacts.tool.js';
export { linkToPropertyTool } from './link-to-property.tool.js';

