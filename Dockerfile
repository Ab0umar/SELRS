# Production image for SELRS application
# Build steps: pnpm run build → docker build → docker compose up

FROM node:22-alpine

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy pre-built dist and package.json
COPY package.json pnpm-lock.yaml ./
COPY dist/ ./dist/

# Install only production dependencies (ignore postinstall which patches Android deps)
RUN corepack enable pnpm && \
    pnpm install --prod --ignore-scripts

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

EXPOSE 4000

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

CMD ["node", "dist/index.js"]
