'use client';

export interface SpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
  onSpeechDetected?: (isSpeaking: boolean) => void;
}

export interface SpeechDebugStats {
  recordedBytes: number;
  durationMs: number;
  maxLevel: number;
  speechDetected: boolean;
}

// Convert Float32Array PCM audio samples into a standard 16-bit Mono WAV Blob
export function encodeWavBlob(samples: Float32Array, sampleRate: number = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

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

  // Convert float samples to 16-bit signed integer
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

// Resample audio buffer to target 16kHz
export function resampleTo16k(audioBuffer: Float32Array, inputSampleRate: number): Float32Array {
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

// Sanitize transcript text
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

/**
 * High-Reliability Dual-Channel Live Speech Engine
 * - Real-Time Live Streaming Transcription (words appear instantly while speaking)
 * - Dual Recording: Generates pristine 16kHz PCM WAV + Native MediaRecorder
 * - Machine Learning: In-app neural speech recognition via Next.js backend (zero API keys needed)
 */
export class CustomHybridSpeechEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedBlobs: Blob[] = [];
  private pcmChunks: Float32Array[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private isRecording: boolean = false;
  private callbacks: SpeechCallbacks = {};
  private language: string = 'en'; // 'en', 'hi', or 'auto'

  // Recording diagnostics
  private startTime: number = 0;
  private maxAudioLevelDetected: number = 0;
  private speechDetected: boolean = false;
  private totalRecordedBytes: number = 0;

  // Real-Time Live Speech Recognition Stream
  private recognition: any = null;
  private accumulatedFinalText: string = '';
  private liveRealtimeText: string = '';

  constructor(language: string = 'en') {
    this.language = language;
  }

  setLanguage(lang: string) {
    this.language = lang;
    if (this.recognition) {
      if (lang === 'hi' || lang.startsWith('hi')) {
        this.recognition.lang = 'hi-IN';
      } else if (lang === 'en' || lang.startsWith('en')) {
        this.recognition.lang = 'en-IN';
      } else {
        this.recognition.lang = 'en-IN';
      }
    }
  }

  getLanguage(): string {
    return this.language;
  }

  getDebugStats(): SpeechDebugStats {
    return {
      recordedBytes: this.totalRecordedBytes,
      durationMs: this.startTime > 0 ? Date.now() - this.startTime : 0,
      maxLevel: this.maxAudioLevelDetected,
      speechDetected: this.speechDetected,
    };
  }

  async start(callbacks: SpeechCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.recordedBlobs = [];
    this.pcmChunks = [];
    this.liveRealtimeText = '';
    this.accumulatedFinalText = '';
    this.maxAudioLevelDetected = 0;
    this.speechDetected = false;
    this.totalRecordedBytes = 0;
    this.startTime = Date.now();
    this.isRecording = true;

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.stream = stream;

      // 2. Initialize fresh real-time SpeechRecognition for live word-by-word streaming
      if (typeof window !== 'undefined') {
        const SpeechRec =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            this.recognition = new SpeechRec();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;

            if (this.language === 'hi' || this.language.startsWith('hi')) {
              this.recognition.lang = 'hi-IN';
            } else if (this.language === 'en' || this.language.startsWith('en')) {
              this.recognition.lang = 'en-IN';
            } else {
              this.recognition.lang = 'en-IN';
            }

            this.recognition.onresult = (event: any) => {
              let currentInterim = '';
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                const item = event.results[i];
                const text = item[0]?.transcript || '';
                if (item.isFinal) {
                  this.accumulatedFinalText += text + ' ';
                } else {
                  currentInterim += text;
                }
              }

              const combined = (this.accumulatedFinalText + currentInterim).trim();
              this.liveRealtimeText = sanitizeTranscript(combined);
              if (this.liveRealtimeText) {
                this.speechDetected = true;
                callbacks.onInterimResult?.(this.liveRealtimeText);
              }
            };

            this.recognition.onend = () => {
              if (this.isRecording && this.recognition) {
                try {
                  this.recognition.start();
                } catch (e) {}
              }
            };

            this.recognition.onerror = (event: any) => {
              console.debug('Live speech stream note:', event.error);
            };

            try {
              this.recognition.start();
            } catch (e) {}
          } catch (recErr) {
            console.warn('SpeechRecognition init error:', recErr);
          }
        }
      }

      // 3. Hardware Native MediaRecorder
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        const supportedTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/wav',
        ];
        for (const type of supportedTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            break;
          }
        }

        this.mediaRecorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined
        );

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.recordedBlobs.push(event.data);
            this.totalRecordedBytes += event.data.size;
          }
        };

        this.mediaRecorder.start(250);
      }

      // 4. Web Audio Context for Real-Time Level Meter & Direct PCM sample collection
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioCtx();

        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        this.source = this.audioContext.createMediaStreamSource(stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.3;
        this.source.connect(this.analyser);

        // Record raw PCM samples directly in script processor as primary uncompressed audio
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
        this.processor.onaudioprocess = (e) => {
          if (!this.isRecording) return;
          const input = e.inputBuffer.getChannelData(0);
          const copy = new Float32Array(input.length);
          copy.set(input);
          this.pcmChunks.push(copy);
        };

        this.silentGain = this.audioContext.createGain();
        this.silentGain.gain.value = 0;
        this.source.connect(this.processor);
        this.processor.connect(this.silentGain);
        this.silentGain.connect(this.audioContext.destination);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const checkLevel = () => {
          if (!this.analyser || !this.isRecording) return;
          this.analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(1, avg / 80);

          if (normalized > this.maxAudioLevelDetected) {
            this.maxAudioLevelDetected = normalized;
          }

          const isSpeaking = normalized > 0.08;
          if (isSpeaking) {
            this.speechDetected = true;
          }

          callbacks.onAudioLevel?.(normalized);
          callbacks.onSpeechDetected?.(isSpeaking);

          this.animFrameId = requestAnimationFrame(checkLevel);
        };
        checkLevel();
      } catch (audioCtxErr) {
        console.warn('Audio visualizer error:', audioCtxErr);
      }

      callbacks.onStart?.();
    } catch (err: any) {
      this.isRecording = false;
      console.error('Microphone start error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        callbacks.onError?.(
          'Microphone permission denied. Please allow microphone access in your browser address bar.'
        );
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
        this.recognition = null;
      } catch (e) {}
    }

    // Stop MediaRecorder and flush final chunks
    let finalAudioBlob: Blob | null = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!this.mediaRecorder) return resolve();
        this.mediaRecorder.onstop = () => resolve();
        try {
          this.mediaRecorder.stop();
        } catch (e) {
          resolve();
        }
      });
    }

    if (this.recordedBlobs.length > 0) {
      const mime = this.recordedBlobs[0].type || 'audio/webm';
      finalAudioBlob = new Blob(this.recordedBlobs, { type: mime });
      this.totalRecordedBytes = finalAudioBlob.size;
    }

    // Convert recorded PCM chunks into pristine 16kHz uncompressed Mono WAV
    let directWavBlob: Blob | null = null;
    const totalPcmSamples = this.pcmChunks.reduce((sum, c) => sum + c.length, 0);
    if (totalPcmSamples > 4000) {
      const mergedSamples = new Float32Array(totalPcmSamples);
      let offset = 0;
      for (const chunk of this.pcmChunks) {
        mergedSamples.set(chunk, offset);
        offset += chunk.length;
      }
      const inputSampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;
      const resampled16k = resampleTo16k(mergedSamples, inputSampleRate);
      directWavBlob = encodeWavBlob(resampled16k, 16000);
    }

    // Clean up audio hardware
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.silentGain) {
      this.silentGain.disconnect();
      this.silentGain = null;
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

    const fallbackStreamText = this.liveRealtimeText.trim();
    const keyToUse =
      apiKey ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('dahod_whisper_api_key') || ''
        : '');

    // Prefer uncompressed PCM WAV for 100% reliable decoding, with MediaRecorder as fallback
    const audioToSend = directWavBlob || finalAudioBlob;

    if (audioToSend && audioToSend.size > 200) {
      try {
        this.callbacks.onInterimResult?.('Finalizing transcription...');

        const formData = new FormData();
        const filename = audioToSend === directWavBlob
          ? 'recording.wav'
          : audioToSend.type.includes('mp4')
          ? 'recording.mp4'
          : audioToSend.type.includes('wav')
          ? 'recording.wav'
          : 'recording.webm';

        formData.append('audio', audioToSend, filename);
        formData.append('language', this.language);

        if (keyToUse) {
          formData.append('apiKey', keyToUse);
          formData.append('service', keyToUse.startsWith('gsk_') ? 'groq' : 'openai');
        } else {
          formData.append('service', 'local');
        }

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const transcript = sanitizeTranscript(data.transcript || data.rawText || '');
          if (transcript) {
            this.callbacks.onFinalResult?.(transcript);
            return transcript;
          }
        }
      } catch (apiErr) {
        console.warn('Final ASR request error:', apiErr);
      }
    }

    // If API returned empty but live stream captured words, return live text
    if (fallbackStreamText) {
      this.callbacks.onFinalResult?.(fallbackStreamText);
      return fallbackStreamText;
    }

    return '';
  }
}

// Export alias for compatibility
export { CustomHybridSpeechEngine as CustomDirectAudioEngine };
