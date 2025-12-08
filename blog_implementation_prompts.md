# Blog Feature Implementation Blueprint

## Overview

This document provides a series of implementation prompts for building the blog feature for timcallagy.com. Each prompt is designed to be:
- **Self-contained**: Can be executed independently
- **Incremental**: Builds on previous work
- **Testable**: Results can be verified before moving on
- **Safe**: No big jumps in complexity

## Project Context

- **Monorepo**: pnpm workspace with Turborepo
- **Packages**: api, web, shared, mcp-server (adding: blog)
- **Database**: PostgreSQL via Prisma
- **Existing Auth**: Session-based authentication
- **API URL**: https://pa-api-6uyh.onrender.com
- **Spec File**: `/home/muwawa/workspace/persAssistant/blog_spec.md`

---

# Phase 1: Database Foundation

## Prompt 1.1: Add Blog Database Models

**Goal**: Add Prisma models for BlogPost, BlogCategory, NewsletterSubscriber, and BlogConfig.

**Prerequisites**: Existing Prisma schema at `packages/api/prisma/schema.prisma`

**Verification**: Run `pnpm --filter @pa/api db:generate` successfully

```text
We're adding a blog feature to our Personal Assistant monorepo. The full specification is in blog_spec.md.

First, let's add the database models. Update the Prisma schema at packages/api/prisma/schema.prisma to add:

1. BlogPost model:
   - id (Int, autoincrement, primary key)
   - title (String, required)
   - slug (String, unique, required)
   - content (String, Text type for long markdown content)
   - excerpt (String, optional, max 300 chars)
   - featuredImage (String, optional, URL)
   - metaDescription (String, optional, max 160 chars)
   - category (String, required - will be category slug)
   - tags (String array)
   - status (enum: DRAFT, PUBLISHED, SCHEDULED)
   - publishAt (DateTime, optional - for scheduled posts)
   - publishedAt (DateTime, optional - actual publish time)
   - viewCount (Int, default 0)
   - authorId (Int, foreign key to User)
   - author (relation to User)
   - createdAt (DateTime, default now)
   - updatedAt (DateTime, auto-update)
   - Add indexes on: slug, [status, publishedAt], category

2. PostStatus enum:
   - DRAFT
   - PUBLISHED
   - SCHEDULED

3. BlogCategory model:
   - id (Int, autoincrement, primary key)
   - name (String, unique)
   - slug (String, unique)
   - description (String, optional)
   - sortOrder (Int, default 0)

4. NewsletterSubscriber model:
   - id (Int, autoincrement, primary key)
   - email (String, unique)
   - subscribedAt (DateTime, default now)
   - consentText (String, required - what they agreed to)
   - ipAddress (String, optional)
   - source (String, default "blog-sidebar")
   - unsubscribedAt (DateTime, optional - null if active)
   - createdAt (DateTime, default now)
   - Add index on email and unsubscribedAt

5. BlogConfig model (singleton pattern):
   - id (Int, primary key, default 1)
   - showPromoBanner (Boolean, default true)
   - promoBannerImage (String, optional)
   - promoBannerLink (String, optional)
   - promoBannerAlt (String, optional)
   - postsPerPage (Int, default 12)
   - featuredPostsCount (Int, default 5)
   - siteTitle (String, default "Tim Callagy")
   - siteDescription (String, optional)
   - socialLinkedIn (String, optional)
   - socialGitHub (String, optional)
   - updatedAt (DateTime, auto-update)

6. Add a posts relation to the existing User model:
   - posts BlogPost[]

After updating the schema, run: pnpm --filter @pa/api db:generate

Do NOT run db:push yet - we'll do that in the next step.
```

---

## Prompt 1.2: Run Database Migration and Seed Categories

**Goal**: Apply schema changes to database and seed the 7 blog categories.

**Prerequisites**: Prompt 1.1 completed, schema updated

**Verification**: Database has new tables, categories seeded

```text
The Prisma schema has been updated with blog models. Now let's apply the changes and seed initial data.

1. Run the database migration:
   pnpm --filter @pa/api db:push

2. Create a seed file for blog categories at packages/api/prisma/seed-blog.ts:

   The file should:
   - Import PrismaClient
   - Create or update the 7 blog categories:
     | name | slug | sortOrder |
     |------|------|-----------|
     | AI for Learning | ai-for-learning | 1 |
     | AI for Coding | ai-for-coding | 2 |
     | AI for Marketing | ai-for-marketing | 3 |
     | AI for Branding | ai-for-branding | 4 |
     | AI for Operational Efficiency | ai-for-operational-efficiency | 5 |
     | AI for Innovation | ai-for-innovation | 6 |
     | AI for Data Insights | ai-for-data-insights | 7 |
   - Create a default BlogConfig record (id: 1) with default values
   - Use upsert to make the script idempotent (can run multiple times safely)

3. Add a script to package.json in packages/api:
   "db:seed-blog": "tsx prisma/seed-blog.ts"

4. Run the seed script:
   pnpm --filter @pa/api db:seed-blog

Verify by checking that the tables exist and categories are populated.
```

---

## Prompt 1.3: Add Blog Types to Shared Package

**Goal**: Add TypeScript types for blog entities in the shared package.

**Prerequisites**: Prompt 1.2 completed

**Verification**: Types compile, can be imported in api package

```text
Now let's add TypeScript types for the blog feature to the shared package so they can be used across api, web, blog, and mcp-server.

Create a new file packages/shared/src/blog.ts with:

1. PostStatus enum (matching Prisma):
   - DRAFT, PUBLISHED, SCHEDULED

2. BlogPost interface:
   - All fields from the Prisma model
   - author as { id: number; username: string } for API responses

3. BlogPostSummary interface (for list views):
   - id, title, slug, excerpt, featuredImage, category, tags
   - publishedAt, readingTime, author (name only)

4. BlogCategory interface:
   - id, name, slug, description, sortOrder
   - postCount (computed, optional)

5. NewsletterSubscriber interface:
   - id, email, subscribedAt, source, unsubscribedAt

6. BlogConfig interface:
   - All fields from the Prisma model

7. API request/response types:
   - CreateBlogPostRequest
   - UpdateBlogPostRequest
   - BlogPostsResponse (with pagination)
   - NewsletterSubscribeRequest
   - NewsletterSubscribeResponse

8. Pagination type:
   - page, limit, total, totalPages, hasMore

9. Helper function: calculateReadingTime(content: string): number
   - 200 words per minute
   - Returns minutes rounded up

10. Helper function: generateSlug(title: string): string
    - Lowercase, replace spaces with hyphens
    - Remove special characters
    - Collapse multiple hyphens
    - Limit to 100 characters

Export everything from the main index.ts file.

Build the shared package after: pnpm --filter @pa/shared build
```

---

# Phase 2: Blog API - Public Endpoints

## Prompt 2.1: Create Blog Router Structure

**Goal**: Set up the blog router structure in the API package.

**Prerequisites**: Phase 1 completed, types available

**Verification**: API starts without errors, /api/blog/health returns OK

```text
Let's create the blog API router structure. We'll set up the file structure and a basic health endpoint first.

1. Create the blog router directory structure in packages/api/src:
   routes/
   └── blog/
       ├── index.ts        (main router, combines sub-routers)
       ├── posts.ts        (public post endpoints)
       ├── categories.ts   (category endpoints)
       ├── newsletter.ts   (newsletter subscription)
       ├── config.ts       (public config endpoint)
       └── admin/
           ├── index.ts    (admin router)
           ├── posts.ts    (admin post CRUD)
           ├── subscribers.ts (admin subscriber management)
           └── config.ts   (admin config management)

2. Create packages/api/src/routes/blog/index.ts:
   - Import express Router
   - Create router instance
   - Add GET /health endpoint that returns { status: 'ok', service: 'blog' }
   - Export the router (don't wire up sub-routers yet, just the health check)

3. Register the blog router in the main app (packages/api/src/index.ts or app.ts):
   - Import blogRouter from './routes/blog'
   - Mount at /api/blog

4. Test by starting the API and hitting GET /api/blog/health

The router should return:
{
  "status": "ok",
  "service": "blog"
}
```

---

## Prompt 2.2: Implement GET /api/blog/categories

**Goal**: Implement the public categories endpoint with post counts.

**Prerequisites**: Prompt 2.1 completed

**Verification**: GET /api/blog/categories returns all 7 categories with postCount

```text
Implement the public categories endpoint that returns all blog categories with their post counts.

1. Create packages/api/src/routes/blog/categories.ts:

   GET / (will be mounted at /api/blog/categories)

   - Fetch all categories ordered by sortOrder
   - For each category, count published posts (status = PUBLISHED, publishedAt <= now)
   - Return format:
     {
       "categories": [
         {
           "id": 1,
           "name": "AI for Learning",
           "slug": "ai-for-learning",
           "description": null,
           "postCount": 5
         },
         ...
       ]
     }

   Implementation approach:
   - Use Prisma to fetch categories with a count aggregation
   - Or fetch categories and posts separately, then compute counts
   - The aggregation approach is more efficient:

     const categories = await prisma.blogCategory.findMany({
       orderBy: { sortOrder: 'asc' },
       include: {
         _count: {
           select: { posts: true }
         }
       }
     });

     Wait - BlogCategory doesn't have a posts relation. Instead, count posts by category string:

     - Fetch all categories
     - For each, count posts where category === slug AND status === 'PUBLISHED' AND publishedAt <= now

2. Wire up the categories router in packages/api/src/routes/blog/index.ts:
   - Import categoriesRouter from './categories'
   - Use router.use('/categories', categoriesRouter)

3. Test with: curl http://localhost:3001/api/blog/categories

All 7 categories should be returned, each with postCount: 0 (since we have no posts yet).
```

---

## Prompt 2.3: Implement GET /api/blog/config

**Goal**: Implement the public config endpoint.

**Prerequisites**: Prompt 2.2 completed

**Verification**: GET /api/blog/config returns blog configuration

```text
Implement the public blog config endpoint that returns site configuration for the frontend.

1. Create packages/api/src/routes/blog/config.ts:

   GET / (will be mounted at /api/blog/config)

   - Fetch BlogConfig with id = 1 (singleton)
   - If not found, return defaults
   - Return only public fields (exclude sensitive data if any):
     {
       "siteTitle": "Tim Callagy",
       "siteDescription": "...",
       "socialLinkedIn": "https://...",
       "socialGitHub": "https://...",
       "showPromoBanner": true,
       "promoBannerImage": "https://...",
       "promoBannerLink": "https://...",
       "promoBannerAlt": "..."
     }

   Implementation:
   - Use prisma.blogConfig.findUnique({ where: { id: 1 } })
   - If null, return sensible defaults
   - Map to response format (exclude id, updatedAt)

2. Wire up in packages/api/src/routes/blog/index.ts:
   - Import configRouter from './config'
   - Use router.use('/config', configRouter)

3. Test with: curl http://localhost:3001/api/blog/config
```

---

## Prompt 2.4: Implement GET /api/blog/posts (List)

**Goal**: Implement the public posts list endpoint with pagination and filtering.

**Prerequisites**: Prompt 2.3 completed

**Verification**: GET /api/blog/posts returns empty array (no posts yet), pagination works

```text
Implement the public posts list endpoint with pagination, category filtering, and tag filtering.

1. Create packages/api/src/routes/blog/posts.ts:

   GET / (will be mounted at /api/blog/posts)

   Query parameters:
   - page (number, default 1)
   - limit (number, default 12, max 50)
   - category (string, optional - filter by category slug)
   - tag (string, optional - filter by tag)
   - featured (boolean, optional - for featured slider, returns most recent)

   Logic:
   - Only return posts where status = 'PUBLISHED' AND publishedAt <= now
   - Order by publishedAt DESC
   - Apply filters if provided
   - Calculate pagination

   Response format:
   {
     "posts": [
       {
         "id": 1,
         "title": "...",
         "slug": "...",
         "excerpt": "...",
         "featuredImage": "...",
         "category": "ai-for-coding",
         "categoryName": "AI for Coding",
         "tags": ["tutorial", "python"],
         "publishedAt": "2024-01-15T10:00:00Z",
         "readingTime": 5,
         "author": {
           "name": "Tim Callagy"
         }
       }
     ],
     "pagination": {
       "page": 1,
       "limit": 12,
       "total": 45,
       "totalPages": 4,
       "hasMore": true
     }
   }

   Implementation details:
   - Use calculateReadingTime from @pa/shared to compute reading time
   - Look up categoryName from BlogCategory table
   - Excerpt: use post.excerpt if set, otherwise generate from content (first 200 chars)
   - Use skip/take for pagination: skip = (page - 1) * limit

2. Wire up in packages/api/src/routes/blog/index.ts:
   - Import postsRouter from './posts'
   - Use router.use('/posts', postsRouter)

3. Test with various queries:
   - curl http://localhost:3001/api/blog/posts
   - curl http://localhost:3001/api/blog/posts?page=1&limit=5
   - curl http://localhost:3001/api/blog/posts?category=ai-for-coding
```

---

## Prompt 2.5: Implement GET /api/blog/posts/:slug (Single Post)

**Goal**: Implement the single post endpoint with related posts and navigation.

**Prerequisites**: Prompt 2.4 completed

**Verification**: Returns 404 for non-existent slug

```text
Implement the single post endpoint that returns full post details including related posts.

Add to packages/api/src/routes/blog/posts.ts:

   GET /:slug

   - Find post by slug
   - Only return if status = 'PUBLISHED' AND publishedAt <= now
   - Return 404 if not found or not published
   - Increment viewCount (fire-and-forget, don't wait)

   Response format:
   {
     "id": 1,
     "title": "Getting Started with AI",
     "slug": "getting-started-with-ai",
     "content": "# Introduction\n\nMarkdown content...",
     "excerpt": "...",
     "featuredImage": "https://...",
     "metaDescription": "Learn the basics...",
     "category": "ai-for-learning",
     "categoryName": "AI for Learning",
     "tags": ["beginner", "introduction"],
     "publishedAt": "2024-01-15T10:00:00Z",
     "readingTime": 5,
     "viewCount": 1234,
     "author": {
       "name": "Tim Callagy",
       "username": "tim"
     },
     "relatedPosts": [
       { "id": 2, "title": "...", "slug": "...", "featuredImage": "..." }
     ],
     "previousPost": { "title": "...", "slug": "..." },
     "nextPost": { "title": "...", "slug": "..." }
   }

   Related posts logic:
   - Find up to 3 published posts in the same category, excluding current post
   - Order by publishedAt DESC

   Previous/Next post logic:
   - Previous: published post with publishedAt < current, order DESC, limit 1
   - Next: published post with publishedAt > current, order ASC, limit 1

   View count increment:
   - Use prisma.blogPost.update({ where: { id }, data: { viewCount: { increment: 1 } } })
   - Don't await - fire and forget for performance
   - Consider adding rate limiting later to prevent abuse

Test with: curl http://localhost:3001/api/blog/posts/non-existent-slug
Should return: { "error": { "code": "NOT_FOUND", "message": "Post not found" } }
```

---

## Prompt 2.6: Implement POST /api/blog/posts/:slug/view

**Goal**: Add explicit view count endpoint (alternative to auto-increment).

**Prerequisites**: Prompt 2.5 completed

**Verification**: POST increments view count

```text
Add an explicit view count endpoint. This allows the frontend to control when views are counted (e.g., after user has been on page for 10 seconds).

Add to packages/api/src/routes/blog/posts.ts:

   POST /:slug/view

   - Find post by slug (must be published)
   - Increment viewCount
   - Return 204 No Content on success
   - Return 404 if post not found

   Implementation:
   const post = await prisma.blogPost.findFirst({
     where: {
       slug: req.params.slug,
       status: 'PUBLISHED',
       publishedAt: { lte: new Date() }
     }
   });

   if (!post) {
     return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
   }

   // Fire and forget
   prisma.blogPost.update({
     where: { id: post.id },
     data: { viewCount: { increment: 1 } }
   }).catch(console.error);

   res.status(204).send();

Also update the GET /:slug endpoint to NOT auto-increment (remove that logic if added in previous prompt). The frontend will call this endpoint explicitly.

Test with: curl -X POST http://localhost:3001/api/blog/posts/some-slug/view
```

---

## Prompt 2.7: Implement GET /api/blog/tags and GET /api/blog/popular

**Goal**: Add tags list and popular posts endpoints.

**Prerequisites**: Prompt 2.6 completed

**Verification**: Both endpoints return data (empty arrays for now)

```text
Add two more public endpoints: tags list and popular posts.

1. Add to packages/api/src/routes/blog/posts.ts (or create a new tags.ts):

   GET /tags (mount at /api/blog/tags)

   - Aggregate all tags from published posts
   - Count occurrences of each tag
   - Return sorted by count DESC

   Response:
   {
     "tags": [
       { "name": "tutorial", "count": 15 },
       { "name": "beginner", "count": 8 }
     ]
   }

   Implementation:
   - Fetch all published posts with just the tags field
   - Flatten all tags arrays
   - Count occurrences using a Map or reduce
   - Sort by count descending
   - Could also use raw SQL for efficiency: SELECT UNNEST(tags) as tag, COUNT(*) ...

2. Add GET /popular endpoint:

   GET /popular (mount at /api/blog/popular)

   Query parameters:
   - limit (number, default 5, max 10)

   - Return published posts ordered by viewCount DESC
   - Only return summary fields (id, title, slug, featuredImage, publishedAt)

   Response:
   {
     "posts": [
       {
         "id": 1,
         "title": "...",
         "slug": "...",
         "featuredImage": "...",
         "publishedAt": "..."
       }
     ]
   }

3. Wire up both endpoints in the blog router.

Test:
- curl http://localhost:3001/api/blog/tags
- curl http://localhost:3001/api/blog/popular?limit=3
```

---

## Prompt 2.8: Implement Newsletter Subscription Endpoint

**Goal**: Implement the newsletter subscription endpoint with GDPR compliance.

**Prerequisites**: Prompt 2.7 completed

**Verification**: Can subscribe with valid email and consent

```text
Implement the newsletter subscription endpoint with proper validation and GDPR compliance.

Create packages/api/src/routes/blog/newsletter.ts:

   POST /subscribe (will be mounted at /api/blog/newsletter/subscribe)

   Request body:
   {
     "email": "user@example.com",
     "consent": true,
     "source": "blog-sidebar"  // optional, defaults to "blog-sidebar"
   }

   Validation:
   - email: required, valid email format (use a regex or validator library)
   - consent: required, must be exactly true (not truthy)
   - source: optional string

   Logic:
   1. Validate input
   2. Check if email already exists and is active (unsubscribedAt is null)
      - If active subscriber exists, return 409 Conflict
      - If unsubscribed exists, reactivate by setting unsubscribedAt = null, update subscribedAt
   3. Create new subscriber with:
      - email
      - subscribedAt: now
      - consentText: "I agree to receive newsletter emails about AI topics from Tim Callagy. Subscribed via {source} on {date}."
      - ipAddress: req.ip or req.headers['x-forwarded-for']
      - source
   4. Return 201 Created

   Response (201):
   {
     "message": "Successfully subscribed to newsletter",
     "email": "user@example.com"
   }

   Error responses:
   - 400: { "error": { "code": "VALIDATION_ERROR", "message": "Valid email is required" } }
   - 400: { "error": { "code": "VALIDATION_ERROR", "message": "Consent is required" } }
   - 409: { "error": { "code": "DUPLICATE_ENTRY", "message": "Email is already subscribed" } }

Wire up in packages/api/src/routes/blog/index.ts:
   - Import newsletterRouter from './newsletter'
   - Use router.use('/newsletter', newsletterRouter)

Test:
- curl -X POST http://localhost:3001/api/blog/newsletter/subscribe \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","consent":true}'
```

---

# Phase 3: Blog API - Admin Endpoints

## Prompt 3.1: Set Up Admin Router with Authentication

**Goal**: Create admin router structure with authentication middleware.

**Prerequisites**: Phase 2 completed

**Verification**: Admin endpoints return 401 without auth

```text
Set up the admin router structure with authentication. Admin endpoints should require the same session authentication used by the rest of the PA portal.

1. Create packages/api/src/routes/blog/admin/index.ts:

   - Import express Router
   - Import the existing auth middleware (look for it in packages/api/src/middleware/)
   - Apply auth middleware to all admin routes
   - Create sub-routers for posts, subscribers, config
   - Add a test endpoint GET /admin/health that returns { status: 'ok', user: req.user.username }

2. Wire up admin router in packages/api/src/routes/blog/index.ts:
   - Import adminRouter from './admin'
   - Use router.use('/admin', adminRouter)

3. The full path will be: /api/blog/admin/*

Test without auth:
- curl http://localhost:3001/api/blog/admin/health
- Should return 401 Unauthorized

Test with auth (use browser or session cookie):
- Should return { status: 'ok', user: 'your-username' }
```

---

## Prompt 3.2: Implement Admin Posts List

**Goal**: Implement admin posts list showing all posts including drafts.

**Prerequisites**: Prompt 3.1 completed

**Verification**: Returns all posts (drafts, published, scheduled)

```text
Implement the admin posts list endpoint that shows all posts regardless of status.

Create packages/api/src/routes/blog/admin/posts.ts:

   GET / (mounted at /api/blog/admin/posts)

   Query parameters:
   - page (number, default 1)
   - limit (number, default 20, max 100)
   - status (string, optional - 'DRAFT', 'PUBLISHED', 'SCHEDULED', or 'all')
   - search (string, optional - search in title and content)

   Logic:
   - Return ALL posts (not just published)
   - Include status in response
   - Order by updatedAt DESC (most recently edited first)
   - If search provided, use case-insensitive contains on title OR content

   Response format:
   {
     "posts": [
       {
         "id": 1,
         "title": "...",
         "slug": "...",
         "status": "DRAFT",
         "category": "ai-for-coding",
         "publishAt": null,
         "publishedAt": null,
         "createdAt": "...",
         "updatedAt": "...",
         "author": { "username": "tim" }
       }
     ],
     "pagination": {
       "page": 1,
       "limit": 20,
       "total": 5,
       "totalPages": 1,
       "hasMore": false
     }
   }

Wire up in packages/api/src/routes/blog/admin/index.ts:
   - Import postsRouter from './posts'
   - Use router.use('/posts', postsRouter)

Test (with auth):
- GET /api/blog/admin/posts
- GET /api/blog/admin/posts?status=DRAFT
- GET /api/blog/admin/posts?search=python
```

---

## Prompt 3.3: Implement Create Blog Post

**Goal**: Implement POST endpoint to create new blog posts.

**Prerequisites**: Prompt 3.2 completed

**Verification**: Can create a draft post

```text
Implement the create blog post endpoint.

Add to packages/api/src/routes/blog/admin/posts.ts:

   POST / (mounted at /api/blog/admin/posts)

   Request body:
   {
     "title": "My New Post",           // required
     "content": "# Markdown...",       // required
     "category": "ai-for-coding",      // required, must be valid category slug
     "excerpt": "Optional excerpt",    // optional
     "featuredImage": "https://...",   // optional
     "metaDescription": "SEO desc",    // optional, max 160 chars
     "tags": ["tutorial", "python"],   // optional array
     "status": "DRAFT",                // optional, default DRAFT
     "publishAt": "2024-02-01T10:00:00Z"  // optional, for scheduled posts
   }

   Validation:
   - title: required, 1-200 characters
   - content: required, 1-100000 characters
   - category: required, must exist in BlogCategory table
   - excerpt: optional, max 300 characters
   - metaDescription: optional, max 160 characters
   - tags: optional, max 10 items, each max 50 characters
   - status: optional, must be DRAFT, PUBLISHED, or SCHEDULED
   - publishAt: required if status is SCHEDULED, must be future date

   Logic:
   1. Validate all inputs
   2. Generate slug from title using generateSlug() from @pa/shared
   3. Check slug uniqueness, if taken append -1, -2, etc.
   4. Set authorId from req.user.id
   5. If status is PUBLISHED, set publishedAt to now
   6. Create post
   7. Return created post with 201 status

   Response (201):
   {
     "id": 5,
     "title": "My New Post",
     "slug": "my-new-post",
     "status": "DRAFT",
     ... (full post object)
   }

   Error responses:
   - 400: Validation errors with details
   - 400: Invalid category

Test:
curl -X POST http://localhost:3001/api/blog/admin/posts \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{
    "title": "Getting Started with AI",
    "content": "# Introduction\n\nThis is my first post about AI...",
    "category": "ai-for-learning",
    "tags": ["beginner", "introduction"]
  }'
```

---

## Prompt 3.4: Implement Get, Update, Delete Blog Post

**Goal**: Implement remaining CRUD operations for blog posts.

**Prerequisites**: Prompt 3.3 completed

**Verification**: Can get, update, and delete a post

```text
Implement the remaining admin post endpoints: get single, update, and delete.

Add to packages/api/src/routes/blog/admin/posts.ts:

1. GET /:id
   - Fetch post by ID (any status, it's admin)
   - Include full content
   - Return 404 if not found

   Response: Full post object including content

2. PUT /:id
   - Update existing post
   - Request body same as create, all fields optional
   - If slug is being changed, check uniqueness
   - If changing status to PUBLISHED and publishedAt is null, set to now
   - If changing status from PUBLISHED to DRAFT, keep publishedAt (don't clear it)
   - Update updatedAt automatically (Prisma does this)

   Response: Updated post object

3. DELETE /:id
   - Delete post permanently
   - Return 204 No Content on success
   - Return 404 if not found

   (Note: Could implement soft delete later, but hard delete is fine for MVP)

4. POST /:id/publish
   - Quick action to publish a draft
   - Sets status to PUBLISHED
   - Sets publishedAt to now if not already set
   - Return updated post

5. POST /:id/unpublish
   - Quick action to unpublish (revert to draft)
   - Sets status to DRAFT
   - Keeps publishedAt for history
   - Return updated post

Test all endpoints:
- GET /api/blog/admin/posts/1
- PUT /api/blog/admin/posts/1 with { "title": "Updated Title" }
- POST /api/blog/admin/posts/1/publish
- POST /api/blog/admin/posts/1/unpublish
- DELETE /api/blog/admin/posts/1
```

---

## Prompt 3.5: Implement Admin Subscribers Endpoints

**Goal**: Implement admin endpoints for managing newsletter subscribers.

**Prerequisites**: Prompt 3.4 completed

**Verification**: Can list and manage subscribers

```text
Implement admin endpoints for managing newsletter subscribers.

Create packages/api/src/routes/blog/admin/subscribers.ts:

1. GET / (mounted at /api/blog/admin/subscribers)

   Query parameters:
   - page (number, default 1)
   - limit (number, default 50, max 200)
   - active (boolean, default true - only active subscribers)

   Response:
   {
     "subscribers": [
       {
         "id": 1,
         "email": "user@example.com",
         "subscribedAt": "2024-01-15T10:00:00Z",
         "source": "blog-sidebar",
         "unsubscribedAt": null
       }
     ],
     "pagination": { ... },
     "stats": {
       "total": 150,
       "active": 142,
       "unsubscribed": 8
     }
   }

2. DELETE /:id
   - "Unsubscribe" a subscriber (soft delete)
   - Set unsubscribedAt to now
   - Return 204 No Content

   (We keep the record for GDPR compliance - proof of consent and unsubscribe)

3. DELETE /:id/permanent
   - Hard delete for GDPR "right to be forgotten" requests
   - Actually remove the record
   - Return 204 No Content

4. GET /export
   - Export active subscribers as CSV
   - Set Content-Type: text/csv
   - Set Content-Disposition: attachment; filename="subscribers-YYYY-MM-DD.csv"
   - Include: email, subscribedAt, source

   CSV format:
   email,subscribed_at,source
   user@example.com,2024-01-15T10:00:00Z,blog-sidebar

Wire up in packages/api/src/routes/blog/admin/index.ts:
   - Import subscribersRouter from './subscribers'
   - Use router.use('/subscribers', subscribersRouter)

Test:
- GET /api/blog/admin/subscribers
- GET /api/blog/admin/subscribers?active=false
- GET /api/blog/admin/subscribers/export
- DELETE /api/blog/admin/subscribers/1
```

---

## Prompt 3.6: Implement Admin Config Endpoints

**Goal**: Implement admin endpoints for managing blog configuration.

**Prerequisites**: Prompt 3.5 completed

**Verification**: Can get and update blog config

```text
Implement admin endpoints for managing blog configuration.

Create packages/api/src/routes/blog/admin/config.ts:

1. GET / (mounted at /api/blog/admin/config)
   - Return full config including id and updatedAt
   - Same as public config but with all fields

   Response:
   {
     "id": 1,
     "showPromoBanner": true,
     "promoBannerImage": "...",
     "promoBannerLink": "...",
     "promoBannerAlt": "...",
     "postsPerPage": 12,
     "featuredPostsCount": 5,
     "siteTitle": "Tim Callagy",
     "siteDescription": "...",
     "socialLinkedIn": "...",
     "socialGitHub": "...",
     "updatedAt": "..."
   }

2. PUT /
   - Update config
   - All fields optional, only update provided fields
   - Use upsert in case config doesn't exist (create with id: 1)

   Request body (all optional):
   {
     "showPromoBanner": false,
     "promoBannerImage": "https://...",
     "promoBannerLink": "https://...",
     "promoBannerAlt": "Work with me",
     "postsPerPage": 15,
     "featuredPostsCount": 3,
     "siteTitle": "Tim Callagy",
     "siteDescription": "AI insights and tutorials",
     "socialLinkedIn": "https://linkedin.com/in/timcallagy",
     "socialGitHub": "https://github.com/timcallagy"
   }

   Validation:
   - postsPerPage: if provided, 1-50
   - featuredPostsCount: if provided, 1-10
   - URLs: if provided, valid URL format

   Response: Updated config object

Wire up in packages/api/src/routes/blog/admin/index.ts:
   - Import configRouter from './config'
   - Use router.use('/config', configRouter)

Test:
- GET /api/blog/admin/config
- PUT /api/blog/admin/config with { "showPromoBanner": false }
```

---

# Phase 4: PA Web Portal - Blog Admin UI

## Prompt 4.1: Add Blog Navigation and List Page

**Goal**: Add Blog to PA portal navigation and create posts list page.

**Prerequisites**: Phase 3 completed

**Verification**: Can navigate to /blog and see empty posts list

```text
Add blog management to the PA web portal. Start with navigation and the posts list page.

1. Update packages/web/src/components/layout/Sidebar.tsx:
   - Add new nav item: { href: '/blog', label: 'Blog', icon: '📰' }
   - Place it after Actions in the navItems array

2. Create the blog posts list page at packages/web/src/app/blog/page.tsx:

   Features:
   - Page title: "Blog Posts"
   - "New Post" button linking to /blog/new
   - Filter tabs or dropdown: All | Drafts | Published | Scheduled
   - Table/list of posts showing:
     - Title (link to edit)
     - Status (badge: Draft=gray, Published=green, Scheduled=blue)
     - Category
     - Updated date
     - Actions (Edit, Delete)
   - Pagination
   - Empty state: "No blog posts yet. Create your first post!"

   Data fetching:
   - Use fetch or existing API client pattern from the project
   - Call GET /api/blog/admin/posts
   - Handle loading and error states

   Use existing UI components from the project (Button, etc.) for consistency.

3. Create packages/web/src/app/blog/layout.tsx if needed (or use root layout).

4. Add TypeScript types - import from @pa/shared if available, or define locally.

Test:
- Navigate to /blog in the PA portal
- Should see empty list with "New Post" button
- Filter buttons should work (but return empty for all filters)
```

---

## Prompt 4.2: Create Blog Post Editor Page

**Goal**: Create the blog post editor with Markdown preview.

**Prerequisites**: Prompt 4.1 completed

**Verification**: Can create a new draft post through the UI

```text
Create the blog post editor page with Markdown editing and preview.

1. Create packages/web/src/app/blog/new/page.tsx:

   Layout:
   - Back link to /blog
   - Page title: "New Post"
   - Form with fields (see below)
   - Preview pane (side-by-side or tabbed)
   - Save Draft / Publish buttons

   Form fields:
   - Title (text input, required)
   - Slug (text input, auto-generated from title, editable)
     - Show live preview: "URL: timcallagy.com/post/{slug}"
   - Category (select dropdown with 7 options from API)
   - Tags (text input, comma-separated, show as chips)
   - Featured Image URL (text input, with preview if URL provided)
   - Meta Description (textarea, character count showing "X/160")
   - Content (large textarea, monospace font)

   Markdown Preview:
   - Install react-markdown: pnpm --filter @pa/web add react-markdown remark-gfm
   - Show rendered markdown next to or below the editor
   - Include code syntax highlighting if possible (rehype-highlight)

   Status controls:
   - Radio or select: Draft / Published / Scheduled
   - If Scheduled, show datetime picker for publishAt

   Buttons:
   - "Save Draft" - saves with status DRAFT
   - "Publish" - saves with status PUBLISHED
   - "Cancel" - go back to /blog

   Form submission:
   - POST to /api/blog/admin/posts
   - On success, redirect to /blog with success message
   - On error, show validation errors inline

2. Auto-generate slug:
   - As user types title, generate slug in real-time
   - Use the generateSlug function from @pa/shared
   - Allow manual override (once edited manually, stop auto-updating)

3. Fetch categories on mount:
   - GET /api/blog/categories
   - Populate the category dropdown

Test:
- Go to /blog/new
- Fill in title, see slug auto-generate
- Select category
- Write some markdown content
- See preview update in real-time
- Click Save Draft
- Verify post appears in /blog list
```

---

## Prompt 4.3: Create Edit Post Page

**Goal**: Create the edit post page, reusing editor components.

**Prerequisites**: Prompt 4.2 completed

**Verification**: Can edit an existing post

```text
Create the edit post page. This should reuse the editor from the new post page.

1. Refactor the editor into a reusable component:

   Create packages/web/src/components/blog/PostEditor.tsx:
   - Accept props: initialData (optional), onSave, onCancel, isLoading
   - Move all form fields and logic from new/page.tsx
   - The component handles form state, validation, preview
   - onSave callback receives the form data

2. Update packages/web/src/app/blog/new/page.tsx:
   - Use <PostEditor onSave={handleCreate} onCancel={goBack} />
   - handleCreate calls POST /api/blog/admin/posts

3. Create packages/web/src/app/blog/edit/[id]/page.tsx:

   - Extract post ID from params
   - Fetch post data: GET /api/blog/admin/posts/:id
   - Show loading state while fetching
   - Show 404 if post not found
   - Pass fetched data as initialData to PostEditor
   - handleUpdate calls PUT /api/blog/admin/posts/:id
   - On success, redirect to /blog with success message

   Additional features for edit:
   - Show "Last updated: {date}"
   - Show view count
   - "View Post" link (opens public URL in new tab, only if published)
   - Delete button with confirmation modal

4. Update the posts list page to link to edit:
   - Title click goes to /blog/edit/{id}
   - Add Edit button/link in actions column

Test:
- Create a post via /blog/new
- Click the post title in the list
- Should load the edit page with all fields populated
- Edit the title, save
- Verify changes persisted
```

---

## Prompt 4.4: Add Delete Confirmation and Status Actions

**Goal**: Add delete confirmation modal and quick status actions.

**Prerequisites**: Prompt 4.3 completed

**Verification**: Can delete post with confirmation, can publish/unpublish

```text
Add delete confirmation and quick publish/unpublish actions.

1. Create a reusable confirmation modal component:

   packages/web/src/components/ui/ConfirmModal.tsx:
   - Props: isOpen, onClose, onConfirm, title, message, confirmText, cancelText, variant (danger/normal)
   - Simple modal with backdrop
   - Two buttons: Cancel and Confirm
   - Confirm button is red/danger for delete actions

2. Add delete functionality to the edit page:
   - Delete button at bottom or in header
   - Opens ConfirmModal: "Delete Post? This action cannot be undone."
   - On confirm, call DELETE /api/blog/admin/posts/:id
   - On success, redirect to /blog with message

3. Add quick actions to the posts list:
   - For DRAFT posts: "Publish" button
   - For PUBLISHED posts: "Unpublish" button
   - For SCHEDULED posts: "Publish Now" button

   Implementation:
   - Publish: POST /api/blog/admin/posts/:id/publish
   - Unpublish: POST /api/blog/admin/posts/:id/unpublish
   - Refresh list after action

4. Add delete action to list:
   - Delete icon/button in actions column
   - Opens same ConfirmModal
   - Refresh list after deletion

5. Add toast/notification for success messages:
   - Use existing toast system if available in the project
   - Or create simple notification component
   - Show "Post published", "Post deleted", etc.

Test:
- Create a draft post
- Click Publish in the list - status should change to Published
- Click Unpublish - status should change back to Draft
- Click Delete - confirmation should appear
- Confirm delete - post should be removed from list
```

---

## Prompt 4.5: Create Newsletter Subscribers Page

**Goal**: Create the newsletter subscribers management page.

**Prerequisites**: Prompt 4.4 completed

**Verification**: Can view and manage subscribers

```text
Create the newsletter subscribers management page.

1. Create packages/web/src/app/blog/subscribers/page.tsx:

   Features:
   - Page title: "Newsletter Subscribers"
   - Stats cards at top: Total, Active, Unsubscribed
   - Toggle: "Show active only" (default on)
   - Table of subscribers:
     - Email
     - Subscribed Date
     - Source
     - Status (Active/Unsubscribed)
     - Actions (Unsubscribe, Delete)
   - Export CSV button
   - Pagination

   Data fetching:
   - GET /api/blog/admin/subscribers
   - Use the stats from response for cards

2. Actions:
   - Unsubscribe button (for active): Calls DELETE /api/blog/admin/subscribers/:id
   - Delete button (with confirmation): Calls DELETE /api/blog/admin/subscribers/:id/permanent
   - Delete is for GDPR "right to be forgotten" requests

3. Export CSV:
   - Button in header: "Export CSV"
   - Opens new tab/downloads: GET /api/blog/admin/subscribers/export
   - Or fetch and create blob download client-side

4. Add navigation link:
   - In /blog page, add link or tab: "Subscribers (X)"
   - Or add as sub-item in sidebar

5. Empty state:
   - "No subscribers yet. Share your blog to grow your audience!"

Test:
- Subscribe via API: POST /api/blog/newsletter/subscribe with test email
- Navigate to /blog/subscribers
- Should see the subscriber in the list
- Click Unsubscribe - status should change
- Toggle "Show active only" - unsubscribed should hide
- Click Export CSV - should download file
```

---

## Prompt 4.6: Create Blog Settings Page

**Goal**: Create the blog settings/configuration page.

**Prerequisites**: Prompt 4.5 completed

**Verification**: Can update blog settings

```text
Create the blog settings page for managing blog configuration.

1. Create packages/web/src/app/blog/settings/page.tsx:

   Sections:

   A. Site Information
   - Site Title (text input)
   - Site Description (textarea)

   B. Social Links
   - LinkedIn URL (text input, with validation)
   - GitHub URL (text input, with validation)

   C. Display Settings
   - Posts per page (number input, 1-50)
   - Featured posts count (number input, 1-10)

   D. Promo Banner
   - Toggle: Show promo banner (checkbox/switch)
   - Banner Image URL (text input, with preview)
   - Banner Link URL (text input)
   - Banner Alt Text (text input)

   Form behavior:
   - Load current config on mount: GET /api/blog/admin/config
   - Show loading state
   - Save button at bottom
   - On save: PUT /api/blog/admin/config with changed fields
   - Show success message
   - Show validation errors inline

2. Add preview for promo banner:
   - If image URL is provided and valid, show thumbnail preview
   - Show how it will appear in sidebar (approximate)

3. Add navigation:
   - Link from /blog page: "Settings" button/link
   - Or add to sidebar as sub-item under Blog

4. Validation:
   - URLs must be valid format (or empty)
   - Numbers must be in range
   - Show errors inline

Test:
- Navigate to /blog/settings
- Should load current config (mostly defaults)
- Change Site Title, save
- Refresh page - should persist
- Toggle promo banner off, save
- Verify via GET /api/blog/config that showPromoBanner is false
```

---

# Phase 5: MCP Server - Blog Tools

## Prompt 5.1: Add Blog Tools to MCP Server

**Goal**: Add MCP tools for managing blog posts via Claude Code.

**Prerequisites**: Phase 4 completed

**Verification**: Can list and create blog posts via MCP tools

```text
Add blog management tools to the MCP server so you can manage blog posts via Claude Code.

Update packages/mcp-server/src/tools/index.ts to add:

1. get_blog_posts tool:
   description: 'List blog posts. Use when user wants to see their blog content or check post status.'
   schema: z.object({
     status: z.enum(['all', 'DRAFT', 'PUBLISHED', 'SCHEDULED']).optional().describe('Filter by status'),
     category: z.string().optional().describe('Filter by category slug'),
     limit: z.coerce.number().optional().default(10).describe('Maximum posts to return'),
   })
   handler:
   - Call API: GET /api/blog/admin/posts with query params
   - Format response as readable text:
     "Found X blog posts:\n\n[1] (DRAFT) Title Here\n    Category: ai-for-coding | Updated: Jan 15\n\n[2] (PUBLISHED) Another Post..."

2. get_blog_post tool:
   description: 'Get a single blog post by ID. Use to view full post content.'
   schema: z.object({
     id: z.coerce.number().describe('Post ID'),
   })
   handler:
   - Call API: GET /api/blog/admin/posts/:id
   - Format response showing all fields including content

3. save_blog_post tool:
   description: 'Create or update a blog post. Use when user wants to write or edit blog content.'
   schema: z.object({
     id: z.coerce.number().optional().describe('Post ID (omit to create new)'),
     title: z.string().describe('Post title'),
     content: z.string().describe('Post content in Markdown'),
     category: z.string().describe('Category slug (e.g., ai-for-coding)'),
     tags: z.array(z.string()).optional().describe('Tags for the post'),
     status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT').describe('Post status'),
     excerpt: z.string().optional().describe('Short excerpt'),
     metaDescription: z.string().optional().describe('SEO meta description'),
     featuredImage: z.string().optional().describe('Featured image URL'),
   })
   handler:
   - If id provided: PUT /api/blog/admin/posts/:id
   - If no id: POST /api/blog/admin/posts
   - Return success message with post ID and slug

4. delete_blog_post tool:
   description: 'Delete a blog post. Use when user wants to remove a post.'
   schema: z.object({
     id: z.coerce.number().describe('Post ID to delete'),
   })
   handler:
   - Call API: DELETE /api/blog/admin/posts/:id
   - Return confirmation message

5. Update the API client (packages/mcp-server/src/api-client.ts):
   - Add methods for blog endpoints
   - Use the existing auth pattern (API key)

Rebuild MCP server: pnpm --filter @pa/mcp-server build

Test by asking Claude Code:
- "Show me my blog posts"
- "Create a draft blog post about prompt engineering"
```

---

## Prompt 5.2: Add Newsletter Tools to MCP Server

**Goal**: Add MCP tool for viewing newsletter subscribers.

**Prerequisites**: Prompt 5.1 completed

**Verification**: Can list subscribers via MCP

```text
Add a tool to view newsletter subscribers via Claude Code.

Add to packages/mcp-server/src/tools/index.ts:

get_blog_subscribers tool:
  description: 'List newsletter subscribers. Use when user wants to see who has subscribed to their blog newsletter.'
  schema: z.object({
    limit: z.coerce.number().optional().default(50).describe('Maximum subscribers to return'),
    active: z.boolean().optional().default(true).describe('Only show active subscribers'),
  })
  handler:
  - Call API: GET /api/blog/admin/subscribers
  - Format response:
    "Newsletter Subscribers (X active, Y total):\n\n1. user@example.com - Subscribed Jan 15 via blog-sidebar\n2. ..."
  - Include stats summary at top

Update API client with subscriber methods.

Rebuild: pnpm --filter @pa/mcp-server build

Test: "How many newsletter subscribers do I have?"
```

---

# Phase 6: Blog Frontend (Public Site)

## Prompt 6.1: Initialize Blog Package

**Goal**: Create the blog frontend package with Next.js.

**Prerequisites**: Phase 5 completed

**Verification**: Blog dev server starts on port 3002

```text
Create the public blog frontend as a new package in the monorepo.

1. Create the package directory structure:
   packages/blog/

2. Initialize Next.js project:
   cd packages/blog
   pnpm create next-app . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

   Or manually create with these files:

3. Create packages/blog/package.json:
   {
     "name": "@pa/blog",
     "version": "0.0.1",
     "private": true,
     "scripts": {
       "dev": "next dev -p 3002",
       "build": "next build",
       "start": "next start -p 3002",
       "lint": "next lint"
     },
     "dependencies": {
       "next": "14.x",
       "react": "18.x",
       "react-dom": "18.x",
       "react-markdown": "^9.0.0",
       "remark-gfm": "^4.0.0",
       "rehype-highlight": "^7.0.0"
     },
     "devDependencies": {
       "@types/node": "^20",
       "@types/react": "^18",
       "@types/react-dom": "^18",
       "typescript": "^5",
       "tailwindcss": "^3",
       "postcss": "^8",
       "autoprefixer": "^8"
     }
   }

4. Create essential config files:
   - tsconfig.json (standard Next.js config)
   - next.config.js
   - tailwind.config.ts
   - postcss.config.js

5. Create packages/blog/src/app/layout.tsx:
   - Basic HTML structure
   - Import global styles

6. Create packages/blog/src/app/page.tsx:
   - Simple "Blog Coming Soon" placeholder

7. Create packages/blog/src/app/globals.css:
   - Tailwind imports
   - We'll add template CSS later

8. Add to root pnpm-workspace.yaml if not auto-detected.

9. Install dependencies:
   pnpm install

10. Test:
    pnpm --filter @pa/blog dev

    Visit http://localhost:3002 - should see placeholder page
```

---

## Prompt 6.2: Set Up API Client and Types

**Goal**: Set up API client for fetching blog data.

**Prerequisites**: Prompt 6.1 completed

**Verification**: Can fetch categories from API

```text
Set up the API client and types for the blog frontend.

1. Create packages/blog/src/lib/api.ts:

   const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

   Export functions:

   - fetchCategories(): Promise<Category[]>
     GET ${API_URL}/blog/categories

   - fetchPosts(options): Promise<PostsResponse>
     GET ${API_URL}/blog/posts with query params

   - fetchPost(slug: string): Promise<Post>
     GET ${API_URL}/blog/posts/${slug}

   - fetchPopularPosts(limit: number): Promise<Post[]>
     GET ${API_URL}/blog/popular

   - fetchTags(): Promise<Tag[]>
     GET ${API_URL}/blog/tags

   - fetchConfig(): Promise<BlogConfig>
     GET ${API_URL}/blog/config

   - subscribeNewsletter(email: string, consent: boolean, source: string): Promise<void>
     POST ${API_URL}/blog/newsletter/subscribe

   - incrementViewCount(slug: string): Promise<void>
     POST ${API_URL}/blog/posts/${slug}/view

   Each function should:
   - Handle errors gracefully
   - Return typed responses
   - Include proper headers

2. Create packages/blog/src/lib/types.ts:
   - Import from @pa/shared if possible
   - Or define types locally:
     - Post, PostSummary
     - Category
     - Tag
     - BlogConfig
     - Pagination
     - PostsResponse

3. Create packages/blog/.env.local:
   NEXT_PUBLIC_API_URL=http://localhost:3001/api

4. Create packages/blog/.env.example:
   NEXT_PUBLIC_API_URL=https://pa-api-6uyh.onrender.com/api

5. Test the API client:
   - Create a simple test in page.tsx that fetches and displays categories
   - Verify data comes through correctly

Note: You may need to configure CORS on the API to allow requests from localhost:3002.
```

---

## Prompt 6.3: Migrate Template CSS and Assets

**Goal**: Migrate the Editor template CSS and assets to the blog package.

**Prerequisites**: Prompt 6.2 completed

**Verification**: Template styles load correctly

```text
Migrate the Editor HTML template CSS and assets to the Next.js blog.

1. Copy CSS files from template to packages/blog/public/css/:
   From: blog-template/editor-html5-template-v1.0.1/HTML/editor-html/css/
   Copy:
   - main.css
   - 768.css
   - 992.css
   - align.css
   - bootstrap.min.css (or use CDN/npm package)
   - fonts/ directory (fontello icons)

2. Copy JS files needed (selectively):
   From: blog-template/editor-html5-template-v1.0.1/HTML/editor-html/js/
   We'll use React equivalents for most, but may need:
   - Some CSS from owl-carousel for styling
   - Selection sharer CSS if using that feature

   For carousels, we'll use a React library instead of jQuery.

3. Copy images:
   From: blog-template/editor-html5-template-v1.0.1/HTML/editor-html/images/
   To: packages/blog/public/images/
   - ico/ (favicon)
   - site/ (logo, default images)

4. Update packages/blog/src/app/layout.tsx:
   - Add link tags for CSS files
   - Or import CSS in globals.css
   - Add Google Fonts (Open Sans, Droid Serif) via next/font or link tags
   - Add favicon

5. Create packages/blog/src/app/globals.css:
   @import url('/css/bootstrap.min.css');
   @import url('/css/fonts/fontello/css/fontello.css');
   @import url('/css/align.css');
   @import url('/css/main.css');
   @import url('/css/768.css');
   @import url('/css/992.css');

   /* Add any Tailwind utilities we need */
   @tailwind utilities;

   Note: May need to adjust import order or handle conflicts with Tailwind.

6. Test:
   - Restart dev server
   - Check that template fonts and basic styles load
   - Check browser console for 404s on missing assets

The template uses jQuery heavily, but we'll rebuild components in React.
```

---

## Prompt 6.4: Create Layout Components (Header, Footer)

**Goal**: Create the header and footer components based on template.

**Prerequisites**: Prompt 6.3 completed

**Verification**: Header and footer render with template styling

```text
Create the layout components (Header and Footer) based on the Editor template.

1. Create packages/blog/src/components/layout/Header.tsx:

   Based on the template header structure:
   - Logo (link to home)
   - Navigation menu:
     - Home
     - Categories (dropdown with 7 categories)
     - About
     - Contact
   - Search toggle (we can implement search later, just show icon)
   - Social icons (LinkedIn, GitHub - from config)
   - Mobile menu toggle (hamburger)

   Make it a client component ('use client') for mobile menu state.

   Props:
   - config: BlogConfig (for social links)
   - categories: Category[]

2. Create packages/blog/src/components/layout/Footer.tsx:

   Based on template footer:
   - Social icons section
   - Footer widgets row:
     - About Me widget (from config)
     - Tags cloud (pass tags as prop)
     - Categories list (pass categories as prop)
     - Recent Posts (pass posts as prop)
   - Copyright line: "© 2024 Tim Callagy"

   Props:
   - config: BlogConfig
   - categories: Category[]
   - tags: Tag[]
   - recentPosts: PostSummary[]

3. Create packages/blog/src/components/layout/Layout.tsx:

   Wrapper component that:
   - Fetches config, categories, tags, recent posts
   - Renders Header
   - Renders children (page content)
   - Renders Footer

   Use React Server Components for data fetching where possible.

4. Update packages/blog/src/app/layout.tsx:
   - Wrap children with Layout component
   - Or fetch data here and pass to Header/Footer

5. Test:
   - Homepage should show header and footer with template styling
   - Navigation links should work
   - Mobile menu should toggle
```

---

## Prompt 6.5: Create Sidebar Component

**Goal**: Create the sidebar with all widgets.

**Prerequisites**: Prompt 6.4 completed

**Verification**: Sidebar renders with all widgets

```text
Create the sidebar component with all the widgets.

1. Create packages/blog/src/components/layout/Sidebar.tsx:

   Container component that renders all widgets in order.

   Props:
   - config: BlogConfig
   - categories: Category[]
   - popularPosts: PostSummary[]
   - className?: string

2. Create individual widget components in packages/blog/src/components/sidebar/:

   a. AboutWidget.tsx
      - Author photo (hardcoded or from config)
      - Short bio text
      - Style matches template widget_text class

   b. SocialWidget.tsx
      - "Follow Me" heading
      - LinkedIn icon (from config.socialLinkedIn)
      - GitHub icon (from config.socialGitHub)
      - Style matches template

   c. CategoriesWidget.tsx
      Props: categories: Category[]
      - "Categories" heading
      - List of category links with post counts
      - Links to /category/[slug]

   d. PopularWidget.tsx
      Props: posts: PostSummary[]
      - "Trending Posts" heading
      - List of posts with thumbnails
      - Links to /post/[slug]
      - Style matches template tptn_posts class

   e. NewsletterWidget.tsx (client component)
      - "Subscribe" heading
      - Email input
      - Consent checkbox with privacy policy link
      - Submit button
      - Success/error messages
      - Calls subscribeNewsletter API

   f. PromoWidget.tsx
      Props: config: BlogConfig
      - Only render if config.showPromoBanner is true
      - Shows banner image linked to promoBannerLink
      - Alt text from config

3. Compose Sidebar.tsx:
   <aside className="widget-area sidebar">
     <AboutWidget />
     <SocialWidget config={config} />
     <CategoriesWidget categories={categories} />
     <PopularWidget posts={popularPosts} />
     <NewsletterWidget />
     {config.showPromoBanner && <PromoWidget config={config} />}
   </aside>

4. Test:
   - Add Sidebar to homepage temporarily
   - Verify all widgets render
   - Test newsletter signup form
```

---

## Prompt 6.6: Create Homepage with Masonry Grid

**Goal**: Create the homepage with featured slider and masonry post grid.

**Prerequisites**: Prompt 6.5 completed

**Verification**: Homepage displays posts in masonry layout

```text
Create the homepage with featured posts slider and masonry grid layout.

1. Install a React carousel library:
   pnpm --filter @pa/blog add embla-carousel-react
   (or swiper, or react-slick - embla is lightweight)

2. Create packages/blog/src/components/blog/FeaturedSlider.tsx:

   Props: posts: PostSummary[]

   - Carousel of featured posts (config.featuredPostsCount, default 5)
   - Each slide shows:
     - Background image (featuredImage)
     - Category badge
     - Title (link to post)
   - Navigation arrows (prev/next)
   - Style matches template post-slider class

3. Create packages/blog/src/components/blog/PostCard.tsx:

   Props: post: PostSummary

   - Featured image (link to post)
   - Title (link to post)
   - Meta: date, reading time, category
   - Excerpt
   - "Continue reading →" link
   - Style matches template hentry post class

4. Create packages/blog/src/components/blog/PostGrid.tsx:

   Props: posts: PostSummary[]

   - Masonry layout using CSS grid or a library
   - For true masonry, consider: react-masonry-css or CSS columns
   - Simpler option: CSS grid with auto-rows
   - Renders PostCard for each post

5. Create packages/blog/src/components/blog/Pagination.tsx:

   Props: pagination: Pagination, basePath: string

   - Previous/Next links
   - Page numbers
   - Style matches template navigation pagination class

6. Update packages/blog/src/app/page.tsx:

   Server component that:
   - Fetches featured posts: fetchPosts({ featured: true, limit: 5 })
   - Fetches recent posts: fetchPosts({ page: 1, limit: 12 })
   - Fetches data for sidebar

   Layout:
   <div className="site-main">
     <FeaturedSlider posts={featuredPosts} />
     <div className="layout-medium">
       <div className="content-area with-sidebar">
         <main>
           <PostGrid posts={posts} />
           <Pagination pagination={pagination} basePath="/" />
         </main>
       </div>
       <Sidebar ... />
     </div>
   </div>

7. Add route for pagination: /page/[page]/page.tsx
   - Same as homepage but with page number from params

Test:
- Create a few published posts via admin
- Visit homepage - should see posts in grid
- Test pagination if enough posts
```

---

## Prompt 6.7: Create Single Post Page

**Goal**: Create the single post page with full content.

**Prerequisites**: Prompt 6.6 completed

**Verification**: Can view a single post with all elements

```text
Create the single post page that displays the full article.

1. Create packages/blog/src/app/post/[slug]/page.tsx:

   Server component that:
   - Gets slug from params
   - Fetches post: fetchPost(slug)
   - If not found, return notFound()
   - Fetches sidebar data

2. Create packages/blog/src/components/blog/PostContent.tsx:

   Props: post: Post

   Sections (matching template blog-single.html):

   a. Header:
      - Title (h1)
      - Meta: date, reading time, category link

   b. Featured Image:
      - Full width image

   c. Content:
      - Render Markdown using react-markdown
      - Configure remark-gfm for tables, strikethrough, etc.
      - Configure rehype-highlight for code syntax highlighting
      - Style code blocks, blockquotes, images within content

   d. Tags:
      - Tag links at bottom of content

   e. Share Links:
      - LinkedIn share button
      - Email share button
      - Use template share-links class

   f. "Discuss on LinkedIn" CTA:
      - Link that opens LinkedIn with pre-filled share
      - Text: "Discuss this article on LinkedIn"

3. Create packages/blog/src/components/blog/AuthorBio.tsx:

   - "Written By" heading
   - Author photo
   - Author name
   - Bio text
   - Social links

4. Create packages/blog/src/components/blog/RelatedPosts.tsx:

   Props: posts: PostSummary[]

   - "You May Also Like" heading
   - 3 post cards with thumbnails and titles
   - Style matches template yarpp-related class

5. Create packages/blog/src/components/blog/PostNavigation.tsx:

   Props: previousPost, nextPost

   - Previous post link (left)
   - Next post link (right)
   - Style matches template nav-single class

6. Create packages/blog/src/components/blog/ViewCounter.tsx (client component):

   Props: slug: string

   - On mount, call incrementViewCount(slug) after 10 second delay
   - Prevents counting accidental clicks
   - Fire and forget, no UI

7. Compose the post page:
   <article>
     <PostContent post={post} />
     <AuthorBio />
     <RelatedPosts posts={post.relatedPosts} />
     <PostNavigation previous={post.previousPost} next={post.nextPost} />
   </article>
   <ViewCounter slug={post.slug} />

8. Add metadata for SEO:
   export async function generateMetadata({ params }) {
     const post = await fetchPost(params.slug);
     return {
       title: `${post.title} | Tim Callagy`,
       description: post.metaDescription || post.excerpt,
       openGraph: {
         title: post.title,
         description: post.metaDescription,
         images: [post.featuredImage],
       },
     };
   }

Test:
- Navigate to a published post
- Verify all sections render
- Test share links
- Check SEO meta tags in page source
```

---

## Prompt 6.8: Create Category and Tag Archive Pages

**Goal**: Create category and tag archive pages.

**Prerequisites**: Prompt 6.7 completed

**Verification**: Can filter posts by category and tag

```text
Create the category and tag archive pages.

1. Create packages/blog/src/app/category/[slug]/page.tsx:

   Server component:
   - Get category slug from params
   - Fetch category info from categories list
   - Fetch posts: fetchPosts({ category: slug, page: 1 })
   - If no posts found, show empty state (not 404 - category exists)

   Layout:
   - Header with category name: "AI for Coding"
   - Optional category description
   - Same PostGrid and Pagination as homepage
   - Same Sidebar

   Metadata:
   - Title: "{Category Name} | Tim Callagy"
   - Description: Category description or default

2. Create packages/blog/src/app/category/[slug]/page/[page]/page.tsx:
   - Same as above but with pagination
   - Or use optional catch-all: [...slug]

3. Create packages/blog/src/app/tag/[tag]/page.tsx:

   Server component:
   - Get tag from params (URL decode it)
   - Fetch posts: fetchPosts({ tag: tag, page: 1 })

   Layout:
   - Header: "Posts tagged: {tag}"
   - PostGrid and Pagination
   - Sidebar

4. Update PostCard and other components to link correctly:
   - Category links go to /category/[slug]
   - Tag links go to /tag/[tag]

5. Update header navigation:
   - Categories dropdown should link to /category/[slug]

Test:
- Click a category in navigation or on a post
- Should show filtered posts
- Click a tag on a post
- Should show posts with that tag
- Test pagination on category page
```

---

## Prompt 6.9: Create About and Contact Pages

**Goal**: Create the static About and Contact pages.

**Prerequisites**: Prompt 6.8 completed

**Verification**: About and Contact pages render

```text
Create the About and Contact pages.

1. Create packages/blog/src/app/about/page.tsx:

   Based on template about.html:

   - Profile photo (large)
   - "Who Is Tim?" section with bio
   - "What I Do" section with expertise areas:
     - AI Strategy
     - Technical Writing
     - etc. (customize for Tim)
   - "Fun Facts" section (optional)
   - Social links

   This can be mostly static content with config for social links.

   Metadata:
   - Title: "About | Tim Callagy"
   - Description: Professional bio summary

2. Create packages/blog/src/app/contact/page.tsx:

   Based on template contact.html:

   - "Get In Touch" heading
   - Social links (large icons):
     - LinkedIn
     - GitHub
   - Optional: Contact form (or just say "Connect with me on LinkedIn")

   Keep it simple - social links are often better than contact forms.

   Metadata:
   - Title: "Contact | Tim Callagy"

3. Update content for Tim:
   - Replace placeholder bio with real content
   - Add actual social URLs to config (or hardcode for now)
   - Add a professional photo

4. No sidebar on these pages (full width), matching template.

Test:
- Navigate to /about
- Navigate to /contact
- Verify links work
- Check mobile responsiveness
```

---

## Prompt 6.10: Create Privacy Policy Page

**Goal**: Create the privacy policy page for GDPR compliance.

**Prerequisites**: Prompt 6.9 completed

**Verification**: Privacy policy page renders with all required sections

```text
Create the privacy policy page for GDPR compliance.

1. Create packages/blog/src/app/privacy/page.tsx:

   Static page with privacy policy content.

   Use the template from blog_spec.md section 15, customized:

   Sections:
   - Introduction
   - Information We Collect
     - Newsletter subscription (email, timestamp, IP)
     - Usage data (if any analytics)
   - How We Use Your Information
   - Data Storage (Render.com, encrypted)
   - Your Rights (GDPR)
     - Access, correct, delete, export, withdraw consent
   - Unsubscribing
   - Cookies (minimal, essential only)
   - Third-Party Services
   - Changes to Policy
   - Contact information

   Style as a simple article page (no sidebar).

2. Add last updated date at top.

3. Link to privacy policy from:
   - NewsletterWidget consent checkbox
   - Footer (add small link)

4. Metadata:
   - Title: "Privacy Policy | Tim Callagy"
   - No index? (optional: add noindex meta tag)

Test:
- Navigate to /privacy
- Verify all sections present
- Click privacy link in newsletter widget
- Check link in footer
```

---

## Prompt 6.11: Add Search Functionality

**Goal**: Add basic search functionality to the blog.

**Prerequisites**: Prompt 6.10 completed

**Verification**: Can search for posts by keyword

```text
Add search functionality to the blog.

1. Add search API endpoint (packages/api):

   Update packages/api/src/routes/blog/posts.ts:

   Add 'search' query parameter to GET /
   - If search provided, filter posts where title OR content contains search term
   - Use Prisma: { OR: [{ title: { contains: search, mode: 'insensitive' } }, { content: { contains: search, mode: 'insensitive' } }] }
   - Only search published posts

2. Update API client (packages/blog/src/lib/api.ts):
   - Add search parameter to fetchPosts options

3. Create packages/blog/src/app/search/page.tsx:

   - Get query from URL: /search?q=keyword
   - Fetch posts with search parameter
   - Show results count: "X results for 'keyword'"
   - Show PostGrid with results
   - Empty state: "No posts found for 'keyword'"
   - Include Sidebar

4. Create packages/blog/src/components/layout/SearchModal.tsx (client component):

   - Modal overlay triggered by search icon in header
   - Input field with autofocus
   - On submit, redirect to /search?q={query}
   - Close on escape or click outside

5. Update Header.tsx:
   - Search icon toggles SearchModal
   - Or implement inline search in header

6. Alternative: Inline search in header
   - Input field that appears when search icon clicked
   - Submits to /search?q=

Test:
- Click search icon
- Enter a search term
- Should redirect to /search?q=term
- Should show matching posts
```

---

## Prompt 6.12: Final Polish and SEO

**Goal**: Add final SEO elements, sitemap, and polish.

**Prerequisites**: Prompt 6.11 completed

**Verification**: All SEO elements in place, sitemap generated

```text
Add final SEO elements and polish the blog.

1. Create packages/blog/src/app/sitemap.ts:

   Dynamic sitemap generation:

   export default async function sitemap() {
     const posts = await fetchAllPublishedPosts(); // Add this API method

     const postUrls = posts.map(post => ({
       url: `https://timcallagy.com/post/${post.slug}`,
       lastModified: post.updatedAt,
       changeFrequency: 'weekly',
       priority: 0.8,
     }));

     const categoryUrls = categories.map(cat => ({
       url: `https://timcallagy.com/category/${cat.slug}`,
       changeFrequency: 'weekly',
       priority: 0.6,
     }));

     return [
       { url: 'https://timcallagy.com', changeFrequency: 'daily', priority: 1 },
       { url: 'https://timcallagy.com/about', changeFrequency: 'monthly', priority: 0.5 },
       { url: 'https://timcallagy.com/contact', changeFrequency: 'monthly', priority: 0.5 },
       ...categoryUrls,
       ...postUrls,
     ];
   }

2. Create packages/blog/src/app/robots.ts:

   export default function robots() {
     return {
       rules: { userAgent: '*', allow: '/' },
       sitemap: 'https://timcallagy.com/sitemap.xml',
     };
   }

3. Add JSON-LD structured data to post pages:

   In PostContent or the post page:

   <script type="application/ld+json">
   {JSON.stringify({
     "@context": "https://schema.org",
     "@type": "BlogPosting",
     "headline": post.title,
     "image": post.featuredImage,
     "datePublished": post.publishedAt,
     "dateModified": post.updatedAt,
     "author": {
       "@type": "Person",
       "name": "Tim Callagy"
     },
     "description": post.metaDescription
   })}
   </script>

4. Add RSS feed at packages/blog/src/app/feed.xml/route.ts:

   Generate RSS feed of recent posts.

5. Update all metadata:
   - Ensure every page has proper title, description
   - Ensure Open Graph images are set
   - Add twitter:card meta tags

6. Add 404 page:
   packages/blog/src/app/not-found.tsx
   - Friendly message
   - Link back to homepage
   - Search suggestion

7. Performance check:
   - Ensure images use Next.js Image component
   - Check Lighthouse score
   - Fix any issues

Test:
- Visit /sitemap.xml - should list all pages
- Visit /robots.txt - should reference sitemap
- Check page source for JSON-LD on post pages
- Visit /feed.xml - should show RSS feed
- Visit non-existent URL - should show 404 page
- Run Lighthouse audit
```

---

# Phase 7: Deployment

## Prompt 7.1: Deploy Blog to Render

**Goal**: Deploy the blog frontend to Render with custom domain.

**Prerequisites**: Phase 6 completed

**Verification**: Blog accessible at timcallagy.com

```text
Deploy the blog frontend to Render and configure the custom domain.

1. Update packages/blog/next.config.js for production:

   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'standalone', // For Render deployment
     images: {
       domains: ['timcallagy.com', 'pa-api-6uyh.onrender.com'],
       // Add any image CDN domains
     },
   };
   module.exports = nextConfig;

2. Create packages/blog/.env.production:
   NEXT_PUBLIC_API_URL=https://pa-api-6uyh.onrender.com/api
   NEXT_PUBLIC_SITE_URL=https://timcallagy.com

3. Update render.yaml (or create if using Blueprint):

   Add new service:

   - type: web
     name: pa-blog
     env: node
     plan: free
     buildCommand: pnpm install && pnpm --filter @pa/blog build
     startCommand: pnpm --filter @pa/blog start
     envVars:
       - key: NEXT_PUBLIC_API_URL
         value: https://pa-api-6uyh.onrender.com/api
       - key: NEXT_PUBLIC_SITE_URL
         value: https://timcallagy.com

4. Configure CORS on API (packages/api):

   Update CORS config to allow blog domain:

   const corsOptions = {
     origin: [
       'http://localhost:3000',    // PA portal dev
       'http://localhost:3002',    // Blog dev
       'https://pa-web-xxx.onrender.com',  // PA portal prod
       'https://timcallagy.com',   // Blog prod
     ],
     credentials: true,
   };

   Commit and push - API will auto-deploy.

5. Deploy blog to Render:
   - Go to Render dashboard
   - Create new Web Service
   - Connect to GitHub repo
   - Set root directory to packages/blog (or use build command above)
   - Set environment variables
   - Deploy

6. Configure custom domain:
   - In Render, go to blog service settings
   - Add custom domain: timcallagy.com
   - Render will provide DNS instructions

7. Update DNS at your domain registrar:
   - Add CNAME record pointing to Render
   - Or A records if using apex domain
   - Wait for DNS propagation (can take up to 48 hours)

8. SSL certificate:
   - Render automatically provisions SSL via Let's Encrypt
   - Verify https://timcallagy.com works

9. Test production:
   - Visit https://timcallagy.com
   - Test all pages
   - Test newsletter signup
   - Test post view counting
   - Check API calls work (no CORS errors)

10. Update blog config:
    - Via PA portal, update social links
    - Update site description
    - Configure promo banner if desired
```

---

## Prompt 7.2: Final Integration Testing

**Goal**: Perform end-to-end testing of the complete system.

**Prerequisites**: Prompt 7.1 completed

**Verification**: All features work in production

```text
Perform comprehensive testing of the deployed blog system.

1. Content Creation Flow:
   - [ ] Create a draft post in PA portal
   - [ ] Preview markdown rendering
   - [ ] Add featured image
   - [ ] Set category and tags
   - [ ] Publish the post
   - [ ] Verify post appears on blog homepage
   - [ ] Verify post appears in correct category

2. Blog Frontend:
   - [ ] Homepage loads with posts
   - [ ] Featured slider works
   - [ ] Masonry grid displays correctly
   - [ ] Pagination works
   - [ ] Click post - single post page loads
   - [ ] Markdown renders correctly (headers, code, images, links)
   - [ ] Related posts show
   - [ ] Previous/Next navigation works
   - [ ] Share links work (LinkedIn, Email)
   - [ ] Category filter works
   - [ ] Tag filter works
   - [ ] Search works
   - [ ] About page loads
   - [ ] Contact page loads
   - [ ] Privacy policy loads

3. Newsletter:
   - [ ] Subscribe form shows in sidebar
   - [ ] Valid email + consent submits successfully
   - [ ] Success message shows
   - [ ] Duplicate email shows error
   - [ ] Missing consent shows error
   - [ ] Subscriber appears in PA portal list
   - [ ] Can export CSV
   - [ ] Can unsubscribe from admin

4. MCP Tools:
   - [ ] "Show my blog posts" works
   - [ ] "Create a blog post about X" works
   - [ ] "How many subscribers do I have" works

5. SEO:
   - [ ] Check meta tags on homepage
   - [ ] Check meta tags on post page
   - [ ] Sitemap accessible at /sitemap.xml
   - [ ] Robots.txt accessible
   - [ ] Google Search Console (submit sitemap)

6. Mobile Testing:
   - [ ] Homepage responsive
   - [ ] Post page responsive
   - [ ] Navigation menu works on mobile
   - [ ] Sidebar collapses appropriately

7. Performance:
   - [ ] Run Lighthouse on homepage
   - [ ] Run Lighthouse on post page
   - [ ] Address any critical issues

8. Monitoring:
   - [ ] Set up uptime monitoring (UptimeRobot, etc.)
   - [ ] Verify Render logs accessible

Document any issues found and create follow-up tasks.
```

---

# Summary

## Phase Overview

| Phase | Description | Prompts |
|-------|-------------|---------|
| 1 | Database Foundation | 1.1 - 1.3 |
| 2 | Blog API - Public | 2.1 - 2.8 |
| 3 | Blog API - Admin | 3.1 - 3.6 |
| 4 | PA Portal - Blog UI | 4.1 - 4.6 |
| 5 | MCP Server Tools | 5.1 - 5.2 |
| 6 | Blog Frontend | 6.1 - 6.12 |
| 7 | Deployment | 7.1 - 7.2 |

## Total Prompts: 32

## Estimated Implementation Order

For fastest path to working blog:
1. Phase 1 (Database) - Foundation
2. Phase 2 (Public API) - Enables frontend development
3. Phase 6.1-6.7 (Blog Frontend basics) - Parallel with Phase 3
4. Phase 3 (Admin API) - Enables content management
5. Phase 4 (Portal UI) - Content management interface
6. Phase 6.8-6.12 (Blog Frontend complete)
7. Phase 5 (MCP) - Nice to have
8. Phase 7 (Deploy) - Go live

## Dependencies

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
              │
              └──► Phase 6 ──► Phase 7
                      │
Phase 5 ◄─────────────┘
```

Phase 5 (MCP) depends on Phase 3 (Admin API) and Phase 6 (types/testing).
