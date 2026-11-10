'use client';

import React from 'react';
import {
  Video,
  Download,
  X,
  Smartphone,
  Square,
  Monitor,
  CheckCircle,
  AlertCircle,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import { ExportSettings, AspectRatio } from '../types';
import { ExportProgress } from '../rendering/ExportPipeline';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ExportSettings;
  onChangeSettings: (s: Partial<ExportSettings>) => void;
  onStartExport: () => void;
  onCancelExport: () => void;
  progress: ExportProgress;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChangeSettings,
  onStartExport,
  onCancelExport,
  progress,
}) => {
  if (!isOpen) return null;

  const isRendering = progress.status === 'preparing' || progress.status === 'recording' || progress.status === 'finalizing';
  const isCompleted = progress.status === 'completed';

  const resolutions: { label: string; width: number; height: number; aspect: AspectRatio; desc: string; badge?: string }[] = [
    { label: '8K Ultra Vertical (4320 × 7680)', width: 4320, height: 7680, aspect: '9:16', desc: 'Maximum 8K Lossless Vertical Master', badge: '8K ULTRA' },
    { label: '4K Ultra HD (2160 × 3840)', width: 2160, height: 3840, aspect: '9:16', desc: 'Lossless Master for YouTube Shorts & TikTok', badge: '4K UHD' },
    { label: '2K QHD (1440 × 2560)', width: 1440, height: 2560, aspect: '9:16', desc: 'Crisp high-density vertical rendering', badge: '2K QHD' },
    { label: '1080 × 1920 Full HD', width: 1080, height: 1920, aspect: '9:16', desc: 'Standard Reels, TikTok, Shorts (60 FPS)', badge: 'STANDARD' },
    { label: '720 × 1280 HD', width: 720, height: 1280, aspect: '9:16', desc: 'Lightweight & fast preview export' },
    { label: '8K Square (4320 × 4320)', width: 4320, height: 4320, aspect: '1:1', desc: 'Ultra-resolution 8K Square master', badge: '8K' },
    { label: '4K Square (2160 × 2160)', width: 2160, height: 2160, aspect: '1:1', desc: 'High-res Instagram square post' },
    { label: '1080 × 1080 Square', width: 1080, height: 1080, aspect: '1:1', desc: 'Standard Instagram feed square' },
    { label: '8K Cinema (7680 × 4320)', width: 7680, height: 4320, aspect: '16:9', desc: '8K Widescreen Master for YouTube', badge: '8K' },
    { label: '4K Cinema (3840 × 2160)', width: 3840, height: 2160, aspect: '16:9', desc: 'Widescreen 4K Master for YouTube' },
    { label: '1920 × 1080 Landscape', width: 1920, height: 1080, aspect: '16:9', desc: 'Standard widescreen Full HD' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-[#10141d] border border-white/10 rounded-2xl shadow-2xl p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Export Viral Video Master</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-semibold">8K/4K MP4 HDR10</span>
              </h2>
              <p className="text-xs text-gray-400">Frame-by-frame high-bitrate studio rendering with synchronized soundtrack & branding</p>
            </div>
          </div>
          {!isRendering && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1">
          {!isRendering && !isCompleted && (
            <>
              {/* Resolution Presets */}
              <div>
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-2">
                  Target Resolution & Aspect Ratio:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {resolutions.map((r) => {
                    const isSelected = settings.resolution.width === r.width && settings.resolution.height === r.height;
                    return (
                      <button
                        key={r.label}
                        onClick={() => {
                          onChangeSettings({
                            resolution: { width: r.width, height: r.height, label: r.label },
                            aspectRatio: r.aspect,
                          });
                        }}
                        className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/30 text-white ring-1 ring-cyan-400/50'
                            : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            {r.aspect === '9:16' ? (
                              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                            ) : r.aspect === '1:1' ? (
                              <Square className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                            <span className="text-xs font-bold">{r.label.split(' (')[0]}</span>
                          </div>
                          {r.badge && (
                            <span className="text-[9px] font-mono font-bold px-1 py-0.2 bg-cyan-500/20 text-cyan-300 rounded">
                              {r.badge}
                            </span>
                          )}
                        </div>
                        <span className="block text-[10px] text-gray-400 truncate">{r.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Format, Frame Rate & Bitrate Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Format selection */}
                <div>
                  <label className="text-gray-400 block mb-1 font-medium">Container Format</label>
                  <div className="flex rounded-lg bg-black/40 border border-white/10 p-1">
                    {(['mp4', 'webm'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => onChangeSettings({ format: fmt })}
                        className={`flex-1 py-1 rounded text-xs font-semibold transition cursor-pointer uppercase ${
                          settings.format === fmt ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Framerate Selection */}
                <div className="sm:col-span-2">
                  <label className="text-gray-400 block mb-1 font-medium">Frame Rate (FPS)</label>
                  <div className="flex rounded-lg bg-black/40 border border-white/10 p-1">
                    {([24, 30, 60, 120, 240] as const).map((fps) => (
                      <button
                        key={fps}
                        onClick={() => onChangeSettings({ fps })}
                        className={`flex-1 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                          settings.fps === fps ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {fps}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bitrate Control (up to 250 Mbps) */}
              <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center text-gray-300">
                  <span className="font-medium">Video Encoding Bitrate:</span>
                  <span className="font-mono text-cyan-400 font-bold">{settings.bitrateMbps} Mbps</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="250"
                  step="2"
                  value={settings.bitrateMbps}
                  onChange={(e) => onChangeSettings({ bitrateMbps: parseInt(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Standard (12 Mbps)</span>
                  <span>4K Lossless (80 Mbps)</span>
                  <span>8K Master (250 Mbps)</span>
                </div>
              </div>

              {/* HDR10 Mode & Luminance */}
              <div className="p-3 bg-gradient-to-r from-purple-950/20 to-cyan-950/20 border border-purple-500/20 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={settings.enableHDR10 ?? false}
                      onChange={(e) => onChangeSettings({ enableHDR10: e.target.checked })}
                      className="rounded bg-black/40 border-white/20 text-purple-500 focus:ring-0"
                    />
                    <span>HDR10 Output (ST 2084 PQ Wide Color Gamut)</span>
                  </label>
                  {settings.enableHDR10 && (
                    <span className="font-mono text-purple-300 text-[11px] font-bold">
                      {settings.hdrPeakLuminance ?? 1000} Nits
                    </span>
                  )}
                </div>

                {settings.enableHDR10 && (
                  <div className="pt-1">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Peak Specular Luminance:</span>
                      <span>{settings.hdrPeakLuminance ?? 1000} Nits (100 - 1000)</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="1000"
                      step="50"
                      value={settings.hdrPeakLuminance ?? 1000}
                      onChange={(e) => onChangeSettings({ hdrPeakLuminance: parseInt(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Watermark & Captions check */}
              <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-2 text-xs">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeWatermark}
                    onChange={(e) => onChangeSettings({ includeWatermark: e.target.checked })}
                    className="rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-0"
                  />
                  <span>Burn-in Watermark & Creator Branding at native output resolution</span>
                </label>
                <div className="text-[11px] text-gray-400">
                  Export duration: <span className="font-mono text-cyan-400">{Math.round(settings.endTime - settings.startTime)}s</span> • Synchronized audio soundtrack
                </div>
              </div>
            </>
          )}

          {/* Active Rendering Progress State */}
          {isRendering && (
            <div className="py-6 px-4 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Rendering 3D Reel Frames...
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  {progress.message}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-black/50 border border-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 via-orange-500 to-amber-500 h-full transition-all duration-150"
                  style={{ width: `${progress.progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                <span>{progress.currentSecond}s rendered</span>
                <span>{progress.progressPercent}%</span>
                <span>{progress.totalSeconds}s total</span>
              </div>

              <div className="pt-2">
                <button
                  onClick={onCancelExport}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-semibold transition cursor-pointer"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Cancel Rendering</span>
                </button>
              </div>
            </div>
          )}

          {/* Completed State */}
          {isCompleted && progress.blobUrl && (
            <div className="py-3 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">Reel Rendered Successfully!</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Format: {progress.format} • Size: {(progress.blobSize! / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>

              {/* Video Preview Player */}
              <div className="max-w-[280px] mx-auto rounded-xl overflow-hidden border border-white/15 bg-black shadow-lg">
                <video
                  src={progress.blobUrl}
                  controls
                  playsInline
                  autoPlay
                  loop
                  className="w-full h-auto max-h-[300px] object-contain"
                />
              </div>

              {/* Download Button */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href={progress.blobUrl}
                  download={`biome-beat-reel.${(progress.format || 'webm').toLowerCase()}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video File</span>
                </a>

                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions when idle */}
        {!isRendering && !isCompleted && (
          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              Encodes directly in browser • No watermark restrictions
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onStartExport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Start Video Render</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
