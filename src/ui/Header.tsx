'use client';

import React from 'react';
import {
  Upload,
  Video,
  Sparkles,
  Music,
  FolderOpen,
  Smartphone,
  Square,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { AspectRatio, AudioTrackInfo, BiomeType, StudioMode, Sandbox2DType } from '../types';
import { BIOME_REGISTRY } from '../biomes/BiomeRegistry';
import { DEFAULT_PRESETS } from '../editor/ProjectStore';

interface HeaderProps {
  studioMode: StudioMode;
  onSetStudioMode: (mode: StudioMode) => void;
  activeBiomeType: BiomeType;
  sandboxType: Sandbox2DType;
  aspectRatio: AspectRatio;
  onSetAspectRatio: (ar: AspectRatio) => void;
  trackInfo: AudioTrackInfo | null;
  onOpenUpload: () => void;
  onOpenExport: () => void;
  onOpenProjects: () => void;
  onLoadPreset: (presetId: string) => void;
  onRandomizeSeed: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  studioMode,
  onSetStudioMode,
  activeBiomeType,
  sandboxType,
  aspectRatio,
  onSetAspectRatio,
  trackInfo,
  onOpenUpload,
  onOpenExport,
  onOpenProjects,
  onLoadPreset,
  onRandomizeSeed,
}) => {
  const currentBiome = BIOME_REGISTRY[activeBiomeType];
  const sandboxTitles: Record<Sandbox2DType, string> = {
    'ellipse-laser': 'Ellipse Laser Chord Harp',
    'wedge-escape': 'V-Wedge Escape Funnel',
    'multiplier-overload': '1 Ball vs 10,000 Multiplier',
    'branching-waves': 'Harmonic Branching Axis',
    'landmark-flask': 'Landmark Physics Flask',
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2.5 bg-black/60 backdrop-blur-none border-b border-white/10 select-none">
      {/* Brand & Mode Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-orange-500 to-purple-600 p-[1px]">
            <div className="w-full h-full bg-[#0d0f15] rounded-[7px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white uppercase flex items-center gap-1.5">
              Biome Beat <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-semibold">STUDIO</span>
            </h1>
            <p className="text-[11px] text-gray-400 font-medium truncate max-w-[180px] sm:max-w-none">
              {studioMode === '3d-biome' ? currentBiome.title : sandboxTitles[sandboxType]}
            </p>
          </div>
        </div>

        {/* 3D vs 2D Sandbox Switcher */}
        <div className="flex items-center bg-[#131722] border border-white/10 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => onSetStudioMode('3d-biome')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
              studioMode === '3d-biome'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            3D Biome
          </button>
          <button
            onClick={() => onSetStudioMode('2d-sandbox')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
              studioMode === '2d-sandbox'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            2D Viral Sandbox
          </button>
        </div>

        {studioMode === '3d-biome' && (
          <button
            onClick={onRandomizeSeed}
            title="Randomize Biome Seed"
            className="hidden lg:flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            <span>New Seed</span>
          </button>
        )}
      </div>

      {/* Center: Presets & Audio Track */}
      <div className="hidden md:flex items-center gap-2">
        {/* Preset Selector */}
        <div className="flex items-center gap-1 bg-[#131722] border border-white/10 rounded-lg p-1 text-xs">
          <span className="text-gray-400 px-2 font-medium">Preset:</span>
          {DEFAULT_PRESETS.slice(0, 3).map((p) => (
            <button
              key={p.id}
              onClick={() => onLoadPreset(p.id)}
              className="px-2.5 py-1 rounded hover:bg-white/10 text-gray-200 transition text-[11px] font-medium"
            >
              {p.name.split(' (')[0]}
            </button>
          ))}
        </div>

        {/* Audio Track Badge */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-200 transition"
        >
          <Music className="w-3.5 h-3.5 text-orange-400" />
          <span className="max-w-[140px] truncate">{trackInfo?.name || 'Load Audio'}</span>
          {trackInfo?.bpmEstimate && (
            <span className="text-[10px] text-orange-400 bg-orange-500/20 px-1 py-0.5 rounded font-mono">
              {trackInfo.bpmEstimate} BPM
            </span>
          )}
        </button>
      </div>

      {/* Right: Aspect Ratio & Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Aspect Ratio Switcher */}
        <div className="flex items-center bg-[#131722] border border-white/10 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => onSetAspectRatio('9:16')}
            title="9:16 Vertical Reel (TikTok / Shorts / Reels)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition text-[11px] ${
              aspectRatio === '9:16'
                ? 'bg-cyan-500 text-black font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span className="hidden sm:inline">9:16</span>
          </button>
          <button
            onClick={() => onSetAspectRatio('1:1')}
            title="1:1 Square Post"
            className={`flex items-center gap-1 px-2 py-1 rounded transition text-[11px] ${
              aspectRatio === '1:1'
                ? 'bg-cyan-500 text-black font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Square className="w-3 h-3" />
            <span className="hidden sm:inline">1:1</span>
          </button>
          <button
            onClick={() => onSetAspectRatio('16:9')}
            title="16:9 Landscape"
            className={`flex items-center gap-1 px-2 py-1 rounded transition text-[11px] ${
              aspectRatio === '16:9'
                ? 'bg-cyan-500 text-black font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3 h-3" />
            <span className="hidden sm:inline">16:9</span>
          </button>
        </div>

        {/* Audio Import Modal Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition border border-white/10"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Music</span>
        </button>

        {/* Projects Storage Button */}
        <button
          onClick={onOpenProjects}
          title="Saved Projects"
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition"
        >
          <FolderOpen className="w-4 h-4" />
        </button>

        {/* Export Video Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold shadow-lg shadow-orange-500/20 transition cursor-pointer"
        >
          <Video className="w-3.5 h-3.5" />
          <span>Export Reel</span>
        </button>
      </div>
    </header>
  );
};
