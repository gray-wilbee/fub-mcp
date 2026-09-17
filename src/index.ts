#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadConfig } from "./auth.js";
import { buildToolDefs, executeTool, toMcpSchema } from "./tools.js";
import { FubApiError } from "./http.js";

const config = loadConfig();
const toolDefs = buildToolDefs(config);
const toolsByName = new Map(toolDefs.map((t) => [t.name, t]));

const server = new Server(
  { name: "fub-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefs.map(toMcpSchema),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = toolsByName.get(name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
    };
  }

  try {
    const result = await executeTool(config, tool, (args ?? {}) as Record<string, unknown>);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message =
      err instanceof FubApiError
        ? err.message
        : err instanceof Error
        ? err.message
        : String(err);
    return {
      isError: true,
      content: [{ type: "text", text: message }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `fub-mcp running with ${toolDefs.length} tools ` +
      `(delete tools ${config.allowDelete ? "enabled" : "disabled"})`
  );
}

main().catch((err) => {
  console.error("fub-mcp failed to start:", err);
  process.exit(1);
});
