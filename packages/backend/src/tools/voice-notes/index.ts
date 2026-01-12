/**
 * Voice Notes Tools Index
 * 
 * Exports all voice note domain tools and registers them with the tool registry.
 */

// Import all voice note tools (auto-registers on import)
import './list-voice-notes.tool.js';
import './get-voice-note.tool.js';
import './upload-voice-note.tool.js';

// Re-export for convenience
export { listVoiceNotesTool } from './list-voice-notes.tool.js';
export { getVoiceNoteTool } from './get-voice-note.tool.js';
export { uploadVoiceNoteTool } from './upload-voice-note.tool.js';
