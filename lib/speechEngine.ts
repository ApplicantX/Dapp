'use client';

export interface ContinuousSpeechCallbacks {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onAudioLevel?: (level: number) => void;
}

export class ContinuousSpeechEngine {
  private recognition: any = null;
  private isExplicitlyRecording: boolean = false;
  private currentFullTranscript: string = '';
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private callbacks: ContinuousSpeechCallbacks = {};

  constructor(lang: string = 'en-IN') {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = lang;
      }
    }
  }

  setLanguage(lang: string) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  async start(callbacks: ContinuousSpeechCallbacks) {
    this.callbacks = callbacks;
    this.currentFullTranscript = '';
    this.isExplicitlyRecording = true;

    // Start Web Audio Level Meter
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
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      if (callbacks.onAudioLevel) {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const checkLevel = () => {
          if (!this.analyser || !this.isExplicitlyRecording) return;
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
    } catch (err: any) {
      console.warn('Microphone stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        callbacks.onError?.('Microphone permission denied. Please allow microphone access in your browser settings.');
        this.isExplicitlyRecording = false;
        return;
      }
    }

    if (!this.recognition) {
      callbacks.onError?.('Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or Safari.');
      return;
    }

    this.recognition.onstart = () => {
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          this.currentFullTranscript += ' ' + event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const combined = (this.currentFullTranscript + ' ' + interim).trim();
      callbacks.onInterimResult?.(combined);
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          callbacks.onError?.('Microphone permission denied.');
        }
      }
    };

    // Continuous listening: If recognition ends while isExplicitlyRecording is true (due to pause), restart!
    this.recognition.onend = () => {
      if (this.isExplicitlyRecording) {
        try {
          this.recognition.start();
        } catch (e) {
          // Restart gracefully
        }
      } else {
        callbacks.onEnd?.();
      }
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.warn('Recognition start exception:', err);
    }
  }

  stop(): string {
    this.isExplicitlyRecording = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    const finalTranscript = this.currentFullTranscript.trim();
    this.callbacks.onFinalResult?.(finalTranscript);
    return finalTranscript;
  }
}
