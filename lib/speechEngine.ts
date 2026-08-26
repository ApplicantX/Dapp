'use client';

export interface CustomAudioCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onInterimResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
}

export class CustomDirectAudioEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private isRecording: boolean = false;
  private callbacks: CustomAudioCallbacks = {};
  private language: string = 'en';

  constructor(language: string = 'en') {
    this.language = language;
  }

  setLanguage(lang: string) {
    this.language = lang;
  }

  async start(callbacks: CustomAudioCallbacks): Promise<void> {
    this.callbacks = callbacks;
    this.audioChunks = [];
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

      // Real-time audio waveform level
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128;
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

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

      // MediaRecorder for raw audio chunks
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100);
      callbacks.onStart?.();
    } catch (err: any) {
      this.isRecording = false;
      console.error('Audio recording start error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        callbacks.onError?.('Microphone permission denied. Please allow microphone access in your browser.');
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

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        resolve('');
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanup();

        try {
          this.callbacks.onInterimResult?.('Transcribing audio with Whisper AI...');

          const formData = new FormData();
          formData.append('audio', audioBlob);
          const keyToUse = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('dahod_whisper_api_key') || '' : '');
          if (keyToUse) {
            formData.append('apiKey', keyToUse);
            formData.append('service', keyToUse.startsWith('gsk_') ? 'groq' : 'openai');
          }
          formData.append('language', this.language);

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            const transcript = data.transcript || '';
            this.callbacks.onFinalResult?.(transcript);
            resolve(transcript);
            return;
          } else {
            const err = await res.json();
            this.callbacks.onError?.(err.message || 'Transcription failed.');
            resolve('');
          }
        } catch (e: any) {
          console.error('Transcription request error:', e);
          this.callbacks.onError?.('Failed to reach transcription server.');
          resolve('');
        }
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.callbacks.onEnd?.();
  }
}
