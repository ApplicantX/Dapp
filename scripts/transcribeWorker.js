#!/usr/bin/env node
const fs = require('fs');
const { spawn } = require('child_process');

function decodeWavToFloat32(buffer) {
  let pos = 12;
  let channels = 1;
  let sampleRate = 16000;
  let dataOffset = 44;
  let dataLength = buffer.length - 44;

  while (pos < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', pos, pos + 4);
    const chunkSize = buffer.readUInt32LE(pos + 4);
    if (chunkId === 'fmt ') {
      channels = buffer.readUInt16LE(pos + 10);
      sampleRate = buffer.readUInt32LE(pos + 12);
    } else if (chunkId === 'data') {
      dataOffset = pos + 8;
      dataLength = chunkSize;
      break;
    }
    pos += 8 + chunkSize;
  }

  const numSamples = Math.floor(dataLength / (2 * channels));
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const byteOffset = dataOffset + i * 2 * channels;
    if (byteOffset + 1 < buffer.length) {
      samples[i] = buffer.readInt16LE(byteOffset) / 32768.0;
    }
  }
  return samples;
}

async function convertAudioTo16kFloat32(audioBuffer) {
  try {
    const ffmpegPath = '/opt/homebrew/bin/ffmpeg';
    const pcmFloat32 = await new Promise((resolve, reject) => {
      const proc = spawn(
        ffmpegPath,
        [
          '-i', 'pipe:0',
          '-f', 'f32le', // 32-bit float PCM
          '-ac', '1',    // mono
          '-ar', '16000',// 16kHz
          'pipe:1',
        ],
        { stdio: ['pipe', 'pipe', 'ignore'] }
      );

      const chunks = [];
      proc.stdout.on('data', (d) => chunks.push(d));
      proc.on('close', (code) => {
        if (code === 0) {
          const fullBuf = Buffer.concat(chunks);
          const floats = new Float32Array(fullBuf.buffer, fullBuf.byteOffset, fullBuf.byteLength / 4);
          resolve(floats);
        } else {
          resolve(decodeWavToFloat32(audioBuffer));
        }
      });
      proc.on('error', () => {
        resolve(decodeWavToFloat32(audioBuffer));
      });
      proc.stdin.write(audioBuffer);
      proc.stdin.end();
    });

    if (pcmFloat32 && pcmFloat32.length > 0) {
      return pcmFloat32;
    }
  } catch (e) {
    // fallback to manual WAV decoder
  }
  return decodeWavToFloat32(audioBuffer);
}

function cleanWhisperTranscript(text) {
  if (!text) return '';
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
  ];

  let cleaned = text;
  hallucinations.forEach((h) => {
    cleaned = cleaned.replace(h, '');
  });
  return cleaned.trim();
}

async function main() {
  const audioFilePath = process.argv[2];
  const language = process.argv[3] || 'auto';

  if (!audioFilePath || !fs.existsSync(audioFilePath)) {
    console.log(JSON.stringify({ error: 'Audio file not found' }));
    process.exit(1);
  }

  const audioBuffer = fs.readFileSync(audioFilePath);
  const pcmSamples = await convertAudioTo16kFloat32(audioBuffer);

  if (!pcmSamples || pcmSamples.length === 0) {
    console.log(JSON.stringify({ transcript: '', message: 'Audio was silent' }));
    process.exit(0);
  }

  const { pipeline, env } = require('@xenova/transformers');
  env.allowLocalModels = true;

  const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
    quantized: true,
  });

  const options = { task: 'transcribe' };
  if (language === 'hi' || language === 'hindi') {
    options.language = 'hindi';
  } else if (language === 'en' || language === 'english') {
    options.language = 'english';
  }

  const output = await transcriber(pcmSamples, options);
  const rawText = (output && output.text) ? output.text : '';
  const cleaned = cleanWhisperTranscript(rawText);

  console.log(JSON.stringify({ transcript: cleaned, rawText }));
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message || String(err) }));
  process.exit(1);
});
