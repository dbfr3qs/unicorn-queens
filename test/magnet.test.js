// Magnet: timed gem attraction.
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel } from '../src/levels/level.js';
import { createLevel2 } from '../src/levels/level2.js';
import { createPlayer, updatePlayer, MAGNET_TIME } from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { loot, resetLoot, spawnLoot, updateLoot } from '../src/loot.js';
import { game, startGame } from '../src/game.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const box = (over = {}) => ({ x: 100, y: 200, w: 32, h: 32, broken: false, ...over });
const noInput = { left: false, right: false, jump: false, fire: false };
const standingPlayer = () => {
  const l = lvl();
  const p = createPlayer(l);
  p.x = 500; p.y = l.groundY - 36;
  return { l, p };
};
const itemAt = (kind, x, y, onGround = true) => ({ x, y, w: 16, h: 16, vx: 0, vy: 0, onGround, kind, taken: false, t: 0 });

afterEach(() => {
  resetLoot();
  startGame(600, 0);
});

describe('drop table', () => {
  const kindAt = r => {
    resetLoot();
    spawnLoot(box(), () => 0); // consume the one-time bow
    spawnLoot(box(), () => r); // the roll under test
    return loot[1].kind;
  };

  it('heart 20%, boots 5%, magnet 5%, gem the rest', () => {
    expect(kindAt(0.19)).toBe('heart');
    expect(kindAt(0.22)).toBe('boots');
    expect(kindAt(0.26)).toBe('magnet');
    expect(kindAt(0.299)).toBe('magnet');
    expect(kindAt(0.9)).toBe('gem');
  });
});

describe('pickup', () => {
  it('sets the timer and plays the sfx', () => {
    const { l, p } = standingPlayer();
    const calls = [];
    loot.push(itemAt('magnet', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx(calls));
    expect(p.magnet).toBe(MAGNET_TIME);
    expect(calls).toContain('magnet');
  });
});

describe('steering', () => {
  it('a gem 200px away flies to the player and is collected', () => {
    const { l, p } = standingPlayer();
    p.magnet = 5;
    const gem = itemAt('gem', 300, l.groundY - 16);
    loot.push(gem);
    let frames = 0;
    while (!gem.taken && frames < 600) {
      updateLoot(p, l, DT, fx([]));
      frames++;
    }
    expect(gem.taken).toBe(true);
    expect(frames).toBeLessThan(300); // a few seconds at most
  });

  it('a ground gem leaves the ground while steering', () => {
    const { l, p } = standingPlayer();
    p.magnet = 5;
    const gem = itemAt('gem', 300, l.groundY - 16);
    loot.push(gem);
    updateLoot(p, l, DT, fx([]));
    expect(gem.onGround).toBe(false);
  });

  it('non-gem items keep normal physics', () => {
    const { l, p } = standingPlayer();
    p.magnet = 5;
    const heart = itemAt('heart', 300, l.groundY - 16);
    loot.push(heart);
    for (let i = 0; i < 60; i++) updateLoot(p, l, DT, fx([]));
    expect(heart.x).toBe(300); // stayed put
    expect(heart.onGround).toBe(true);
  });

  it('steering stops when the magnet expires (gravity resumes)', () => {
    const { l, p } = standingPlayer();
    p.magnet = 5;
    const gem = itemAt('gem', 300, l.groundY - 200, false); // airborne, 200px up
    loot.push(gem);
    updateLoot(p, l, DT, fx([]));
    expect(gem.y).toBeLessThan(l.groundY - 16); // still in the air, moving in
    p.magnet = 0;
    const yPrev = gem.y;
    updateLoot(p, l, DT, fx([]));
    expect(gem.y).toBeGreaterThan(yPrev); // falling
  });
});

describe('timer & placement', () => {
  it('decays in updatePlayer', () => {
    const l = lvl();
    const p = createPlayer(l);
    const cam = createCamera();
    p.magnet = 1;
    updatePlayer(p, { ...noInput }, l, cam, 1.5 * DT, fx([]));
    expect(p.magnet).toBeCloseTo(1 - 1.5 * DT, 5);
    updatePlayer(p, { ...noInput }, l, cam, 2, fx([]));
    expect(p.magnet).toBe(0);
  });

  it('a fresh start has no magnet', () => {
    startGame(600, 0);
    expect(game.player.magnet).toBe(0);
  });

  it('both levels designate a magnet box', () => {
    expect(createLevel(600).boxes.some(b => b.drop === 'magnet')).toBe(true);
    expect(createLevel2(600).boxes.some(b => b.drop === 'magnet')).toBe(true);
  });
});
