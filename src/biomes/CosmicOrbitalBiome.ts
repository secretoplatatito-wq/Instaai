import * as THREE from 'three';
import { BaseBiome } from './BiomeBase';
import { BiomeConfig, AudioMetrics, AudioReactiveConfig } from '../types';

export class CosmicOrbitalBiome extends BaseBiome {
  private centralPlanet!: THREE.Mesh;
  private ringParticles!: THREE.Points;
  private ringInitialRadii!: Float32Array;
  private ringAngles!: Float32Array;
  private ringPositions!: Float32Array;
  private moons: { mesh: THREE.Mesh; orbitRadius: number; speed: number; angle: number }[] = [];
  private starfield!: THREE.Points;

  public override init(scene: THREE.Scene, config: BiomeConfig): void {
    super.init(scene, config);

    const rand = this.createRandom(config.seed);

    // 1. Central Hero Planet with procedural atmosphere
    const planetGeo = this.registerDisposable(new THREE.SphereGeometry(3.6, 32, 32));
    const planetMat = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.primaryColor),
        metalness: 0.85,
        roughness: 0.25,
      })
    );
    this.centralPlanet = new THREE.Mesh(planetGeo, planetMat);
    this.rootGroup.add(this.centralPlanet);

    // Atmospheric outer glow haze
    const hazeGeo = this.registerDisposable(new THREE.SphereGeometry(3.8, 32, 32));
    const hazeMat = this.registerDisposable(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.accentColor),
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
      })
    );
    this.centralPlanet.add(new THREE.Mesh(hazeGeo, hazeMat));

    // 2. Harmonic Planetary Rings made of 1200 glowing cosmic particles
    const numRingParticles = 1200;
    this.ringPositions = new Float32Array(numRingParticles * 3);
    this.ringInitialRadii = new Float32Array(numRingParticles);
    this.ringAngles = new Float32Array(numRingParticles);
    const ringColors = new Float32Array(numRingParticles * 3);

    const colA = new THREE.Color(config.accentColor);
    const colB = new THREE.Color(config.secondaryColor);

    for (let i = 0; i < numRingParticles; i++) {
      const radius = 5.2 + rand() * 4.8;
      const angle = rand() * Math.PI * 2;
      this.ringInitialRadii[i] = radius;
      this.ringAngles[i] = angle;

      this.ringPositions[i * 3] = Math.cos(angle) * radius;
      this.ringPositions[i * 3 + 1] = (rand() - 0.5) * 0.25; // Subtle disk thickness
      this.ringPositions[i * 3 + 2] = Math.sin(angle) * radius;

      const mix = rand();
      const c = colA.clone().lerp(colB, mix);
      ringColors[i * 3] = c.r;
      ringColors[i * 3 + 1] = c.g;
      ringColors[i * 3 + 2] = c.b;
    }

    const ringGeo = this.registerDisposable(new THREE.BufferGeometry());
    ringGeo.setAttribute('position', new THREE.BufferAttribute(this.ringPositions, 3));
    ringGeo.setAttribute('color', new THREE.BufferAttribute(ringColors, 3));

    const ringMat = this.registerDisposable(
      new THREE.PointsMaterial({
        size: 0.18,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      })
    );

    this.ringParticles = new THREE.Points(ringGeo, ringMat);
    // Tilt the rings like Saturn (approx 26 degrees)
    this.ringParticles.rotation.x = Math.PI * 0.28;
    this.ringParticles.rotation.z = Math.PI * 0.08;
    this.rootGroup.add(this.ringParticles);

    // 3. Orbiting Moons
    const numMoons = 4;
    for (let i = 0; i < numMoons; i++) {
      const moonGeo = this.registerDisposable(new THREE.SphereGeometry(0.5 + rand() * 0.4, 16, 16));
      const moonMat = this.registerDisposable(
        new THREE.MeshStandardMaterial({
          color: 0x98a2b3,
          metalness: 0.7,
          roughness: 0.4,
        })
      );
      const moon = new THREE.Mesh(moonGeo, moonMat);
      const orbitRadius = 11 + i * 3.5;
      this.moons.push({
        mesh: moon,
        orbitRadius,
        speed: (0.4 + rand() * 0.3) * (i % 2 === 0 ? 1 : -1),
        angle: rand() * Math.PI * 2,
      });
      this.rootGroup.add(moon);
    }

    // 4. Distant Starfield
    const numStars = 800;
    const starPos = new Float32Array(numStars * 3);
    for (let i = 0; i < numStars; i++) {
      starPos[i * 3] = (rand() - 0.5) * 80;
      starPos[i * 3 + 1] = (rand() - 0.5) * 80;
      starPos[i * 3 + 2] = (rand() - 0.5) * 80;
    }
    const starGeo = this.registerDisposable(new THREE.BufferGeometry());
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = this.registerDisposable(
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.12,
        transparent: true,
        opacity: 0.6,
      })
    );
    this.starfield = new THREE.Points(starGeo, starMat);
    this.rootGroup.add(this.starfield);

    this.followTarget.set(0, 0, 0);
  }

  public override update(
    delta: number,
    time: number,
    metrics: AudioMetrics,
    config: BiomeConfig,
    reactiveConfig: AudioReactiveConfig
  ): void {
    // Planet rotation & bass pulse
    this.centralPlanet.rotation.y += delta * 0.25 * config.speedMultiplier;
    const planetScale = 1.0 + (reactiveConfig.enableBassPulsing ? metrics.bass * 0.2 * reactiveConfig.bassScaleResponse : 0);
    this.centralPlanet.scale.setScalar(planetScale);

    // Rotate and undulate rings with music harmonics
    const pos = this.ringPositions;
    const waveFreq = 4.0;
    const bassKick = metrics.bass * 1.2 * reactiveConfig.bassScaleResponse;

    for (let i = 0; i < this.ringInitialRadii.length; i++) {
      this.ringAngles[i] += delta * 0.4 * (10 / this.ringInitialRadii[i]);
      const angle = this.ringAngles[i];
      const baseR = this.ringInitialRadii[i];

      // Harmonic ripple out from center on beats
      const ripple = Math.sin(time * 6 - baseR * waveFreq) * metrics.energy * 0.35;
      const r = baseR + ripple + (bassKick * 0.15);

      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = Math.sin(time * 3 + angle * 2) * (0.2 + metrics.mid * 0.4);
      pos[i * 3 + 2] = Math.sin(angle) * r;
    }
    this.ringParticles.geometry.attributes.position.needsUpdate = true;

    // Orbit moons
    for (let i = 0; i < this.moons.length; i++) {
      const m = this.moons[i];
      m.angle += m.speed * delta * config.speedMultiplier;
      m.mesh.position.set(
        Math.cos(m.angle) * m.orbitRadius,
        Math.sin(m.angle * 0.7) * 2.5,
        Math.sin(m.angle) * m.orbitRadius
      );
    }

    // Camera follow point slowly circles the planet
    this.followTarget.set(Math.cos(time * 0.3) * 1.5, Math.sin(time * 0.2) * 1.2, 0);
  }
}
