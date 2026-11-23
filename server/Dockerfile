FROM node:22-alpine

WORKDIR /app

# CopiOnly dependencies first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 5111

# Set environment variables
ENV PORT=5111
ENV NODE_ENV=production

# Start the application
CMD ["node", "index.js"]
