# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@9

# Copy workspace manifests so pnpm can resolve the monorepo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server/package.json ./server/

RUN pnpm install --filter or-tracking-backend --frozen-lockfile

COPY server ./server

RUN pnpm --filter or-tracking-backend build

# ── Stage 2: production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

RUN npm install -g pnpm@9

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server/package.json ./server/

RUN pnpm install --filter or-tracking-backend --frozen-lockfile --prod

COPY --from=builder /app/server/dist ./server/dist

EXPOSE 3000

CMD ["node", "server/dist/server.js"]
