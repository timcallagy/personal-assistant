# Blog Feature Implementation Checklist

## Overview
- **Spec Document**: `blog_spec.md`
- **Implementation Prompts**: `blog_implementation_prompts.md`
- **Domain**: timcallagy.com
- **Total Phases**: 7
- **Total Prompts**: 32

---

## Phase 1: Database Foundation

### 1.1 Add Blog Database Models
- [ ] Add `PostStatus` enum to Prisma schema (DRAFT, PUBLISHED, SCHEDULED)
- [ ] Add `BlogPost` model with all fields
- [ ] Add `BlogCategory` model
- [ ] Add `NewsletterSubscriber` model
- [ ] Add `BlogConfig` model (singleton)
- [ ] Add `posts` relation to existing `User` model
- [ ] Add indexes on BlogPost (slug, [status, publishedAt], category)
- [ ] Add indexes on NewsletterSubscriber (email, unsubscribedAt)
- [ ] Run `pnpm --filter @pa/api db:generate`

### 1.2 Run Migration and Seed Categories
- [ ] Run `pnpm --filter @pa/api db:push`
- [ ] Create `packages/api/prisma/seed-blog.ts`
- [ ] Seed 7 blog categories:
  - [ ] AI for Learning
  - [ ] AI for Coding
  - [ ] AI for Marketing
  - [ ] AI for Branding
  - [ ] AI for Operational Efficiency
  - [ ] AI for Innovation
  - [ ] AI for Data Insights
- [ ] Seed default BlogConfig record
- [ ] Add `db:seed-blog` script to package.json
- [ ] Run seed script successfully

### 1.3 Add Blog Types to Shared Package
- [ ] Create `packages/shared/src/blog.ts`
- [ ] Add `PostStatus` enum
- [ ] Add `BlogPost` interface
- [ ] Add `BlogPostSummary` interface
- [ ] Add `BlogCategory` interface
- [ ] Add `NewsletterSubscriber` interface
- [ ] Add `BlogConfig` interface
- [ ] Add API request/response types
- [ ] Add `Pagination` type
- [ ] Add `calculateReadingTime()` helper function
- [ ] Add `generateSlug()` helper function
- [ ] Export from main index.ts
- [ ] Build shared package successfully

---

## Phase 2: Blog API - Public Endpoints

### 2.1 Create Blog Router Structure
- [ ] Create `packages/api/src/routes/blog/` directory
- [ ] Create `packages/api/src/routes/blog/index.ts` (main router)
- [ ] Create `packages/api/src/routes/blog/posts.ts`
- [ ] Create `packages/api/src/routes/blog/categories.ts`
- [ ] Create `packages/api/src/routes/blog/newsletter.ts`
- [ ] Create `packages/api/src/routes/blog/config.ts`
- [ ] Create `packages/api/src/routes/blog/admin/` directory
- [ ] Add GET `/health` endpoint
- [ ] Register blog router in main app at `/api/blog`
- [ ] Verify health endpoint returns OK

### 2.2 Implement GET /api/blog/categories
- [ ] Fetch all categories ordered by sortOrder
- [ ] Count published posts per category
- [ ] Return categories with postCount
- [ ] Wire up in blog router
- [ ] Test endpoint returns 7 categories

### 2.3 Implement GET /api/blog/config
- [ ] Fetch BlogConfig singleton (id=1)
- [ ] Return defaults if not found
- [ ] Return only public fields
- [ ] Wire up in blog router
- [ ] Test endpoint returns config

### 2.4 Implement GET /api/blog/posts (List)
- [ ] Add query params: page, limit, category, tag, featured
- [ ] Filter only PUBLISHED posts with publishedAt <= now
- [ ] Order by publishedAt DESC
- [ ] Calculate reading time for each post
- [ ] Look up category name
- [ ] Generate excerpt if not set
- [ ] Return posts with pagination object
- [ ] Wire up in blog router
- [ ] Test with various query params

### 2.5 Implement GET /api/blog/posts/:slug (Single Post)
- [ ] Find post by slug
- [ ] Only return if published
- [ ] Return 404 if not found
- [ ] Include full content
- [ ] Include related posts (same category, max 3)
- [ ] Include previous/next post links
- [ ] Wire up in blog router
- [ ] Test with valid and invalid slugs

### 2.6 Implement POST /api/blog/posts/:slug/view
- [ ] Find post by slug (must be published)
- [ ] Increment viewCount
- [ ] Return 204 No Content
- [ ] Fire and forget (don't await)
- [ ] Test view count increments

### 2.7 Implement GET /api/blog/tags and GET /api/blog/popular
- [ ] GET /tags: Aggregate tags from published posts
- [ ] GET /tags: Return tags with counts, sorted DESC
- [ ] GET /popular: Return posts ordered by viewCount DESC
- [ ] GET /popular: Accept limit query param
- [ ] Wire up both endpoints
- [ ] Test both endpoints

### 2.8 Implement Newsletter Subscription Endpoint
- [ ] POST /newsletter/subscribe endpoint
- [ ] Validate email format
- [ ] Require consent === true
- [ ] Check for existing active subscriber (409)
- [ ] Handle reactivation of unsubscribed email
- [ ] Store consent text with timestamp
- [ ] Store IP address
- [ ] Return 201 on success
- [ ] Return appropriate error codes
- [ ] Wire up in blog router
- [ ] Test subscription flow

---

## Phase 3: Blog API - Admin Endpoints

### 3.1 Set Up Admin Router with Authentication
- [ ] Create `packages/api/src/routes/blog/admin/index.ts`
- [ ] Import and apply auth middleware
- [ ] Create admin sub-routers structure
- [ ] Add GET /admin/health test endpoint
- [ ] Wire up admin router
- [ ] Verify 401 without auth
- [ ] Verify 200 with auth

### 3.2 Implement Admin Posts List
- [ ] GET /admin/posts endpoint
- [ ] Include ALL posts (drafts, published, scheduled)
- [ ] Add query params: page, limit, status, search
- [ ] Order by updatedAt DESC
- [ ] Search in title and content
- [ ] Return posts with pagination
- [ ] Wire up in admin router
- [ ] Test with various filters

### 3.3 Implement Create Blog Post
- [ ] POST /admin/posts endpoint
- [ ] Validate all input fields
- [ ] Validate category exists
- [ ] Generate slug from title
- [ ] Ensure slug uniqueness (append -1, -2 if needed)
- [ ] Set authorId from session
- [ ] Set publishedAt if status is PUBLISHED
- [ ] Return 201 with created post
- [ ] Return validation errors
- [ ] Test post creation

### 3.4 Implement Get, Update, Delete Blog Post
- [ ] GET /admin/posts/:id - fetch any post by ID
- [ ] PUT /admin/posts/:id - update post
- [ ] Handle slug changes (check uniqueness)
- [ ] Handle status changes (set publishedAt)
- [ ] DELETE /admin/posts/:id - delete post
- [ ] POST /admin/posts/:id/publish - quick publish
- [ ] POST /admin/posts/:id/unpublish - quick unpublish
- [ ] Test all CRUD operations

### 3.5 Implement Admin Subscribers Endpoints
- [ ] GET /admin/subscribers - list with pagination
- [ ] Add query params: page, limit, active
- [ ] Include stats (total, active, unsubscribed)
- [ ] DELETE /admin/subscribers/:id - soft unsubscribe
- [ ] DELETE /admin/subscribers/:id/permanent - hard delete (GDPR)
- [ ] GET /admin/subscribers/export - CSV export
- [ ] Wire up in admin router
- [ ] Test all subscriber management

### 3.6 Implement Admin Config Endpoints
- [ ] GET /admin/config - full config
- [ ] PUT /admin/config - update config
- [ ] Use upsert for safety
- [ ] Validate numeric ranges
- [ ] Validate URL formats
- [ ] Wire up in admin router
- [ ] Test config management

---

## Phase 4: PA Web Portal - Blog Admin UI

### 4.1 Add Blog Navigation and List Page
- [ ] Add Blog nav item to Sidebar.tsx
- [ ] Create `/blog` page route
- [ ] Create posts list page with:
  - [ ] Page title
  - [ ] "New Post" button
  - [ ] Status filter (All/Drafts/Published/Scheduled)
  - [ ] Posts table/list
  - [ ] Status badges
  - [ ] Pagination
  - [ ] Empty state
- [ ] Fetch data from API
- [ ] Handle loading and error states
- [ ] Test navigation and list display

### 4.2 Create Blog Post Editor Page
- [ ] Create `/blog/new` page route
- [ ] Create form with all fields:
  - [ ] Title input
  - [ ] Slug input (auto-generated)
  - [ ] Category dropdown
  - [ ] Tags input
  - [ ] Featured Image URL
  - [ ] Meta Description (with char count)
  - [ ] Content textarea (monospace)
- [ ] Install react-markdown and plugins
- [ ] Implement live Markdown preview
- [ ] Add status selector (Draft/Published/Scheduled)
- [ ] Add datetime picker for scheduled posts
- [ ] Implement auto-slug generation
- [ ] Fetch categories on mount
- [ ] Handle form submission
- [ ] Redirect on success
- [ ] Display validation errors
- [ ] Test creating a draft post

### 4.3 Create Edit Post Page
- [ ] Refactor editor into `PostEditor` component
- [ ] Update `/blog/new` to use PostEditor
- [ ] Create `/blog/edit/[id]` page route
- [ ] Fetch post data on mount
- [ ] Show loading state
- [ ] Show 404 if not found
- [ ] Pass initial data to PostEditor
- [ ] Handle update submission
- [ ] Add "View Post" link (if published)
- [ ] Add delete button
- [ ] Update list page to link to edit
- [ ] Test editing a post

### 4.4 Add Delete Confirmation and Status Actions
- [ ] Create `ConfirmModal` component
- [ ] Add delete functionality to edit page
- [ ] Add delete confirmation modal
- [ ] Add quick actions to posts list:
  - [ ] Publish button for drafts
  - [ ] Unpublish button for published
  - [ ] Publish Now for scheduled
- [ ] Add delete action to list
- [ ] Add toast/notification system
- [ ] Refresh list after actions
- [ ] Test all actions

### 4.5 Create Newsletter Subscribers Page
- [ ] Create `/blog/subscribers` page route
- [ ] Add stats cards (Total/Active/Unsubscribed)
- [ ] Add "Show active only" toggle
- [ ] Create subscribers table
- [ ] Add Unsubscribe action
- [ ] Add Delete action with confirmation
- [ ] Add Export CSV button
- [ ] Add navigation link from /blog
- [ ] Add empty state
- [ ] Test subscriber management

### 4.6 Create Blog Settings Page
- [ ] Create `/blog/settings` page route
- [ ] Add Site Information section
- [ ] Add Social Links section
- [ ] Add Display Settings section
- [ ] Add Promo Banner section with toggle
- [ ] Add banner image preview
- [ ] Load config on mount
- [ ] Handle save submission
- [ ] Validate inputs
- [ ] Show success/error messages
- [ ] Add navigation link
- [ ] Test settings management

---

## Phase 5: MCP Server - Blog Tools

### 5.1 Add Blog Tools to MCP Server
- [ ] Add `get_blog_posts` tool
- [ ] Add `get_blog_post` tool
- [ ] Add `save_blog_post` tool
- [ ] Add `delete_blog_post` tool
- [ ] Update API client with blog methods
- [ ] Format responses as readable text
- [ ] Rebuild MCP server
- [ ] Test "Show my blog posts"
- [ ] Test "Create a blog post"

### 5.2 Add Newsletter Tools to MCP Server
- [ ] Add `get_blog_subscribers` tool
- [ ] Update API client with subscriber methods
- [ ] Format response with stats
- [ ] Rebuild MCP server
- [ ] Test "How many subscribers do I have"

---

## Phase 6: Blog Frontend (Public Site)

### 6.1 Initialize Blog Package
- [ ] Create `packages/blog/` directory
- [ ] Create package.json
- [ ] Set up Next.js 14 with App Router
- [ ] Configure TypeScript
- [ ] Configure Tailwind CSS
- [ ] Create basic layout.tsx
- [ ] Create placeholder page.tsx
- [ ] Add to pnpm workspace
- [ ] Install dependencies
- [ ] Verify dev server starts on port 3002

### 6.2 Set Up API Client and Types
- [ ] Create `packages/blog/src/lib/api.ts`
- [ ] Add `fetchCategories()` function
- [ ] Add `fetchPosts()` function
- [ ] Add `fetchPost()` function
- [ ] Add `fetchPopularPosts()` function
- [ ] Add `fetchTags()` function
- [ ] Add `fetchConfig()` function
- [ ] Add `subscribeNewsletter()` function
- [ ] Add `incrementViewCount()` function
- [ ] Create types file (or import from shared)
- [ ] Create .env.local and .env.example
- [ ] Test API client fetches data

### 6.3 Migrate Template CSS and Assets
- [ ] Copy CSS files to public/css/
- [ ] Copy fonts to public/css/fonts/
- [ ] Copy images to public/images/
- [ ] Update layout.tsx with CSS imports
- [ ] Add Google Fonts
- [ ] Add favicon
- [ ] Verify template styles load
- [ ] Check console for 404s

### 6.4 Create Layout Components (Header, Footer)
- [ ] Create `Header.tsx` component
  - [ ] Logo
  - [ ] Navigation menu
  - [ ] Categories dropdown
  - [ ] Search toggle
  - [ ] Social icons
  - [ ] Mobile menu
- [ ] Create `Footer.tsx` component
  - [ ] Social icons
  - [ ] Footer widgets
  - [ ] Copyright
- [ ] Create `Layout.tsx` wrapper
- [ ] Integrate with app layout
- [ ] Test header/footer render

### 6.5 Create Sidebar Component
- [ ] Create `Sidebar.tsx` container
- [ ] Create `AboutWidget.tsx`
- [ ] Create `SocialWidget.tsx`
- [ ] Create `CategoriesWidget.tsx`
- [ ] Create `PopularWidget.tsx`
- [ ] Create `NewsletterWidget.tsx`
  - [ ] Email input
  - [ ] Consent checkbox
  - [ ] Submit button
  - [ ] Success/error messages
- [ ] Create `PromoWidget.tsx` (toggleable)
- [ ] Compose all widgets in Sidebar
- [ ] Test all widgets render
- [ ] Test newsletter signup

### 6.6 Create Homepage with Masonry Grid
- [ ] Install carousel library (embla-carousel-react)
- [ ] Create `FeaturedSlider.tsx`
- [ ] Create `PostCard.tsx`
- [ ] Create `PostGrid.tsx` (masonry layout)
- [ ] Create `Pagination.tsx`
- [ ] Update homepage to fetch and display posts
- [ ] Add route for `/page/[page]` pagination
- [ ] Test homepage with posts
- [ ] Test pagination

### 6.7 Create Single Post Page
- [ ] Create `/post/[slug]/page.tsx` route
- [ ] Create `PostContent.tsx`
  - [ ] Header (title, meta)
  - [ ] Featured image
  - [ ] Markdown content rendering
  - [ ] Tags
  - [ ] Share links
  - [ ] "Discuss on LinkedIn" CTA
- [ ] Create `AuthorBio.tsx`
- [ ] Create `RelatedPosts.tsx`
- [ ] Create `PostNavigation.tsx`
- [ ] Create `ViewCounter.tsx` (client, 10s delay)
- [ ] Add SEO metadata (generateMetadata)
- [ ] Test post page renders
- [ ] Test markdown rendering
- [ ] Test share links

### 6.8 Create Category and Tag Archive Pages
- [ ] Create `/category/[slug]/page.tsx`
- [ ] Add category header with name
- [ ] Reuse PostGrid and Pagination
- [ ] Add pagination route for categories
- [ ] Create `/tag/[tag]/page.tsx`
- [ ] Add tag header
- [ ] Update links in PostCard and other components
- [ ] Update header navigation
- [ ] Test category filtering
- [ ] Test tag filtering

### 6.9 Create About and Contact Pages
- [ ] Create `/about/page.tsx`
  - [ ] Profile photo
  - [ ] Bio section
  - [ ] Expertise areas
  - [ ] Social links
- [ ] Create `/contact/page.tsx`
  - [ ] Social links
  - [ ] Contact info
- [ ] Add SEO metadata
- [ ] Test both pages

### 6.10 Create Privacy Policy Page
- [ ] Create `/privacy/page.tsx`
- [ ] Add all required GDPR sections
- [ ] Add last updated date
- [ ] Link from NewsletterWidget
- [ ] Link from Footer
- [ ] Test page renders

### 6.11 Add Search Functionality
- [ ] Add search param to API posts endpoint
- [ ] Update API client fetchPosts
- [ ] Create `/search/page.tsx`
- [ ] Create `SearchModal.tsx` (or inline search)
- [ ] Update Header with search trigger
- [ ] Test search functionality

### 6.12 Final Polish and SEO
- [ ] Create `sitemap.ts` for dynamic sitemap
- [ ] Create `robots.ts`
- [ ] Add JSON-LD structured data to posts
- [ ] Create RSS feed at `/feed.xml`
- [ ] Verify all pages have proper metadata
- [ ] Create `not-found.tsx` (404 page)
- [ ] Use Next.js Image component everywhere
- [ ] Run Lighthouse audit
- [ ] Fix performance issues

---

## Phase 7: Deployment

### 7.1 Deploy Blog to Render
- [ ] Update next.config.js for production
- [ ] Create .env.production
- [ ] Update render.yaml with pa-blog service
- [ ] Update API CORS for timcallagy.com
- [ ] Commit and push changes
- [ ] Create blog service on Render
- [ ] Set environment variables
- [ ] Deploy successfully
- [ ] Configure custom domain
- [ ] Update DNS records
- [ ] Verify SSL certificate
- [ ] Test production site

### 7.2 Final Integration Testing
- [ ] **Content Creation Flow**
  - [ ] Create draft in PA portal
  - [ ] Preview markdown
  - [ ] Add featured image
  - [ ] Set category and tags
  - [ ] Publish post
  - [ ] Verify on blog homepage
  - [ ] Verify in category
- [ ] **Blog Frontend**
  - [ ] Homepage loads
  - [ ] Featured slider works
  - [ ] Masonry grid correct
  - [ ] Pagination works
  - [ ] Single post loads
  - [ ] Markdown renders correctly
  - [ ] Related posts show
  - [ ] Navigation works
  - [ ] Share links work
  - [ ] Category filter works
  - [ ] Tag filter works
  - [ ] Search works
  - [ ] About page loads
  - [ ] Contact page loads
  - [ ] Privacy policy loads
- [ ] **Newsletter**
  - [ ] Subscribe form works
  - [ ] Success message shows
  - [ ] Duplicate error shows
  - [ ] Consent error shows
  - [ ] Subscriber in admin
  - [ ] CSV export works
  - [ ] Unsubscribe works
- [ ] **MCP Tools**
  - [ ] List posts works
  - [ ] Create post works
  - [ ] Subscriber count works
- [ ] **SEO**
  - [ ] Meta tags correct
  - [ ] Sitemap accessible
  - [ ] Robots.txt accessible
  - [ ] Submit to Google Search Console
- [ ] **Mobile Testing**
  - [ ] Homepage responsive
  - [ ] Post page responsive
  - [ ] Navigation works
  - [ ] Sidebar collapses
- [ ] **Performance**
  - [ ] Lighthouse score acceptable
  - [ ] No critical issues
- [ ] **Monitoring**
  - [ ] Set up uptime monitoring
  - [ ] Verify logs accessible

---

## Post-Launch

### Documentation
- [ ] Update README with blog feature
- [ ] Document MCP tools
- [ ] Document deployment process

### Future Enhancements (Optional)
- [ ] Analytics integration (Plausible/Fathom)
- [ ] RSS feed improvements
- [ ] Email service integration
- [ ] Image CDN (Cloudinary/S3)
- [ ] Auto-generate OG images
- [ ] Full-text search improvements

---

## Progress Summary

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1: Database | Not Started | 0/21 |
| Phase 2: Public API | Not Started | 0/42 |
| Phase 3: Admin API | Not Started | 0/32 |
| Phase 4: Portal UI | Not Started | 0/52 |
| Phase 5: MCP Tools | Not Started | 0/12 |
| Phase 6: Blog Frontend | Not Started | 0/73 |
| Phase 7: Deployment | Not Started | 0/36 |
| **Total** | **Not Started** | **0/268** |

---

## Notes

_Use this section to track issues, decisions, or deviations from the plan._

```
Date:
Note:
```
