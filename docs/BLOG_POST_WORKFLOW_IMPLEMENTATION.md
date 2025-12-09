# Blog Post Workflow Implementation Blueprint

This document provides a step-by-step implementation guide with prompts for a code-generation LLM.

## Table of Contents

1. [Project Analysis](#project-analysis)
2. [Implementation Phases](#implementation-phases)
3. [Chunk Breakdown](#chunk-breakdown)
4. [Final Step Sizing](#final-step-sizing)
5. [Implementation Prompts](#implementation-prompts)

---

## Project Analysis

### What We're Building

Two new MCP tools for the Personal Assistant:
1. `upload_blog_image` - Upload local images to the blog API
2. `get_blog_instructions` - Retrieve formatting instructions from a config file

### Existing Infrastructure

- MCP server at `packages/mcp-server/`
- API client at `packages/mcp-server/src/api-client.ts`
- Tools defined in `packages/mcp-server/src/tools/index.ts`
- Blog API endpoint exists: `POST /api/v1/blog/admin/images`
- Config file already created: `packages/mcp-server/config/blog-instructions.md`

### Technical Considerations

- MCP server uses ES modules (`"type": "module"`)
- Uses Zod for schema validation
- API client uses fetch with API key authentication
- Image upload requires multipart/form-data (different from JSON endpoints)

---

## Implementation Phases

### Phase 1: get_blog_instructions Tool
Simple file read operation - lowest risk, establishes pattern.

### Phase 2: API Client Extension
Add image upload method to api-client.ts with proper multipart handling.

### Phase 3: upload_blog_image Tool
Wire the API client method to an MCP tool.

### Phase 4: Testing & Validation
Verify everything works end-to-end.

---

## Chunk Breakdown

### Round 1: Initial Chunks

1. **Phase 1: get_blog_instructions**
   - Add file reading utility
   - Create tool definition
   - Add error handling

2. **Phase 2: API Client**
   - Add FormData/file handling imports
   - Create uploadImage method
   - Handle multipart request

3. **Phase 3: upload_blog_image Tool**
   - Add file validation
   - Create tool definition
   - Wire to API client

4. **Phase 4: Testing**
   - Manual testing
   - Error case verification

### Round 2: Smaller Steps

1. **get_blog_instructions**
   - 1.1: Add tool skeleton with schema
   - 1.2: Implement file reading logic
   - 1.3: Add error handling

2. **API Client**
   - 2.1: Add necessary imports
   - 2.2: Create uploadImage method signature
   - 2.3: Implement file reading
   - 2.4: Implement multipart request
   - 2.5: Handle response/errors

3. **upload_blog_image Tool**
   - 3.1: Add tool skeleton with schema
   - 3.2: Add file existence check
   - 3.3: Add file type validation
   - 3.4: Add file size validation
   - 3.5: Wire to API client and format response

4. **Testing**
   - 4.1: Test get_blog_instructions
   - 4.2: Test upload_blog_image success
   - 4.3: Test error cases

### Round 3: Final Step Sizing

After review, some steps can be combined for efficiency while maintaining safety:

1. **get_blog_instructions** (Single step - simple enough)
   - Complete tool with file reading and error handling

2. **API Client uploadImage** (Two steps)
   - 2.1: Method with file reading and validation
   - 2.2: Multipart upload and response handling

3. **upload_blog_image Tool** (Two steps)
   - 3.1: Tool skeleton with validations
   - 3.2: Wire to API client with formatted response

4. **Integration** (Single step)
   - 4.1: End-to-end verification

---

## Final Step Sizing

| Step | Description | Risk Level | Dependencies |
|------|-------------|------------|--------------|
| 1 | get_blog_instructions tool | Low | None |
| 2.1 | API client: file reading & validation | Low | None |
| 2.2 | API client: multipart upload | Medium | Step 2.1 |
| 3.1 | upload_blog_image: skeleton & validation | Low | None |
| 3.2 | upload_blog_image: wire to API client | Low | Steps 2.2, 3.1 |
| 4 | Integration testing | Low | All previous |

---

## Implementation Prompts

### Context for All Prompts

Before running any prompt, the LLM should understand:

- Working directory: `/home/muwawa/workspace/persAssistant`
- MCP server location: `packages/mcp-server/`
- The project uses TypeScript with ES modules
- Existing tools follow a consistent pattern in `tools/index.ts`
- API client is at `src/api-client.ts`

---

## Step 1: Implement get_blog_instructions Tool

### Context

This is the simpler of the two tools. It reads a local markdown file and returns its contents. The config file already exists at `packages/mcp-server/config/blog-instructions.md`.

### Prompt

```text
I need you to add a new MCP tool called `get_blog_instructions` to the Personal Assistant MCP server.

## File to modify
`packages/mcp-server/src/tools/index.ts`

## Requirements

1. Add necessary imports at the top of the file:
   - `fs` from 'fs'
   - `path` from 'path'
   - `fileURLToPath` from 'url'

2. Add a helper to get the config directory path (needed for ES modules):
```typescript
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_DIR = path.join(__dirname, '..', 'config');
```

3. Add the `get_blog_instructions` tool to the `tools` object, placing it in the BLOG TOOLS section after `delete_blog_post`.

4. Tool specification:
   - Name: `get_blog_instructions`
   - Description: "Get the global blog post formatting instructions. Returns the content of the blog instructions configuration file."
   - Schema: Empty object (no parameters)
   - Handler:
     - Construct path to `blog-instructions.md` in the config directory
     - Check if file exists using `fs.existsSync()`
     - If not exists, throw an error with message: "Blog instructions file not found at config/blog-instructions.md. Please create this file with your formatting instructions."
     - If exists, read file using `fs.readFileSync()` with 'utf-8' encoding
     - Return the file contents as a string

## Pattern to follow

Look at existing tools like `get_blog_categories` for the basic structure. The handler should be an async function even though file operations are synchronous (for consistency).

## Error handling

Use a simple throw with a descriptive message. The MCP framework will handle converting this to an appropriate error response.
```

---

## Step 2.1: API Client - File Reading and Validation

### Context

Before we can upload images, we need to add the capability to read local files and validate them. This step adds the foundation without the actual upload logic.

### Prompt

```text
I need you to extend the API client to prepare for image uploads by adding file reading and validation utilities.

## File to modify
`packages/mcp-server/src/api-client.ts`

## Requirements

1. Add imports at the top of the file:
```typescript
import fs from 'fs';
import path from 'path';
```

2. Add constants for image validation after the imports:
```typescript
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
```

3. Add a new interface for the upload response after the `AdminBlogPostSummary` interface:
```typescript
export interface ImageUploadResponse {
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}
```

4. Add a helper function before the `apiClient` object to validate image files:
```typescript
function validateImageFile(filePath: string): { buffer: Buffer; mimetype: string; filename: string } {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new ApiError('FILE_NOT_FOUND', `File not found at ${filePath}. Please verify the file exists.`);
  }

  // Get file extension and validate type
  const ext = path.extname(filePath).toLowerCase();
  const mimetype = ALLOWED_IMAGE_TYPES[ext];
  if (!mimetype) {
    throw new ApiError(
      'INVALID_FILE_TYPE',
      `Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed. Received: ${ext}`
    );
  }

  // Read file and check size
  const buffer = fs.readFileSync(filePath);
  if (buffer.length > MAX_IMAGE_SIZE) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    throw new ApiError(
      'FILE_TOO_LARGE',
      `File size (${sizeMB}MB) exceeds the 5MB limit. Please use a smaller image.`
    );
  }

  const filename = path.basename(filePath);
  return { buffer, mimetype, filename };
}
```

## Notes
- The `ApiError` class already exists in the file, so we can use it directly
- This sets up the foundation for the actual upload in the next step
```

---

## Step 2.2: API Client - Multipart Upload Implementation

### Context

Now we add the actual upload method that uses the validation from the previous step and sends the image to the API using multipart/form-data.

### Prompt

```text
I need you to add the `uploadImage` method to the API client that uploads images using multipart/form-data.

## File to modify
`packages/mcp-server/src/api-client.ts`

## Requirements

1. Add the `uploadImage` method to the `apiClient` object. Place it after the `getBlogCategories` method, before the closing brace of the object.

2. Method implementation:
```typescript
async uploadImage(filePath: string): Promise<ImageUploadResponse> {
  // Validate the file and get its contents
  const { buffer, mimetype, filename } = validateImageFile(filePath);

  // Create form data with the file
  // Note: We need to use the built-in FormData and Blob for Node.js 18+
  const blob = new Blob([buffer], { type: mimetype });
  const formData = new FormData();
  formData.append('image', blob, filename);

  // Make the request without Content-Type header (fetch sets it automatically for FormData)
  const url = `${config.apiUrl}/blog/admin/images`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-Key': config.apiKey,
    },
    body: formData,
  });

  const data = await response.json() as ApiResponse<ImageUploadResponse>;

  if (!data.success || !response.ok) {
    throw new ApiError(
      data.error?.code || 'UPLOAD_FAILED',
      data.error?.message || 'Failed to upload image to the server'
    );
  }

  return data.data as ImageUploadResponse;
}
```

## Important notes

- Do NOT set 'Content-Type' header manually - fetch automatically sets the correct multipart boundary when given FormData
- Node.js 18+ has built-in FormData and Blob support, no additional packages needed
- The API endpoint expects the file field to be named 'image' (matching the multer config in the API)
- We use the `ApiResponse` type that's already imported in the file
```

---

## Step 3.1: upload_blog_image Tool - Skeleton and Schema

### Context

Now we create the MCP tool that will use the API client method. This step creates the tool structure with its schema definition.

### Prompt

```text
I need you to add the `upload_blog_image` MCP tool skeleton to the tools file.

## File to modify
`packages/mcp-server/src/tools/index.ts`

## Requirements

1. Add the `upload_blog_image` tool to the `tools` object. Place it in the BLOG TOOLS section, right after `get_blog_instructions` (which we added earlier).

2. Tool definition:
```typescript
upload_blog_image: {
  description: 'Upload a local image file to the blog. Returns the public URL for use in blog posts as featured image or embedded content.',
  schema: z.object({
    file_path: z.string().describe('Absolute path to the local image file (JPEG, PNG, GIF, or WebP)'),
  }),
  handler: async (args: { file_path: string }) => {
    // Validate that the path is absolute
    if (!path.isAbsolute(args.file_path)) {
      throw new Error(`Please provide an absolute file path. Received: ${args.file_path}`);
    }

    // TODO: Wire to API client in next step
    throw new Error('Not implemented yet');
  },
},
```

## Notes
- The `path` module should already be imported from Step 1
- We add a basic validation that the path is absolute to give better error messages
- The actual implementation will be added in the next step
```

---

## Step 3.2: upload_blog_image Tool - Complete Implementation

### Context

Final step to wire the upload_blog_image tool to the API client and format the response.

### Prompt

```text
I need you to complete the `upload_blog_image` tool implementation by wiring it to the API client.

## File to modify
`packages/mcp-server/src/tools/index.ts`

## Requirements

1. Replace the handler implementation for `upload_blog_image` with the complete version:

```typescript
handler: async (args: { file_path: string }) => {
  // Validate that the path is absolute
  if (!path.isAbsolute(args.file_path)) {
    throw new Error(`Please provide an absolute file path. Received: ${args.file_path}`);
  }

  try {
    const result = await apiClient.uploadImage(args.file_path);

    return `Image uploaded successfully!
- Filename: ${result.filename}
- URL: ${result.url}
- Size: ${result.size} bytes
- Type: ${result.mimetype}`;
  } catch (error) {
    // Re-throw with cleaner message if it's our ApiError
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to upload image. Please try again.');
  }
},
```

## Notes
- The `apiClient` is already imported at the top of the file
- Error handling wraps the API client call to ensure clean error messages
- The response format matches the specification in BLOG_POST_WORKFLOW_SPEC.md
- The URL returned can be used directly in markdown: `![alt text](url)`
```

---

## Step 4: Integration Testing

### Context

All code is now in place. This step provides manual testing instructions to verify everything works.

### Prompt

```text
I need you to help me verify the implementation of the two new MCP tools. Please perform the following tests:

## Test 1: get_blog_instructions

1. The config file should exist at: `packages/mcp-server/config/blog-instructions.md`
2. Read the file to verify its contents
3. Verify the tool would work by checking:
   - The import statements are correct in tools/index.ts
   - The CONFIG_DIR path resolution is correct
   - The tool is properly added to the tools object

## Test 2: upload_blog_image - Verify Setup

1. Check that the API client has the new imports (fs, path)
2. Check that ALLOWED_IMAGE_TYPES and MAX_IMAGE_SIZE constants exist
3. Check that ImageUploadResponse interface exists
4. Check that validateImageFile function exists
5. Check that uploadImage method exists in apiClient object

## Test 3: Build Verification

Run the TypeScript compiler to check for errors:
```bash
cd packages/mcp-server && pnpm build
```

Report any TypeScript errors that need to be fixed.

## Test 4: Create Test Image

Create a small test image to use for manual testing:
1. Verify the images directory exists: `/home/muwawa/workspace/persAssistant/images/blog_post_images/`
2. Note: A real test would require placing an actual image file there

## Expected Outcomes

- No TypeScript compilation errors
- All imports are correct
- All functions and methods are properly defined
- Tool definitions follow the existing pattern in the file
```

---

## Post-Implementation Checklist

After all prompts have been executed, verify:

- [ ] `packages/mcp-server/src/tools/index.ts` contains both new tools
- [ ] `packages/mcp-server/src/api-client.ts` contains `uploadImage` method
- [ ] TypeScript compiles without errors (`pnpm build` in mcp-server)
- [ ] `get_blog_instructions` returns the config file contents
- [ ] `upload_blog_image` successfully uploads an image and returns URL
- [ ] Error cases return descriptive messages

## Troubleshooting

### Common Issues

1. **ES Module path resolution**: If `__dirname` doesn't work, ensure you're using the `fileURLToPath` approach

2. **FormData not found**: Ensure Node.js version is 18+. Check with `node --version`

3. **API returns 401**: Verify the API key is correctly set in MCP server config

4. **File path issues**: The tool expects absolute paths. Relative paths will be rejected with a clear error.

### Rollback

If something goes wrong, the original files can be restored from git:
```bash
git checkout packages/mcp-server/src/tools/index.ts
git checkout packages/mcp-server/src/api-client.ts
```
