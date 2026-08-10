# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl libc6-compat python3 make g++

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json tsconfig.json ./
COPY prisma ./prisma
COPY packages ./packages
COPY apps/user-service ./apps/user-service

RUN pnpm install --no-frozen-lockfile --ignore-scripts
RUN pnpm rebuild argon2

RUN pnpm --filter @ms/contracts build
RUN pnpm --filter @ms/shared build
RUN pnpm --filter @ms/config build
RUN pnpm exec prisma generate --schema=/app/prisma/schema.prisma
RUN pnpm --filter @ms/user-service build

# ============================================================
# Stage 2: Migrator (used by db-migrate service in compose)
# ============================================================
FROM node:22-alpine AS migrator

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app ./

# ============================================================
# Stage 3: Production runner
# ============================================================
FROM node:22-alpine AS production

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app ./

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --tries=1 -O - http://localhost:3001/health || exit 1

CMD ["node", "apps/user-service/dist/index.js"]
