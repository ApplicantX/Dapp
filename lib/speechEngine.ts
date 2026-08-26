'use client';

export interface SpeechCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
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
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private isRecording: boolean = false;
  private callbacks: SpeechCallbacks = {};
  private language: string = 'en-IN';

  // Parallel live recognition
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
    this.audioChunks = [];
    this.liveRealtimeText = '';
    this.isRecording = true;

    // 1. Start Web Audio Stream & Visualizer
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

      // 2. Start MediaRecorder for Whisper AI Audio Blob
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

      // 3. Start parallel live recognition for real-time visual feedback
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
            console.warn('Live recognition error:', event.error);
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

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    return new Promise((resolve) => {
      const fallbackText = this.liveRealtimeText.trim();

      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        this.callbacks.onFinalResult?.(fallbackText);
        resolve(fallbackText);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanup();

        const keyToUse = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('dahod_whisper_api_key') || '' : '');

        // If Whisper API key is available, call Whisper
        if (keyToUse) {
          try {
            this.callbacks.onInterimResult?.('Transcribing audio with Whisper AI...');

            const formData = new FormData();
            formData.append('audio', audioBlob);
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
              resolve(finalResult);
              return;
            }
          } catch (e) {
            console.warn('Whisper API call failed, using live stream text:', e);
          }
        }

        // Return real-time fallback text
        this.callbacks.onFinalResult?.(fallbackText);
        resolve(fallbackText);
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

// Export alias for compatibility
export { CustomHybridSpeechEngine as CustomDirectAudioEngine };
