'use client';

import React from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  audioLevel?: number; // 0 to 1
  barCount?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isRecording,
  audioLevel = 0,
  barCount = 18,
}) => {
  return (
    <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-xs mx-auto">
      {Array.from({ length: barCount }).map((_, i) => {
        // Calculate dynamic height based on audioLevel and wave offset
        const phase = (i / barCount) * Math.PI * 2;
        const wave = Math.sin(phase + Date.now() / 200);
        const dynamicFactor = isRecording
          ? Math.max(0.15, Math.min(1, (audioLevel * 1.5 + 0.2) * (0.6 + 0.4 * Math.abs(wave))))
          : 0.1;
        const heightPx = Math.max(6, Math.round(dynamicFactor * 54));

        return (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-75 ${
              isRecording
                ? 'bg-gradient-to-t from-gold-500 via-gold-400 to-purple-300 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                : 'bg-purple-800/40'
            }`}
            style={{
              height: `${heightPx}px`,
              transition: isRecording ? 'height 80ms ease-out' : 'height 300ms ease-in-out',
            }}
          />
        );
      })}
    </div>
  );
};
