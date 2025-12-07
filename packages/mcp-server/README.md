# PA MCP Server

MCP (Model Context Protocol) server for the PA (Personal Assistant) system.

## Installation

1. Build the MCP server:
   ```bash
   pnpm build
   ```

2. Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

   ```json
   {
     "mcpServers": {
       "pa": {
         "command": "node",
         "args": ["/path/to/pa/packages/mcp-server/dist/index.js"],
         "env": {
           "PA_API_URL": "http://localhost:3001/api/v1",
           "PA_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

3. Restart Claude Desktop.

## Available Tools

### Read Tools

- **get_projects** - List all projects
- **get_labels** - List all labels
- **get_notes** - Retrieve notes with optional filters
- **get_actions** - Retrieve action items with optional filters
- **get_completed_actions** - Retrieve completed actions
- **search** - Search across notes and actions

### Write Tools

- **save_note** - Save a new note
- **save_action** - Create a new action item
- **edit_note** - Update an existing note
- **edit_action** - Update an existing action
- **delete_note** - Delete a note
- **delete_action** - Delete an action
- **complete_actions** - Mark actions as completed

## Usage

Use the `#pa` trigger followed by natural language:

```
#pa save a summary of the conversation above
#pa take an action to review the proposal
#pa show me my top 5 actions
#pa check notes about marketing
#pa complete actions 1, 2, 3
```

## Environment Variables

- `PA_API_URL` - URL of the PA API (default: http://localhost:3001/api/v1)
- `PA_API_KEY` - Your API key for authentication (required)

## Production Configuration

For production deployment, update the configuration to point to your deployed API:

```json
{
  "mcpServers": {
    "pa": {
      "command": "node",
      "args": ["/path/to/pa/packages/mcp-server/dist/index.js"],
      "env": {
        "PA_API_URL": "https://your-api.onrender.com/api/v1",
        "PA_API_KEY": "your-production-api-key"
      }
    }
  }
}
```

## Claude Code Configuration

For Claude Code, add to `~/.claude/claude_desktop_config.json` (Linux) or the equivalent path:

```json
{
  "mcpServers": {
    "pa": {
      "command": "node",
      "args": ["/absolute/path/to/pa/packages/mcp-server/dist/index.js"],
      "env": {
        "PA_API_URL": "http://localhost:3001/api/v1",
        "PA_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Getting Your API Key

1. Run the API server and database
2. Run the seed script: `pnpm --filter @pa/api db:seed`
3. The API key will be displayed in the console output
4. Store this key securely - it's required for MCP authentication
