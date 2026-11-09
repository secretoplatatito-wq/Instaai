import * as THREE from 'three';
import { AudioMetrics, BiomeConfig, AudioReactiveConfig } from '../types';

export interface IBiome {
  init(scene: THREE.Scene, config: BiomeConfig): void;
  update(delta: number, time: number, metrics: AudioMetrics, config: BiomeConfig, reactiveConfig: AudioReactiveConfig): void;
  getFollowTarget(): THREE.Vector3;
  dispose(scene: THREE.Scene): void;
}

// Module-scope reusable math vectors (Zero GC per frame)
export const _vec3A = new THREE.Vector3();
export const _vec3B = new THREE.Vector3();
export const _colorA = new THREE.Color();
export const _colorB = new THREE.Color();
export const _quatA = new THREE.Quaternion();

export class BaseBiome implements IBiome {
  protected rootGroup: THREE.Group;
  protected followTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  protected disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

  constructor() {
    this.rootGroup = new THREE.Group();
  }

  public init(scene: THREE.Scene, _config: BiomeConfig): void {
    scene.add(this.rootGroup);
  }

  public update(
    _delta: number,
    _time: number,
    _metrics: AudioMetrics,
    _config: BiomeConfig,
    _reactiveConfig: AudioReactiveConfig
  ): void {
    // Override in subclass
  }

  public getFollowTarget(): THREE.Vector3 {
    return this.followTarget;
  }

  public dispose(scene: THREE.Scene): void {
    scene.remove(this.rootGroup);

    // Deep dispose all children
    this.rootGroup.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line) {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });

    while (this.rootGroup.children.length > 0) {
      this.rootGroup.remove(this.rootGroup.children[0]);
    }

    this.disposables.forEach((item) => {
      try {
        item.dispose();
      } catch {
        // ignore
      }
    });
    this.disposables = [];
  }

  protected registerDisposable<T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(item: T): T {
    this.disposables.push(item);
    return item;
  }

  /**
   * Seeded pseudo-random generator
   */
  protected createRandom(seed: number) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /**
   * Procedural canvas texture generator for subtle brushed metal or grime
   */
  protected createBrushedTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, 256, 256);

    // Fine horizontal grain lines
    for (let i = 0; i < 2000; i++) {
      const y = Math.random() * 256;
      const alpha = Math.random() * 0.15;
      const brightness = Math.random() > 0.5 ? 255 : 0;
      ctx.fillStyle = `rgba(${brightness},${brightness},${brightness},${alpha})`;
      ctx.fillRect(0, y, 256, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 4);
    tex.colorSpace = THREE.SRGBColorSpace;
    return this.registerDisposable(tex);
  }
}
