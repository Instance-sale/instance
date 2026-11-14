FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm@10.28.2
WORKDIR /app

FROM base AS builder
WORKDIR /app

# Copy monorepo files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/workers/ ./apps/workers/

# Install dependencies without running scripts before symlinks exist
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

# Build required packages and workers daemon
RUN pnpm --filter @instance/db run build \
    && pnpm --filter @instance/types run build \
    && pnpm --filter @instance/workers run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy runtime assets
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/workers/package.json ./apps/workers/
COPY --from=builder /app/apps/workers/dist ./apps/workers/dist
COPY --from=builder /app/apps/workers/node_modules ./apps/workers/node_modules

WORKDIR /app/apps/workers
CMD ["node", "dist/index.js"]
