import React, { useState, useCallback } from 'react';
import { FaYoutube, FaSpinner, FaDownload, FaPlay, FaInfoCircle, FaCheckCircle, FaExchangeAlt, FaMusic, FaVolumeUp } from 'react-icons/fa';
import { Range } from 'react-range';
import toast from 'react-hot-toast';
import ApiService from '../services/api';
import { getStreamUrl } from '../utils/api';

const YouTube = ({ setCurrentAudio }) => {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [downloadedAudio, setDownloadedAudio] = useState(null);
  const [analyzedAudio, setAnalyzedAudio] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [semitones, setSemitones] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [transposedAudio, setTransposedAudio] = useState(null);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingTransposed, setIsPlayingTransposed] = useState(false);
  const [originalAudioRef, setOriginalAudioRef] = useState(null);
  const [transposedAudioRef, setTransposedAudioRef] = useState(null);

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

      setDownloadedAudio(audioData);
      setCurrentAudio(audioData);
      toast.success(`Successfully downloaded audio from "${response.data.videoInfo.title}"`);
      
      // Auto-analyze the downloaded audio
      analyzeAudio(audioData);
    } catch (error) {
      const errorInfo = ApiService.handleApiError(error);
      toast.error(`Download failed: ${errorInfo.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const analyzeAudio = useCallback(async (audioData = downloadedAudio) => {
    if (!audioData?.filename) return;

    setAnalyzing(true);
    try {
      const response = await ApiService.analyzeAudio(audioData.filename);
      setAnalyzedAudio(response.data);
    } catch (error) {
      const errorInfo = ApiService.handleApiError(error);
      toast.error(`Analysis failed: ${errorInfo.message}`);
    } finally {
      setAnalyzing(false);
    }
  }, [downloadedAudio]);

  const transposeAudio = async () => {
    if (!downloadedAudio?.filename) {
      toast.error('No audio file downloaded');
      return;
    }

    if (semitones === 0) {
      toast.error('Please select a transposition amount');
      return;
    }

    setProcessing(true);
    try {
      const originalKey = analyzedAudio?.keyInfo?.key;
      const mode = analyzedAudio?.keyInfo?.mode;

      const response = await ApiService.transposeAudio(
        downloadedAudio.filename,
        semitones,
        originalKey,
        mode
      );

      setTransposedAudio({
        ...response.data,
        semitones: semitones,
        originalKey: originalKey,
        mode: mode
      });

      toast.success(`Successfully transposed by ${Math.abs(semitones)} semitones ${semitones > 0 ? 'up' : 'down'}`);
    } catch (error) {
      const errorInfo = ApiService.handleApiError(error);
      toast.error(`Transposition failed: ${errorInfo.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const toggleOriginalAudio = async () => {
    if (!originalAudioRef || !downloadedAudio?.filename) return;
    
    if (isPlayingOriginal) {
      originalAudioRef.pause();
      setIsPlayingOriginal(false);
    } else {
      try {
        if (isPlayingTransposed && transposedAudioRef) {
          transposedAudioRef.pause();
          setIsPlayingTransposed(false);
        }
        
        const audioSrc = getStreamUrl(downloadedAudio.filename);
        if (originalAudioRef.src !== audioSrc) {
          originalAudioRef.src = audioSrc;
          await originalAudioRef.load();
        }
        
        await originalAudioRef.play();
        setIsPlayingOriginal(true);
      } catch (error) {
        console.error('Error playing original audio:', error);
        toast.error('Failed to play audio');
      }
    }
  };

  const toggleTransposedAudio = async () => {
    if (!transposedAudioRef || !transposedAudio?.transposedFile) return;
    
    if (isPlayingTransposed) {
      transposedAudioRef.pause();
      setIsPlayingTransposed(false);
    } else {
      try {
        if (isPlayingOriginal && originalAudioRef) {
          originalAudioRef.pause();
          setIsPlayingOriginal(false);
        }
        
        const audioSrc = getStreamUrl(transposedAudio.transposedFile);
        if (transposedAudioRef.src !== audioSrc) {
          transposedAudioRef.src = audioSrc;
          await transposedAudioRef.load();
        }
        
        await transposedAudioRef.play();
        setIsPlayingTransposed(true);
      } catch (error) {
        console.error('Error playing transposed audio:', error);
        toast.error('Failed to play transposed audio');
      }
    }
  };

  const calculateNewKey = (originalKey, mode, semitones) => {
    if (!originalKey) return null;

    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const flatNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    let noteIndex = notes.indexOf(originalKey);
    if (noteIndex === -1) {
      noteIndex = flatNotes.indexOf(originalKey);
    }
    
    if (noteIndex === -1) return originalKey;

    const newIndex = (noteIndex + semitones + 12) % 12;
    return semitones >= 0 ? notes[newIndex] : flatNotes[newIndex];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

        {/* Downloaded Audio Player and Transposition */}
        {downloadedAudio && (
          <>
            <div className="card mt-6">
              <h2 className="text-xl font-semibold mb-4">
                <FaMusic /> Downloaded Audio
              </h2>
              
              <div className="audio-info">
                <h3 className="audio-title">
                  {downloadedAudio.originalName || downloadedAudio.videoInfo?.title}
                </h3>
                
                {analyzedAudio && (
                  <div className="audio-details">
                    <div className="audio-detail">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">
                        {formatDuration(analyzedAudio.metadata?.duration || downloadedAudio.videoInfo?.duration)}
                      </span>
                    </div>
                    <div className="audio-detail">
                      <span className="detail-label">Detected Key:</span>
                      <span className="detail-value">
                        {analyzedAudio.keyInfo?.key} {analyzedAudio.keyInfo?.mode}
                        {analyzedAudio.keyInfo?.confidence && 
                          ` (${Math.round(analyzedAudio.keyInfo.confidence * 100)}% confidence)`
                        }
                      </span>
                    </div>
                  </div>
                )}

                {analyzing && (
                  <div className="flex items-center gap-2 mt-4">
                    <FaSpinner className="spinner" />
                    <span>Analyzing audio...</span>
                  </div>
                )}

                {/* Original Audio Player */}
                <div className="audio-player-section">
                  <div className="audio-player-header">
                    <h4>Original Audio</h4>
                    <button 
                      onClick={toggleOriginalAudio}
                      className={`play-button ${isPlayingOriginal ? 'playing' : ''}`}
                      disabled={!downloadedAudio?.filename}
                    >
                      {isPlayingOriginal ? <FaVolumeUp /> : <FaMusic />}
                      {isPlayingOriginal ? 'Playing...' : 'Play Original'}
                    </button>
                  </div>
                  <audio
                    ref={setOriginalAudioRef}
                    onEnded={() => setIsPlayingOriginal(false)}
                    onPause={() => setIsPlayingOriginal(false)}
                    onPlay={() => setIsPlayingOriginal(true)}
                    controls
                    className="audio-controls"
                  />
                </div>
              </div>
            </div>

            {/* Transposition Controls */}
            <div className="transpose-controls">
              <h2 className="transpose-title">
                <FaExchangeAlt /> Transposition Settings
              </h2>
              
              <div className="semitone-slider">
                <label className="form-label text-center">
                  Semitones: {semitones > 0 ? '+' : ''}{semitones}
                </label>
                
                <div className="slider-container">
                  <Range
                    step={1}
                    min={-12}
                    max={12}
                    values={[semitones]}
                    onChange={(values) => setSemitones(values[0])}
                    renderTrack={({ props, children }) => {
                      const { key, ...otherProps } = props;
                      return (
                        <div
                          key={key || 'range-track'}
                          {...otherProps}
                          style={{
                            ...otherProps.style,
                            height: '6px',
                            width: '100%',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '3px'
                          }}
                        >
                          {Array.isArray(children) 
                            ? children.map((child, index) => 
                                React.cloneElement(child, { key: `track-child-${index}` })
                              )
                            : children
                          }
                        </div>
                      );
                    }}
                    renderThumb={({ props, index }) => {
                      const { key, ...otherProps } = props;
                      return (
                        <div
                          key={key || `thumb-${index || 0}`}
                          {...otherProps}
                          style={{
                            ...otherProps.style,
                            height: '20px',
                            width: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#4f46e5',
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        />
                      );
                    }}
                  />
                  
                  <div className="slider-labels">
                    <span>-12 (Octave Down)</span>
                    <span>0 (Original)</span>
                    <span>+12 (Octave Up)</span>
                  </div>
                </div>
              </div>

              {/* Key Display */}
              {analyzedAudio?.keyInfo && (
                <div className="current-key-display">
                  <div className="key-info">
                    <div className="original-key">
                      <div className="key-label">Original Key</div>
                      <div className="key-value">{analyzedAudio.keyInfo.key}</div>
                      <div className="key-mode">{analyzedAudio.keyInfo.mode}</div>
                    </div>
                    
                    <div className="key-arrow">→</div>
                    
                    <div className="new-key">
                      <div className="key-label">New Key</div>
                      <div className="key-value">
                        {calculateNewKey(analyzedAudio.keyInfo.key, analyzedAudio.keyInfo.mode, semitones)}
                      </div>
                      <div className="key-mode">{analyzedAudio.keyInfo.mode}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="transpose-buttons">
                <button 
                  onClick={transposeAudio}
                  disabled={processing || semitones === 0}
                  className="btn btn-primary"
                >
                  {processing ? (
                    <><FaSpinner className="spinner" /> Processing...</>
                  ) : (
                    <><FaExchangeAlt /> Transpose Audio</>
                  )}
                </button>
              </div>
            </div>

            {/* Transposed Audio Player */}
            {transposedAudio && (
              <div className="card mt-6">
                <h2 className="text-xl font-semibold mb-4">
                  <FaExchangeAlt /> Transposed Audio ({transposedAudio.semitones > 0 ? '+' : ''}{transposedAudio.semitones} semitones)
                </h2>
                
                <div className="audio-player-section">
                  <div className="audio-player-header">
                    <h4>
                      Transposed to {calculateNewKey(transposedAudio.originalKey, transposedAudio.mode, transposedAudio.semitones)} {transposedAudio.mode}
                    </h4>
                    <button 
                      onClick={toggleTransposedAudio}
                      className={`play-button ${isPlayingTransposed ? 'playing' : ''}`}
                      disabled={!transposedAudio?.transposedFile}
                    >
                      {isPlayingTransposed ? <FaVolumeUp /> : <FaMusic />}
                      {isPlayingTransposed ? 'Playing...' : 'Play Transposed'}
                    </button>
                  </div>
                  <audio
                    ref={setTransposedAudioRef}
                    onEnded={() => setIsPlayingTransposed(false)}
                    onPause={() => setIsPlayingTransposed(false)}
                    onPlay={() => setIsPlayingTransposed(true)}
                    controls
                    className="audio-controls"
                  />
                </div>
              </div>
            )}
          </>
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