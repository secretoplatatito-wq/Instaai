import * as THREE from 'three';
import { BaseBiome, _vec3A, _vec3B } from './BiomeBase';
import { BiomeConfig, AudioMetrics, AudioReactiveConfig } from '../types';

interface TriggerObject {
  group: THREE.Group;
  basePos: THREE.Vector3;
  baseRot: THREE.Euler;
  type: 'chime' | 'speaker' | 'frame' | 'neon-bar';
  hitTime: number;
  light?: THREE.PointLight;
}

export class MetallicGravityGarden extends BaseBiome {
  private heroBall!: THREE.Mesh;
  private ballTrail!: THREE.Points;
  private trailPositions!: Float32Array;
  private trailIndex = 0;
  private readonly maxTrail = 80;

  private curve!: THREE.CatmullRomCurve3;
  private railsGroup!: THREE.Group;
  private triggers: TriggerObject[] = [];
  private shockwaves: { mesh: THREE.Mesh; scale: number; maxScale: number; alpha: number }[] = [];

  private ballProgress = 0;
  private readonly loopDuration = 18; // Seconds to complete one rail loop

  public override init(scene: THREE.Scene, config: BiomeConfig): void {
    super.init(scene, config);

    const rand = this.createRandom(config.seed);

    // 1. Serpentine 3D Rail Curve (winding vertically and laterally)
    const curvePoints: THREE.Vector3[] = [];
    const numPoints = 14;
    const heightSpan = 45;

    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const y = (1 - t) * heightSpan - heightSpan / 2;
      const angle = t * Math.PI * 4.5 + rand() * 0.5;
      const radius = 3.5 + Math.sin(t * Math.PI * 3) * 2.2;
      const x = Math.sin(angle) * radius + (rand() - 0.5) * 1.5;
      const z = Math.cos(angle) * (radius * 0.7) + (rand() - 0.5) * 1.0;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }

    this.curve = new THREE.CatmullRomCurve3(curvePoints, false, 'centripetal', 0.5);

    // 2. Build Dual Chrome Rails with Suspension Sleepers
    this.railsGroup = new THREE.Group();
    this.rootGroup.add(this.railsGroup);

    const railSegments = 240;
    const railPoints = this.curve.getPoints(railSegments);
    const railSpacing = 0.42;

    const leftRailPoints: THREE.Vector3[] = [];
    const rightRailPoints: THREE.Vector3[] = [];

    const chromeMat = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xd0d5dd,
        metalness: 0.95,
        roughness: 0.12,
      })
    );

    const sleeperMat = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x475467,
        metalness: 0.85,
        roughness: 0.25,
      })
    );

    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < railPoints.length; i++) {
      const p = railPoints[i];
      const tangent = this.curve.getTangent(i / (railPoints.length - 1)).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const leftP = p.clone().addScaledVector(normal, -railSpacing / 2);
      const rightP = p.clone().addScaledVector(normal, railSpacing / 2);

      leftRailPoints.push(leftP);
      rightRailPoints.push(rightP);

      // Sleepers every few steps
      if (i % 4 === 0) {
        const sleeperGeo = new THREE.CylinderGeometry(0.04, 0.04, railSpacing * 1.25, 8);
        const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
        sleeper.position.copy(p);
        sleeper.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        this.railsGroup.add(sleeper);
      }
    }

    const leftCurve = new THREE.CatmullRomCurve3(leftRailPoints);
    const rightCurve = new THREE.CatmullRomCurve3(rightRailPoints);

    const railGeoLeft = this.registerDisposable(new THREE.TubeGeometry(leftCurve, 200, 0.06 * config.railThickness, 8, false));
    const railGeoRight = this.registerDisposable(new THREE.TubeGeometry(rightCurve, 200, 0.06 * config.railThickness, 8, false));

    this.railsGroup.add(new THREE.Mesh(railGeoLeft, chromeMat));
    this.railsGroup.add(new THREE.Mesh(railGeoRight, chromeMat));

    // 3. Hero Rolling Metallic Sphere
    const sphereGeo = this.registerDisposable(new THREE.SphereGeometry(0.48, 32, 32));
    const sphereMat = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.primaryColor),
        metalness: 0.98,
        roughness: 0.08,
      })
    );
    this.heroBall = new THREE.Mesh(sphereGeo, sphereMat);
    this.rootGroup.add(this.heroBall);

    // Decorative inner core glow ring inside ball
    const ringGeo = this.registerDisposable(new THREE.TorusGeometry(0.5, 0.04, 16, 32));
    const glowMat = this.registerDisposable(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.accentColor),
      })
    );
    const heroRing = new THREE.Mesh(ringGeo, glowMat);
    heroRing.rotation.x = Math.PI / 2;
    this.heroBall.add(heroRing);

    // 4. Trail Particles behind the hero sphere
    this.trailPositions = new Float32Array(this.maxTrail * 3);
    const trailGeo = this.registerDisposable(new THREE.BufferGeometry());
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));

    const trailMat = this.registerDisposable(
      new THREE.PointsMaterial({
        color: new THREE.Color(config.accentColor),
        size: 0.16,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      })
    );
    this.ballTrail = new THREE.Points(trailGeo, trailMat);
    this.rootGroup.add(this.ballTrail);

    // 5. Suspended Triggers along the descent (Hang drums, Speakers, Frames, Neon Bars)
    const triggerMatBlack = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x16181f,
        metalness: 0.9,
        roughness: 0.15,
      })
    );

    const neonMat = this.registerDisposable(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.secondaryColor),
      })
    );

    const triggerCount = Math.floor(16 * config.density);
    for (let i = 0; i < triggerCount; i++) {
      const t = (i + 0.5 + (rand() - 0.5) * 0.3) / triggerCount;
      const pointOnCurve = this.curve.getPoint(t);
      const tangent = this.curve.getTangent(t).normalize();
      const normal = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();

      const side = i % 2 === 0 ? 1 : -1;
      const offsetDist = 1.3 + rand() * 1.2;
      const triggerPos = pointOnCurve.clone().addScaledVector(normal, side * offsetDist);
      triggerPos.y += (rand() - 0.5) * 0.8;

      const triggerGroup = new THREE.Group();
      triggerGroup.position.copy(triggerPos);

      // Suspension rod going up to ceiling
      const rodHeight = 35 - triggerPos.y;
      if (rodHeight > 1) {
        const rodGeo = new THREE.CylinderGeometry(0.015, 0.015, rodHeight, 6);
        const rod = new THREE.Mesh(rodGeo, chromeMat);
        rod.position.y = rodHeight / 2;
        triggerGroup.add(rod);
      }

      const typeChoice = i % 4;
      let triggerType: 'chime' | 'speaker' | 'frame' | 'neon-bar';

      if (typeChoice === 0) {
        // Hang Drum / Bell Chime (curved saucer)
        triggerType = 'chime';
        const drumGeo = new THREE.SphereGeometry(0.65, 24, 12);
        drumGeo.scale(1, 0.32, 1);
        const drum = new THREE.Mesh(drumGeo, chromeMat);
        triggerGroup.add(drum);

        const drumRim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.03, 8, 24), neonMat);
        drumRim.rotation.x = Math.PI / 2;
        triggerGroup.add(drumRim);
      } else if (typeChoice === 1) {
        // Floating Speaker Cone with glowing center
        triggerType = 'speaker';
        const speakerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.15, 0.45, 16), triggerMatBlack);
        speakerBody.rotation.z = Math.PI / 2 * side;
        triggerGroup.add(speakerBody);

        const speakerCore = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), neonMat);
        speakerCore.position.x = side * 0.22;
        triggerGroup.add(speakerCore);
      } else if (typeChoice === 2) {
        // Hanging Black Lacquer Picture Frame
        triggerType = 'frame';
        const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.06), triggerMatBlack);
        const frameInner = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.95, 0.07), chromeMat);
        frameOuter.add(frameInner);
        frameOuter.rotation.y = rand() * Math.PI;
        triggerGroup.add(frameOuter);
      } else {
        // Glowing Neon Accent Bar
        triggerType = 'neon-bar';
        const barGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8);
        const bar = new THREE.Mesh(barGeo, neonMat);
        bar.rotation.z = Math.PI / 3;
        triggerGroup.add(bar);
      }

      // Point light attached to trigger that flashes when activated
      const flashLight = new THREE.PointLight(new THREE.Color(config.accentColor), 0, 4.5);
      triggerGroup.add(flashLight);

      this.rootGroup.add(triggerGroup);
      this.triggers.push({
        group: triggerGroup,
        basePos: triggerPos.clone(),
        baseRot: triggerGroup.rotation.clone(),
        type: triggerType,
        hitTime: -10,
        light: flashLight,
      });
    }

    // 6. Atmospheric Background Panels & Reflective Floor
    const backdropGeo = this.registerDisposable(new THREE.PlaneGeometry(60, 60));
    const backdropMat = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x0a0c10,
        metalness: 0.8,
        roughness: 0.35,
      })
    );
    const backdrop = new THREE.Mesh(backdropGeo, backdropMat);
    backdrop.position.set(0, 0, -8);
    this.rootGroup.add(backdrop);
  }

  public override update(
    delta: number,
    time: number,
    metrics: AudioMetrics,
    config: BiomeConfig,
    reactiveConfig: AudioReactiveConfig
  ): void {
    if (!this.curve || !this.heroBall) return;

    // Advance ball along curve
    const speed = (delta / this.loopDuration) * config.speedMultiplier * (1 + metrics.energy * 0.4);
    this.ballProgress = (this.ballProgress + speed) % 1.0;

    const ballPos = this.curve.getPoint(this.ballProgress);
    const tangent = this.curve.getTangent(this.ballProgress).normalize();

    this.heroBall.position.copy(ballPos);
    this.followTarget.copy(ballPos);

    // Roll rotation
    this.heroBall.rotation.x += delta * 7.5;
    this.heroBall.rotation.z += delta * 4.2;

    // Bass pulse scale on the hero ball
    const bassScale = 1.0 + (reactiveConfig.enableBassPulsing ? metrics.bass * 0.35 * reactiveConfig.bassScaleResponse : 0);
    this.heroBall.scale.setScalar(bassScale);

    // Update trail
    this.trailPositions[this.trailIndex * 3] = ballPos.x;
    this.trailPositions[this.trailIndex * 3 + 1] = ballPos.y;
    this.trailPositions[this.trailIndex * 3 + 2] = ballPos.z;
    this.trailIndex = (this.trailIndex + 1) % this.maxTrail;
    this.ballTrail.geometry.attributes.position.needsUpdate = true;

    // Check triggers proximity & beat sync
    for (let i = 0; i < this.triggers.length; i++) {
      const trig = this.triggers[i];
      const dist = trig.basePos.distanceTo(ballPos);

      // Trigger hit when ball gets close OR on strong beat
      const ballHit = dist < 2.0;
      const beatHit = metrics.beat && (i % 3 === 0);

      if ((ballHit || beatHit) && time - trig.hitTime > 0.4) {
        trig.hitTime = time;
        if (trig.light) {
          trig.light.intensity = 3.5 * reactiveConfig.beatFlashIntensity;
        }
        // Spawn shockwave ring on hit
        this.spawnShockwave(trig.basePos, config.accentColor);
      }

      // Decay flash and sway trigger
      const timeSinceHit = time - trig.hitTime;
      if (trig.light && trig.light.intensity > 0) {
        trig.light.intensity = Math.max(0, trig.light.intensity - delta * 6.0);
      }

      // Gentle pendulum sway + hit recoil
      const sway = Math.sin(time * 2.2 + i) * 0.08;
      const hitImpulse = Math.max(0, Math.sin(timeSinceHit * Math.PI * 4) * Math.exp(-timeSinceHit * 3.5)) * 0.4;
      trig.group.rotation.z = trig.baseRot.z + sway + hitImpulse;
      trig.group.rotation.x = trig.baseRot.x + (sway * 0.5) + hitImpulse * 0.5;
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.scale += delta * 6.5;
      sw.mesh.scale.set(sw.scale, sw.scale, sw.scale);
      sw.alpha -= delta * 1.8;
      const mat = sw.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, sw.alpha);

      if (sw.alpha <= 0 || sw.scale >= sw.maxScale) {
        this.rootGroup.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        mat.dispose();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private spawnShockwave(pos: THREE.Vector3, colorHex: string) {
    if (this.shockwaves.length > 8) return; // Prevent excessive elements

    const ringGeo = new THREE.RingGeometry(0.1, 0.22, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.position.copy(pos);
    mesh.rotation.x = Math.PI / 2;
    this.rootGroup.add(mesh);

    this.shockwaves.push({
      mesh,
      scale: 0.4,
      maxScale: 3.2,
      alpha: 0.9,
    });
  }
}
