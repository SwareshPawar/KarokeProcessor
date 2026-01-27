const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.auth = null;
  }

  /**
   * Initialize Google Drive API with service account credentials
   */
  async initialize() {
    try {
      // Load service account credentials
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
      
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Google Service Account credentials are not properly configured');
      }

      // Create JWT auth
      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/drive.readonly']
      );

      // Initialize Drive API
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      console.log('Google Drive API initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error.message);
      throw new Error('Google Drive API initialization failed');
    }
  }

  /**
   * Get OAuth2 URL for user authentication
   * @returns {string} - OAuth2 authorization URL
   */
  getAuthUrl() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true
    });

    return url;
  }

  /**
   * Exchange authorization code for access tokens
   * @param {string} code - Authorization code from OAuth2 callback
   * @returns {Object} - Token information
   */
  async getTokensFromCode(code) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      // Initialize Drive API with user credentials
      this.auth = oauth2Client;
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      
      return tokens;
    } catch (error) {
      throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }
  }

  /**
   * Set user access tokens
   * @param {Object} tokens - Access tokens from OAuth2
   */
  setTokens(tokens) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials(tokens);
    this.auth = oauth2Client;
    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  /**
   * List audio files from user's Google Drive
   * @param {string} folderId - Optional folder ID to search in
   * @returns {Array} - List of audio files
   */
  async listAudioFiles(folderId = null) {
    if (!this.drive) {
      throw new Error('Google Drive API not initialized');
    }

    try {
      let query = "mimeType contains 'audio/' and trashed = false";
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'nextPageToken, files(id, name, size, mimeType, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc',
        pageSize: 50
      });

      return response.data.files.map(file => ({
        id: file.id,
        name: file.name,
        size: parseInt(file.size) || 0,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        downloadable: this.isAudioFileSupported(file.mimeType)
      }));
    } catch (error) {
      throw new Error(`Failed to list audio files: ${error.message}`);
    }
  }

  /**
   * Download an audio file from Google Drive
   * @param {string} fileId - Google Drive file ID
   * @param {string} downloadPath - Local path to save the file
   * @returns {Promise<string>} - Path to downloaded file
   */
  async downloadFile(fileId, downloadPath) {
    if (!this.drive) {
      throw new Error('Google Drive API not initialized');
    }

    try {
      // Get file metadata first
      const metadata = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size'
      });

      const fileName = metadata.data.name;
      const mimeType = metadata.data.mimeType;

      if (!this.isAudioFileSupported(mimeType)) {
        throw new Error(`Unsupported audio format: ${mimeType}`);
      }

      // Download file
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'stream' });

      const fullPath = path.join(downloadPath, fileName);
      const writer = require('fs').createWriteStream(fullPath);

      return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        
        writer.on('finish', () => {
          console.log(`Downloaded file: ${fileName}`);
          resolve(fullPath);
        });
        
        writer.on('error', (error) => {
          reject(new Error(`Download failed: ${error.message}`));
        });
      });
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Get file information from Google Drive
   * @param {string} fileId - Google Drive file ID
   * @returns {Object} - File information
   */
  async getFileInfo(fileId) {
    if (!this.drive) {
      throw new Error('Google Drive API not initialized');
    }

    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, modifiedTime, createdTime, webViewLink, parents'
      });

      return {
        id: response.data.id,
        name: response.data.name,
        mimeType: response.data.mimeType,
        size: parseInt(response.data.size) || 0,
        modifiedTime: response.data.modifiedTime,
        createdTime: response.data.createdTime,
        webViewLink: response.data.webViewLink,
        downloadable: this.isAudioFileSupported(response.data.mimeType)
      };
    } catch (error) {
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  /**
   * Search for files by name
   * @param {string} searchTerm - Term to search for
   * @returns {Array} - Search results
   */
  async searchFiles(searchTerm) {
    if (!this.drive) {
      throw new Error('Google Drive API not initialized');
    }

    try {
      const query = `name contains '${searchTerm}' and mimeType contains 'audio/' and trashed = false`;
      
      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, size, mimeType, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc',
        pageSize: 20
      });

      return response.data.files.map(file => ({
        id: file.id,
        name: file.name,
        size: parseInt(file.size) || 0,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
        downloadable: this.isAudioFileSupported(file.mimeType)
      }));
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Check if audio file format is supported
   * @param {string} mimeType - MIME type of the file
   * @returns {boolean} - Whether the format is supported
   */
  isAudioFileSupported(mimeType) {
    const supportedTypes = [
      'audio/mpeg',      // MP3
      'audio/mp3',       // MP3
      'audio/wav',       // WAV
      'audio/x-wav',     // WAV
      'audio/aac',       // AAC
      'audio/mp4',       // M4A
      'audio/x-m4a',     // M4A
      'audio/ogg',       // OGG
      'audio/flac',      // FLAC
      'audio/x-flac'     // FLAC
    ];

    return supportedTypes.includes(mimeType);
  }

  /**
   * Get supported audio formats
   * @returns {Array} - List of supported MIME types
   */
  getSupportedFormats() {
    return [
      { mimeType: 'audio/mpeg', extension: 'mp3', description: 'MP3 Audio' },
      { mimeType: 'audio/wav', extension: 'wav', description: 'WAV Audio' },
      { mimeType: 'audio/aac', extension: 'aac', description: 'AAC Audio' },
      { mimeType: 'audio/mp4', extension: 'm4a', description: 'M4A Audio' },
      { mimeType: 'audio/ogg', extension: 'ogg', description: 'OGG Audio' },
      { mimeType: 'audio/flac', extension: 'flac', description: 'FLAC Audio' }
    ];
  }
}

module.exports = GoogleDriveService;