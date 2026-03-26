/**
 * MCP Server Implementation
 * Model Context Protocol server for IDE integration (VS Code, Claude Desktop)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ReadResourceRequest,
} from '@modelcontextprotocol/sdk/types.js';

import { createLogger } from '../observability/logger';
import { getMCPResources, readMCPResource } from './resources';
import { getMCPTools, executeMCPTool } from './tools';

const log = createLogger('mcp-server');

/**
 * MCP Server configuration
 */
export interface MCPServerConfig {
  name?: string;
  version?: string;
  debugLevel?: 'debug' | 'info' | 'warn' | 'error';
}

const DEFAULT_CONFIG: Required<MCPServerConfig> = {
  name: 'vaidya-agent-mcp',
  version: '1.0.0',
  debugLevel: 'info',
};

/**
 * Create and configure MCP server
 */
export function createMCPServer(config?: MCPServerConfig): Server {
  const serverConfig = { ...DEFAULT_CONFIG, ...config };

  const server = new Server(
    {
      name: serverConfig.name,
      version: serverConfig.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // Register handlers
  registerResourceHandlers(server);
  registerToolHandlers(server);

  log.info('MCP server created', {
    name: serverConfig.name,
    version: serverConfig.version,
  });

  return server;
}

/**
 * Register resource handlers
 */
function registerResourceHandlers(server: Server): void {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    log.debug('Listing MCP resources');
    
    const resources = await getMCPResources();
    
    return {
      resources: resources.map(r => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      })),
    };
  });

  // Read a specific resource
  server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
    const { uri } = request.params;
    log.debug('Reading MCP resource', { uri });

    try {
      const content = await readMCPResource(uri);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: typeof content === 'string' ? content : JSON.stringify(content, null, 2),
          },
        ],
      };
    } catch (error) {
      log.error('Failed to read resource', error instanceof Error ? error : new Error(String(error)), { uri });
      throw error;
    }
  });
}

/**
 * Register tool handlers
 */
function registerToolHandlers(server: Server): void {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log.debug('Listing MCP tools');
    
    const tools = getMCPTools();
    
    return {
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  // Execute a tool
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;
    log.debug('Executing MCP tool', { name });

    try {
      const result = await executeMCPTool(name, args || {});
      
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      log.error('Tool execution failed', error instanceof Error ? error : new Error(String(error)), { name });
      
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });
}

/**
 * Start MCP server with stdio transport
 */
export async function startMCPServer(config?: MCPServerConfig): Promise<void> {
  const server = createMCPServer(config);
  const transport = new StdioServerTransport();

  log.info('Starting MCP server with stdio transport');

  await server.connect(transport);

  log.info('MCP server connected and ready');

  // Handle shutdown
  process.on('SIGINT', async () => {
    log.info('Shutting down MCP server');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    log.info('Shutting down MCP server');
    await server.close();
    process.exit(0);
  });
}

/**
 * Export server creation for testing
 */
export { Server };
