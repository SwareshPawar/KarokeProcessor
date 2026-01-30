// Vercel serverless function handler
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// CORS configuration
const corsOptions = {
  origin: [
    'https://karoke-processor.vercel.app',
    'https://karoke-processor-git-main-swareshs-projects.vercel.app',
    /\.vercel\.app$/,
    'http://localhost:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    platform: 'vercel',
    message: 'Karaoke Processor API is running'
  });
});

// Basic upload endpoint
app.post('/api/audio/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // For now, just return success with file info
    const response = {
      message: 'File uploaded successfully',
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      serverFilename: `${Date.now()}_${req.file.originalname}`
    };

    console.log('Upload successful:', response);
    res.json(response);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', message: error.message });
  }
});

// Basic analysis endpoint  
app.post('/api/audio/analyze', async (req, res) => {
  try {
    // Mock analysis response for now
    const response = {
      message: 'Analysis completed',
      key: 'C',
      tempo: 120,
      duration: 180,
      success: true
    };

    res.json(response);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
});

// Catch all other /api routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method 
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Export for Vercel
module.exports = app;