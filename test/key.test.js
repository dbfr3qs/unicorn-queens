// The hidden key: pickup state + FX, one-time, marker-brick glint on
// arrow hit (purely visual).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { updateKey, MARKER_GLINT } from '../src/key.js';
import { arrows, updateArrows, resetArrows } from '../src/arrows.js';
import { particles, resetParticles } from '../src/particles.js';
import { createCamera } from '../src/camera.js';
import { P_H } from '../src/player.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };
const resetCalls = () => calls.length = 0;

beforeEach(() => startGame(600, 0));
afterEach(() => {
  resetArrows();
  resetParticles();
  startGame(600, 0);
});

describe('pickup', () => {
  const withKey = (over = {}) => {
    const g = game;
    g.level.key = { x: 500, y: g.level.groundY - 44, w: 16, h: 16, taken: false, ...over };
    g.player.x = g.level.key.x + 2; // overlap
    g.player.y = g.level.key.y + 2;
    return g;
  };

  it('overlap takes the key: state, chime, gold burst', () => {
    const g = withKey();
    updateKey(g.level, g.player, fx);
    expect(g.level.key.taken).toBe(true);
    expect(calls).toContain('key');
    expect(particles.length).toBeGreaterThan(0);
  });

  it('is one-time: no second chime or burst', () => {
    const g = withKey();
    updateKey(g.level, g.player, fx);
    resetCalls();
    updateKey(g.level, g.player, fx);
    expect(calls).not.toContain('key');
  });

  it('a dead player does not pick it up', () => {
    const g = withKey();
    g.player.dead = true;
    updateKey(g.level, g.player, fx);
    expect(g.level.key.taken).toBe(false);
  });

  it('a level without key data is a no-op', () => {
    expect(() => updateKey(game.level, game.player, fx)).not.toThrow();
    expect(calls).toHaveLength(0);
  });

  it('picks up through the full game update', () => {
    const g = withKey();
    update(DT, 800, fx);
    expect(g.level.key.taken).toBe(true);
    expect(calls).toContain('key');
  });
});

describe('marker brick', () => {
  const withMarker = () => {
    const g = game;
    g.level.marker = { x: 1480, y: g.level.groundY - 200, w: 36, h: 12, glintT: 0 };
    const cam = createCamera();
    cam.x = 1200; // marker is on screen
    // an arrow about to cross the brick
    arrows.push({ x: g.level.marker.x - 14, y: g.level.marker.y - 2, vx: 520, dead: false });
    return { g, cam };
  };

  it('an arrow hit flashes the glint and the arrow flies on', () => {
    const { g, cam } = withMarker();
    updateArrows([], g.level, cam, DT, fx);
    expect(g.level.marker.glintT).toBeGreaterThan(MARKER_GLINT - 2 * DT);
    expect(arrows[0].dead).toBe(false); // glint is visual: no kill
  });

  it('the glint decays to zero over the game update', () => {
    const { g, cam } = withMarker();
    updateArrows([], g.level, cam, DT, fx);
    const t0 = g.level.marker.glintT;
    expect(t0).toBeGreaterThan(0);
    for (let i = 0; i < 120 && g.level.marker.glintT > 0; i++) update(DT, 800, fx);
    expect(g.level.marker.glintT).toBe(0);
    expect(g.level.marker.glintT).toBeLessThan(t0);
  });

  it('a miss (no overlap) leaves the glint at rest', () => {
    const { g, cam } = withMarker();
    arrows[0].y -= 40; // well above the brick
    updateArrows([], g.level, cam, DT, fx);
    expect(g.level.marker.glintT).toBe(0);
  });
});
