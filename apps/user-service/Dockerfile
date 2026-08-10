# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml* ./

COPY packages/contracts/package.json ./packages/contracts/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY apps/user-service/package.json ./apps/user-service/

RUN pnpm install --no-frozen-lockfile --ignore-scripts

COPY packages/contracts ./packages/contracts
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config
COPY apps/user-service ./apps/user-service
COPY prisma ./prisma
COPY tsconfig.json ./

RUN pnpm --filter @ms/contracts build
RUN pnpm --filter @ms/shared build
RUN pnpm --filter @ms/config build
RUN pnpm --filter @ms/user-service build

RUN pnpm exec prisma generate --schema=/app/prisma/schema.prisma

# ============================================================
# Stage 2: Migrator (used by db-migrate service in compose)
# ============================================================
FROM node:22-alpine AS migrator

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json pnpm-workspace.yaml ./

# ============================================================
# Stage 3: Production runner
# ============================================================
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/config/package.json ./packages/config/package.json
COPY --from=builder --chown=nodejs:nodejs /app/apps/user-service/dist ./apps/user-service/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/user-service/package.json ./apps/user-service/package.json
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-workspace.yaml ./

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --tries=1 -O - http://localhost:3001/health || exit 1

CMD ["node", "apps/user-service/dist/index.js"]
