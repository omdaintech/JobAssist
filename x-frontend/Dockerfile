# Unified Frontend Dockerfile for both Main and Admin frontends
# Supports both development and production builds via build args

ARG NODE_VERSION=22
ARG BUILD_TARGET=development

# Development stage
FROM node:${NODE_VERSION}-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy source code
COPY . .

# Default port (can be overridden)
EXPOSE 80

# Development command
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Production build stage
FROM node:${NODE_VERSION}-alpine AS builder

# Accept build arguments for environment variables
ARG VITE_FLAGSMITH_ENVIRONMENT_ID

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies with npm cache mount
# This caches node_modules downloads WITHOUT increasing image size
# Using npm install instead of npm ci to handle lock file inconsistencies
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund --prefer-offline

# Copy source code
COPY . .

# Build with production optimizations and cache for Vite
# Pass environment variables to Vite build
ENV NODE_ENV=production
ENV VITE_FLAGSMITH_ENVIRONMENT_ID=${VITE_FLAGSMITH_ENVIRONMENT_ID}
RUN --mount=type=cache,target=/app/node_modules/.vite \
    npm run build -- --mode production

# Production runtime stage
FROM nginx:1.27-alpine AS production

WORKDIR /usr/share/nginx/html

# Copy built assets from builder stage
COPY --from=builder /app/dist .

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --spider -q http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
