FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy package files
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/api/ ./packages/api/

# Build shared package
RUN pnpm --filter @pa/shared build

# Generate Prisma client
RUN pnpm --filter @pa/api db:generate

# Build API
RUN pnpm --filter @pa/api build

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Start the server
CMD ["pnpm", "--filter", "@pa/api", "start"]
