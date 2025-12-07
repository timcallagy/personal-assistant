#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tools, type ToolName } from './tools/index.js';
import { config } from './config.js';

// Create the MCP server
const server = new Server(
  {
    name: 'pa',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.entries(tools).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: {
        type: 'object' as const,
        properties: Object.fromEntries(
          Object.entries(tool.schema.shape).map(([key, value]) => [
            key,
            {
              type: getZodType(value),
              description: (value as { description?: string }).description,
            },
          ])
        ),
        required: Object.entries(tool.schema.shape)
          .filter(([_, value]) => !(value as { isOptional?: () => boolean }).isOptional?.())
          .map(([key]) => key),
      },
    })),
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name as ToolName;
  const tool = tools[toolName];

  if (!tool) {
    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${toolName}`,
        },
      ],
      isError: true,
    };
  }

  try {
    // Parse and validate arguments
    const args = tool.schema.parse(request.params.arguments || {});

    // Execute the tool
    const result = await tool.handler(args as never);

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Helper to get Zod type as JSON schema type
function getZodType(schema: unknown): string {
  const typeName = (schema as { _def?: { typeName?: string } })?._def?.typeName;
  switch (typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodArray':
      return 'array';
    case 'ZodEnum':
      return 'string';
    case 'ZodOptional':
      return getZodType((schema as { _def?: { innerType?: unknown } })?._def?.innerType);
    case 'ZodDefault':
      return getZodType((schema as { _def?: { innerType?: unknown } })?._def?.innerType);
    default:
      return 'string';
  }
}

// Start the server
async function main(): Promise<void> {
  if (!config.apiKey) {
    console.error('Error: PA_API_KEY environment variable is required');
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PA MCP Server started');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
