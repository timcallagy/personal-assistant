# PA Deployment Guide

This guide covers deploying PA (Personal Assistant) to production.

## Prerequisites

- A Render.com account (or similar PaaS)
- PostgreSQL database
- Domain name (optional)

## Option 1: Deploy to Render

### Automatic Deployment

1. Push code to a Git repository (GitHub, GitLab, etc.)
2. Create a new Blueprint in Render
3. Connect your repository
4. Render will auto-detect `render.yaml` and create services

### Manual Configuration

If not using the Blueprint:

#### 1. Create PostgreSQL Database

- Create a new PostgreSQL database on Render
- Note the Internal Database URL

#### 2. Deploy API

Create a new Web Service:
- **Build Command**: `pnpm install && pnpm --filter @pa/api build && pnpm --filter @pa/api db:generate`
- **Start Command**: `pnpm --filter @pa/api start`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `PORT`: `3001`
  - `DATABASE_URL`: (your PostgreSQL connection string)
  - `CORS_ORIGIN`: (your web app URL)

#### 3. Deploy Web UI

Create a new Web Service:
- **Build Command**: `pnpm install && pnpm --filter @pa/web build`
- **Start Command**: `pnpm --filter @pa/web start`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `NEXT_PUBLIC_API_URL`: (your API URL, e.g., https://pa-api.onrender.com/api/v1)

## Option 2: Docker Deployment

### Build and Run API

```bash
# Build the image
docker build -t pa-api -f packages/api/Dockerfile .

# Run the container
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e CORS_ORIGIN="https://your-web-app.com" \
  pa-api
```

### Using Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pa
      POSTGRES_USER: pa
      POSTGRES_PASSWORD: your-password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://pa:your-password@db:5432/pa
      CORS_ORIGIN: http://localhost:3000
    depends_on:
      - db

volumes:
  postgres_data:
```

## Database Setup

After deploying, run database migrations:

```bash
# Run migrations
pnpm --filter @pa/api db:push

# Seed initial user
pnpm --filter @pa/api db:seed
```

The seed script creates a default user:
- **Username**: `admin`
- **Password**: `admin123`
- **API Key**: (shown in console output)

**IMPORTANT**: Change the password and API key in production!

## MCP Server Configuration

Configure Claude Desktop to use the MCP server with your production API:

```json
{
  "mcpServers": {
    "pa": {
      "command": "node",
      "args": ["/path/to/pa/packages/mcp-server/dist/index.js"],
      "env": {
        "PA_API_URL": "https://your-api-url.onrender.com/api/v1",
        "PA_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Security Checklist

- [ ] Change default admin password
- [ ] Generate a secure API key
- [ ] Set `CORS_ORIGIN` to your specific domain
- [ ] Enable HTTPS (automatic on Render)
- [ ] Set secure cookies in production
- [ ] Consider rate limiting for API endpoints

## Monitoring

- Use Render's built-in logs and metrics
- Health check endpoint: `/api/v1/health`
- Consider adding error tracking (e.g., Sentry)

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure database is accessible from API service
- Check PostgreSQL SSL settings

### CORS Errors

- Verify `CORS_ORIGIN` includes your web app URL
- Ensure the URL matches exactly (including protocol)

### MCP Server Not Connecting

- Check API URL and API key
- Verify API is accessible from your machine
- Check Claude Desktop logs for errors
