#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function getFfmpegPath() {
  const candidates = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', 'ffmpeg'];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return 'ffmpeg';
}

function decodeWavToFloat32(buffer) {
  if (!buffer || buffer.length < 44) {
    return new Float32Array(0);
  }

  // Ensure it's a RIFF WAVE
  const riff = buffer.toString('ascii', 0, 4);
  if (riff !== 'RIFF') {
    return new Float32Array(0);
  }

  let pos = 12;
  let channels = 1;
  let sampleRate = 16000;
  let dataOffset = 44;
  let dataLength = buffer.length - 44;

  while (pos < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', pos, pos + 4);
    const chunkSize = buffer.readUInt32LE(pos + 4);
    if (chunkId === 'fmt ') {
      channels = buffer.readUInt16LE(pos + 10) || 1;
      sampleRate = buffer.readUInt32LE(pos + 12) || 16000;
    } else if (chunkId === 'data') {
      dataOffset = pos + 8;
      dataLength = chunkSize;
      break;
    }
    pos += 8 + chunkSize;
  }

  if (dataLength <= 0 || dataOffset + dataLength > buffer.length) {
    dataLength = Math.max(0, buffer.length - dataOffset);
  }

  const numSamples = Math.max(0, Math.floor(dataLength / (2 * channels)));
  if (numSamples === 0) {
    return new Float32Array(0);
  }

  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const byteOffset = dataOffset + i * 2 * channels;
    if (byteOffset + 1 < buffer.length) {
      samples[i] = buffer.readInt16LE(byteOffset) / 32768.0;
    }
  }

  // Resample linearly if needed
  if (sampleRate !== 16000 && sampleRate > 0 && samples.length > 0) {
    const ratio = sampleRate / 16000;
    const outputLength = Math.max(1, Math.round(samples.length / ratio));
    const resampled = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const targetIdx = i * ratio;
      const leftIdx = Math.floor(targetIdx);
      const rightIdx = Math.min(leftIdx + 1, samples.length - 1);
      const weight = targetIdx - leftIdx;
      resampled[i] = samples[leftIdx] * (1 - weight) + samples[rightIdx] * weight;
    }
    return resampled;
  }

  return samples;
}

function normalizeAudio(samples) {
  let maxPeak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > maxPeak) maxPeak = abs;
  }
  if (maxPeak > 0.005 && maxPeak < 0.65) {
    const scale = 0.85 / maxPeak;
    const normalized = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      normalized[i] = Math.max(-1, Math.min(1, samples[i] * scale));
    }
    return normalized;
  }
  return samples;
}

async function convertAudioTo16kFloat32(audioFilePath, audioBuffer) {
  if (!audioBuffer || audioBuffer.length < 100) {
    return new Float32Array(0);
  }

  // 1. Direct WAV decoding if it's already a RIFF PCM WAV (fast, zero external calls)
  if (audioBuffer.length >= 44 && audioBuffer.toString('ascii', 0, 4) === 'RIFF') {
    const directWav = decodeWavToFloat32(audioBuffer);
    if (directWav && directWav.length > 0) {
      return directWav;
    }
  }

  // 2. FFmpeg decoding directly from file path (allows seekable Matroska/WebM/MP4 parsing)
  try {
    const ffmpegPath = getFfmpegPath();
    const pcmFloat32 = await new Promise((resolve) => {
      const proc = spawn(
        ffmpegPath,
        [
          '-i', audioFilePath, // Read directly from file to allow container seeking!
          '-f', 'f32le',       // 32-bit float PCM
          '-ac', '1',          // mono
          '-ar', '16000',      // 16kHz standard
          'pipe:1',
        ],
        { stdio: ['ignore', 'pipe', 'ignore'] }
      );

      const chunks = [];
      proc.stdout.on('data', (d) => chunks.push(d));
      proc.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          const fullBuf = Buffer.concat(chunks);
          const floats = new Float32Array(fullBuf.buffer, fullBuf.byteOffset, Math.floor(fullBuf.byteLength / 4));
          resolve(floats);
        } else {
          resolve(new Float32Array(0));
        }
      });
      proc.on('error', () => {
        resolve(new Float32Array(0));
      });
    });

    if (pcmFloat32 && pcmFloat32.length > 0) {
      return pcmFloat32;
    }
  } catch (e) {}

  return new Float32Array(0);
}

function cleanWhisperTranscript(text) {
  if (!text) return '';

  // 1. Check for foreign non-regional scripts (e.g. Tamil \u0B80-\u0BFF, Telugu, Arabic, etc.)
  // Dahod store operations ONLY use English (Latin), Hindi (Devanagari \u0900-\u097F), or Gujarati (\u0A80-\u0AFF)!
  const foreignScriptRegex = /[\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F\u0600-\u06FF\u4E00-\u9FFF\u0400-\u04FF]/u;
  if (foreignScriptRegex.test(text)) {
    return '';
  }

  // 2. Filter out known hallucination phrases
  const hallucinations = [
    /thank you for watching\.?/gi,
    /thanks for watching\.?/gi,
    /please subscribe\.?/gi,
    /subtitles by.*$/gi,
    /translated by.*$/gi,
    /amara\.org/gi,
    /watching!/gi,
    /\[music\]/gi,
    /\(music\)/gi,
    /\[silence\]/gi,
    /\[applause\]/gi,
    /\(silence\)/gi,
    /\[beep\]/gi,
    /\(beep\)/gi,
  ];

  let cleaned = text;
  hallucinations.forEach((h) => {
    cleaned = cleaned.replace(h, '');
  });

  // 3. Detect and collapse repetitive token loops (e.g. "kandora kandora kandora...")
  cleaned = cleaned.replace(/\b(\w+)(?:\s+\1\b){3,}/gi, '$1');
  // Collapse character repetition loops
  cleaned = cleaned.replace(/(.{2,10}?)\1{3,}/gu, '$1');

  return cleaned.trim();
}

async function main() {
  const audioFilePath = process.argv[2];
  const language = process.argv[3] || 'en';

  if (!audioFilePath || !fs.existsSync(audioFilePath)) {
    console.log('__JSON_START__' + JSON.stringify({ transcript: '', message: 'Audio file not found' }) + '__JSON_END__');
    process.exit(0);
  }

  const audioBuffer = fs.readFileSync(audioFilePath);
  if (!audioBuffer || audioBuffer.length < 100) {
    console.log('__JSON_START__' + JSON.stringify({ transcript: '', message: 'Audio buffer empty' }) + '__JSON_END__');
    process.exit(0);
  }

  const rawPcm = await convertAudioTo16kFloat32(audioFilePath, audioBuffer);

  if (!rawPcm || rawPcm.length === 0) {
    console.log('__JSON_START__' + JSON.stringify({ transcript: '', message: 'Audio was silent or not decodable' }) + '__JSON_END__');
    process.exit(0);
  }

  // Normalize audio volume to standard 0.85 peak so Whisper clearly detects speech
  const pcmSamples = normalizeAudio(rawPcm);

  const { pipeline, env } = require('@xenova/transformers');
  env.allowLocalModels = true;

  const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
    quantized: true,
  });

  // Default to English unless explicitly Hindi to prevent random language hallucinations (e.g. Tamil)
  const targetLanguage = (language === 'hi' || language === 'hindi') ? 'hindi' : 'english';

  const options = {
    task: 'transcribe',
    language: targetLanguage,
    return_timestamps: false,
    chunk_length_s: 30,
    stride_length_s: 5,
  };

  const output = await transcriber(pcmSamples, options);
  const rawText = (output && output.text) ? output.text : '';
  const cleaned = cleanWhisperTranscript(rawText);

  // If cleaning stripped everything but rawText had actual content without foreign script, preserve rawText
  const finalTranscript = cleaned || (rawText && !/^[\s\[\(].*[\]\)]\s*$/.test(rawText) ? cleanWhisperTranscript(rawText.trim()) : '');

  console.log('__JSON_START__' + JSON.stringify({ transcript: finalTranscript, rawText }) + '__JSON_END__');
  process.exit(0);
}

main().catch((err) => {
  console.log('__JSON_START__' + JSON.stringify({ transcript: '', error: err.message || String(err) }) + '__JSON_END__');
  process.exit(0);
});
