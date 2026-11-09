import * as THREE from 'three';
import { BaseBiome } from './BiomeBase';
import { BiomeConfig, AudioMetrics, AudioReactiveConfig } from '../types';

interface PhysicsBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: THREE.Color;
  meshIndex: number;
}

export class PhysicsPlayground extends BaseBiome {
  private arenaRadius = 7.5;
  private boundaryLine!: THREE.LineLoop;
  private paddleArm!: THREE.Group;
  private paddleAngle = 0;
  private paddleSpeed = 1.4;

  private balls: PhysicsBall[] = [];
  private readonly maxBalls = 280;
  private ballInstancedMesh!: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();

  private gravity = -12.0;
  private restitution = 0.88;
  private lastMultiplyTime = 0;

  public override init(scene: THREE.Scene, config: BiomeConfig): void {
    super.init(scene, config);

    const rand = this.createRandom(config.seed);

    // 1. Geometric Boundary (Octagonal or circular arena)
    const points: THREE.Vector3[] = [];
    const segments = 8; // Octagon like NexusBoxLab!
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2 + Math.PI / 8;
      points.push(new THREE.Vector3(Math.cos(theta) * this.arenaRadius, Math.sin(theta) * this.arenaRadius, 0));
    }
    const boundaryGeo = this.registerDisposable(new THREE.BufferGeometry().setFromPoints(points));
    const boundaryMat = this.registerDisposable(
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
      })
    );
    this.boundaryLine = new THREE.LineLoop(boundaryGeo, boundaryMat);
    this.rootGroup.add(this.boundaryLine);

    // Outer glow ring
    const ringGeo = this.registerDisposable(new THREE.RingGeometry(this.arenaRadius * 0.98, this.arenaRadius * 1.02, 32));
    const ringMat = this.registerDisposable(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.primaryColor),
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      })
    );
    this.rootGroup.add(new THREE.Mesh(ringGeo, ringMat));

    // 2. Rotating Center Armature with Pivot Gear (NexusBoxLab style)
    this.paddleArm = new THREE.Group();

    // Center gear
    const gearGeo = this.registerDisposable(new THREE.CylinderGeometry(0.7, 0.7, 0.25, 12));
    gearGeo.rotateX(Math.PI / 2);
    const gearMat = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xd0d5dd,
        metalness: 0.9,
        roughness: 0.2,
      })
    );
    this.paddleArm.add(new THREE.Mesh(gearGeo, gearMat));

    // Dual rotating paddles / cross arm
    const paddleGeo = this.registerDisposable(new THREE.BoxGeometry(4.8, 0.45, 0.28));
    const paddleMat = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x475467,
        metalness: 0.8,
        roughness: 0.3,
      })
    );
    const paddle = new THREE.Mesh(paddleGeo, paddleMat);
    this.paddleArm.add(paddle);

    // Second cross paddle if high density
    if (config.density > 1.2) {
      const crossPaddle = new THREE.Mesh(paddleGeo, paddleMat);
      crossPaddle.rotation.z = Math.PI / 2;
      this.paddleArm.add(crossPaddle);
    }

    // Glowing bumper ends
    const tipGeo = this.registerDisposable(new THREE.BoxGeometry(0.3, 0.65, 0.32));
    const tipMat = this.registerDisposable(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.accentColor),
      })
    );
    const tipLeft = new THREE.Mesh(tipGeo, tipMat);
    tipLeft.position.x = -2.4;
    const tipRight = new THREE.Mesh(tipGeo, tipMat);
    tipRight.position.x = 2.4;
    this.paddleArm.add(tipLeft, tipRight);

    this.rootGroup.add(this.paddleArm);

    // 3. InstancedMesh for Multiplying Bouncing Balls
    const sphereGeo = this.registerDisposable(new THREE.SphereGeometry(0.32, 16, 16));
    const sphereMat = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.4,
        roughness: 0.2,
      })
    );
    this.ballInstancedMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, this.maxBalls);
    this.ballInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rootGroup.add(this.ballInstancedMesh);

    // Initial starter balls
    const colors = [
      new THREE.Color(0xff4d4d),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xfacc15),
      new THREE.Color(0xa855f7),
      new THREE.Color(0x22c55e),
      new THREE.Color(0xf97316),
    ];

    const initialCount = 6;
    for (let i = 0; i < initialCount; i++) {
      this.spawnBall(
        (rand() - 0.5) * 4,
        3 + rand() * 2,
        (rand() - 0.5) * 8,
        (rand() - 0.5) * 6,
        colors[i % colors.length]
      );
    }

    this.followTarget.set(0, 0, 0);
  }

  private spawnBall(x: number, y: number, vx: number, vy: number, color: THREE.Color) {
    if (this.balls.length >= this.maxBalls) return;

    const index = this.balls.length;
    this.balls.push({
      x,
      y,
      vx,
      vy,
      radius: 0.32,
      color,
      meshIndex: index,
    });

    this.ballInstancedMesh.setColorAt(index, color);
    if (this.ballInstancedMesh.instanceColor) {
      this.ballInstancedMesh.instanceColor.needsUpdate = true;
    }
  }

  public override update(
    delta: number,
    time: number,
    metrics: AudioMetrics,
    config: BiomeConfig,
    reactiveConfig: AudioReactiveConfig
  ): void {
    const dt = Math.min(delta, 0.05);

    // Rotate central paddle armature (speed kicks with audio energy and treble)
    const speedBoost = 1.0 + metrics.energy * 1.5 + metrics.treble * 1.0;
    this.paddleAngle += this.paddleSpeed * config.speedMultiplier * speedBoost * dt;
    this.paddleArm.rotation.z = this.paddleAngle;

    // Multiply balls on beat drop if under capacity!
    if (metrics.beat && time - this.lastMultiplyTime > 0.45 && this.balls.length < this.maxBalls) {
      this.lastMultiplyTime = time;
      const currentLen = Math.min(this.balls.length, 12);
      for (let i = 0; i < currentLen; i++) {
        const parent = this.balls[i];
        const newColor = new THREE.Color().setHSL((time * 0.2 + i * 0.1) % 1.0, 0.9, 0.6);
        this.spawnBall(
          parent.x,
          parent.y,
          parent.vx + (Math.random() - 0.5) * 6,
          parent.vy + Math.random() * 8,
          newColor
        );
        if (this.balls.length >= this.maxBalls) break;
      }
    }

    // Step physics for all balls
    const paddleCos = Math.cos(this.paddleAngle);
    const paddleSin = Math.sin(this.paddleAngle);
    const paddleHalfLength = 2.4;
    const paddleHalfThickness = 0.25;

    for (let i = 0; i < this.balls.length; i++) {
      const b = this.balls[i];

      // Gravity and air drag
      b.vy += this.gravity * dt;
      b.vx *= 0.998;
      b.vy *= 0.998;

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Circular/Octagonal Arena collision
      const distFromCenter = Math.hypot(b.x, b.y);
      const maxRadius = this.arenaRadius - b.radius;
      if (distFromCenter > maxRadius) {
        const nx = b.x / distFromCenter;
        const ny = b.y / distFromCenter;

        b.x = nx * maxRadius;
        b.y = ny * maxRadius;

        // Reflect velocity
        const dot = b.vx * nx + b.vy * ny;
        b.vx = (b.vx - 2 * dot * nx) * this.restitution;
        b.vy = (b.vy - 2 * dot * ny) * this.restitution;

        // Impart kick on beat
        if (metrics.beat) {
          b.vx += (Math.random() - 0.5) * 4;
          b.vy += Math.random() * 5;
        }
      }

      // Collision with rotating paddle
      // Transform ball into paddle coordinate space
      const localX = b.x * paddleCos + b.y * paddleSin;
      const localY = -b.x * paddleSin + b.y * paddleCos;

      if (
        Math.abs(localX) < paddleHalfLength + b.radius &&
        Math.abs(localY) < paddleHalfThickness + b.radius
      ) {
        // Paddle surface normal in world space
        const signY = localY >= 0 ? 1 : -1;
        const normWorldX = -paddleSin * signY;
        const normWorldY = paddleCos * signY;

        // Tangential velocity of paddle at impact point
        const paddleOmega = this.paddleSpeed * speedBoost;
        const vPaddleX = -paddleOmega * b.y;
        const vPaddleY = paddleOmega * b.x;

        // Reflect with paddle velocity boost
        b.vx = (b.vx - 2 * (b.vx * normWorldX + b.vy * normWorldY) * normWorldX) * this.restitution + vPaddleX * 0.6;
        b.vy = (b.vy - 2 * (b.vx * normWorldX + b.vy * normWorldY) * normWorldY) * this.restitution + vPaddleY * 0.6;

        // Push outside paddle box
        b.x += normWorldX * 0.2;
        b.y += normWorldY * 0.2;
      }

      // Update instance matrix
      this.dummy.position.set(b.x, b.y, 0);
      const scale = 1.0 + (metrics.bass * 0.3 * reactiveConfig.bassScaleResponse);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.ballInstancedMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.ballInstancedMesh.count = this.balls.length;
    this.ballInstancedMesh.instanceMatrix.needsUpdate = true;

    // Follow lead ball if available, else center
    if (this.balls.length > 0) {
      this.followTarget.set(this.balls[0].x * 0.3, this.balls[0].y * 0.3, 0);
    }
  }
}
