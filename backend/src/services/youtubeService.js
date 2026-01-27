const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

class YouTubeService {
  constructor() {
    // YouTube URL patterns
    this.urlPatterns = [
      /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
      /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/,
      /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
      /^https?:\/\/(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]+)/
    ];
  }

  /**
   * Extract video ID from YouTube URL
   * @param {string} url - YouTube URL
   * @returns {string|null} - Video ID or null if invalid
   */
  extractVideoId(url) {
    for (const pattern of this.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Validate YouTube URL
   * @param {string} url - YouTube URL to validate
   * @returns {boolean} - Whether URL is valid
   */
  isValidYouTubeUrl(url) {
    return this.extractVideoId(url) !== null;
  }

  /**
   * Get video information
   * @param {string} url - YouTube URL
   * @returns {Promise<Object>} - Video information
   */
  async getVideoInfo(url) {
    try {
      if (!this.isValidYouTubeUrl(url)) {
        throw new Error('Invalid YouTube URL');
      }

      const videoId = this.extractVideoId(url);
      const info = await ytdl.getInfo(videoId);

      return {
        videoId: videoId,
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        lengthSeconds: parseInt(info.videoDetails.lengthSeconds),
        description: info.videoDetails.description,
        thumbnails: info.videoDetails.thumbnails,
        viewCount: parseInt(info.videoDetails.viewCount),
        uploadDate: info.videoDetails.uploadDate,
        isLive: info.videoDetails.isLiveContent,
        category: info.videoDetails.category,
        keywords: info.videoDetails.keywords || []
      };
    } catch (error) {
      throw new Error(`Failed to get video info: ${error.message}`);
    }
  }

  /**
   * Download audio from YouTube video
   * @param {string} url - YouTube URL
   * @param {string} outputPath - Directory to save the audio file
   * @param {Object} options - Download options
   * @returns {Promise<string>} - Path to downloaded audio file
   */
  async downloadAudio(url, outputPath, options = {}) {
    try {
      if (!this.isValidYouTubeUrl(url)) {
        throw new Error('Invalid YouTube URL');
      }

      const videoId = this.extractVideoId(url);
      const info = await ytdl.getInfo(videoId);
      
      // Sanitize filename
      const title = this.sanitizeFilename(info.videoDetails.title);
      const filename = `${title}_${videoId}.mp3`;
      const fullPath = path.join(outputPath, filename);

      const downloadOptions = {
        quality: options.quality || 'highestaudio',
        filter: 'audioonly',
        format: 'mp3'
      };

      return new Promise((resolve, reject) => {
        const stream = ytdl(url, downloadOptions);
        const writeStream = fs.createWriteStream(fullPath);

        stream.pipe(writeStream);

        let downloadedBytes = 0;
        stream.on('progress', (chunkLength, downloaded, total) => {
          downloadedBytes = downloaded;
          const percent = ((downloaded / total) * 100).toFixed(2);
          console.log(`Download progress: ${percent}% (${downloaded}/${total} bytes)`);
        });

        stream.on('error', (error) => {
          console.error('Download stream error:', error);
          reject(new Error(`Download failed: ${error.message}`));
        });

        writeStream.on('finish', () => {
          console.log(`Audio downloaded successfully: ${filename}`);
          resolve(fullPath);
        });

        writeStream.on('error', (error) => {
          console.error('Write stream error:', error);
          reject(new Error(`File write failed: ${error.message}`));
        });

        // Set timeout for long downloads
        const timeout = options.timeout || 300000; // 5 minutes default
        setTimeout(() => {
          stream.destroy();
          writeStream.destroy();
          reject(new Error('Download timeout'));
        }, timeout);
      });
    } catch (error) {
      throw new Error(`Audio download failed: ${error.message}`);
    }
  }

  /**
   * Get available audio formats for a video
   * @param {string} url - YouTube URL
   * @returns {Promise<Array>} - Available audio formats
   */
  async getAudioFormats(url) {
    try {
      if (!this.isValidYouTubeUrl(url)) {
        throw new Error('Invalid YouTube URL');
      }

      const videoId = this.extractVideoId(url);
      const info = await ytdl.getInfo(videoId);

      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      
      return audioFormats.map(format => ({
        itag: format.itag,
        mimeType: format.mimeType,
        bitrate: format.bitrate || format.audioBitrate,
        sampleRate: format.audioSampleRate,
        channels: format.audioChannels,
        codec: format.audioCodec,
        container: format.container,
        contentLength: format.contentLength,
        quality: format.audioQuality,
        approxDurationMs: format.approxDurationMs
      }));
    } catch (error) {
      throw new Error(`Failed to get audio formats: ${error.message}`);
    }
  }

  /**
   * Check if video is downloadable
   * @param {string} url - YouTube URL
   * @returns {Promise<boolean>} - Whether video can be downloaded
   */
  async isDownloadable(url) {
    try {
      if (!this.isValidYouTubeUrl(url)) {
        return false;
      }

      const videoId = this.extractVideoId(url);
      const info = await ytdl.getInfo(videoId);

      // Check for various restrictions
      const details = info.videoDetails;
      
      if (details.isLiveContent) {
        return false; // Live streams not supported
      }

      if (details.isPrivate) {
        return false; // Private videos not accessible
      }

      // Check if audio formats are available
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      return audioFormats.length > 0;
    } catch (error) {
      console.error('Error checking downloadability:', error.message);
      return false;
    }
  }

  /**
   * Get video duration in seconds
   * @param {string} url - YouTube URL
   * @returns {Promise<number>} - Duration in seconds
   */
  async getDuration(url) {
    try {
      const info = await this.getVideoInfo(url);
      return info.lengthSeconds;
    } catch (error) {
      throw new Error(`Failed to get duration: ${error.message}`);
    }
  }

  /**
   * Search YouTube for videos (requires YouTube Data API)
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results to return
   * @returns {Promise<Array>} - Search results
   */
  async searchVideos(query, maxResults = 10) {
    // Note: This requires YouTube Data API key
    // For now, return placeholder
    throw new Error('YouTube search requires YouTube Data API implementation');
  }

  /**
   * Sanitize filename for file system
   * @param {string} filename - Original filename
   * @returns {string} - Sanitized filename
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .slice(0, 100); // Limit length
  }

  /**
   * Format duration from seconds to human readable
   * @param {number} seconds - Duration in seconds
   * @returns {string} - Formatted duration (HH:MM:SS)
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Get video thumbnail URL
   * @param {string} videoId - YouTube video ID
   * @param {string} quality - Thumbnail quality ('default', 'medium', 'high', 'maxres')
   * @returns {string} - Thumbnail URL
   */
  getThumbnailUrl(videoId, quality = 'high') {
    const qualityMap = {
      'default': 'default',
      'medium': 'mqdefault',
      'high': 'hqdefault',
      'maxres': 'maxresdefault'
    };

    const thumbnailQuality = qualityMap[quality] || 'hqdefault';
    return `https://img.youtube.com/vi/${videoId}/${thumbnailQuality}.jpg`;
  }
}

module.exports = YouTubeService;