'use client';

export interface SpeechRecognitionCallbacks {
  onInterimResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onAudioLevel?: (level: number) => void; // 0 to 1 for visualizer
}

export class CustomAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private stream: MediaStream | null = null;

  async start(onAudioLevel?: (level: number) => void): Promise<void> {
    this.audioChunks = [];

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.stream = stream;

    // Set up AudioContext for real-time visualizer
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128;
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      if (onAudioLevel) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const checkLevel = () => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(1, avg / 128);
          onAudioLevel(normalized);
          this.animFrameId = requestAnimationFrame(checkLevel);
        };
        checkLevel();
      }
    } catch (e) {
      console.warn('AudioContext visualization not available:', e);
    }

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
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
      }

      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(blob);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanup();
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}

// Browser Web Speech Recognition with Indian English / Hindi / Gujarati support
export class BrowserSpeechEngine {
  private recognition: any = null;
  private isRunning: boolean = false;

  constructor(lang: 'en' | 'hi' | 'gu' = 'en') {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.setLanguage(lang);
      }
    }
  }

  setLanguage(lang: 'en' | 'hi' | 'gu') {
    if (!this.recognition) return;
    if (lang === 'hi') {
      this.recognition.lang = 'hi-IN';
    } else if (lang === 'gu') {
      this.recognition.lang = 'gu-IN';
    } else {
      this.recognition.lang = 'en-IN'; // Indian English
    }
  }

  start(callbacks: SpeechRecognitionCallbacks) {
    if (!this.recognition) {
      callbacks.onError?.('Speech recognition is not supported in this browser.');
      return;
    }

    if (this.isRunning) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    this.recognition.onstart = () => {
      this.isRunning = true;
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) {
        callbacks.onInterimResult?.(interimTranscript);
      }
      if (finalTranscript) {
        callbacks.onFinalResult?.(finalTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        callbacks.onError?.(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isRunning = false;
      callbacks.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (err: any) {
      console.warn('Speech start error:', err);
    }
  }

  stop() {
    if (this.recognition && this.isRunning) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isRunning = false;
    }
  }
}

// Speak confirmation text back to Mom (Text-To-Speech)
export function speakFeedback(text: string, lang: 'en' | 'hi' | 'gu' = 'en'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel(); // stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower, very clear and warm for mom
    utterance.pitch = 1.05;

    // Pick best matching voice
    const voices = window.speechSynthesis.getVoices();
    const targetLangCode = lang === 'hi' ? 'hi' : lang === 'gu' ? 'gu' : 'en-IN';
    const voice =
      voices.find((v) => v.lang.toLowerCase().includes(targetLangCode.toLowerCase())) ||
      voices.find((v) => v.lang.toLowerCase().includes('in')) ||
      voices[0];

    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-IN';

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('TTS speak error:', err);
  }
}

// Play pleasant confirmation sound
export function playSuccessChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.2); // D6

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {}
}
