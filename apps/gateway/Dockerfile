# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml* ./

COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY apps/gateway/package.json ./apps/gateway/

RUN pnpm install --no-frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/config ./packages/config
COPY apps/gateway ./apps/gateway
COPY tsconfig.json ./

RUN pnpm --filter @ms/shared build
RUN pnpm --filter @ms/config build
RUN pnpm --filter @ms/gateway build

# ============================================================
# Stage 2: Production runner
# ============================================================
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/config/package.json ./packages/config/package.json
COPY --from=builder --chown=nodejs:nodejs /app/apps/gateway/dist ./apps/gateway/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/gateway/package.json ./apps/gateway/package.json
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-workspace.yaml ./

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --tries=1 -O - http://localhost:3000/health || exit 1

CMD ["node", "apps/gateway/dist/index.js"]
