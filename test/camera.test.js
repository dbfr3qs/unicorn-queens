import { describe, it, expect } from 'vitest';
import { createCamera, updateCamera, shake } from '../src/camera.js';
import { createLevel } from '../src/level.js';

const DT = 1 / 60;

describe('createCamera', () => {
  it('starts at origin with no shake', () => {
    expect(createCamera()).toEqual({ x: 0, shake: 0, mag: 0 });
  });
});

describe('updateCamera', () => {
  it('eases toward the centered target', () => {
    const cam = createCamera();
    const p = { x: 1000, y: 0, w: 28 };
    const target = 1000 + 14 - 400; // player center minus half the view
    updateCamera(cam, p, createLevel(600), 800, DT);
    expect(cam.x).toBeCloseTo(target * (1 - Math.exp(-DT * 8)), 6);
  });

  it('clamps at the world start', () => {
    const cam = { x: 50, shake: 0, mag: 0 };
    updateCamera(cam, { x: 0, y: 0, w: 28 }, createLevel(600), 800, DT);
    expect(cam.x).toBe(0);
  });

  it('clamps at the world end (ease overshoots, clamp pins)', () => {
    const cam = { x: 1600, shake: 0, mag: 0 };
    // player at the far edge: target 2014 is past the clamp, ease would push further right
    updateCamera(cam, { x: 2400, y: 0, w: 28 }, createLevel(600), 800, DT);
    expect(cam.x).toBe(2400 - 800);
  });
});

describe('shake', () => {
  it('keeps the max magnitude and duration', () => {
    const cam = createCamera();
    shake(cam, 5, 0.2);
    expect(cam.mag).toBe(5);
    expect(cam.shake).toBe(0.2);
    shake(cam, 3, 0.1); // weaker shake does not override
    expect(cam.mag).toBe(5);
    expect(cam.shake).toBe(0.2);
  });

  it('re-shakes a calm camera', () => {
    const cam = createCamera();
    shake(cam, 8, 0.3);
    cam.mag = 0; cam.shake = 0; // fully decayed
    shake(cam, 2, 0.1);
    expect(cam.mag).toBe(2);
    expect(cam.shake).toBe(0.1);
  });
});
