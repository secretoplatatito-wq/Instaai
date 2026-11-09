'use client';

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Camera,
  Activity,
} from 'lucide-react';
import { WatermarkConfig, AudioMetrics, AudioTrackInfo, StudioMode } from '../types';

interface ViewportOverlayProps {
  studioMode: StudioMode;
  watermarkConfig: WatermarkConfig;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  metrics: AudioMetrics;
  trackInfo: AudioTrackInfo | null;
  waveformPeaks: number[];
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
  volume: number;
  onSetVolume: (vol: number) => void;
  onCaptureSnapshot: () => void;
}

export const ViewportOverlay: React.FC<ViewportOverlayProps> = ({
  studioMode,
  watermarkConfig,
  isPlaying,
  currentTime,
  duration,
  metrics,
  trackInfo,
  waveformPeaks,
  onTogglePlay,
  onRestart,
  onSeek,
  volume,
  onSetVolume,
  onCaptureSnapshot,
}) => {
  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Watermark Positioning CSS
  const getWatermarkPositionClass = () => {
    switch (watermarkConfig.position) {
      case 'top-center':
        return 'top-14 left-1/2 -translate-x-1/2 text-center';
      case 'top-left':
        return 'top-14 left-6 text-left';
      case 'top-right':
        return 'top-14 right-6 text-right';
      case 'bottom-center':
        return 'bottom-28 left-1/2 -translate-x-1/2 text-center';
      case 'bottom-left':
        return 'bottom-28 left-6 text-left';
      case 'bottom-right':
        return 'bottom-28 right-6 text-right';
      case 'center':
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center';
    }
  };

  const getFontFamilyStyle = () => {
    switch (watermarkConfig.fontFamily) {
      case 'script':
        return '"Brush Script MT", "Caveat", cursive, sans-serif';
      case 'serif':
        return '"Cinzel", "Playfair Display", Georgia, serif';
      case 'mono':
        return '"JetBrains Mono", monospace';
      case 'sans':
      default:
        return 'system-ui, -apple-system, sans-serif';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4">
      {/* 1. Floating Watermark & Caption Overlay */}
      {watermarkConfig.enabled && studioMode !== '2d-sandbox' && (
        <div
          className={`absolute transition-all duration-200 pointer-events-none ${getWatermarkPositionClass()}`}
          style={{
            opacity: watermarkConfig.opacity,
            color: watermarkConfig.color || '#ffffff',
            fontFamily: getFontFamilyStyle(),
            textShadow: watermarkConfig.enableGlow
              ? `0 0 16px ${watermarkConfig.color || '#ffffff'}, 0 0 24px ${watermarkConfig.color || '#ffffff'}`
              : '0 2px 10px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.9)',
          }}
        >
          {watermarkConfig.username && (
            <div
              className="font-bold tracking-wide"
              style={{ fontSize: `${watermarkConfig.fontSize}px` }}
            >
              {watermarkConfig.username}
            </div>
          )}
          {watermarkConfig.caption && (
            <div
              className="mt-1 opacity-90 font-medium"
              style={{ fontSize: `${Math.round(watermarkConfig.fontSize * 0.65)}px` }}
            >
              {watermarkConfig.caption}
            </div>
          )}
        </div>
      )}

      {/* 2. Top-Right Floating Controls (Snapshot & Live Audio Meter) */}
      <div className="self-end flex items-center gap-2 pointer-events-auto mt-12">
        {/* Live Audio Energy Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 border border-white/10 text-[11px] text-gray-300">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono">{metrics.bpm || 120} BPM</span>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 transition-opacity" style={{ opacity: metrics.beat ? 1 : 0.2 }} />
        </div>

        {/* Snapshot Capture */}
        <button
          onClick={onCaptureSnapshot}
          title="Take High-Res Screenshot"
          className="p-2 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 text-gray-200 hover:text-white transition cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3. Audio Waveform Scrubber & Playback Controls Bar */}
      <div className="w-full max-w-xl mx-auto pointer-events-auto bg-[#0e1118]/80 backdrop-blur-none border border-white/10 rounded-xl p-2.5 mb-14 shadow-2xl">
        {/* Waveform Canvas / Scrubber */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPercent = (e.clientX - rect.left) / rect.width;
            onSeek(clickPercent * duration);
          }}
          className="relative h-9 w-full bg-black/40 rounded-lg overflow-hidden cursor-pointer flex items-center px-1 mb-2 group"
        >
          {/* Waveform Bars */}
          <div className="absolute inset-0 flex items-center justify-between px-1">
            {waveformPeaks.map((peak, idx) => {
              const barProgress = (idx / waveformPeaks.length) * 100;
              const isPassed = barProgress <= progress;
              return (
                <div
                  key={idx}
                  className={`w-[2px] rounded-full transition-all duration-75 ${
                    isPassed
                      ? 'bg-gradient-to-t from-cyan-500 to-orange-400'
                      : 'bg-white/20 group-hover:bg-white/30'
                  }`}
                  style={{
                    height: `${Math.max(12, peak * 100)}%`,
                  }}
                />
              );
            })}
          </div>

          {/* Current Playhead Scrubber */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_#ffffff] z-10"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Playback Controls & Time */}
        <div className="flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className="w-8 h-8 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center transition font-bold cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
            </button>
            <button
              onClick={onRestart}
              title="Restart"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <span className="font-mono text-[11px] text-gray-300 ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSetVolume(volume > 0 ? 0 : 0.85)}
              className="text-gray-400 hover:text-white transition cursor-pointer"
            >
              {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={volume}
              onChange={(e) => onSetVolume(parseFloat(e.target.value))}
              className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
