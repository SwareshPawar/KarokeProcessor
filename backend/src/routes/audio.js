const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const AudioProcessor = require('../services/audioProcessor');

const router = express.Router();
const audioProcessor = new AudioProcessor();

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
const ensureUploadsDir = () => {
  const fs = require('fs');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDir(); // Ensure directory exists before each upload
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/aac',
      'audio/mp4',
      'audio/x-m4a',
      'audio/ogg',
      'audio/flac',
      'audio/x-flac'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported audio format'), false);
    }
  }
});

/**
 * POST /api/audio/upload
 * Upload an audio file
 */
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const metadata = await audioProcessor.getAudioMetadata(req.file.path);
    
    res.json({
      message: 'Audio file uploaded successfully',
      file: {
        id: path.basename(req.file.filename, path.extname(req.file.filename)),
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      metadata: metadata
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/audio/transpose
 * Transpose an audio file
 */
router.post('/transpose', async (req, res) => {
  try {
    const { filename, semitones, originalKey, mode } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    if (semitones === undefined || semitones < -12 || semitones > 12) {
      return res.status(400).json({ error: 'Semitones must be between -12 and +12' });
    }

    const inputPath = path.join(__dirname, '../../uploads', filename);
    const outputFilename = `transposed_${semitones > 0 ? 'up' : 'down'}_${Math.abs(semitones)}_${filename}`;
    const outputPath = path.join(__dirname, '../../uploads', outputFilename);

    // Check if input file exists
    try {
      await fs.access(inputPath);
    } catch (error) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Transpose the audio
    const transposedPath = await audioProcessor.transposeAudio(inputPath, semitones, outputPath);
    const metadata = await audioProcessor.getAudioMetadata(transposedPath);

    // Calculate key change if original key is provided
    let keyInfo = null;
    if (originalKey && mode) {
      keyInfo = audioProcessor.calculateNewKey(originalKey, mode, semitones);
    }

    res.json({
      message: 'Audio transposed successfully',
      originalFile: filename,
      transposedFile: path.basename(transposedPath),
      semitones: semitones,
      metadata: metadata,
      keyInfo: keyInfo
    });
  } catch (error) {
    console.error('Transpose error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/audio/analyze
 * Analyze audio file for key detection
 */
router.post('/analyze', async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const audioPath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    try {
      await fs.access(audioPath);
    } catch (error) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Get metadata and detect key
    const [metadata, keyInfo] = await Promise.all([
      audioProcessor.getAudioMetadata(audioPath),
      audioProcessor.detectKey(audioPath)
    ]);

    res.json({
      filename: filename,
      metadata: metadata,
      keyInfo: keyInfo,
      supportedTranspositions: Array.from({ length: 25 }, (_, i) => i - 12)
        .filter(semitones => semitones !== 0)
        .map(semitones => ({
          semitones: semitones,
          interval: audioProcessor.getIntervalName(semitones),
          newKey: keyInfo.key && keyInfo.mode ? 
            audioProcessor.calculateNewKey(keyInfo.key, keyInfo.mode, semitones).newKey : null
        }))
    });
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/audio/download/:filename
 * Download processed audio file
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'File download failed' });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/audio/:filename
 * Delete an audio file
 */
router.delete('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete the file
    await fs.unlink(filePath);

    res.json({
      message: 'File deleted successfully',
      filename: filename
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/audio/files
 * List uploaded audio files
 */
router.get('/files', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);

    const audioFiles = [];
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile() && file.match(/\.(mp3|wav|aac|m4a|ogg|flac)$/i)) {
        audioFiles.push({
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        });
      }
    }

    // Sort by creation date (newest first)
    audioFiles.sort((a, b) => b.createdAt - a.createdAt);

    res.json({
      files: audioFiles,
      count: audioFiles.length
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/audio/convert
 * Convert audio file to MP3 format
 */
router.post('/convert', async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const inputPath = path.join(__dirname, '../../uploads', filename);
    const outputFilename = `converted_${Date.now()}_${path.parse(filename).name}.mp3`;
    const outputPath = path.join(__dirname, '../../uploads', outputFilename);

    // Check if input file exists
    try {
      await fs.access(inputPath);
    } catch (error) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Convert to MP3
    const convertedPath = await audioProcessor.convertToMp3(inputPath, outputPath);
    const metadata = await audioProcessor.getAudioMetadata(convertedPath);

    res.json({
      message: 'Audio converted successfully',
      originalFile: filename,
      convertedFile: path.basename(convertedPath),
      metadata: metadata
    });
  } catch (error) {
    console.error('Convert error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle OPTIONS for audio streaming
router.options('/stream/:filename', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Accept-Ranges, Content-Range, Content-Length, Content-Type',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length, Content-Type',
    'Access-Control-Allow-Credentials': 'true'
  });
  res.sendStatus(200);
});

// Stream audio file
router.get('/stream/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;

    // Support range requests for audio streaming
    const range = req.headers.range;
    
    // Set CORS headers for audio streaming
    res.set({
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Accept-Ranges, Content-Range, Content-Length, Content-Type',
      'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length, Content-Type',
      'Access-Control-Allow-Credentials': 'true'
    });
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      });
      
      const stream = require('fs').createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes'
      });
      
      const stream = require('fs').createReadStream(filePath);
      stream.pipe(res);
    }
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;