import axios from 'axios';

// Platform-specific API URL configuration with auto-detection
const getApiBaseUrl = () => {
  // If explicitly set, use that
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Auto-detect platform based on environment variables and hostname
  if (process.env.REACT_APP_VERCEL || window.location.hostname.includes('vercel.app')) {
    return '/api'; // Vercel uses serverless functions at /api
  }
  
  if (process.env.REACT_APP_RENDER || window.location.hostname.includes('onrender.com')) {
    return 'https://karokeprocessor.onrender.com/api';
  }
  
  // Local development
  return 'http://localhost:3002/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 300000, // 5 minutes for large file operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  get baseURL() {
    return this.client.defaults.baseURL;
  }

  // Audio API methods
  async uploadAudio(file, onProgress) {
    const formData = new FormData();
    formData.append('audio', file);

    return this.client.post('/audio/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress?.(percentCompleted);
      },
    });
  }

  async transposeAudio(filename, semitones, originalKey = null, mode = null) {
    return this.client.post('/audio/transpose', {
      filename,
      semitones,
      originalKey,
      mode,
    });
  }

  async analyzeAudio(filename) {
    return this.client.post('/audio/analyze', { filename });
  }

  async downloadAudio(filename) {
    return this.client.get(`/audio/download/${filename}`, {
      responseType: 'blob',
    });
  }

  async deleteAudio(filename) {
    return this.client.delete(`/audio/${filename}`);
  }

  async listAudioFiles() {
    return this.client.get('/audio/files');
  }

  async convertToMp3(filename) {
    return this.client.post('/audio/convert', { filename });
  }

  // Google Drive API methods
  async getGoogleDriveAuthUrl() {
    return this.client.get('/google-drive/auth-url');
  }

  async handleGoogleAuthCallback(code) {
    return this.client.post('/google-drive/auth-callback', { code });
  }

  async setGoogleDriveTokens(tokens) {
    return this.client.post('/google-drive/set-tokens', { tokens });
  }

  async listGoogleDriveFiles(folderId = null) {
    const params = folderId ? { folderId } : {};
    return this.client.get('/google-drive/files', { params });
  }

  async getGoogleDriveFileInfo(fileId) {
    return this.client.get(`/google-drive/file-info/${fileId}`);
  }

  async downloadFromGoogleDrive(fileId) {
    return this.client.post('/google-drive/download', { fileId });
  }

  async searchGoogleDriveFiles(searchTerm) {
    return this.client.get('/google-drive/search', {
      params: { q: searchTerm },
    });
  }

  async getGoogleDriveSupportedFormats() {
    return this.client.get('/google-drive/supported-formats');
  }

  async getGoogleDriveStatus() {
    return this.client.get('/google-drive/status');
  }

  // YouTube API methods
  async getYouTubeVideoInfo(url) {
    return this.client.post('/youtube/video-info', { url });
  }

  async downloadYouTubeAudio(url, quality = 'highestaudio') {
    return this.client.post('/youtube/download-audio', { url, quality });
  }

  async getYouTubeAudioFormats(url) {
    return this.client.post('/youtube/audio-formats', { url });
  }

  async validateYouTubeUrl(url) {
    return this.client.post('/youtube/validate-url', { url });
  }

  async extractYouTubeVideoId(url) {
    return this.client.get(`/youtube/extract-video-id/${encodeURIComponent(url)}`);
  }

  async getYouTubeThumbnail(videoId, quality = 'high') {
    return this.client.get(`/youtube/thumbnail/${videoId}/${quality}`);
  }

  async getYouTubeSupportedUrls() {
    return this.client.get('/youtube/supported-urls');
  }

  // Utility methods
  async healthCheck() {
    return this.client.get('/health');
  }

  // Error handling helper
  handleApiError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      const message = data?.error || data?.message || 'Server error occurred';
      
      switch (status) {
        case 400:
          return { type: 'validation', message };
        case 401:
          return { type: 'auth', message, requiresAuth: data?.requiresAuth };
        case 404:
          return { type: 'notfound', message };
        case 413:
          return { type: 'filesize', message };
        case 408:
          return { type: 'timeout', message };
        case 429:
          return { type: 'ratelimit', message };
        default:
          return { type: 'server', message };
      }
    } else if (error.request) {
      // Request was made but no response received
      return { 
        type: 'network', 
        message: 'Network error - please check your connection' 
      };
    } else {
      // Something else happened
      return { 
        type: 'client', 
        message: error.message || 'An unexpected error occurred' 
      };
    }
  }
}

const apiService = new ApiService();
export default apiService;