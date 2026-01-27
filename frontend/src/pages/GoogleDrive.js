import React, { useState, useEffect } from 'react';
import { FaGoogleDrive, FaSpinner, FaDownload, FaSearch, FaExternalLinkAlt, FaKey } from 'react-icons/fa';
import toast from 'react-hot-toast';
import ApiService from '../services/api';

const GoogleDrive = ({ setCurrentAudio }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await ApiService.getGoogleDriveStatus();
      setIsAuthenticated(response.data.authenticated);
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  const handleAuthenticate = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getGoogleDriveAuthUrl();
      
      // Open Google OAuth in new window
      window.open(response.data.authUrl, '_blank', 'width=500,height=600');
      
      // Note: In a real implementation, you'd handle the OAuth callback
      // For now, show instructions to user
      toast.success('Please complete the authentication in the new window');
    } catch (error) {
      const errorInfo = ApiService.handleApiError(error);
      toast.error(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await ApiService.listGoogleDriveFiles();
      setFiles(response.data.files);
    } catch (error) {
      const errorInfo = ApiService.handleApiError(error);
      if (errorInfo.requiresAuth) {
        setIsAuthenticated(false);
        toast.error('Please authenticate with Google Drive first');
      } else {
        toast.error(errorInfo.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const searchFiles = async () => {
    if (!searchTerm.trim()) {
      loadFiles();
      return;
    }

    try {
      setLoading(true);
      const response = await ApiService.searchGoogleDriveFiles(searchTerm);
      setFiles(response.data.results);
    } catch (error) {
      const errorInfo = ApiService.handleApiError(error);
      toast.error(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (file) => {
    try {
      setDownloading(prev => ({ ...prev, [file.id]: true }));
      
      const response = await ApiService.downloadFromGoogleDrive(file.id);
      
      const audioData = {
        filename: response.data.filename,
        originalName: file.name,
        size: file.size,
        source: 'google-drive'
      };

      setCurrentAudio(audioData);
      toast.success(`Successfully downloaded ${file.name}`);
      
    } catch (error) {
      const errorInfo = ApiService.handleApiError(error);
      toast.error(errorInfo.message);
    } finally {
      setDownloading(prev => ({ ...prev, [file.id]: false }));
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isAuthenticated) {
    return (
      <div className="google-drive-page">
        <div className="auth-section">
          <div className="auth-icon">
            <FaGoogleDrive />
          </div>
          <h1 className="text-2xl font-bold mb-4">Connect to Google Drive</h1>
          <p className="mb-6 opacity-75">
            Authenticate with your Google account to access and download audio files 
            from your Google Drive.
          </p>
          
          <button 
            onClick={handleAuthenticate}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <><FaSpinner className="spinner" /> Connecting...</>
            ) : (
              <><FaKey /> Connect Google Drive</>
            )}
          </button>
          
          <div className="mt-6 text-sm opacity-75">
            <p>This will open a new window for secure authentication.</p>
            <p>After authentication, refresh this page to continue.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="google-drive-page">
      <div className="upload-section">
        <h1 className="section-title">
          <FaGoogleDrive /> Google Drive Audio Files
        </h1>
        <p className="text-center mb-6">
          Browse and download audio files from your Google Drive account.
        </p>

        {/* Search and Load Controls */}
        <div className="card">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Search for audio files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchFiles()}
              className="input flex-1"
            />
            <button 
              onClick={searchFiles}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? <FaSpinner className="spinner" /> : <FaSearch />}
              Search
            </button>
          </div>
          
          <button 
            onClick={loadFiles}
            disabled={loading}
            className="btn btn-secondary"
          >
            {loading ? <FaSpinner className="spinner" /> : <FaGoogleDrive />}
            Load All Audio Files
          </button>
        </div>

        {/* Files List */}
        {files.length > 0 && (
          <div className="card mt-6">
            <h2 className="text-xl font-semibold mb-4">
              Audio Files ({files.length})
            </h2>
            
            <div className="file-list">
              {files.map((file) => (
                <div key={file.id} className="file-item">
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-meta">
                      Size: {formatFileSize(file.size)} • 
                      Modified: {formatDate(file.modifiedTime)} • 
                      Type: {file.mimeType.split('/')[1].toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="file-actions">
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                    >
                      <FaExternalLinkAlt />
                      View
                    </a>
                    
                    {file.downloadable ? (
                      <button
                        onClick={() => downloadFile(file)}
                        disabled={downloading[file.id]}
                        className="btn btn-primary btn-sm"
                      >
                        {downloading[file.id] ? (
                          <><FaSpinner className="spinner" /> Downloading</>
                        ) : (
                          <><FaDownload /> Download</>
                        )}
                      </button>
                    ) : (
                      <button className="btn btn-secondary btn-sm opacity-50" disabled>
                        Unsupported Format
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Files Message */}
        {!loading && files.length === 0 && (
          <div className="card mt-6 text-center">
            <FaGoogleDrive className="text-4xl opacity-50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Audio Files Found</h3>
            <p className="opacity-75 mb-4">
              {searchTerm ? 
                `No audio files found matching "${searchTerm}"` : 
                'No audio files found in your Google Drive'
              }
            </p>
            <button onClick={loadFiles} className="btn btn-primary">
              <FaGoogleDrive />
              Refresh Files
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card mt-6 text-center">
            <FaSpinner className="spinner text-2xl mb-4" />
            <p>Loading audio files from Google Drive...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleDrive;