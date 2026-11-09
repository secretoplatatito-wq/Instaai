export type StudioMode = '3d-biome' | '2d-sandbox';

export type BiomeType =
  | 'metallic-gravity'
  | 'physics-playground'
  | 'neon-rainbow'
  | 'cosmic-orbital'
  | 'mechanical-universe'
  | 'crystal-cavern'
  | 'liquid-neon'
  | 'fourier-harp';

export type Sandbox2DType =
  | 'ellipse-laser' // Reflecting laser chords inside an ellipse bouncing between focal points (NexusBoxLab style)
  | 'wedge-escape' // "At what size will the ball escape?" shrinking ball in V-wedge with pixel radius counter
  | 'multiplier-overload' // 1 Ball vs 10,000 exponential ball cascading cascade with live floor counters
  | 'branching-waves' // XY coordinate axis branching into multi-harmonic audio frequency waveforms
  | 'landmark-flask'; // Falling icon silhouettes / spheres bouncing into glass flask on beat drops

export type CameraMode =
  | 'follow' // Follow lead sphere/projectile along track
  | 'orbit' // Smooth orbit around central structures
  | 'flythrough' // Forward cinematic drone path
  | 'spiral' // Spiraling descending angle
  | 'stationary'; // High angle fixed aesthetic view

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5';

export interface AudioMetrics {
  bass: number; // 20 - 150 Hz normalized 0-1
  subBass: number; // 20 - 60 Hz normalized 0-1
  lowMid: number; // 150 - 500 Hz normalized 0-1
  mid: number; // 500 - 2000 Hz normalized 0-1
  highMid: number; // 2000 - 5000 Hz normalized 0-1
  treble: number; // 5000 - 16000 Hz normalized 0-1
  energy: number; // Overall spectral energy 0-1
  rms: number; // Root mean square amplitude 0-1
  beat: boolean; // Instantaneous beat trigger
  beatStrength: number; // 0-1 intensity of current beat
  bpm: number; // Estimated BPM
  spectralFlux: number; // Dynamic change in spectrum
}

export interface AudioTrackInfo {
  id: string;
  name: string;
  artist?: string;
  duration: number;
  sampleRate: number;
  channels: number;
  sizeBytes?: number;
  isBuiltIn?: boolean;
  bpmEstimate?: number;
}

export interface BiomeConfig {
  seed: number;
  density: number; // 0.5 to 2.0
  speedMultiplier: number; // 0.2 to 3.0
  railThickness: number; // 0.5 to 2.0
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowIntensity: number; // 0.5 to 3.0
  metallicRoughness: number; // 0.05 to 0.8
  fogDensity: number; // 0 to 0.05
  backgroundBrightness: number; // 0 to 0.3
}

export interface Sandbox2DConfig {
  type: Sandbox2DType;
  headlineText: string;
  counterLabel: string;
  ballRadius: number; // 6 to 90 px
  shrinkRate: number; // e.g. 0.96 (shrinks 4% per hit) or 1.04
  restitution: number; // 0.6 to 1.05
  gravity: number; // -2 to 10
  speed: number; // 0.5 to 3.0
  ballCount: number; // 1 to 2000
  colorTheme: 'cyan-orange' | 'rainbow' | 'cyberpunk' | 'monochrome' | 'gold-emerald';
  soundFxEnabled: boolean;
  showLiveMetrics: boolean;
  laserReflectionCount: number;
  multiplierTarget: number;
}

export interface AudioReactiveConfig {
  sensitivity: number; // 0.5 to 2.5
  smoothing: number; // 0.1 to 0.95
  bassScaleResponse: number; // 0 to 3.0
  midRotationResponse: number; // 0 to 3.0
  trebleSparkResponse: number; // 0 to 3.0
  beatFlashIntensity: number; // 0 to 2.0
  cameraKick: number; // 0 to 1.0
  enableBassPulsing: boolean;
  enableBeatFlashes: boolean;
  enableTrebleSparks: boolean;
}

export interface WatermarkConfig {
  enabled: boolean;
  username: string; // e.g. "@satisfy3dverse"
  caption: string; // e.g. "Wait for the bass drop 🔊"
  fontFamily: 'script' | 'sans' | 'serif' | 'mono';
  fontSize: number; // 16 to 48
  position: 'top-center' | 'top-left' | 'top-right' | 'center' | 'bottom-center' | 'bottom-left' | 'bottom-right';
  opacity: number; // 0.1 to 1.0
  color: string;
  enableGlow: boolean;
  show3DInScene: boolean; // Render floating 3D text in the scene like reference videos!
}

export interface CameraConfig {
  mode: CameraMode;
  speed: number; // 0.2 to 3.0
  fov: number; // 40 to 90
  distance: number; // 0.5 to 2.5
  shakeIntensity: number; // 0 to 1.0
  autoSwitch: boolean; // Cut camera angles on strong drops
}

export interface ExportSettings {
  aspectRatio: AspectRatio;
  resolution: { width: number; height: number; label: string };
  fps: 24 | 30 | 60;
  quality: 'fast' | 'high' | 'ultra' | 'lossless';
  bitrateMbps: number;
  startTime: number;
  endTime: number;
  includeWatermark: boolean;
  includeCaptions: boolean;
  format: 'webm' | 'mp4';
}

export interface ProjectData {
  id: string;
  name: string;
  updatedAt: number;
  studioMode: StudioMode;
  biomeType: BiomeType;
  biomeConfig: BiomeConfig;
  sandboxConfig: Sandbox2DConfig;
  audioReactiveConfig: AudioReactiveConfig;
  watermarkConfig: WatermarkConfig;
  cameraConfig: CameraConfig;
  exportSettings: ExportSettings;
  trackInfo: AudioTrackInfo | null;
}
