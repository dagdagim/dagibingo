FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.base.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY client/package*.json ./client/

RUN npm ci

COPY packages/shared ./packages/shared
COPY client ./client

RUN npm run build:shared
RUN npm run build:client

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
