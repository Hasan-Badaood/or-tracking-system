# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY client/package.json ./client/

RUN pnpm install --filter or-tracking-frontend --frozen-lockfile

COPY client ./client

ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter or-tracking-frontend build

# ── Stage 2: serve with nginx ────────────────────────────────────────────────
FROM nginx:alpine AS production

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
