# Stage 1: Install production dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production image
FROM node:18-alpine AS runner
LABEL maintainer="VoterPath Team <voterpath@example.com>"
LABEL description="VoterPath — AI-powered election assistant using Google Gemini"

# Non-root user for security (CIS Docker Benchmark 4.1)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S voterpath -u 1001 -G nodejs

WORKDIR /app

COPY --from=deps --chown=voterpath:nodejs /app/node_modules ./node_modules
COPY --chown=voterpath:nodejs package.json ./
COPY --chown=voterpath:nodejs server.js ./
COPY --chown=voterpath:nodejs public/ ./public/

ENV NODE_ENV=production
ENV PORT=8080

# Read-only filesystem prevents runtime tampering (OWASP A05)
RUN chmod -R a-w /app && chmod u+w /app

USER voterpath

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "server.js"]
