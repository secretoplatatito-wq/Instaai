import { AudioMetrics, Sandbox2DConfig, WatermarkConfig, AspectRatio } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface SimBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  bounceCount: number;
  escaped?: boolean;
}

interface LaserSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  color: string;
}

export class Sandbox2DEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLDivElement;

  private width: number = 1080;
  private height: number = 1920;
  private aspectRatio: AspectRatio = '9:16';

  // Audio Context for sound synthesis
  private audioCtx: AudioContext | null = null;
  private lastSoundTime: number = 0;

  // Simulation State
  private simTime: number = 0;
  private hitCounter: number = 0;
  private totalBallsCounter: number = 1;
  private particles: Particle[] = [];
  private balls: SimBall[] = [];

  // Ellipse Laser State
  private laserSegments: LaserSegment[] = [];
  private laserPos = { x: 0, y: 0 };
  private laserVel = { x: 4, y: 3 };

  // Wedge Escape State
  private wedgeBall: SimBall = {
    x: 0,
    y: 0,
    vx: 3,
    vy: 0,
    radius: 48,
    color: '#00f2fe',
    bounceCount: 0,
  };
  private wedgeEscaped: boolean = false;
  private escapeTimer: number = 0;

  // Multiplier Overload State
  private multiplierBalls: SimBall[] = [];
  private multiplierFloorCount: number = 1;
  private multiplierGates: { y: number; text: string; factor: number; color: string }[] = [];

  // Landmark Flask State
  private flaskItems: { x: number; y: number; vx: number; vy: number; rot: number; vrot: number; type: number; color: string; size: number }[] = [];

  // 1. Egg Pi Collision State (3Blue1Brown / Eulerism π digits)
  private piHits: number = 0;
  private piSmallX: number = 260;
  private piSmallV: number = 0;
  private piBigX: number = 720;
  private piBigV: number = -2.8;
  private piMassRatio: number = 10000;
  private piDigitsDisplay: string = '3.14';

  // 2. Planet Flask State (Solar System celestial drop into flask)
  private flaskPlanets: { name: string; radius: number; color: string; glow: string; mass: string; x: number; y: number; vx: number; vy: number; rot: number; vrot: number; hasRing?: boolean }[] = [];
  private planetSpawnTimer: number = 0;
  private planetIndex: number = 0;

  // 3. Spring Smash State (Hydraulic piston doubling eggs)
  private pistonY: number = 320;
  private pistonPhase: number = 0;
  private smashedEggCount: number = 2;
  private eggShards: { x: number; y: number; vx: number; vy: number; size: number; color: string; alpha: number; life: number; maxLife: number }[] = [];

  // 4. Bands Broken State (1000°C glowing steel sphere vs 200 tension bands)
  private hotBallY: number = 240;
  private hotBallVy: number = 2.0;
  private currentTemp: number = 999;
  private bandsRemaining: number = 200;
  private bands: { y: number; broken: boolean; color: string; stretch: number }[] = [];

  // 5. Spirograph Flower State (Harmonic cycloids song guesser)
  private spiroPoints: { x: number; y: number; color: string }[] = [];
  private spiroAngle: number = 0;
  private spiroBall = { x: 540, y: 960, vx: 6, vy: 4 };

  constructor(container: HTMLDivElement, canvas: HTMLCanvasElement) {
    this.container = container;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;

    this.initAudioSynthesizer();
    this.resize();
    this.resetSimulation({
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
    });
  }

  private initAudioSynthesizer() {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    } catch {
      // Audio synthesis optional
    }
  }

  public setAudioContext(ctx: AudioContext) {
    this.audioCtx = ctx;
  }

  private playCollisionTone(frequency: number, duration: number = 0.18, volume: number = 0.12) {
    if (!this.audioCtx) return;
    const now = performance.now();
    // Rate limit sound triggers to avoid clipping
    if (now - this.lastSoundTime < 35) return;
    this.lastSoundTime = now;

    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  public setAspectRatio(aspect: AspectRatio) {
    this.aspectRatio = aspect;
    this.resize();
  }

  public resize() {
    const parent = this.container;
    const containerW = parent.clientWidth || window.innerWidth;
    const containerH = parent.clientHeight || window.innerHeight;

    let targetW = 1080;
    let targetH = 1920;

    if (this.aspectRatio === '9:16') {
      targetW = 1080;
      targetH = 1920;
    } else if (this.aspectRatio === '1:1') {
      targetW = 1080;
      targetH = 1080;
    } else if (this.aspectRatio === '16:9') {
      targetW = 1920;
      targetH = 1080;
    } else if (this.aspectRatio === '4:5') {
      targetW = 1080;
      targetH = 1350;
    }

    this.width = targetW;
    this.height = targetH;

    this.canvas.width = targetW;
    this.canvas.height = targetH;

    // Scale CSS to fit container perfectly while preserving aspect ratio
    const scale = Math.min((containerW * 0.94) / targetW, (containerH * 0.94) / targetH);
    this.canvas.style.width = `${Math.round(targetW * scale)}px`;
    this.canvas.style.height = `${Math.round(targetH * scale)}px`;
  }

  public resetSimulation(config: Sandbox2DConfig) {
    this.hitCounter = 0;
    this.totalBallsCounter = 1;
    this.particles = [];
    this.simTime = 0;

    const cx = this.width / 2;
    const cy = this.height / 2;

    if (config.type === 'ellipse-laser') {
      this.laserSegments = [];
      const a = this.width * 0.42;
      const b = this.height * 0.36;
      const c = Math.sqrt(Math.max(0, a * a - b * b));
      // Start from focus
      this.laserPos = { x: cx - c + 5, y: cy };
      const angle = (Math.PI / 4) + (Math.random() * 0.2);
      const speed = 14 * config.speed;
      this.laserVel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
    } else if (config.type === 'wedge-escape') {
      this.wedgeBall = {
        x: cx,
        y: this.height * 0.28,
        vx: (Math.random() > 0.5 ? 4 : -4) * config.speed,
        vy: 0,
        radius: config.ballRadius,
        color: '#00f2fe',
        bounceCount: 0,
      };
      this.wedgeEscaped = false;
      this.escapeTimer = 0;
    } else if (config.type === 'multiplier-overload') {
      this.multiplierBalls = [
        {
          x: cx,
          y: this.height * 0.16,
          vx: (Math.random() - 0.5) * 4,
          vy: 2,
          radius: 12,
          color: '#38bdf8',
          bounceCount: 0,
        },
      ];
      this.multiplierFloorCount = 1;
      this.multiplierGates = [
        { y: this.height * 0.32, text: 'x2', factor: 2, color: '#38bdf8' },
        { y: this.height * 0.48, text: 'x5', factor: 5, color: '#a855f7' },
        { y: this.height * 0.64, text: 'x10', factor: 10, color: '#f43f5e' },
      ];
    } else if (config.type === 'landmark-flask') {
      this.flaskItems = [];
    } else if (config.type === 'egg-pi') {
      const p = config.piMassRatioPower ?? 4;
      this.piMassRatio = Math.pow(10, p);
      this.piHits = 0;
      this.piSmallX = 260;
      this.piSmallV = 0;
      this.piBigX = 720;
      this.piBigV = -2.6 * config.speed;
      this.piDigitsDisplay = p >= 4 ? '3.14' : p === 2 ? '3.1' : '3';
    } else if (config.type === 'planet-flask') {
      this.flaskPlanets = [];
      this.planetSpawnTimer = 0;
      this.planetIndex = 0;
    } else if (config.type === 'spring-smash') {
      this.pistonY = this.height * 0.28;
      this.pistonPhase = 0;
      this.smashedEggCount = 2;
      this.eggShards = [];
    } else if (config.type === 'bands-broken') {
      this.hotBallY = this.height * 0.24;
      this.hotBallVy = 2.0 * config.speed;
      this.currentTemp = config.temperatureCelsius ?? 999;
      this.bandsRemaining = 200;
      this.bands = [];
      const startY = this.height * 0.35;
      const endY = this.height * 0.86;
      const step = (endY - startY) / 200;
      const palette = ['#ff4444', '#ff8800', '#ffd700', '#00e676', '#00b0ff', '#d500f9'];
      for (let i = 0; i < 200; i++) {
        this.bands.push({
          y: startY + i * step,
          broken: false,
          color: palette[i % palette.length],
          stretch: 0,
        });
      }
    } else if (config.type === 'spirograph-flower') {
      this.spiroPoints = [];
      this.spiroAngle = 0;
      const cx = this.width / 2;
      const cy = this.height / 2;
      this.spiroBall = { x: cx + 20, y: cy + 20, vx: 5.5 * config.speed, vy: 3.5 * config.speed };
    }
  }

  public render(
    metrics: AudioMetrics,
    config: Sandbox2DConfig,
    watermarkConfig: WatermarkConfig,
    deltaTime: number
  ) {
    const dt = Math.min(0.05, Math.max(0.005, deltaTime));
    this.simTime += dt;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Dark sleek cinematic background with deep vignette
    ctx.fillStyle = '#080a0f';
    ctx.fillRect(0, 0, w, h);

    // Subtle background grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // Beat pulse flash
    if (metrics.beat && metrics.beatStrength > 0.4) {
      ctx.fillStyle = `rgba(0, 242, 254, ${metrics.beatStrength * 0.08})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Process Scratch-Like Rule Blocks if configured
    if (config.scratchRules && config.scratchRules.length > 0) {
      this.processScratchRules(metrics, config);
    }

    // Render Mode Specific Simulation
    switch (config.type) {
      case 'ellipse-laser':
        this.renderEllipseLaser(ctx, metrics, config, dt);
        break;
      case 'wedge-escape':
        this.renderWedgeEscape(ctx, metrics, config, dt);
        break;
      case 'multiplier-overload':
        this.renderMultiplierOverload(ctx, metrics, config, dt);
        break;
      case 'branching-waves':
        this.renderBranchingWaves(ctx, metrics, config, dt);
        break;
      case 'landmark-flask':
        this.renderLandmarkFlask(ctx, metrics, config, dt);
        break;
      case 'egg-pi':
        this.renderEggPi(ctx, metrics, config, dt);
        break;
      case 'planet-flask':
        this.renderPlanetFlask(ctx, metrics, config, dt);
        break;
      case 'spring-smash':
        this.renderSpringSmash(ctx, metrics, config, dt);
        break;
      case 'bands-broken':
        this.renderBandsBroken(ctx, metrics, config, dt);
        break;
      case 'spirograph-flower':
        this.renderSpirographFlower(ctx, metrics, config, dt);
        break;
    }

    // Render Global Particles
    this.updateAndRenderParticles(ctx, dt);

    // Render Top Headline Question Banner (viral styling like user references)
    if (config.headlineText) {
      this.renderHeadlineBanner(ctx, config.headlineText);
    }

    // Render Watermark / Creator tag
    if (watermarkConfig.enabled && watermarkConfig.username) {
      this.renderWatermark(ctx, watermarkConfig);
    }
  }

  // 1. ELLIPSE LASER CHORD HARP
  private renderEllipseLaser(
    ctx: CanvasRenderingContext2D,
    metrics: AudioMetrics,
    config: Sandbox2DConfig,
    dt: number
  ) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const a = this.width * 0.42;
    const b = this.height * 0.36;
    const c = Math.sqrt(Math.max(0, a * a - b * b));

    // Draw Ellipse Boundary with glowing stroke
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Glowing rim
    ctx.strokeStyle = config.colorTheme === 'cyan-orange' ? '#00f2fe' : '#f59e0b';
    ctx.lineWidth = 2 + metrics.bass * 3;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.restore();

    // Draw Foci $F_1, F_2$
    ctx.save();
    const fociPulse = 6 + metrics.subBass * 8;
    ctx.fillStyle = '#ff6b35';
    ctx.shadowColor = '#ff6b35';
    ctx.shadowBlur = 12;

    // F1
    ctx.beginPath();
    ctx.arc(cx - c, cy, fociPulse, 0, Math.PI * 2);
    ctx.fill();

    // F2
    ctx.beginPath();
    ctx.arc(cx + c, cy, fociPulse, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('F₁', cx - c - 18, cy - 14);
    ctx.fillText('F₂', cx + c + 8, cy - 14);
    ctx.restore();

    // Sub-stepping for laser ray physics
    const subSteps = 4;
    const stepDt = dt / subSteps;
    const speedScale = config.speed * 60;

    for (let step = 0; step < subSteps; step++) {
      const prevX = this.laserPos.x;
      const prevY = this.laserPos.y;

      this.laserPos.x += this.laserVel.x * stepDt * speedScale;
      this.laserPos.y += this.laserVel.y * stepDt * speedScale;

      // Check ellipse boundary equation: ((x - cx)/a)^2 + ((y - cy)/b)^2 >= 1
      const nx = (this.laserPos.x - cx) / a;
      const ny = (this.laserPos.y - cy) / b;
      const distSq = nx * nx + ny * ny;

      if (distSq >= 0.99) {
        // Compute ellipse normal: gradient of ((x-cx)/a)^2 + ((y-cy)/b)^2
        const gradX = (2 * (this.laserPos.x - cx)) / (a * a);
        const gradY = (2 * (this.laserPos.y - cy)) / (b * b);
        const gradLen = Math.hypot(gradX, gradY) || 1;
        const normX = -gradX / gradLen; // pointing inward
        const normY = -gradY / gradLen;

        // Reflect velocity: v' = v - 2 * (v·norm) * norm
        const dot = this.laserVel.x * normX + this.laserVel.y * normY;
        this.laserVel.x = this.laserVel.x - 2 * dot * normX;
        this.laserVel.y = this.laserVel.y - 2 * dot * normY;

        // Reposition inside slightly
        this.laserPos.x = cx + nx * a * 0.985;
        this.laserPos.y = cy + ny * b * 0.985;

        this.hitCounter++;

        // Add laser trail segment
        const chordHue = (this.hitCounter * 23) % 360;
        const chordColor = `hsl(${chordHue}, 100%, 65%)`;

        this.laserSegments.push({
          x1: prevX,
          y1: prevY,
          x2: this.laserPos.x,
          y2: this.laserPos.y,
          alpha: 1.0,
          color: chordColor,
        });

        // Spawn hit spark particles
        for (let p = 0; p < 8; p++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 2 + Math.random() * 5;
          this.particles.push({
            x: this.laserPos.x,
            y: this.laserPos.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            radius: 2 + Math.random() * 3,
            color: chordColor,
            alpha: 1.0,
            life: 0,
            maxLife: 0.4 + Math.random() * 0.3,
          });
        }

        // Sound Synthesis
        if (config.soundFxEnabled) {
          const pentatonic = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
          const freq = pentatonic[this.hitCounter % pentatonic.length];
          this.playCollisionTone(freq, 0.22, 0.15);
        }

        // Keep laser history bounded
        if (this.laserSegments.length > (config.laserReflectionCount || 140)) {
          this.laserSegments.shift();
        }
      }
    }

    // Render Laser History Lines (chord string web)
    ctx.save();
    for (let i = 0; i < this.laserSegments.length; i++) {
      const seg = this.laserSegments[i];
      seg.alpha = Math.max(0.08, seg.alpha * 0.999);

      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.strokeStyle = seg.color;
      ctx.globalAlpha = seg.alpha;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();

    // Render Current Laser Head (Glowing Core)
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.laserPos.x, this.laserPos.y, 6 + metrics.bass * 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.restore();

    // Live Metrics HUD: Chords strummed & reflection angle
    if (config.showLiveMetrics) {
      this.renderLiveHUD(ctx, [
        { label: 'CHORDS STRUMMED', value: `${this.hitCounter}` },
        { label: 'FOCAL DISTANCE c', value: `${c.toFixed(1)} px` },
        { label: 'ECCENTRICITY e', value: `${(c / a).toFixed(3)}` },
      ]);
    }
  }

  // 2. V-WEDGE ESCAPE FUNNEL ("At what size will the ball escape?")
  private renderWedgeEscape(
    ctx: CanvasRenderingContext2D,
    metrics: AudioMetrics,
    config: Sandbox2DConfig,
    dt: number
  ) {
    const cx = this.width / 2;
    const topY = this.height * 0.22;
    const bottomY = this.height * 0.78;
    const topHalfW = this.width * 0.44;
    const gapWidth = 24; // opening at bottom apex

    // Wedge corner coordinates
    const leftTop = { x: cx - topHalfW, y: topY };
    const rightTop = { x: cx + topHalfW, y: topY };
    const leftBottom = { x: cx - gapWidth / 2, y: bottomY };
    const rightBottom = { x: cx + gapWidth / 2, y: bottomY };

    // Draw V-Funnel Walls with glowing neon edges
    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 18;

    // Left wall
    ctx.beginPath();
    ctx.moveTo(leftTop.x, leftTop.y);
    ctx.lineTo(leftBottom.x, leftBottom.y);
    ctx.stroke();

    // Right wall
    ctx.beginPath();
    ctx.moveTo(rightTop.x, rightTop.y);
    ctx.lineTo(rightBottom.x, rightBottom.y);
    ctx.stroke();

    // Escape gap indicators
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftBottom.x - 10, leftBottom.y);
    ctx.lineTo(leftBottom.x, leftBottom.y);
    ctx.moveTo(rightBottom.x, rightBottom.y);
    ctx.lineTo(rightBottom.x + 10, rightBottom.y);
    ctx.stroke();

    // Gap label
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'center';
    ctx.fillText(`GAP: ${gapWidth}px`, cx, bottomY + 24);
    ctx.restore();

    // Ball physics
    const ball = this.wedgeBall;

    if (!this.wedgeEscaped) {
      // Apply gravity
      ball.vy += config.gravity * 9.8 * dt * 45;
      ball.x += ball.vx * dt * 50 * config.speed;
      ball.y += ball.vy * dt * 50 * config.speed;

      // Check collision with Left Wall
      // Vector from leftBottom to leftTop
      const lwX = leftTop.x - leftBottom.x;
      const lwY = leftTop.y - leftBottom.y;
      const lwLen = Math.hypot(lwX, lwY);
      const lNormX = -lwY / lwLen; // normal points inward towards center
      const lNormY = lwX / lwLen;

      // Distance from ball center to left wall line
      const lDist = (ball.x - leftBottom.x) * lNormX + (ball.y - leftBottom.y) * lNormY;

      if (lDist < ball.radius && ball.y > topY && ball.y < bottomY) {
        // Collided with left wall!
        const penetration = ball.radius - lDist;
        ball.x += lNormX * penetration;
        ball.y += lNormY * penetration;

        // Reflect velocity with restitution
        const dot = ball.vx * lNormX + ball.vy * lNormY;
        ball.vx = (ball.vx - 2 * dot * lNormX) * config.restitution;
        ball.vy = (ball.vy - 2 * dot * lNormY) * config.restitution;

        this.onWedgeBounce(ball, config);
      }

      // Check collision with Right Wall
      const rwX = rightTop.x - rightBottom.x;
      const rwY = rightTop.y - rightBottom.y;
      const rwLen = Math.hypot(rwX, rwY);
      const rNormX = rwY / rwLen; // normal points inward towards center
      const rNormY = -rwX / rwLen;

      const rDist = (ball.x - rightBottom.x) * rNormX + (ball.y - rightBottom.y) * rNormY;

      if (rDist < ball.radius && ball.y > topY && ball.y < bottomY) {
        // Collided with right wall!
        const penetration = ball.radius - rDist;
        ball.x += rNormX * penetration;
        ball.y += rNormY * penetration;

        const dot = ball.vx * rNormX + ball.vy * rNormY;
        ball.vx = (ball.vx - 2 * dot * rNormX) * config.restitution;
        ball.vy = (ball.vy - 2 * dot * rNormY) * config.restitution;

        this.onWedgeBounce(ball, config);
      }

      // Check if ball slips through the escape gap!
      if (ball.y >= bottomY && ball.radius * 2 <= gapWidth + 2) {
        this.wedgeEscaped = true;
        this.escapeTimer = 0;
        // Big particle explosion
        for (let p = 0; p < 80; p++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 4 + Math.random() * 12;
          this.particles.push({
            x: ball.x,
            y: ball.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            radius: 3 + Math.random() * 5,
            color: p % 2 === 0 ? '#38bdf8' : '#f59e0b',
            alpha: 1.0,
            life: 0,
            maxLife: 1.2,
          });
        }
        if (config.soundFxEnabled) {
          this.playCollisionTone(880, 0.4, 0.25);
        }
      }
    } else {
      // Escaped state: falling down into open space
      ball.vy += config.gravity * 9.8 * dt * 50;
      ball.y += ball.vy * dt * 50;
      this.escapeTimer += dt;

      if (ball.y > this.height + 100 || this.escapeTimer > 2.5) {
        // Reset ball to top
        this.resetSimulation(config);
      }
    }

    // Render Ball with metallic chrome sheen & glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, Math.max(3, ball.radius), 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      ball.radius * 0.1,
      ball.x,
      ball.y,
      ball.radius
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#00f2fe');
    grad.addColorStop(1, '#0284c7');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 18;
    ctx.fill();

    // Draw live pixel radius badge above ball (exactly matching viral reference video)
    ctx.font = '700 16px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    const radiusText = `ball radius: ${ball.radius.toFixed(3)}px`;
    ctx.fillText(radiusText, ball.x, ball.y - ball.radius - 12);

    // Escape victory banner
    if (this.wedgeEscaped) {
      ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 25;
      ctx.fillText('ESCAPED! 🚀', cx, bottomY + 70);
    }
    ctx.restore();

    // Live Metrics HUD
    if (config.showLiveMetrics) {
      this.renderLiveHUD(ctx, [
        { label: 'BALL RADIUS', value: `${ball.radius.toFixed(3)} px` },
        { label: 'BOUNCE COUNT', value: `${ball.bounceCount}` },
        { label: 'TARGET GAP', value: `${gapWidth} px` },
      ]);
    }
  }

  private onWedgeBounce(ball: SimBall, config: Sandbox2DConfig) {
    ball.bounceCount++;
    this.hitCounter++;

    // Shrink ball by shrinkRate (e.g. 0.96)
    const prevR = ball.radius;
    ball.radius = Math.max(4, ball.radius * config.shrinkRate);

    // Spawn sparks
    for (let p = 0; p < 10; p++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 6;
      this.particles.push({
        x: ball.x,
        y: ball.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: 2 + Math.random() * 3,
        color: '#00f2fe',
        alpha: 1.0,
        life: 0,
        maxLife: 0.35,
      });
    }

    // Dynamic pitch ascending as ball shrinks!
    if (config.soundFxEnabled) {
      const freq = Math.min(1800, 260 + (60 - ball.radius) * 28);
      this.playCollisionTone(freq, 0.16, 0.14);
    }
  }

  // 3. MULTIPLIER OVERLOAD (1 Ball vs 10,000 Overload)
  private renderMultiplierOverload(
    ctx: CanvasRenderingContext2D,
    metrics: AudioMetrics,
    config: Sandbox2DConfig,
    dt: number
  ) {
    const cx = this.width / 2;

    // Multiplier Gates
    ctx.save();
    for (const gate of this.multiplierGates) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = gate.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = gate.color;
      ctx.shadowBlur = 15;

      const gateW = this.width * 0.72;
      const gateX = (this.width - gateW) / 2;
      const gateH = 44;

      ctx.strokeRect(gateX, gate.y - gateH / 2, gateW, gateH);
      ctx.fillRect(gateX, gate.y - gateH / 2, gateW, gateH);

      ctx.font = '800 22px "JetBrains Mono", monospace';
      ctx.fillStyle = gate.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`GATE ${gate.text} MULTIPLIER`, cx, gate.y);
    }
    ctx.restore();

    // Physics update for balls
    const maxBalls = 1500;
    const newSpawned: SimBall[] = [];

    for (let i = 0; i < this.multiplierBalls.length; i++) {
      const b = this.multiplierBalls[i];
      b.vy += config.gravity * 9.8 * dt * 30;
      b.x += b.vx * dt * 40 * config.speed;
      b.y += b.vy * dt * 40 * config.speed;

      // Bounce on left/right screen walls
      if (b.x < 60) {
        b.x = 60;
        b.vx = Math.abs(b.vx) * 0.9;
      } else if (b.x > this.width - 60) {
        b.x = this.width - 60;
        b.vx = -Math.abs(b.vx) * 0.9;
      }

      // Check gate passage
      for (const gate of this.multiplierGates) {
        if (Math.abs(b.y - gate.y) < 15 && b.bounceCount < 3 && this.multiplierBalls.length < maxBalls) {
          b.bounceCount++;
          this.multiplierFloorCount = Math.min(config.multiplierTarget || 10000, this.multiplierFloorCount * gate.factor);

          // Duplicate ball
          for (let k = 0; k < Math.min(4, gate.factor - 1); k++) {
            newSpawned.push({
              x: b.x + (Math.random() - 0.5) * 20,
              y: b.y + (Math.random() - 0.5) * 10,
              vx: (Math.random() - 0.5) * 8,
              vy: b.vy + Math.random() * 2,
              radius: Math.max(4, b.radius * 0.9),
              color: gate.color,
              bounceCount: 4,
            });
          }
        }
      }

      // Bottom recycle
      if (b.y > this.height * 0.85) {
        b.y = this.height * 0.85;
        b.vy = -Math.abs(b.vy) * 0.7;
      }
    }

    if (newSpawned.length > 0 && this.multiplierBalls.length < maxBalls) {
      this.multiplierBalls.push(...newSpawned);
      if (config.soundFxEnabled && Math.random() > 0.6) {
        this.playCollisionTone(340 + Math.random() * 400, 0.1, 0.08);
      }
    }

    // Render Balls
    ctx.save();
    for (const b of this.multiplierBalls) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    ctx.restore();

    // Large floor count badge at bottom (viral 10,000 multiplier tracker)
    ctx.save();
    const countY = this.height * 0.88;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 180, countY - 32, 360, 64, 16);
    ctx.fill();
    ctx.stroke();

    ctx.font = '900 32px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.multiplierBalls.length.toLocaleString()} BALLS`, cx, countY);
    ctx.restore();
  }

  // 4. HARMONIC BRANCHING WAVE AXIS (XY Cartesian Axis vibrating with audio)
  private renderBranchingWaves(
    ctx: CanvasRenderingContext2D,
    metrics: AudioMetrics,
    config: Sandbox2DConfig,
    dt: number
  ) {
    const cx = this.width / 2;
    const cy = this.height / 2;

    // High tech XY Axis
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;

    // X axis
    ctx.beginPath();
    ctx.moveTo(80, cy);
    ctx.lineTo(this.width - 80, cy);
    ctx.stroke();

    // Y axis
    ctx.beginPath();
    ctx.moveTo(cx, 160);
    ctx.lineTo(cx, this.height - 160);
    ctx.stroke();

    // Axis Ticks
    for (let x = 120; x < this.width - 80; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, cy - 6);
      ctx.lineTo(x, cy + 6);
      ctx.stroke();
    }
    for (let y = 200; y < this.height - 160; y += 60) {
      ctx.beginPath();
      ctx.moveTo(cx - 6, y);
      ctx.lineTo(cx + 6, y);
      ctx.stroke();
    }
    ctx.restore();

    // 4 Harmonic Waves branching out (SubBass, Bass, Mid, Treble)
    const waveConfigs = [
      { color: '#f43f5e', amp: 140 * metrics.subBass, freq: 0.012, speed: 3.2, label: 'SUB-BASS 45Hz' },
      { color: '#ff6b35', amp: 110 * metrics.bass, freq: 0.02, speed: 4.0, label: 'BASS 120Hz' },
      { color: '#00f2fe', amp: 85 * metrics.mid, freq: 0.035, speed: 5.5, label: 'MID 800Hz' },
      { color: '#a855f7', amp: 65 * metrics.treble, freq: 0.06, speed: 7.0, label: 'TREBLE 4.2kHz' },
    ];

    ctx.save();
    for (const wcfg of waveConfigs) {
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = wcfg.color;
      ctx.shadowColor = wcfg.color;
      ctx.shadowBlur = 16;

      const startX = 80;
      const endX = this.width - 80;

      for (let x = startX; x <= endX; x += 4) {
        const offset = x - cx;
        const envelope = Math.exp(-Math.pow(offset / (this.width * 0.35), 2)); // Gaussian envelope
        const y = cy + Math.sin(offset * wcfg.freq + this.simTime * wcfg.speed) * wcfg.amp * envelope;

        if (x === startX) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Live Metrics HUD
    if (config.showLiveMetrics) {
      this.renderLiveHUD(ctx, [
        { label: 'SPECTRAL ENERGY', value: `${(metrics.energy * 100).toFixed(1)}%` },
        { label: 'RMS AMPLITUDE', value: `${(metrics.rms * 100).toFixed(1)}%` },
        { label: 'ESTIMATED BPM', value: `${metrics.bpm}` },
      ]);
    }
  }

  // 5. LANDMARK / ICON PHYSICS FLASK
  private renderLandmarkFlask(
    ctx: CanvasRenderingContext2D,
    metrics: AudioMetrics,
    config: Sandbox2DConfig,
    dt: number
  ) {
    const cx = this.width / 2;
    const flaskBottomY = this.height * 0.78;
    const flaskRadius = this.width * 0.36;

    // Draw Glass Flask container
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, flaskBottomY - flaskRadius * 0.4, flaskRadius, 0.15 * Math.PI, 0.85 * Math.PI, false);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 20;
    ctx.stroke();

    // Neck of flask
    ctx.beginPath();
    ctx.moveTo(cx - 50, flaskBottomY - flaskRadius * 1.5);
    ctx.lineTo(cx - 50, flaskBottomY - flaskRadius * 1.1);
    ctx.moveTo(cx + 50, flaskBottomY - flaskRadius * 1.5);
    ctx.lineTo(cx + 50, flaskBottomY - flaskRadius * 1.1);
    ctx.stroke();
    ctx.restore();

    // Spawn falling icon / landmark on beat hit
    if (metrics.beat && metrics.beatStrength > 0.45 && this.flaskItems.length < 120) {
      this.flaskItems.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: flaskBottomY - flaskRadius * 1.5,
        vx: (Math.random() - 0.5) * 4,
        vy: 3,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 4,
        type: Math.floor(Math.random() * 4),
        color: ['#00f2fe', '#ff6b35', '#a855f7', '#ffd166'][Math.floor(Math.random() * 4)],
        size: 16 + Math.random() * 8,
      });

      if (config.soundFxEnabled) {
        this.playCollisionTone(400 + Math.random() * 200, 0.12, 0.1);
      }
    }

    // Physics update for falling landmarks
    ctx.save();
    for (const item of this.flaskItems) {
      item.vy += config.gravity * 9.8 * dt * 30;
      item.x += item.vx * dt * 40;
      item.y += item.vy * dt * 40;
      item.rot += item.vrot * dt;

      // Collide with spherical flask bottom
      const dx = item.x - cx;
      const dy = item.y - (flaskBottomY - flaskRadius * 0.4);
      const dist = Math.hypot(dx, dy);

      if (dist > flaskRadius - item.size) {
        const normX = -dx / dist;
        const normY = -dy / dist;
        item.x = cx - normX * (flaskRadius - item.size);
        item.y = (flaskBottomY - flaskRadius * 0.4) - normY * (flaskRadius - item.size);

        const dot = item.vx * normX + item.vy * normY;
        item.vx = (item.vx - 1.6 * dot * normX) * 0.7;
        item.vy = (item.vy - 1.6 * dot * normY) * 0.7;
      }

      // Render Landmark Shape
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rot);
      ctx.fillStyle = item.color;
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 10;

      if (item.type === 0) {
        // Crystal diamond
        ctx.beginPath();
        ctx.moveTo(0, -item.size);
        ctx.lineTo(item.size * 0.7, 0);
        ctx.lineTo(0, item.size);
        ctx.lineTo(-item.size * 0.7, 0);
        ctx.closePath();
        ctx.fill();
      } else if (item.type === 1) {
        // Star / Landmark spire
        ctx.beginPath();
        ctx.arc(0, 0, item.size * 0.65, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Rounded box
        ctx.fillRect(-item.size / 2, -item.size / 2, item.size, item.size);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // Live HUD Data Panel
  private renderLiveHUD(
    ctx: CanvasRenderingContext2D,
    rows: { label: string; value: string }[]
  ) {
    const pad = 16;
    const boxW = 220;
    const rowH = 22;
    const boxH = rows.length * rowH + pad * 2;
    const x = this.width - boxW - 24;
    const y = 80;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 14, 22, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';

    rows.forEach((r, idx) => {
      const curY = y + pad + idx * rowH + rowH / 2;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText(r.label, x + 12, curY);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#00f2fe';
      ctx.fillText(r.value, x + boxW - 12, curY);
    });

    ctx.restore();
  }

  // Top Headline Viral Banner ("At what size will the ball escape?", etc.)
  private renderHeadlineBanner(ctx: CanvasRenderingContext2D, text: string) {
    const cx = this.width / 2;
    const y = this.height * 0.11;

    ctx.save();
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText(text).width;
    const bannerW = Math.min(this.width * 0.88, textWidth + 48);

    // Glowing banner backdrop
    ctx.fillStyle = 'rgba(15, 20, 30, 0.88)';
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - bannerW / 2, y - 24, bannerW, 48, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 242, 254, 0.6)';
    ctx.shadowBlur = 12;
    ctx.fillText(text, cx, y);
    ctx.restore();
  }

  // Creator Watermark Overlay
  private renderWatermark(ctx: CanvasRenderingContext2D, cfg: WatermarkConfig) {
    ctx.save();
    ctx.globalAlpha = cfg.opacity;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cfg.color || '#ffffff';

    const cx = this.width / 2;
    const cy = cfg.position === 'top-center' ? this.height * 0.05 : this.height * 0.92;

    ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    if (cfg.enableGlow) {
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur = 14;
    }
    ctx.fillText(cfg.username, cx, cy);

    if (cfg.caption) {
      ctx.font = '400 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(cfg.caption, cx, cy + 26);
    }
    ctx.restore();
  }

  private updateAndRenderParticles(ctx: CanvasRenderingContext2D, dt: number) {
    ctx.save();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt * 50;
      p.y += p.vy * dt * 50;
      p.alpha = 1.0 - p.life / p.maxLife;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    ctx.restore();
  }

  // 6. EGG PI ELASTIC COLLISION SIMULATOR (Eulerism / 3Blue1Brown)
  private renderEggPi(
    ctx: CanvasRenderingContext2D,
    metrics: AudioMetrics,
    config: Sandbox2DConfig,
    dt: number
  ) {
    const w = this.width;
    const h = this.height;
    const wallX = 120;
    const floorY = h * 0.65;
    const m1 = 1.0;
    const m2 = this.piMassRatio; // e.g. 10000 -> 314 hits
    const subSteps = 30; // High sub-stepping so fast collisions never penetrate
    const subDt = dt / subSteps;

    const smallSize = 48;
    const bigSize = 120;

    for (let step = 0; step < subSteps; step++) {
      this.piSmallX += this.piSmallV * subDt * 60;
      this.piBigX += this.piBigV * subDt * 60;

      // Small mass hits wall at wallX
      if (this.piSmallX <= wallX) {
        this.piSmallX = wallX;
        this.piSmallV = -this.piSmallV;
        this.piHits++;
        if (config.soundFxEnabled && step === 0) {
          this.playCollisionTone(440 + (this.piHits % 36) * 16, 0.08, 0.15);
        }
        // Wall spark
        if (this.particles.length < 120) {
          this.particles.push({
            x: wallX,
            y: floorY - smallSize / 2 + (Math.random() - 0.5) * 20,
            vx: (Math.random() + 0.5) * 6,
            vy: (Math.random() - 0.5) * 8,
            radius: 3 + Math.random() * 3,
            color: '#00f2fe',
            alpha: 1,
            life: 0,
            maxLife: 0.35,
          });
        }
      }

      // Small mass hits big mass
      if (this.piSmallX + smallSize >= this.piBigX) {
        this.piSmallX = this.piBigX - smallSize;
        const u1 = this.piSmallV;
        const u2 = this.piBigV;
        // 1D Elastic collision formulas
        const v1 = ((m1 - m2) / (m1 + m2)) * u1 + ((2 * m2) / (m1 + m2)) * u2;
        const v2 = ((2 * m1) / (m1 + m2)) * u1 + ((m2 - m1) / (m1 + m2)) * u2;
        this.piSmallV = v1;
        this.piBigV = v2;
        this.piHits++;
        if (config.soundFxEnabled && step === 0) {
          this.playCollisionTone(260 + (this.piHits % 24) * 14, 0.08, 0.18);
        }
        // Clack spark
        if (this.particles.length < 120) {
          this.particles.push({
            x: this.piBigX,
            y: floorY - smallSize / 2 + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            radius: 3 + Math.random() * 4,
            color: '#f59e0b',
            alpha: 1,
            life: 0,
            maxLife: 0.35,
          });
        }
      }
    }

    // Auto-reset when big block escapes to the right past 1.2 * width
    if (this.piBigX > w * 1.15 && this.piBigV > 0 && this.piSmallV > 0) {
      this.piBigX = 740;
      this.piBigV = -2.6 * config.speed;
      this.piSmallX = 260;
      this.piSmallV = 0;
    }

    // Draw Floor & Left Wall
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;

    // Solid Wall with hazard hash marks
    ctx.beginPath();
    ctx.moveTo(wallX, floorY - 320);
    ctx.lineTo(wallX, floorY);
    ctx.stroke();

    for (let y = floorY - 300; y < floorY; y += 30) {
      ctx.beginPath();
      ctx.moveTo(wallX - 30, y + 20);
      ctx.lineTo(wallX, y);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Floor
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(w, floorY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 1. Small Mass (m = 1) or Sleek Golden Egg
    ctx.save();
    const smallCx = this.piSmallX + smallSize / 2;
    const smallCy = floorY - smallSize / 2;
    ctx.translate(smallCx, smallCy);
    ctx.beginPath();
    ctx.ellipse(0, 0, smallSize * 0.42, smallSize * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1kg', 0, 0);
    ctx.restore();

    // 2. Big Mass (M = 100^d)
    ctx.save();
    const bigCx = this.piBigX + bigSize / 2;
    const bigCy = floorY - bigSize / 2;
    ctx.translate(bigCx, bigCy);
    const grad = ctx.createLinearGradient(-bigSize / 2, -bigSize / 2, bigSize / 2, bigSize / 2);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.5, '#ec4899');
    grad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.roundRect(-bigSize / 2, -bigSize / 2, bigSize, bigSize, 16);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Block text label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`M = ${this.piMassRatio}kg`, 0, -8);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`v = ${this.piBigV.toFixed(1)}`, 0, 16);
    ctx.restore();

    // 3. Large HUD Score Display (π collisions counter)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 20;
    ctx.fillText(`TOTAL BOUNCES: ${this.piHits}`, w / 2, h * 0.28);

    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#00f2fe';
    ctx.fillText(`π theorem: Collisions approach digits of π (3, 31, 314, 3141...)`, w / 2, h * 0.33);

    // Dynamic approximation badge
    const piApprox = (this.piHits / Math.pow(10, Math.floor(Math.log10(this.piMassRatio)) / 2)).toFixed(2);
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`Current Approximation: ${this.piHits} hits ≈ π digits`, w / 2, h * 0.37);

    ctx.restore();
  }

  // 7. PLANET SCALE ERLENMEYER FLASK DROP
  private renderPlanetFlask(
    ctx: CanvasRenderingContext2D,
    metrics: AudioMetrics,
    config: Sandbox2DConfig,
    dt: number
  ) {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;

    // Erlenmeyer Flask Geometry
    const neckTopY = h * 0.28;
    const neckBottomY = h * 0.44;
    const flaskBottomY = h * 0.85;
    const neckHalfW = 85;
    const flaskBaseHalfW = 340;

    // Planet Catalog
    const planetTypes = [
      { name: 'MERCURY', radius: 26, color: '#94a3b8', glow: '#cbd5e1', mass: '3.30 × 10²³ kg' },
      { name: 'MOON', radius: 30, color: '#e2e8f0', glow: '#f8fafc', mass: '7.34 × 10²² kg' },
      { name: 'MARS', radius: 38, color: '#f87171', glow: '#ef4444', mass: '6.42 × 10²³ kg' },
      { name: 'EARTH', radius: 48, color: '#38bdf8', glow: '#0284c7', mass: '5.97 × 10²⁴ kg' },
      { name: 'NEPTUNE', radius: 64, color: '#60a5fa', glow: '#3b82f6', mass: '1.02 × 10²⁶ kg' },
      { name: 'SATURN', radius: 82, color: '#fbbf24', glow: '#f59e0b', mass: '5.68 × 10²⁶ kg', hasRing: true },
      { name: 'JUPITER', radius: 98, color: '#fb923c', glow: '#ea580c', mass: '1.90 × 10²⁷ kg' },
      { name: 'THE SUN', radius: 120, color: '#facc15', glow: '#eab308', mass: '1.99 × 10³⁰ kg' },
      { name: 'BLACK HOLE', radius: 140, color: '#000000', glow: '#c084fc', mass: 'Gargantua Singularity' },
    ];

    // Spawn new planet on beat or timer
    this.planetSpawnTimer += dt;
    if ((this.planetSpawnTimer > 2.2 || (metrics.beat && metrics.beatStrength > 0.6 && this.planetSpawnTimer > 1.2)) && this.planetIndex < planetTypes.length) {
      this.planetSpawnTimer = 0;
      const t = planetTypes[this.planetIndex];
      this.flaskPlanets.push({
        name: t.name,
        radius: t.radius,
        color: t.color,
        glow: t.glow,
        mass: t.mass,
        x: cx + (Math.random() - 0.5) * 20,
        y: neckTopY - t.radius - 10,
        vx: (Math.random() - 0.5) * 2,
        vy: 3 * config.speed,
        rot: 0,
        vrot: (Math.random() - 0.5) * 0.05,
        hasRing: t.hasRing,
      });
      this.planetIndex++;
      if (config.soundFxEnabled) {
        this.playCollisionTone(180 + this.planetIndex * 60, 0.25, 0.2);
      }
    }

    // Auto-loop when all planets dropped and settled
    if (this.planetIndex >= planetTypes.length && this.planetSpawnTimer > 6.0) {
      this.flaskPlanets = [];
      this.planetIndex = 0;
      this.planetSpawnTimer = 0;
    }

    // Physics step for falling planets inside conical flask
    const grav = config.gravity * 0.25;
    for (let i = 0; i < this.flaskPlanets.length; i++) {
      const p = this.flaskPlanets[i];
      p.vy += grav;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;

      // Flask Boundary Collisions (Neck & Conical Body)
      let currentHalfW = neckHalfW;
      if (p.y > neckBottomY) {
        const frac = Math.min(1.0, (p.y - neckBottomY) / (flaskBottomY - neckBottomY));
        currentHalfW = neckHalfW + (flaskBaseHalfW - neckHalfW) * frac;
      }

      // Left & right flask walls
      if (p.x - p.radius < cx - currentHalfW) {
        p.x = cx - currentHalfW + p.radius;
        p.vx = -p.vx * 0.4;
      } else if (p.x + p.radius > cx + currentHalfW) {
        p.x = cx + currentHalfW - p.radius;
        p.vx = -p.vx * 0.4;
      }

      // Bottom of flask
      if (p.y + p.radius > flaskBottomY) {
        p.y = flaskBottomY - p.radius;
        p.vy = -p.vy * 0.3;
        p.vx *= 0.85;
      }

      // Inter-planet collisions (simple elastic circle repulsion)
      for (let j = i + 1; j < this.flaskPlanets.length; j++) {
        const q = this.flaskPlanets[j];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const dist = Math.hypot(dx, dy);
        const minDist = p.radius + q.radius;
        if (dist < minDist && dist > 0.001) {
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          p.x -= nx * overlap;
          p.y -= ny * overlap;
          q.x += nx * overlap;
          q.y += ny * overlap;
          p.vx -= nx * 0.4;
          p.vy -= ny * 0.4;
          q.vx += nx * 0.4;
          q.vy += ny * 0.4;
        }
      }
    }

    // 1. Draw Erlenmeyer Flask Glass Container
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;

    ctx.beginPath();
    // Neck top left
    ctx.moveTo(cx - neckHalfW, neckTopY);
    ctx.lineTo(cx - neckHalfW, neckBottomY);
    // Left flare to bottom
    ctx.lineTo(cx - flaskBaseHalfW, flaskBottomY);
    // Flat/curved bottom
    ctx.lineTo(cx + flaskBaseHalfW, flaskBottomY);
    // Right flare to neck bottom
    ctx.lineTo(cx + neckHalfW, neckBottomY);
    // Neck top right
    ctx.lineTo(cx + neckHalfW, neckTopY);
    ctx.stroke();

    // Measurement Tick Marks on Flask
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    for (let markY = neckBottomY + 60; markY < flaskBottomY - 40; markY += 60) {
      const frac = (markY - neckBottomY) / (flaskBottomY - neckBottomY);
      const curW = neckHalfW + (flaskBaseHalfW - neckHalfW) * frac;
      ctx.beginPath();
      ctx.moveTo(cx - curW, markY);
      ctx.lineTo(cx - curW + 35, markY);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Render Falling Planets
    for (const p of this.flaskPlanets) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      // Saturn Rings
      if (p.hasRing) {
        ctx.save();
        ctx.scale(1, 0.35);
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 1.8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
        ctx.lineWidth = 14;
        ctx.stroke();
        ctx.restore();
      }

      // Planet Sphere
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 22;
      ctx.fill();

      // Atmospheric gradient shading
      const grad = ctx.createRadialGradient(-p.radius * 0.3, -p.radius * 0.3, p.radius * 0.1, 0, 0, p.radius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      grad.addColorStop(0.7, 'transparent');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Planet Name
      ctx.rotate(-p.rot);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.name, 0, 0);

      ctx.restore();
    }

    // 3. HUD Display
    const lastPlanet = this.flaskPlanets[this.flaskPlanets.length - 1];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.fillText(`CURRENT PLANET: ${lastPlanet ? lastPlanet.name : 'AWAITING CELESTIAL DROP'}`, cx, h * 0.18);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`MASS: ${lastPlanet ? lastPlanet.mass : '0.00 kg'}`, cx, h * 0.21);
    ctx.restore();
  }

  // 8. HYDRAULIC PISTON SPRING SMASH MULTIPLIER
  private renderSpringSmash(
    ctx: CanvasRenderingContext2D,
    metrics: AudioMetrics,
    config: Sandbox2DConfig,
    dt: number
  ) {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const anvilY = h * 0.72;
    const pistonRestY = h * 0.32;
    const pistonStroke = anvilY - pistonRestY - 45;

    // Harmonic piston oscillation driven by tempo & bass drops
    this.pistonPhase += dt * 4.5 * (config.pistonSpeed ?? 1.2);
    const cycle = Math.sin(this.pistonPhase);
    this.pistonY = pistonRestY + Math.max(0, cycle) * pistonStroke;

    // Smash moment
    const isSmashing = this.pistonY >= anvilY - 50;
    if (isSmashing && cycle > 0.95) {
      if (config.soundFxEnabled && Math.random() < 0.15) {
        this.playCollisionTone(140, 0.15, 0.25);
      }
      this.smashedEggCount = Math.min(65536, this.smashedEggCount * 2);
      // Spawn golden yolk / shell shards
      if (this.eggShards.length < 80) {
        for (let k = 0; k < 6; k++) {
          this.eggShards.push({
            x: cx + (Math.random() - 0.5) * 80,
            y: anvilY - 10,
            vx: (Math.random() - 0.5) * 14,
            vy: -Math.random() * 12,
            size: 4 + Math.random() * 6,
            color: Math.random() > 0.5 ? '#facc15' : '#ffffff',
            alpha: 1,
            life: 0,
            maxLife: 0.5,
          });
        }
      }
    }

    // Update egg shards
    for (let i = this.eggShards.length - 1; i >= 0; i--) {
      const s = this.eggShards[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        this.eggShards.splice(i, 1);
        continue;
      }
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.4; // gravity
      s.alpha = 1 - s.life / s.maxLife;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 1. Draw Heavy Industrial Hydraulic Piston
    ctx.save();
    // Hydraulic cylinder housing
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 50, 0, 100, pistonRestY - 40);

    // Chrome Shaft
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx - 24, pistonRestY - 40, 48, this.pistonY - pistonRestY + 40);

    // Stamping Hammer Head with hazard stripes
    const hammerW = 220;
    const hammerH = 65;
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(cx - hammerW / 2, this.pistonY, hammerW, hammerH, 12);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Hazard yellow chevron lines on hammer head
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    for (let x = cx - hammerW / 2 + 20; x < cx + hammerW / 2 - 20; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, this.pistonY + 12);
      ctx.lineTo(x + 12, this.pistonY + hammerH - 12);
      ctx.stroke();
    }

    // 2. Heavy Steel Anvil Base
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 260, anvilY, 520, 80);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 260, anvilY, 520, 80);

    // 3. Resting Golden Eggs on Anvil
    const eggSpacing = 36;
    const numDisplayEggs = Math.min(8, Math.max(2, Math.floor(Math.log2(this.smashedEggCount))));
    const startEggX = cx - ((numDisplayEggs - 1) * eggSpacing) / 2;
    for (let e = 0; e < numDisplayEggs; e++) {
      ctx.save();
      ctx.translate(startEggX + e * eggSpacing, anvilY - 24);
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 20, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 4. Score Display
    ctx.textAlign = 'center';
    ctx.font = '800 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 18;
    ctx.fillText(`EGGS MULTIPLIED: x${this.smashedEggCount}`, cx, h * 0.22);

    ctx.font = '700 16px monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`HYDRAULIC PRESSURE: ${(2500 + metrics.bass * 2000).toFixed(0)} PSI`, cx, h * 0.26);
    ctx.restore();
  }

  // 9. 1000°C GLOWING BALL VS 200 RUBBER BANDS
  private renderBandsBroken(
    ctx: CanvasRenderingContext2D,
    metrics: AudioMetrics,
    config: Sandbox2DConfig,
    dt: number
  ) {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const ballR = 48;

    // Ball descent
    this.hotBallVy += 0.08;
    this.hotBallY += this.hotBallVy;

    // Ball interaction with tension bands
    for (let i = 0; i < this.bands.length; i++) {
      const b = this.bands[i];
      if (b.broken) continue;

      // Ball presses on band
      if (this.hotBallY + ballR >= b.y && this.hotBallY - ballR <= b.y) {
        b.stretch = (this.hotBallY + ballR - b.y);
        // Tension break threshold
        if (b.stretch > 28) {
          b.broken = true;
          this.bandsRemaining = Math.max(0, this.bandsRemaining - 1);
          this.hotBallVy *= 0.88; // Slow down from resistance
          if (config.soundFxEnabled) {
            this.playCollisionTone(750 + (i % 30) * 12, 0.05, 0.12);
          }
          // Melting spark burst
          if (this.particles.length < 150) {
            this.particles.push({
              x: cx + (Math.random() - 0.5) * 80,
              y: b.y,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 8,
              radius: 3 + Math.random() * 4,
              color: '#ff4444',
              alpha: 1,
              life: 0,
              maxLife: 0.3,
            });
          }
        }
      }
    }

    // Auto-loop when ball reaches bottom
    if (this.hotBallY > h * 0.92) {
      this.hotBallY = h * 0.24;
      this.hotBallVy = 2.0 * config.speed;
      this.bandsRemaining = 200;
      for (const b of this.bands) {
        b.broken = false;
        b.stretch = 0;
      }
    }

    // 1. Draw Stretched Tension Bands
    ctx.save();
    const margin = 80;
    for (const b of this.bands) {
      if (b.broken) continue;
      ctx.beginPath();
      ctx.moveTo(margin, b.y);
      if (b.stretch > 0) {
        // Stretched V curve under hot ball
        ctx.quadraticCurveTo(cx, b.y + b.stretch * 1.4, w - margin, b.y);
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 3;
      } else {
        ctx.lineTo(w - margin, b.y);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
      }
      ctx.stroke();
    }
    ctx.restore();

    // 2. Draw 1000°C Incandescent Glowing Steel Ball
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, this.hotBallY, ballR, 0, Math.PI * 2);

    // Radiant Thermal Gradient (White-Hot Core -> Fiery Red-Orange Rim)
    const heatGrad = ctx.createRadialGradient(cx, this.hotBallY, 4, cx, this.hotBallY, ballR);
    heatGrad.addColorStop(0, '#ffffff'); // Incandescent white core
    heatGrad.addColorStop(0.3, '#fef08a'); // High-temp bright yellow
    heatGrad.addColorStop(0.7, '#f97316'); // Fiery orange
    heatGrad.addColorStop(1, '#dc2626'); // Molten crimson edge

    ctx.fillStyle = heatGrad;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 32 + metrics.bass * 20;
    ctx.fill();

    // Thermal Heat Waves (Shimmering atmospheric haze)
    ctx.beginPath();
    ctx.arc(cx, this.hotBallY, ballR * 1.35, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 68, 0, 0.25)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();

    // 3. Digital HUD Thermometer
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '800 32px monospace';
    ctx.fillStyle = '#ff4444';
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 16;
    ctx.fillText(`CORE TEMP: 999.4°C 🔥`, cx, h * 0.16);

    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`BANDS REMAINING: ${this.bandsRemaining} / 200`, cx, h * 0.20);
    ctx.restore();
  }

  // 10. SPIROGRAPH FLOWER SONG GUESSER
  private renderSpirographFlower(
    ctx: CanvasRenderingContext2D,
    metrics: AudioMetrics,
    config: Sandbox2DConfig,
    dt: number
  ) {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;
    const arenaRadius = Math.min(w, h) * 0.42;

    // Mathematical Hypocycloid Trail Generation
    this.spiroAngle += dt * 3.5 * config.speed;
    const k = 4.75; // Petal ratio
    const R = arenaRadius * 0.85;
    const r = R / k;
    const d = r * (0.85 + metrics.bass * 0.4);

    const px = cx + (R - r) * Math.cos(this.spiroAngle) + d * Math.cos(((R - r) / r) * this.spiroAngle);
    const py = cy + (R - r) * Math.sin(this.spiroAngle) - d * Math.sin(((R - r) / r) * this.spiroAngle);

    // Save spiro points
    this.spiroPoints.push({
      x: px,
      y: py,
      color: `hsl(${(this.spiroAngle * 45) % 360}, 95%, 65%)`,
    });

    if (this.spiroPoints.length > 900) {
      this.spiroPoints.shift();
    }

    // 1. Outer Arena Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, arenaRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = '#00f2fe';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 18;
    ctx.stroke();

    // 2. Render Spirograph Ribbon Petals
    ctx.lineWidth = 2.5;
    for (let i = 1; i < this.spiroPoints.length; i++) {
      const p1 = this.spiroPoints[i - 1];
      const p2 = this.spiroPoints[i];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = p2.color;
      ctx.globalAlpha = i / this.spiroPoints.length;
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // 3. Central Song Guessing Badge
    ctx.beginPath();
    ctx.arc(cx, cy, 64, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('GUESS', cx, cy - 14);
    ctx.fillText('THE SONG?', cx, cy + 6);
    ctx.font = '20px sans-serif';
    ctx.fillText('🎵', cx, cy + 28);

    // 4. Tracing Ball Head
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 20;
    ctx.fill();

    ctx.restore();
  }

  // Scratch-Like Rules Engine
  private processScratchRules(metrics: AudioMetrics, config: Sandbox2DConfig) {
    if (!config.scratchRules) return;
    for (const rule of config.scratchRules) {
      if (!rule.enabled) continue;

      if (rule.event === 'on_beat' && metrics.beat) {
        if (rule.action === 'multiply_ball') {
          this.totalBallsCounter *= Math.max(2, rule.value);
        } else if (rule.action === 'spawn_burst') {
          for (let i = 0; i < rule.value; i++) {
            this.particles.push({
              x: this.width / 2 + (Math.random() - 0.5) * 100,
              y: this.height / 2 + (Math.random() - 0.5) * 100,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 12,
              radius: 4,
              color: '#00f2fe',
              alpha: 1,
              life: 0,
              maxLife: 0.4,
            });
          }
        }
      }
    }
  }

  // Deterministic Frame-by-Frame Rendering for Offline Video Export
  public renderDeterministicFrame(
    time: number,
    dt: number,
    targetCtx: CanvasRenderingContext2D,
    targetW: number,
    targetH: number,
    metrics: AudioMetrics,
    config: Sandbox2DConfig,
    watermarkConfig: WatermarkConfig
  ) {
    const prevW = this.width;
    const prevH = this.height;
    const prevCtx = this.ctx;

    this.width = targetW;
    this.height = targetH;
    this.ctx = targetCtx;

    this.render(metrics, config, watermarkConfig, dt);

    this.width = prevW;
    this.height = prevH;
    this.ctx = prevCtx;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public dispose() {
    this.particles = [];
    this.laserSegments = [];
    this.balls = [];
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {
        // ignore
      }
    }
  }
}
