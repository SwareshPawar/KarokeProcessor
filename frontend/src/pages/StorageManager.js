import React, { useState, useEffect } from 'react';
import { FaTrashAlt, FaHdd, FaCloud, FaDownload, FaUpload, FaBroom } from 'react-icons/fa';
import toast from 'react-hot-toast';
import localStorageService from '../services/localStorageService';

const StorageManager = () => {
  const [storageStats, setStorageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);

  useEffect(() => {
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
    try {
      const stats = await localStorageService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Error loading storage stats:', error);
      toast.error('Failed to load storage statistics');
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm(
      'Are you sure you want to delete ALL audio files? This action cannot be undone!'
    )) {
      return;
    }

    try {
      setCleanupInProgress(true);
      await localStorageService.clearAllData();
      await loadStorageStats();
      toast.success('All data cleared successfully');
      
      // Dispatch storage update event
      window.dispatchEvent(new Event('storageUpdated'));
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data');
    } finally {
      setCleanupInProgress(false);
    }
  };

  const requestPersistentStorage = async () => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist();
        if (persistent) {
          toast.success('Persistent storage granted');
        } else {
          toast.error('Persistent storage denied');
        }
      } catch (error) {
        console.error('Error requesting persistent storage:', error);
        toast.error('Failed to request persistent storage');
      }
    } else {
      toast.error('Persistent storage not supported');
    }
  };

  const exportAllData = async () => {
    try {
      const exportData = await localStorageService.exportLibrary();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `karaoke-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Complete backup exported');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export backup');
    }
  };

  const importData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Basic validation
      if (!importData.files || !Array.isArray(importData.files)) {
        throw new Error('Invalid backup file format');
      }

      await localStorageService.importLibrary(importData);
      await loadStorageStats();
      toast.success('Library imported successfully');
      
      // Dispatch storage update event
      window.dispatchEvent(new Event('storageUpdated'));
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Failed to import library: ' + error.message);
    }
    
    // Reset file input
    event.target.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStorageColor = (percentage) => {
    if (percentage < 50) return '#4CAF50';
    if (percentage < 80) return '#FF9800';
    return '#F44336';
  };

  if (loading) {
    return (
      <div className="storage-manager">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <h1>Loading Storage Information...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="storage-manager">
      <div className="upload-section">
        <h1 className="section-title">
          <FaHdd /> Storage Manager
        </h1>
        <p className="text-center mb-6">
          Manage your device storage, backup your library, and configure storage settings.
        </p>

        {/* Storage Overview */}
        {storageStats && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Storage Overview</h2>
            
            <div className="storage-visual">
              <div className="storage-circle">
                <svg width="200" height="200" viewBox="0 0 42 42">
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <circle
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke={getStorageColor(storageStats.percentage)}
                    strokeWidth="3"
                    strokeDasharray={`${storageStats.percentage} ${100 - storageStats.percentage}`}
                    strokeDashoffset="25"
                  />
                </svg>
                <div className="storage-center">
                  <div className="storage-percentage">
                    {storageStats.percentage.toFixed(1)}%
                  </div>
                  <div className="storage-label">Used</div>
                </div>
              </div>
              
              <div className="storage-details">
                <div className="storage-item">
                  <span className="storage-label">Total Files:</span>
                  <span className="storage-value">{storageStats.totalFiles}</span>
                </div>
                <div className="storage-item">
                  <span className="storage-label">Total Size:</span>
                  <span className="storage-value">{formatFileSize(storageStats.totalSize)}</span>
                </div>
                <div className="storage-item">
                  <span className="storage-label">Available:</span>
                  <span className="storage-value">{formatFileSize(storageStats.available)}</span>
                </div>
                <div className="storage-item">
                  <span className="storage-label">Estimated Capacity:</span>
                  <span className="storage-value">{formatFileSize(storageStats.estimatedTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Storage Actions */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Storage Actions</h2>
          
          <div className="storage-actions">
            <div className="action-group">
              <h3>Backup & Restore</h3>
              <div className="action-buttons">
                <button onClick={exportAllData} className="btn btn-primary">
                  <FaDownload /> Export Complete Backup
                </button>
                
                <label className="btn btn-secondary file-input-label">
                  <FaUpload /> Import Backup
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="hidden-file-input"
                  />
                </label>
              </div>
            </div>

            <div className="action-group">
              <h3>Storage Settings</h3>
              <div className="action-buttons">
                <button onClick={requestPersistentStorage} className="btn btn-primary">
                  <FaHdd /> Request Persistent Storage
                </button>
                
                <button className="btn btn-secondary" title="Cloud sync coming soon">
                  <FaCloud /> Enable Cloud Sync
                </button>
              </div>
            </div>

            <div className="action-group danger-zone">
              <h3>Danger Zone</h3>
              <div className="action-buttons">
                <button 
                  onClick={clearAllData}
                  disabled={cleanupInProgress}
                  className="btn btn-danger"
                >
                  <FaTrashAlt /> 
                  {cleanupInProgress ? 'Clearing...' : 'Clear All Data'}
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                This will permanently delete all audio files and cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* Storage Tips */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Storage Tips</h2>
          
          <div className="storage-tips">
            <div className="tip">
              <FaBroom className="tip-icon" />
              <div>
                <h4>Regular Cleanup</h4>
                <p>Regularly review and delete unused audio files to free up space.</p>
              </div>
            </div>
            
            <div className="tip">
              <FaDownload className="tip-icon" />
              <div>
                <h4>Backup Important Files</h4>
                <p>Export your library regularly to prevent data loss.</p>
              </div>
            </div>
            
            <div className="tip">
              <FaHdd className="tip-icon" />
              <div>
                <h4>Request Persistent Storage</h4>
                <p>Enable persistent storage to prevent browser cleanup of your files.</p>
              </div>
            </div>
            
            <div className="tip">
              <FaCloud className="tip-icon" />
              <div>
                <h4>Cloud Sync (Coming Soon)</h4>
                <p>Sync your library with Google Drive for automatic backups.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageManager;