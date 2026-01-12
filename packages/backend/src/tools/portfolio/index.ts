import { toolRegistry } from '../registry.js';
import { portfolioGetBrief } from './get_brief.tool.js';
import { portfolioGetGlobalBrief } from './get_global_brief.tool.js';

// Register tools
toolRegistry.register(portfolioGetBrief);
toolRegistry.register(portfolioGetGlobalBrief);

export { portfolioGetBrief, portfolioGetGlobalBrief };
