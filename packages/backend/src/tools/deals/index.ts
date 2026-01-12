/**
 * Deals Tools Index
 * 
 * Exports all deal domain tools and registers them with the tool registry.
 */

// Import all deal tools (auto-registers on import)
import './list-deals.tool.js';
import './get-deal.tool.js';
import './create-deal.tool.js';
import './update-deal.tool.js';
import './delete-deal.tool.js';
import './update-stage.tool.js';
import './update-conditions.tool.js';
import './assign-contact.tool.js';
import './remove-contact.tool.js';
import './analyze-deal.tool.js';
import './archive-deal.tool.js';
import './unarchive-deal.tool.js';
import './add-note.tool.js';
import './get-brief.tool.js';
import './bulk-archive-deals.tool.js';
import './bulk-delete-deals.tool.js';
import './search-deal.tool.js';

// Re-export for convenience
export { listDealsTool } from './list-deals.tool.js';
export { getDealTool } from './get-deal.tool.js';
export { createDealTool } from './create-deal.tool.js';
export { updateDealTool } from './update-deal.tool.js';
export { deleteDealTool } from './delete-deal.tool.js';
export { updateStageTool } from './update-stage.tool.js';
export { updateConditionsTool } from './update-conditions.tool.js';
export { assignContactTool } from './assign-contact.tool.js';
export { removeContactTool } from './remove-contact.tool.js';
export { analyzeDealTool } from './analyze-deal.tool.js';
export { archiveDealTool } from './archive-deal.tool.js';
export { unarchiveDealTool } from './unarchive-deal.tool.js';
export { addNoteTool } from './add-note.tool.js';
export { getDealBriefTool } from './get-brief.tool.js';
export { bulkArchiveDealsTool } from './bulk-archive-deals.tool.js';
export { bulkDeleteDealsTool } from './bulk-delete-deals.tool.js';

// 🧠 ZENA ALIASES: High-level mappings for bundle compatibility
import { toolRegistry } from '../registry.js';
import { getDealBriefTool } from './get-brief.tool.js';
import { analyzeDealTool } from './analyze-deal.tool.js';

// Register aliases
toolRegistry.register({ ...getDealBriefTool, name: 'deal.generate_report' });
toolRegistry.register({ ...analyzeDealTool, name: 'deal.update_risk' });
