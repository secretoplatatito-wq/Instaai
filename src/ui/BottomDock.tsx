'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Globe2,
  Sliders,
  Video,
  Type,
  Eye,
  Shuffle,
  Compass,
  Sparkles,
} from 'lucide-react';
import {
  BiomeType,
  BiomeConfig,
  AudioReactiveConfig,
  CameraConfig,
  WatermarkConfig,
  StudioMode,
  Sandbox2DConfig,
  Sandbox2DType,
} from '../types';
import { BIOME_REGISTRY } from '../biomes/BiomeRegistry';

interface BottomDockProps {
  studioMode: StudioMode;
  onSetStudioMode: (m: StudioMode) => void;
  biomeType: BiomeType;
  onSelectBiome: (t: BiomeType) => void;
  biomeConfig: BiomeConfig;
  onChangeBiomeConfig: (cfg: Partial<BiomeConfig>) => void;
  sandboxConfig: Sandbox2DConfig;
  onChangeSandboxConfig: (cfg: Partial<Sandbox2DConfig>) => void;
  onResetSandbox: () => void;
  reactiveConfig: AudioReactiveConfig;
  onChangeReactiveConfig: (cfg: Partial<AudioReactiveConfig>) => void;
  cameraConfig: CameraConfig;
  onChangeCameraConfig: (cfg: Partial<CameraConfig>) => void;
  watermarkConfig: WatermarkConfig;
  onChangeWatermarkConfig: (cfg: Partial<WatermarkConfig>) => void;
  onOpenExport: () => void;
  onRandomizeSeed: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  studioMode,
  onSetStudioMode,
  biomeType,
  onSelectBiome,
  biomeConfig,
  onChangeBiomeConfig,
  sandboxConfig,
  onChangeSandboxConfig,
  onResetSandbox,
  reactiveConfig,
  onChangeReactiveConfig,
  cameraConfig,
  onChangeCameraConfig,
  watermarkConfig,
  onChangeWatermarkConfig,
  onOpenExport,
  onRandomizeSeed,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userTab, setUserTab] = useState<'biome' | 'sandbox' | 'audio' | 'camera' | 'branding' | null>(null);
  const [prevStudioMode, setPrevStudioMode] = useState(studioMode);

  if (prevStudioMode !== studioMode) {
    setPrevStudioMode(studioMode);
    setUserTab(null);
  }

  const activeTab = userTab || (studioMode === '2d-sandbox' ? 'sandbox' : 'biome');
  const setActiveTab = (t: 'biome' | 'sandbox' | 'audio' | 'camera' | 'branding') => setUserTab(t);

  const biomesList = Object.values(BIOME_REGISTRY);

  const sandboxModesList: { id: Sandbox2DType; title: string; subtitle: string; iconColor: string }[] = [
    { id: 'ellipse-laser', title: 'Ellipse Laser Harp', subtitle: 'Reflecting laser chords between foci', iconColor: '#00f2fe' },
    { id: 'wedge-escape', title: 'V-Wedge Escape Funnel', subtitle: 'Shrinking bouncing ball radius challenge', iconColor: '#ff6b35' },
    { id: 'multiplier-overload', title: '1 vs 10k Multiplier', subtitle: 'Exponential ball cascade & floor counters', iconColor: '#a855f7' },
    { id: 'egg-pi', title: 'Egg π Elastic Collision', subtitle: 'Eulerism / 3B1B collisions calculate π digits', iconColor: '#38bdf8' },
    { id: 'planet-flask', title: 'Planet Scale Flask Drop', subtitle: 'Mercury to Jupiter to Black Hole flask drop', iconColor: '#fbbf24' },
    { id: 'spring-smash', title: 'Piston Egg Smash x2', subtitle: 'Hydraulic piston smash doubling eggs', iconColor: '#eab308' },
    { id: 'bands-broken', title: '1000°C Ball vs 200 Bands', subtitle: 'Glowing hot sphere burning tension bands', iconColor: '#ff4444' },
    { id: 'spirograph-flower', title: 'Spirograph Song Guesser', subtitle: 'Harmonic floral trails with song guessing badge', iconColor: '#ec4899' },
    { id: 'branching-waves', title: 'Harmonic Wave Axis', subtitle: 'Multi-frequency branching sine curves', iconColor: '#f43f5e' },
    { id: 'landmark-flask', title: 'Landmark Physics Flask', subtitle: 'Falling crystal icons on musical beats', iconColor: '#ffd166' },
  ];

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-4xl transition-all duration-300 ease-out select-none ${
        isCollapsed ? 'bottom-2 translate-y-[calc(100%-36px)]' : 'bottom-3'
      }`}
    >
      {/* Collapse / Expand Toggle Button on top edge */}
      <div className="flex justify-center mb-1">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121620] hover:bg-[#1a2030] text-gray-300 hover:text-white text-xs border border-white/10 shadow-lg transition cursor-pointer"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Show Studio Dock</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              <span>Hide Controls</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Container */}
      <div className="bg-[#0e1118]/95 backdrop-blur-none border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-3">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {studioMode === '3d-biome' ? (
              <button
                onClick={() => setActiveTab('biome')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'biome'
                    ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>3D Biomes</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('sandbox')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'sandbox'
                    ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>2D Sandbox Modes</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('audio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'audio'
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Audio Reactivity</span>
            </button>

            {studioMode === '3d-biome' && (
              <button
                onClick={() => setActiveTab('camera')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Camera</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('branding')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'branding'
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Watermark & Caption</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {studioMode === '2d-sandbox' && (
              <button
                onClick={onResetSandbox}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 transition cursor-pointer"
                title="Restart 2D Simulation"
              >
                <Shuffle className="w-3 h-3 text-orange-400" />
                <span>Reset</span>
              </button>
            )}

            <button
              onClick={onOpenExport}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Render</span>
            </button>
          </div>
        </div>

        {/* Tab: 2D Sandbox Controls */}
        {activeTab === 'sandbox' && (
          <div className="space-y-3">
            {/* 2D Modes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto pr-1">
              {sandboxModesList.map((m) => {
                const isSelected = sandboxConfig.type === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      const defaultHeadlines: Record<Sandbox2DType, string> = {
                        'ellipse-laser': 'Can laser chords strike every node?',
                        'wedge-escape': 'At what size will the ball escape?',
                        'multiplier-overload': '1 Ball vs 10,000 Multiplier Overload',
                        'egg-pi': 'Colliding blocks calculate π',
                        'planet-flask': 'Dropping planets until the flask bursts!',
                        'spring-smash': 'Hydraulic Piston vs Doubling Eggs',
                        'bands-broken': '1000°C Red-Hot Ball vs 200 Bands',
                        'spirograph-flower': 'GUESS THE SONG FROM THE TRAIL? 🎵',
                        'branching-waves': 'Harmonic Wave Coordinate Resonance',
                        'landmark-flask': 'Filling the flask with music beats 🧪',
                      };
                      onChangeSandboxConfig({
                        type: m.id,
                        headlineText: defaultHeadlines[m.id] || sandboxConfig.headlineText,
                      });
                      onResetSandbox();
                    }}
                    className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                      isSelected
                        ? 'border-orange-400 bg-orange-950/40 text-white ring-1 ring-orange-400/50'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold truncate">{m.title}</span>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.iconColor }} />
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-1">{m.subtitle}</p>
                  </button>
                );
              })}
            </div>

            {/* Headline Banner Question Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-gray-400 font-medium block mb-1">
                  Viral Question / Headline Banner
                </label>
                <input
                  type="text"
                  value={sandboxConfig.headlineText}
                  onChange={(e) => onChangeSandboxConfig({ headlineText: e.target.value })}
                  placeholder="e.g. At what size will the ball escape?"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-orange-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sandboxConfig.soundFxEnabled}
                    onChange={(e) => onChangeSandboxConfig({ soundFxEnabled: e.target.checked })}
                    className="rounded bg-black/40 border-white/20 text-orange-500 focus:ring-0"
                  />
                  <span>Collision Chimes & Pitch Shifts</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sandboxConfig.showLiveMetrics}
                    onChange={(e) => onChangeSandboxConfig({ showLiveMetrics: e.target.checked })}
                    className="rounded bg-black/40 border-white/20 text-orange-500 focus:ring-0"
                  />
                  <span>Live HUD Counters</span>
                </label>
              </div>
            </div>

            {/* Quick Physics Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-white/5 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Ball Radius: {sandboxConfig.ballRadius}px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="80"
                  step="2"
                  value={sandboxConfig.ballRadius}
                  onChange={(e) => onChangeSandboxConfig({ ballRadius: parseInt(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Shrink Rate: {sandboxConfig.shrinkRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.90"
                  max="0.99"
                  step="0.01"
                  value={sandboxConfig.shrinkRate}
                  onChange={(e) => onChangeSandboxConfig({ shrinkRate: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Elasticity: {sandboxConfig.restitution.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.70"
                  max="1.05"
                  step="0.01"
                  value={sandboxConfig.restitution}
                  onChange={(e) => onChangeSandboxConfig({ restitution: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Gravity: {sandboxConfig.gravity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={sandboxConfig.gravity}
                  onChange={(e) => onChangeSandboxConfig({ gravity: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Biomes Selector & Customization */}
        {activeTab === 'biome' && (
          <div className="space-y-3">
            {/* Horizontal Biomes Scroll */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
              {biomesList.map((b) => {
                const isSelected = biomeType === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSelectBiome(b.id);
                      onChangeBiomeConfig({
                        primaryColor: b.defaultPrimary,
                        secondaryColor: b.defaultSecondary,
                        accentColor: b.defaultAccent,
                      });
                    }}
                    className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 text-white ring-1 ring-cyan-400/50'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold truncate">{b.title}</span>
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: b.defaultPrimary }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-1">{b.category}</p>
                  </button>
                );
              })}
            </div>

            {/* Quick Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-white/5 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Speed: {biomeConfig.speedMultiplier.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="2.5"
                  step="0.1"
                  value={biomeConfig.speedMultiplier}
                  onChange={(e) => onChangeBiomeConfig({ speedMultiplier: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Density: {biomeConfig.density.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={biomeConfig.density}
                  onChange={(e) => onChangeBiomeConfig({ density: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Glow: {biomeConfig.glowIntensity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="3.0"
                  step="0.1"
                  value={biomeConfig.glowIntensity}
                  onChange={(e) => onChangeBiomeConfig({ glowIntensity: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onRandomizeSeed}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 transition text-xs font-medium cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Random Seed</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Audio Reactivity Controls */}
        {activeTab === 'audio' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Sensitivity</span>
                <span className="font-mono text-cyan-400">{reactiveConfig.sensitivity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={reactiveConfig.sensitivity}
                onChange={(e) => onChangeReactiveConfig({ sensitivity: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Bass Scale Thump</span>
                <span className="font-mono text-orange-400">{reactiveConfig.bassScaleResponse.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="2.5"
                step="0.1"
                value={reactiveConfig.bassScaleResponse}
                onChange={(e) => onChangeReactiveConfig({ bassScaleResponse: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Beat Flash Intensity</span>
                <span className="font-mono text-purple-400">{reactiveConfig.beatFlashIntensity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="2.5"
                step="0.1"
                value={reactiveConfig.beatFlashIntensity}
                onChange={(e) => onChangeReactiveConfig({ beatFlashIntensity: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                <span>Camera Kick</span>
                <span className="font-mono text-amber-400">{reactiveConfig.cameraKick.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={reactiveConfig.cameraKick}
                onChange={(e) => onChangeReactiveConfig({ cameraKick: parseFloat(e.target.value) })}
                className="w-full h-1 bg-white/10 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Camera Controls */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'follow', label: 'Follow Lead Ball' },
                { id: 'orbit', label: 'Cinematic Orbit' },
                { id: 'flythrough', label: 'Flythrough Zoom' },
                { id: 'spiral', label: 'Spiral Descent' },
                { id: 'stationary', label: 'Fixed Frame' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => onChangeCameraConfig({ mode: m.id as CameraConfig['mode'] })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    cameraConfig.mode === m.id
                      ? 'bg-cyan-500 text-black font-semibold'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs pt-1">
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Distance: {cameraConfig.distance.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={cameraConfig.distance}
                  onChange={(e) => onChangeCameraConfig({ distance: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>FOV: {cameraConfig.fov}°</span>
                </div>
                <input
                  type="range"
                  min="35"
                  max="85"
                  step="1"
                  value={cameraConfig.fov}
                  onChange={(e) => onChangeCameraConfig({ fov: parseInt(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Orbit Speed: {cameraConfig.speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.1"
                  value={cameraConfig.speed}
                  onChange={(e) => onChangeCameraConfig({ speed: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Watermark & Branding */}
        {activeTab === 'branding' && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Username / Brand Tag</label>
                <input
                  type="text"
                  value={watermarkConfig.username}
                  onChange={(e) => onChangeWatermarkConfig({ username: e.target.value })}
                  placeholder="@yourhandle"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Hook Caption / Call-to-Action</label>
                <input
                  type="text"
                  value={watermarkConfig.caption}
                  onChange={(e) => onChangeWatermarkConfig({ caption: e.target.value })}
                  placeholder="Guess the song 🎵 • like & follow"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Font Typography</label>
                <select
                  value={watermarkConfig.fontFamily}
                  onChange={(e) => onChangeWatermarkConfig({ fontFamily: e.target.value as WatermarkConfig['fontFamily'] })}
                  className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                >
                  <option value="script">Calligraphic Script (Reference Style)</option>
                  <option value="serif">Cinematic Serif</option>
                  <option value="sans">Modern Sans-Serif</option>
                  <option value="mono">Cyber Monospace</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Position</label>
                <select
                  value={watermarkConfig.position}
                  onChange={(e) => onChangeWatermarkConfig({ position: e.target.value as WatermarkConfig['position'] })}
                  className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:border-cyan-400 focus:outline-none"
                >
                  <option value="center">Center Scene (Viral Floating)</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Opacity</span>
                  <span className="font-mono">{Math.round(watermarkConfig.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={watermarkConfig.opacity}
                  onChange={(e) => onChangeWatermarkConfig({ opacity: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={watermarkConfig.enabled}
                    onChange={(e) => onChangeWatermarkConfig({ enabled: e.target.checked })}
                    className="rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-0"
                  />
                  <span>Show Watermark</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
