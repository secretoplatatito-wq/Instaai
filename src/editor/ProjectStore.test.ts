import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_PROJECT, DEFAULT_SANDBOX_CONFIG, DEFAULT_PRESETS } from './ProjectStore';

test('INITIAL_PROJECT has complete and valid configuration defaults', () => {
  assert.equal(typeof INITIAL_PROJECT.id, 'string');
  assert.equal(INITIAL_PROJECT.studioMode, '3d-biome');
  assert.equal(INITIAL_PROJECT.biomeType, 'metallic-gravity');
  assert.ok(INITIAL_PROJECT.sandboxConfig);
  assert.equal(INITIAL_PROJECT.sandboxConfig.type, 'ellipse-laser');
  assert.equal(INITIAL_PROJECT.exportSettings.aspectRatio, '9:16');
  assert.equal(INITIAL_PROJECT.exportSettings.format, 'mp4');
});

test('DEFAULT_SANDBOX_CONFIG has all required physics parameters', () => {
  assert.equal(DEFAULT_SANDBOX_CONFIG.type, 'ellipse-laser');
  assert.ok(DEFAULT_SANDBOX_CONFIG.ballRadius > 0);
  assert.ok(DEFAULT_SANDBOX_CONFIG.restitution > 0);
  assert.ok(DEFAULT_SANDBOX_CONFIG.gravity > 0);
});

test('DEFAULT_PRESETS contains 2D and 3D configurations', () => {
  assert.ok(DEFAULT_PRESETS.length >= 8);
  const sandboxPresets = DEFAULT_PRESETS.filter((p) => p.data.studioMode === '2d-sandbox');
  const biomePresets = DEFAULT_PRESETS.filter((p) => p.data.studioMode === '3d-biome');
  assert.ok(sandboxPresets.length >= 4);
  assert.ok(biomePresets.length >= 4);
});
