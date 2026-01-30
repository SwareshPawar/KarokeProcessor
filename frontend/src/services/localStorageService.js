// IndexedDB service for local audio storage
class LocalStorageService {
  constructor() {
    this.dbName = 'KaraokeProcessorDB';
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Audio files store
        if (!db.objectStoreNames.contains('audioFiles')) {
          const audioStore = db.createObjectStore('audioFiles', { keyPath: 'id' });
          audioStore.createIndex('filename', 'filename', { unique: false });
          audioStore.createIndex('title', 'title', { unique: false });
          audioStore.createIndex('source', 'source', { unique: false });
          audioStore.createIndex('dateAdded', 'dateAdded', { unique: false });
        }
        
        // Transposed audio files store
        if (!db.objectStoreNames.contains('transposedFiles')) {
          const transposedStore = db.createObjectStore('transposedFiles', { keyPath: 'id' });
          transposedStore.createIndex('originalId', 'originalId', { unique: false });
          transposedStore.createIndex('semitones', 'semitones', { unique: false });
        }
        
        // User library metadata
        if (!db.objectStoreNames.contains('library')) {
          const libraryStore = db.createObjectStore('library', { keyPath: 'id' });
          libraryStore.createIndex('title', 'title', { unique: false });
          libraryStore.createIndex('artist', 'artist', { unique: false });
          libraryStore.createIndex('tags', 'tags', { multiEntry: true });
        }
      };
    });
  }

  // Store audio file locally
  async storeAudioFile(audioBlob, metadata) {
    if (!this.db) await this.init();
    
    // Validate the blob
    if (!audioBlob || !(audioBlob instanceof Blob)) {
      throw new Error('Invalid audio blob provided');
    }
    
    // Validate blob size
    if (audioBlob.size < 1000) {
      throw new Error('Audio file too small - may not be valid audio data');
    }
    
    // Validate blob type and correct if necessary
    let validatedBlob = audioBlob;
    if (!audioBlob.type.startsWith('audio/') && audioBlob.type !== 'audio/mpeg') {
      console.warn('Blob type is not audio, attempting to correct:', audioBlob.type);
      
      // If it's HTML or text, reject it
      if (audioBlob.type.includes('html') || audioBlob.type.includes('text')) {
        throw new Error(`Invalid audio data - received ${audioBlob.type} instead of audio`);
      }
      
      // Create new blob with correct audio MIME type
      validatedBlob = new Blob([audioBlob], { type: 'audio/mpeg' });
    }
    
    console.log('Storing audio file:', {
      originalSize: audioBlob.size,
      validatedSize: validatedBlob.size,
      originalType: audioBlob.type,
      validatedType: validatedBlob.type,
      filename: metadata.filename
    });
    
    const id = this.generateId();
    const audioFile = {
      id,
      blob: validatedBlob,
      filename: metadata.filename,
      title: metadata.title || metadata.filename,
      originalName: metadata.originalName,
      source: metadata.source || 'upload', // 'upload', 'youtube'
      size: validatedBlob.size,
      type: validatedBlob.type,
      dateAdded: new Date(),
      metadata: {
        duration: metadata.duration,
        sampleRate: metadata.sampleRate,
        keyInfo: metadata.keyInfo
      }
    };

    const transaction = this.db.transaction(['audioFiles'], 'readwrite');
    const store = transaction.objectStore('audioFiles');
    await this.promisifyRequest(store.add(audioFile));
    
    // Update storage stats
    this.updateStorageStats();
    
    return audioFile;
  }

  // Store transposed audio
  async storeTransposedFile(originalId, transposedBlob, semitones, keyInfo) {
    if (!this.db) await this.init();
    
    const id = this.generateId();
    const transposedFile = {
      id,
      originalId,
      blob: transposedBlob,
      semitones,
      keyInfo,
      size: transposedBlob.size,
      type: transposedBlob.type || 'audio/mpeg',
      dateCreated: new Date()
    };

    const transaction = this.db.transaction(['transposedFiles'], 'readwrite');
    const store = transaction.objectStore('transposedFiles');
    await this.promisifyRequest(store.add(transposedFile));
    
    return transposedFile;
  }

  // Get audio file by ID
  async getAudioFile(id) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['audioFiles'], 'readonly');
    const store = transaction.objectStore('audioFiles');
    return this.promisifyRequest(store.get(id));
  }

  // Update audio file metadata
  async updateAudioFileMetadata(id, updatedMetadata) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['audioFiles'], 'readwrite');
    const store = transaction.objectStore('audioFiles');
    
    // Get the existing file
    const existingFile = await this.promisifyRequest(store.get(id));
    if (!existingFile) {
      throw new Error('Audio file not found');
    }
    
    // Update the metadata while preserving the blob and other essential data
    const updatedFile = {
      ...existingFile,
      ...updatedMetadata,
      id: existingFile.id, // Preserve original ID
      blob: existingFile.blob, // Preserve original blob
      dateCreated: existingFile.dateCreated, // Preserve creation date
      dateUpdated: new Date()
    };
    
    await this.promisifyRequest(store.put(updatedFile));
    this.updateStorageStats();
    
    return updatedFile;
  }

  // Get all audio files
  async getAllAudioFiles() {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['audioFiles'], 'readonly');
    const store = transaction.objectStore('audioFiles');
    return this.promisifyRequest(store.getAll());
  }

  // Get transposed versions of a file
  async getTransposedFiles(originalId) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['transposedFiles'], 'readonly');
    const store = transaction.objectStore('transposedFiles');
    const index = store.index('originalId');
    return this.promisifyRequest(index.getAll(originalId));
  }

  // Delete audio file and its transposed versions
  async deleteAudioFile(id) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['audioFiles', 'transposedFiles'], 'readwrite');
    
    // Delete main file
    const audioStore = transaction.objectStore('audioFiles');
    await this.promisifyRequest(audioStore.delete(id));
    
    // Delete transposed versions
    const transposedStore = transaction.objectStore('transposedFiles');
    const index = transposedStore.index('originalId');
    const transposedFiles = await this.promisifyRequest(index.getAll(id));
    
    for (const file of transposedFiles) {
      await this.promisifyRequest(transposedStore.delete(file.id));
    }
    
    this.updateStorageStats();
  }

  // Get storage statistics
  async getStorageStats() {
    if (!this.db) await this.init();
    
    const audioFiles = await this.getAllAudioFiles();
    const totalSize = audioFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    const count = audioFiles.length;
    
    // Get storage quota
    let quota = 0, usage = 0;
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      quota = estimate.quota || 0;
      usage = estimate.usage || 0;
    }
    
    return {
      totalFiles: count,
      totalSize,
      quota,
      usage,
      available: quota - usage,
      percentage: quota > 0 ? (usage / quota) * 100 : 0
    };
  }

  // Create blob URL for audio playback
  createAudioURL(audioBlob) {
    return URL.createObjectURL(audioBlob);
  }

  // Clean up blob URL
  revokeAudioURL(url) {
    URL.revokeObjectURL(url);
  }

  // Search audio files
  async searchAudioFiles(query) {
    const files = await this.getAllAudioFiles();
    const lowercaseQuery = query.toLowerCase();
    
    return files.filter(file => 
      file.title.toLowerCase().includes(lowercaseQuery) ||
      file.filename.toLowerCase().includes(lowercaseQuery) ||
      (file.metadata.artist && file.metadata.artist.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Export library as JSON
  async exportLibrary() {
    const audioFiles = await this.getAllAudioFiles();
    const transposedFiles = await this.getAllTransposedFiles();
    
    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      audioFiles: audioFiles.map(file => ({
        ...file,
        blob: null // Don't export blobs in JSON
      })),
      transposedFiles: transposedFiles.map(file => ({
        ...file,
        blob: null
      }))
    };
  }

  // Utility methods
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTransposedFiles() {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['transposedFiles'], 'readonly');
    const store = transaction.objectStore('transposedFiles');
    return this.promisifyRequest(store.getAll());
  }

  // Get songs not used in any playlist
  async getSongsNotInPlaylists(usedSongIds) {
    if (!this.db) await this.init();
    
    const allSongs = await this.getAllAudioFiles();
    return allSongs.filter(song => !usedSongIds.includes(song.id));
  }

  // Update song title and trigger UI updates
  async updateSongTitle(songId, newTitle) {
    if (!this.db) await this.init();
    
    const existingSong = await this.getAudioFile(songId);
    if (!existingSong) {
      throw new Error('Song not found');
    }

    // Update the song metadata
    await this.updateAudioFileMetadata(songId, {
      title: newTitle,
      filename: newTitle // Also update filename to match title
    });

    // Trigger update events for UI refresh
    this.updateStorageStats();
    window.dispatchEvent(new CustomEvent('songTitleUpdated', { 
      detail: { songId, newTitle } 
    }));

    return await this.getAudioFile(songId);
  }

  updateStorageStats() {
    // Emit custom event for UI to update
    window.dispatchEvent(new CustomEvent('storageUpdated'));
  }
}

const localStorageService = new LocalStorageService();
export default localStorageService;