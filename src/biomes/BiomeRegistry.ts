import * as THREE from 'three';
import { BiomeType, BiomeConfig } from '../types';
import { IBiome } from './BiomeBase';
import { MetallicGravityGarden } from './MetallicGravityGarden';
import { PhysicsPlayground } from './PhysicsPlayground';
import { NeonRainbowDimension } from './NeonRainbowDimension';
import { CosmicOrbitalBiome } from './CosmicOrbitalBiome';
import { MechanicalUniverse } from './MechanicalUniverse';
import { CrystalCavern } from './CrystalCavern';
import { LiquidNeonWorld } from './LiquidNeonWorld';
import { FourierHarmonicHarp } from './FourierHarmonicHarp';

export interface BiomeMeta {
  id: BiomeType;
  title: string;
  category: string;
  description: string;
  defaultPrimary: string;
  defaultSecondary: string;
  defaultAccent: string;
}

export const BIOME_REGISTRY: Record<BiomeType, BiomeMeta> = {
  'metallic-gravity': {
    id: 'metallic-gravity',
    title: 'Metallic Gravity Garden',
    category: 'Satisfying Kinetic (Viral Reference)',
    description: 'Dark graphite studio, winding chrome rails, rolling metallic spheres, suspended chimes and glowing pulses.',
    defaultPrimary: '#ff6b35',
    defaultSecondary: '#00f2fe',
    defaultAccent: '#ffd166',
  },
  'physics-playground': {
    id: 'physics-playground',
    title: 'Physics Playground',
    category: 'Collision & Multiplication (Viral Reference)',
    description: 'Minimalist geometric container, rotating center paddles, high-restitution bouncy spheres that multiply on beats.',
    defaultPrimary: '#38bdf8',
    defaultSecondary: '#f43f5e',
    defaultAccent: '#a855f7',
  },
  'neon-rainbow': {
    id: 'neon-rainbow',
    title: 'Neon Rainbow Dimension',
    category: 'Motion Graphics',
    description: 'Vibrant chromatic zigzag steps, floating geometric prisms, and cascading rainbow light particles.',
    defaultPrimary: '#ec4899',
    defaultSecondary: '#3b82f6',
    defaultAccent: '#10b981',
  },
  'cosmic-orbital': {
    id: 'cosmic-orbital',
    title: 'Cosmic Orbital Biome',
    category: 'Cinematic Space',
    description: 'Procedural Saturnian planet with undulating harmonic rings, orbiting moons, and cosmic stardust.',
    defaultPrimary: '#8b5cf6',
    defaultSecondary: '#06b6d4',
    defaultAccent: '#fbbf24',
  },
  'mechanical-universe': {
    id: 'mechanical-universe',
    title: 'Mechanical Universe',
    category: 'Steampunk & Engineering',
    description: 'Interlocking brass gears, clockwork escapements, and synchronized oscillating pistons.',
    defaultPrimary: '#d97706',
    defaultSecondary: '#94a3b8',
    defaultAccent: '#f59e0b',
  },
  'crystal-cavern': {
    id: 'crystal-cavern',
    title: 'Crystal Cavern',
    category: 'Atmospheric Geological',
    description: 'Faceted quartz & amethyst mineral clusters, glowing subterranean geodes, and floating zero-g shards.',
    defaultPrimary: '#c084fc',
    defaultSecondary: '#38bdf8',
    defaultAccent: '#f472b6',
  },
  'liquid-neon': {
    id: 'liquid-neon',
    title: 'Liquid Neon World',
    category: 'Abstract Energy',
    description: 'Flowing spline tubes, glowing liquid energy streams, and deformable light blobs.',
    defaultPrimary: '#06b6d4',
    defaultSecondary: '#ec4899',
    defaultAccent: '#8b5cf6',
  },
  'fourier-harp': {
    id: 'fourier-harp',
    title: 'Fourier Harmonic Harp',
    category: 'Mathematical Spirograph',
    description: 'Harmonic rotating epicycles tracing complex mathematical audio waveforms in 3D glowing neon trails.',
    defaultPrimary: '#00f2fe',
    defaultSecondary: '#f97316',
    defaultAccent: '#a855f7',
  },
};

export function createBiomeInstance(type: BiomeType): IBiome {
  switch (type) {
    case 'metallic-gravity':
      return new MetallicGravityGarden();
    case 'physics-playground':
      return new PhysicsPlayground();
    case 'neon-rainbow':
      return new NeonRainbowDimension();
    case 'cosmic-orbital':
      return new CosmicOrbitalBiome();
    case 'mechanical-universe':
      return new MechanicalUniverse();
    case 'crystal-cavern':
      return new CrystalCavern();
    case 'liquid-neon':
      return new LiquidNeonWorld();
    case 'fourier-harp':
      return new FourierHarmonicHarp();
    default:
      return new MetallicGravityGarden();
  }
}
