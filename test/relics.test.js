// Level 5 relics: pickup state (+50, one-shot), the arrow-through-the-
// bush reveal (normal arrow consumed, star rustles and keeps flying),
// relicsTaken for the queen's `when`s.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { updateRelics, relicsTaken } from '../src/relics.js';
import { arrows, updateArrows, resetArrows } from '../src/arrows.js';
import { createCamera } from '../src/camera.js';
import { score } from '../src/loot.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };
const resetCalls = () => calls.length = 0;

beforeEach(() => startGame(600, 4));
afterEach(() => {
  resetArrows();
  startGame(600, 4);
});

const relic = id => game.level.relics.find(r => r.id === id);

describe('pickup', () => {
  const standOn = r => {
    game.player.x = r.x + 2;
    game.player.y = r.y + 2;
    game.player.dead = false;
  };

  it('overlap takes a visible relic: state, chime, +50', () => {
    const r = relic('sapphire');
    standOn(r);
    const before = score;
    updateRelics(game.level, game.player, DT, fx);
    expect(r.taken).toBe(true);
    expect(calls).toContain('relic');
    expect(score).toBe(before + 50);
    expect(relicsTaken(game.level)).toBe(1);
  });

  it('is one-shot: no second chime or score', () => {
    const r = relic('acorn');
    standOn(r);
    updateRelics(game.level, game.player, DT, fx);
    resetCalls();
    updateRelics(game.level, game.player, DT, fx);
    expect(calls).not.toContain('relic');
    expect(relicsTaken(game.level)).toBe(1);
  });

  it('a dead player does not pick one up', () => {
    const r = relic('sapphire');
    standOn(r);
    game.player.dead = true;
    updateRelics(game.level, game.player, DT, fx);
    expect(r.taken).toBe(false);
  });

  it('the horseshoe is not pickable while the bush still hides it', () => {
    const r = relic('horseshoe');
    expect(r.visible).toBe(false);
    standOn(r);
    updateRelics(game.level, game.player, DT, fx);
    expect(r.taken).toBe(false); // invisible: no overlap pickup
  });

  it('all three picked: relicsTaken counts 3', () => {
    for (const id of ['sapphire', 'acorn']) {
      standOn(relic(id));
      updateRelics(game.level, game.player, DT, fx);
    }
    game.level.bushes[0].state = 'revealed';
    relic('horseshoe').visible = true;
    standOn(relic('horseshoe'));
    updateRelics(game.level, game.player, DT, fx);
    expect(relicsTaken(game.level)).toBe(3);
    expect(score).toBe(150);
  });
});

describe('the bush reveal', () => {
  const shoot = (star = false) => {
    resetArrows();
    const cam = createCamera();
    const b = game.level.bushes[0];
    cam.x = b.x - 100; // the bush is on screen
    arrows.push({ x: b.x - 14, y: b.y + 4, vx: 520, dead: false, ...(star ? { star: true, pierces: 2, hit: new Set() } : {}) });
    updateArrows([], game.level, cam, DT, fx);
  };

  it('a normal arrow reveals: rustle, leaf-puff, relic visible, arrow gone', () => {
    shoot();
    const b = game.level.bushes[0];
    expect(b.state).toBe('revealed');
    expect(b.rustleT).toBeGreaterThan(0);
    expect(relic('horseshoe').visible).toBe(true);
    expect(arrows.length).toBe(0); // consumed
    expect(calls).toContain('rustle');
  });

  it('a star arrow reveals AND keeps flying', () => {
    shoot(true);
    expect(game.level.bushes[0].state).toBe('revealed');
    expect(relic('horseshoe').visible).toBe(true);
    expect(arrows.length).toBe(1); // still in flight
    expect(arrows[0].dead).toBe(false);
  });

  it('a second arrow does nothing (already revealed)', () => {
    shoot();
    resetCalls();
    shoot();
    expect(calls).not.toContain('rustle');
    expect(game.level.bushes[0].state).toBe('revealed');
  });

  it('a missed arrow leaves the bush hiding', () => {
    resetArrows();
    const cam = createCamera();
    const b = game.level.bushes[0];
    cam.x = b.x - 100;
    arrows.push({ x: b.x - 14, y: b.y - 40, vx: 520, dead: false }); // well above
    updateArrows([], game.level, cam, DT, fx);
    expect(b.state).toBe('hiding');
    expect(relic('horseshoe').visible).toBe(false);
  });

  it('after the reveal the horseshoe is pickable, then the count climbs', () => {
    shoot();
    const r = relic('horseshoe');
    game.player.x = r.x + 2;
    game.player.y = r.y + 2;
    updateRelics(game.level, game.player, DT, fx);
    expect(r.taken).toBe(true);
    expect(relicsTaken(game.level)).toBe(1);
  });
});

describe('wiring', () => {
  it('the full game update picks up a relic by overlap', () => {
    const r = relic('acorn');
    game.player.x = r.x + 2;
    game.player.y = r.y + 2;
    update(DT, 800, fx);
    expect(r.taken).toBe(true);
    expect(calls).toContain('relic');
  });

  it('rustleT decays to zero over time', () => {
    resetArrows();
    const cam = createCamera();
    const b = game.level.bushes[0];
    cam.x = b.x - 100;
    arrows.push({ x: b.x - 14, y: b.y + 4, vx: 520, dead: false });
    updateArrows([], game.level, cam, DT, fx);
    expect(b.rustleT).toBeGreaterThan(0);
    for (let i = 0; i < 40; i++) updateRelics(game.level, game.player, DT, fx);
    expect(b.rustleT).toBe(0);
  });
});
