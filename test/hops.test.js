// Levitation hops: limited-use air-jumps.
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel } from '../src/levels/level.js';
import { createLevel2 } from '../src/levels/level2.js';
import { createPlayer, updatePlayer, P_H, P_JUMP_V, P_GRAVITY, HOP_V } from '../src/player.js';
import { loot, resetLoot, spawnLoot, updateLoot } from '../src/loot.js';
import { createCamera } from '../src/camera.js';
import { game, startGame } from '../src/game.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const box = (over = {}) => ({ x: 100, y: 200, w: 32, h: 32, broken: false, ...over });
const itemAt = (kind, x, y, onGround = true) => ({ x, y, w: 16, h: 16, vx: 0, vy: 0, onGround, kind, taken: false, t: 0 });
// a player settled on the ground at x=500 (one no-input frame so
// onGround/coyote are live, as in the real game)
const standingPlayer = () => {
  const l = lvl();
  const p = createPlayer(l);
  p.x = 500; p.y = l.groundY - P_H;
  updatePlayer(p, { left: false, right: false, jump: false, fire: false }, l, createCamera(), DT, fx([]));
  return { l, p };
};

afterEach(() => {
  resetLoot();
  startGame(600, 0);
});

// Drive the jump input with real edge semantics: `frame(true)` is a press
// (or hold), `frame(false)` a release.
const driver = (l, p, calls) => {
  const cam = createCamera();
  const inp = { left: false, right: false, jump: false, fire: false };
  return jump => { inp.jump = jump; updatePlayer(p, inp, l, cam, DT, fx(calls)); };
};

describe('pickup', () => {
  it('adds 3 hops and plays the sfx', () => {
    const { l, p } = standingPlayer();
    const calls = [];
    loot.push(itemAt('hops', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx(calls));
    expect(p.hops).toBe(3);
    expect(calls).toContain('hop');
  });

  it('caps at 3', () => {
    const { l, p } = standingPlayer();
    p.hops = 2;
    loot.push(itemAt('hops', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx([]));
    expect(p.hops).toBe(3);
  });
});

describe('air jumping', () => {
  it('a ground jump is a normal jump and does not consume a hop', () => {
    const { l, p } = standingPlayer();
    const calls = [];
    const frame = driver(l, p, calls);
    p.hops = 3;
    frame(true); // press on the ground
    expect(p.hops).toBe(3);
    expect(p.vy).toBeCloseTo(P_JUMP_V + P_GRAVITY * DT, 5); // full ground jump
    expect(calls).toContain('jump');
  });

  it('an air hop works 3 times, not a 4th', () => {
    const { l, p } = standingPlayer();
    const calls = [];
    const frame = driver(l, p, calls);
    p.hops = 3;
    frame(true); // ground jump
    for (let i = 0; i < 12; i++) frame(true);
    const hopPress = () => {
      frame(false);
      frame(true); // press in the air
      for (let i = 0; i < 4; i++) frame(true);
    };
    hopPress(); // hop 1
    expect(p.hops).toBe(2);
    hopPress(); // hop 2
    expect(p.hops).toBe(1);
    hopPress(); // hop 3
    expect(p.hops).toBe(0);
    expect(calls.filter(c => c === 'hop').length).toBe(3);
    hopPress(); // 4th: nothing left
    expect(calls.filter(c => c === 'hop').length).toBe(3);
    expect(p.onGround).toBe(false); // still airborne, merely falling
    // a hop used the reduced velocity
    expect(p.vy).toBeLessThan(0);
  });

  it('a hop applies jump-cut on release', () => {
    const { l, p } = standingPlayer();
    const calls = [];
    const frame = driver(l, p, calls);
    p.hops = 1;
    frame(true); // ground jump
    for (let i = 0; i < 12; i++) frame(true);
    frame(false);
    frame(true); // hop: vy = HOP_V
    expect(p.vy).toBeCloseTo(HOP_V + P_GRAVITY * DT, 5);
    frame(false); // release while still above JUMP_CUT
    expect(p.vy).toBeCloseTo(-180 + P_GRAVITY * DT, 5); // JUMP_CUT + one gravity step
  });
});

describe('persistence & placement', () => {
  it('hops reset on fresh start and on advance', () => {
    startGame(600, 0);
    game.player.hops = 3;
    startGame(600, 0);
    expect(game.player.hops).toBe(0);
    startGame(600, 1, game.player); // advance carries nothing for hops
    expect(game.player.hops).toBe(0);
  });

  it('box near the level-1 goal; level 2 box before the chasm', () => {
    const l1 = createLevel(600);
    const b1 = l1.boxes.find(b => b.drop === 'hops');
    expect(b1).toBeTruthy();
    expect(l1.goal.x - b1.x).toBeLessThan(400); // near the goal
    const b2 = createLevel2(600).boxes.find(b => b.drop === 'hops');
    expect(b2).toBeTruthy();
    expect(b2.x).toBeLessThan(1900); // before the interior chasm (1900-1980)
    expect(b2.x).toBeGreaterThan(900); // interior
  });
});
