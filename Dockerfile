FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies (including dev for build)
COPY package.json tsconfig.json ./
COPY src ./src

RUN npm ci && npm run build

# Production image
FROM node:18-alpine
WORKDIR /app

# Copy only production dependencies and built files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Expose the port defined in env (default 3000)
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
