// Heart cap: permanent-for-the-run maxHp 4 (LOOT-PLAN P4).
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel } from '../src/level.js';
import { createLevel2 } from '../src/level2.js';
import { createPlayer } from '../src/player.js';
import { loot, score, resetLoot, updateLoot } from '../src/loot.js';
import { game, startGame } from '../src/game.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const itemAt = (kind, x, y, onGround = true) => ({ x, y, w: 16, h: 16, vx: 0, vy: 0, onGround, kind, taken: false, t: 0 });
const standingPlayer = () => {
  const l = lvl();
  const p = createPlayer(l);
  p.x = 500; p.y = l.groundY - 36;
  return { l, p };
};

afterEach(() => {
  resetLoot();
  startGame(600, 0);
});

describe('pickup', () => {
  it('raises the cap to 4 and plays the sfx', () => {
    const { l, p } = standingPlayer();
    const calls = [];
    loot.push(itemAt('heartcap', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx(calls));
    expect(p.maxHp).toBe(4);
    expect(calls).toContain('heartcap');
  });

  it('a second pickup is idempotent and pays out like a gem', () => {
    const { l, p } = standingPlayer();
    const s0 = score;
    loot.push(itemAt('heartcap', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx([]));
    loot.push(itemAt('heartcap', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx([]));
    expect(p.maxHp).toBe(4);
    expect(score).toBe(s0 + 1);
  });
});

describe('healing', () => {
  it('hearts heal to the cap, and no further', () => {
    const { l, p } = standingPlayer();
    p.maxHp = 4; p.hp = 3;
    loot.push(itemAt('heart', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx([]));
    expect(p.hp).toBe(4);
    loot.push(itemAt('heart', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx([]));
    expect(p.hp).toBe(4); // capped
  });
});

describe('persistence & placement', () => {
  it('a fresh start has a cap of 3', () => {
    startGame(600, 0);
    expect(game.player.maxHp).toBe(3);
  });

  it('only level 2 designates a heartcap box, in the hall', () => {
    expect(createLevel(600).boxes.some(b => b.drop === 'heartcap')).toBe(false);
    const box = createLevel2(600).boxes.find(b => b.drop === 'heartcap');
    expect(box).toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(2700); // hall zone starts at 2700
  });
});
