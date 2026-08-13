#!/usr/bin/env node
/**
 * Entry point.
 *
 * THE ONE RULE OF A STDIO MCP SERVER: stdout belongs to the protocol. Every
 * byte written there must be JSON-RPC. A stray console.log — including one
 * from a dependency — corrupts the stream and the client drops the connection
 * with an error that points nowhere near the real cause. So: all diagnostics
 * go to stderr, which hosts surface as the server's log.
 *
 * This file wires things together and does nothing else. Tools, resources, and
 * prompts each own their own registration; adding any of them never touches
 * this file.
 */

import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { loadConfig } from './config.js';
import { createContext } from './context.js';
import { ConfigError } from './errors.js';
import { registerPrompts } from './prompts/index.js';
import { registerResources } from './resources/index.js';
import { registerTools } from './tools/index.js';

const VERSION = '0.1.0';

/** stderr only — see the note above. */
function log(message: string): void {
  process.stderr.write(`[slab-mcp] ${message}\n`);
}

function main(): void {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      log(err.message);
      process.exit(1);
    }
    throw err;
  }

  const ctx = createContext(config);

  serveStdio(
    () => {
      const server = new McpServer(
        { name: 'slab', version: VERSION },
        { capabilities: { tools: {}, resources: {}, prompts: {} } },
      );
      const active = registerTools(server, ctx);
      registerResources(server, ctx);
      registerPrompts(server);
      log(
        `serving ${active.length} tools against ${config.apiUrl} ` +
          `(writes ${config.writesEnabled ? 'ENABLED' : 'disabled'})`,
      );
      return server;
    },
    { onerror: (error: Error) => log(`transport error: ${error.message}`) },
  );
}

main();
