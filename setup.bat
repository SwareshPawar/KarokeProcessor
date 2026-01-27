@echo off
echo 🎵 Karaoke Processor Setup
echo =========================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected: 
node --version

REM Check if FFmpeg is installed
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  FFmpeg is not installed. Audio processing will not work without it.
    echo    Download from https://ffmpeg.org/download.html
    set /p "continue=Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
) else (
    echo ✅ FFmpeg detected
)

REM Install backend dependencies
echo.
echo 📦 Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed

REM Install frontend dependencies
echo.
echo 📦 Installing frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)
echo ✅ Frontend dependencies installed

REM Create environment files
echo.
echo 🔧 Setting up environment files...
cd ..

REM Backend environment
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
    echo ✅ Created backend\.env from template
    echo    Please edit backend\.env with your configuration
) else (
    echo ⚠️  backend\.env already exists
)

REM Frontend environment
if not exist "frontend\.env" (
    copy "frontend\.env.example" "frontend\.env" >nul
    echo ✅ Created frontend\.env from template
) else (
    echo ⚠️  frontend\.env already exists
)

REM Create uploads directory
if not exist "backend\uploads" mkdir "backend\uploads"
echo ✅ Created uploads directory

echo.
echo 🎉 Setup complete!
echo.
echo 📝 Next steps:
echo 1. Edit backend\.env with your Google Drive API credentials (optional)
echo 2. Edit frontend\.env if needed
echo 3. Start the backend server:
echo    cd backend && npm run dev
echo 4. In a new terminal, start the frontend:
echo    cd frontend && npm start
echo 5. Open http://localhost:3000 in your browser
echo.
echo 📖 For detailed setup instructions, see README.md
echo.
echo 🔐 Google Drive Integration Setup:
echo 1. Go to https://console.cloud.google.com/
echo 2. Create a new project or select existing
echo 3. Enable Google Drive API
echo 4. Create OAuth 2.0 credentials
echo 5. Add http://localhost:3001/api/google-drive/auth-callback to redirect URIs
echo 6. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend\.env

pause