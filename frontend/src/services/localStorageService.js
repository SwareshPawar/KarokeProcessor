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
    
    const id = this.generateId();
    const audioFile = {
      id,
      blob: audioBlob,
      filename: metadata.filename,
      title: metadata.title || metadata.filename,
      originalName: metadata.originalName,
      source: metadata.source || 'upload', // 'upload', 'youtube'
      size: audioBlob.size,
      type: audioBlob.type || 'audio/mpeg',
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

  updateStorageStats() {
    // Emit custom event for UI to update
    window.dispatchEvent(new CustomEvent('storageUpdated'));
  }
}

export default new LocalStorageService();