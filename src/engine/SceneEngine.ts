import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BiomeType, BiomeConfig, AudioMetrics, AudioReactiveConfig, CameraConfig, AspectRatio } from '../types';
import { IBiome } from '../biomes/BiomeBase';
import { createBiomeInstance } from '../biomes/BiomeRegistry';

export class SceneEngine {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private pmremGenerator!: THREE.PMREMGenerator;

  // Lighting
  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.PointLight;
  private beatFlashLight!: THREE.PointLight;

  // Active Biome
  private activeBiome: IBiome | null = null;
  private activeBiomeType: BiomeType = 'metallic-gravity';

  // Camera State
  private cameraConfig: CameraConfig = {
    mode: 'follow',
    speed: 1.0,
    fov: 55,
    distance: 1.0,
    shakeIntensity: 0.35,
    autoSwitch: false,
  };
  private currentCameraPos = new THREE.Vector3(0, 5, 14);
  private targetCameraPos = new THREE.Vector3(0, 5, 14);
  private currentLookAt = new THREE.Vector3(0, 0, 0);
  private targetLookAt = new THREE.Vector3(0, 0, 0);

  // Animation Loop State
  private isRunning: boolean = false;
  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private elapsedTime: number = 0;
  private isSoftwareGl: boolean = false;

  // Aspect ratio & dimensions
  private aspect: number = 9 / 16;
  private width: number = 360;
  private height: number = 640;

  // Callbacks
  private onFrameRender?: (time: number) => void;

  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    this.container = container;
    this.canvas = canvas;
    this.init();
  }

  private init() {
    // 1. Detect Software GL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // Crucial for direct canvas capture during export!
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. Scene & Studio RoomEnvironment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c10);
    this.scene.fog = new THREE.FogExp2(0x0a0c10, 0.015);

    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.pmremGenerator.dispose();

    // 4. Studio Lighting Rig
    // Warm key light
    this.keyLight = new THREE.DirectionalLight(0xfff1e6, 2.4);
    this.keyLight.position.set(12, 18, 14);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    // Cool Hemisphere fill light
    this.hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 1.2);
    this.scene.add(this.hemiLight);

    // Soft colored rim light
    this.rimLight = new THREE.PointLight(0x00f2fe, 1.8, 30);
    this.rimLight.position.set(-14, 8, -10);
    this.scene.add(this.rimLight);

    // Beat shockwave flash light
    this.beatFlashLight = new THREE.PointLight(0xffffff, 0, 45);
    this.beatFlashLight.position.set(0, 8, 10);
    this.scene.add(this.beatFlashLight);

    // 5. Camera
    this.camera = new THREE.PerspectiveCamera(this.cameraConfig.fov, this.aspect, 0.1, 1000);
    this.camera.position.set(0, 5, 14);
    this.camera.lookAt(0, 0, 0);

    // Resize initial
    this.resize();
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public setBiome(type: BiomeType, config: BiomeConfig) {
    if (this.activeBiome) {
      this.activeBiome.dispose(this.scene);
      this.activeBiome = null;
    }

    this.activeBiomeType = type;
    this.activeBiome = createBiomeInstance(type);
    this.activeBiome.init(this.scene, config);

    // Set fog and background from config
    const bgCol = new THREE.Color(config.backgroundBrightness, config.backgroundBrightness, config.backgroundBrightness + 0.02);
    this.scene.background = bgCol;
    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = bgCol;
      this.scene.fog.density = config.fogDensity;
    }
  }

  public setCameraConfig(config: CameraConfig) {
    this.cameraConfig = { ...config };
    this.camera.fov = config.fov;
    this.camera.updateProjectionMatrix();
  }

  public setAspectRatio(aspect: AspectRatio) {
    let numericAspect = 9 / 16;
    if (aspect === '16:9') numericAspect = 16 / 9;
    else if (aspect === '1:1') numericAspect = 1 / 1;
    else if (aspect === '4:5') numericAspect = 4 / 5;

    this.aspect = numericAspect;
    this.resize();
  }

  public resize() {
    const parent = this.container;
    if (!parent) return;

    const parentW = parent.clientWidth || 360;
    const parentH = parent.clientHeight || 640;

    let targetW = parentW;
    let targetH = parentW / this.aspect;

    if (targetH > parentH) {
      targetH = parentH;
      targetW = parentH * this.aspect;
    }

    this.width = Math.floor(targetW);
    this.height = Math.floor(targetH);

    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
  }

  public startAnimation(
    getMetrics: () => AudioMetrics,
    getConfig: () => BiomeConfig,
    getReactiveConfig: () => AudioReactiveConfig,
    onFrame?: (time: number) => void
  ) {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.onFrameRender = onFrame;

    const tick = () => {
      if (!this.isRunning) return;

      const now = performance.now();
      const delta = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      this.elapsedTime += delta;

      const metrics = getMetrics();
      const config = getConfig();
      const reactiveConfig = getReactiveConfig();

      this.stepScene(delta, this.elapsedTime, metrics, config, reactiveConfig);
      this.renderer.render(this.scene, this.camera);
      this.onFrameRender?.(this.elapsedTime);

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  public stopAnimation() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  /**
   * Deterministic rendering of a specific frame at timestamp `time`
   * Used for high-quality video encoding
   */
  public renderExplicitFrame(
    time: number,
    delta: number,
    metrics: AudioMetrics,
    config: BiomeConfig,
    reactiveConfig: AudioReactiveConfig
  ) {
    this.stepScene(delta, time, metrics, config, reactiveConfig);
    this.renderer.render(this.scene, this.camera);
  }

  private stepScene(
    delta: number,
    time: number,
    metrics: AudioMetrics,
    config: BiomeConfig,
    reactiveConfig: AudioReactiveConfig
  ) {
    // 1. Update Active Biome
    if (this.activeBiome) {
      this.activeBiome.update(delta, time, metrics, config, reactiveConfig);
    }

    // 2. Audio-Reactive Lighting
    if (reactiveConfig.enableBeatFlashes && metrics.beat) {
      this.beatFlashLight.intensity = 2.8 * reactiveConfig.beatFlashIntensity;
    } else {
      this.beatFlashLight.intensity = Math.max(0, this.beatFlashLight.intensity - delta * 8.0);
    }

    this.rimLight.intensity = 1.2 + metrics.treble * 1.5;

    // 3. Update Camera Movement based on Mode
    const followPoint = this.activeBiome ? this.activeBiome.getFollowTarget() : new THREE.Vector3(0, 0, 0);
    const distMultiplier = this.cameraConfig.distance;

    switch (this.cameraConfig.mode) {
      case 'follow': {
        // Smoothly follow lead object slightly above and behind
        this.targetCameraPos.set(
          followPoint.x * 0.4,
          followPoint.y + 4.2 * distMultiplier,
          followPoint.z + 12.0 * distMultiplier
        );
        this.targetLookAt.copy(followPoint);
        break;
      }
      case 'orbit': {
        // Slow cinematic 360 orbit around central focal point
        const orbitAngle = time * 0.35 * this.cameraConfig.speed;
        const radius = 13.5 * distMultiplier;
        this.targetCameraPos.set(
          followPoint.x + Math.sin(orbitAngle) * radius,
          followPoint.y + 5.0 + Math.sin(orbitAngle * 0.5) * 2.5,
          followPoint.z + Math.cos(orbitAngle) * radius
        );
        this.targetLookAt.copy(followPoint);
        break;
      }
      case 'flythrough': {
        // Forward roller-coaster zoom through the biome
        const zoomY = Math.sin(time * 0.4) * 6.0;
        this.targetCameraPos.set(
          Math.sin(time * 0.5) * 3.0,
          zoomY + 4.0,
          8.0 * distMultiplier
        );
        this.targetLookAt.set(0, zoomY, -10);
        break;
      }
      case 'spiral': {
        // Spiraling descending motion
        const spiralAngle = time * 0.6 * this.cameraConfig.speed;
        const spiralR = 10.0 * distMultiplier;
        this.targetCameraPos.set(
          Math.cos(spiralAngle) * spiralR,
          Math.sin(time * 0.3) * 8.0,
          Math.sin(spiralAngle) * spiralR
        );
        this.targetLookAt.copy(followPoint);
        break;
      }
      case 'stationary':
      default: {
        // Fixed high-angle aesthetic framing
        this.targetCameraPos.set(0, 4.5, 14.5 * distMultiplier);
        this.targetLookAt.copy(followPoint);
        break;
      }
    }

    // Smooth camera interpolation (exponential damping)
    const dampAlpha = 1 - Math.exp(-6.0 * delta);
    this.currentCameraPos.lerp(this.targetCameraPos, dampAlpha);
    this.currentLookAt.lerp(this.targetLookAt, dampAlpha);

    // Subtle beat camera thump / shake
    const shake = metrics.beat ? (Math.random() - 0.5) * 0.25 * this.cameraConfig.shakeIntensity * reactiveConfig.cameraKick : 0;

    this.camera.position.set(
      this.currentCameraPos.x + shake,
      this.currentCameraPos.y + shake,
      this.currentCameraPos.z
    );
    this.camera.lookAt(this.currentLookAt);
  }

  public dispose() {
    this.stopAnimation();
    if (this.activeBiome) {
      this.activeBiome.dispose(this.scene);
      this.activeBiome = null;
    }
    this.renderer.dispose();
  }
}
