# syntax=docker/dockerfile:1.7
# Production image: Next.js standalone server + Prisma migrations, running as a non-root user.
# Built by docker-compose.yml (Coolify builds it the same way).

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
# OpenSSL is needed by Prisma's query engine; ca-certificates for outgoing HTTPS (alerts, buyers, fonts).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- Dependencies (cached until package files or the schema change)
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ---- Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are baked into browser code at build time, so they are build arguments.
ARG NEXT_PUBLIC_TRUSTEDFORM_ENABLED=false
ENV NEXT_PUBLIC_TRUSTEDFORM_ENABLED=$NEXT_PUBLIC_TRUSTEDFORM_ENABLED
RUN npx prisma generate && npm run build

# ---- Prisma CLI only (same version as the app), used to apply migrations at startup
FROM base AS migrator
COPY package-lock.json /tmp/
RUN --mount=type=cache,target=/root/.npm \
  PRISMA_VERSION="$(node -p "require('/tmp/package-lock.json').packages['node_modules/prisma'].version")" \
  && npm install --prefix /opt/prisma --no-audit --no-fund --omit=dev "prisma@${PRISMA_VERSION}"

# ---- Runtime
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=migrator /opt/prisma /opt/prisma
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder --chown=node:node /app/prisma/migrations ./prisma/migrations
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
