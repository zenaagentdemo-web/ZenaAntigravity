/**
 * MCP Bridge Service
 * 
 * Standardizes connection to external MCP servers and bridges them 
 * to Zena's internal tool registry.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { toolRegistry } from "../tools/registry.js";
import { ZenaToolDefinition } from "../tools/types.js";
import { logger } from "./logger.service.js";

class MCPBridgeService {
    private clients: Map<string, Client> = new Map();

    /**
     * Connect to an MCP server (e.g., via stdio/npx)
     */
    async connectSkill(name: string, command: string, args: string[] = []): Promise<void> {
        try {
            logger.info(`[MCPBridge] Connecting to skill: ${name} (${command} ${args.join(' ')})`);
            const transport = new StdioClientTransport({ command, args });
            const client = new Client({
                name: "Zena-Agent",
                version: "1.0.0"
            }, {
                capabilities: {
                    tools: {},
                    resources: {}
                }
            });

            await client.connect(transport);
            this.clients.set(name, client);

            // 1. Fetch available tools from the MCP server
            const { tools } = await client.listTools();

            // 2. Register each MCP tool into Zena's ToolRegistry
            for (const mcpTool of tools) {
                const zenaTool: ZenaToolDefinition = {
                    name: `${name}_${mcpTool.name}`, // Namespace to avoid collisions
                    description: mcpTool.description || "",
                    domain: name, // Domain is the skill name (e.g., 'github')
                    inputSchema: mcpTool.inputSchema as any,
                    outputSchema: { type: 'object' }, // Default output schema
                    permissions: [], // MCP tools handle their own permissions/auth
                    requiresApproval: false, // Default to no approval for read tools
                    isMCP: true, // Tag as MCP tool for routing
                    execute: async (args, context) => {
                        logger.info(`[MCPBridge] Executing MCP tool: ${name}_${mcpTool.name}`);
                        const result = await client.callTool({
                            name: mcpTool.name,
                            arguments: args
                        });
                        return {
                            success: !result.isError,
                            data: result.content
                        };
                    },
                    auditLogFormat: (input, output) => ({
                        action: `${name}_${mcpTool.name}`,
                        summary: `Executed MCP tool ${mcpTool.name} from skill ${name}`,
                        metadata: { input, success: output.success }
                    })
                };
                toolRegistry.register(zenaTool);
            }

            logger.info(`[MCPBridge] 🔌 Linked Skill: ${name} with ${tools.length} tools`);
        } catch (error) {
            logger.error(`[MCPBridge] Failed to connect to skill ${name}:`, error);
            throw error;
        }
    }

    /**
     * List all connected skills
     */
    getConnectedSkills(): string[] {
        return Array.from(this.clients.keys());
    }

    /**
     * Shutdown all MCP connections
     */
    async shutdown(): Promise<void> {
        for (const [name, client] of this.clients) {
            try {
                await client.close();
            } catch (err) {
                logger.error(`[MCPBridge] Error closing client ${name}:`, err);
            }
        }
        this.clients.clear();
    }
}

export const mcpBridge = new MCPBridgeService();
