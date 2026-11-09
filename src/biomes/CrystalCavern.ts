import * as THREE from 'three';
import { BaseBiome } from './BiomeBase';
import { BiomeConfig, AudioMetrics, AudioReactiveConfig } from '../types';

export class CrystalCavern extends BaseBiome {
  private crystalMeshes: THREE.Mesh[] = [];
  private floatingShards: { mesh: THREE.Mesh; basePos: THREE.Vector3; speed: number; rotAxis: THREE.Vector3 }[] = [];
  private caveLight!: THREE.PointLight;

  public override init(scene: THREE.Scene, config: BiomeConfig): void {
    super.init(scene, config);

    const rand = this.createRandom(config.seed);

    // 1. Central Hero Crystal Cluster (Giant faceted Quartz & Amethyst columns)
    const clusterGroup = new THREE.Group();

    const crystalMat = this.registerDisposable(
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(config.primaryColor),
        emissive: new THREE.Color(config.accentColor),
        emissiveIntensity: 0.25,
        metalness: 0.1,
        roughness: 0.15,
        transmission: 0.65,
        ior: 1.6,
        thickness: 2.0,
        transparent: true,
        opacity: 0.9,
      })
    );

    const numPillars = 22;
    for (let i = 0; i < numPillars; i++) {
      const height = 4.0 + rand() * 5.5;
      const radius = 0.5 + rand() * 0.7;
      // Hexagonal prism with pointed top
      const geo = this.registerDisposable(new THREE.ConeGeometry(radius, height, 6));
      const crystal = new THREE.Mesh(geo, crystalMat);

      const angle = (i / numPillars) * Math.PI * 2;
      const dist = 1.2 + rand() * 2.8;
      crystal.position.set(Math.cos(angle) * dist, (rand() - 0.5) * 1.5, Math.sin(angle) * dist);

      // Splay outwards
      crystal.rotation.x = (rand() - 0.5) * 0.7 + (crystal.position.z / 6);
      crystal.rotation.z = (rand() - 0.5) * 0.7 - (crystal.position.x / 6);
      crystal.rotation.y = rand() * Math.PI;

      clusterGroup.add(crystal);
      this.crystalMeshes.push(crystal);
    }
    this.rootGroup.add(clusterGroup);

    // 2. Floating Gem Shards drifting in zero-g
    const numShards = 45;
    for (let i = 0; i < numShards; i++) {
      const shardGeo = this.registerDisposable(new THREE.OctahedronGeometry(0.3 + rand() * 0.45));
      shardGeo.scale(1, 1.8, 0.8);
      const shardMat = this.registerDisposable(
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(config.secondaryColor),
          metalness: 0.9,
          roughness: 0.15,
        })
      );
      const shard = new THREE.Mesh(shardGeo, shardMat);
      const pos = new THREE.Vector3(
        (rand() - 0.5) * 16,
        (rand() - 0.5) * 22,
        (rand() - 0.5) * 14
      );
      shard.position.copy(pos);
      this.rootGroup.add(shard);

      this.floatingShards.push({
        mesh: shard,
        basePos: pos.clone(),
        speed: 0.5 + rand() * 1.2,
        rotAxis: new THREE.Vector3(rand(), rand(), rand()).normalize(),
      });
    }

    // 3. Glowing Core Light inside cavern
    this.caveLight = new THREE.PointLight(new THREE.Color(config.accentColor), 2.5, 20);
    this.caveLight.position.set(0, 0, 0);
    this.rootGroup.add(this.caveLight);

    this.followTarget.set(0, 0, 0);
  }

  public override update(
    delta: number,
    time: number,
    metrics: AudioMetrics,
    config: BiomeConfig,
    reactiveConfig: AudioReactiveConfig
  ): void {
    // Pulse cavern core light with bass
    this.caveLight.intensity = 1.5 + metrics.bass * 4.0 * reactiveConfig.bassScaleResponse;

    // Crystals breathe and pulse
    for (let i = 0; i < this.crystalMeshes.length; i++) {
      const c = this.crystalMeshes[i];
      const scaleY = 1.0 + Math.sin(time * 3 + i) * 0.08 + (metrics.bass * 0.25 * reactiveConfig.bassScaleResponse);
      c.scale.set(1.0, scaleY, 1.0);
    }

    // Float and rotate shards
    for (let i = 0; i < this.floatingShards.length; i++) {
      const s = this.floatingShards[i];
      s.mesh.rotation.x += s.rotAxis.x * delta * s.speed;
      s.mesh.rotation.y += s.rotAxis.y * delta * s.speed;
      s.mesh.position.y = s.basePos.y + Math.sin(time * s.speed + i) * 0.8;
      s.mesh.position.x = s.basePos.x + Math.cos(time * s.speed * 0.7 + i) * 0.4;
    }

    this.followTarget.set(Math.sin(time * 0.4) * 1.2, Math.cos(time * 0.3) * 1.5, 0);
  }
}
