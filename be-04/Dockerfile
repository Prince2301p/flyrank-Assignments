# Dockerfile for Node.js Express Application
FROM node:20-alpine AS base

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy application source code and configuration
COPY src/ ./src/
COPY init.sql ./

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]
