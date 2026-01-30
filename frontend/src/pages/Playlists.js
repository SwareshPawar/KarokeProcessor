import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaMusic, FaPlus, FaPlay, FaPause, FaList, FaRandom, FaRepeat, FaTrash, FaEdit, FaDownload, FaCloud } from 'react-icons/fa';
import toast from 'react-hot-toast';
import playlistService from '../services/playlistService';
import audioPlayerService from '../services/audioPlayerService';
import '../components/Playlist.css';

const Playlists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [playerState, setPlayerState] = useState(audioPlayerService.getState());
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');

  useEffect(() => {
    loadPlaylists();

    // Listen for playlist updates
    const handlePlaylistUpdate = () => {
      loadPlaylists();
    };

    // Listen for player state changes
    const playerUnsubscribe = audioPlayerService.addListener(setPlayerState);

    window.addEventListener('playlistUpdated', handlePlaylistUpdate);
    window.addEventListener('playlistDeleted', handlePlaylistUpdate);

    return () => {
      window.removeEventListener('playlistUpdated', handlePlaylistUpdate);
      window.removeEventListener('playlistDeleted', handlePlaylistUpdate);
      playerUnsubscribe();
    };
  }, []);

  const loadPlaylists = async () => {
    try {
      const allPlaylists = await playlistService.getAllPlaylists();
      setPlaylists(allPlaylists.sort((a, b) => new Date(b.dateModified) - new Date(a.dateModified)));
    } catch (error) {
      console.error('Error loading playlists:', error);
      toast.error('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    try {
      await playlistService.createPlaylist({
        name: newPlaylistName,
        description: newPlaylistDescription
      });
      
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowCreateModal(false);
      toast.success('Playlist created successfully');
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist');
    }
  };

  const deletePlaylist = async (playlistId) => {
    if (!window.confirm('Are you sure you want to delete this playlist?')) {
      return;
    }

    try {
      await playlistService.deletePlaylist(playlistId);
      toast.success('Playlist deleted successfully');
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Failed to delete playlist');
    }
  };

  const loadPlaylistSongs = async (playlist) => {
    try {
      const songs = await playlistService.getPlaylistSongs(playlist.id);
      setPlaylistSongs(songs);
      setSelectedPlaylist(playlist);
    } catch (error) {
      console.error('Error loading playlist songs:', error);
      toast.error('Failed to load playlist songs');
    }
  };

  const playPlaylist = async (playlist) => {
    try {
      await audioPlayerService.playPlaylist(playlist);
      toast.success(`Playing "${playlist.name}"`);
    } catch (error) {
      console.error('Error playing playlist:', error);
      toast.error('Failed to play playlist');
    }
  };

  const playSong = async (song, songs, index) => {
    try {
      await audioPlayerService.setPlaylist(songs, index);
      await audioPlayerService.play();
    } catch (error) {
      console.error('Error playing song:', error);
      toast.error('Failed to play song');
    }
  };

  const exportPlaylist = async (playlist) => {
    try {
      const exportData = await playlistService.exportPlaylist(playlist.id);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `playlist-${playlist.name}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Playlist exported successfully');
    } catch (error) {
      console.error('Error exporting playlist:', error);
      toast.error('Failed to export playlist');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="playlists-page">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <h1>Loading Playlists...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="playlists-page">
      <div className="upload-section">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="section-title">
              <FaList /> My Playlists
            </h1>
            <p className="text-center">
              Create and manage your custom playlists with local storage and cloud sync.
            </p>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <FaPlus /> Create Playlist
          </button>
        </div>

        {/* Playlists Grid */}
        <div className="playlists-grid">
          {playlists.length === 0 ? (
            <div className="empty-playlists">
              <FaList className="text-6xl opacity-50 mb-4" />
              <h3>No playlists yet</h3>
              <p>Create your first playlist to organize your favorite songs.</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary mt-4"
              >
                <FaPlus /> Create Your First Playlist
              </button>
            </div>
          ) : (
            playlists.map(playlist => (
              <div key={playlist.id} className="playlist-card">
                <div className="playlist-cover">
                  {playlist.coverImage ? (
                    <img src={playlist.coverImage} alt={playlist.name} />
                  ) : (
                    <div className="default-cover">
                      <FaMusic className="text-4xl opacity-50" />
                    </div>
                  )}
                  <div className="playlist-overlay">
                    <button 
                      onClick={() => playPlaylist(playlist)}
                      className="play-button"
                      disabled={playlist.songCount === 0}
                    >
                      {playerState.isPlaying && playerState.playlist.some(song => 
                        playlistSongs.some(pSong => pSong.id === song.id)
                      ) ? <FaPause /> : <FaPlay />}
                    </button>
                  </div>
                </div>
                
                <div className="playlist-info">
                  <h3 className="playlist-title">{playlist.name}</h3>
                  {playlist.description && (
                    <p className="playlist-description">{playlist.description}</p>
                  )}
                  <div className="playlist-stats">
                    <span>{playlist.songCount} songs</span>
                    {playlist.totalDuration > 0 && (
                      <>
                        <span>•</span>
                        <span>{formatDuration(playlist.totalDuration)}</span>
                      </>
                    )}
                  </div>
                  <div className="playlist-date">
                    Modified: {new Date(playlist.dateModified).toLocaleDateString()}
                  </div>
                </div>

                <div className="playlist-actions">
                  <button 
                    onClick={() => loadPlaylistSongs(playlist)}
                    className="btn btn-sm btn-secondary"
                    title="View Songs"
                  >
                    <FaList />
                  </button>
                  <button 
                    onClick={() => exportPlaylist(playlist)}
                    className="btn btn-sm btn-secondary"
                    title="Export Playlist"
                  >
                    <FaDownload />
                  </button>
                  <Link 
                    to={`/playlists/${playlist.id}/edit`}
                    className="btn btn-sm btn-secondary"
                    title="Edit Playlist"
                  >
                    <FaEdit />
                  </Link>
                  <button 
                    onClick={() => deletePlaylist(playlist.id)}
                    className="btn btn-sm btn-danger"
                    title="Delete Playlist"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Playlist Detail Modal */}
        {selectedPlaylist && (
          <div className="modal-overlay" onClick={() => setSelectedPlaylist(null)}>
            <div className="modal-content playlist-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedPlaylist.name}</h2>
                <button 
                  onClick={() => setSelectedPlaylist(null)}
                  className="modal-close"
                >×</button>
              </div>
              
              <div className="modal-body">
                <div className="playlist-header">
                  <div className="playlist-meta">
                    <p>{selectedPlaylist.songCount} songs • {formatDuration(selectedPlaylist.totalDuration)}</p>
                    {selectedPlaylist.description && (
                      <p className="playlist-description">{selectedPlaylist.description}</p>
                    )}
                  </div>
                  <div className="playlist-controls">
                    <button 
                      onClick={() => playPlaylist(selectedPlaylist)}
                      className="btn btn-primary"
                      disabled={playlistSongs.length === 0}
                    >
                      <FaPlay /> Play All
                    </button>
                    <button 
                      onClick={() => {
                        audioPlayerService.setShuffle(!playerState.shuffle);
                        playPlaylist(selectedPlaylist);
                      }}
                      className={`btn ${playerState.shuffle ? 'btn-primary' : 'btn-secondary'}`}
                      disabled={playlistSongs.length === 0}
                    >
                      <FaRandom /> Shuffle
                    </button>
                  </div>
                </div>

                <div className="playlist-songs">
                  {playlistSongs.length === 0 ? (
                    <div className="empty-playlist">
                      <p>This playlist is empty.</p>
                      <Link to="/library" className="btn btn-secondary">
                        Add Songs from Library
                      </Link>
                    </div>
                  ) : (
                    <div className="song-list">
                      {playlistSongs.map((song, index) => (
                        <div 
                          key={song.id} 
                          className={`song-item ${
                            playerState.currentSong?.id === song.id ? 'playing' : ''
                          }`}
                        >
                          <div className="song-number">
                            {playerState.currentSong?.id === song.id && playerState.isPlaying ? 
                              <FaPause className="text-primary" /> : 
                              <span>{index + 1}</span>
                            }
                          </div>
                          
                          <div className="song-info" onClick={() => playSong(song, playlistSongs, index)}>
                            <h4 className="song-title">{song.title}</h4>
                            <p className="song-details">
                              {formatDuration(song.metadata?.duration)} • {song.source}
                            </p>
                          </div>
                          
                          <div className="song-actions">
                            <button 
                              onClick={() => playSong(song, playlistSongs, index)}
                              className="btn btn-sm btn-primary"
                            >
                              {playerState.currentSong?.id === song.id && playerState.isPlaying ? 
                                <FaPause /> : <FaPlay />
                              }
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Playlist Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Playlist</h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="modal-close"
                >×</button>
              </div>
              
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="playlist-name">Playlist Name *</label>
                  <input
                    id="playlist-name"
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="Enter playlist name"
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="playlist-description">Description</label>
                  <textarea
                    id="playlist-description"
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    placeholder="Enter playlist description (optional)"
                    className="form-textarea"
                    rows="3"
                  />
                </div>
                
                <div className="modal-actions">
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={createPlaylist}
                    className="btn btn-primary"
                    disabled={!newPlaylistName.trim()}
                  >
                    <FaPlus /> Create Playlist
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Playlists;