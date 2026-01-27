import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaMusic, FaHome, FaUpload, FaGoogleDrive, FaYoutube, FaExchangeAlt } from 'react-icons/fa';
import './Header.css';

const Header = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <FaMusic className="logo-icon" />
            <span className="logo-text">Karaoke Processor</span>
          </Link>
          
          <nav className="nav">
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              <FaHome />
              <span>Home</span>
            </Link>
            
            <Link 
              to="/upload" 
              className={`nav-link ${isActive('/upload') ? 'active' : ''}`}
            >
              <FaUpload />
              <span>Upload</span>
            </Link>
            
            <Link 
              to="/google-drive" 
              className={`nav-link ${isActive('/google-drive') ? 'active' : ''}`}
            >
              <FaGoogleDrive />
              <span>Drive</span>
            </Link>
            
            <Link 
              to="/youtube" 
              className={`nav-link ${isActive('/youtube') ? 'active' : ''}`}
            >
              <FaYoutube />
              <span>YouTube</span>
            </Link>
            
            <Link 
              to="/transpose" 
              className={`nav-link ${isActive('/transpose') ? 'active' : ''}`}
            >
              <FaExchangeAlt />
              <span>Transpose</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;