# Blog Feature Specification: timcallagy.com

## 1. Overview

A professional AI-focused blog for personal branding, using the existing Personal Assistant (PA) backend as a headless CMS. The blog will showcase expertise across AI topics and serve as a platform for thought leadership.

**Domain:** timcallagy.com
**Target Audience:** Professionals interested in AI applications
**Content Focus:** Practical AI insights for learning, coding, marketing, branding, operations, innovation, and data analysis

---

## 2. Architecture

### 2.1 System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        timcallagy.com                           │
│                    (Public Blog Frontend)                       │
│                      Next.js SSG/SSR                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │ REST API
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PA API (Express.js)                        │
│              /api/blog/* (public) + /api/blog/admin/* (auth)    │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Prisma ORM
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL (Render)                           │
│         BlogPost, BlogCategory, NewsletterSubscriber            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     PA Web Portal                               │
│              (Admin Interface - existing)                       │
│         New: Blog management, Newsletter subscribers            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     MCP Server                                  │
│              New: Blog tools for Claude Code                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Monorepo Structure

```
packages/
├── api/                 # Existing - add blog routes
├── web/                 # Existing PA portal - add blog admin UI
├── blog/                # NEW - Public blog frontend
├── mcp-server/          # Existing - add blog tools
└── shared/              # Existing - add blog types
```

### 2.3 Template Source

- **Template:** "Editor" HTML5 by Pixelwars
- **Location:** `/home/muwawa/workspace/persAssistant/blog-template/editor-html5-template-v1.0.1/HTML/editor-html/`
- **Key Files:**
  - `blog-masonry-with-sidebar.html` - Homepage layout
  - `blog-single.html` - Single post layout
  - `about.html` - About page layout
  - `contact.html` - Contact page layout
  - `css/main.css`, `css/768.css`, `css/992.css` - Responsive styles
  - `js/main.js` - Template JavaScript

---

## 3. Database Schema

### 3.1 BlogPost

```prisma
model BlogPost {
  id              Int       @id @default(autoincrement())
  title           String
  slug            String    @unique
  content         String    @db.Text  // Markdown content
  excerpt         String?   @db.VarChar(300)
  featuredImage   String?   // URL to image
  metaDescription String?   @db.VarChar(160)
  category        String    // One of 7 categories
  tags            String[]  // Array of tag strings
  status          PostStatus @default(DRAFT)
  publishAt       DateTime? // Scheduled publish time
  publishedAt     DateTime? // Actual publish time
  viewCount       Int       @default(0)
  authorId        Int
  author          User      @relation(fields: [authorId], references: [id])
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([status, publishedAt])
  @@index([category])
  @@index([slug])
}

enum PostStatus {
  DRAFT
  PUBLISHED
  SCHEDULED
}
```

### 3.2 BlogCategory

```prisma
model BlogCategory {
  id          Int     @id @default(autoincrement())
  name        String  @unique
  slug        String  @unique
  description String?
  sortOrder   Int     @default(0)
}
```

**Seed Data (7 Categories):**

| name | slug | sortOrder |
|------|------|-----------|
| AI for Learning | ai-for-learning | 1 |
| AI for Coding | ai-for-coding | 2 |
| AI for Marketing | ai-for-marketing | 3 |
| AI for Branding | ai-for-branding | 4 |
| AI for Operational Efficiency | ai-for-operational-efficiency | 5 |
| AI for Innovation | ai-for-innovation | 6 |
| AI for Data Insights | ai-for-data-insights | 7 |

### 3.3 NewsletterSubscriber

```prisma
model NewsletterSubscriber {
  id             Int       @id @default(autoincrement())
  email          String    @unique
  subscribedAt   DateTime  @default(now())
  consentText    String    // What they agreed to
  ipAddress      String?   // For consent records
  source         String    @default("blog-sidebar") // Where they signed up
  unsubscribedAt DateTime? // Null if still subscribed
  createdAt      DateTime  @default(now())

  @@index([email])
  @@index([unsubscribedAt])
}
```

### 3.4 BlogConfig

```prisma
model BlogConfig {
  id                  Int     @id @default(1)
  showPromoBanner     Boolean @default(true)
  promoBannerImage    String?
  promoBannerLink     String?
  promoBannerAlt      String?
  postsPerPage        Int     @default(12)
  featuredPostsCount  Int     @default(5)
  siteTitle           String  @default("Tim Callagy")
  siteDescription     String?
  socialLinkedIn      String?
  socialGitHub        String?
  updatedAt           DateTime @updatedAt
}
```

---

## 4. API Specification

### 4.1 Public Endpoints (No Authentication)

#### GET /api/blog/posts
List published blog posts with pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 12 | Posts per page (max 50) |
| category | string | - | Filter by category slug |
| tag | string | - | Filter by tag |
| featured | boolean | - | Only featured posts (for slider) |

**Response:**
```json
{
  "posts": [
    {
      "id": 1,
      "title": "Getting Started with AI",
      "slug": "getting-started-with-ai",
      "excerpt": "An introduction to...",
      "featuredImage": "https://...",
      "category": "ai-for-learning",
      "tags": ["beginner", "introduction"],
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
```

#### GET /api/blog/posts/:slug
Get single post by slug.

**Response:**
```json
{
  "id": 1,
  "title": "Getting Started with AI",
  "slug": "getting-started-with-ai",
  "content": "# Introduction\n\nMarkdown content...",
  "excerpt": "An introduction to...",
  "featuredImage": "https://...",
  "metaDescription": "Learn the basics of AI...",
  "category": "ai-for-learning",
  "categoryName": "AI for Learning",
  "tags": ["beginner", "introduction"],
  "publishedAt": "2024-01-15T10:00:00Z",
  "readingTime": 5,
  "viewCount": 1234,
  "author": {
    "name": "Tim Callagy",
    "bio": "AI enthusiast and...",
    "avatar": "https://..."
  },
  "relatedPosts": [
    { "id": 2, "title": "...", "slug": "...", "featuredImage": "..." }
  ],
  "previousPost": { "title": "...", "slug": "..." },
  "nextPost": { "title": "...", "slug": "..." }
}
```

#### GET /api/blog/categories
List all categories with post counts.

**Response:**
```json
{
  "categories": [
    {
      "id": 1,
      "name": "AI for Learning",
      "slug": "ai-for-learning",
      "description": "...",
      "postCount": 12
    }
  ]
}
```

#### GET /api/blog/tags
List all tags with usage counts.

**Response:**
```json
{
  "tags": [
    { "name": "beginner", "count": 8 },
    { "name": "tutorial", "count": 15 }
  ]
}
```

#### GET /api/blog/popular
Get popular posts (by view count).

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 5 | Number of posts |

#### POST /api/blog/posts/:slug/view
Increment view count (fire-and-forget, no response body needed).

#### POST /api/blog/newsletter/subscribe
Subscribe to newsletter.

**Request:**
```json
{
  "email": "user@example.com",
  "consent": true,
  "source": "blog-sidebar"
}
```

**Response (201):**
```json
{
  "message": "Successfully subscribed",
  "email": "user@example.com"
}
```

**Error Responses:**
- 400: Invalid email format
- 400: Consent not provided
- 409: Email already subscribed

#### GET /api/blog/config
Get public blog configuration.

**Response:**
```json
{
  "siteTitle": "Tim Callagy",
  "siteDescription": "AI insights for...",
  "socialLinkedIn": "https://linkedin.com/in/...",
  "socialGitHub": "https://github.com/...",
  "showPromoBanner": true,
  "promoBannerImage": "https://...",
  "promoBannerLink": "https://...",
  "promoBannerAlt": "Work with me"
}
```

### 4.2 Admin Endpoints (Authentication Required)

All admin endpoints require session authentication (existing PA auth).

#### GET /api/blog/admin/posts
List all posts including drafts.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Posts per page |
| status | string | - | Filter by status (DRAFT, PUBLISHED, SCHEDULED) |
| search | string | - | Search in title/content |

#### POST /api/blog/admin/posts
Create new post.

**Request:**
```json
{
  "title": "My New Post",
  "content": "# Markdown content...",
  "excerpt": "Optional excerpt...",
  "featuredImage": "https://...",
  "metaDescription": "SEO description...",
  "category": "ai-for-coding",
  "tags": ["tutorial", "python"],
  "status": "DRAFT",
  "publishAt": "2024-02-01T10:00:00Z"
}
```

**Response (201):**
```json
{
  "id": 5,
  "slug": "my-new-post",
  "...": "..."
}
```

#### GET /api/blog/admin/posts/:id
Get single post by ID (includes drafts).

#### PUT /api/blog/admin/posts/:id
Update post.

#### DELETE /api/blog/admin/posts/:id
Delete post (soft delete or hard delete TBD).

#### POST /api/blog/admin/posts/:id/publish
Publish a draft immediately.

#### POST /api/blog/admin/upload
Upload image for blog post.

**Request:** multipart/form-data with `image` field

**Response:**
```json
{
  "url": "https://...",
  "filename": "image-123.jpg"
}
```

#### GET /api/blog/admin/subscribers
List newsletter subscribers.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Per page |
| active | boolean | true | Only active (not unsubscribed) |

#### DELETE /api/blog/admin/subscribers/:id
Remove subscriber (sets unsubscribedAt).

#### GET /api/blog/admin/subscribers/export
Export subscribers as CSV.

#### GET /api/blog/admin/config
Get full blog configuration.

#### PUT /api/blog/admin/config
Update blog configuration.

---

## 5. Blog Frontend (packages/blog)

### 5.1 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Template CSS (migrated) + Tailwind for additions
- **Markdown:** react-markdown + remark-gfm + rehype-highlight
- **State:** React Query for data fetching
- **Deployment:** Render (or Vercel)

### 5.2 Pages

| Route | Description | Data Source |
|-------|-------------|-------------|
| `/` | Homepage - featured slider + masonry grid | GET /api/blog/posts |
| `/post/[slug]` | Single post | GET /api/blog/posts/:slug |
| `/category/[slug]` | Category archive | GET /api/blog/posts?category= |
| `/tag/[tag]` | Tag archive | GET /api/blog/posts?tag= |
| `/about` | About page | Static + config |
| `/contact` | Contact page | Static + config |
| `/privacy` | Privacy policy | Static content |

### 5.3 Components

```
components/
├── layout/
│   ├── Header.tsx          # Navigation, logo, search
│   ├── Footer.tsx          # Footer widgets, copyright
│   ├── Sidebar.tsx         # Sidebar with widgets
│   └── Layout.tsx          # Main layout wrapper
├── blog/
│   ├── PostCard.tsx        # Masonry grid card
│   ├── PostSlider.tsx      # Featured posts carousel
│   ├── PostContent.tsx     # Markdown renderer
│   ├── PostMeta.tsx        # Date, category, reading time
│   ├── ShareLinks.tsx      # LinkedIn, Email share
│   ├── AuthorBio.tsx       # Author section
│   ├── RelatedPosts.tsx    # "You May Also Like"
│   ├── Pagination.tsx      # Page navigation
│   └── DiscussLink.tsx     # "Discuss on LinkedIn" CTA
├── sidebar/
│   ├── AboutWidget.tsx     # Photo + bio
│   ├── SocialWidget.tsx    # LinkedIn, GitHub icons
│   ├── CategoriesWidget.tsx # Category list
│   ├── PopularWidget.tsx   # Popular posts
│   ├── NewsletterWidget.tsx # Email signup form
│   └── PromoWidget.tsx     # Banner (toggleable)
└── ui/
    ├── Button.tsx
    ├── Input.tsx
    └── Checkbox.tsx
```

### 5.4 Newsletter Widget Specification

```tsx
// NewsletterWidget.tsx
interface NewsletterFormData {
  email: string;
  consent: boolean;
}

// UI Elements:
// 1. Heading: "Subscribe to Newsletter"
// 2. Subtext: "Get AI insights delivered to your inbox"
// 3. Email input (required, email validation)
// 4. Checkbox (required): "I agree to receive newsletter emails about AI topics. View our [Privacy Policy](/privacy)."
// 5. Submit button: "Subscribe"
// 6. Success message: "Thanks for subscribing!"
// 7. Error message: Display API errors

// Consent text stored: "I agree to receive newsletter emails about AI topics. Subscribed via blog-sidebar on {date}."
```

### 5.5 Reading Time Calculation

```typescript
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}
```

### 5.6 Slug Generation

```typescript
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')  // Remove special chars
    .replace(/\s+/g, '-')       // Spaces to hyphens
    .replace(/-+/g, '-')        // Collapse multiple hyphens
    .substring(0, 100);         // Limit length
}
```

### 5.7 SEO Requirements

Each page must include:
- `<title>` tag (post title + site name)
- `<meta name="description">` (metaDescription or excerpt)
- Open Graph tags (og:title, og:description, og:image, og:url)
- Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image)
- Canonical URL
- JSON-LD structured data (Article schema)

---

## 6. PA Web Portal Extensions

### 6.1 New Navigation Item

Add to sidebar (packages/web/src/components/layout/Sidebar.tsx):
```typescript
{ href: '/blog', label: 'Blog', icon: '📰' }
```

### 6.2 New Pages

| Route | Description |
|-------|-------------|
| `/blog` | List all posts (with status filters) |
| `/blog/new` | Create new post |
| `/blog/edit/[id]` | Edit existing post |
| `/blog/subscribers` | Newsletter subscribers list |
| `/blog/settings` | Blog configuration |

### 6.3 Blog Post Editor

**Features:**
- Title input
- Slug input (auto-generated, editable)
- Category dropdown (7 options)
- Tags input (comma-separated or tag chips)
- Featured image upload/URL input
- Meta description textarea (with character count, max 160)
- Content editor:
  - Markdown textarea with monospace font
  - Live preview pane (side-by-side or tabbed)
  - Syntax highlighting in preview
- Status selector (Draft / Published / Scheduled)
- Publish date picker (for scheduled posts)
- Save Draft / Publish buttons

**Markdown Editor Libraries:**
- Option A: Simple textarea + react-markdown preview
- Option B: @uiw/react-md-editor (built-in preview)
- Option C: Monaco Editor with markdown support

Recommendation: Option A for simplicity, matching existing PA portal style.

---

## 7. MCP Server Extensions

### 7.1 New Tools

Add to `packages/mcp-server/src/tools/index.ts`:

```typescript
get_blog_posts: {
  description: 'List blog posts. Use when user wants to see their blog content.',
  schema: z.object({
    status: z.enum(['all', 'draft', 'published', 'scheduled']).optional(),
    category: z.string().optional(),
    limit: z.coerce.number().optional().default(10),
  }),
  handler: async (args) => { /* ... */ }
},

get_blog_post: {
  description: 'Get a single blog post by ID or slug.',
  schema: z.object({
    id: z.coerce.number().optional(),
    slug: z.string().optional(),
  }),
  handler: async (args) => { /* ... */ }
},

save_blog_post: {
  description: 'Create or update a blog post.',
  schema: z.object({
    id: z.coerce.number().optional(), // If provided, update; else create
    title: z.string(),
    content: z.string(),
    category: z.string(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
    metaDescription: z.string().optional(),
    featuredImage: z.string().optional(),
  }),
  handler: async (args) => { /* ... */ }
},

delete_blog_post: {
  description: 'Delete a blog post.',
  schema: z.object({
    id: z.coerce.number(),
  }),
  handler: async (args) => { /* ... */ }
},

get_blog_subscribers: {
  description: 'List newsletter subscribers.',
  schema: z.object({
    limit: z.coerce.number().optional().default(50),
    active: z.boolean().optional().default(true),
  }),
  handler: async (args) => { /* ... */ }
},
```

---

## 8. Error Handling

### 8.1 API Error Responses

All errors follow consistent format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { /* optional field-level errors */ }
  }
}
```

**Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid input data |
| NOT_FOUND | 404 | Resource not found |
| DUPLICATE_ENTRY | 409 | Slug/email already exists |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| INTERNAL_ERROR | 500 | Server error |

### 8.2 Validation Rules

**BlogPost:**
- title: required, 1-200 characters
- slug: required, unique, URL-safe, 1-100 characters
- content: required, 1-100,000 characters
- excerpt: optional, max 300 characters
- metaDescription: optional, max 160 characters
- category: required, must be valid category slug
- tags: optional, max 10 tags, each max 50 characters
- featuredImage: optional, valid URL format
- publishAt: optional, must be future date if status is SCHEDULED

**NewsletterSubscriber:**
- email: required, valid email format, max 254 characters
- consent: required, must be true

### 8.3 Frontend Error Handling

- Display user-friendly error messages
- Log errors to console in development
- Retry failed requests with exponential backoff (data fetching)
- Show fallback UI for failed components
- 404 page for invalid post slugs
- Offline indicator if API unreachable

---

## 9. Security Considerations

### 9.1 Input Sanitization

- Sanitize all user input before database storage
- Use parameterized queries (Prisma handles this)
- Escape HTML in user-generated content displayed on page
- Validate file uploads (images only, max size 5MB)

### 9.2 Rate Limiting

Apply rate limits to public endpoints:
| Endpoint | Limit |
|----------|-------|
| POST /newsletter/subscribe | 5 per IP per hour |
| POST /posts/:slug/view | 100 per IP per minute |
| GET /posts | 100 per IP per minute |

### 9.3 CORS Configuration

```typescript
// Blog frontend domain allowed
const blogCorsOptions = {
  origin: ['https://timcallagy.com', 'http://localhost:3002'],
  credentials: false, // Public API, no cookies
};
```

### 9.4 Content Security Policy

For blog frontend:
```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' fonts.googleapis.com;
font-src 'self' fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://pa-api-6uyh.onrender.com;
```

---

## 10. GDPR Compliance

### 10.1 Newsletter Consent

**Required elements:**
1. Unchecked checkbox (no pre-selection)
2. Clear description of what they're subscribing to
3. Link to privacy policy
4. Store consent timestamp
5. Store consent text (what they agreed to)
6. Store IP address (optional but recommended)
7. Provide unsubscribe mechanism

**Consent text template:**
```
"I agree to receive newsletter emails about AI topics from Tim Callagy. I understand I can unsubscribe at any time. View Privacy Policy."
```

### 10.2 Data Subject Rights

Implement ability to:
1. **Access:** Export subscriber's data on request
2. **Rectification:** Update email address
3. **Erasure:** Delete subscriber record completely
4. **Portability:** Export as CSV/JSON

### 10.3 Privacy Policy Requirements

The `/privacy` page must include:
1. What data is collected (email, IP, consent timestamp)
2. Why it's collected (newsletter delivery)
3. How it's stored (PostgreSQL on Render, encrypted at rest)
4. How long it's retained (until unsubscribe + 30 days)
5. Who has access (site owner only)
6. How to unsubscribe/request deletion
7. Contact information for data requests
8. Cookie policy (if using analytics)

---

## 11. Performance Optimization

### 11.1 Caching Strategy

**API Level:**
- Cache GET /posts responses for 5 minutes
- Cache GET /categories for 1 hour
- Cache GET /config for 1 hour
- Invalidate cache on POST/PUT/DELETE

**Frontend:**
- Static generation (SSG) for homepage, category pages
- Incremental Static Regeneration (ISR) with 10-minute revalidation
- Client-side SWR/React Query with stale-while-revalidate

### 11.2 Image Optimization

- Use Next.js Image component for automatic optimization
- Generate responsive srcset
- Lazy load below-fold images
- Serve WebP format where supported
- Max upload size: 5MB
- Recommended dimensions: 1200x630 (2:1 ratio for social sharing)

### 11.3 Database Indexes

Already defined in schema:
- `BlogPost.slug` (unique index for lookups)
- `BlogPost.status, publishedAt` (composite for listing)
- `BlogPost.category` (for filtering)
- `NewsletterSubscriber.email` (unique index)

---

## 12. Testing Plan

### 12.1 Unit Tests

**API Layer (packages/api):**
```
tests/
├── blog/
│   ├── posts.test.ts
│   │   ├── GET /posts - pagination, filtering, sorting
│   │   ├── GET /posts/:slug - found, not found, draft access
│   │   ├── POST /admin/posts - validation, slug generation
│   │   ├── PUT /admin/posts/:id - update, publish
│   │   └── DELETE /admin/posts/:id - soft delete
│   ├── newsletter.test.ts
│   │   ├── POST /newsletter/subscribe - success, duplicate, invalid
│   │   └── consent validation
│   ├── categories.test.ts
│   │   └── GET /categories - with counts
│   └── config.test.ts
│       ├── GET /config - public fields only
│       └── PUT /admin/config - update settings
```

**Shared (packages/shared):**
```
tests/
├── slug.test.ts          # Slug generation edge cases
├── readingTime.test.ts   # Reading time calculation
└── validation.test.ts    # Zod schema validation
```

### 12.2 Integration Tests

```
tests/integration/
├── blog-flow.test.ts
│   ├── Create draft → edit → publish → view
│   ├── Scheduled post publishes at correct time
│   └── Related posts algorithm
├── newsletter-flow.test.ts
│   ├── Subscribe → confirm stored → unsubscribe
│   └── Duplicate email handling
└── auth.test.ts
    ├── Admin endpoints require auth
    └── Public endpoints work without auth
```

### 12.3 E2E Tests (Playwright)

```
tests/e2e/
├── blog-homepage.spec.ts
│   ├── Featured slider displays posts
│   ├── Masonry grid loads
│   ├── Pagination works
│   └── Category filter works
├── blog-post.spec.ts
│   ├── Post renders correctly
│   ├── Markdown renders properly
│   ├── Share links work
│   ├── Related posts display
│   └── View count increments
├── newsletter.spec.ts
│   ├── Form validation
│   ├── Consent checkbox required
│   ├── Success message displays
│   └── Duplicate email error
├── admin-blog.spec.ts
│   ├── Create new post
│   ├── Edit existing post
│   ├── Markdown preview works
│   ├── Image upload
│   └── Publish/unpublish
└── seo.spec.ts
    ├── Meta tags present
    ├── Open Graph tags correct
    └── JSON-LD structured data valid
```

### 12.4 Test Data

**Seed test posts:**
- 1 published post per category (7 total)
- 2 draft posts
- 1 scheduled post (future date)
- Posts with varying content lengths
- Posts with/without featured images

**Seed test subscribers:**
- 5 active subscribers
- 2 unsubscribed

### 12.5 Performance Tests

- Homepage load time < 2s (Lighthouse)
- API response time < 200ms (p95)
- Database queries < 50ms
- Image optimization working (WebP served)

---

## 13. Deployment

### 13.1 Environment Variables

**Blog Frontend (packages/blog):**
```env
NEXT_PUBLIC_API_URL=https://pa-api-6uyh.onrender.com/api
NEXT_PUBLIC_SITE_URL=https://timcallagy.com
```

**API (packages/api) - additions:**
```env
BLOG_IMAGE_UPLOAD_PATH=/uploads/blog
BLOG_MAX_IMAGE_SIZE=5242880
```

### 13.2 Render Configuration

**New Service: pa-blog**
- Type: Static Site (or Web Service for SSR)
- Build Command: `pnpm --filter @pa/blog build`
- Publish Directory: `packages/blog/.next` (or `out` for static)
- Custom Domain: timcallagy.com

**DNS Configuration:**
```
Type: CNAME
Name: @
Value: <render-provided-value>
```

### 13.3 Build Order

1. `@pa/shared` (types and utilities)
2. `@pa/api` (database migrations)
3. `@pa/web` (admin portal)
4. `@pa/blog` (public blog)
5. `@pa/mcp-server` (Claude tools)

---

## 14. Implementation Phases

### Phase 1: Database & API
1. Add Prisma models (BlogPost, BlogCategory, NewsletterSubscriber, BlogConfig)
2. Run migrations
3. Seed categories
4. Implement public API endpoints
5. Implement admin API endpoints
6. Add tests

### Phase 2: PA Portal Extensions
1. Add Blog nav item
2. Create posts list page
3. Create post editor with Markdown preview
4. Create subscribers list page
5. Create settings page
6. Add tests

### Phase 3: Blog Frontend
1. Set up packages/blog Next.js project
2. Migrate template CSS/JS
3. Build layout components (Header, Footer, Sidebar)
4. Build homepage with masonry grid
5. Build single post page
6. Build category/tag archives
7. Build About and Contact pages
8. Build Privacy Policy page
9. Implement newsletter signup widget
10. Add SEO meta tags
11. Add tests

### Phase 4: MCP Tools
1. Add blog tools to MCP server
2. Test via Claude Code
3. Update tool documentation

### Phase 5: Deployment
1. Configure Render service for blog
2. Set up custom domain
3. Configure DNS
4. SSL certificate (automatic via Render)
5. Smoke tests in production

---

## 15. Privacy Policy Template

```markdown
# Privacy Policy

Last updated: [DATE]

## Introduction

This Privacy Policy describes how Tim Callagy ("we", "us", or "our") collects, uses, and shares information when you use our website at timcallagy.com (the "Site").

## Information We Collect

### Newsletter Subscription
When you subscribe to our newsletter, we collect:
- Email address
- Timestamp of subscription
- IP address (for consent verification)

### Usage Data
We may collect anonymous usage data including:
- Pages visited
- Time spent on pages
- Browser type and version

## How We Use Your Information

We use the information we collect to:
- Send you our newsletter about AI topics (if subscribed)
- Improve our website and content
- Respond to your inquiries

## Data Storage

Your data is stored securely on servers provided by Render.com, with encryption at rest. We retain newsletter subscription data until you unsubscribe, plus 30 days for record-keeping purposes.

## Your Rights

Under GDPR and similar regulations, you have the right to:
- **Access** your personal data
- **Correct** inaccurate data
- **Delete** your data ("right to be forgotten")
- **Export** your data in a portable format
- **Withdraw consent** at any time

## Unsubscribing

You can unsubscribe from our newsletter at any time by:
- Clicking the unsubscribe link in any newsletter email
- Contacting us directly at [EMAIL]

## Cookies

This site uses essential cookies for functionality. We do not use tracking cookies or third-party analytics that collect personal data.

## Third-Party Services

We use the following third-party services:
- Render.com (hosting)
- [Add any analytics if used]

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify subscribers of any material changes via email.

## Contact Us

For any questions about this Privacy Policy or to exercise your data rights, contact:

Tim Callagy
[EMAIL ADDRESS]

---

By subscribing to our newsletter, you acknowledge that you have read and understood this Privacy Policy.
```

---

## 16. Open Questions / Future Considerations

1. **Analytics:** Add privacy-friendly analytics (Plausible, Fathom)?
2. **Search:** Add full-text search functionality?
3. **RSS Feed:** Generate RSS/Atom feed for posts?
4. **Email Delivery:** Eventually integrate with email service (ConvertKit, Buttondown)?
5. **Image Hosting:** Use external service (Cloudinary, S3) vs local uploads?
6. **Syntax Highlighting:** Which languages to support in code blocks?
7. **Social Images:** Auto-generate OG images for posts?

---

## Appendix A: Category Slugs Reference

| Category Name | Slug |
|---------------|------|
| AI for Learning | ai-for-learning |
| AI for Coding | ai-for-coding |
| AI for Marketing | ai-for-marketing |
| AI for Branding | ai-for-branding |
| AI for Operational Efficiency | ai-for-operational-efficiency |
| AI for Innovation | ai-for-innovation |
| AI for Data Insights | ai-for-data-insights |

---

## Appendix B: Social Share URLs

**LinkedIn Share:**
```
https://www.linkedin.com/sharing/share-offsite/?url={encodedUrl}
```

**Email Share:**
```
mailto:?subject={encodedTitle}&body=Check out this article: {encodedUrl}
```

**"Discuss on LinkedIn" (pre-filled post):**
```
https://www.linkedin.com/feed/?shareActive=true&text={encodedText} {encodedUrl}
```
