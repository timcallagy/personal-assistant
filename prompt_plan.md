# PA (Personal Assistant) - Implementation Prompt Plan

This document contains a series of prompts designed to guide a code-generation LLM through building the PA project incrementally. Each prompt builds on the previous ones, ensuring no orphaned code and steady progress.

---

## Table of Contents

1. [Blueprint Overview](#blueprint-overview)
2. [Chunk Breakdown](#chunk-breakdown)
3. [Step-by-Step Refinement](#step-by-step-refinement)
4. [Implementation Prompts](#implementation-prompts)

---

## Blueprint Overview

### High-Level Architecture Layers

```
Layer 1: Foundation
├── Monorepo structure
├── Shared TypeScript types
└── Database schema

Layer 2: API Core
├── Express server
├── Database connection (Prisma)
├── Authentication middleware
└── Error handling

Layer 3: API Endpoints
├── Projects & Labels
├── Notes (CRUD + filter + search)
├── Actions (CRUD + filter + complete)
└── Unified Search

Layer 4: MCP Server
├── Server setup
├── API client wrapper
└── All 13 MCP tools

Layer 5: Web UI
├── Next.js setup with dark theme
├── Authentication flow
├── Notes management
├── Actions management
└── Dashboard

Layer 6: Deployment & Testing
├── Render configuration
├── Unit tests
└── Integration tests
```

---

## Chunk Breakdown

### First Pass: Major Chunks

| Chunk | Description | Dependencies |
|-------|-------------|--------------|
| C1 | Project Foundation | None |
| C2 | API Core Infrastructure | C1 |
| C3 | Projects & Labels API | C2 |
| C4 | Notes API | C3 |
| C5 | Actions API | C3 |
| C6 | Search API | C4, C5 |
| C7 | MCP Server | C6 |
| C8 | Web UI Foundation | C6 |
| C9 | Web UI - Notes | C8 |
| C10 | Web UI - Actions | C8 |
| C11 | Web UI - Dashboard | C9, C10 |
| C12 | Deployment | C11 |
| C13 | Testing | C12 |

### Second Pass: Smaller Steps

Breaking each chunk into implementable steps:

**C1: Project Foundation (3 steps)**
- C1.1: Monorepo setup with Turborepo
- C1.2: Shared types package
- C1.3: Database schema with Prisma

**C2: API Core (4 steps)**
- C2.1: Express server skeleton
- C2.2: Database connection
- C2.3: Authentication middleware
- C2.4: Error handling middleware

**C3: Projects & Labels (2 steps)**
- C3.1: Projects CRUD
- C3.2: Labels CRUD

**C4: Notes (3 steps)**
- C4.1: Notes CRUD basics
- C4.2: Notes filtering
- C4.3: Notes with labels relationship

**C5: Actions (4 steps)**
- C5.1: Actions CRUD basics
- C5.2: Priority calculation
- C5.3: Complete actions
- C5.4: Actions filtering

**C6: Search (1 step)**
- C6.1: Unified search endpoint

**C7: MCP Server (3 steps)**
- C7.1: MCP server setup
- C7.2: Read tools (get_*)
- C7.3: Write tools (save_*, edit_*, delete_*, complete_*)

**C8: Web UI Foundation (3 steps)**
- C8.1: Next.js project with dark theme
- C8.2: API client and types
- C8.3: Auth context and login page

**C9: Web UI Notes (3 steps)**
- C9.1: Notes list page
- C9.2: Notes create/edit modal
- C9.3: Notes filtering UI

**C10: Web UI Actions (3 steps)**
- C10.1: Actions list page
- C10.2: Actions create/edit modal
- C10.3: Actions complete and filter

**C11: Dashboard (1 step)**
- C11.1: Dashboard with stats and quick actions

**C12: Deployment (2 steps)**
- C12.1: Docker and Render config
- C12.2: Production environment setup

**C13: Testing (2 steps)**
- C13.1: API unit and integration tests
- C13.2: MCP and E2E tests

---

## Step-by-Step Refinement

### Final Step Sizing Review

After reviewing, here's the final breakdown optimized for:
- Each step produces working, testable code
- No step is too large (max ~200 lines of new code)
- Each step integrates with previous work
- Clear verification criteria

| Step | Name | Est. New Code | Verification |
|------|------|---------------|--------------|
| 1 | Monorepo Setup | ~50 lines config | `pnpm install` works |
| 2 | Shared Types | ~100 lines | Types compile |
| 3 | Prisma Schema | ~80 lines | `prisma generate` works |
| 4 | Express Skeleton | ~60 lines | Server starts on port 3001 |
| 5 | DB Connection | ~40 lines | Health endpoint returns DB status |
| 6 | Auth Middleware | ~80 lines | Protected route rejects without key |
| 7 | Error Handling | ~60 lines | Errors return consistent JSON |
| 8 | Projects CRUD | ~120 lines | Can create/list/delete projects |
| 9 | Labels CRUD | ~100 lines | Can create/list/delete labels |
| 10 | Notes CRUD | ~150 lines | Can create/read/update/delete notes |
| 11 | Notes Filtering | ~80 lines | Can filter notes by project/labels |
| 12 | Actions CRUD | ~150 lines | Can create/read/update/delete actions |
| 13 | Actions Priority & Complete | ~100 lines | Priority calculates, complete works |
| 14 | Actions Filtering | ~80 lines | Can filter/sort actions |
| 15 | Search Endpoint | ~100 lines | Full-text search works |
| 16 | MCP Server Setup | ~80 lines | MCP server connects |
| 17 | MCP Read Tools | ~150 lines | get_* tools work |
| 18 | MCP Write Tools | ~150 lines | save_*, edit_*, delete_* work |
| 19 | Next.js + Theme | ~100 lines | Dark themed app loads |
| 20 | Web Auth | ~150 lines | Can login/logout |
| 21 | Notes List | ~150 lines | Notes display in list |
| 22 | Notes Modal | ~150 lines | Can create/edit notes |
| 23 | Notes Filters | ~100 lines | Filter UI works |
| 24 | Actions List | ~150 lines | Actions display with priority |
| 25 | Actions Modal | ~150 lines | Can create/edit actions |
| 26 | Actions Complete | ~80 lines | Can check off actions |
| 27 | Dashboard | ~150 lines | Stats and quick actions |
| 28 | Deployment Config | ~80 lines | Render deploys |
| 29 | API Tests | ~200 lines | Tests pass |
| 30 | E2E Tests | ~150 lines | E2E tests pass |

---

## Implementation Prompts

Each prompt below is designed to be given to a code-generation LLM. They are sequential and build on each other.

---

### Prompt 1: Monorepo Setup

**Context:** Starting from scratch. We need a pnpm monorepo with Turborepo for the PA project.

```text
Create a pnpm monorepo with Turborepo for a project called "pa" (Personal Assistant).

The monorepo should have this structure:
```
pa/
├── packages/
│   ├── api/           # Express.js API (empty for now)
│   ├── mcp-server/    # MCP Server (empty for now)
│   ├── web/           # Next.js frontend (empty for now)
│   └── shared/        # Shared TypeScript types
├── package.json       # Root package.json with workspaces
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json # Base TypeScript config
└── .gitignore
```

Requirements:
1. Use pnpm workspaces
2. Configure Turborepo with build, dev, and lint pipelines
3. Create a base tsconfig.json that all packages extend
4. Each package should have its own package.json with:
   - name: "@pa/api", "@pa/mcp-server", "@pa/web", "@pa/shared"
   - typescript as a dev dependency
5. Add a root package.json script: "dev" that runs all packages in parallel
6. The .gitignore should exclude node_modules, dist, .next, .env files

Only create the structure and configuration files. Leave the src folders empty for now.
```

**Verification:** Run `pnpm install` successfully.

---

### Prompt 2: Shared Types Package

**Context:** We have the monorepo structure. Now we need shared TypeScript types.

```text
In the @pa/shared package, create TypeScript types and interfaces for the PA system.

File: packages/shared/src/index.ts

Define these types:

1. Source enum: "Claude Code" | "Claude Web"

2. Note interface:
   - id: number
   - summary: string
   - project: string
   - labels: string[]
   - important: boolean
   - source: Source
   - createdAt: Date
   - updatedAt: Date

3. ActionStatus enum: "open" | "completed"

4. Action interface:
   - id: number
   - title: string
   - project: string
   - labels: string[]
   - urgency: number (1-5)
   - importance: number (1-5)
   - priorityScore: number (calculated: urgency * importance)
   - status: ActionStatus
   - source: Source
   - createdAt: Date
   - updatedAt: Date
   - completedAt: Date | null

5. Project interface:
   - id: number
   - name: string
   - noteCount: number
   - actionCount: number
   - createdAt: Date

6. Label interface:
   - id: number
   - name: string
   - noteCount: number
   - actionCount: number
   - createdAt: Date

7. API Response wrapper types:
   - ApiResponse<T> with success: boolean, data?: T, error?: ApiError
   - ApiError with code: string, message: string, details?: Record<string, any>

8. Request types for creating/updating:
   - CreateNoteRequest
   - UpdateNoteRequest
   - CreateActionRequest
   - UpdateActionRequest
   - CompleteActionsRequest

Also create packages/shared/tsconfig.json extending the base config, and update package.json to:
- Set "main": "dist/index.js"
- Set "types": "dist/index.d.ts"
- Add build script: "tsc"

Export all types from index.ts.
```

**Verification:** Run `pnpm --filter @pa/shared build` successfully.

---

### Prompt 3: Prisma Schema

**Context:** We have shared types. Now we need the database schema.

```text
Set up Prisma in the @pa/api package with the database schema for PA.

1. Install Prisma in @pa/api:
   - prisma (dev dependency)
   - @prisma/client (dependency)

2. Create packages/api/prisma/schema.prisma with:

   - datasource: postgresql
   - generator: prisma-client-js

   Models:

   User:
   - id: Int @id @default(autoincrement())
   - username: String @unique
   - passwordHash: String
   - apiKey: String @unique
   - createdAt: DateTime @default(now())
   - updatedAt: DateTime @updatedAt
   - Relations: projects, labels, notes, actions

   Project:
   - id: Int @id @default(autoincrement())
   - userId: Int
   - name: String
   - createdAt: DateTime @default(now())
   - Unique constraint: [userId, name]
   - Relations: user, notes, actions

   Label:
   - id: Int @id @default(autoincrement())
   - userId: Int
   - name: String
   - createdAt: DateTime @default(now())
   - Unique constraint: [userId, name]
   - Relations: user, notes, actions

   Note:
   - id: Int @id @default(autoincrement())
   - userId: Int
   - projectId: Int?
   - summary: String
   - important: Boolean @default(false)
   - source: String
   - createdAt: DateTime @default(now())
   - updatedAt: DateTime @updatedAt
   - Relations: user, project, labels (many-to-many)

   Action:
   - id: Int @id @default(autoincrement())
   - userId: Int
   - projectId: Int?
   - title: String
   - urgency: Int
   - importance: Int
   - priorityScore: Int (stored, calculated as urgency * importance)
   - status: String @default("open")
   - source: String
   - createdAt: DateTime @default(now())
   - updatedAt: DateTime @updatedAt
   - completedAt: DateTime?
   - Relations: user, project, labels (many-to-many)

3. Add these scripts to packages/api/package.json:
   - "db:generate": "prisma generate"
   - "db:migrate": "prisma migrate dev"
   - "db:push": "prisma db push"

4. Create packages/api/.env.example with DATABASE_URL placeholder

Make sure to add appropriate indexes for common queries:
- notes: userId, projectId, important, createdAt
- actions: userId, projectId, status, priorityScore
```

**Verification:** Run `pnpm --filter @pa/api db:generate` successfully.

---

### Prompt 4: Express Server Skeleton

**Context:** We have the database schema. Now create the Express server.

```text
Create the Express.js server skeleton in @pa/api.

1. Install dependencies in packages/api:
   - express
   - cors
   - helmet
   - cookie-parser
   - @types/express, @types/cors, @types/cookie-parser (dev)
   - tsx (dev, for running TypeScript)
   - dotenv

2. Create this file structure:
   ```
   packages/api/src/
   ├── index.ts          # Entry point
   ├── app.ts            # Express app setup
   ├── config.ts         # Environment config
   ├── routes/
   │   └── index.ts      # Route aggregator
   ├── middleware/
   │   └── index.ts      # Middleware exports
   └── controllers/
       └── health.ts     # Health check controller
   ```

3. packages/api/src/config.ts:
   - Load environment variables with dotenv
   - Export: PORT (default 3001), DATABASE_URL, SESSION_SECRET, CORS_ORIGIN, NODE_ENV

4. packages/api/src/app.ts:
   - Create Express app
   - Apply middleware: helmet, cors (with CORS_ORIGIN), express.json(), cookie-parser
   - Mount routes at /api/v1
   - Export app

5. packages/api/src/index.ts:
   - Import app and config
   - Start server on PORT
   - Log "PA API running on port {PORT}"

6. packages/api/src/routes/index.ts:
   - Create router
   - Mount health routes at /health

7. packages/api/src/controllers/health.ts:
   - GET / returns { success: true, message: "PA API is running", timestamp: Date }

8. Add scripts to package.json:
   - "dev": "tsx watch src/index.ts"
   - "build": "tsc"
   - "start": "node dist/index.js"

9. Create packages/api/tsconfig.json extending base, outputting to dist/
```

**Verification:** Run `pnpm --filter @pa/api dev`, then curl http://localhost:3001/api/v1/health returns success.

---

### Prompt 5: Database Connection

**Context:** We have an Express server. Now connect it to the database.

```text
Add database connection to @pa/api using Prisma.

1. Create packages/api/src/lib/prisma.ts:
   - Create and export a singleton PrismaClient instance
   - Handle connection in development (prevent multiple instances with hot reload)
   - Log when connected in development mode

2. Update packages/api/src/controllers/health.ts:
   - Import prisma client
   - Add a try/catch that does a simple query: prisma.$queryRaw`SELECT 1`
   - Return database status in health response:
     ```json
     {
       "success": true,
       "message": "PA API is running",
       "timestamp": "...",
       "database": "connected" | "disconnected"
     }
     ```

3. Create packages/api/src/lib/index.ts to export prisma

4. Update packages/api/src/index.ts:
   - Import prisma
   - Before starting server, connect to database with prisma.$connect()
   - Log "Database connected" on success
   - Handle connection errors gracefully with process.exit(1)

5. Create a .env file (gitignored) with a local PostgreSQL connection string for development:
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pa_dev"
```

**Verification:** Start the server, health endpoint shows database: "connected".

---

### Prompt 6: Authentication Middleware

**Context:** We have database connection. Now add authentication.

```text
Add authentication middleware to @pa/api.

1. Install bcrypt and its types:
   - bcrypt
   - @types/bcrypt (dev)

2. Create packages/api/src/middleware/auth.ts with two middleware functions:

   a) apiKeyAuth - for MCP server:
      - Reads X-API-Key header
      - Looks up user by apiKey in database
      - If valid, attach user to req.user
      - If invalid, return 401 with error: { code: "UNAUTHORIZED", message: "Invalid or missing API key" }

   b) sessionAuth - for web UI (we'll implement sessions later, for now just check req.user):
      - Check if req.user exists (will be set by session middleware later)
      - If not, return 401

3. Create packages/api/src/types/express.d.ts:
   - Extend Express Request interface to include user property with id and username

4. Create packages/api/src/middleware/index.ts:
   - Export both auth middleware functions

5. Create a test route to verify auth works:
   - Add GET /api/v1/auth/me route in a new auth.ts controller
   - Protect it with apiKeyAuth middleware
   - Return the authenticated user's id and username

6. Create a seed script packages/api/prisma/seed.ts:
   - Create a test user with:
     - username: "testuser"
     - passwordHash: bcrypt hash of "testpassword"
     - apiKey: generate a random 32-char string
   - Log the API key for testing

7. Add to package.json:
   - "db:seed": "tsx prisma/seed.ts"
   - Update prisma in package.json to have seed command

Run the seed, note the API key, and test the /auth/me endpoint.
```

**Verification:** GET /api/v1/auth/me with valid X-API-Key returns user. Without key returns 401.

---

### Prompt 7: Error Handling Middleware

**Context:** We have auth. Now add consistent error handling.

```text
Add error handling middleware and utilities to @pa/api.

1. Create packages/api/src/lib/errors.ts:
   - Define AppError class extending Error with:
     - code: string
     - statusCode: number
     - details?: Record<string, any>
     - Constructor takes (message, code, statusCode, details?)

   - Create error factory functions:
     - validationError(message, fieldErrors) -> AppError with code "VALIDATION_ERROR", 400
     - notFoundError(resource, id) -> AppError with code "NOT_FOUND", 404
     - unauthorizedError(message?) -> AppError with code "UNAUTHORIZED", 401
     - conflictError(message) -> AppError with code "CONFLICT", 409
     - internalError(message?) -> AppError with code "INTERNAL_ERROR", 500

2. Create packages/api/src/middleware/errorHandler.ts:
   - Express error handling middleware (err, req, res, next)
   - If err is AppError, use its properties
   - Otherwise, log the error and return a generic internal error
   - Always return JSON in format:
     ```json
     {
       "success": false,
       "error": {
         "code": "ERROR_CODE",
         "message": "Descriptive message",
         "details": { ... }
       }
     }
     ```

3. Create packages/api/src/middleware/asyncHandler.ts:
   - Wrapper function that catches async errors and passes to next()
   - Usage: asyncHandler(async (req, res) => { ... })

4. Update packages/api/src/app.ts:
   - Add error handler as last middleware
   - Add 404 handler for unmatched routes

5. Update packages/api/src/middleware/index.ts:
   - Export errorHandler, asyncHandler

6. Update auth middleware to use the new error functions

7. Test by creating a route that throws an error and verify the response format
```

**Verification:** Throwing errors returns consistent JSON format. 404 for unknown routes works.

---

### Prompt 8: Projects CRUD

**Context:** We have core infrastructure. Now build Projects endpoints.

```text
Create Projects CRUD endpoints in @pa/api.

1. Create packages/api/src/services/projectService.ts:
   - getProjects(userId): Get all projects for user, sorted alphabetically, with note/action counts
   - getProject(userId, projectId): Get single project
   - createProject(userId, name): Create project, handle duplicate name conflict
   - deleteProject(userId, projectId): Delete project (notes/actions get projectId set to null)
   - findOrCreateProject(userId, name): Helper that creates if doesn't exist, returns project

2. Create packages/api/src/controllers/projects.ts:
   - GET / - list all projects with counts
   - POST / - create project (body: { name })
   - GET /:id - get single project
   - DELETE /:id - delete project

3. Create packages/api/src/routes/projects.ts:
   - Router with all project routes
   - All routes protected with apiKeyAuth

4. Create packages/api/src/lib/validators.ts:
   - validateProjectName(name): Check not empty, max 100 chars
   - Return validation errors in consistent format

5. Update packages/api/src/routes/index.ts:
   - Mount projects router at /projects

6. Response formats:
   - List: { success: true, data: { projects: [...] } }
   - Create/Get: { success: true, data: { project: {...} } }
   - Delete: { success: true, message: "Project deleted successfully" }

Use asyncHandler for all controller functions.
Use the error factories for all error cases.
```

**Verification:** Can create, list, get, and delete projects via API.

---

### Prompt 9: Labels CRUD

**Context:** We have Projects. Now build Labels (very similar pattern).

```text
Create Labels CRUD endpoints in @pa/api. Follow the same patterns as Projects.

1. Create packages/api/src/services/labelService.ts:
   - getLabels(userId): Get all labels sorted alphabetically, with note/action counts
   - getLabel(userId, labelId): Get single label
   - createLabel(userId, name): Create label, handle duplicates (case-insensitive)
   - deleteLabel(userId, labelId): Delete label (removes from junction tables)
   - findOrCreateLabels(userId, names[]): Helper that creates missing labels, returns all

2. Create packages/api/src/controllers/labels.ts:
   - GET / - list all labels with counts
   - POST / - create label (body: { name })
   - GET /:id - get single label
   - DELETE /:id - delete label

3. Create packages/api/src/routes/labels.ts:
   - Router with all label routes
   - All routes protected with apiKeyAuth

4. Add to validators.ts:
   - validateLabelName(name): Check not empty, max 50 chars, lowercase it

5. Update packages/api/src/routes/index.ts:
   - Mount labels router at /labels

6. Note: When comparing label names for duplicates, use case-insensitive comparison.
   Store labels in lowercase for consistency.
```

**Verification:** Can create, list, get, and delete labels via API.

---

### Prompt 10: Notes CRUD Basics

**Context:** We have Projects and Labels. Now build Notes.

```text
Create Notes CRUD endpoints in @pa/api (basic CRUD first, filtering in next step).

1. Create packages/api/src/services/noteService.ts:
   - createNote(userId, data: { summary, projectName, labelNames[], important, source })
     - Uses findOrCreateProject and findOrCreateLabels
     - Creates note with relations
     - Returns note with project name and label names

   - getNote(userId, noteId)
     - Returns note with project and labels
     - Throws notFoundError if not found

   - updateNote(userId, noteId, data: { summary?, projectName?, labelNames?, important? })
     - Updates note, handles project/label changes
     - Returns updated note

   - deleteNote(userId, noteId)
     - Deletes note
     - Returns success

   - getNotes(userId, filters: {})
     - For now, just return all notes sorted by createdAt desc
     - Include project name and label names
     - Limit to 50 by default

2. Create packages/api/src/controllers/notes.ts:
   - GET / - list notes (no filters yet)
   - POST / - create note
   - GET /:id - get single note
   - PUT /:id - update note
   - DELETE /:id - delete note

3. Create packages/api/src/routes/notes.ts:
   - Router with all note routes
   - All routes protected with apiKeyAuth

4. Add to validators.ts:
   - validateNoteInput(data): Validate summary required, source must be valid enum

5. Update packages/api/src/routes/index.ts:
   - Mount notes router at /notes

6. Transform Prisma results to match the shared types (project as string, labels as string[])
```

**Verification:** Can create, read, update, delete notes with project and labels.

---

### Prompt 11: Notes Filtering

**Context:** We have basic Notes CRUD. Add filtering and search.

```text
Add filtering capabilities to the Notes GET endpoint.

1. Update noteService.getNotes to accept filter parameters:
   - project: string (filter by exact project name)
   - labels: string[] (filter by ANY of these labels)
   - important: boolean (filter by important flag)
   - fromDate: Date (created after)
   - toDate: Date (created before)
   - search: string (full-text search on summary)
   - limit: number (default 50, max 100)
   - offset: number (default 0)

2. Build the Prisma where clause dynamically:
   - Project filter: project.name equals
   - Labels filter: labels.some.name.in
   - Important filter: important equals
   - Date filters: createdAt gte/lte
   - Search: Use Prisma's search or contains (for now use contains, we'll optimize later)

3. Return response with pagination info:
   ```json
   {
     "success": true,
     "data": {
       "notes": [...],
       "total": 150,
       "limit": 50,
       "offset": 0
     }
   }
   ```

4. Update the controller to parse query parameters:
   - project, labels (comma-separated), important, from_date, to_date, search, limit, offset

5. Add a simple utility to parse comma-separated strings to arrays
```

**Verification:** Can filter notes by project, labels, important, date range. Pagination works.

---

### Prompt 12: Actions CRUD Basics

**Context:** We have Notes. Now build Actions (similar pattern with priority).

```text
Create Actions CRUD endpoints in @pa/api (basic CRUD, priority/complete in next step).

1. Create packages/api/src/services/actionService.ts:
   - createAction(userId, data: { title, projectName, labelNames[], urgency, importance, source })
     - Uses findOrCreateProject and findOrCreateLabels
     - Calculates priorityScore = urgency * importance
     - Creates action with status "open"
     - Returns action with project name and label names

   - getAction(userId, actionId)
     - Returns action with project and labels
     - Throws notFoundError if not found

   - updateAction(userId, actionId, data: { title?, projectName?, labelNames?, urgency?, importance? })
     - Updates action
     - Recalculates priorityScore if urgency or importance changed
     - Returns updated action

   - deleteAction(userId, actionId)
     - Deletes action (both open and completed)
     - Returns success

   - getActions(userId, filters: {})
     - For now, return open actions sorted by priorityScore desc
     - Include project name and label names
     - Limit to 50 by default

2. Create packages/api/src/controllers/actions.ts:
   - GET / - list actions
   - POST / - create action
   - GET /:id - get single action
   - PUT /:id - update action
   - DELETE /:id - delete action

3. Create packages/api/src/routes/actions.ts:
   - Router with all action routes
   - All routes protected with apiKeyAuth

4. Add to validators.ts:
   - validateActionInput(data):
     - title required
     - urgency 1-5
     - importance 1-5
     - source must be valid enum
```

**Verification:** Can create, read, update, delete actions with priority calculation.

---

### Prompt 13: Actions Priority & Complete

**Context:** We have basic Actions CRUD. Add complete functionality.

```text
Add action completion and improve priority handling.

1. Add to actionService.ts:
   - completeActions(userId, actionIds: number[])
     - Find all actions with given ids belonging to user
     - Update status to "completed", set completedAt to now
     - Return object: { completed: number[], notFound: number[], alreadyCompleted: number[] }

   - reopenAction(userId, actionId)
     - Set status back to "open", clear completedAt
     - Return updated action

2. Add new controller methods in actions.ts:
   - POST /complete - complete multiple actions
     - Body: { ids: number[] }
     - Response: { success: true, data: { completed, notFound, alreadyCompleted } }

3. Update getActions in service to:
   - Default to status "open"
   - When status is "open", sort by priorityScore DESC, then createdAt DESC
   - When status is "completed", sort by completedAt DESC

4. Add helper function to format action response:
   - Include priorityScore
   - Format dates consistently
   - Include human-readable priority indicator (e.g., "critical", "high", "medium", "low")
     - 20-25: critical
     - 12-19: high
     - 6-11: medium
     - 1-5: low
```

**Verification:** Can complete multiple actions at once, completed actions have completedAt timestamp.

---

### Prompt 14: Actions Filtering

**Context:** We have action completion. Add filtering.

```text
Add filtering capabilities to the Actions GET endpoint.

1. Update actionService.getActions to accept filter parameters:
   - project: string (filter by exact project name)
   - labels: string[] (filter by ANY of these labels)
   - status: "open" | "completed" (default: "open")
   - sort: "priority" | "created_at" | "urgency" | "importance" (default: "priority")
   - order: "asc" | "desc" (default: "desc")
   - top: number (return only top N by priority - useful for "top 5 actions")
   - search: string (search in title)
   - limit: number (default 50, max 100)
   - offset: number (default 0)

2. Build the Prisma where clause dynamically (same pattern as notes)

3. Handle sorting:
   - priority: sort by priorityScore
   - created_at: sort by createdAt
   - urgency: sort by urgency
   - importance: sort by importance

4. For "top" parameter:
   - Override limit with top value
   - Force sort by priority desc
   - Ignore offset

5. Return response with pagination info

6. Add endpoint for completed actions:
   - GET /completed - calls getActions with status: "completed"
   - Add filter for completedAt date range: from_completed, to_completed
```

**Verification:** Can filter actions by all parameters, top N works, can view completed actions.

---

### Prompt 15: Search Endpoint

**Context:** We have Notes and Actions. Add unified search.

```text
Create a unified search endpoint for @pa/api.

1. Create packages/api/src/services/searchService.ts:
   - search(userId, params: { query, type?, project?, labels?, limit? })
     - type: "all" | "notes" | "actions" (default: "all")
     - Searches note summaries and action titles
     - Returns { notes: Note[], actions: Action[], totalNotes: number, totalActions: number }

2. For now, use simple ILIKE/contains search:
   - Search is case-insensitive
   - Matches partial words
   - Later we can upgrade to PostgreSQL full-text search

3. Create packages/api/src/controllers/search.ts:
   - GET / - unified search
     - Query params: q (required), type, project, labels, limit

4. Create packages/api/src/routes/search.ts:
   - Router with search route
   - Protected with apiKeyAuth

5. Update routes/index.ts:
   - Mount search router at /search

6. Response format:
   ```json
   {
     "success": true,
     "data": {
       "notes": [...],
       "actions": [...],
       "totalNotes": 5,
       "totalActions": 3
     }
   }
   ```

7. Add validation:
   - q parameter is required and must be at least 2 characters
```

**Verification:** Can search across notes and actions, filter by type and project.

---

### Prompt 16: MCP Server Setup

**Context:** API is complete. Now create the MCP server.

```text
Create the MCP server in @pa/mcp-server package.

1. Install dependencies:
   - @modelcontextprotocol/sdk
   - node-fetch (or use native fetch if Node 18+)
   - @pa/shared (workspace dependency)

2. Create packages/mcp-server/src/index.ts:
   - Entry point that creates and starts the MCP server
   - Read PA_API_URL and PA_API_KEY from environment

3. Create packages/mcp-server/src/api-client.ts:
   - ApiClient class that wraps HTTP calls to the PA API
   - Constructor takes apiUrl and apiKey
   - Methods for each API endpoint:
     - getProjects()
     - getLabels()
     - getNotes(filters)
     - createNote(data)
     - updateNote(id, data)
     - deleteNote(id)
     - getActions(filters)
     - createAction(data)
     - updateAction(id, data)
     - deleteAction(id)
     - completeActions(ids)
     - search(params)
   - Handle errors and return user-friendly messages

4. Create packages/mcp-server/src/server.ts:
   - Create MCP server using the SDK
   - Define server info: name "pa", version "1.0.0"
   - Initialize with ApiClient

5. Add basic tool registration (we'll implement tools in next prompts):
   - Register a test tool "test_connection" that calls the health endpoint

6. Add scripts to package.json:
   - "dev": "tsx watch src/index.ts"
   - "build": "tsc"
   - "start": "node dist/index.js"

7. Create README with setup instructions for Claude Desktop config
```

**Verification:** MCP server starts, test_connection tool works when tested.

---

### Prompt 17: MCP Read Tools

**Context:** We have MCP server setup. Add read tools.

```text
Add read-only MCP tools to @pa/mcp-server.

Create packages/mcp-server/src/tools/index.ts that exports all tools.

1. get_projects tool:
   - No parameters
   - Returns list of projects with names sorted alphabetically
   - Format for LLM readability

2. get_labels tool:
   - No parameters
   - Returns list of labels sorted alphabetically

3. get_notes tool:
   - Parameters: project?, labels?, important?, from_date?, to_date?, limit?
   - Returns formatted notes list
   - Include: id, summary (truncated to 200 chars), project, labels, important, created date

4. get_actions tool:
   - Parameters: project?, labels?, status?, top?, limit?
   - Returns formatted actions list
   - Include: id, title, project, labels, urgency, importance, priority_score, status

5. get_completed_actions tool:
   - Parameters: project?, from_date?, limit?
   - Returns completed actions

6. search tool:
   - Parameters: query (required), type?, project?, limit?
   - Returns search results for notes and actions

For each tool:
- Write clear descriptions for Claude to understand when to use them
- Format output as readable text, not raw JSON
- Handle errors gracefully with helpful messages

Register all tools in server.ts
```

**Verification:** All read tools work when invoked through MCP inspector or test client.

---

### Prompt 18: MCP Write Tools

**Context:** We have read tools. Add write tools.

```text
Add write MCP tools to @pa/mcp-server.

1. save_note tool:
   - Parameters: summary (required), project (required), labels?, important?
   - Automatically sets source to "Claude Code" (detect from env/client if possible)
   - Returns confirmation with note ID

2. save_action tool:
   - Parameters: title (required), project (required), labels?, urgency (required 1-5), importance (required 1-5)
   - Calculates and shows priority score in response
   - Returns confirmation with action ID and priority

3. edit_note tool:
   - Parameters: id (required), summary?, project?, labels?, important?
   - At least one field besides id required
   - Returns updated note summary

4. edit_action tool:
   - Parameters: id (required), title?, project?, labels?, urgency?, importance?
   - Shows new priority if urgency/importance changed
   - Returns updated action summary

5. delete_note tool:
   - Parameters: id (required)
   - Returns confirmation

6. delete_action tool:
   - Parameters: id (required)
   - Returns confirmation

7. complete_actions tool:
   - Parameters: ids (required, array of numbers)
   - Returns summary: "Completed X actions. Not found: [ids]. Already completed: [ids]"

For all tools:
- Validate parameters before API calls
- Return user-friendly error messages
- Include relevant context in success messages (e.g., "Note saved to project 'Babblo App' with labels: marketing, content")

Update server.ts to register all tools.
```

**Verification:** All write tools work, can create/edit/delete notes and actions, complete actions.

---

### Prompt 19: Next.js Project with Dark Theme

**Context:** Backend is complete. Start the web UI.

```text
Create the Next.js web application in @pa/web.

1. Initialize Next.js with:
   - TypeScript
   - Tailwind CSS
   - App Router
   - No src directory (use app/ at root of package)

2. Install additional dependencies:
   - @pa/shared (workspace)
   - lucide-react (icons)

3. Configure Tailwind for dark mode:
   - Use class-based dark mode
   - Default to dark theme
   - Create color palette in tailwind.config.js:
     - Background: slate-900, slate-800
     - Text: slate-100, slate-300
     - Accent: cyan-500, cyan-400
     - Error: red-500
     - Success: green-500
     - Warning: amber-500

4. Create packages/web/app/layout.tsx:
   - Add dark class to html element
   - Set up basic layout with full-height
   - Add meta tags

5. Create packages/web/app/globals.css:
   - Tailwind imports
   - Base styles for dark theme
   - Custom scrollbar styles (dark themed)

6. Create packages/web/app/page.tsx:
   - Simple "PA" title and "Loading..." for now
   - Will be replaced with dashboard

7. Create packages/web/components/ui/:
   - Button.tsx - reusable button component with variants (primary, secondary, danger)
   - Card.tsx - card container with dark styling
   - Input.tsx - styled input with dark theme
   - Badge.tsx - small badge/chip for labels and priority

8. Add scripts to package.json:
   - "dev": "next dev -p 3000"
   - "build": "next build"
   - "start": "next start"
```

**Verification:** Web app runs on port 3000 with dark theme, components render correctly.

---

### Prompt 20: Web Authentication

**Context:** We have the Next.js shell. Add authentication.

```text
Add authentication to @pa/web.

1. Create packages/web/lib/api.ts:
   - API client that handles auth
   - Uses fetch with credentials: "include" for cookies
   - Base URL from NEXT_PUBLIC_API_URL env var
   - Methods: login, logout, getMe, and generic request helper

2. Create packages/web/app/api/auth/[...nextauth]/route.ts:
   - OR use simple cookie-based auth with our own API

   Actually, let's keep it simple - use our API's session directly:

3. Create packages/web/context/AuthContext.tsx:
   - AuthProvider component
   - State: user, loading, error
   - Methods: login(username, password), logout(), checkAuth()
   - On mount, call checkAuth() to verify session
   - Provide context to children

4. Create packages/web/app/login/page.tsx:
   - Login form with username and password
   - Dark styled form
   - Error message display
   - Redirect to /dashboard on success
   - Use the auth context

5. Create packages/web/components/auth/ProtectedRoute.tsx:
   - Wrapper component that checks auth
   - Redirects to /login if not authenticated
   - Shows loading state while checking

6. Create packages/web/middleware.ts:
   - Basic middleware that checks for auth on protected routes
   - Allow /login without auth

7. Update layout.tsx:
   - Wrap with AuthProvider

8. Add login endpoint to @pa/api if not exists:
   - POST /api/v1/auth/login - sets session cookie
   - POST /api/v1/auth/logout - clears session cookie
   - GET /api/v1/auth/me - returns current user

Use express-session or similar for session management in API.
```

**Verification:** Can login, session persists, protected routes redirect to login.

---

### Prompt 21: Notes List Page

**Context:** We have auth. Build the notes page.

```text
Create the notes list page in @pa/web.

1. Create packages/web/app/notes/page.tsx:
   - Protected route
   - Fetches notes from API on mount
   - Displays notes in a list/grid

2. Create packages/web/components/notes/NotesList.tsx:
   - Props: notes array
   - Renders list of NoteCard components
   - Empty state when no notes

3. Create packages/web/components/notes/NoteCard.tsx:
   - Displays note summary (truncated)
   - Project badge
   - Label badges (different color)
   - Important indicator (star icon)
   - Created date (relative, e.g., "2 days ago")
   - Edit and delete action buttons (icons)
   - Click to expand full summary

4. Create packages/web/hooks/useNotes.ts:
   - Custom hook for notes data
   - State: notes, loading, error
   - Methods: fetchNotes(filters), deleteNote(id), refetch()

5. Add navigation:
   - Create packages/web/components/layout/Sidebar.tsx
     - Links: Dashboard, Notes, Actions
     - Logo/title at top
     - User info and logout at bottom
   - Create packages/web/components/layout/Layout.tsx
     - Sidebar + main content area
   - Update app layout to use Layout component for authenticated pages

6. Style the page:
   - Header with "Notes" title and "Add Note" button
   - Responsive grid (1 col mobile, 2 cols tablet, 3 cols desktop)
```

**Verification:** Notes page loads and displays notes from API with proper styling.

---

### Prompt 22: Notes Create/Edit Modal

**Context:** We have notes list. Add create/edit modal.

```text
Create notes create/edit modal in @pa/web.

1. Create packages/web/components/ui/Modal.tsx:
   - Reusable modal component
   - Dark overlay
   - Centered content
   - Close on overlay click or X button
   - Props: isOpen, onClose, title, children

2. Create packages/web/components/notes/NoteModal.tsx:
   - Props: isOpen, onClose, note? (for edit mode), onSave
   - Form fields:
     - Summary (textarea, required)
     - Project (dropdown with existing + "Create new" option)
     - Labels (multi-select with existing + "Create new" option)
     - Important (checkbox)
   - Save and Cancel buttons
   - Loading state during save

3. Create packages/web/components/ui/Select.tsx:
   - Dropdown select component
   - Supports "Create new" option
   - Dark styled

4. Create packages/web/components/ui/MultiSelect.tsx:
   - Multi-select with chips
   - Supports adding new options
   - Remove chip by clicking X

5. Create packages/web/hooks/useProjects.ts:
   - Fetch and cache projects list

6. Create packages/web/hooks/useLabels.ts:
   - Fetch and cache labels list

7. Update NotesList:
   - Add modal state (isOpen, selectedNote)
   - "Add Note" button opens modal with no note (create mode)
   - Edit button opens modal with note (edit mode)
   - On save, refetch notes and close modal

8. Connect to API:
   - Create note: POST /notes
   - Update note: PUT /notes/:id
```

**Verification:** Can create new notes, edit existing notes, modal works properly.

---

### Prompt 23: Notes Filtering UI

**Context:** We have notes CRUD. Add filtering.

```text
Add filtering UI to the notes page in @pa/web.

1. Create packages/web/components/notes/NotesFilters.tsx:
   - Filter bar above the notes list
   - Filters:
     - Project dropdown (all + each project)
     - Labels multi-select
     - Important toggle (all/important only)
     - Date range picker (from/to)
   - Clear filters button
   - Search input

2. Create packages/web/components/ui/DatePicker.tsx:
   - Simple date input
   - Dark styled
   - Optional: use a library like react-day-picker with custom styling

3. Create packages/web/components/ui/Toggle.tsx:
   - On/off toggle switch
   - Dark styled

4. Create packages/web/components/ui/SearchInput.tsx:
   - Input with search icon
   - Debounced onChange (300ms)
   - Clear button

5. Update notes/page.tsx:
   - State for all filter values
   - Pass filters to useNotes hook
   - NotesFilters component updates filter state
   - Filters passed to API call as query params

6. Update useNotes.ts:
   - Accept filters parameter
   - Build query string from filters
   - Refetch when filters change

7. Add loading indicator:
   - Show spinner/skeleton while fetching
   - Disable filter changes during fetch

8. Add result count:
   - Show "Showing X of Y notes" text
```

**Verification:** Can filter notes by all criteria, search works with debounce.

---

### Prompt 24: Actions List Page

**Context:** We have notes complete. Build actions page.

```text
Create the actions list page in @pa/web.

1. Create packages/web/app/actions/page.tsx:
   - Protected route
   - Fetches actions from API
   - Displays actions in a list

2. Create packages/web/components/actions/ActionsList.tsx:
   - Props: actions array, onComplete, onEdit, onDelete
   - Renders list of ActionCard components
   - Empty state when no actions

3. Create packages/web/components/actions/ActionCard.tsx:
   - Checkbox to complete (left side)
   - Title
   - Project badge
   - Label badges
   - Priority score badge with color:
     - 20-25: red (critical)
     - 12-19: orange (high)
     - 6-11: yellow (medium)
     - 1-5: green (low)
   - Urgency and Importance indicators (small dots or numbers)
   - Created date
   - Edit and delete buttons
   - Completed actions: greyed out with strikethrough

4. Create packages/web/hooks/useActions.ts:
   - State: actions, loading, error
   - Methods: fetchActions(filters), deleteAction(id), completeActions(ids), refetch()
   - Default filter: status = "open"

5. Add tab or toggle for Open/Completed:
   - Switch between viewing open and completed actions
   - Different empty states for each

6. Sort indicator:
   - Show current sort (Priority, Created, etc.)
   - Default: Priority descending

7. Add "Add Action" button in header
```

**Verification:** Actions page displays with priority colors, can toggle open/completed.

---

### Prompt 25: Actions Create/Edit Modal

**Context:** We have actions list. Add create/edit modal.

```text
Create actions create/edit modal in @pa/web.

1. Create packages/web/components/actions/ActionModal.tsx:
   - Props: isOpen, onClose, action? (for edit), onSave
   - Form fields:
     - Title (input, required)
     - Project (dropdown)
     - Labels (multi-select)
     - Urgency (1-5 rating input)
     - Importance (1-5 rating input)
   - Live priority score display (urgency × importance)
   - Priority color indicator updates live
   - Save and Cancel buttons

2. Create packages/web/components/ui/RatingInput.tsx:
   - Component for 1-5 rating
   - Could be:
     - 5 buttons in a row
     - Slider
     - Dropdown
   - Highlight selected value
   - Labels: 1=Low, 2, 3=Medium, 4, 5=High

3. Create packages/web/components/actions/PriorityBadge.tsx:
   - Reusable priority badge component
   - Takes score as prop
   - Returns styled badge with color and label

4. Update ActionsList:
   - Add modal state
   - "Add Action" opens modal in create mode
   - Edit button opens modal in edit mode
   - On save, refetch and close

5. Connect to API:
   - Create action: POST /actions
   - Update action: PUT /actions/:id

6. Form validation:
   - Title required
   - Urgency and Importance required, 1-5
   - Show validation errors
```

**Verification:** Can create and edit actions, priority score updates live.

---

### Prompt 26: Actions Complete & Filter

**Context:** We have actions CRUD. Add complete and filter.

```text
Add action completion and filtering to @pa/web.

1. Update ActionCard.tsx:
   - Checkbox onClick calls onComplete with action id
   - Checkbox is disabled during loading
   - Show brief loading state on complete

2. Update useActions.ts:
   - completeActions sends POST /actions/complete with ids array
   - Optimistically update UI (mark as completed immediately)
   - Rollback on error

3. Add bulk complete:
   - Checkbox in header to select all visible
   - "Complete selected" button appears when any selected
   - Track selected action ids in state

4. Create packages/web/components/actions/ActionsFilters.tsx:
   - Similar to NotesFilters
   - Filters:
     - Project dropdown
     - Labels multi-select
     - Sort dropdown (Priority, Created Date, Urgency, Importance)
     - Sort order toggle (Asc/Desc)
   - Search input
   - "Show top N" input (e.g., "Top 5")

5. Update actions/page.tsx:
   - State for filters
   - Pass filters to useActions
   - Connect ActionsFilters to state

6. Add completed actions view:
   - Tab or segment control: "Open" | "Completed"
   - Completed tab shows completed actions
   - Filter by completion date range

7. Reopen action (optional):
   - On completed actions, show "Reopen" button instead of checkbox
```

**Verification:** Can complete actions, bulk complete works, filtering works.

---

### Prompt 27: Dashboard

**Context:** We have notes and actions pages. Build the dashboard.

```text
Create the dashboard page in @pa/web.

1. Create packages/web/app/dashboard/page.tsx (or update app/page.tsx):
   - Protected route
   - Fetches summary data
   - Main landing page after login

2. Create packages/web/components/dashboard/StatsCard.tsx:
   - Displays a single stat
   - Icon, label, value
   - Optional: color accent

3. Create packages/web/components/dashboard/StatsSummary.tsx:
   - Grid of stats:
     - Total notes
     - Important notes
     - Open actions
     - Completed today
     - Critical actions (score 20+)

4. Create packages/web/components/dashboard/TopActions.tsx:
   - Shows top 5 priority actions
   - Compact view (title, project, priority badge)
   - Checkbox to complete inline
   - "View all" link to actions page

5. Create packages/web/components/dashboard/RecentNotes.tsx:
   - Shows 5 most recent notes
   - Compact view (summary truncated, project, date)
   - "View all" link to notes page

6. Create packages/web/components/dashboard/QuickActions.tsx:
   - "Add Note" button -> opens note modal
   - "Add Action" button -> opens action modal
   - Modals can be rendered at dashboard level

7. Create packages/web/hooks/useDashboard.ts:
   - Fetches data needed for dashboard:
     - GET /notes?limit=5
     - GET /actions?top=5
     - GET /actions?status=completed&from_completed=today
     - Or create a dedicated dashboard endpoint in API

8. Layout:
   - Stats at top (horizontal row)
   - Two columns below: Top Actions (left), Recent Notes (right)
   - Quick actions floating or in corner

9. Redirect /login success to /dashboard
   - Also redirect / to /dashboard if authenticated
```

**Verification:** Dashboard shows stats, top actions, recent notes. Quick actions work.

---

### Prompt 28: Deployment Configuration

**Context:** Application is complete. Set up deployment.

```text
Create deployment configuration for Render.

1. Create render.yaml at project root:
   - Define services:
     - pa-api (web service)
     - pa-web (static site)
     - pa-db (PostgreSQL database)
   - Configure environment variables
   - Set build and start commands

2. Create packages/api/Dockerfile:
   - Multi-stage build
   - Stage 1: Build TypeScript
   - Stage 2: Production image with only dist and node_modules
   - Use node:20-alpine

3. Create packages/web/Dockerfile (optional, Render can build Next.js):
   - Or just use Render's native Next.js support

4. Update packages/api for production:
   - Add production logging (pino or winston)
   - Add request ID middleware
   - Add CORS configuration for production domain
   - Ensure DATABASE_URL uses connection pooling

5. Create packages/api/prisma/migrations folder:
   - Generate initial migration: npx prisma migrate dev --name init
   - Migration should run on deploy

6. Add to packages/api/package.json:
   - "db:deploy": "prisma migrate deploy"
   - This runs in Render release command

7. Environment variables documentation:
   - Create DEPLOYMENT.md with:
     - Required env vars for each service
     - Setup steps
     - How to get API key for MCP

8. Update MCP server README:
   - Instructions for configuring with production API URL
   - How to get and set API key

9. Create packages/mcp-server/install.sh:
   - Script to install MCP server for users
   - Adds to Claude Desktop config
```

**Verification:** Can deploy to Render, all services start correctly.

---

### Prompt 29: API Tests

**Context:** Deployment is configured. Add tests.

```text
Add tests for @pa/api.

1. Install test dependencies:
   - jest
   - @types/jest
   - ts-jest
   - supertest
   - @types/supertest

2. Create packages/api/jest.config.js:
   - Use ts-jest
   - Set test environment to node
   - Coverage configuration

3. Create packages/api/src/test/setup.ts:
   - Set up test database connection
   - Clear database before each test
   - Create test user and get API key

4. Create packages/api/src/test/fixtures.ts:
   - Helper functions to create test data:
     - createTestUser()
     - createTestProject(userId)
     - createTestLabel(userId)
     - createTestNote(userId, projectId)
     - createTestAction(userId, projectId)

5. Create test files:

   packages/api/src/__tests__/auth.test.ts:
   - Test API key authentication
   - Test invalid API key rejection
   - Test missing API key rejection

   packages/api/src/__tests__/projects.test.ts:
   - Test create project
   - Test list projects
   - Test duplicate project handling
   - Test delete project

   packages/api/src/__tests__/notes.test.ts:
   - Test CRUD operations
   - Test filtering by project, labels, important
   - Test date range filtering
   - Test search

   packages/api/src/__tests__/actions.test.ts:
   - Test CRUD operations
   - Test priority calculation
   - Test complete actions
   - Test filtering and sorting
   - Test top N actions

   packages/api/src/__tests__/search.test.ts:
   - Test unified search
   - Test filtering by type

6. Add to package.json:
   - "test": "jest"
   - "test:watch": "jest --watch"
   - "test:coverage": "jest --coverage"

7. Create GitHub Actions workflow .github/workflows/test.yml:
   - Run tests on push and PR
   - Use PostgreSQL service container
```

**Verification:** All tests pass, coverage report generated.

---

### Prompt 30: E2E and MCP Tests

**Context:** API tests complete. Add E2E and MCP tests.

```text
Add E2E tests for web and MCP server tests.

1. Set up Playwright for @pa/web:

   Install:
   - @playwright/test

   Create packages/web/playwright.config.ts:
   - Configure for local development
   - Set base URL

   Create packages/web/e2e/ folder

2. Create E2E tests:

   packages/web/e2e/auth.spec.ts:
   - Test login with valid credentials
   - Test login with invalid credentials
   - Test logout
   - Test protected route redirect

   packages/web/e2e/notes.spec.ts:
   - Test view notes list
   - Test create note
   - Test edit note
   - Test delete note
   - Test filter notes

   packages/web/e2e/actions.spec.ts:
   - Test view actions list
   - Test create action
   - Test complete action
   - Test filter actions
   - Test priority display

   packages/web/e2e/dashboard.spec.ts:
   - Test dashboard loads
   - Test stats display
   - Test quick actions

3. Add MCP server tests:

   Create packages/mcp-server/src/__tests__/tools.test.ts:
   - Mock the API client
   - Test each tool returns correct format
   - Test error handling

   Create packages/mcp-server/src/__tests__/api-client.test.ts:
   - Test API client methods
   - Test error transformation

4. Add scripts:

   packages/web/package.json:
   - "test:e2e": "playwright test"
   - "test:e2e:ui": "playwright test --ui"

   packages/mcp-server/package.json:
   - "test": "jest"

5. Update GitHub Actions:
   - Add E2E test job (needs API and web running)
   - Add MCP server test job

6. Create test documentation:
   - TESTING.md at project root
   - How to run tests locally
   - CI/CD test configuration
```

**Verification:** E2E tests pass, MCP tests pass, CI runs all tests.

---

## Summary

This prompt plan contains 30 incremental prompts that build the PA system from scratch. Each prompt:

1. Builds on previous work
2. Produces working, testable code
3. Integrates fully (no orphaned code)
4. Is sized for ~30-60 minutes of implementation

### Recommended Order

Follow the prompts in order (1-30). However, some parallel tracks are possible:

- **Track A (Backend):** Prompts 1-18
- **Track B (Frontend):** Prompts 19-27 (after prompt 15)
- **Track C (DevOps):** Prompts 28-30 (after prompts 18 and 27)

### Tips for Using These Prompts

1. **Before each prompt:** Verify the previous step works
2. **After each prompt:** Test the new functionality
3. **If stuck:** Reference the PA_SPEC.md for detailed requirements
4. **Adjustments:** Feel free to modify prompts based on your specific needs or tech preferences

---

## Quick Reference: Files by Prompt

| Prompt | Key Files Created |
|--------|-------------------|
| 1 | package.json, turbo.json, pnpm-workspace.yaml |
| 2 | packages/shared/src/index.ts |
| 3 | packages/api/prisma/schema.prisma |
| 4 | packages/api/src/index.ts, app.ts, config.ts |
| 5 | packages/api/src/lib/prisma.ts |
| 6 | packages/api/src/middleware/auth.ts |
| 7 | packages/api/src/lib/errors.ts, middleware/errorHandler.ts |
| 8 | packages/api/src/services/projectService.ts, controllers/projects.ts |
| 9 | packages/api/src/services/labelService.ts, controllers/labels.ts |
| 10 | packages/api/src/services/noteService.ts, controllers/notes.ts |
| 11 | (updates to noteService.ts and notes.ts) |
| 12 | packages/api/src/services/actionService.ts, controllers/actions.ts |
| 13 | (updates to actionService.ts) |
| 14 | (updates to actionService.ts and actions.ts) |
| 15 | packages/api/src/services/searchService.ts, controllers/search.ts |
| 16 | packages/mcp-server/src/index.ts, api-client.ts, server.ts |
| 17 | packages/mcp-server/src/tools/*.ts (read tools) |
| 18 | packages/mcp-server/src/tools/*.ts (write tools) |
| 19 | packages/web/app/*, components/ui/* |
| 20 | packages/web/context/AuthContext.tsx, app/login/* |
| 21 | packages/web/app/notes/*, components/notes/*, hooks/useNotes.ts |
| 22 | packages/web/components/notes/NoteModal.tsx, components/ui/Modal.tsx |
| 23 | packages/web/components/notes/NotesFilters.tsx |
| 24 | packages/web/app/actions/*, components/actions/* |
| 25 | packages/web/components/actions/ActionModal.tsx |
| 26 | packages/web/components/actions/ActionsFilters.tsx |
| 27 | packages/web/app/dashboard/*, components/dashboard/* |
| 28 | render.yaml, Dockerfile, DEPLOYMENT.md |
| 29 | packages/api/src/__tests__/*.test.ts |
| 30 | packages/web/e2e/*.spec.ts, packages/mcp-server/src/__tests__/* |
