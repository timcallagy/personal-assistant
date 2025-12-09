# Blog Post Creation Workflow Specification

## Overview

This specification defines an AI-assisted blog post creation workflow for the Personal Assistant MCP server. The workflow enables users to create blog posts from multiple content sources, with automatic formatting, image handling, and metadata generation.

## Table of Contents

1. [Goals & Requirements](#goals--requirements)
2. [Architecture](#architecture)
3. [New MCP Tools](#new-mcp-tools)
4. [Global Instruction File](#global-instruction-file)
5. [Workflow Details](#workflow-details)
6. [Data Handling](#data-handling)
7. [Error Handling](#error-handling)
8. [File & Directory Structure](#file--directory-structure)
9. [Testing Plan](#testing-plan)

---

## Goals & Requirements

### Primary Goals

- Enable blog post creation from multiple content sources (notes, local files, conversation text)
- Apply consistent formatting and style rules via a global instruction file
- Support featured images and embedded images with automatic placement
- Generate all metadata (title, category, tags, excerpt, meta description) automatically
- Provide a review workflow before publishing

### Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1 | Accept content from PA notes (by ID), local text/markdown files, or conversation text |
| FR-2 | Support combining multiple content sources via AI-assisted merge |
| FR-3 | Apply global formatting instructions from a configuration file |
| FR-4 | Upload local images to the blog API and return public URLs |
| FR-5 | Support featured image and embedded images within post content |
| FR-6 | Automatically determine embedded image placement based on descriptive filenames |
| FR-7 | Auto-generate alt text for all images |
| FR-8 | Auto-generate all post metadata (title, category, tags, excerpt, meta description) |
| FR-9 | Present full preview for user review before creation |
| FR-10 | Support approve/publish, approve as draft, request changes, and cancel actions |
| FR-11 | Allow unlimited revision iterations on request changes |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Image uploads must complete within 30 seconds |
| NFR-2 | Error messages must be descriptive and actionable |
| NFR-3 | Local image files must not be committed to git |

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code CLI                          │
│  - Natural language interface                                   │
│  - Content merging & formatting (AI-assisted)                   │
│  - Image placement decisions                                    │
│  - Metadata generation                                          │
│  - Preview presentation                                         │
│  - Revision handling                                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Server Tools                           │
│  - get_blog_instructions (NEW)                                  │
│  - upload_blog_image (NEW)                                      │
│  - get_note (existing)                                          │
│  - create_blog_post (existing)                                  │
│  - publish_blog_post (existing)                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PA API Server                            │
│  - POST /api/v1/blog/admin/images (image upload)                │
│  - POST /api/v1/blog/admin/posts (create post)                  │
│  - POST /api/v1/blog/admin/posts/:id/publish                    │
│  - GET /api/v1/notes/:id                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input (sources + images + instructions)
          │
          ▼
┌──────────────────────┐
│ 1. Gather Content    │ ← get_note, Read local files, conversation text
└──────────────────────┘
          │
          ▼
┌──────────────────────┐
│ 2. Get Instructions  │ ← get_blog_instructions
└──────────────────────┘
          │
          ▼
┌──────────────────────┐
│ 3. Merge & Format    │ ← AI applies instructions, merges content
└──────────────────────┘
          │
          ▼
┌──────────────────────┐
│ 4. Upload Images     │ ← upload_blog_image (for each image)
└──────────────────────┘
          │
          ▼
┌──────────────────────┐
│ 5. Place Images      │ ← AI determines placement, generates alt text
└──────────────────────┘
          │
          ▼
┌──────────────────────┐
│ 6. Generate Metadata │ ← AI generates title, category, tags, etc.
└──────────────────────┘
          │
          ▼
┌──────────────────────┐
│ 7. Preview & Review  │ ← Full preview shown to user
└──────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────┐
│ 8. User Action                                   │
│    ├─ Approve & Publish → create + publish       │
│    ├─ Approve as Draft → create only             │
│    ├─ Request Changes → loop back to step 3      │
│    └─ Cancel → abort                             │
└──────────────────────────────────────────────────┘
```

---

## New MCP Tools

### Tool 1: `upload_blog_image`

**Purpose:** Upload a local image file to the blog API and return the public URL.

**Schema:**

```typescript
{
  name: 'upload_blog_image',
  description: 'Upload a local image file to the blog. Returns the public URL for use in blog posts.',
  schema: z.object({
    file_path: z.string().describe('Absolute path to the local image file'),
  }),
}
```

**Input:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_path | string | Yes | Absolute path to the local image file |

**Output (Success):**

```
Image uploaded successfully!
- Filename: 1702345678-abc123def456.jpg
- URL: https://pa-api-6uyh.onrender.com/api/v1/blog/images/1702345678-abc123def456.jpg
- Size: 245678 bytes
- Type: image/jpeg
```

**Output (Error):** See [Error Handling](#error-handling-for-upload_blog_image)

**Implementation Notes:**

1. Read the file from the local filesystem using Node.js `fs` module
2. Create a `FormData` object with the file data
3. POST to `/api/v1/blog/admin/images` with the API key header
4. Return the URL from the response

**Code Location:** `packages/mcp-server/src/tools/index.ts`

**API Client Addition:** `packages/mcp-server/src/api-client.ts`

```typescript
async uploadImage(filePath: string): Promise<{
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}> {
  // Implementation details in api-client.ts
}
```

---

### Tool 2: `get_blog_instructions`

**Purpose:** Retrieve the global blog formatting instructions from the configuration file.

**Schema:**

```typescript
{
  name: 'get_blog_instructions',
  description: 'Get the global blog post formatting instructions. Use before creating/formatting blog posts.',
  schema: z.object({}),
}
```

**Input:** None

**Output (Success):**

```
# Blog Post Instructions

## Formatting Rules
- Remove em-dashes (—) and replace with commas or restructure sentences as needed
- Use H1 for post title only
- Use H2 for section headings

## Tone & Style
- Maintain a practical but friendly tone
- Target reading time: 3 minutes maximum

## Structure
- Keep paragraphs concise
- Use clear, actionable language
```

**Output (Error):**

```
Error: Blog instructions file not found at packages/mcp-server/config/blog-instructions.md
```

**Implementation Notes:**

1. Read file from `packages/mcp-server/config/blog-instructions.md`
2. Return raw content as string
3. Throw descriptive error if file doesn't exist

**Code Location:** `packages/mcp-server/src/tools/index.ts`

---

## Global Instruction File

### Location

```
packages/mcp-server/config/blog-instructions.md
```

### Initial Content

```markdown
# Blog Post Formatting Instructions

These instructions are automatically applied when creating blog posts through the Personal Assistant.

## Formatting Rules

### Em-Dashes
- Remove all em-dashes (—)
- Replace with commas where appropriate
- Restructure sentences if needed for better flow

### Headings
- H1 (#): Reserved for post title only - do not use in body content
- H2 (##): Use for main section headings
- H3 (###): Use sparingly for subsections if needed

## Tone & Style

### Voice
- Practical but friendly
- Direct and actionable
- Avoid jargon unless necessary (explain if used)

### Length
- Target reading time: 3 minutes maximum
- Approximately 600-750 words
- Keep paragraphs to 3-4 sentences

## Content Structure

- Open with a hook or relatable scenario
- Present the main insight or information clearly
- End with a takeaway or call to action
```

---

## Workflow Details

### Triggering the Workflow

The workflow is triggered through natural language. Example phrases:

- "Create a blog post from note 5"
- "Write a blog post using note 3 and note 7"
- "Make a blog post from this text: [content]"
- "Create a post from the draft in ~/documents/post-draft.md"

### Step-by-Step Process

#### Step 1: Content Gathering

Claude Code collects content from specified sources:

- **Notes:** Use `get_note` MCP tool with note ID
- **Local files:** Use Read tool with file path
- **Conversation text:** Capture directly from user message

#### Step 2: Instruction Retrieval

Call `get_blog_instructions` to retrieve formatting rules.

#### Step 3: Content Merging & Formatting

AI performs the following:

1. Merge content from multiple sources based on user's high-level guidance
2. Apply all formatting rules from the instruction file
3. Structure content with appropriate headings
4. Ensure reading time target is met (trim or expand as needed)

#### Step 4: Image Upload

For each specified image:

1. User specifies images by filename from the designated folder
2. Call `upload_blog_image` with full path
3. Store returned URLs for embedding

#### Step 5: Image Placement & Alt Text

AI analyzes:

1. Content context and flow
2. Image filenames for semantic meaning
3. Determines optimal placement for embedded images
4. Generates descriptive alt text based on filename + content context

#### Step 6: Metadata Generation

AI generates:

| Field | Generation Approach |
|-------|---------------------|
| Title | Derived from main topic/theme of content |
| Category | Matched to existing categories (Learning, Coding, Marketing, Operational Efficiency, Innovation, General) |
| Tags | 3-5 relevant keywords from content |
| Excerpt | 1-2 sentence summary (max 300 chars) |
| Meta Description | SEO-optimized summary (max 160 chars) |

#### Step 7: Preview Presentation

Display full preview in this format:

```markdown
## Blog Post Preview

**Title:** [Generated Title]
**Category:** [Category]
**Tags:** [tag1, tag2, tag3]
**Excerpt:** [Generated excerpt]
**Meta Description:** [Generated meta description]
**Featured Image:** [URL or "None"]
**Estimated Reading Time:** [X] minutes

---

# [Title]

[Full markdown content with embedded images]

---

## Actions
1. **Approve & Publish** - Create and publish immediately
2. **Approve as Draft** - Create as draft for later publishing
3. **Request Changes** - Tell me what to modify
4. **Cancel** - Abort without creating
```

#### Step 8: User Action Handling

| Action | Behavior |
|--------|----------|
| Approve & Publish | Call `create_blog_post` with status: 'PUBLISHED', confirm success |
| Approve as Draft | Call `create_blog_post` with status: 'DRAFT', confirm success |
| Request Changes | Accept feedback, loop back to Step 3, regenerate preview |
| Cancel | Acknowledge cancellation, no API calls made |

---

## Data Handling

### Content Sources

| Source | Access Method | Data Format |
|--------|---------------|-------------|
| PA Notes | `get_note` MCP tool | Markdown text |
| Local Files | Read tool (Claude Code) | Plain text or Markdown |
| Conversation | Direct capture | Plain text |

### Image Handling

| Stage | Data Format | Storage |
|-------|-------------|---------|
| Local source | Binary file | `/home/muwawa/workspace/persAssistant/images/blog_post_images/` |
| Upload payload | multipart/form-data | Transient |
| API storage | Binary file | Render Disk (`/var/data/uploads/blog`) |
| Reference | URL string | Blog post content (markdown) |

### Image Embedding Format

```markdown
![Alt text generated by AI](https://pa-api-6uyh.onrender.com/api/v1/blog/images/filename.jpg)
```

### Post Data Structure

```typescript
interface BlogPostPayload {
  title: string;           // AI-generated
  content: string;         // Merged, formatted markdown with embedded images
  category: string;        // AI-selected category slug
  excerpt?: string;        // AI-generated (max 300 chars)
  tags?: string[];         // AI-generated (3-5 tags)
  status: 'DRAFT' | 'PUBLISHED';
  metaDescription?: string; // AI-generated (max 160 chars)
  featuredImage?: string;  // Uploaded image URL
}
```

---

## Error Handling

### Error Handling for `upload_blog_image`

| Error Condition | Error Message |
|-----------------|---------------|
| File not found | `Error: File not found at [path]. Please verify the file exists.` |
| Invalid file type | `Error: Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed. Received: [mimetype]` |
| File too large | `Error: File size ([size]MB) exceeds the 5MB limit. Please use a smaller image.` |
| API error | `Error: Failed to upload image. Server responded with: [status] [message]` |
| Network error | `Error: Failed to connect to the API server. Please check your network connection.` |

### Error Handling for `get_blog_instructions`

| Error Condition | Error Message |
|-----------------|---------------|
| File not found | `Error: Blog instructions file not found at packages/mcp-server/config/blog-instructions.md. Please create this file with your formatting instructions.` |
| Read error | `Error: Failed to read blog instructions file: [system error message]` |

### Workflow Error Handling

| Error Condition | Behavior |
|-----------------|----------|
| Note not found | Display error, ask user to verify note ID |
| Local file not found | Display error, ask user to verify path |
| Image upload fails | Display error for specific image, ask if user wants to continue without it |
| Post creation fails | Display API error, offer to retry or save content locally |

---

## File & Directory Structure

### New Files to Create

```
packages/mcp-server/
├── config/
│   └── blog-instructions.md      # NEW: Global instruction file
└── src/
    ├── api-client.ts             # MODIFY: Add uploadImage method
    └── tools/
        └── index.ts              # MODIFY: Add new tools

images/
└── blog_post_images/             # NEW: Local image staging folder
    └── .gitkeep                  # Keep folder in git but ignore contents
```

### .gitignore Additions

Add to root `.gitignore`:

```
# Blog post images (local staging)
images/blog_post_images/*
!images/blog_post_images/.gitkeep
```

---

## Testing Plan

### Unit Tests

#### `upload_blog_image` Tool

| Test ID | Test Case | Input | Expected Output |
|---------|-----------|-------|-----------------|
| UBI-1 | Successful JPEG upload | Valid .jpg path | Success message with URL |
| UBI-2 | Successful PNG upload | Valid .png path | Success message with URL |
| UBI-3 | Successful GIF upload | Valid .gif path | Success message with URL |
| UBI-4 | Successful WebP upload | Valid .webp path | Success message with URL |
| UBI-5 | File not found | Non-existent path | File not found error |
| UBI-6 | Invalid file type | .txt file path | Invalid file type error |
| UBI-7 | File too large | >5MB image | File too large error |
| UBI-8 | API server error | Valid image, mock 500 | API error message |

#### `get_blog_instructions` Tool

| Test ID | Test Case | Setup | Expected Output |
|---------|-----------|-------|-----------------|
| GBI-1 | File exists | Create config file | File content returned |
| GBI-2 | File not found | No config file | File not found error |
| GBI-3 | Empty file | Empty config file | Empty string returned |

### Integration Tests

| Test ID | Test Case | Steps | Expected Outcome |
|---------|-----------|-------|------------------|
| INT-1 | Full workflow - publish | Provide note, image, approve & publish | Post created and published |
| INT-2 | Full workflow - draft | Provide note, image, approve as draft | Post created as draft |
| INT-3 | Workflow with changes | Provide content, request change, approve | Post reflects requested changes |
| INT-4 | Workflow cancel | Provide content, cancel | No post created |
| INT-5 | Multiple images | Provide content + 3 images | All images uploaded and placed |
| INT-6 | No images | Provide content only | Post created without images |
| INT-7 | Multiple content sources | Note + conversation text | Content merged correctly |

### Manual Testing Checklist

- [ ] Upload image with descriptive filename, verify placement makes sense
- [ ] Verify em-dashes are removed from final content
- [ ] Verify H1 only used for title
- [ ] Verify reading time is approximately 3 minutes
- [ ] Verify alt text is descriptive and contextual
- [ ] Verify generated metadata is accurate
- [ ] Verify preview displays correctly
- [ ] Verify all four action buttons work
- [ ] Verify revision loop works multiple times
- [ ] Verify images remain in local folder after publishing

### Test Data

Create test images in `images/blog_post_images/`:

- `workflow-diagram.png` - For testing embedded image placement
- `ai-example-screenshot.jpg` - For testing alt text generation
- `featured-hero-image.jpg` - For testing featured image

Create test note:

```
Use save_note to create a test note with sample blog content
Project: "blog-drafts"
Content: ~500 words of test content about AI
```

---

## Implementation Checklist

### Phase 1: Infrastructure Setup

- [ ] Create `images/blog_post_images/` directory
- [ ] Add `.gitkeep` to the directory
- [ ] Update `.gitignore` with image folder exclusion
- [ ] Create `packages/mcp-server/config/` directory
- [ ] Create `blog-instructions.md` with initial content

### Phase 2: MCP Tool Implementation

- [ ] Add `uploadImage` method to `api-client.ts`
- [ ] Implement `upload_blog_image` tool in `tools/index.ts`
- [ ] Implement `get_blog_instructions` tool in `tools/index.ts`
- [ ] Add necessary imports (fs, path, FormData)

### Phase 3: Testing

- [ ] Write unit tests for new tools
- [ ] Run integration tests
- [ ] Complete manual testing checklist

### Phase 4: Documentation

- [ ] Update MCP server README with new tools
- [ ] Add example usage to documentation

---

## Appendix: Example Usage

### Example 1: Simple Post from Note

**User:** "Create a blog post from note 12"

**Claude Code:**
1. Calls `get_note` with id: 12
2. Calls `get_blog_instructions`
3. Formats content per instructions
4. Generates metadata
5. Presents preview
6. User approves → calls `create_blog_post`

### Example 2: Post with Images

**User:** "Create a blog post from note 5. Use workflow-diagram.png as the featured image and embed process-steps.png in the content."

**Claude Code:**
1. Calls `get_note` with id: 5
2. Calls `get_blog_instructions`
3. Calls `upload_blog_image` for workflow-diagram.png
4. Calls `upload_blog_image` for process-steps.png
5. Formats content, places embedded image
6. Sets featured image URL
7. Generates metadata
8. Presents preview
9. User approves → calls `create_blog_post`

### Example 3: Multi-Source with Revisions

**User:** "Combine notes 3 and 7 into a blog post about AI productivity"

**Claude Code:**
1. Calls `get_note` for both notes
2. Calls `get_blog_instructions`
3. Merges and formats content
4. Generates metadata
5. Presents preview

**User:** "Change the title to 'AI Tools That Actually Save Time'"

**Claude Code:**
1. Updates title
2. Presents updated preview

**User:** "Approve and publish"

**Claude Code:**
1. Calls `create_blog_post` with status: 'PUBLISHED'
2. Confirms success with post URL
