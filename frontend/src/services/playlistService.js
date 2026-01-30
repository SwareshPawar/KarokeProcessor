class PlaylistService {
  constructor() {
    this.dbName = 'KaraokeProcessor';
    this.playlistStoreName = 'playlists';
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create playlists store if it doesn't exist
        if (!db.objectStoreNames.contains(this.playlistStoreName)) {
          const playlistStore = db.createObjectStore(this.playlistStoreName, { 
            keyPath: 'id', 
            autoIncrement: false 
          });
          playlistStore.createIndex('name', 'name', { unique: false });
          playlistStore.createIndex('dateCreated', 'dateCreated', { unique: false });
        }
      };
    });
  }

  generateId() {
    return `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createPlaylist(playlistData) {
    await this.init();
    
    const playlist = {
      id: this.generateId(),
      name: playlistData.name || 'New Playlist',
      description: playlistData.description || '',
      songs: [], // Array of song IDs
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      coverImage: playlistData.coverImage || null,
      isPublic: playlistData.isPublic || false,
      tags: playlistData.tags || [],
      totalDuration: 0,
      songCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.playlistStoreName], 'readwrite');
      const store = transaction.objectStore(this.playlistStoreName);
      const request = store.add(playlist);

      request.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('playlistUpdated', { detail: playlist }));
        resolve(playlist);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPlaylists() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.playlistStoreName], 'readonly');
      const store = transaction.objectStore(this.playlistStoreName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPlaylist(playlistId) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.playlistStoreName], 'readonly');
      const store = transaction.objectStore(this.playlistStoreName);
      const request = store.get(playlistId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updatePlaylist(playlistId, updates) {
    await this.init();
    
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    const updatedPlaylist = {
      ...playlist,
      ...updates,
      dateModified: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.playlistStoreName], 'readwrite');
      const store = transaction.objectStore(this.playlistStoreName);
      const request = store.put(updatedPlaylist);

      request.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('playlistUpdated', { detail: updatedPlaylist }));
        resolve(updatedPlaylist);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deletePlaylist(playlistId) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.playlistStoreName], 'readwrite');
      const store = transaction.objectStore(this.playlistStoreName);
      const request = store.delete(playlistId);

      request.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('playlistDeleted', { detail: playlistId }));
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addSongToPlaylist(playlistId, songId) {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    if (playlist.songs.includes(songId)) {
      throw new Error('Song already in playlist');
    }

    // Get song details to update playlist metadata
    const localStorageService = await import('./localStorageService');
    const song = await localStorageService.default.getAudioFile(songId);
    
    const updatedSongs = [...playlist.songs, songId];
    const updatedDuration = playlist.totalDuration + (song?.metadata?.duration || 0);

    return await this.updatePlaylist(playlistId, {
      songs: updatedSongs,
      songCount: updatedSongs.length,
      totalDuration: updatedDuration
    });
  }

  async removeSongFromPlaylist(playlistId, songId) {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    const localStorageService = await import('./localStorageService');
    const song = await localStorageService.default.getAudioFile(songId);
    
    const updatedSongs = playlist.songs.filter(id => id !== songId);
    const updatedDuration = playlist.totalDuration - (song?.metadata?.duration || 0);

    return await this.updatePlaylist(playlistId, {
      songs: updatedSongs,
      songCount: updatedSongs.length,
      totalDuration: Math.max(0, updatedDuration)
    });
  }

  async getPlaylistSongs(playlistId) {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    const localStorageService = await import('./localStorageService');
    const songs = [];
    
    for (const songId of playlist.songs) {
      try {
        const song = await localStorageService.default.getAudioFile(songId);
        if (song) {
          songs.push(song);
        }
      } catch (error) {
        console.warn(`Song ${songId} not found in library`);
      }
    }

    return songs;
  }

  async searchPlaylists(query) {
    const allPlaylists = await this.getAllPlaylists();
    const lowercaseQuery = query.toLowerCase();
    
    return allPlaylists.filter(playlist => 
      playlist.name.toLowerCase().includes(lowercaseQuery) ||
      playlist.description.toLowerCase().includes(lowercaseQuery) ||
      playlist.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  async exportPlaylist(playlistId) {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    const songs = await this.getPlaylistSongs(playlistId);
    
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      playlist: {
        ...playlist,
        songs: songs.map(song => ({
          id: song.id,
          title: song.title,
          filename: song.filename,
          size: song.size,
          source: song.source,
          metadata: song.metadata,
          dateAdded: song.dateAdded
        }))
      }
    };
  }

  async importPlaylist(importData) {
    if (!importData.playlist) {
      throw new Error('Invalid playlist data');
    }

    const { playlist } = importData;
    const localStorageService = await import('./localStorageService');
    
    // Create new playlist
    const newPlaylist = await this.createPlaylist({
      name: playlist.name + ' (Imported)',
      description: playlist.description,
      isPublic: playlist.isPublic,
      tags: playlist.tags
    });

    // Add songs that exist in local storage
    for (const song of playlist.songs) {
      try {
        const existingSong = await localStorageService.default.getAudioFile(song.id);
        if (existingSong) {
          await this.addSongToPlaylist(newPlaylist.id, song.id);
        }
      } catch (error) {
        console.warn(`Could not add song ${song.title} to imported playlist`);
      }
    }

    return newPlaylist;
  }

  async syncToGoogleDrive() {
    try {
      const googleDriveService = await import('./googleDriveService');
      
      if (!googleDriveService.default.isAuthenticated()) {
        throw new Error('Google Drive not authenticated');
      }

      const allPlaylists = await this.getAllPlaylists();
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        playlists: []
      };

      for (const playlist of allPlaylists) {
        const playlistExport = await this.exportPlaylist(playlist.id);
        exportData.playlists.push(playlistExport.playlist);
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      return await googleDriveService.default.uploadFile(blob, {
        name: `karaoke-playlists-${new Date().toISOString()}.json`,
        description: 'Karaoke Processor playlists backup'
      });
    } catch (error) {
      console.error('Failed to sync playlists to Google Drive:', error);
      throw error;
    }
  }

  async getStorageStats() {
    const allPlaylists = await this.getAllPlaylists();
    
    return {
      totalPlaylists: allPlaylists.length,
      totalSongs: allPlaylists.reduce((sum, playlist) => sum + playlist.songCount, 0),
      totalDuration: allPlaylists.reduce((sum, playlist) => sum + playlist.totalDuration, 0),
      averageSongsPerPlaylist: allPlaylists.length > 0 ? 
        (allPlaylists.reduce((sum, playlist) => sum + playlist.songCount, 0) / allPlaylists.length).toFixed(1) : 0
    };
  }
}

const playlistService = new PlaylistService();
export default playlistService;