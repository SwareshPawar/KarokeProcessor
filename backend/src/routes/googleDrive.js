const express = require('express');
const GoogleDriveService = require('../services/googleDriveService');
const path = require('path');

const router = express.Router();
const driveService = new GoogleDriveService();

/**
 * GET /api/google-drive/auth-url
 * Get Google OAuth2 authorization URL
 */
router.get('/auth-url', async (req, res) => {
  try {
    const authUrl = driveService.getAuthUrl();
    res.json({ 
      authUrl: authUrl,
      message: 'Visit this URL to authorize the application' 
    });
  } catch (error) {
    console.error('Auth URL error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/google-drive/auth-callback
 * Handle OAuth2 callback and exchange code for tokens
 */
router.post('/auth-callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const tokens = await driveService.getTokensFromCode(code);
    
    res.json({
      message: 'Authentication successful',
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date
      }
    });
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/google-drive/set-tokens
 * Set user access tokens for the session
 */
router.post('/set-tokens', async (req, res) => {
  try {
    const { tokens } = req.body;

    if (!tokens || !tokens.access_token) {
      return res.status(400).json({ error: 'Valid tokens are required' });
    }

    driveService.setTokens(tokens);
    
    res.json({ 
      message: 'Tokens set successfully',
      authenticated: true
    });
  } catch (error) {
    console.error('Set tokens error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/google-drive/files
 * List audio files from Google Drive
 */
router.get('/files', async (req, res) => {
  try {
    const { folderId } = req.query;
    const audioFiles = await driveService.listAudioFiles(folderId);
    
    res.json({
      files: audioFiles,
      count: audioFiles.length
    });
  } catch (error) {
    console.error('List files error:', error);
    
    if (error.message.includes('not initialized')) {
      res.status(401).json({ 
        error: 'Not authenticated with Google Drive',
        requiresAuth: true
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/google-drive/file-info/:fileId
 * Get information about a specific file
 */
router.get('/file-info/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileInfo = await driveService.getFileInfo(fileId);
    
    res.json(fileInfo);
  } catch (error) {
    console.error('File info error:', error);
    
    if (error.message.includes('not initialized')) {
      res.status(401).json({ 
        error: 'Not authenticated with Google Drive',
        requiresAuth: true
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * POST /api/google-drive/download
 * Download a file from Google Drive
 */
router.post('/download', async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    const downloadPath = path.join(__dirname, '../../uploads');
    const filePath = await driveService.downloadFile(fileId, downloadPath);
    const filename = path.basename(filePath);

    res.json({
      message: 'File downloaded successfully',
      filename: filename,
      path: filePath,
      downloadUrl: `/api/audio/download/${filename}`
    });
  } catch (error) {
    console.error('Download error:', error);
    
    if (error.message.includes('not initialized')) {
      res.status(401).json({ 
        error: 'Not authenticated with Google Drive',
        requiresAuth: true
      });
    } else if (error.message.includes('Unsupported audio format')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/google-drive/search
 * Search for audio files in Google Drive
 */
router.get('/search', async (req, res) => {
  try {
    const { q: searchTerm } = req.query;

    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const searchResults = await driveService.searchFiles(searchTerm);
    
    res.json({
      results: searchResults,
      count: searchResults.length,
      searchTerm: searchTerm
    });
  } catch (error) {
    console.error('Search error:', error);
    
    if (error.message.includes('not initialized')) {
      res.status(401).json({ 
        error: 'Not authenticated with Google Drive',
        requiresAuth: true
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/google-drive/supported-formats
 * Get list of supported audio formats
 */
router.get('/supported-formats', (req, res) => {
  try {
    const supportedFormats = driveService.getSupportedFormats();
    res.json({
      formats: supportedFormats,
      count: supportedFormats.length
    });
  } catch (error) {
    console.error('Supported formats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/google-drive/status
 * Check authentication status
 */
router.get('/status', (req, res) => {
  try {
    const isAuthenticated = driveService.auth !== null && driveService.drive !== null;
    
    res.json({
      authenticated: isAuthenticated,
      service: 'Google Drive API',
      message: isAuthenticated ? 
        'Ready to access Google Drive' : 
        'Not authenticated - please authorize first'
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;