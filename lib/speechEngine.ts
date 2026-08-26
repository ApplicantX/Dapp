'use client';

export interface SpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
}

// Convert Float32Array PCM audio samples into a standard 16-bit Mono WAV Blob
function encodeWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // Helper to write string to DataView
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeString(8, 'WAVE');
  // format chunk identifier
  writeString(12, 'fmt ');
  // format chunk length (16 for PCM)
  view.setUint32(16, 16, true);
  // sample format (raw 1 = PCM)
  view.setUint16(20, 1, true);
  // channel count (1 = Mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * 1 * 2)
  view.setUint32(28, sampleRate * 2, true);
  // block align (1 * 2)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write PCM float samples converted to 16-bit signed integer
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

// Resample audio buffer to target sample rate (16kHz standard for Whisper AI)
function resampleTo16k(audioBuffer: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === 16000) return audioBuffer;
  const ratio = inputSampleRate / 16000;
  const outputLength = Math.round(audioBuffer.length / ratio);
  const result = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const targetIdx = i * ratio;
    const leftIdx = Math.floor(targetIdx);
    const rightIdx = Math.min(leftIdx + 1, audioBuffer.length - 1);
    const weight = targetIdx - leftIdx;
    result[i] = audioBuffer[leftIdx] * (1 - weight) + audioBuffer[rightIdx] * weight;
  }
  return result;
}

// Filter known silence hallucinations
export function sanitizeTranscript(text: string): string {
  if (!text) return '';
  return text
    .replace(/thank you for watching\.?/gi, '')
    .replace(/thanks for watching\.?/gi, '')
    .replace(/please subscribe\.?/gi, '')
    .replace(/subtitles by.*$/gi, '')
    .replace(/translated by.*$/gi, '')
    .replace(/amara\.org/gi, '')
    .replace(/watching!/gi, '')
    .replace(/\[music\]/gi, '')
    .replace(/\(music\)/gi, '')
    .replace(/\[silence\]/gi, '')
    .replace(/\[applause\]/gi, '')
    .replace(/\(silence\)/gi, '')
    .trim();
}

export class CustomHybridSpeechEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private pcmChunks: Float32Array[] = [];
  private isRecording: boolean = false;
  private callbacks: SpeechCallbacks = {};
  private language: string = 'en-IN';

  // Live real-time speech preview
  private recognition: any = null;
  private liveRealtimeText: string = '';

  constructor(language: string = 'en-IN') {
    this.language = language;
    if (typeof window !== 'undefined') {
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        this.recognition = new SpeechRec();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = language;
      }
    }
  }

  setLanguage(lang: string) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  async start(callbacks: SpeechCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.pcmChunks = [];
    this.liveRealtimeText = '';
    this.isRecording = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.stream = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const sampleRate = this.audioContext.sampleRate;

      this.source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128;
      this.source.connect(this.analyser);

      // Collect raw PCM audio samples directly
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Copy chunk
        const chunk = new Float32Array(inputData.length);
        chunk.set(inputData);
        this.pcmChunks.push(chunk);
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Real-time audio waveform level visualizer
      if (callbacks.onAudioLevel) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const checkLevel = () => {
          if (!this.analyser || !this.isRecording) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(1, avg / 128);
          callbacks.onAudioLevel?.(normalized);
          this.animFrameId = requestAnimationFrame(checkLevel);
        };
        checkLevel();
      }

      // Start live speech stream in parallel
      if (this.recognition) {
        this.recognition.onresult = (event: any) => {
          let fullText = '';
          for (let i = 0; i < event.results.length; ++i) {
            fullText += event.results[i][0].transcript + ' ';
          }
          this.liveRealtimeText = sanitizeTranscript(fullText);
          callbacks.onInterimResult?.(this.liveRealtimeText);
        };

        this.recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech') {
            console.warn('Speech stream error:', event.error);
          }
        };

        try {
          this.recognition.start();
        } catch (e) {}
      }

      callbacks.onStart?.();
    } catch (err: any) {
      this.isRecording = false;
      console.error('Audio start error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        callbacks.onError?.('Microphone access denied. Please click the camera/mic icon in the browser address bar to allow microphone access.');
      } else {
        callbacks.onError?.(err.message || 'Failed to start microphone recording.');
      }
    }
  }

  async stop(apiKey?: string): Promise<string> {
    this.isRecording = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    // Merge PCM chunks
    const totalLength = this.pcmChunks.reduce((sum, c) => sum + c.length, 0);
    const mergedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.pcmChunks) {
      mergedSamples.set(chunk, offset);
      offset += chunk.length;
    }

    const inputSampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.callbacks.onEnd?.();

    // Resample to 16kHz PCM WAV
    const resampled16k = resampleTo16k(mergedSamples, inputSampleRate);
    const wavBlob = encodeWavBlob(resampled16k, 16000);

    const fallbackText = this.liveRealtimeText.trim();
    const keyToUse = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('dahod_whisper_api_key') || '' : '');

    // Send high-quality WAV to Whisper API
    if (keyToUse) {
      try {
        this.callbacks.onInterimResult?.('Transcribing audio with Whisper AI...');

        const formData = new FormData();
        formData.append('audio', wavBlob, 'recording.wav');
        formData.append('apiKey', keyToUse);
        formData.append('service', keyToUse.startsWith('gsk_') ? 'groq' : 'openai');
        formData.append('language', this.language.startsWith('gu') ? 'gu' : this.language.startsWith('hi') ? 'hi' : 'en');

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const transcript = sanitizeTranscript(data.transcript || '');
          const finalResult = transcript || fallbackText;
          this.callbacks.onFinalResult?.(finalResult);
          return finalResult;
        }
      } catch (e) {
        console.warn('Whisper API failed, using speech stream:', e);
      }
    }

    // Fallback to live stream text
    this.callbacks.onFinalResult?.(fallbackText);
    return fallbackText;
  }
}

// Export alias for compatibility
export { CustomHybridSpeechEngine as CustomDirectAudioEngine };
