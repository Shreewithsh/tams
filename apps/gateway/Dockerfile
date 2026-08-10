# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages ./packages
COPY apps/gateway ./apps/gateway

RUN pnpm install --no-frozen-lockfile --ignore-scripts

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

COPY --from=builder --chown=nodejs:nodejs /app ./

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --tries=1 -O - http://localhost:3000/health || exit 1

CMD ["node", "apps/gateway/dist/index.js"]
