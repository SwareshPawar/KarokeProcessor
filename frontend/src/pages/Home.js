import React from 'react';
import { Link } from 'react-router-dom';
import { FaUpload, FaGoogleDrive, FaYoutube, FaMusic, FaExchangeAlt, FaVolumeUp } from 'react-icons/fa';

const Home = ({ currentAudio }) => {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">🎵 Karaoke Processor</h1>
        <p className="hero-subtitle">
          Transform any song to match your vocal range. Upload from your device, 
          Google Drive, or YouTube, then transpose to your perfect key.
        </p>
        <div className="cta-buttons">
          <Link to="/upload" className="btn btn-primary">
            <FaUpload />
            Get Started
          </Link>
          <Link to="/transpose" className="btn btn-secondary">
            <FaExchangeAlt />
            Try Transpose
          </Link>
        </div>
      </section>

      {/* Current Audio Display */}
      {currentAudio && (
        <section className="current-audio-section">
          <div className="card">
            <h2 className="section-title">
              <FaMusic /> Current Audio
            </h2>
            <div className="audio-info">
              <h3 className="audio-title">{currentAudio.originalName || currentAudio.title}</h3>
              <div className="audio-details">
                {currentAudio.metadata && (
                  <>
                    <div className="audio-detail">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">
                        {Math.floor(currentAudio.metadata.duration / 60)}:
                        {(currentAudio.metadata.duration % 60).toFixed(0).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="audio-detail">
                      <span className="detail-label">Sample Rate:</span>
                      <span className="detail-value">{currentAudio.metadata.sampleRate} Hz</span>
                    </div>
                    <div className="audio-detail">
                      <span className="detail-label">Channels:</span>
                      <span className="detail-value">{currentAudio.metadata.channels}</span>
                    </div>
                    <div className="audio-detail">
                      <span className="detail-label">Size:</span>
                      <span className="detail-value">
                        {(currentAudio.file?.size || currentAudio.metadata.size || 0 / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="audio-actions mt-4">
                <Link to="/transpose" className="btn btn-primary">
                  <FaExchangeAlt />
                  Transpose This Audio
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">How It Works</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <FaUpload />
            </div>
            <h3 className="feature-title">1. Upload Your Music</h3>
            <p className="feature-description">
              Import audio files from your device, Google Drive, or paste a YouTube link. 
              Supports MP3, WAV, AAC, and more formats.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <FaExchangeAlt />
            </div>
            <h3 className="feature-title">2. Transpose to Your Key</h3>
            <p className="feature-description">
              Adjust the pitch up or down by ±12 semitones. Perfect for matching your vocal range 
              or practicing in different keys.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <FaVolumeUp />
            </div>
            <h3 className="feature-title">3. Practice & Perform</h3>
            <p className="feature-description">
              Download your transposed audio and start practicing. See the original and new 
              musical scales displayed clearly.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Start Options */}
      <section className="quick-start-section">
        <h2 className="section-title">Choose Your Input Method</h2>
        <div className="grid grid-2">
          <div className="card">
            <div className="feature-icon">
              <FaUpload />
            </div>
            <h3 className="feature-title">Upload Files</h3>
            <p className="feature-description">
              Drag and drop audio files or browse from your computer. 
              Quick and easy for local music files.
            </p>
            <Link to="/upload" className="btn btn-primary mt-4">
              Upload Audio
            </Link>
          </div>

          <div className="card">
            <div className="feature-icon">
              <FaGoogleDrive />
            </div>
            <h3 className="feature-title">Google Drive</h3>
            <p className="feature-description">
              Connect your Google Drive account and access your music library 
              stored in the cloud.
            </p>
            <Link to="/google-drive" className="btn btn-primary mt-4">
              Connect Drive
            </Link>
          </div>

          <div className="card">
            <div className="feature-icon">
              <FaYoutube />
            </div>
            <h3 className="feature-title">YouTube</h3>
            <p className="feature-description">
              Paste any YouTube video URL and extract the audio for 
              transposition and practice.
            </p>
            <Link to="/youtube" className="btn btn-primary mt-4">
              Use YouTube
            </Link>
          </div>

          <div className="card">
            <div className="feature-icon">
              <FaMusic />
            </div>
            <h3 className="feature-title">Musical Features</h3>
            <p className="feature-description">
              • Key detection and display<br/>
              • ±12 semitone range<br/>
              • Interval identification<br/>
              • High-quality audio processing
            </p>
            <Link to="/transpose" className="btn btn-secondary mt-4">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <h2 className="cta-title">Ready to Start Practicing?</h2>
        <p className="mb-6">
          Transform any song into your perfect key and take your musical practice to the next level.
        </p>
        <div className="cta-buttons">
          <Link to="/upload" className="btn btn-primary">
            <FaUpload />
            Upload Audio
          </Link>
          <Link to="/youtube" className="btn btn-success">
            <FaYoutube />
            Try with YouTube
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;