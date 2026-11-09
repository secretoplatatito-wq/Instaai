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
