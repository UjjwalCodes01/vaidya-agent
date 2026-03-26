#!/usr/bin/env npx ts-node
/**
 * MCP Server CLI Entry Point
 * Starts the MCP server for IDE integration
 * 
 * Usage:
 *   npm run mcp
 *   npx ts-node scripts/mcp-server.ts
 */

import { startMCPServer } from '../lib/mcp/server';
import { initializeSecrets } from '../lib/security/secrets-manager';
import { configureLogger } from '../lib/observability/logger';

async function main(): Promise<void> {
  // Configure logging for MCP (quieter for stdio communication)
  configureLogger({
    minLevel: process.env.MCP_DEBUG_LEVEL === 'debug' ? 'DEBUG' : 'WARNING',
    prettyPrint: false,
  });

  // Log startup to stderr (stdout is used for MCP communication)
  console.error('[MCP] Vaidya-Agent MCP Server starting...');

  try {
    // Initialize secrets (loads JWT config, etc.)
    await initializeSecrets();
    console.error('[MCP] Secrets initialized');

    // Start MCP server
    await startMCPServer({
      name: 'vaidya-agent-mcp',
      version: '1.0.0',
      debugLevel: (process.env.MCP_DEBUG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    });

    console.error('[MCP] Server running. Ready for connections.');
  } catch (error) {
    console.error('[MCP] Failed to start server:', error);
    process.exit(1);
  }
}

// Run
main();
