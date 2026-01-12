/**
 * Tasks Tools Index
 * 
 * Exports all task domain tools and registers them with the tool registry.
 */

// Import all task tools (auto-registers on import)
import './list-tasks.tool.js';
import './get-task.tool.js';
import './create-task.tool.js';
import './update-task.tool.js';
import './delete-task.tool.js';
import './complete-task.tool.js';
import './reschedule-task.tool.js';
import './get-overdue-tasks.tool.js';
import './process-voice-note.tool.js';
import './search-task.tool.js';


// Re-export for convenience
export { listTasksTool } from './list-tasks.tool.js';
export { getTaskTool } from './get-task.tool.js';
export { createTaskTool } from './create-task.tool.js';
export { updateTaskTool } from './update-task.tool.js';
export { deleteTaskTool } from './delete-task.tool.js';
export { completeTaskTool } from './complete-task.tool.js';
export { rescheduleTaskTool } from './reschedule-task.tool.js';
export { getOverdueTasksTool } from './get-overdue-tasks.tool.js';
export { processVoiceNoteTool } from './process-voice-note.tool.js';
export { searchTaskTool } from './search-task.tool.js';

