# ==============================================================================
# Multi-Stage Production Dockerfile for DAGI BINGO Server
# ==============================================================================

# Stage 1: Build & Compile TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root configurations and workspace definitions
COPY package*.json tsconfig.base.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY server/package*.json ./server/

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm ci

# Copy shared modules and server source code
COPY packages/shared ./packages/shared
COPY server ./server

# Compile TypeScript
RUN npm run build:server

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

# Copy package manifests for clean production install
COPY package*.json tsconfig.base.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY server/package*.json ./server/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy source shared files and compiled server dist
COPY packages/shared ./packages/shared
COPY --from=builder /app/server/dist ./server/dist

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/health || exit 1

# Start authoritative server engine
CMD ["npm", "run", "start", "--workspace=@bingo/server"]
