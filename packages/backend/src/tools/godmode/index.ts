/**
 * Godmode Tools Index
 * 
 * Exports all godmode domain tools and registers them with the tool registry.
 */

// Import all godmode tools (auto-registers on import)
import './get-pending.tool.js';
import './approve-action.tool.js';
import './dismiss-action.tool.js';

// Re-export for convenience
export { getPendingActionsTool } from './get-pending.tool.js';
export { approveActionTool } from './approve-action.tool.js';
export { dismissActionTool } from './dismiss-action.tool.js';
