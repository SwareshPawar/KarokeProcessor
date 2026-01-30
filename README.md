# Karaoke Processor

A comprehensive web application for audio transposition and karaoke practice. Upload audio files from your device, Google Drive, or YouTube, then transpose them to match your vocal range.

## 🎵 Features

- **Multiple Input Sources**: Upload from device, Google Drive, or YouTube
- **Audio Transposition**: Transpose songs ±12 semitones with high-quality processing
- **Key Detection**: Automatically detect and display original and transposed keys
- **Scale Information**: View musical intervals and scale changes
- **Musician-Friendly**: Perfect for vocalists and instrumentalists to practice in their preferred key
- **Modern Interface**: Clean, responsive web interface with real-time audio preview

## 🛠️ Technology Stack

**Backend:**
- Node.js with Express.js
- FFmpeg for audio processing
- Google Drive API integration
- YouTube audio extraction
- Audio transposition with pitch shifting

**Frontend:**
- React.js with modern hooks
- Responsive design with CSS Grid/Flexbox
- File drag-and-drop interface
- Real-time audio playback
- Interactive transposition controls

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- FFmpeg installed on your system
- Google Cloud Console project (for Google Drive integration)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd KarokeProcessor
   ```

2. **Install dependencies:**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   # Backend configuration
   cd backend
   cp .env.example .env
   # Edit .env with your configurations
   
   # Frontend configuration
   cd ../frontend
   cp .env.example .env
   # Edit .env with your API URL
   ```

4. **Set up Google Drive API (optional):**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Drive API
   - Create OAuth 2.0 credentials
   - Add your credentials to backend `.env` file

5. **Start the development servers:**
   ```bash
   # Start backend (from backend directory)
   npm run dev
   
   # Start frontend (from frontend directory)
   npm start
   ```

6. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 📖 Usage

### 1. Upload Audio
- **Local Files**: Drag and drop or browse for audio files (MP3, WAV, AAC, etc.)
- **Google Drive**: Connect your account and browse your cloud music library
- **YouTube**: Paste any YouTube URL to extract audio

### 2. Transpose Audio
- Select your uploaded audio file
- Use the slider to adjust semitones (-12 to +12)
- See real-time key changes and musical intervals
- Process and download the transposed audio

### 3. Practice
- Play the original and transposed versions
- See the original key and new key displayed
- Download for offline practice

## 🔧 API Endpoints

### Audio Processing
- `POST /api/audio/upload` - Upload audio file
- `POST /api/audio/transpose` - Transpose audio by semitones
- `POST /api/audio/analyze` - Analyze audio for key detection
- `GET /api/audio/download/:filename` - Download processed audio

### Google Drive Integration
- `GET /api/google-drive/auth-url` - Get OAuth authorization URL
- `POST /api/google-drive/auth-callback` - Handle OAuth callback
- `GET /api/google-drive/files` - List audio files from Drive
- `POST /api/google-drive/download` - Download file from Drive

### YouTube Integration
- `POST /api/youtube/video-info` - Get video information
- `POST /api/youtube/download-audio` - Extract and download audio
- `POST /api/youtube/validate-url` - Validate YouTube URL

## 🎵 Musical Features

### Supported Transpositions
- Range: ±12 semitones (full octave up or down)
- High-quality pitch shifting preserves audio quality
- Real-time preview of key changes

### Key Detection
- Automatic detection of original song key
- Display of musical intervals (Perfect Fifth, Major Third, etc.)
- Support for both major and minor scales

### Supported Audio Formats
- **Input**: MP3, WAV, AAC, M4A, OGG, FLAC
- **Output**: MP3 (128kbps, 44.1kHz)
- **Processing**: FFmpeg with rubberband for pitch shifting

## 🔐 Configuration

### Google Drive Setup
1. Create project in Google Cloud Console
2. Enable Google Drive API
3. Create OAuth 2.0 client ID
4. Add authorized redirect URIs
5. Configure credentials in `.env` file

### FFmpeg Installation
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# macOS with Homebrew
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

## 🚀 Deployment

The application automatically detects its deployment platform and configures itself accordingly. No manual platform switching is required.

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Deploy - the app automatically detects it's running on Vercel
3. File upload limit: 4MB (Vercel serverless function limitation)

### Render Deployment  
1. Connect your GitHub repository to Render
2. Set environment variable `REACT_APP_RENDER=1` in Render dashboard
3. Deploy - the app automatically detects it's running on Render  
4. File upload limit: 50MB

### Local Development
```bash
# Backend
cd backend
npm start

# Frontend  
cd frontend
npm start
```
File upload limit: 50MB

### Platform Detection
The app automatically detects the deployment platform using:
- **Vercel**: Hostname contains 'vercel.app' or `REACT_APP_VERCEL` is set
- **Render**: Hostname contains 'onrender.com' or `REACT_APP_RENDER` is set  
- **Local**: Default fallback for development

### Environment Variables
- No platform-specific environment files needed
- Vercel: Automatically sets `REACT_APP_VERCEL=1`
- Render: Manually set `REACT_APP_RENDER=1` in dashboard
- Optional: Override API URL with `REACT_APP_API_URL`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- FFmpeg team for audio processing capabilities
- YouTube-dl contributors for video extraction
- Google Drive API for cloud integration
- React and Node.js communities

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

## 🛠️ Development

### Project Structure
```
KarokeProcessor/
├── backend/
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── server.js        # Express server
│   ├── uploads/             # Temporary file storage
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API integration
│   │   └── App.js          # Main app component
│   └── package.json
└── README.md
```

### Scripts
```bash
# Backend
npm run dev          # Start development server
npm start           # Start production server
npm test            # Run tests

# Frontend
npm start           # Start development server
npm run build       # Build for production
npm test            # Run tests
```

---

**Made with ❤️ for musicians who want to practice in their perfect key!** 🎵
