// Bounce boots: timed super-jump power (LOOT-PLAN P1).
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel } from '../src/level.js';
import { createLevel2 } from '../src/level2.js';
import { createPlayer, updatePlayer, P_JUMP_V, P_GRAVITY, BOOTS_TIME, BOOT_JUMP_MULT } from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { loot, resetLoot, spawnLoot, updateLoot } from '../src/loot.js';
import { game, startGame } from '../src/game.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const box = (over = {}) => ({ x: 100, y: 200, w: 32, h: 32, broken: false, ...over });
const noInput = { left: false, right: false, jump: false, fire: false };
// a player settled on the ground at x=505
const grounded = () => {
  const l = lvl();
  const p = createPlayer(l);
  const cam = createCamera();
  p.x = 505;
  updatePlayer(p, { ...noInput }, l, cam, DT, fx([]));
  return { l, p, cam };
};

afterEach(() => {
  resetLoot(); // also resets the one-time bow flag
  startGame(600, 0);
});

describe('drop table', () => {
  const kindAt = r => {
    resetLoot();
    spawnLoot(box(), () => 0); // consume the one-time bow
    spawnLoot(box(), () => r); // the roll under test
    return loot[1].kind;
  };

  it('heart 20%, boots 5%, gem the rest', () => {
    expect(kindAt(0.0)).toBe('heart');
    expect(kindAt(0.19)).toBe('heart');
    expect(kindAt(0.21)).toBe('boots');
    expect(kindAt(0.249)).toBe('boots');
    expect(kindAt(0.9)).toBe('gem');
  });
});

describe('pickup', () => {
  it('sets the timer, plays the sfx, bursts', () => {
    const { l, p } = grounded();
    const calls = [];
    loot.push({ x: 505, y: l.groundY - 16, w: 16, h: 16, vx: 0, vy: 0, onGround: true, kind: 'boots', taken: false, t: 0 });
    updateLoot(p, l, DT, fx(calls));
    expect(p.boots).toBe(BOOTS_TIME);
    expect(calls).toContain('boots');
  });
});

describe('jump', () => {
  const jumpVel = boots => {
    const { l, p, cam } = grounded();
    p.boots = boots;
    updatePlayer(p, { ...noInput, jump: true }, l, cam, DT, fx([]));
    return p.vy; // jump impulse + one frame of gravity
  };

  it('multiplies the jump impulse while active', () => {
    expect(jumpVel(1)).toBeCloseTo(P_JUMP_V * BOOT_JUMP_MULT + P_GRAVITY * DT, 5);
  });

  it('is a normal jump once expired', () => {
    expect(jumpVel(0)).toBeCloseTo(P_JUMP_V + P_GRAVITY * DT, 5);
  });
});

describe('timer', () => {
  it('decays in updatePlayer and clamps at 0', () => {
    const { l, p, cam } = grounded();
    p.boots = 1;
    updatePlayer(p, { ...noInput }, l, cam, 1.5 * DT, fx([]));
    expect(p.boots).toBeCloseTo(1 - 1.5 * DT, 5);
    updatePlayer(p, { ...noInput }, l, cam, 2, fx([])); // more than enough
    expect(p.boots).toBe(0);
  });
});

describe('persistence & placement', () => {
  it('a fresh start has no boots', () => {
    startGame(600, 0);
    expect(game.player.boots).toBe(0);
  });

  it('both levels designate a boots box', () => {
    expect(createLevel(600).boxes.some(b => b.drop === 'boots')).toBe(true);
    expect(createLevel2(600).boxes.some(b => b.drop === 'boots')).toBe(true);
  });
});
