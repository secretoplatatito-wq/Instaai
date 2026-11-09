import { ProjectData, BiomeType, AspectRatio, Sandbox2DConfig } from '../types';

export const DEFAULT_SANDBOX_CONFIG: Sandbox2DConfig = {
  type: 'ellipse-laser',
  headlineText: 'At what size will the ball escape?',
  counterLabel: 'ball radius',
  ballRadius: 48,
  shrinkRate: 0.96,
  restitution: 0.98,
  gravity: 1.4,
  speed: 1.2,
  ballCount: 1,
  colorTheme: 'cyan-orange',
  soundFxEnabled: true,
  showLiveMetrics: true,
  laserReflectionCount: 140,
  multiplierTarget: 10000,
};

export const DEFAULT_PRESETS: { id: string; name: string; description: string; data: Partial<ProjectData> }[] = [
  {
    id: 'preset-satisfy-chimes',
    name: 'Satisfying Chrome Chimes (Viral Reel)',
    description: 'Dark graphite atmosphere, dual chrome rails, rolling metallic sphere, hanging bells and glowing orange cores.',
    data: {
      studioMode: '3d-biome',
      biomeType: 'metallic-gravity',
      biomeConfig: {
        seed: 1042,
        density: 1.0,
        speedMultiplier: 1.0,
        railThickness: 1.1,
        primaryColor: '#ff6b35',
        secondaryColor: '#00f2fe',
        accentColor: '#ffd166',
        glowIntensity: 1.4,
        metallicRoughness: 0.1,
        fogDensity: 0.015,
        backgroundBrightness: 0.04,
      },
      cameraConfig: {
        mode: 'follow',
        speed: 1.0,
        fov: 55,
        distance: 1.0,
        shakeIntensity: 0.35,
        autoSwitch: false,
      },
      watermarkConfig: {
        enabled: true,
        username: '@satisfy3dverse',
        caption: 'Guess the song 🎵 • like & follow',
        fontFamily: 'script',
        fontSize: 28,
        position: 'center',
        opacity: 0.85,
        color: '#ffffff',
        enableGlow: false,
        show3DInScene: true,
      },
    },
  },
  {
    id: 'preset-ellipse-laser',
    name: 'Ellipse Laser Chord Harp (2D Viral)',
    description: 'Bouncing laser chords reflecting inside mathematical ellipse between focal points with harmonic resonance.',
    data: {
      studioMode: '2d-sandbox',
      sandboxConfig: {
        ...DEFAULT_SANDBOX_CONFIG,
        type: 'ellipse-laser',
        headlineText: 'Can laser chords strike every node?',
        counterLabel: 'chords strummed',
        speed: 1.4,
        colorTheme: 'cyan-orange',
      },
      watermarkConfig: {
        enabled: true,
        username: '@nexusboxlab',
        caption: 'Harmonic Ellipse Reflection 🔊',
        fontFamily: 'mono',
        fontSize: 24,
        position: 'top-center',
        opacity: 0.9,
        color: '#00f2fe',
        enableGlow: true,
        show3DInScene: false,
      },
    },
  },
  {
    id: 'preset-wedge-escape',
    name: 'V-Wedge Escape Funnel (2D Viral)',
    description: 'Ball shrinks on each bounce inside narrowing V-funnel with live radius counter until it slips through.',
    data: {
      studioMode: '2d-sandbox',
      sandboxConfig: {
        ...DEFAULT_SANDBOX_CONFIG,
        type: 'wedge-escape',
        headlineText: 'At what size will the ball escape?',
        counterLabel: 'ball radius',
        ballRadius: 58,
        shrinkRate: 0.96,
        restitution: 0.98,
        gravity: 1.8,
        speed: 1.3,
        colorTheme: 'cyan-orange',
      },
      watermarkConfig: {
        enabled: true,
        username: '@ballxbeats',
        caption: 'Wait for the final escape 🚀',
        fontFamily: 'sans',
        fontSize: 26,
        position: 'top-center',
        opacity: 0.9,
        color: '#ffffff',
        enableGlow: false,
        show3DInScene: false,
      },
    },
  },
  {
    id: 'preset-multiplier-overload',
    name: '1 Ball vs 10,000 Multiplier (2D Viral)',
    description: 'Cascading pinball floor drop multiplying exponentially from 1 to 10,000+ balls with floor count tracker.',
    data: {
      studioMode: '2d-sandbox',
      sandboxConfig: {
        ...DEFAULT_SANDBOX_CONFIG,
        type: 'multiplier-overload',
        headlineText: '1 Ball vs 10,000 Multiplier Overload',
        counterLabel: 'total balls',
        ballCount: 1,
        multiplierTarget: 10000,
        gravity: 2.2,
        speed: 1.4,
        colorTheme: 'rainbow',
      },
      watermarkConfig: {
        enabled: true,
        username: '@overloadlab.tv',
        caption: 'Watch the counter reach 10,000! 💥',
        fontFamily: 'sans',
        fontSize: 24,
        position: 'top-center',
        opacity: 0.9,
        color: '#ffffff',
        enableGlow: false,
        show3DInScene: false,
      },
    },
  },
  {
    id: 'preset-nexus-playground',
    name: 'Nexus Collision Physics (Multiplying Balls)',
    description: 'Octagon arena with rotating center gear paddle, bouncing spheres with collision sounds that multiply on beat drops.',
    data: {
      studioMode: '3d-biome',
      biomeType: 'physics-playground',
      biomeConfig: {
        seed: 7721,
        density: 1.2,
        speedMultiplier: 1.2,
        railThickness: 1.0,
        primaryColor: '#38bdf8',
        secondaryColor: '#f43f5e',
        accentColor: '#a855f7',
        glowIntensity: 1.5,
        metallicRoughness: 0.2,
        fogDensity: 0.01,
        backgroundBrightness: 0.02,
      },
      cameraConfig: {
        mode: 'stationary',
        speed: 1.0,
        fov: 60,
        distance: 0.9,
        shakeIntensity: 0.45,
        autoSwitch: false,
      },
      watermarkConfig: {
        enabled: true,
        username: '@NexusBoxLab',
        caption: 'Multiply by x5 on every hit 💥',
        fontFamily: 'sans',
        fontSize: 24,
        position: 'top-center',
        opacity: 0.9,
        color: '#ffffff',
        enableGlow: false,
        show3DInScene: false,
      },
    },
  },
  {
    id: 'preset-cosmic-orbital',
    name: 'Cosmic Saturnian Voyage',
    description: 'Majestic planet with 1200 glowing ring particles undulating to the music bass and harmonic frequencies.',
    data: {
      studioMode: '3d-biome',
      biomeType: 'cosmic-orbital',
      biomeConfig: {
        seed: 4409,
        density: 1.0,
        speedMultiplier: 0.9,
        railThickness: 1.0,
        primaryColor: '#8b5cf6',
        secondaryColor: '#06b6d4',
        accentColor: '#f59e0b',
        glowIntensity: 1.8,
        metallicRoughness: 0.2,
        fogDensity: 0.01,
        backgroundBrightness: 0.02,
      },
      cameraConfig: {
        mode: 'orbit',
        speed: 0.8,
        fov: 52,
        distance: 1.1,
        shakeIntensity: 0.2,
        autoSwitch: false,
      },
      watermarkConfig: {
        enabled: true,
        username: '@CosmicBeats',
        caption: 'Listen with headphones 🎧',
        fontFamily: 'serif',
        fontSize: 22,
        position: 'bottom-center',
        opacity: 0.75,
        color: '#f59e0b',
        enableGlow: true,
        show3DInScene: true,
      },
    },
  },
  {
    id: 'preset-fourier-harp',
    name: 'Fourier Harmonic Epicycles',
    description: 'Connected rotating mathematical circles drawing complex harmonic spirograph waveforms in 3D space.',
    data: {
      studioMode: '3d-biome',
      biomeType: 'fourier-harp',
      biomeConfig: {
        seed: 3141,
        density: 1.0,
        speedMultiplier: 1.1,
        railThickness: 1.0,
        primaryColor: '#00f2fe',
        secondaryColor: '#ec4899',
        accentColor: '#fbbf24',
        glowIntensity: 1.6,
        metallicRoughness: 0.3,
        fogDensity: 0.012,
        backgroundBrightness: 0.03,
      },
      cameraConfig: {
        mode: 'flythrough',
        speed: 1.0,
        fov: 55,
        distance: 1.0,
        shakeIntensity: 0.3,
        autoSwitch: false,
      },
      watermarkConfig: {
        enabled: true,
        username: 'vision.dev01',
        caption: 'Harmonic Epicycles in Motion',
        fontFamily: 'mono',
        fontSize: 20,
        position: 'top-left',
        opacity: 0.8,
        color: '#ffffff',
        enableGlow: false,
        show3DInScene: false,
      },
    },
  },
];

export const INITIAL_PROJECT: ProjectData = {
  id: 'project-default',
  name: 'Viral Chime Beat Reel',
  updatedAt: Date.now(),
  studioMode: '3d-biome',
  biomeType: 'metallic-gravity',
  biomeConfig: {
    seed: 1042,
    density: 1.0,
    speedMultiplier: 1.0,
    railThickness: 1.1,
    primaryColor: '#ff6b35',
    secondaryColor: '#00f2fe',
    accentColor: '#ffd166',
    glowIntensity: 1.4,
    metallicRoughness: 0.1,
    fogDensity: 0.015,
    backgroundBrightness: 0.04,
  },
  sandboxConfig: DEFAULT_SANDBOX_CONFIG,
  audioReactiveConfig: {
    sensitivity: 1.15,
    smoothing: 0.78,
    bassScaleResponse: 1.3,
    midRotationResponse: 1.2,
    trebleSparkResponse: 1.4,
    beatFlashIntensity: 1.25,
    cameraKick: 0.35,
    enableBassPulsing: true,
    enableBeatFlashes: true,
    enableTrebleSparks: true,
  },
  watermarkConfig: {
    enabled: true,
    username: '@satisfy3dverse',
    caption: 'Guess all songs 🎵 • like & follow',
    fontFamily: 'script',
    fontSize: 28,
    position: 'center',
    opacity: 0.85,
    color: '#ffffff',
    enableGlow: false,
    show3DInScene: true,
  },
  cameraConfig: {
    mode: 'follow',
    speed: 1.0,
    fov: 55,
    distance: 1.0,
    shakeIntensity: 0.35,
    autoSwitch: false,
  },
  exportSettings: {
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920, label: '1080x1920 (Reel / TikTok)' },
    fps: 30,
    quality: 'high',
    bitrateMbps: 8,
    startTime: 0,
    endTime: 15,
    includeWatermark: true,
    includeCaptions: true,
    format: 'mp4',
  },
  trackInfo: {
    id: 'gravity-chimes',
    name: 'Gravity Chimes (Satisfying Ambient)',
    artist: 'Biome Beat Studio',
    duration: 30,
    sampleRate: 44100,
    channels: 2,
    isBuiltIn: true,
    bpmEstimate: 110,
  },
};

export class ProjectStore {
  private static STORAGE_KEY = 'biome_beat_projects_v1';
  private static ACTIVE_KEY = 'biome_beat_active_project_id';

  public static getSavedProjects(): ProjectData[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return [INITIAL_PROJECT];
  }

  public static saveProject(project: ProjectData) {
    const list = this.getSavedProjects();
    const index = list.findIndex((p) => p.id === project.id);
    project.updatedAt = Date.now();

    if (index >= 0) {
      list[index] = project;
    } else {
      list.unshift(project);
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      localStorage.setItem(this.ACTIVE_KEY, project.id);
    } catch {
      // Storage quota or unavailable
    }
  }

  public static deleteProject(id: string) {
    const list = this.getSavedProjects().filter((p) => p.id !== id);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  public static exportProjectJson(project: ProjectData): string {
    return JSON.stringify(project, null, 2);
  }

  public static importProjectJson(jsonStr: string): ProjectData {
    const parsed = JSON.parse(jsonStr) as ProjectData;
    parsed.id = `imported-${Date.now()}`;
    parsed.name = `${parsed.name || 'Imported'} (Copy)`;
    this.saveProject(parsed);
    return parsed;
  }
}
