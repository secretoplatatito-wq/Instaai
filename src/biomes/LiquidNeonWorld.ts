import * as THREE from 'three';
import { BaseBiome } from './BiomeBase';
import { BiomeConfig, AudioMetrics, AudioReactiveConfig } from '../types';

export class LiquidNeonWorld extends BaseBiome {
  private tubes: { mesh: THREE.Mesh; basePoints: THREE.Vector3[]; curve: THREE.CatmullRomCurve3; speed: number }[] = [];
  private glowingBlobs: THREE.Mesh[] = [];

  public override init(scene: THREE.Scene, config: BiomeConfig): void {
    super.init(scene, config);

    const rand = this.createRandom(config.seed);

    const neonCyan = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.primaryColor),
        emissive: new THREE.Color(config.primaryColor),
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.15,
      })
    );

    const neonPink = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.secondaryColor),
        emissive: new THREE.Color(config.secondaryColor),
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.15,
      })
    );

    // 1. Flowing Spline River Tubes
    const numTubes = 8;
    for (let t = 0; t < numTubes; t++) {
      const points: THREE.Vector3[] = [];
      const numPts = 12;
      const angleOffset = (t / numTubes) * Math.PI * 2;

      for (let i = 0; i < numPts; i++) {
        const progress = (i / (numPts - 1)) * 30 - 15;
        const angle = progress * 0.35 + angleOffset;
        const r = 3.2 + Math.sin(progress * 0.5) * 1.8;
        points.push(new THREE.Vector3(Math.cos(angle) * r, progress, Math.sin(angle) * r));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = this.registerDisposable(new THREE.TubeGeometry(curve, 100, 0.18 * config.railThickness, 8, false));
      const mat = t % 2 === 0 ? neonCyan : neonPink;
      const tubeMesh = new THREE.Mesh(tubeGeo, mat);

      this.rootGroup.add(tubeMesh);
      this.tubes.push({
        mesh: tubeMesh,
        basePoints: points,
        curve,
        speed: 1.0 + rand() * 0.8,
      });
    }

    // 2. Liquid Metaball-like Floating Spheres
    const numBlobs = 16;
    for (let i = 0; i < numBlobs; i++) {
      const blobGeo = this.registerDisposable(new THREE.SphereGeometry(0.65 + rand() * 0.5, 24, 24));
      const blobMat = this.registerDisposable(
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(config.accentColor),
          metalness: 0.9,
          roughness: 0.1,
          transmission: 0.5,
          transparent: true,
          opacity: 0.85,
        })
      );
      const blob = new THREE.Mesh(blobGeo, blobMat);
      blob.position.set((rand() - 0.5) * 12, (rand() - 0.5) * 20, (rand() - 0.5) * 10);
      this.rootGroup.add(blob);
      this.glowingBlobs.push(blob);
    }

    this.followTarget.set(0, 0, 0);
  }

  public override update(
    delta: number,
    time: number,
    metrics: AudioMetrics,
    config: BiomeConfig,
    reactiveConfig: AudioReactiveConfig
  ): void {
    // Flowing ripple wave on tubes
    for (let t = 0; t < this.tubes.length; t++) {
      const tube = this.tubes[t];
      tube.mesh.rotation.y += delta * 0.25 * tube.speed * config.speedMultiplier;

      // Scale pulse on bass
      const wave = 1.0 + Math.sin(time * 3 + t) * (metrics.bass * 0.3 * reactiveConfig.bassScaleResponse);
      tube.mesh.scale.set(wave, 1.0, wave);
    }

    // Floating blobs float and deform with music
    for (let i = 0; i < this.glowingBlobs.length; i++) {
      const blob = this.glowingBlobs[i];
      const speed = 1.2 + i * 0.1;
      blob.position.y += Math.sin(time * speed) * delta * 2.0;

      // Squish and stretch with frequency
      const squish = 1.0 + Math.sin(time * 4 + i) * 0.15 + (metrics.bass * 0.25);
      blob.scale.set(1 / Math.sqrt(squish), squish, 1 / Math.sqrt(squish));
    }

    this.followTarget.set(0, Math.sin(time * 0.5) * 4.0, 0);
  }
}
