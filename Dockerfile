# Use Node.js LTS version
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install system dependencies for sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port (default is 3005, can be overridden with PORT env var)
EXPOSE 3005

# Health check - checks /health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); const port = process.env.PORT || 3005; http.get(`http://localhost:${port}/health`, (r) => {let data=''; r.on('data', d=>data+=d); r.on('end', ()=>{process.exit(r.statusCode===200?0:1)});}).on('error', ()=>{process.exit(1)});"

# Start the application
CMD ["npm", "start"]
