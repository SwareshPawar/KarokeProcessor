const express = require('express');
const YouTubeService = require('../services/youtubeService');
const path = require('path');

const router = express.Router();
const youtubeService = new YouTubeService();

/**
 * POST /api/youtube/video-info
 * Get information about a YouTube video
 */
router.post('/video-info', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    if (!youtubeService.isValidYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL format' });
    }

    const videoInfo = await youtubeService.getVideoInfo(url);
    const isDownloadable = await youtubeService.isDownloadable(url);

    res.json({
      ...videoInfo,
      isDownloadable: isDownloadable,
      formattedDuration: youtubeService.formatDuration(videoInfo.lengthSeconds),
      thumbnailUrl: youtubeService.getThumbnailUrl(videoInfo.videoId, 'high')
    });
  } catch (error) {
    console.error('Video info error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/youtube/download-audio
 * Download audio from a YouTube video
 */
router.post('/download-audio', async (req, res) => {
  try {
    const { url, quality = 'highestaudio' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    if (!youtubeService.isValidYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL format' });
    }

    // Check if video is downloadable
    const isDownloadable = await youtubeService.isDownloadable(url);
    if (!isDownloadable) {
      return res.status(400).json({ 
        error: 'Video cannot be downloaded (may be live, private, or restricted)' 
      });
    }

    const outputPath = path.join(__dirname, '../../uploads');
    const downloadOptions = {
      quality: quality,
      timeout: 300000 // 5 minutes
    };

    // Start download
    const audioPath = await youtubeService.downloadAudio(url, outputPath, downloadOptions);
    const filename = path.basename(audioPath);
    const videoInfo = await youtubeService.getVideoInfo(url);

    res.json({
      message: 'Audio downloaded successfully',
      filename: filename,
      path: audioPath,
      videoInfo: {
        title: videoInfo.title,
        author: videoInfo.author,
        duration: videoInfo.lengthSeconds,
        formattedDuration: youtubeService.formatDuration(videoInfo.lengthSeconds),
        videoId: videoInfo.videoId
      },
      downloadUrl: `/api/audio/download/${filename}`
    });
  } catch (error) {
    console.error('Download audio error:', error);
    
    if (error.message.includes('Video unavailable')) {
      res.status(404).json({ error: 'Video not found or unavailable' });
    } else if (error.message.includes('timeout')) {
      res.status(408).json({ error: 'Download timed out - video may be too long' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * POST /api/youtube/audio-formats
 * Get available audio formats for a YouTube video
 */
router.post('/audio-formats', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    if (!youtubeService.isValidYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL format' });
    }

    const audioFormats = await youtubeService.getAudioFormats(url);
    
    res.json({
      url: url,
      videoId: youtubeService.extractVideoId(url),
      audioFormats: audioFormats,
      count: audioFormats.length
    });
  } catch (error) {
    console.error('Audio formats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/youtube/validate-url
 * Validate a YouTube URL
 */
router.post('/validate-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const isValid = youtubeService.isValidYouTubeUrl(url);
    
    if (!isValid) {
      return res.json({
        valid: false,
        message: 'Invalid YouTube URL format'
      });
    }

    const videoId = youtubeService.extractVideoId(url);
    const isDownloadable = await youtubeService.isDownloadable(url);

    let videoInfo = null;
    try {
      videoInfo = await youtubeService.getVideoInfo(url);
    } catch (error) {
      return res.json({
        valid: true,
        accessible: false,
        downloadable: false,
        videoId: videoId,
        message: 'Video exists but is not accessible (may be private or restricted)'
      });
    }

    res.json({
      valid: true,
      accessible: true,
      downloadable: isDownloadable,
      videoId: videoId,
      title: videoInfo.title,
      duration: videoInfo.lengthSeconds,
      formattedDuration: youtubeService.formatDuration(videoInfo.lengthSeconds),
      thumbnailUrl: youtubeService.getThumbnailUrl(videoId, 'medium'),
      message: isDownloadable ? 
        'Video is ready for download' : 
        'Video cannot be downloaded (may be live or restricted)'
    });
  } catch (error) {
    console.error('Validate URL error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/youtube/extract-video-id/:url
 * Extract video ID from YouTube URL
 */
router.get('/extract-video-id/:url', (req, res) => {
  try {
    const url = decodeURIComponent(req.params.url);
    const videoId = youtubeService.extractVideoId(url);

    if (!videoId) {
      return res.status(400).json({ 
        error: 'Invalid YouTube URL',
        url: url
      });
    }

    res.json({
      url: url,
      videoId: videoId,
      thumbnailUrl: youtubeService.getThumbnailUrl(videoId, 'medium')
    });
  } catch (error) {
    console.error('Extract video ID error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/youtube/thumbnail/:videoId/:quality?
 * Get thumbnail URL for a video
 */
router.get('/thumbnail/:videoId/:quality?', (req, res) => {
  try {
    const { videoId, quality = 'high' } = req.params;
    
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    const thumbnailUrl = youtubeService.getThumbnailUrl(videoId, quality);
    
    res.json({
      videoId: videoId,
      quality: quality,
      thumbnailUrl: thumbnailUrl
    });
  } catch (error) {
    console.error('Thumbnail error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/youtube/supported-urls
 * Get list of supported YouTube URL formats
 */
router.get('/supported-urls', (req, res) => {
  try {
    const supportedFormats = [
      {
        format: 'Watch URL',
        example: 'https://www.youtube.com/watch?v=VIDEO_ID',
        description: 'Standard YouTube video URL'
      },
      {
        format: 'Short URL',
        example: 'https://youtu.be/VIDEO_ID',
        description: 'Shortened YouTube URL'
      },
      {
        format: 'Embed URL',
        example: 'https://www.youtube.com/embed/VIDEO_ID',
        description: 'YouTube embed URL'
      },
      {
        format: 'Direct Video URL',
        example: 'https://www.youtube.com/v/VIDEO_ID',
        description: 'Direct video URL format'
      }
    ];

    res.json({
      supportedFormats: supportedFormats,
      note: 'All formats accept both HTTP and HTTPS protocols'
    });
  } catch (error) {
    console.error('Supported URLs error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/youtube/download-progress/:videoId
 * Check download progress (placeholder for future WebSocket implementation)
 */
router.get('/download-progress/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    
    // This is a placeholder - in a real implementation, you might use WebSockets
    // or server-sent events to track download progress
    res.json({
      videoId: videoId,
      status: 'not_implemented',
      message: 'Progress tracking not yet implemented',
      suggestion: 'Use WebSocket connection for real-time progress updates'
    });
  } catch (error) {
    console.error('Download progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;