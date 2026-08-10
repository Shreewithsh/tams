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
COPY apps/notification-service/package.json ./apps/notification-service/

RUN pnpm install --no-frozen-lockfile --ignore-scripts

COPY packages/contracts ./packages/contracts
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config
COPY apps/notification-service ./apps/notification-service
COPY tsconfig.json ./

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

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/config/package.json ./packages/config/package.json
COPY --from=builder --chown=nodejs:nodejs /app/apps/notification-service/dist ./apps/notification-service/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/notification-service/package.json ./apps/notification-service/package.json
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-workspace.yaml ./

USER nodejs

CMD ["node", "apps/notification-service/dist/index.js"]
