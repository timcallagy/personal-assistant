# Blog Post Workflow Implementation Progress

## Overview
Implementation of two new MCP tools: `get_blog_instructions` and `upload_blog_image`

**Started:** 2024-12-09
**Status:** In Progress

---

## Pre-Implementation Setup

- [x] Create specification document (`docs/BLOG_POST_WORKFLOW_SPEC.md`)
- [x] Create implementation blueprint (`docs/BLOG_POST_WORKFLOW_IMPLEMENTATION.md`)
- [x] Create config directory (`packages/mcp-server/config/`)
- [x] Create blog instructions file (`packages/mcp-server/config/blog-instructions.md`)
- [x] Create image staging directory (`images/blog_post_images/`)
- [x] Add `.gitkeep` to image directory
- [x] Update `.gitignore` to exclude staged images

---

## Step 1: Implement get_blog_instructions Tool

### Tasks
- [x] Add `fs` import to `tools/index.ts`
- [x] Add `path` import to `tools/index.ts`
- [x] Add `fileURLToPath` import from 'url' to `tools/index.ts`
- [x] Add `__filename`, `__dirname`, and `CONFIG_DIR` constants
- [x] Add `get_blog_instructions` tool definition to tools object
- [x] Implement handler with file existence check
- [x] Implement handler with file reading
- [x] Implement error handling for missing file

### Verification
- [x] Tool appears in tools object
- [x] No TypeScript errors related to this tool
- [ ] Tool returns file contents when file exists (manual test pending)
- [ ] Tool returns error when file missing (manual test pending)

---

## Step 2.1: API Client - File Reading and Validation

### Tasks
- [x] Add `fs` import to `api-client.ts`
- [x] Add `path` import to `api-client.ts`
- [x] Add `ALLOWED_IMAGE_TYPES` constant
- [x] Add `MAX_IMAGE_SIZE` constant
- [x] Add `ImageUploadResponse` interface
- [x] Add `validateImageFile` helper function
- [x] Implement file existence check in validateImageFile
- [x] Implement file type validation in validateImageFile
- [x] Implement file size validation in validateImageFile

### Verification
- [x] Constants are properly defined
- [x] Interface is exported (if needed) or accessible
- [ ] validateImageFile throws ApiError for missing file (manual test pending)
- [ ] validateImageFile throws ApiError for invalid type (manual test pending)
- [ ] validateImageFile throws ApiError for oversized file (manual test pending)
- [ ] validateImageFile returns correct object for valid file (manual test pending)

---

## Step 2.2: API Client - Multipart Upload Implementation

### Tasks
- [x] Add `uploadImage` method signature to apiClient object
- [x] Implement call to validateImageFile
- [x] Implement Blob creation from buffer
- [x] Implement FormData creation
- [x] Implement fetch request with correct headers
- [x] Implement response parsing
- [x] Implement error handling for API errors

### Verification
- [x] Method exists in apiClient object
- [x] Method accepts filePath parameter
- [ ] Method returns ImageUploadResponse on success (manual test pending)
- [ ] Method throws ApiError on API failure (manual test pending)
- [x] No Content-Type header is manually set (let fetch handle it)

---

## Step 3.1: upload_blog_image Tool - Skeleton and Schema

### Tasks
- [x] Add `upload_blog_image` tool definition to tools object
- [x] Define schema with `file_path` parameter
- [x] Add description for the tool
- [x] Add description for the file_path parameter
- [x] Add handler skeleton
- [x] Implement absolute path validation

### Verification
- [x] Tool appears in tools object after get_blog_instructions
- [x] Schema validates file_path as required string
- [ ] Handler rejects relative paths with clear error (manual test pending)

---

## Step 3.2: upload_blog_image Tool - Complete Implementation

### Tasks
- [x] Replace placeholder handler with full implementation
- [x] Wire handler to apiClient.uploadImage
- [x] Format success response with filename, URL, size, type
- [x] Implement try-catch for clean error messages
- [x] Ensure errors from API client are properly surfaced

### Verification
- [ ] Handler calls apiClient.uploadImage with correct path (manual test pending)
- [ ] Success response matches specification format (manual test pending)
- [ ] File not found error is descriptive (manual test pending)
- [ ] Invalid file type error is descriptive (manual test pending)
- [ ] File too large error is descriptive (manual test pending)
- [ ] API error is descriptive (manual test pending)

---

## Step 4: Integration Testing

### Build Verification
- [x] Run `pnpm build` in packages/mcp-server
- [x] No TypeScript compilation errors
- [x] No warnings related to new code
- [x] Added `"type": "module"` to package.json (was missing)

### get_blog_instructions Testing
- [ ] Tool can be invoked via MCP
- [ ] Returns full content of blog-instructions.md
- [ ] Returns error when config file is deleted/moved

### upload_blog_image Testing
- [ ] Create test image in `images/blog_post_images/`
- [ ] Tool can be invoked via MCP with absolute path
- [ ] Returns success with URL for valid image
- [ ] Returns error for non-existent file
- [ ] Returns error for non-image file
- [ ] Returns error for file > 5MB
- [ ] Returns error for relative path
- [ ] Uploaded image is accessible via returned URL

### End-to-End Workflow Test
- [ ] Can retrieve blog instructions
- [ ] Can upload featured image
- [ ] Can upload embedded image
- [ ] URLs work in blog post content

---

## Post-Implementation

### Documentation
- [ ] Update MCP server README with new tools (if exists)
- [ ] Verify spec document is accurate to implementation

### Cleanup
- [ ] Remove any TODO comments in code
- [ ] Remove any console.log debugging statements
- [ ] Ensure code follows existing style conventions

### Git
- [ ] Review all changed files
- [ ] Stage changes
- [ ] Commit with descriptive message

---

## Files Modified

| File | Status | Changes |
|------|--------|---------|
| `packages/mcp-server/src/tools/index.ts` | Complete | Added 2 new tools (get_blog_instructions, upload_blog_image), imports, constants |
| `packages/mcp-server/src/api-client.ts` | Complete | Added uploadImage method, validateImageFile function, constants, interface |
| `packages/mcp-server/package.json` | Complete | Added `"type": "module"` for ES module support |
| `.gitignore` | Complete | Added image folder exclusion, blog-template exclusion |

## Files Created

| File | Status |
|------|--------|
| `docs/BLOG_POST_WORKFLOW_SPEC.md` | Complete |
| `docs/BLOG_POST_WORKFLOW_IMPLEMENTATION.md` | Complete |
| `docs/BLOG_POST_WORKFLOW_TODO.md` | Complete |
| `packages/mcp-server/config/blog-instructions.md` | Complete |
| `images/blog_post_images/.gitkeep` | Complete |

---

## Notes & Issues

_Record any issues encountered during implementation:_

1.

---

## Completion Sign-off

- [ ] All tasks completed
- [ ] All verifications passed
- [ ] Code reviewed
- [ ] Committed to git
- [ ] Tested in production-like environment

**Completed:** _________________
