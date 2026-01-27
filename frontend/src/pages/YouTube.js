import React, { useState } from 'react';
import { FaYoutube, FaSpinner, FaDownload, FaPlay, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import ApiService from '../services/api';

const YouTube = ({ setCurrentAudio }) => {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [validating, setValidating] = useState(false);

  const validateUrl = async () => {
    if (!url.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setValidating(true);
    try {
      const response = await ApiService.validateYouTubeUrl(url);
      
      if (response.data.valid && response.data.accessible) {
        setVideoInfo(response.data);
        if (!response.data.downloadable) {
          toast.warning('Video found but may not be downloadable (live stream or restricted)');
        }
      } else {
        toast.error(response.data.message || 'Invalid or inaccessible YouTube URL');
        setVideoInfo(null);
      }
    } catch (error) {
      const errorInfo = ApiService.handleApiError(error);
      toast.error(errorInfo.message);
      setVideoInfo(null);
    } finally {
      setValidating(false);
    }
  };

  const getVideoInfo = async () => {
    if (!url.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.getYouTubeVideoInfo(url);
      setVideoInfo({
        ...response.data,
        valid: true,
        accessible: true,
        downloadable: response.data.isDownloadable
      });
    } catch (error) {
      const errorInfo = ApiService.handleApiError(error);
      toast.error(errorInfo.message);
      setVideoInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadAudio = async () => {
    if (!videoInfo || !videoInfo.downloadable) {
      toast.error('This video cannot be downloaded');
      return;
    }

    setDownloading(true);
    try {
      const response = await ApiService.downloadYouTubeAudio(url);
      
      const audioData = {
        filename: response.data.filename,
        originalName: response.data.videoInfo.title,
        metadata: {
          duration: response.data.videoInfo.duration,
          title: response.data.videoInfo.title,
          author: response.data.videoInfo.author
        },
        source: 'youtube',
        videoInfo: response.data.videoInfo
      };

      setCurrentAudio(audioData);
      toast.success(`Successfully downloaded audio from "${response.data.videoInfo.title}"`);
      
    } catch (error) {
      const errorInfo = ApiService.handleApiError(error);
      
      if (errorInfo.type === 'timeout') {
        toast.error('Download timed out. The video might be too long.');
      } else if (errorInfo.type === 'notfound') {
        toast.error('Video not found or unavailable');
      } else {
        toast.error(errorInfo.message);
      }
    } finally {
      setDownloading(false);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString();
  };

  return (
    <div className="youtube-page">
      <div className="upload-section">
        <h1 className="section-title">
          <FaYoutube /> YouTube Audio Extraction
        </h1>
        <p className="text-center mb-6">
          Extract audio from any YouTube video for transposition and practice. 
          Just paste the YouTube URL below.
        </p>

        {/* URL Input */}
        <div className="card">
          <div className="youtube-input">
            <label className="form-label">YouTube URL</label>
            <div className="url-input-container">
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && getVideoInfo()}
                className="url-input"
              />
              <button 
                onClick={getVideoInfo}
                disabled={loading || !url.trim()}
                className="btn btn-primary"
              >
                {loading ? <FaSpinner className="spinner" /> : <FaInfoCircle />}
                Get Info
              </button>
            </div>
            
            <div className="flex gap-2 mt-3">
              <button 
                onClick={validateUrl}
                disabled={validating || !url.trim()}
                className="btn btn-secondary btn-sm"
              >
                {validating ? <FaSpinner className="spinner" /> : <FaCheckCircle />}
                Validate URL
              </button>
            </div>
          </div>
        </div>

        {/* Video Information */}
        {videoInfo && (
          <div className="card mt-6">
            <div className="video-info">
              <div className="flex items-start gap-4">
                {videoInfo.thumbnailUrl && (
                  <img 
                    src={videoInfo.thumbnailUrl} 
                    alt="Video thumbnail"
                    className="video-thumbnail"
                  />
                )}
                
                <div className="flex-1">
                  <h2 className="video-title">{videoInfo.title}</h2>
                  
                  <div className="video-meta">
                    <div>
                      <strong>Channel:</strong> {videoInfo.author}
                    </div>
                    <div>
                      <strong>Duration:</strong> {formatDuration(videoInfo.lengthSeconds || videoInfo.duration)}
                    </div>
                    {videoInfo.viewCount && (
                      <div>
                        <strong>Views:</strong> {formatNumber(videoInfo.viewCount)}
                      </div>
                    )}
                    <div>
                      <strong>Status:</strong> 
                      <span className={`ml-2 ${videoInfo.downloadable ? 'text-green-600' : 'text-red-600'}`}>
                        {videoInfo.downloadable ? 'Downloadable' : 'Not Downloadable'}
                      </span>
                    </div>
                    {videoInfo.uploadDate && (
                      <div>
                        <strong>Upload Date:</strong> {new Date(videoInfo.uploadDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {videoInfo.downloadable ? (
                    <div className="flex gap-4 mt-4">
                      <button 
                        onClick={downloadAudio}
                        disabled={downloading}
                        className="btn btn-primary"
                      >
                        {downloading ? (
                          <><FaSpinner className="spinner" /> Downloading Audio...</>
                        ) : (
                          <><FaDownload /> Download Audio</>
                        )}
                      </button>
                      
                      {videoInfo.webViewLink && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                        >
                          <FaPlay />
                          Watch on YouTube
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800">
                        <FaInfoCircle className="inline mr-2" />
                        This video cannot be downloaded. Possible reasons:
                      </p>
                      <ul className="text-sm text-yellow-700 mt-2 ml-6">
                        <li>• Live stream or premiere</li>
                        <li>• Private or restricted video</li>
                        <li>• Copyright protection</li>
                        <li>• Region-locked content</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {videoInfo.description && (
                <div className="mt-4">
                  <details>
                    <summary className="cursor-pointer font-medium">Description</summary>
                    <p className="mt-2 text-sm opacity-75 whitespace-pre-wrap">
                      {videoInfo.description.length > 300 
                        ? videoInfo.description.substring(0, 300) + '...'
                        : videoInfo.description
                      }
                    </p>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Supported URL Formats */}
        <div className="card mt-6">
          <h3 className="text-lg font-semibold mb-4">Supported YouTube URL Formats</h3>
          <div className="grid grid-2">
            <div>
              <h4 className="font-medium mb-2">Standard URLs:</h4>
              <ul className="space-y-1 text-sm font-mono">
                <li>• youtube.com/watch?v=VIDEO_ID</li>
                <li>• youtu.be/VIDEO_ID</li>
                <li>• youtube.com/embed/VIDEO_ID</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Notes:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Both HTTP and HTTPS supported</li>
                <li>• Works with mobile YouTube links</li>
                <li>• Live streams are not supported</li>
                <li>• Private videos require access</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Download Progress */}
        {downloading && (
          <div className="card mt-6">
            <div className="text-center">
              <FaSpinner className="spinner text-2xl mb-4" />
              <h3 className="text-lg font-semibold mb-2">Downloading Audio...</h3>
              <p className="opacity-75">
                Extracting audio from YouTube video. This may take a few minutes 
                depending on the video length.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTube;