#!/bin/bash
# Install FFmpeg
apt-get update
apt-get install -y ffmpeg

# Build frontend
cd frontend
npm install
npm run build

# Install backend dependencies  
cd ../backend
npm install