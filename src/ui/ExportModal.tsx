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
    { label: '4K Ultra HD (2160 × 3840)', width: 2160, height: 3840, aspect: '9:16', desc: 'Lossless Master for YouTube Shorts & TikTok', badge: 'ULTRA HD' },
    { label: '2K QHD (1440 × 2560)', width: 1440, height: 2560, aspect: '9:16', desc: 'Crisp high-density vertical rendering', badge: '2K QHD' },
    { label: '1080 × 1920 Full HD', width: 1080, height: 1920, aspect: '9:16', desc: 'Standard Reels, TikTok, Shorts (60 FPS)', badge: 'STANDARD' },
    { label: '720 × 1280 HD', width: 720, height: 1280, aspect: '9:16', desc: 'Lightweight & instant preview export' },
    { label: '4K Square (2160 × 2160)', width: 2160, height: 2160, aspect: '1:1', desc: 'Ultra-resolution Instagram post' },
    { label: '1080 × 1080 Square', width: 1080, height: 1080, aspect: '1:1', desc: 'Standard Instagram feed square' },
    { label: '4K Cinema (3840 × 2160)', width: 3840, height: 2160, aspect: '16:9', desc: 'Widescreen 4K Master for YouTube' },
    { label: '1920 × 1080 Landscape', width: 1920, height: 1080, aspect: '16:9', desc: 'Standard widescreen HD' },
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
                <span>Export Viral Video Reel</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-semibold">4K LOSSLESS</span>
              </h2>
              <p className="text-xs text-gray-400">High-bitrate studio rendering with synchronized soundtrack & branding</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
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
                        <p className="text-[10px] text-gray-400 truncate">{r.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frame Rate & Bitrate Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1 font-medium">Frame Rate</label>
                  <div className="flex rounded-lg bg-black/40 border border-white/10 p-1">
                    {([24, 30, 60] as const).map((fps) => (
                      <button
                        key={fps}
                        onClick={() => onChangeSettings({ fps })}
                        className={`flex-1 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                          settings.fps === fps ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {fps} FPS
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-medium">Quality & Bitrate</label>
                  <div className="flex rounded-lg bg-black/40 border border-white/10 p-1">
                    {[
                      { mbps: 8, label: 'Fast (8M)', quality: 'fast' as const },
                      { mbps: 20, label: 'High (20M)', quality: 'high' as const },
                      { mbps: 45, label: 'Ultra (45M)', quality: 'ultra' as const },
                      { mbps: 80, label: 'Lossless (80M)', quality: 'lossless' as const },
                    ].map((b) => (
                      <button
                        key={b.mbps}
                        onClick={() => onChangeSettings({ bitrateMbps: b.mbps, quality: b.quality })}
                        className={`flex-1 py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                          settings.bitrateMbps === b.mbps ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                  <span>Burn-in Watermark & Creator Branding into video output</span>
                </label>
                <div className="text-[11px] text-gray-400">
                  Export duration: <span className="font-mono text-cyan-400">{Math.round(settings.endTime - settings.startTime)}s</span> • Audio soundtrack synchronized
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
