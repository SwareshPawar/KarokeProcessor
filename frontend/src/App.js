import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Upload from './pages/Upload';
import GoogleDrive from './pages/GoogleDrive';
import YouTube from './pages/YouTube';
import Transpose from './pages/Transpose';
import Library from './pages/Library';
import StorageManager from './pages/StorageManager';
import './App.css';

function App() {
  const [currentAudio, setCurrentAudioState] = useState(null);

  // Load from localStorage on app start
  useEffect(() => {
    const savedAudio = localStorage.getItem('currentAudio');
    if (savedAudio) {
      try {
        setCurrentAudioState(JSON.parse(savedAudio));
      } catch (error) {
        console.error('Error parsing saved audio:', error);
        localStorage.removeItem('currentAudio');
      }
    }
  }, []);

  // Wrapper function to save to localStorage
  const setCurrentAudio = (audioData) => {
    setCurrentAudioState(audioData);
    if (audioData) {
      localStorage.setItem('currentAudio', JSON.stringify(audioData));
    } else {
      localStorage.removeItem('currentAudio');
    }
  };

  return (
    <div className="App">
      <Header />
      <main className="main-content">
        <div className="container">
          <Routes>
            <Route 
              path="/" 
              element={<Home currentAudio={currentAudio} />} 
            />
            <Route 
              path="/upload" 
              element={<Upload setCurrentAudio={setCurrentAudio} />} 
            />
            <Route 
              path="/google-drive" 
              element={<GoogleDrive setCurrentAudio={setCurrentAudio} />} 
            />
            <Route 
              path="/youtube" 
              element={<YouTube setCurrentAudio={setCurrentAudio} />} 
            />
            <Route 
              path="/transpose" 
              element={<Transpose currentAudio={currentAudio} setCurrentAudio={setCurrentAudio} />} 
            />
            <Route 
              path="/library" 
              element={<Library />} 
            />
            <Route 
              path="/storage" 
              element={<StorageManager />} 
            />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
