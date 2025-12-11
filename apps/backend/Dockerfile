# Stage 1: Build stage (frontend + backend)
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy workspace packages
COPY packages ./packages
COPY apps/backend ./apps/backend
COPY apps/frontend ./apps/frontend

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Build shared package first
RUN npm run build:shared

# Build backend
RUN npm run build --workspace=@algosheet/backend

# Build frontend (production mode)
RUN npm run build --workspace=@algosheet/frontend

# Stage 2: Production stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache wget ca-certificates

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy built backend artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

# Copy built frontend to backend public folder (served by Fastify)
COPY --from=builder /app/apps/frontend/dist ./apps/backend/public

# Install ONLY production dependencies
ENV NODE_ENV=production
RUN npm ci --omit=dev --ignore-scripts --workspace=@algosheet/backend

# Expose port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/health || exit 1

# Start the server
CMD ["node", "apps/backend/dist/index.js"]
