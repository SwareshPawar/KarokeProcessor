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

  canPlayType(type) {
    return this.audio.canPlayType(type);
  }

  testAudioSupport() {
    const formats = [
      'audio/mpeg',
      'audio/mp3', 
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/aac'
    ];
    
    console.log('Browser audio format support:');
    formats.forEach(format => {
      console.log(`${format}: ${this.canPlayType(format)}`);
    });
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
      console.error('🚨 Audio playback error:', error);
      console.error('Audio element error details:', {
        src: this.audio.src,
        error: this.audio.error,
        networkState: this.audio.networkState,
        readyState: this.audio.readyState,
        currentTime: this.audio.currentTime
      });
      
      // Check if it's a network or format error
      if (this.audio.error) {
        const errorMessages = {
          1: 'MEDIA_ERR_ABORTED: The fetching process for the media resource was aborted',
          2: 'MEDIA_ERR_NETWORK: A network error caused the media download to fail',
          3: 'MEDIA_ERR_DECODE: An error occurred while decoding the media resource',
          4: 'MEDIA_ERR_SRC_NOT_SUPPORTED: The media resource format is not supported'
        };
        console.error('Media error code:', this.audio.error.code, errorMessages[this.audio.error.code]);
      }
      
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
      console.log('🎵 Loading song:', song);
      console.log('🆔 Song ID:', song?.id);
      
      // Stop current playback
      this.pause();
      
      this.currentSong = song;
      
      // Dynamically import and initialize localStorageService to avoid bundling issues
      const { default: storageService } = await import('./localStorageService');
      await storageService.init();
      console.log('🗄️ LocalStorageService initialized');
      
      // Get audio file from IndexedDB (this returns the full audio file object)
      audioFile = await storageService.getAudioFile(song.id);
      console.log('📁 Retrieved audioFile from IndexedDB:', audioFile);
      
      console.log('Retrieved audio file from storage:', {
        hasAudioFile: !!audioFile,
        hasBlob: !!(audioFile && audioFile.blob),
        audioFileStructure: audioFile ? Object.keys(audioFile) : 'none',
        blobSize: audioFile && audioFile.blob ? audioFile.blob.size : 'none',
        blobType: audioFile && audioFile.blob ? audioFile.blob.type : 'none'
      });
      
      if (audioFile && audioFile.blob && audioFile.blob.size > 0) {
        // Validate blob type
        const supportedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac'];
        const blobType = audioFile.blob.type || 'audio/mpeg';
        
        console.log('Audio format validation:', {
          originalType: audioFile.blob.type,
          effectiveType: blobType,
          isSupported: supportedTypes.includes(blobType) || supportedTypes.some(type => blobType.startsWith(type.split('/')[0]))
        });
        
        // Create URL from blob for local files
        const audioUrl = URL.createObjectURL(audioFile.blob);
        
        console.log('Loading audio from blob:', {
          songId: song.id,
          songTitle: song.title,
          blobSize: audioFile.blob.size,
          blobType: blobType,
          audioUrl: audioUrl
        });
        
        this.audio.src = audioUrl;
        
        // Clean up previous blob URL to prevent memory leaks
        this.audio.addEventListener('loadstart', () => {
          // URL.revokeObjectURL will be called after audio loads
        });
        
      } else {
        console.log('Invalid or empty blob, using server stream fallback:', {
          songId: song.id,
          filename: song.filename,
          hasAudioFile: !!audioFile,
          hasBlob: !!(audioFile && audioFile.blob),
          blobSize: audioFile && audioFile.blob ? audioFile.blob.size : 0
        });
        
        // Fallback to server stream if available
        this.audio.src = `/api/stream/${song.filename}`;
      }

      console.log('🔄 Current audio src before load:', this.audio.src);
      console.log('📊 Audio readyState:', this.audio.readyState);
      
      this.audio.load();
      console.log('✅ Audio.load() called');
      
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