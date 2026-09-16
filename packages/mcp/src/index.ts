import { createMcpServer, runStdioServer } from './server.js';

export * from './server.js';

if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  runStdioServer().catch((err) => {
    console.error('Fatal MCP Server error:', err);
    process.exit(1);
  });
}
