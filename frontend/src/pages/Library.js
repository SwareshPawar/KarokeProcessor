import React, { useState, useEffect } from 'react';
import { FaHdd, FaTrash, FaDownload, FaUpload, FaSync, FaCloud, FaMusic, FaPlay, FaPause, FaStop, FaPlus, FaList } from 'react-icons/fa';
import toast from 'react-hot-toast';
import localStorageService from '../services/localStorageService';
import audioPlayerService from '../services/audioPlayerService';
import playlistService from '../services/playlistService';
import '../components/Playlist.css';

const Library = () => {
  const [audioFiles, setAudioFiles] = useState([]);
  const [storageStats, setStorageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('dateAdded');
  const [sortOrder, setSortOrder] = useState('desc');
  const [playerState, setPlayerState] = useState(audioPlayerService.getState());
  const [playlists, setPlaylists] = useState([]);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(null);

  useEffect(() => {
    loadLibrary();
    loadStorageStats();
    loadPlaylists();

    // Listen for storage updates
    const handleStorageUpdate = () => {
      loadStorageStats();
    };

    // Listen for player state changes
    const playerUnsubscribe = audioPlayerService.addListener(setPlayerState);

    window.addEventListener('storageUpdated', handleStorageUpdate);
    
    return () => {
      window.removeEventListener('storageUpdated', handleStorageUpdate);
      playerUnsubscribe();
    };
  }, []);

  const loadLibrary = async () => {
    try {
      const files = await localStorageService.getAllAudioFiles();
      setAudioFiles(files);
    } catch (error) {
      console.error('Error loading library:', error);
      toast.error('Failed to load audio library');
    } finally {
      setLoading(false);
    }
  };

  const loadStorageStats = async () => {
    try {
      const stats = await localStorageService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Error loading storage stats:', error);
    }
  };

  const loadPlaylists = async () => {
    try {
      const allPlaylists = await playlistService.getAllPlaylists();
      setPlaylists(allPlaylists);
    } catch (error) {
      console.error('Error loading playlists:', error);
    }
  };

  // Shared audio control functions
  const handlePlayPause = async (song) => {
    console.log('🎵 Library handlePlayPause called with:', {
      songId: song.id,
      songTitle: song.title,
      currentSongId: playerState.currentSong?.id,
      isPlaying: playerState.isPlaying
    });
    
    try {
      // Check if this song is currently playing
      if (playerState.currentSong?.id === song.id && playerState.isPlaying) {
        // Pause if currently playing this song
        console.log('🔄 Pausing current song');
        await audioPlayerService.pause();
        toast.success(`Paused "${song.title}"`);
      } else if (playerState.currentSong?.id === song.id && !playerState.isPlaying) {
        // Resume if this song is loaded but paused
        console.log('▶️ Resuming current song');
        await audioPlayerService.play();
        toast.success(`Resumed "${song.title}"`);
      } else {
        // Load and play new song
        console.log('🆕 Loading new song');
        await audioPlayerService.setPlaylist([song], 0);
        await audioPlayerService.play();
        toast.success(`Playing "${song.title}"`);
      }
    } catch (error) {
      console.error('Error playing song:', error);
      toast.error('Failed to play song');
    }
  };

  const handlePlayAll = async () => {
    if (filteredFiles.length === 0) return;
    
    try {
      // Check if library is currently playing
      const isLibraryPlaying = playerState.playlist && playerState.playlist.length > 0 &&
        filteredFiles.some(song => 
          playerState.playlist.some(pSong => pSong.id === song.id)
        );
      
      if (isLibraryPlaying && playerState.isPlaying) {
        // Pause if currently playing library
        await audioPlayerService.pause();
        toast.success('Library playback paused');
      } else if (isLibraryPlaying && !playerState.isPlaying) {
        // Resume if library is loaded but paused
        await audioPlayerService.play();
        toast.success('Library playback resumed');
      } else {
        // Load and play library
        await audioPlayerService.setPlaylist(filteredFiles, 0);
        await audioPlayerService.play();
        toast.success(`Playing library (${filteredFiles.length} songs)`);
      }
    } catch (error) {
      console.error('Error playing library:', error);
      toast.error('Failed to play library');
    }
  };

  const handleStop = async () => {
    try {
      await audioPlayerService.stop();
      toast.success('Playback stopped');
    } catch (error) {
      console.error('Error stopping playback:', error);
      toast.error('Failed to stop playback');
    }
  };

  const addSongToPlaylist = async (songId, playlistId) => {
    try {
      await playlistService.addSongToPlaylist(playlistId, songId);
      const playlist = await playlistService.getPlaylist(playlistId);
      toast.success(`Added to "${playlist.name}"`);
      setShowAddToPlaylist(null);
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      toast.error('Failed to add song to playlist');
    }
  };

  const deleteFile = async (fileId) => {
    try {
      await localStorageService.deleteAudioFile(fileId);
      await loadLibrary();
      await loadStorageStats();
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const deleteSelectedFiles = async () => {
    try {
      for (const fileId of selectedFiles) {
        await localStorageService.deleteAudioFile(fileId);
      }
      setSelectedFiles([]);
      await loadLibrary();
      await loadStorageStats();
      toast.success(`${selectedFiles.length} file(s) deleted successfully`);
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error('Failed to delete selected files');
    }
  };

  const exportLibrary = async () => {
    try {
      const exportData = await localStorageService.exportLibrary();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `karaoke-library-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Library exported successfully');
    } catch (error) {
      console.error('Error exporting library:', error);
      toast.error('Failed to export library');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const filteredFiles = audioFiles
    .filter(file => 
      file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.filename.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const selectAllFiles = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(file => file.id));
    }
  };

  if (loading) {
    return (
      <div className="library-page">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <h1>Loading Library...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="library-page">
      <div className="upload-section">
        <h1 className="section-title">
          <FaMusic /> My Audio Library
        </h1>
        <p className="text-center mb-6">
          Manage your offline audio collection with local storage and cloud sync capabilities.
        </p>

        {/* Storage Statistics */}
        {storageStats && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">
              <FaHdd /> Storage Statistics
            </h2>
            <div className="storage-stats">
              <div className="storage-bar">
                <div 
                  className="storage-used" 
                  style={{ width: `${storageStats.percentage}%` }}
                ></div>
              </div>
              <div className="storage-info">
                <div className="storage-detail">
                  <span>Files:</span>
                  <span>{storageStats.totalFiles}</span>
                </div>
                <div className="storage-detail">
                  <span>Used:</span>
                  <span>{formatFileSize(storageStats.totalSize)}</span>
                </div>
                <div className="storage-detail">
                  <span>Available:</span>
                  <span>{formatFileSize(storageStats.available)}</span>
                </div>
                <div className="storage-detail">
                  <span>Usage:</span>
                  <span>{storageStats.percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Library Controls */}
        <div className="card mb-6">
          <div className="library-controls">
            <div className="search-controls">
              <input
                type="text"
                placeholder="Search your library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="sort-select"
              >
                <option value="dateAdded-desc">Newest First</option>
                <option value="dateAdded-asc">Oldest First</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="size-desc">Largest First</option>
                <option value="size-asc">Smallest First</option>
              </select>
            </div>

            <div className="action-buttons">
              <button onClick={selectAllFiles} className="btn btn-secondary">
                {selectedFiles.length === filteredFiles.length ? 'Deselect All' : 'Select All'}
              </button>
              
              <button onClick={handlePlayAll} className="btn btn-primary me-2" disabled={filteredFiles.length === 0}>
                {playerState.isPlaying && playerState.playlist && filteredFiles.some(song => 
                  playerState.playlist.some(pSong => pSong.id === song.id)
                ) ? 
                  <><FaPause /> Pause All</> : 
                  <><FaPlay /> Play All ({filteredFiles.length})</>
                }
              </button>
              
              {playerState.isPlaying && (
                <button onClick={handleStop} className="btn btn-secondary me-2">
                  <FaStop /> Stop
                </button>
              )}
              
              {selectedFiles.length > 0 && (
                <button onClick={deleteSelectedFiles} className="btn btn-danger">
                  <FaTrash /> Delete Selected ({selectedFiles.length})
                </button>
              )}
              
              <button onClick={exportLibrary} className="btn btn-primary">
                <FaDownload /> Export Library
              </button>
              
              <button className="btn btn-primary" title="Cloud sync coming soon">
                <FaCloud /> Sync with Drive
              </button>
            </div>
          </div>
        </div>

        {/* Audio Files Grid */}
        <div className="audio-files-grid">
          {filteredFiles.length === 0 ? (
            <div className="empty-library">
              <FaMusic className="text-6xl opacity-50 mb-4" />
              <h3>Your library is empty</h3>
              <p>Upload audio files or download from YouTube to get started.</p>
              <div className="cta-buttons">
                <a href="/upload" className="btn btn-primary">
                  <FaUpload /> Upload Audio
                </a>
                <a href="/youtube" className="btn btn-secondary">
                  <FaDownload /> Download from YouTube
                </a>
              </div>
            </div>
          ) : (
            filteredFiles.map(file => (
              <div 
                key={file.id} 
                className={`audio-file-card ${selectedFiles.includes(file.id) ? 'selected' : ''}`}
              >
                <div className="file-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                  />
                </div>
                
                <div className="file-info">
                  <h3 className="file-title">{file.title}</h3>
                  <p className="file-details">
                    {formatFileSize(file.size)} • {formatDuration(file.metadata?.duration)}
                  </p>
                  <p className="file-source">
                    Source: {file.source} • Added: {new Date(file.dateAdded).toLocaleDateString()}
                  </p>
                  
                  {file.metadata?.keyInfo && (
                    <p className="file-key">
                      Key: {file.metadata.keyInfo.key} {file.metadata.keyInfo.mode}
                    </p>
                  )}
                </div>

                <div className="file-actions">
                  <button 
                    onClick={() => handlePlayPause(file)}
                    className="btn btn-sm btn-primary me-1"
                    title="Play Song"
                  >
                    {playerState.currentSong?.id === file.id && playerState.isPlaying ? 
                      <FaPause /> : <FaPlay />
                    }
                  </button>
                  {playerState.currentSong?.id === file.id && playerState.isPlaying && (
                    <button 
                      onClick={handleStop}
                      className="btn btn-sm btn-secondary me-1"
                      title="Stop"
                    >
                      <FaStop />
                    </button>
                  )}
                  <button 
                    onClick={() => setShowAddToPlaylist(file.id)}
                    className="btn btn-sm btn-secondary me-1"
                    title="Add to Playlist"
                  >
                    <FaPlus />
                  </button>
                  <button 
                    onClick={() => window.location.href = `/transpose?file=${file.id}`}
                    className="btn btn-sm btn-secondary"
                    title="Transpose"
                  >
                    <FaSync />
                  </button>
                  <button 
                    onClick={() => deleteFile(file.id)}
                    className="btn btn-sm btn-danger"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add to Playlist Modal */}
        {showAddToPlaylist && (
          <div className="modal-overlay" onClick={() => setShowAddToPlaylist(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add to Playlist</h2>
                <button 
                  onClick={() => setShowAddToPlaylist(null)}
                  className="modal-close"
                >×</button>
              </div>
              
              <div className="modal-body">
                {playlists.length === 0 ? (
                  <div className="text-center">
                    <FaList className="text-4xl opacity-50 mb-4" />
                    <p>No playlists found</p>
                    <a href="/playlists" className="btn btn-primary mt-4">
                      <FaPlus /> Create Your First Playlist
                    </a>
                  </div>
                ) : (
                  <div className="playlist-list">
                    {playlists.map(playlist => (
                      <div 
                        key={playlist.id} 
                        className="playlist-item"
                        onClick={() => addSongToPlaylist(showAddToPlaylist, playlist.id)}
                      >
                        <div className="playlist-info">
                          <h4>{playlist.name}</h4>
                          <p>{playlist.songCount} songs</p>
                        </div>
                        <FaPlus />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;