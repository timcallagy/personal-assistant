# PA (Personal Assistant) - Developer Specification

**Version:** 1.0
**Date:** December 2024
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Functional Requirements](#3-functional-requirements)
4. [Data Model](#4-data-model)
5. [API Specification](#5-api-specification)
6. [MCP Server Specification](#6-mcp-server-specification)
7. [Web UI Specification](#7-web-ui-specification)
8. [Authentication & Security](#8-authentication--security)
9. [Error Handling](#9-error-handling)
10. [Architecture & Infrastructure](#10-architecture--infrastructure)
11. [Testing Plan](#11-testing-plan)
12. [Phase 2: File Storage](#12-phase-2-file-storage)
13. [Phase 3+: Future Integrations](#13-phase-3-future-integrations)
14. [Appendix](#14-appendix)

---

## 1. Executive Summary

### 1.1 Purpose

PA (Personal Assistant) is a unified memory and task management layer designed to persist context across LLM interactions. It solves two core problems:

1. **LLM Amnesia:** LLMs forget previous conversations, requiring users to repeat context
2. **Siloed Interactions:** No visibility between different LLM interfaces

### 1.2 Core Capabilities

- Store and retrieve **notes** (persistent context/memory)
- Manage **actions** (prioritized todo items)
- Organize with **projects** and **labels**
- Access via **MCP** (Claude Desktop, Claude Code) and **Web UI** (mobile/desktop)

### 1.3 Scope

| Phase | Features |
|-------|----------|
| **Phase 1** | Notes, Actions, Projects, Labels, MCP integration, Web UI, Search |
| **Phase 2** | File storage and management |
| **Phase 3+** | External integrations (email, calendar, Google Keep, WhatsApp) |

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Claude Code    │  Claude Desktop │      Web Browser            │
│  (MCP Client)   │  (MCP Client)   │   (Mobile/Desktop)          │
└────────┬────────┴────────┬────────┴─────────────┬───────────────┘
         │                 │                       │
         │ MCP Protocol    │ MCP Protocol          │ HTTPS
         ▼                 ▼                       ▼
┌─────────────────────────────┐         ┌─────────────────────────┐
│      Local MCP Server       │         │        Web UI           │
│   (runs on user machine)    │         │   (static, hosted on    │
│                             │         │    Render or similar)   │
└─────────────┬───────────────┘         └────────────┬────────────┘
              │                                      │
              │ HTTPS + API Key                      │ HTTPS + Session
              │                                      │
              └──────────────┬───────────────────────┘
                             ▼
              ┌───────────────────────────┐
              │       PA Cloud API        │
              │    (Node.js/TypeScript)   │
              │      Hosted on Render     │
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │       PostgreSQL          │
              │      Hosted on Render     │
              └───────────────────────────┘
```

### 2.2 Technology Stack

| Component | Technology |
|-----------|------------|
| Backend API | Node.js with TypeScript |
| Database | PostgreSQL (Render managed) |
| MCP Server | Node.js with TypeScript |
| Web UI | React/Next.js (or similar modern framework) |
| Hosting | Render (API, Database, Web UI) |
| File Storage (Phase 2) | S3-compatible (Render Object Storage or AWS S3) |

---

## 3. Functional Requirements

### 3.1 Notes Management

#### 3.1.1 Create Note
- **Trigger:** User indicates intent to save information (e.g., `#pa save a summary of the conversation above`)
- **Flow:**
  1. System generates a summary from context
  2. User confirms or edits the summary
  3. User selects exactly one project (with option to create new)
  4. User selects zero or more labels (with option to create new)
  5. User optionally marks as important
  6. Note is saved with timestamp and source

#### 3.1.2 Retrieve Notes
- Filter by: project, labels, important flag, date range
- Full-text search across note content
- Sort by: created date (default: newest first)

#### 3.1.3 Edit Note
- Modify: summary, project, labels, important flag

#### 3.1.4 Delete Note
- Permanent deletion (no soft delete for notes)

### 3.2 Actions Management

#### 3.2.1 Create Action
- **Trigger:** User indicates intent to create a task (e.g., `#pa take an action to create a blog post`)
- **Flow:**
  1. System generates an action title from context
  2. User confirms or edits the title
  3. User selects exactly one project (with option to create new)
  4. User selects zero or more labels (with option to create new)
  5. User rates urgency (1-5)
  6. User rates importance (1-5)
  7. Priority score is calculated: `urgency × importance` (range: 1-25)
  8. Action is saved with status "open"

#### 3.2.2 Retrieve Actions
- Filter by: project, labels, status (open/completed)
- Sort by: priority score (default: highest first), created date
- Special query: "top N actions" returns highest priority open actions

#### 3.2.3 Complete Actions
- Mark one or more actions as completed by ID
- Sets `completed_at` timestamp
- Moves to "completed" status (archived, not deleted)

#### 3.2.4 Edit Action
- Modify: title, project, labels, urgency, importance
- Priority score recalculated on urgency/importance change

#### 3.2.5 Delete Action
- Permanent deletion (removes from both open and completed)

### 3.3 Projects Management

#### 3.3.1 Behavior
- Created implicitly when first used (free-form)
- System suggests existing projects to prevent duplicates
- Cannot be explicitly deleted (orphaned projects can be cleaned up via maintenance)

#### 3.3.2 Retrieval
- List all projects alphabetically
- Include note/action counts per project (optional enhancement)

### 3.4 Labels Management

#### 3.4.1 Behavior
- Created implicitly when first used (free-form)
- System suggests existing labels to prevent duplicates
- Case-insensitive matching for suggestions

#### 3.4.2 Retrieval
- List all labels alphabetically
- Include note/action counts per label (optional enhancement)

### 3.5 Search

- Full-text search across:
  - Note summaries
  - Action titles
- Return matching notes and actions separately
- Support filtering search results by project/labels

---

## 4. Data Model

### 4.1 Database Schema

```sql
-- Users table (single user for now, but structured for potential multi-user)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Labels table
CREATE TABLE labels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Notes table
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    summary TEXT NOT NULL,
    important BOOLEAN DEFAULT FALSE,
    source VARCHAR(50) NOT NULL CHECK (source IN ('Claude Code', 'Claude Web')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notes-Labels junction table
CREATE TABLE note_labels (
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, label_id)
);

-- Actions table
CREATE TABLE actions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    urgency INTEGER NOT NULL CHECK (urgency BETWEEN 1 AND 5),
    importance INTEGER NOT NULL CHECK (importance BETWEEN 1 AND 5),
    priority_score INTEGER GENERATED ALWAYS AS (urgency * importance) STORED,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'completed')),
    source VARCHAR(50) NOT NULL CHECK (source IN ('Claude Code', 'Claude Web')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Actions-Labels junction table
CREATE TABLE action_labels (
    action_id INTEGER REFERENCES actions(id) ON DELETE CASCADE,
    label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (action_id, label_id)
);

-- Indexes for common queries
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_project_id ON notes(project_id);
CREATE INDEX idx_notes_important ON notes(important);
CREATE INDEX idx_notes_created_at ON notes(created_at);
CREATE INDEX idx_notes_summary_fts ON notes USING gin(to_tsvector('english', summary));

CREATE INDEX idx_actions_user_id ON actions(user_id);
CREATE INDEX idx_actions_project_id ON actions(project_id);
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_priority_score ON actions(priority_score DESC);
CREATE INDEX idx_actions_created_at ON actions(created_at);
CREATE INDEX idx_actions_title_fts ON actions USING gin(to_tsvector('english', title));

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_labels_user_id ON labels(user_id);
```

### 4.2 Entity Relationships

```
User (1) ──────< (N) Project
User (1) ──────< (N) Label
User (1) ──────< (N) Note
User (1) ──────< (N) Action

Project (1) ──────< (N) Note
Project (1) ──────< (N) Action

Note (N) >────────< (N) Label  [via note_labels]
Action (N) >──────< (N) Label  [via action_labels]
```

---

## 5. API Specification

### 5.1 Base Configuration

- **Base URL:** `https://pa-api.onrender.com/api/v1` (example)
- **Content-Type:** `application/json`
- **Authentication:** API Key (header) or Session (cookie)

### 5.2 Authentication Endpoints

#### POST /auth/login
Web UI login.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "string"
  }
}
```
Sets HTTP-only session cookie.

**Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password"
  }
}
```

#### POST /auth/logout
Web UI logout.

**Response (200):**
```json
{
  "success": true
}
```

#### GET /auth/me
Get current user (validates session/API key).

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "string"
  }
}
```

### 5.3 Notes Endpoints

#### GET /notes
Retrieve notes with optional filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| project | string | Filter by project name |
| labels | string | Comma-separated label names |
| important | boolean | Filter by important flag |
| from_date | ISO8601 | Filter by created_at >= |
| to_date | ISO8601 | Filter by created_at <= |
| search | string | Full-text search query |
| limit | integer | Max results (default: 50, max: 100) |
| offset | integer | Pagination offset (default: 0) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notes": [
      {
        "id": 1,
        "summary": "string",
        "project": "string",
        "labels": ["string"],
        "important": false,
        "source": "Claude Code",
        "created_at": "2024-12-07T10:00:00Z",
        "updated_at": "2024-12-07T10:00:00Z"
      }
    ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

#### POST /notes
Create a new note.

**Request:**
```json
{
  "summary": "string (required)",
  "project": "string (required)",
  "labels": ["string"],
  "important": false,
  "source": "Claude Code | Claude Web (required)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "note": {
      "id": 1,
      "summary": "string",
      "project": "string",
      "labels": ["string"],
      "important": false,
      "source": "Claude Code",
      "created_at": "2024-12-07T10:00:00Z",
      "updated_at": "2024-12-07T10:00:00Z"
    }
  }
}
```

#### GET /notes/:id
Get a single note by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "note": { ... }
  }
}
```

#### PUT /notes/:id
Update a note.

**Request:**
```json
{
  "summary": "string",
  "project": "string",
  "labels": ["string"],
  "important": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "note": { ... }
  }
}
```

#### DELETE /notes/:id
Delete a note.

**Response (200):**
```json
{
  "success": true,
  "message": "Note deleted successfully"
}
```

### 5.4 Actions Endpoints

#### GET /actions
Retrieve actions with optional filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| project | string | Filter by project name |
| labels | string | Comma-separated label names |
| status | string | "open" or "completed" (default: "open") |
| sort | string | "priority" (default), "created_at", "urgency", "importance" |
| order | string | "desc" (default), "asc" |
| top | integer | Return only top N by priority |
| search | string | Full-text search query |
| limit | integer | Max results (default: 50, max: 100) |
| offset | integer | Pagination offset (default: 0) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "actions": [
      {
        "id": 1,
        "title": "string",
        "project": "string",
        "labels": ["string"],
        "urgency": 5,
        "importance": 4,
        "priority_score": 20,
        "status": "open",
        "source": "Claude Code",
        "created_at": "2024-12-07T10:00:00Z",
        "updated_at": "2024-12-07T10:00:00Z",
        "completed_at": null
      }
    ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

#### POST /actions
Create a new action.

**Request:**
```json
{
  "title": "string (required)",
  "project": "string (required)",
  "labels": ["string"],
  "urgency": 3,
  "importance": 4,
  "source": "Claude Code | Claude Web (required)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "action": { ... }
  }
}
```

#### GET /actions/:id
Get a single action by ID.

#### PUT /actions/:id
Update an action.

**Request:**
```json
{
  "title": "string",
  "project": "string",
  "labels": ["string"],
  "urgency": 5,
  "importance": 5
}
```

#### DELETE /actions/:id
Delete an action permanently.

#### POST /actions/complete
Mark multiple actions as completed.

**Request:**
```json
{
  "ids": [1, 2, 3]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "completed": [1, 2, 3],
    "not_found": [],
    "already_completed": []
  }
}
```

### 5.5 Projects Endpoints

#### GET /projects
List all projects.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "name": "Babblo App",
        "note_count": 15,
        "action_count": 8,
        "created_at": "2024-12-01T10:00:00Z"
      }
    ]
  }
}
```

#### POST /projects
Create a project explicitly (optional, usually created implicitly).

**Request:**
```json
{
  "name": "string"
}
```

### 5.6 Labels Endpoints

#### GET /labels
List all labels.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "labels": [
      {
        "id": 1,
        "name": "marketing",
        "note_count": 5,
        "action_count": 3,
        "created_at": "2024-12-01T10:00:00Z"
      }
    ]
  }
}
```

#### POST /labels
Create a label explicitly (optional, usually created implicitly).

### 5.7 Search Endpoint

#### GET /search
Unified search across notes and actions.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query (required) |
| type | string | "all" (default), "notes", "actions" |
| project | string | Filter by project |
| labels | string | Comma-separated label names |
| limit | integer | Max results per type (default: 20) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notes": [ ... ],
    "actions": [ ... ],
    "total_notes": 5,
    "total_actions": 3
  }
}
```

---

## 6. MCP Server Specification

### 6.1 Overview

The MCP server runs locally on the user's machine and connects to the PA Cloud API. It exposes tools that Claude can invoke based on user intent.

### 6.2 Configuration

The MCP server requires configuration in Claude Desktop/Claude Code:

```json
{
  "mcpServers": {
    "pa": {
      "command": "node",
      "args": ["/path/to/pa-mcp-server/dist/index.js"],
      "env": {
        "PA_API_URL": "https://pa-api.onrender.com/api/v1",
        "PA_API_KEY": "user-api-key-here"
      }
    }
  }
}
```

### 6.3 MCP Tools

#### 6.3.1 save_note

**Description:** Save information as a note for future reference. Use when the user wants to store context, summaries, or reference material.

**Parameters:**
```json
{
  "summary": {
    "type": "string",
    "description": "The note content/summary",
    "required": true
  },
  "project": {
    "type": "string",
    "description": "Project name this note belongs to",
    "required": true
  },
  "labels": {
    "type": "array",
    "items": { "type": "string" },
    "description": "Optional labels for categorization",
    "required": false
  },
  "important": {
    "type": "boolean",
    "description": "Mark as important",
    "required": false,
    "default": false
  }
}
```

**Returns:** Created note object

#### 6.3.2 save_action

**Description:** Create a task/action item. Use when the user wants to track something they need to do.

**Parameters:**
```json
{
  "title": {
    "type": "string",
    "description": "Action title/description",
    "required": true
  },
  "project": {
    "type": "string",
    "description": "Project name this action belongs to",
    "required": true
  },
  "labels": {
    "type": "array",
    "items": { "type": "string" },
    "description": "Optional labels for categorization",
    "required": false
  },
  "urgency": {
    "type": "integer",
    "description": "Urgency rating (1=low, 5=high)",
    "required": true,
    "minimum": 1,
    "maximum": 5
  },
  "importance": {
    "type": "integer",
    "description": "Importance rating (1=low, 5=high)",
    "required": true,
    "minimum": 1,
    "maximum": 5
  }
}
```

**Returns:** Created action object with priority_score

#### 6.3.3 get_notes

**Description:** Retrieve saved notes. Use when the user wants to recall stored information.

**Parameters:**
```json
{
  "project": {
    "type": "string",
    "description": "Filter by project name",
    "required": false
  },
  "labels": {
    "type": "array",
    "items": { "type": "string" },
    "description": "Filter by labels",
    "required": false
  },
  "important": {
    "type": "boolean",
    "description": "Filter by important flag",
    "required": false
  },
  "from_date": {
    "type": "string",
    "description": "Filter notes created after this date (ISO8601)",
    "required": false
  },
  "to_date": {
    "type": "string",
    "description": "Filter notes created before this date (ISO8601)",
    "required": false
  },
  "limit": {
    "type": "integer",
    "description": "Maximum notes to return",
    "required": false,
    "default": 20
  }
}
```

**Returns:** Array of matching notes

#### 6.3.4 get_actions

**Description:** Retrieve open action items. Use when the user wants to see their tasks.

**Parameters:**
```json
{
  "project": {
    "type": "string",
    "description": "Filter by project name",
    "required": false
  },
  "labels": {
    "type": "array",
    "items": { "type": "string" },
    "description": "Filter by labels",
    "required": false
  },
  "top": {
    "type": "integer",
    "description": "Return only top N by priority score",
    "required": false
  },
  "limit": {
    "type": "integer",
    "description": "Maximum actions to return",
    "required": false,
    "default": 20
  }
}
```

**Returns:** Array of matching actions sorted by priority_score descending

#### 6.3.5 get_completed_actions

**Description:** Retrieve completed/archived actions.

**Parameters:**
```json
{
  "project": {
    "type": "string",
    "description": "Filter by project name",
    "required": false
  },
  "from_date": {
    "type": "string",
    "description": "Filter by completion date",
    "required": false
  },
  "limit": {
    "type": "integer",
    "description": "Maximum actions to return",
    "required": false,
    "default": 20
  }
}
```

**Returns:** Array of completed actions

#### 6.3.6 complete_actions

**Description:** Mark actions as completed.

**Parameters:**
```json
{
  "ids": {
    "type": "array",
    "items": { "type": "integer" },
    "description": "Array of action IDs to mark as completed",
    "required": true
  }
}
```

**Returns:** Completion result with completed/not_found/already_completed arrays

#### 6.3.7 edit_note

**Description:** Update an existing note.

**Parameters:**
```json
{
  "id": {
    "type": "integer",
    "description": "Note ID to edit",
    "required": true
  },
  "summary": {
    "type": "string",
    "description": "New summary",
    "required": false
  },
  "project": {
    "type": "string",
    "description": "New project",
    "required": false
  },
  "labels": {
    "type": "array",
    "items": { "type": "string" },
    "description": "New labels (replaces existing)",
    "required": false
  },
  "important": {
    "type": "boolean",
    "description": "New important flag",
    "required": false
  }
}
```

**Returns:** Updated note object

#### 6.3.8 edit_action

**Description:** Update an existing action.

**Parameters:**
```json
{
  "id": {
    "type": "integer",
    "description": "Action ID to edit",
    "required": true
  },
  "title": {
    "type": "string",
    "description": "New title",
    "required": false
  },
  "project": {
    "type": "string",
    "description": "New project",
    "required": false
  },
  "labels": {
    "type": "array",
    "items": { "type": "string" },
    "description": "New labels (replaces existing)",
    "required": false
  },
  "urgency": {
    "type": "integer",
    "description": "New urgency (1-5)",
    "required": false
  },
  "importance": {
    "type": "integer",
    "description": "New importance (1-5)",
    "required": false
  }
}
```

**Returns:** Updated action object with recalculated priority_score

#### 6.3.9 delete_note

**Description:** Permanently delete a note.

**Parameters:**
```json
{
  "id": {
    "type": "integer",
    "description": "Note ID to delete",
    "required": true
  }
}
```

**Returns:** Success confirmation

#### 6.3.10 delete_action

**Description:** Permanently delete an action.

**Parameters:**
```json
{
  "id": {
    "type": "integer",
    "description": "Action ID to delete",
    "required": true
  }
}
```

**Returns:** Success confirmation

#### 6.3.11 get_projects

**Description:** List all available projects.

**Parameters:** None

**Returns:** Array of project names sorted alphabetically

#### 6.3.12 get_labels

**Description:** List all available labels.

**Parameters:** None

**Returns:** Array of label names sorted alphabetically

#### 6.3.13 search

**Description:** Search across notes and actions.

**Parameters:**
```json
{
  "query": {
    "type": "string",
    "description": "Search query",
    "required": true
  },
  "type": {
    "type": "string",
    "enum": ["all", "notes", "actions"],
    "description": "Limit search to specific type",
    "required": false,
    "default": "all"
  },
  "project": {
    "type": "string",
    "description": "Filter results by project",
    "required": false
  },
  "limit": {
    "type": "integer",
    "description": "Maximum results per type",
    "required": false,
    "default": 10
  }
}
```

**Returns:** Object with matching notes and actions arrays

### 6.4 Source Detection

The MCP server must set the `source` field based on the client:
- If running via Claude Code CLI: `"Claude Code"`
- If running via Claude Desktop: `"Claude Web"`

Detection method: Check environment variables or MCP client metadata.

---

## 7. Web UI Specification

### 7.1 Design Requirements

| Aspect | Requirement |
|--------|-------------|
| Layout | Responsive (mobile-first, works on desktop) |
| Theme | Dark mode only (dark background, light text) |
| Style | Minimal, clean (reference: Linear, Todoist dark mode) |
| Framework | React/Next.js or similar modern framework |

### 7.2 Pages

#### 7.2.1 Login Page
- Username and password fields
- "Log in" button
- Error display for invalid credentials

#### 7.2.2 Dashboard / Home
- Quick stats: total notes, open actions, completed today
- Top 5 priority actions
- Recent notes (last 5)
- Quick action buttons: "Add Note", "Add Action"

#### 7.2.3 Notes Page
- List view of all notes
- Filter sidebar/dropdown:
  - By project
  - By label (multi-select)
  - By important flag
  - By date range
- Search bar
- Each note card shows:
  - Summary (truncated)
  - Project badge
  - Label chips
  - Important indicator (if set)
  - Created date
  - Edit/Delete actions
- Click to expand full note
- "Add Note" button

#### 7.2.4 Actions Page
- List view of open actions (default)
- Toggle: Open / Completed
- Filter sidebar/dropdown:
  - By project
  - By label (multi-select)
- Sort dropdown: Priority, Created Date, Urgency, Importance
- Search bar
- Each action card shows:
  - Title
  - Project badge
  - Label chips
  - Urgency/Importance indicators (visual, e.g., colored dots)
  - Priority score badge
  - Created date
  - Checkbox to complete
  - Edit/Delete actions
- "Add Action" button

#### 7.2.5 Add/Edit Note Modal
- Summary textarea (required)
- Project dropdown (with "Create new" option)
- Labels multi-select (with "Create new" option)
- Important checkbox
- Save/Cancel buttons

#### 7.2.6 Add/Edit Action Modal
- Title input (required)
- Project dropdown (with "Create new" option)
- Labels multi-select (with "Create new" option)
- Urgency slider/buttons (1-5)
- Importance slider/buttons (1-5)
- Priority score display (calculated live)
- Save/Cancel buttons

### 7.3 UI Components

#### Project/Label Selection
- Dropdown with search/filter
- Alphabetically sorted
- "Create new" option at bottom
- Inline creation (type name, press enter)

#### Priority Score Display
- Visual indicator (color gradient: green=low, yellow=medium, red=high)
- Numeric display: "Score: 20/25"

#### Action Status Toggle
- Checkbox or toggle switch
- Confirmation not required for completing
- Completed actions greyed out with strikethrough

---

## 8. Authentication & Security

### 8.1 API Key Authentication (MCP)

- **Header:** `X-API-Key: <api_key>`
- API key is a 32-character alphanumeric string
- Generated on user creation
- Can be regenerated via web UI (invalidates old key)

### 8.2 Session Authentication (Web UI)

- Username/password login
- HTTP-only secure cookie for session
- Session expiry: 7 days (sliding)
- CSRF protection via SameSite cookie attribute

### 8.3 Password Requirements

- Minimum 8 characters
- Hashed with bcrypt (cost factor: 12)

### 8.4 Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
```

### 8.5 Rate Limiting

- No rate limiting for single user (Phase 1)
- Consider adding if abuse becomes an issue

---

## 9. Error Handling

### 9.1 Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of what went wrong",
    "details": { }
  }
}
```

### 9.2 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `INVALID_CREDENTIALS` | 401 | Wrong username/password |
| `UNAUTHORIZED` | 401 | Missing or invalid API key/session |
| `NOT_FOUND` | 404 | Resource (note, action, project, label) not found |
| `CONFLICT` | 409 | Duplicate resource (e.g., project name already exists) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 9.3 Verbose Error Messages

Errors should be descriptive to help users understand what went wrong:

**Good:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Action with ID 999 was not found. It may have been deleted or the ID is incorrect.",
    "details": {
      "resource_type": "action",
      "resource_id": 999
    }
  }
}
```

**Bad:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Not found"
  }
}
```

### 9.4 MCP Error Handling

MCP tools should return user-friendly error messages that Claude can relay:

```json
{
  "error": true,
  "message": "I couldn't find an action with ID 999. Would you like me to show you your current open actions instead?"
}
```

### 9.5 Validation Errors

Include specific field-level errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data. Please check the following fields.",
    "details": {
      "fields": {
        "urgency": "Urgency must be between 1 and 5. You provided: 7",
        "project": "Project name is required"
      }
    }
  }
}
```

---

## 10. Architecture & Infrastructure

### 10.1 Render Services

| Service | Type | Configuration |
|---------|------|---------------|
| PA API | Web Service | Node.js, auto-deploy from GitHub |
| PA Database | PostgreSQL | Managed PostgreSQL instance |
| PA Web UI | Static Site | Built and deployed from GitHub |

### 10.2 Environment Variables

**API Service:**
```
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/pa
SESSION_SECRET=<random-32-char-string>
CORS_ORIGIN=https://pa.onrender.com
```

**MCP Server (Local):**
```
PA_API_URL=https://pa-api.onrender.com/api/v1
PA_API_KEY=<user-api-key>
```

### 10.3 Repository Structure

```
pa/
├── packages/
│   ├── api/                 # Express.js API
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mcp-server/          # MCP Server
│   │   ├── src/
│   │   │   ├── tools/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                 # React/Next.js Web UI
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   └── styles/
│       ├── package.json
│       └── tsconfig.json
│
├── package.json             # Monorepo root
├── turbo.json               # Turborepo config
└── README.md
```

### 10.4 Deployment Pipeline

1. Push to `main` branch
2. GitHub Actions runs tests
3. On success, Render auto-deploys:
   - API service rebuilds
   - Web UI rebuilds
4. Database migrations run via release command

---

## 11. Testing Plan

### 11.1 Unit Tests

**API Layer:**
| Component | Tests |
|-----------|-------|
| Validators | Input validation for all endpoints |
| Services | Business logic (priority calculation, search, filtering) |
| Models | Database queries, relationships |

**MCP Server:**
| Component | Tests |
|-----------|-------|
| Tool handlers | Parameter validation, API call construction |
| Response formatting | Error handling, data transformation |

### 11.2 Integration Tests

**API Integration:**
| Test Suite | Coverage |
|------------|----------|
| Auth flows | Login, logout, session management, API key validation |
| Notes CRUD | Create, read, update, delete notes with all filters |
| Actions CRUD | Create, read, update, delete, complete actions |
| Projects/Labels | Implicit creation, listing, association |
| Search | Full-text search across notes and actions |

**MCP Integration:**
| Test Suite | Coverage |
|------------|----------|
| End-to-end | Each MCP tool calls API and returns correct format |
| Error handling | API errors properly transformed for Claude |

### 11.3 Test Cases

#### Notes
1. Create note with project and labels (new project/labels created)
2. Create note with existing project and labels
3. Create note with important flag
4. Retrieve notes filtered by project
5. Retrieve notes filtered by labels (single and multiple)
6. Retrieve notes filtered by important flag
7. Retrieve notes filtered by date range
8. Search notes by keyword
9. Edit note summary
10. Edit note project (move to different project)
11. Edit note labels (add, remove, replace)
12. Delete note
13. Attempt to get non-existent note (expect 404)

#### Actions
1. Create action with all required fields
2. Create action with minimum fields
3. Verify priority_score calculation (urgency × importance)
4. Retrieve open actions sorted by priority
5. Retrieve open actions filtered by project
6. Retrieve top N actions
7. Complete single action
8. Complete multiple actions at once
9. Attempt to complete non-existent action
10. Attempt to complete already-completed action
11. Retrieve completed actions
12. Edit action urgency/importance (verify priority recalculation)
13. Delete open action
14. Delete completed action

#### Authentication
1. Login with valid credentials
2. Login with invalid username
3. Login with invalid password
4. Access protected endpoint without auth (expect 401)
5. Access protected endpoint with invalid API key (expect 401)
6. Access protected endpoint with valid API key
7. Access protected endpoint with valid session
8. Logout invalidates session

### 11.4 Web UI Tests

**E2E Tests (Playwright/Cypress):**
1. Login flow
2. View notes list
3. Add new note via modal
4. Filter notes by project
5. Search notes
6. View actions list
7. Add new action via modal
8. Complete action via checkbox
9. Edit action
10. Logout flow

### 11.5 Testing Tools

| Type | Tool |
|------|------|
| Unit/Integration | Jest |
| API Testing | Supertest |
| E2E | Playwright or Cypress |
| Coverage | Istanbul/nyc |

### 11.6 Test Data

Create fixtures for:
- Sample user with API key
- 5 projects with varying note/action counts
- 10 labels
- 20 notes across projects
- 30 actions (20 open, 10 completed) with varying priorities

---

## 12. Phase 2: File Storage

### 12.1 Overview

Phase 2 adds file storage as a third entity type alongside notes and actions.

### 12.2 Data Model Extension

```sql
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_key VARCHAR(500) NOT NULL,  -- S3 object key
    source VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT max_file_size CHECK (size_bytes <= 41943040)  -- 40MB
);

CREATE TABLE file_labels (
    file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
    label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (file_id, label_id)
);
```

### 12.3 Storage Architecture

- **Blob Storage:** S3-compatible (Render Object Storage, AWS S3, or similar)
- **Upload Flow:**
  1. API generates pre-signed upload URL
  2. Client uploads directly to S3
  3. Client confirms upload, API stores metadata
- **Download Flow:**
  1. API generates pre-signed download URL
  2. Client downloads directly from S3

### 12.4 MCP Tools (Phase 2)

- `upload_file` - Upload a file with project and labels
- `get_files` - List files with filters
- `delete_file` - Remove a file

---

## 13. Phase 3+: Future Integrations

### 13.1 Integration Architecture

```
┌─────────────────────────────────────┐
│           PA Cloud API              │
├─────────────────────────────────────┤
│         Integration Layer           │
├─────────┬─────────┬────────┬────────┤
│  Email  │Calendar │ Keep   │WhatsApp│
│ Adapter │ Adapter │Adapter │Adapter │
└─────────┴─────────┴────────┴────────┘
      │         │        │        │
      ▼         ▼        ▼        ▼
   Gmail    Google    Google   WhatsApp
   API      Calendar  Keep     Business
            API       API      API
```

### 13.2 Planned Integrations

| Integration | Trigger Examples |
|-------------|------------------|
| Email | `#pa email john@example.com about the proposal` |
| Calendar | `#pa schedule "Meeting" for tomorrow 2pm` |
| Google Keep | `#pa add "milk" to shopping list` |
| WhatsApp | `#pa message John about the meeting` |

### 13.3 Implementation Notes

- Each integration requires OAuth setup
- Store tokens securely (encrypted)
- Handle token refresh
- Rate limiting per service
- Error handling for API failures

---

## 14. Appendix

### 14.1 Sample User Interaction Flow

**Creating a Note (Claude Code):**

```
User: #pa save a summary of the digital marketing strategy we discussed

Claude: I'll save that as a note. Here's the summary I've generated:

"Digital marketing strategy focusing on content marketing through blog posts,
SEO optimization for target keywords, and social media presence on LinkedIn
and Twitter. Key metrics: organic traffic, engagement rate, lead generation."

Does this look correct? (yes/edit)

User: yes

Claude: Great! Which project does this belong to?
  ↑ Babblo App
  ↓ Job Hunting
    Personal
    [Create new project]

User: [selects Babblo App]

Claude: Any labels to add?
  ↑ marketing (space to select)
  ↓ strategy
    content
    seo
    [Create new label]

User: [selects marketing, strategy]

Claude: ✓ Note saved!
  - Project: Babblo App
  - Labels: marketing, strategy
  - ID: 47
```

**Retrieving Actions:**

```
User: #pa show me top 5 actions for today

Claude: Here are your top 5 priority actions:

1. [25] Follow up with recruiter at TechCorp (Job Hunting)
   Urgency: 5, Importance: 5

2. [20] Finish blog post on AI tools (Babblo App)
   Urgency: 4, Importance: 5

3. [16] Review ad campaign metrics (Babblo App)
   Urgency: 4, Importance: 4

4. [15] Update LinkedIn profile (Job Hunting)
   Urgency: 3, Importance: 5

5. [12] Research competitor pricing (Babblo App)
   Urgency: 3, Importance: 4

Would you like to mark any as complete or get more details?
```

### 14.2 API Request/Response Examples

**Create Action:**

```bash
curl -X POST https://pa-api.onrender.com/api/v1/actions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: abc123..." \
  -d '{
    "title": "Write blog post about AI productivity tools",
    "project": "Babblo App",
    "labels": ["content", "marketing"],
    "urgency": 4,
    "importance": 5,
    "source": "Claude Code"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "action": {
      "id": 42,
      "title": "Write blog post about AI productivity tools",
      "project": "Babblo App",
      "labels": ["content", "marketing"],
      "urgency": 4,
      "importance": 5,
      "priority_score": 20,
      "status": "open",
      "source": "Claude Code",
      "created_at": "2024-12-07T14:30:00Z",
      "updated_at": "2024-12-07T14:30:00Z",
      "completed_at": null
    }
  }
}
```

### 14.3 Priority Score Reference

| Urgency | Importance | Score | Interpretation |
|---------|------------|-------|----------------|
| 5 | 5 | 25 | Critical - do immediately |
| 5 | 4 | 20 | Very high - do today |
| 4 | 5 | 20 | Very high - do today |
| 4 | 4 | 16 | High - do soon |
| 3 | 5 | 15 | High - important but can wait |
| 5 | 3 | 15 | High - urgent but less critical |
| 3 | 3 | 9 | Medium - schedule appropriately |
| 2 | 2 | 4 | Low - do when time permits |
| 1 | 1 | 1 | Minimal - consider dropping |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 2024 | Initial specification |

---

**End of Specification**
