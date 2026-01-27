const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

class AudioProcessor {
  constructor() {
    // Set FFmpeg path if needed (adjust for your system)
    // ffmpeg.setFfmpegPath('/path/to/ffmpeg');
  }

  /**
   * Transpose audio file by semitones
   * @param {string} inputPath - Path to input audio file
   * @param {number} semitones - Number of semitones to transpose (-12 to +12)
   * @param {string} outputPath - Path for output file
   * @returns {Promise<string>} - Path to transposed audio file
   */
  async transposeAudio(inputPath, semitones, outputPath) {
    if (semitones < -12 || semitones > 12) {
      throw new Error('Semitones must be between -12 and +12');
    }

    if (semitones === 0) {
      // No transposition needed, just copy the file
      await fs.copyFile(inputPath, outputPath);
      return outputPath;
    }

    return new Promise((resolve, reject) => {
      // Calculate pitch shift using asetrate and atempo filters
      const pitchRatio = Math.pow(2, semitones / 12);
      
      ffmpeg(inputPath)
        .audioFilters([
          // Use asetrate and atempo for pitch shifting (more compatible)
          `asetrate=44100*${pitchRatio}`,
          `atempo=${1/pitchRatio}`
        ])
        .format('mp3')
        .audioBitrate('128k')
        .audioFrequency(44100)
        .audioChannels(2)
        .on('progress', (progress) => {
          console.log(`Processing: ${progress.percent}% done`);
        })
        .on('end', () => {
          console.log('Audio transposition completed');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(new Error(`Audio processing failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  /**
   * Alternative transposition method using FFmpeg asetrate filter
   * @param {string} inputPath - Path to input audio file
   * @param {number} semitones - Number of semitones to transpose
   * @param {string} outputPath - Path for output file
   * @returns {Promise<string>} - Path to transposed audio file
   */
  async transposeWithFFmpegOnly(inputPath, semitones, outputPath) {
    if (semitones === 0) {
      // No transposition needed, just copy the file
      await fs.copyFile(inputPath, outputPath);
      return outputPath;
    }

    return new Promise((resolve, reject) => {
      // Calculate pitch shift ratio
      const pitchRatio = Math.pow(2, semitones / 12);
      
      ffmpeg(inputPath)
        .audioFilters([
          `asetrate=44100*${pitchRatio},aresample=44100`
        ])
        .audioCodec('mp3')
        .audioBitrate('128k')
        .on('progress', (progress) => {
          console.log(`Processing: ${progress.percent}% done`);
        })
        .on('end', () => {
          console.log('Audio transposition completed');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(new Error(`Audio processing failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  /**
   * Get audio metadata including key detection
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<Object>} - Audio metadata
   */
  async getAudioMetadata(audioPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to read audio metadata: ${err.message}`));
          return;
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        if (!audioStream) {
          reject(new Error('No audio stream found in file'));
          return;
        }

        const result = {
          duration: parseFloat(metadata.format.duration),
          bitrate: parseInt(metadata.format.bit_rate),
          sampleRate: parseInt(audioStream.sample_rate),
          channels: parseInt(audioStream.channels),
          codec: audioStream.codec_name,
          size: parseInt(metadata.format.size),
          format: metadata.format.format_name
        };

        resolve(result);
      });
    });
  }

  /**
   * Convert audio to MP3 format
   * @param {string} inputPath - Path to input file
   * @param {string} outputPath - Path for output MP3 file
   * @returns {Promise<string>} - Path to converted file
   */
  async convertToMp3(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .format('mp3')
        .audioBitrate('128k')
        .audioFrequency(44100)
        .audioChannels(2)
        .on('end', () => {
          console.log('Audio conversion to MP3 completed');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Conversion error:', err);
          reject(new Error(`Audio conversion failed: ${err.message}`));
        })
        .save(outputPath);
    });
  }

  /**
   * Detect musical key of audio file (simplified placeholder)
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<Object>} - Detected key information
   */
  async detectKey(audioPath) {
    // This is a simplified key detection - in a real application,
    // you might want to use more sophisticated audio analysis libraries
    // For now, return a placeholder with common keys
    const commonKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
    const randomKey = commonKeys[Math.floor(Math.random() * commonKeys.length)];
    const randomMode = Math.random() > 0.5 ? 'major' : 'minor';
    
    return new Promise((resolve) => {
      resolve({
        key: randomKey,
        mode: randomMode,
        confidence: 0.75,
        note: 'This is a placeholder key detection. For production, integrate with audio analysis libraries like Essentia.js or use Spotify Web API.'
      });
    });
  }

  /**
   * Calculate new key after transposition
   * @param {string} originalKey - Original key (e.g., 'C', 'F#', 'Bb')
   * @param {string} mode - Mode ('major' or 'minor')
   * @param {number} semitones - Number of semitones to transpose
   * @returns {Object} - New key information
   */
  calculateNewKey(originalKey, mode, semitones) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const flatNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    // Convert key to note index
    let noteIndex = notes.indexOf(originalKey);
    if (noteIndex === -1) {
      noteIndex = flatNotes.indexOf(originalKey);
    }
    
    if (noteIndex === -1) {
      throw new Error(`Invalid key: ${originalKey}`);
    }

    // Calculate new note index
    const newIndex = (noteIndex + semitones + 12) % 12;
    const newKey = semitones >= 0 ? notes[newIndex] : flatNotes[newIndex];

    return {
      originalKey: originalKey,
      originalMode: mode,
      newKey: newKey,
      newMode: mode,
      semitoneChange: semitones,
      interval: this.getIntervalName(semitones)
    };
  }

  /**
   * Get interval name for semitone difference
   * @param {number} semitones - Number of semitones
   * @returns {string} - Interval name
   */
  getIntervalName(semitones) {
    const intervals = {
      0: 'Perfect Unison',
      1: 'Minor Second',
      2: 'Major Second',
      3: 'Minor Third',
      4: 'Major Third',
      5: 'Perfect Fourth',
      6: 'Tritone',
      7: 'Perfect Fifth',
      8: 'Minor Sixth',
      9: 'Major Sixth',
      10: 'Minor Seventh',
      11: 'Major Seventh',
      12: 'Perfect Octave',
      [-1]: 'Minor Second (down)',
      [-2]: 'Major Second (down)',
      [-3]: 'Minor Third (down)',
      [-4]: 'Major Third (down)',
      [-5]: 'Perfect Fourth (down)',
      [-6]: 'Tritone (down)',
      [-7]: 'Perfect Fifth (down)',
      [-8]: 'Minor Sixth (down)',
      [-9]: 'Major Sixth (down)',
      [-10]: 'Minor Seventh (down)',
      [-11]: 'Major Seventh (down)',
      [-12]: 'Perfect Octave (down)'
    };

    return intervals[semitones] || `${Math.abs(semitones)} semitones ${semitones > 0 ? 'up' : 'down'}`;
  }
}

module.exports = AudioProcessor;