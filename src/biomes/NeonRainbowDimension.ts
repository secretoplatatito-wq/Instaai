import * as THREE from 'three';
import { BaseBiome } from './BiomeBase';
import { BiomeConfig, AudioMetrics, AudioReactiveConfig } from '../types';

export class NeonRainbowDimension extends BaseBiome {
  private platforms: THREE.Mesh[] = [];
  private crystals: THREE.Mesh[] = [];
  private particleSystem!: THREE.Points;
  private particlePositions!: Float32Array;
  private particleVelocities!: Float32Array;
  private readonly numParticles = 600;

  public override init(scene: THREE.Scene, config: BiomeConfig): void {
    super.init(scene, config);

    const rand = this.createRandom(config.seed);

    // 1. Vibrant Rainbow Zigzag Steps and Platforms
    const numSteps = 24;
    const stepHeight = 1.2;
    const stepWidth = 4.2;

    const rainbowColors = [
      0xff0055, 0xff5500, 0xffaa00, 0x55ff00, 0x00ffaa, 0x00aaff, 0x7700ff, 0xcc00ff
    ];

    for (let i = 0; i < numSteps; i++) {
      const stepGeo = this.registerDisposable(new THREE.BoxGeometry(stepWidth, 0.35, 2.5));
      const col = rainbowColors[i % rainbowColors.length];

      const stepMat = this.registerDisposable(
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: 0.35,
          metalness: 0.8,
          roughness: 0.2,
        })
      );

      const step = new THREE.Mesh(stepGeo, stepMat);
      // Zigzag arrangement
      const direction = (i % 2 === 0 ? 1 : -1);
      step.position.set(direction * (2.2 + (i % 4) * 0.5), (i - numSteps / 2) * stepHeight, (rand() - 0.5) * 2);
      step.rotation.y = direction * 0.15;

      this.platforms.push(step);
      this.rootGroup.add(step);

      // Glowing edge line
      const edgeGeo = this.registerDisposable(new THREE.BoxGeometry(stepWidth * 1.02, 0.08, 0.08));
      const edgeMat = this.registerDisposable(new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.set(0, 0.18, 1.25);
      step.add(edge);
    }

    // 2. Floating Geometric Prisms (Icosahedrons & Octahedrons)
    const numPrisms = 18;
    for (let i = 0; i < numPrisms; i++) {
      const geo = i % 2 === 0
        ? new THREE.OctahedronGeometry(0.8 + rand() * 0.6)
        : new THREE.IcosahedronGeometry(0.7 + rand() * 0.5);

      const col = rainbowColors[(i * 2) % rainbowColors.length];
      const mat = this.registerDisposable(
        new THREE.MeshStandardMaterial({
          color: col,
          metalness: 0.9,
          roughness: 0.1,
          wireframe: i % 3 === 0,
        })
      );
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((rand() - 0.5) * 16, (rand() - 0.5) * 30, (rand() - 0.5) * 12);
      this.crystals.push(mesh);
      this.rootGroup.add(mesh);
    }

    // 3. Cascading Rainbow Particles
    this.particlePositions = new Float32Array(this.numParticles * 3);
    this.particleVelocities = new Float32Array(this.numParticles * 3);
    const particleColors = new Float32Array(this.numParticles * 3);

    for (let i = 0; i < this.numParticles; i++) {
      this.particlePositions[i * 3] = (rand() - 0.5) * 18;
      this.particlePositions[i * 3 + 1] = (rand() - 0.5) * 35;
      this.particlePositions[i * 3 + 2] = (rand() - 0.5) * 14;

      this.particleVelocities[i * 3] = (rand() - 0.5) * 0.2;
      this.particleVelocities[i * 3 + 1] = -1.5 - rand() * 3.0; // falling
      this.particleVelocities[i * 3 + 2] = (rand() - 0.5) * 0.2;

      const c = new THREE.Color(rainbowColors[i % rainbowColors.length]);
      particleColors[i * 3] = c.r;
      particleColors[i * 3 + 1] = c.g;
      particleColors[i * 3 + 2] = c.b;
    }

    const particleGeo = this.registerDisposable(new THREE.BufferGeometry());
    particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = this.registerDisposable(
      new THREE.PointsMaterial({
        size: 0.22,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      })
    );

    this.particleSystem = new THREE.Points(particleGeo, particleMat);
    this.rootGroup.add(this.particleSystem);
  }

  public override update(
    delta: number,
    time: number,
    metrics: AudioMetrics,
    config: BiomeConfig,
    reactiveConfig: AudioReactiveConfig
  ): void {
    // Animate platforms with bass undulation
    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      const offset = i * 0.25;
      const bassWave = Math.sin(time * 3 + offset) * metrics.bass * 0.45 * reactiveConfig.bassScaleResponse;
      p.position.y += Math.sin(time * 2 + i) * 0.01;

      // Scale bounce
      const scaleX = 1.0 + bassWave;
      p.scale.set(scaleX, 1.0, 1.0);

      // Emissive boost on beats
      const mat = p.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = 0.35 + metrics.energy * 0.8;
      }
    }

    // Rotate crystals
    for (let i = 0; i < this.crystals.length; i++) {
      const c = this.crystals[i];
      c.rotation.x += delta * (0.4 + metrics.mid * 1.5 * reactiveConfig.midRotationResponse);
      c.rotation.y += delta * (0.6 + metrics.treble * 1.8);
      c.position.y += Math.sin(time * 2 + i) * 0.02;
    }

    // Cascade particles down and recycle
    const pos = this.particlePositions;
    const vel = this.particleVelocities;
    const speedBoost = 1.0 + metrics.energy * 2.0;

    for (let i = 0; i < this.numParticles; i++) {
      pos[i * 3] += vel[i * 3] * delta * speedBoost;
      pos[i * 3 + 1] += vel[i * 3 + 1] * delta * speedBoost;
      pos[i * 3 + 2] += vel[i * 3 + 2] * delta * speedBoost;

      if (pos[i * 3 + 1] < -18) {
        pos[i * 3 + 1] = 18;
      }
    }
    this.particleSystem.geometry.attributes.position.needsUpdate = true;

    // Follow center smooth tracking
    this.followTarget.set(Math.sin(time * 0.5) * 2, Math.cos(time * 0.3) * 3, 0);
  }
}
