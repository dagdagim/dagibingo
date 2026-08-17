# ==============================================================================
# Monorepo Root Production Dockerfile for DAGI BINGO Server
# ==============================================================================

# Stage 1: Build & Compile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.base.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY server/package*.json ./server/

RUN npm install

COPY packages/shared ./packages/shared
COPY server ./server

RUN npm run build:server

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

COPY server/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/server/dist ./dist

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/health || exit 1

CMD ["node", "dist/server.js"]
