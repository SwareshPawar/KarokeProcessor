import React, { useState, useEffect, useCallback } from 'react';
import { Range } from 'react-range';
import { FaExchangeAlt, FaMusic, FaDownload, FaSpinner, FaVolumeUp, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';
import ApiService from '../services/api';
import localStorageService from '../services/localStorageService';
import { getStreamUrl } from '../utils/api';

const Transpose = ({ currentAudio, setCurrentAudio }) => {
  const [semitones, setSemitones] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [analyzedAudio, setAnalyzedAudio] = useState(null);
  const [transposedAudio, setTransposedAudio] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingTransposed, setIsPlayingTransposed] = useState(false);
  const [originalAudioRef, setOriginalAudioRef] = useState(null);
  const [transposedAudioRef, setTransposedAudioRef] = useState(null);

  // Helper function to calculate target key
  const calculateTargetKey = (originalKey, semitones) => {
    if (!originalKey) return `${semitones > 0 ? '+' : ''}${semitones}`;
    
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const noteIndex = notes.indexOf(originalKey.replace(/m$/, ''));
    
    if (noteIndex === -1) return `${originalKey} ${semitones > 0 ? '+' : ''}${semitones}`;
    
    const targetIndex = (noteIndex + semitones + 12) % 12;
    const targetNote = notes[targetIndex];
    const isMinor = originalKey.endsWith('m');
    
    return targetNote + (isMinor ? 'm' : '');
  };

  // Function to save transposed audio to library
  const saveTransposedToLibrary = async () => {
    if (!transposedAudio?.transposedFile) {
      toast.error('No transposed audio available to save');
      return;
    }

    try {
      // Download the transposed audio blob
      const response = await ApiService.downloadAudio(transposedAudio.transposedFile);
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      
      // Calculate target key
      const originalKey = analyzedAudio?.keyInfo?.key;
      const targetKey = calculateTargetKey(originalKey, semitones);
      
      // Generate a meaningful filename
      const originalTitle = currentAudio?.title || currentAudio?.filename?.replace(/\.[^/.]+$/, '') || 'Audio';
      const newTitle = `${originalTitle} (${targetKey})`;
      const newFilename = `${newTitle.replace(/[^a-zA-Z0-9\s\-_()]/g, '')}.mp3`;
      
      // Prepare metadata
      const metadata = {
        filename: newFilename,
        title: newTitle,
        originalName: `${originalTitle}_transposed_${targetKey}`,
        source: 'transpose',
        duration: currentAudio?.duration,
        keyInfo: {
          key: targetKey,
          originalKey: originalKey,
          semitones: semitones
        }
      };

      // Save to IndexedDB
      const savedFile = await localStorageService.storeAudioFile(audioBlob, metadata);
      
      toast.success(`Saved "${newTitle}" to library!`);
      return savedFile;
    } catch (error) {
      console.error('Error saving transposed audio:', error);
      toast.error('Failed to save transposed audio to library');
    }
  };

  // Function to save transposed audio with provided data
  const saveTransposedToLibraryWithData = async (transposedData) => {
    if (!transposedData?.transposedFile) {
      console.error('No transposed audio data available to save');
      return;
    }

    try {
      // Download the transposed audio blob
      const response = await ApiService.downloadAudio(transposedData.transposedFile);
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      
      // Calculate target key
      const originalKey = analyzedAudio?.keyInfo?.key;
      const targetKey = calculateTargetKey(originalKey, transposedData.semitones);
      
      // Generate a meaningful filename
      const originalTitle = currentAudio?.title || currentAudio?.filename?.replace(/\.[^/.]+$/, '') || 'Audio';
      const newTitle = `${originalTitle} (${targetKey})`;
      const newFilename = `${newTitle.replace(/[^a-zA-Z0-9\s\-_()]/g, '')}.mp3`;
      
      // Prepare metadata
      const metadata = {
        filename: newFilename,
        title: newTitle,
        originalName: `${originalTitle}_transposed_${targetKey}`,
        source: 'transpose',
        duration: currentAudio?.duration,
        keyInfo: {
          key: targetKey,
          originalKey: originalKey,
          semitones: transposedData.semitones
        }
      };

      // Save to IndexedDB
      const savedFile = await localStorageService.storeAudioFile(audioBlob, metadata);
      
      console.log(`Auto-saved "${newTitle}" to library`);
      return savedFile;
    } catch (error) {
      console.error('Error auto-saving transposed audio:', error);
      throw error;
    }
  };

  const analyzeAudio = useCallback(async () => {
    if (!currentAudio?.filename) return;

    setAnalyzing(true);
    try {
      let serverFilename = currentAudio.filename;
      
      // Check if file exists on server, if not, upload it first
      if (currentAudio.source === 'upload' && !currentAudio.serverFilename) {
        console.log('File not on server, uploading for analysis...');
        
        // Get the file from local storage
        const audioFile = await localStorageService.getAudioFile(currentAudio.id);
        if (!audioFile || !audioFile.blob) {
          throw new Error('Audio file not found in local storage');
        }
        
        // Validate the blob is actual audio data
        if (audioFile.blob.size < 1000 || audioFile.blob.type.includes('text/html')) {
          throw new Error('Invalid audio file - corrupted or HTML content detected');
        }
        
        // Create File object from blob
        const file = new File([audioFile.blob], currentAudio.filename, {
          type: audioFile.blob.type || 'audio/mpeg'
        });
        
        console.log('Uploading file for analysis:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
        
        // Upload to server for analysis
        const uploadResponse = await ApiService.uploadAudio(file);
        serverFilename = uploadResponse.data.file.filename;
        
        console.log('File uploaded to server for analysis:', serverFilename);
      } else if (currentAudio.serverFilename) {
        serverFilename = currentAudio.serverFilename;
      }
      
      console.log('Analyzing audio with filename:', serverFilename);
      const response = await ApiService.analyzeAudio(serverFilename);
      setAnalyzedAudio(response.data);
      console.log('Analysis completed successfully');
    } catch (error) {
      console.error('Analysis error:', error);
      const errorInfo = ApiService.handleApiError(error);
      
      // More specific error messages
      if (error.message.includes('Audio file not found in local storage')) {
        toast.error('Audio file not found. Please re-upload the file.');
      } else if (error.message.includes('corrupted') || error.message.includes('HTML')) {
        toast.error('Audio file appears to be corrupted. Please re-upload.');
      } else if (errorInfo.message.includes('Audio file not found')) {
        toast.error('Analysis failed: File needs to be re-uploaded to server');
      } else {
        toast.error(`Analysis failed: ${errorInfo.message}`);
      }
    } finally {
      setAnalyzing(false);
    }
  }, [currentAudio?.filename, currentAudio?.source, currentAudio?.serverFilename, currentAudio?.id]);

  useEffect(() => {
    if (currentAudio?.filename) {
      analyzeAudio();
    }
  }, [currentAudio?.filename, analyzeAudio]);

  const transposeAudio = async () => {
    if (!currentAudio?.filename) {
      toast.error('No audio file selected');
      return;
    }

    if (semitones === 0) {
      toast.error('Please select a transposition amount');
      return;
    }

    setProcessing(true);
    try {
      let serverFilename = currentAudio.filename;
      
      // Check if file exists on server, if not, upload it first
      if (currentAudio.source === 'upload' && !currentAudio.serverFilename) {
        console.log('File not on server, uploading for processing...');
        
        // Get the file from local storage
        const audioFile = await localStorageService.getAudioFile(currentAudio.id);
        if (!audioFile || !audioFile.blob) {
          throw new Error('Audio file not found in local storage');
        }
        
        // Validate the blob is actual audio data
        if (audioFile.blob.size < 1000 || audioFile.blob.type.includes('text/html')) {
          throw new Error('Invalid audio file - corrupted or HTML content detected');
        }
        
        // Create File object from blob
        const file = new File([audioFile.blob], currentAudio.filename, {
          type: audioFile.blob.type || 'audio/mpeg'
        });
        
        console.log('Uploading file for processing:', {
          name: file.name,
          size: file.size,
          type: file.type
        });
        
        // Upload to server for processing
        const uploadResponse = await ApiService.uploadAudio(file);
        serverFilename = uploadResponse.data.file.filename;
        
        console.log('File uploaded to server for processing:', serverFilename);
      } else if (currentAudio.serverFilename) {
        serverFilename = currentAudio.serverFilename;
      }
      
      const originalKey = analyzedAudio?.keyInfo?.key;
      const mode = analyzedAudio?.keyInfo?.mode;

      const response = await ApiService.transposeAudio(
        serverFilename,
        semitones,
        originalKey,
        mode
      );

      const transposedData = {
        ...response.data,
        semitones: semitones,
        originalKey: originalKey,
        mode: mode
      };
      
      setTransposedAudio(transposedData);

      toast.success(`Successfully transposed by ${Math.abs(semitones)} semitones ${semitones > 0 ? 'up' : 'down'}`);
      
      // Auto-save to library
      try {
        await saveTransposedToLibraryWithData(transposedData);
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Don't show error toast as main transposition succeeded
      }
    } catch (error) {
      console.error('Transpose error:', error);
      const errorInfo = ApiService.handleApiError(error);
      
      // More specific error messages
      if (error.message.includes('Audio file not found in local storage')) {
        toast.error('Audio file not found. Please re-upload the file.');
      } else if (error.message.includes('corrupted') || error.message.includes('HTML')) {
        toast.error('Audio file appears to be corrupted. Please re-upload.');
      } else if (errorInfo.message.includes('Audio file not found')) {
        toast.error('Transposition failed: File needs to be re-uploaded to server');
      } else {
        toast.error(`Transposition failed: ${errorInfo.message}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const downloadTransposed = async () => {
    if (!transposedAudio?.transposedFile) {
      toast.error('No transposed audio available');
      return;
    }

    try {
      const response = await ApiService.downloadAudio(transposedAudio.transposedFile);
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = transposedAudio.transposedFile;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Download started');
    } catch (error) {
      const errorInfo = ApiService.handleApiError(error);
      toast.error(`Download failed: ${errorInfo.message}`);
    }
  };

  const getIntervalName = (semitones) => {
    const intervals = {
      0: 'Original',
      1: 'Minor 2nd ↑',
      2: 'Major 2nd ↑',
      3: 'Minor 3rd ↑',
      4: 'Major 3rd ↑',
      5: 'Perfect 4th ↑',
      6: 'Tritone ↑',
      7: 'Perfect 5th ↑',
      8: 'Minor 6th ↑',
      9: 'Major 6th ↑',
      10: 'Minor 7th ↑',
      11: 'Major 7th ↑',
      12: 'Octave ↑',
      [-1]: 'Minor 2nd ↓',
      [-2]: 'Major 2nd ↓',
      [-3]: 'Minor 3rd ↓',
      [-4]: 'Major 3rd ↓',
      [-5]: 'Perfect 4th ↓',
      [-6]: 'Tritone ↓',
      [-7]: 'Perfect 5th ↓',
      [-8]: 'Minor 6th ↓',
      [-9]: 'Major 6th ↓',
      [-10]: 'Minor 7th ↓',
      [-11]: 'Major 7th ↓',
      [-12]: 'Octave ↓'
    };

    return intervals[semitones] || `${Math.abs(semitones)} semitones ${semitones > 0 ? 'up' : 'down'}`;
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

  const toggleOriginalAudio = async () => {
    if (!originalAudioRef || !currentAudio?.filename) return;
    
    if (isPlayingOriginal) {
      originalAudioRef.pause();
      setIsPlayingOriginal(false);
    } else {
      try {
        // Pause transposed if playing
        if (isPlayingTransposed && transposedAudioRef) {
          transposedAudioRef.pause();
          setIsPlayingTransposed(false);
        }
        
        // Load audio from local storage instead of server stream
        console.log('🎵 Loading original audio from local storage for playback');
        try {
          // Get audio file from local storage
          const audioFile = await localStorageService.getAudioFile(currentAudio.id);
          if (audioFile && audioFile.blob) {
            const audioUrl = URL.createObjectURL(audioFile.blob);
            if (originalAudioRef.src !== audioUrl) {
              // Clean up old URL if it exists
              if (originalAudioRef.src && originalAudioRef.src.startsWith('blob:')) {
                URL.revokeObjectURL(originalAudioRef.src);
              }
              originalAudioRef.src = audioUrl;
              await originalAudioRef.load();
              console.log('✅ Original audio loaded from local blob');
            }
          } else {
            throw new Error('Audio file not found in local storage');
          }
        } catch (error) {
          console.error('❌ Error loading original audio from local storage:', error);
          // Fallback to server stream
          const audioSrc = getStreamUrl(currentAudio.filename);
          if (originalAudioRef.src !== audioSrc) {
            originalAudioRef.src = audioSrc;
            await originalAudioRef.load();
          }
        }
        
        await originalAudioRef.play();
        setIsPlayingOriginal(true);
      } catch (error) {
        console.error('Error playing original audio:', error);
        toast.error('Failed to play audio. Please check if the file exists.');
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
        // Pause original if playing
        if (isPlayingOriginal && originalAudioRef) {
          originalAudioRef.pause();
          setIsPlayingOriginal(false);
        }
        
        // Ensure the audio source is set
        const audioSrc = getStreamUrl(transposedAudio.transposedFile);
        if (transposedAudioRef.src !== audioSrc) {
          transposedAudioRef.src = audioSrc;
          await transposedAudioRef.load();
        }
        
        await transposedAudioRef.play();
        setIsPlayingTransposed(true);
      } catch (error) {
        console.error('Error playing transposed audio:', error);
        toast.error('Failed to play transposed audio. Please check if the file exists.');
      }
    }
  };

  const handleOriginalAudioEnd = () => {
    setIsPlayingOriginal(false);
  };

  const handleTransposedAudioEnd = () => {
    setIsPlayingTransposed(false);
  };

  if (!currentAudio) {
    return (
      <div className="transpose-page">
        <div className="text-center">
          <FaMusic className="text-4xl opacity-50 mb-4" />
          <h1 className="section-title">Audio Transposition</h1>
          <p className="mb-6">
            No audio file selected. Please upload an audio file first.
          </p>
          <a href="/upload" className="btn btn-primary">
            Upload Audio File
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="transpose-page">
      <div className="upload-section">
        <h1 className="section-title">
          <FaExchangeAlt /> Audio Transposition
        </h1>
        <p className="text-center mb-6">
          Adjust the pitch of your audio file to match your vocal range or preferred key.
        </p>

        {/* Current Audio Info */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            <FaMusic /> Current Audio
          </h2>
          
          <div className="audio-info">
            <h3 className="audio-title">
              {currentAudio.originalName || currentAudio.title || currentAudio.filename}
            </h3>
            
            {analyzedAudio && (
              <div className="audio-details">
                <div className="audio-detail">
                  <span className="detail-label">Duration:</span>
                  <span className="detail-value">
                    {formatDuration(analyzedAudio.metadata?.duration)}
                  </span>
                </div>
                <div className="audio-detail">
                  <span className="detail-label">Sample Rate:</span>
                  <span className="detail-value">{analyzedAudio.metadata?.sampleRate} Hz</span>
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
                  disabled={!currentAudio?.filename}
                >
                  {isPlayingOriginal ? <FaVolumeUp /> : <FaMusic />}
                  {isPlayingOriginal ? 'Playing...' : 'Play Original'}
                </button>
              </div>
              <audio
                ref={setOriginalAudioRef}
                onEnded={handleOriginalAudioEnd}
                onPause={() => setIsPlayingOriginal(false)}
                onPlay={() => setIsPlayingOriginal(true)}
                onError={(e) => {
                  console.error('Audio loading error:', e);
                  toast.error('Failed to load audio file');
                }}
                controls
                preload="metadata"
                crossOrigin="anonymous"
                className="audio-controls"
              />
            </div>
          </div>
        </div>

        {/* Transposed Audio Player */}
        {transposedAudio && (
          <div className="card">
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
                onEnded={handleTransposedAudioEnd}
                onPause={() => setIsPlayingTransposed(false)}
                onPlay={() => setIsPlayingTransposed(true)}
                onError={(e) => {
                  console.error('Transposed audio loading error:', e);
                  toast.error('Failed to load transposed audio file');
                }}
                controls
                preload="metadata"
                crossOrigin="anonymous"
                className="audio-controls"
              />
            </div>
          </div>
        )}

        {/* Transposition Controls */}
        <div className="transpose-controls">
          <h2 className="transpose-title">Transposition Settings</h2>
          
          {/* Semitone Slider */}
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
              
              <div className="interval-display">
                Interval: {getIntervalName(semitones)}
              </div>
            </div>
          )}

          {/* Transpose Button */}
          <div className="text-center mt-6">
            <button
              onClick={transposeAudio}
              disabled={processing || semitones === 0}
              className="btn btn-primary btn-lg"
            >
              {processing ? (
                <><FaSpinner className="spinner" /> Processing Audio...</>
              ) : (
                <><FaExchangeAlt /> Transpose Audio</>
              )}
            </button>
          </div>
        </div>

        {/* Processing Status */}
        {processing && (
          <div className="card mt-6">
            <div className="text-center">
              <FaSpinner className="spinner text-2xl mb-4" />
              <h3 className="text-lg font-semibold mb-2">Processing Audio</h3>
              <p className="opacity-75">
                Transposing your audio by {Math.abs(semitones)} semitones 
                {semitones > 0 ? ' up' : ' down'}. This may take a moment...
              </p>
            </div>
          </div>
        )}

        {/* Transposed Audio Result */}
        {transposedAudio && (
          <div className="card mt-6">
            <div className="flex items-center gap-4 mb-4">
              <FaVolumeUp className="text-2xl text-green-600" />
              <h2 className="text-xl font-semibold">Transposition Complete!</h2>
            </div>
            
            <div className="audio-info">
              <h3 className="audio-title">
                {transposedAudio.originalFile} → {transposedAudio.transposedFile}
              </h3>
              
              <div className="audio-details">
                <div className="audio-detail">
                  <span className="detail-label">Semitones Changed:</span>
                  <span className="detail-value">
                    {transposedAudio.semitones > 0 ? '+' : ''}{transposedAudio.semitones}
                  </span>
                </div>
                
                {transposedAudio.keyInfo && (
                  <>
                    <div className="audio-detail">
                      <span className="detail-label">Original Key:</span>
                      <span className="detail-value">
                        {transposedAudio.keyInfo.originalKey} {transposedAudio.keyInfo.originalMode}
                      </span>
                    </div>
                    <div className="audio-detail">
                      <span className="detail-label">New Key:</span>
                      <span className="detail-value">
                        {transposedAudio.keyInfo.newKey} {transposedAudio.keyInfo.newMode}
                      </span>
                    </div>
                    <div className="audio-detail">
                      <span className="detail-label">Interval:</span>
                      <span className="detail-value">{transposedAudio.keyInfo.interval}</span>
                    </div>
                  </>
                )}
                
                {transposedAudio.metadata && (
                  <>
                    <div className="audio-detail">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">
                        {formatDuration(transposedAudio.metadata.duration)}
                      </span>
                    </div>
                    <div className="audio-detail">
                      <span className="detail-label">Sample Rate:</span>
                      <span className="detail-value">{transposedAudio.metadata.sampleRate} Hz</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={downloadTransposed}
                  className="btn btn-success"
                >
                  <FaDownload />
                  Download Transposed Audio
                </button>
                
                <button
                  onClick={saveTransposedToLibrary}
                  className="btn btn-primary"
                  title="Save transposed audio to your local library"
                >
                  <FaSave />
                  Save to Library
                </button>
                
                <button
                  onClick={() => {
                    setSemitones(0);
                    setTransposedAudio(null);
                  }}
                  className="btn btn-secondary"
                >
                  <FaExchangeAlt />
                  Transpose Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="card mt-6">
          <h3 className="text-lg font-semibold mb-4">How to Use</h3>
          <div className="grid grid-2">
            <div>
              <h4 className="font-medium mb-2">Transposition Guide:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Move slider to adjust pitch</li>
                <li>• Positive = higher pitch</li>
                <li>• Negative = lower pitch</li>
                <li>• ±12 semitones = 1 octave</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Common Uses:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Match your vocal range</li>
                <li>• Practice in different keys</li>
                <li>• Karaoke preparation</li>
                <li>• Instrument tuning compatibility</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transpose;