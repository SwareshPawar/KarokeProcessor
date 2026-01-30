class AudioPlayerService {
  constructor() {
    this.audio = new Audio();
    this.currentSong = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 1;
    this.playlist = [];
    this.currentIndex = 0;
    this.shuffle = false;
    this.repeat = 'none'; // 'none', 'one', 'all'
    this.listeners = new Set();

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio.duration;
      this.notifyListeners('metadataLoaded');
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio.currentTime;
      this.notifyListeners('timeUpdate');
    });

    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.notifyListeners('play');
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notifyListeners('pause');
    });

    this.audio.addEventListener('ended', () => {
      this.handleSongEnd();
    });

    this.audio.addEventListener('error', (error) => {
      console.error('Audio playback error:', error);
      this.notifyListeners('error', error);
    });

    this.audio.addEventListener('loadstart', () => {
      this.notifyListeners('loadStart');
    });

    this.audio.addEventListener('canplaythrough', () => {
      this.notifyListeners('canPlayThrough');
    });
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data = null) {
    this.listeners.forEach(callback => {
      try {
        callback({ event, data, state: this.getState() });
      } catch (error) {
        console.error('Error in audio player listener:', error);
      }
    });
  }

  getState() {
    return {
      currentSong: this.currentSong,
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      volume: this.volume,
      playlist: this.playlist,
      currentIndex: this.currentIndex,
      shuffle: this.shuffle,
      repeat: this.repeat
    };
  }

  async loadSong(song) {
    let audioFile; // Declare in function scope for error logging
    
    try {
      // Stop current playbook
      this.pause();
      
      this.currentSong = song;
      
      // Dynamically import and initialize localStorageService to avoid bundling issues
      const { default: storageService } = await import('./localStorageService');
      await storageService.init();
      
      // Get audio file from IndexedDB (this returns the full audio file object)
      audioFile = await storageService.getAudioFile(song.id);
      
      if (audioFile && audioFile.blob) {
        // Create URL from blob for local files
        const audioUrl = URL.createObjectURL(audioFile.blob);
        this.audio.src = audioUrl;
        
        // Clean up previous blob URL to prevent memory leaks
        this.audio.addEventListener('loadstart', () => {
          // URL.revokeObjectURL will be called after audio loads
        });
        
      } else {
        // Fallback to server stream if available
        this.audio.src = `/api/stream/${song.filename}`;
      }

      this.audio.load();
      this.notifyListeners('songLoaded', song);
      
      return true;
    } catch (error) {
      console.error('Failed to load song:', error);
      console.error('Song object:', song);
      if (audioFile) {
        console.error('Audio file result:', audioFile);
      }
      this.notifyListeners('error', error);
      return false;
    }
  }

  async play() {
    try {
      await this.audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      this.notifyListeners('error', error);
    }
  }

  pause() {
    this.audio.pause();
  }

  async toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
  }

  async playSong(song) {
    await this.loadSong(song);
    await this.play();
  }

  seek(time) {
    this.audio.currentTime = Math.max(0, Math.min(time, this.duration));
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.audio.volume = this.volume;
    this.notifyListeners('volumeChange');
  }

  async setPlaylist(songs, startIndex = 0) {
    this.playlist = songs;
    this.currentIndex = Math.max(0, Math.min(startIndex, songs.length - 1));
    
    if (songs.length > 0) {
      await this.loadSong(songs[this.currentIndex]);
    }
  }

  async next() {
    if (this.playlist.length === 0) return;

    let nextIndex;
    
    if (this.shuffle) {
      nextIndex = Math.floor(Math.random() * this.playlist.length);
    } else {
      nextIndex = this.currentIndex + 1;
      if (nextIndex >= this.playlist.length) {
        if (this.repeat === 'all') {
          nextIndex = 0;
        } else {
          return; // End of playlist
        }
      }
    }

    this.currentIndex = nextIndex;
    await this.loadSong(this.playlist[this.currentIndex]);
    await this.play();
  }

  async previous() {
    if (this.playlist.length === 0) return;

    // If we're more than 3 seconds into the song, restart current song
    if (this.currentTime > 3) {
      this.seek(0);
      return;
    }

    let prevIndex;
    
    if (this.shuffle) {
      prevIndex = Math.floor(Math.random() * this.playlist.length);
    } else {
      prevIndex = this.currentIndex - 1;
      if (prevIndex < 0) {
        if (this.repeat === 'all') {
          prevIndex = this.playlist.length - 1;
        } else {
          return; // Beginning of playlist
        }
      }
    }

    this.currentIndex = prevIndex;
    await this.loadSong(this.playlist[this.currentIndex]);
    await this.play();
  }

  handleSongEnd() {
    if (this.repeat === 'one') {
      this.seek(0);
      this.play();
    } else {
      this.next();
    }
  }

  setShuffle(enabled) {
    this.shuffle = enabled;
    this.notifyListeners('shuffleChange');
  }

  setRepeat(mode) {
    this.repeat = mode; // 'none', 'one', 'all'
    this.notifyListeners('repeatChange');
  }

  async playPlaylist(playlist) {
    const { default: playlistService } = await import('./playlistService');
    const songs = await playlistService.getPlaylistSongs(playlist.id);
    
    if (songs.length > 0) {
      await this.setPlaylist(songs);
      await this.play();
    }
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  stop() {
    this.pause();
    this.seek(0);
    this.currentSong = null;
    this.playlist = [];
    this.currentIndex = 0;
    this.notifyListeners('stop');
  }

  // Clean up resources
  destroy() {
    this.stop();
    
    // Revoke any object URLs
    if (this.audio.src && this.audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.audio.src);
    }
    
    this.listeners.clear();
  }
}

const audioPlayerService = new AudioPlayerService();
export default audioPlayerService;