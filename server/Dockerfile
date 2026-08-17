FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package descriptors
COPY package*.json tsconfig.base.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY server ./server

# Build shared and server
RUN npm run build:shared
RUN npm run build:server

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY server/package*.json ./server/

RUN npm ci --only=production

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/server/dist ./server/dist

EXPOSE 5000

CMD ["npm", "run", "start", "--workspace=@bingo/server"]
