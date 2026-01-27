import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { FaUpload, FaMusic, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import ApiService from '../services/api';

const Upload = ({ setCurrentAudio }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) {
      toast.error('Please select a valid audio file');
      return;
    }

    const file = acceptedFiles[0];
    
    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await ApiService.uploadAudio(file, (progress) => {
        setUploadProgress(progress);
      });

      const audioData = {
        ...response.data.file,
        originalName: file.name,
        metadata: response.data.metadata,
        filename: response.data.file.filename  // Make sure filename is available
      };

      setUploadedFile(audioData);
      setCurrentAudio(audioData);
      
      toast.success(`Successfully uploaded ${file.name}`);
    } catch (error) {
      const errorInfo = ApiService.handleApiError(error);
      toast.error(errorInfo.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac']
    },
    multiple: false,
    maxSize: 50 * 1024 * 1024
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="upload-page">
      <div className="upload-section">
        <h1 className="section-title">
          <FaUpload /> Upload Audio File
        </h1>
        <p className="text-center mb-6">
          Upload an audio file from your device to get started with transposition.
          Supports MP3, WAV, AAC, M4A, OGG, and FLAC formats.
        </p>

        {/* Upload Area */}
        <div className="card">
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''}`}
          >
            <input {...getInputProps()} />
            
            {uploading ? (
              <div className="loading">
                <FaSpinner className="spinner" />
                <div className="dropzone-text">Uploading...</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <div className="dropzone-hint">{uploadProgress}% complete</div>
              </div>
            ) : (
              <>
                <FaMusic className="dropzone-icon" />
                <div className="dropzone-text">
                  {isDragActive ? 'Drop the audio file here' : 'Drag and drop an audio file here'}
                </div>
                <div className="dropzone-hint">
                  or click to browse files (MP3, WAV, AAC, M4A, OGG, FLAC)
                </div>
                <div className="dropzone-hint mt-4">
                  Maximum file size: 50MB
                </div>
              </>
            )}
          </div>
        </div>

        {/* Upload Success */}
        {uploadedFile && (
          <div className="card mt-6">
            <div className="flex items-center gap-4 mb-4">
              <FaCheckCircle className="text-2xl" style={{ color: '#10b981' }} />
              <h2 className="text-xl font-semibold">Upload Successful!</h2>
            </div>
            
            <div className="audio-info">
              <h3 className="audio-title">{uploadedFile.originalName}</h3>
              
              {uploadedFile.metadata && (
                <div className="audio-details">
                  <div className="audio-detail">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">
                      {formatDuration(uploadedFile.metadata.duration)}
                    </span>
                  </div>
                  <div className="audio-detail">
                    <span className="detail-label">Size:</span>
                    <span className="detail-value">
                      {formatFileSize(uploadedFile.size)}
                    </span>
                  </div>
                  <div className="audio-detail">
                    <span className="detail-label">Sample Rate:</span>
                    <span className="detail-value">{uploadedFile.metadata.sampleRate} Hz</span>
                  </div>
                  <div className="audio-detail">
                    <span className="detail-label">Channels:</span>
                    <span className="detail-value">
                      {uploadedFile.metadata.channels} 
                      {uploadedFile.metadata.channels === 1 ? ' (Mono)' : ' (Stereo)'}
                    </span>
                  </div>
                  <div className="audio-detail">
                    <span className="detail-label">Bitrate:</span>
                    <span className="detail-value">
                      {Math.round(uploadedFile.metadata.bitrate / 1000)} kbps
                    </span>
                  </div>
                  <div className="audio-detail">
                    <span className="detail-label">Format:</span>
                    <span className="detail-value">{uploadedFile.metadata.codec}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Link 
                  to="/transpose" 
                  className="btn btn-primary"
                >
                  <FaMusic />
                  Start Transposing
                </Link>
                <button 
                  onClick={() => {
                    setUploadedFile(null);
                    setCurrentAudio(null);
                  }}
                  className="btn btn-secondary"
                >
                  Upload Another
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Supported Formats */}
        <div className="card mt-6">
          <h3 className="text-lg font-semibold mb-4">Supported Audio Formats</h3>
          <div className="grid grid-2">
            <div>
              <h4 className="font-medium mb-2">Common Formats:</h4>
              <ul className="space-y-1 text-sm">
                <li>• MP3 - Most common compressed format</li>
                <li>• WAV - Uncompressed, high quality</li>
                <li>• AAC - Advanced Audio Codec</li>
                <li>• M4A - Apple's audio format</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Advanced Formats:</h4>
              <ul className="space-y-1 text-sm">
                <li>• OGG - Open source compressed format</li>
                <li>• FLAC - Lossless compression</li>
                <li>• Maximum file size: 50MB</li>
                <li>• All formats converted to MP3 output</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;