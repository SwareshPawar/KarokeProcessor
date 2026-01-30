import { API_BASE_URL } from '../utils/api';

class GoogleDriveService {
  constructor() {
    this.gapi = null;
    this.isSignedIn = false;
    this.currentUser = null;
  }

  /**
   * Initialize Google Drive API
   */
  async init() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        window.gapi.load('auth2', {
          callback: () => {
            window.gapi.auth2.init({
              client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/drive.file'
            }).then(() => {
              this.gapi = window.gapi;
              const authInstance = window.gapi.auth2.getAuthInstance();
              this.isSignedIn = authInstance.isSignedIn.get();
              if (this.isSignedIn) {
                this.currentUser = authInstance.currentUser.get();
              }
              resolve();
            }).catch(reject);
          },
          onerror: reject
        });
      } else {
        // Load Google API script
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          this.init().then(resolve).catch(reject);
        };
        script.onerror = reject;
        document.head.appendChild(script);
      }
    });
  }

  /**
   * Sign in to Google Drive
   */
  async signIn() {
    if (!this.gapi) {
      await this.init();
    }
    
    const authInstance = this.gapi.auth2.getAuthInstance();
    const user = await authInstance.signIn();
    this.isSignedIn = true;
    this.currentUser = user;
    return user;
  }

  /**
   * Sign out from Google Drive
   */
  async signOut() {
    if (this.gapi) {
      const authInstance = this.gapi.auth2.getAuthInstance();
      await authInstance.signOut();
      this.isSignedIn = false;
      this.currentUser = null;
    }
  }

  /**
   * Check if user is signed in
   */
  isAuthenticated() {
    return this.isSignedIn;
  }

  /**
   * Get current user info
   */
  getCurrentUser() {
    if (this.currentUser) {
      const profile = this.currentUser.getBasicProfile();
      return {
        id: profile.getId(),
        name: profile.getName(),
        email: profile.getEmail(),
        imageUrl: profile.getImageUrl()
      };
    }
    return null;
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(file, metadata = {}) {
    if (!this.isSignedIn) {
      throw new Error('Not authenticated with Google Drive');
    }

    await this.gapi.load('client');
    await this.gapi.client.init({
      apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
      clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      scope: 'https://www.googleapis.com/auth/drive.file'
    });

    const fileMetadata = {
      name: metadata.name || file.name,
      parents: metadata.parents || undefined,
      description: metadata.description || 'Karaoke Processor backup file'
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({
        'Authorization': `Bearer ${this.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token}`
      }),
      body: form
    });

    if (!response.ok) {
      throw new Error('Failed to upload file to Google Drive');
    }

    return await response.json();
  }

  /**
   * Download a file from Google Drive
   */
  async downloadFile(fileId) {
    if (!this.isSignedIn) {
      throw new Error('Not authenticated with Google Drive');
    }

    const response = await this.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });

    return response.body;
  }

  /**
   * List files in Google Drive
   */
  async listFiles(query = "name contains 'karaoke'") {
    if (!this.isSignedIn) {
      throw new Error('Not authenticated with Google Drive');
    }

    const response = await this.gapi.client.drive.files.list({
      q: query,
      fields: 'files(id,name,size,modifiedTime,description)'
    });

    return response.result.files;
  }

  /**
   * Delete a file from Google Drive
   */
  async deleteFile(fileId) {
    if (!this.isSignedIn) {
      throw new Error('Not authenticated with Google Drive');
    }

    await this.gapi.client.drive.files.delete({
      fileId: fileId
    });
  }

  /**
   * Sync local library to Google Drive
   */
  async syncToCloud(exportData) {
    if (!this.isSignedIn) {
      throw new Error('Not authenticated with Google Drive');
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const metadata = {
      name: `karaoke-library-${new Date().toISOString()}.json`,
      description: 'Karaoke Processor library backup'
    };

    return await this.uploadFile(blob, metadata);
  }

  /**
   * Download library from Google Drive
   */
  async downloadLibraryFromCloud() {
    if (!this.isSignedIn) {
      throw new Error('Not authenticated with Google Drive');
    }

    const files = await this.listFiles("name contains 'karaoke-library' and mimeType='application/json'");
    
    if (files.length === 0) {
      throw new Error('No library backup found in Google Drive');
    }

    // Get the most recent backup
    const latestFile = files.sort((a, b) => 
      new Date(b.modifiedTime) - new Date(a.modifiedTime)
    )[0];

    const fileContent = await this.downloadFile(latestFile.id);
    return JSON.parse(fileContent);
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(name, parentId = null) {
    if (!this.isSignedIn) {
      throw new Error('Not authenticated with Google Drive');
    }

    const metadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined
    };

    const response = await this.gapi.client.drive.files.create({
      resource: metadata
    });

    return response.result;
  }

  /**
   * Auto-sync functionality
   */
  async enableAutoSync(intervalMinutes = 30) {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(async () => {
      try {
        if (this.isSignedIn) {
          const localStorageService = await import('./localStorageService');
          const exportData = await localStorageService.default.exportLibrary();
          await this.syncToCloud(exportData);
          console.log('Auto-sync completed successfully');
        }
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Disable auto-sync
   */
  disableAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    if (!this.isSignedIn) {
      return { status: 'not_authenticated' };
    }

    try {
      const files = await this.listFiles("name contains 'karaoke-library' and mimeType='application/json'");
      const lastSync = files.length > 0 ? 
        files.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime))[0].modifiedTime :
        null;

      return {
        status: 'authenticated',
        lastSync: lastSync,
        backupCount: files.length,
        autoSyncEnabled: !!this.autoSyncInterval
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

export default new GoogleDriveService();