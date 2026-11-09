import * as THREE from 'three';
import { BaseBiome } from './BiomeBase';
import { BiomeConfig, AudioMetrics, AudioReactiveConfig } from '../types';

interface GearUnit {
  mesh: THREE.Group;
  speed: number;
  teeth: number;
  radius: number;
}

export class MechanicalUniverse extends BaseBiome {
  private gears: GearUnit[] = [];
  private pistons: { rod: THREE.Mesh; head: THREE.Mesh; angle: number; length: number }[] = [];
  private gyroscope!: THREE.Group;

  public override init(scene: THREE.Scene, config: BiomeConfig): void {
    super.init(scene, config);

    const rand = this.createRandom(config.seed);

    const brassMat = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.9,
        roughness: 0.22,
      })
    );

    const chromeMat = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0xd0d5dd,
        metalness: 0.95,
        roughness: 0.12,
      })
    );

    const darkSteelMat = this.registerDisposable(
      new THREE.MeshStandardMaterial({
        color: 0x344054,
        metalness: 0.85,
        roughness: 0.35,
      })
    );

    // 1. Interlocking Gear Train
    const gearConfigs = [
      { x: 0, y: 0, z: 0, radius: 2.8, teeth: 24, ratio: 1.0, mat: brassMat },
      { x: 4.4, y: 1.6, z: 0.2, radius: 1.8, teeth: 16, ratio: -1.5, mat: chromeMat },
      { x: -3.8, y: -2.0, z: -0.2, radius: 2.0, teeth: 18, ratio: -1.33, mat: chromeMat },
      { x: 2.2, y: -3.4, z: 0.4, radius: 1.2, teeth: 10, ratio: 2.4, mat: brassMat },
      { x: -2.6, y: 3.2, z: 0.1, radius: 1.5, teeth: 12, ratio: 2.0, mat: darkSteelMat },
    ];

    for (const gc of gearConfigs) {
      const gearGroup = new THREE.Group();
      gearGroup.position.set(gc.x, gc.y, gc.z);

      // Main gear disk
      const diskGeo = this.registerDisposable(new THREE.CylinderGeometry(gc.radius, gc.radius, 0.35, 32));
      diskGeo.rotateX(Math.PI / 2);
      const disk = new THREE.Mesh(diskGeo, gc.mat);
      gearGroup.add(disk);

      // Hollow inner spokes
      const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(gc.radius * 0.65, 0.08, 8, 24),
        chromeMat
      );
      gearGroup.add(innerRing);

      // Teeth around circumference
      const toothGeo = this.registerDisposable(new THREE.BoxGeometry(0.35, 0.45, 0.36));
      for (let t = 0; t < gc.teeth; t++) {
        const angle = (t / gc.teeth) * Math.PI * 2;
        const tooth = new THREE.Mesh(toothGeo, gc.mat);
        tooth.position.set(Math.cos(angle) * (gc.radius + 0.12), Math.sin(angle) * (gc.radius + 0.12), 0);
        tooth.rotation.z = angle;
        gearGroup.add(tooth);
      }

      // Center axle
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 16), darkSteelMat);
      axle.rotation.x = Math.PI / 2;
      gearGroup.add(axle);

      this.gears.push({
        mesh: gearGroup,
        speed: gc.ratio * 0.8,
        teeth: gc.teeth,
        radius: gc.radius,
      });

      this.rootGroup.add(gearGroup);
    }

    // 2. Oscillating Pistons
    for (let i = 0; i < 3; i++) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.5, 8), chromeMat);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), darkSteelMat);
      rod.position.set(5.5, -4 + i * 2.5, 0.5);
      head.position.set(5.5, -4 + i * 2.5, 2.2);

      this.rootGroup.add(rod, head);
      this.pistons.push({
        rod,
        head,
        angle: (i / 3) * Math.PI * 2,
        length: 3.5,
      });
    }

    // 3. Central Suspended Gyroscope
    this.gyroscope = new THREE.Group();
    const gyroRing1 = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.12, 12, 48), brassMat);
    const gyroRing2 = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.1, 12, 48), chromeMat);
    const gyroRing3 = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.08, 12, 48), darkSteelMat);

    gyroRing2.rotation.x = Math.PI / 3;
    gyroRing3.rotation.y = Math.PI / 3;

    this.gyroscope.add(gyroRing1, gyroRing2, gyroRing3);
    this.rootGroup.add(this.gyroscope);

    this.followTarget.set(0, 0, 0);
  }

  public override update(
    delta: number,
    time: number,
    metrics: AudioMetrics,
    config: BiomeConfig,
    reactiveConfig: AudioReactiveConfig
  ): void {
    const speedBoost = 1.0 + metrics.energy * 1.8 * reactiveConfig.midRotationResponse;

    // Rotate gears synchronously
    for (let i = 0; i < this.gears.length; i++) {
      const g = this.gears[i];
      g.mesh.rotation.z += g.speed * delta * config.speedMultiplier * speedBoost;
    }

    // Pump pistons on beats
    for (let i = 0; i < this.pistons.length; i++) {
      const p = this.pistons[i];
      p.angle += delta * 4.0 * speedBoost;
      const stroke = Math.sin(p.angle) * (1.2 + metrics.bass * 0.8 * reactiveConfig.bassScaleResponse);
      p.head.position.z = 1.8 + stroke;
      p.rod.position.z = 0.9 + stroke * 0.5;
    }

    // Gyroscope continuous gimbal rotation
    this.gyroscope.rotation.x += delta * 0.4 * speedBoost;
    this.gyroscope.rotation.y += delta * 0.6 * speedBoost;

    // Target tracks center with subtle wobble
    this.followTarget.set(Math.sin(time * 0.4) * 1.0, Math.cos(time * 0.3) * 0.8, 0);
  }
}
