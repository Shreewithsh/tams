# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages ./packages
COPY apps/notification-service ./apps/notification-service

RUN pnpm install --no-frozen-lockfile --ignore-scripts

RUN pnpm --filter @ms/contracts build
RUN pnpm --filter @ms/shared build
RUN pnpm --filter @ms/config build
RUN pnpm --filter @ms/notification-service build

# ============================================================
# Stage 2: Production runner
# ============================================================
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app ./

USER nodejs

CMD ["node", "apps/notification-service/dist/index.js"]
