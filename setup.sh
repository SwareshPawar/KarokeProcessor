#!/bin/bash

# Karaoke Processor Setup Script
# This script will help you set up the development environment

echo "🎵 Karaoke Processor Setup"
echo "========================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ $NODE_VERSION -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg is not installed. Audio processing will not work without it."
    echo "   Install FFmpeg:"
    echo "   - Ubuntu/Debian: sudo apt install ffmpeg"
    echo "   - macOS: brew install ffmpeg"
    echo "   - Windows: Download from https://ffmpeg.org/download.html"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ FFmpeg $(ffmpeg -version | head -n1 | cut -d' ' -f3) detected"
fi

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
if npm install; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
if npm install; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

# Create environment files
echo ""
echo "🔧 Setting up environment files..."
cd ..

# Backend environment
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from template"
    echo "   Please edit backend/.env with your configuration"
else
    echo "⚠️  backend/.env already exists"
fi

# Frontend environment
if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env from template"
else
    echo "⚠️  frontend/.env already exists"
fi

# Create uploads directory
mkdir -p backend/uploads
echo "✅ Created uploads directory"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit backend/.env with your Google Drive API credentials (optional)"
echo "2. Edit frontend/.env if needed"
echo "3. Start the backend server:"
echo "   cd backend && npm run dev"
echo "4. In a new terminal, start the frontend:"
echo "   cd frontend && npm start"
echo "5. Open http://localhost:3000 in your browser"
echo ""
echo "📖 For detailed setup instructions, see README.md"
echo ""
echo "🔐 Google Drive Integration Setup:"
echo "1. Go to https://console.cloud.google.com/"
echo "2. Create a new project or select existing"
echo "3. Enable Google Drive API"
echo "4. Create OAuth 2.0 credentials"
echo "5. Add http://localhost:3001/api/google-drive/auth-callback to redirect URIs"
echo "6. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env"