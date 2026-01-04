// Export registry and types
export * from './types.js';
export * from './action-registry.js';

// Import strategies to trigger auto-registration
import './strategies/generate-weekly-report.strategy.js';
import './strategies/buyer-match.strategy.js';
import './strategies/schedule-viewing.strategy.js';
// Add future strategies here
