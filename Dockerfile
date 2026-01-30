# Use Node.js 18 with Ubuntu base for FFmpeg support
FROM node:18-bullseye

# Install FFmpeg and other system dependencies
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install backend dependencies
RUN cd backend && npm install --production

# Install frontend dependencies and build
RUN cd frontend && npm install && npm run build

# Copy application code
COPY backend/ ./backend/
COPY frontend/build/ ./frontend/build/

# Create uploads directory
RUN mkdir -p backend/uploads

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Set working directory to backend
WORKDIR /app/backend

# Start the server
CMD ["npm", "start"]