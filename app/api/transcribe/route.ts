import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import os from 'os';

// Filter out known hallucination strings
function cleanWhisperTranscript(text: string): string {
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

export async function POST(req: NextRequest) {
  let tempFilePath = '';

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob | null;
    const apiKey = (formData.get('apiKey') as string) || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    const language = (formData.get('language') as string) || 'auto';
    const service = (formData.get('service') as string) || 'local';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // 1. If explicit Groq / OpenAI API key is supplied, use it
    if (apiKey && (service === 'groq' || service === 'openai' || apiKey.startsWith('gsk_'))) {
      try {
        const isGroq = service === 'groq' || apiKey.startsWith('gsk_');
        const endpoint = isGroq
          ? 'https://api.groq.com/openai/v1/audio/transcriptions'
          : 'https://api.openai.com/v1/audio/transcriptions';

        const whisperFormData = new FormData();
        whisperFormData.append('file', audioFile, 'recording.wav');
        whisperFormData.append('model', isGroq ? 'whisper-large-v3' : 'whisper-1');
        if (language && language !== 'auto') {
          whisperFormData.append('language', language);
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: whisperFormData,
        });

        if (response.ok) {
          const data = await response.json();
          const rawText = data.text || '';
          const cleaned = cleanWhisperTranscript(rawText);
          return NextResponse.json({
            transcript: cleaned,
            source: isGroq ? 'groq_cloud' : 'openai_cloud',
          });
        }
      } catch (cloudErr) {
        console.warn('Cloud API failed, falling back to local worker:', cloudErr);
      }
    }

    // 2. Standalone In-App Neural Transcription Worker (Zero Webpack chunks / zero 611.js bugs)
    const tempDir = os.tmpdir();
    const ext = audioFile.type?.includes('mp4') ? '.mp4' : audioFile.type?.includes('wav') ? '.wav' : '.webm';
    tempFilePath = path.join(tempDir, `dapp_audio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`);

    fs.writeFileSync(tempFilePath, audioBuffer);

    const workerScript = path.join(process.cwd(), 'scripts', 'transcribeWorker.js');

    const result = await new Promise<{ transcript: string; rawText?: string }>((resolve, reject) => {
      // Find node executable in PATH or fall back to /usr/local/bin/node
      const nodePath = process.execPath || '/usr/local/bin/node';
      const env = { ...process.env, PATH: `${process.env.PATH || ''}:/usr/local/bin:/opt/homebrew/bin` };

      execFile(
        nodePath,
        [workerScript, tempFilePath, language],
        { env, maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
        (error, stdout, stderr) => {
          if (error) {
            console.error('Worker exec error:', error, stderr);
            return reject(error);
          }
          try {
            // Find last line of stdout which contains JSON
            const lines = stdout.trim().split(/\r?\n/);
            const lastLine = lines[lines.length - 1];
            const data = JSON.parse(lastLine);
            resolve(data);
          } catch (jsonErr) {
            console.error('Failed to parse worker output:', stdout);
            resolve({ transcript: '' });
          }
        }
      );
    });

    const cleaned = cleanWhisperTranscript(result.transcript || result.rawText || '');

    return NextResponse.json({
      transcript: cleaned,
      rawText: result.rawText,
      source: 'local_neural_engine',
    });
  } catch (error: any) {
    console.error('Transcribe error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  } finally {
    // Clean up temporary audio file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
    }
  }
}
