import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Upload from './pages/Upload';
import GoogleDrive from './pages/GoogleDrive';
import YouTube from './pages/YouTube';
import Transpose from './pages/Transpose';
import './App.css';

function App() {
  const [currentAudio, setCurrentAudio] = useState(null);

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
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
