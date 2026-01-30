const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const audioRoutes = require('./routes/audio');
const googleDriveRoutes = require('./routes/googleDrive');
const youtubeRoutes = require('./routes/youtube');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Range',
    'Accept-Ranges',
    'Content-Range',
    'Content-Length'
  ],
  exposedHeaders: [
    'Accept-Ranges',
    'Content-Range',
    'Content-Length',
    'Content-Type'
  ]
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve React build files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
}

// Routes
app.use('/api/audio', audioRoutes);
app.use('/api/google-drive', googleDriveRoutes);
app.use('/api/youtube', youtubeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: 'The uploaded file exceeds the maximum allowed size of 50MB'
    });
  }
  
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler - Serve React app for all non-API routes in production
app.use('*', (req, res) => {
  if (process.env.NODE_ENV === 'production' && !req.originalUrl.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  } else {
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

app.listen(PORT, () => {
  console.log(`🎵 Karaoke Processor Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});