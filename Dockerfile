# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM dependencies AS builder
ARG DATABASE_URL=file:/tmp/mandyal-build.db
ENV DATABASE_URL=${DATABASE_URL}
ENV NODE_ENV=production
ENV NEXT_OUTPUT_MODE=standalone
COPY . .
RUN npm run db:generate
RUN npm run build -- --webpack

# This larger target is intentionally separate from the web runtime. It is used
# only for the one-shot, pre-start migration task in the portable preview.
FROM dependencies AS operations
ENV NODE_ENV=production
COPY . .
RUN npm run db:generate \
  && mkdir -p /data \
  && chown -R node:node /data
USER node
CMD ["npm", "run", "db:deploy"]

# Scheduled jobs reuse the same generated clients and source revision as the
# migration task. The default command performs one bounded delivery pass; a
# production scheduler owns cadence, retry, concurrency, and dead-letter policy.
FROM operations AS worker
CMD ["npm", "run", "worker:notifications"]

FROM base AS runner
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /data \
  && chown -R nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/v1/health').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
