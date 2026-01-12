/**
 * Inbox Tools Index
 * 
 * Exports all inbox domain tools and registers them with the tool registry.
 */

// Import all inbox tools (auto-registers on import)
import './list-threads.tool.js';
import './get-thread.tool.js';
import './get-messages.tool.js';
import './archive-thread.tool.js';
import './unarchive-thread.tool.js';
import './snooze-thread.tool.js';
import './classify-thread.tool.js';
import './move-to-awaiting.tool.js';
import './link-to-property.tool.js';
import './link-to-contact.tool.js';
import './draft-reply.tool.js';
import './send-reply.tool.js';
import './regenerate-draft.tool.js';
import './search-inbox.tool.js';

// Re-export for convenience
export { listThreadsTool } from './list-threads.tool.js';
export { getThreadTool } from './get-thread.tool.js';
export { getMessagesTool } from './get-messages.tool.js';
export { archiveThreadTool } from './archive-thread.tool.js';
export { unarchiveThreadTool } from './unarchive-thread.tool.js';
export { snoozeThreadTool } from './snooze-thread.tool.js';
export { classifyThreadTool } from './classify-thread.tool.js';
export { moveToAwaitingTool } from './move-to-awaiting.tool.js';
export { linkToPropertyTool } from './link-to-property.tool.js';
export { linkToContactTool } from './link-to-contact.tool.js';
export { draftReplyTool } from './draft-reply.tool.js';
export { sendReplyTool } from './send-reply.tool.js';
export { regenerateDraftTool } from './regenerate-draft.tool.js';
export { searchInboxTool } from './search-inbox.tool.js';
