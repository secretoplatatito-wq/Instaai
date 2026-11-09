import * as THREE from 'three';
import { BaseBiome } from './BiomeBase';
import { BiomeConfig, AudioMetrics, AudioReactiveConfig } from '../types';

interface Epicycle {
  radius: number;
  speed: number;
  phase: number;
  circleMesh: THREE.LineLoop;
  armMesh: THREE.Line;
}

export class FourierHarmonicHarp extends BaseBiome {
  private epicycles: Epicycle[] = [];
  private penMesh!: THREE.Mesh;
  private trailLine!: THREE.Line;
  private trailPositions!: Float32Array;
  private readonly maxTrailPoints = 600;
  private trailCount = 0;
  private trailIndex = 0;

  public override init(scene: THREE.Scene, config: BiomeConfig): void {
    super.init(scene, config);

    const rand = this.createRandom(config.seed);

    // 1. Setup Epicycle Armatures (vision.dev01 style)
    const numCircles = 5;
    const baseRadii = [3.8, 2.2, 1.4, 0.9, 0.5];
    const baseSpeeds = [1.0, -2.0, 3.0, -5.0, 7.0];

    const circleMat = this.registerDisposable(
      new THREE.LineBasicMaterial({
        color: 0x475467,
        transparent: true,
        opacity: 0.45,
      })
    );

    const armMat = this.registerDisposable(
      new THREE.LineBasicMaterial({
        color: new THREE.Color(config.accentColor),
        transparent: true,
        opacity: 0.85,
      })
    );

    for (let i = 0; i < numCircles; i++) {
      const r = baseRadii[i];
      const circleGeo = this.createCircleGeometry(r, 64);
      const circleMesh = new THREE.LineLoop(circleGeo, circleMat);

      const armGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(r, 0, 0),
      ]);
      const armMesh = new THREE.Line(armGeo, armMat);

      this.rootGroup.add(circleMesh, armMesh);

      this.epicycles.push({
        radius: r,
        speed: baseSpeeds[i],
        phase: rand() * Math.PI * 2,
        circleMesh,
        armMesh,
      });
    }

    // 2. Lead Drawing Pen
    const penGeo = this.registerDisposable(new THREE.SphereGeometry(0.22, 16, 16));
    const penMat = this.registerDisposable(
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
      })
    );
    this.penMesh = new THREE.Mesh(penGeo, penMat);
    this.rootGroup.add(this.penMesh);

    // 3. Glowing Harmonograph Trail in 3D
    this.trailPositions = new Float32Array(this.maxTrailPoints * 3);
    const trailGeo = this.registerDisposable(new THREE.BufferGeometry());
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));

    const trailMat = this.registerDisposable(
      new THREE.LineBasicMaterial({
        color: new THREE.Color(config.primaryColor),
        transparent: true,
        opacity: 0.9,
      })
    );

    this.trailLine = new THREE.Line(trailGeo, trailMat);
    this.rootGroup.add(this.trailLine);

    this.followTarget.set(0, 0, 0);
  }

  private createCircleGeometry(radius: number, segments: number): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
    }
    return this.registerDisposable(new THREE.BufferGeometry().setFromPoints(points));
  }

  public override update(
    delta: number,
    time: number,
    metrics: AudioMetrics,
    config: BiomeConfig,
    reactiveConfig: AudioReactiveConfig
  ): void {
    let currentX = 0;
    let currentY = 0;

    // Harmonic speed and radius modifications from audio bands
    const speedModifiers = [
      1.0 + metrics.subBass * 0.5,
      1.0 + metrics.bass * 0.8,
      1.0 + metrics.lowMid * 1.0,
      1.0 + metrics.mid * 1.4,
      1.0 + metrics.treble * 2.0,
    ];

    for (let i = 0; i < this.epicycles.length; i++) {
      const ep = this.epicycles[i];
      const r = ep.radius * (1.0 + (i === 0 ? metrics.bass * 0.3 * reactiveConfig.bassScaleResponse : 0));

      // Move circle center to tip of previous arm
      ep.circleMesh.position.set(currentX, currentY, 0);
      ep.circleMesh.scale.set(r / ep.radius, r / ep.radius, 1);

      // Advance rotation
      ep.phase += ep.speed * speedModifiers[i] * delta * config.speedMultiplier;

      const nextX = currentX + Math.cos(ep.phase) * r;
      const nextY = currentY + Math.sin(ep.phase) * r;

      // Update arm line
      const armPos = ep.armMesh.geometry.attributes.position.array as Float32Array;
      armPos[0] = currentX;
      armPos[1] = currentY;
      armPos[2] = 0;
      armPos[3] = nextX;
      armPos[4] = nextY;
      armPos[5] = 0;
      ep.armMesh.geometry.attributes.position.needsUpdate = true;

      currentX = nextX;
      currentY = nextY;
    }

    // Pen tip position with subtle Z-wave from music energy
    const currentZ = Math.sin(time * 3) * (metrics.energy * 2.5);
    this.penMesh.position.set(currentX, currentY, currentZ);
    this.followTarget.set(currentX * 0.6, currentY * 0.6, 0);

    // Record trail
    this.trailPositions[this.trailIndex * 3] = currentX;
    this.trailPositions[this.trailIndex * 3 + 1] = currentY;
    this.trailPositions[this.trailIndex * 3 + 2] = currentZ;

    this.trailIndex = (this.trailIndex + 1) % this.maxTrailPoints;
    if (this.trailCount < this.maxTrailPoints) this.trailCount++;

    this.trailLine.geometry.attributes.position.needsUpdate = true;
  }
}
