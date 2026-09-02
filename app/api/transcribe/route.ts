import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import os from 'os';

// Health check GET handler
export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Dahod Jewellery Lending Local ASR',
    languages: ['auto', 'en', 'hi'],
  });
}

// Filter out known hallucination strings
function cleanWhisperTranscript(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Remove bracketed / parenthetical sound effects (e.g. audience chattering, music)
  cleaned = cleaned.replace(/[\(\[][^\)\]]*(?:chatter|audience|applause|music|silence|whisper|laughter|noise|bell|beep)[^\)\]]*[\)\]]/gi, '');

  // 2. Remove common Whisper hallucination and loop trigger phrases
  const hallucinations = [
    /(?:fif|if you have) (?:a )?question.*$/gi,
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

  hallucinations.forEach((h) => {
    cleaned = cleaned.replace(h, '');
  });

  // 3. Collapse repetitive token loops
  cleaned = cleaned.replace(/\b(\w+)(?:\s+\1\b){3,}/gi, '$1');
  cleaned = cleaned.replace(/(.{4,60}?)(?:\s*\1\s*){2,}/gi, '$1');

  return cleaned.trim();
}

export async function POST(req: NextRequest) {
  let tempFilePath = '';

  try {
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ transcript: '', message: 'Invalid form data' }, { status: 200 });
    }

    const audioFile = formData.get('audio') as Blob | null;
    const apiKey = (formData.get('apiKey') as string) || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    const language = (formData.get('language') as string) || 'auto';
    const service = (formData.get('service') as string) || 'local';

    if (!audioFile) {
      return NextResponse.json({ transcript: '', message: 'No audio provided' }, { status: 200 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    if (!audioBuffer || audioBuffer.length < 100) {
      return NextResponse.json({ transcript: '', message: 'Audio buffer too small' }, { status: 200 });
    }

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

    const result = await new Promise<{ transcript: string; rawText?: string }>((resolve) => {
      const nodePath = process.execPath || '/usr/local/bin/node';
      const env = { ...process.env, PATH: `${process.env.PATH || ''}:/usr/local/bin:/opt/homebrew/bin` };

      execFile(
        nodePath,
        [workerScript, tempFilePath, language],
        { env, maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
        (error, stdout, stderr) => {
          if (error) {
            console.warn('Worker exec note:', error.message);
            return resolve({ transcript: '' });
          }
          try {
            const startTag = '__JSON_START__';
            const endTag = '__JSON_END__';
            const startIdx = stdout.indexOf(startTag);
            const endIdx = stdout.indexOf(endTag);
            if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
              const jsonStr = stdout.substring(startIdx + startTag.length, endIdx);
              const data = JSON.parse(jsonStr);
              return resolve(data);
            }
            resolve({ transcript: '' });
          } catch (jsonErr) {
            console.warn('Worker output parsing note:', stdout);
            resolve({ transcript: '' });
          }
        }
      );
    });

    const cleaned = cleanWhisperTranscript(result.transcript || result.rawText || '');
    const finalResult = cleaned || (result.rawText && !/^\s*\[.*\]\s*$/.test(result.rawText) ? result.rawText.trim() : '');

    return NextResponse.json({
      transcript: finalResult,
      rawText: result.rawText,
      source: 'local_neural_engine',
    });
  } catch (error: any) {
    console.error('Transcribe route handler note:', error);
    return NextResponse.json({
      transcript: '',
      error: error.message || 'Processing error',
      source: 'fallback',
    }, { status: 200 });
  } finally {
    // Clean up temporary audio file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
    }
  }
}
