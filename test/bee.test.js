// The bee (level 5): registry entry, hover at home, the straight-line
// sting (range + cooldown gated, 220 px max, buzz at dash start), return
// to home, stomp/arrow kills, one hurt per invuln window.
import { describe, it, expect, beforeEach } from 'vitest';
import { createLevel5 } from '../src/levels/level5.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies, damageEnemy, E_STOMP_V } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { createCamera } from '../src/camera.js';

const DT = 1 / 60;
const lvl = () => createLevel5(600);
const cam = () => createCamera();

// A bee at a known home, player far away by default.
const withBee = (over = {}) => {
  const l = lvl();
  const e = spawnEnemy({ kind: 'bee', x: 2450, y: 320, minX: 2400, maxX: 2600, ...over }, l);
  const p = createPlayer(l);
  p.x = 100; // far west: no aggro
  return { l, e, p };
};

// The first update initializes the bee's brain (home, phase, stingCd);
// run it with the player far away so nothing aggros, then the tests may
// override stingCd.
const init = (e, p, l) => updateEnemies([e], p, l, cam(), DT, { play() {} });

describe('registry', () => {
  it('is registered: 18x14, 1 hp, stompable', () => {
    const k = getKind('bee');
    expect(k).toBeDefined();
    expect([k.w, k.h, k.hp]).toEqual([18, 14, 1]);
    expect(k.stompable).toBe(true);
  });

  it('level 5 fields six bees at their homes (the design roster)', () => {
    expect(lvl().roster.filter(r => r.kind === 'bee').map(b => [b.x, b.y, b.minX, b.maxX])).toEqual([
      [2450, 320, 2400, 2600],
      [2750, 320, 2650, 2950],
      [3100, 300, 2950, 3250],
      [3850, 300, 3750, 4050],
      [4400, 280, 4300, 4600],
      [4850, 310, 4750, 5050],
    ]);
  });
});

describe('hover', () => {
  it('stays near its home flower while the player is far', () => {
    const { e, p } = withBee();
    for (let i = 0; i < 60; i++) updateEnemies([e], p, lvl(), cam(), DT, { play() {} });
    expect(Math.abs(e.x + 9 - 2459)).toBeLessThan(20); // within the bob radius + band
    expect(Math.abs(e.y + 7 - 327)).toBeLessThan(20);
    expect(e.state).toBe('hover');
  });

  it('stays inside its band', () => {
    const { e, p } = withBee();
    for (let i = 0; i < 120; i++) updateEnemies([e], p, lvl(), cam(), DT, { play() {} });
    expect(e.x).toBeGreaterThanOrEqual(2400);
    expect(e.x + e.w).toBeLessThanOrEqual(2600);
  });
});

describe('the sting', () => {
  const calls = [];
  const fx = { play: n => calls.push(n) };
  beforeEach(() => calls.length = 0);

  it('fires when in range with the cooldown done: dash + buzz', () => {
    const { l, e, p } = withBee();
    init(e, p, l);
    e.stingCd = 0; // force the cooldown done
    p.x = 2450 + 9 - 28; // in front, at the bee's height
    p.y = 320;
    const x0 = e.x;
    updateEnemies([e], p, l, cam(), DT, fx); // this update fires the sting
    expect(e.state).toBe('sting');
    expect(e.dir).toBe(-1); // toward the player (left)
    expect(calls).toContain('buzz');
    updateEnemies([e], p, l, cam(), DT, fx); // the next one starts the dash
    expect(e.x).toBeLessThan(x0); // moving left
  });

  it('no sting while the cooldown runs', () => {
    const { l, e, p } = withBee();
    init(e, p, l);
    e.stingCd = 2; // still cooling
    p.x = 2450 + 9 - 28;
    p.y = 320;
    updateEnemies([e], p, l, cam(), DT, fx);
    expect(e.state).toBe('hover');
    expect(calls).not.toContain('buzz');
  });

  it('no sting beyond the horizontal range (260 px)', () => {
    const { l, e, p } = withBee();
    init(e, p, l);
    e.stingCd = 0;
    p.x = 2450 + 9 + 300; // 300 px right of centre
    p.y = 320;
    updateEnemies([e], p, l, cam(), DT, fx);
    expect(e.state).toBe('hover');
  });

  it('no sting for a ground player well below the canopy', () => {
    const { l, e, p } = withBee();
    init(e, p, l);
    e.stingCd = 0;
    p.x = 2450; // dead below
    p.y = l.groundY - p.h; // standing on the ground
    updateEnemies([e], p, l, cam(), DT, fx);
    expect(e.state).toBe('hover'); // 200 px vertical band doesn't reach the ground
  });

  it('the dash stops at 220 px and eases back home', () => {
    // a wide band so the full 220 px dash fits (the default band is 200 wide)
    const { l, e, p } = withBee({ minX: 2100, maxX: 2700 });
    init(e, p, l);
    e.stingCd = 0;
    p.x = 2450 + 9 - 28; // in front (left), at the bee's height
    p.y = 320;
    const cx = e.x + e.w / 2;
    let maxTravel = 0, frames = 0;
    updateEnemies([e], p, l, cam(), DT, fx); // fires the sting
    while (e.state !== 'hover' && frames < 240) {
      updateEnemies([e], p, l, cam(), DT, fx);
      maxTravel = Math.max(maxTravel, cx - (e.x + e.w / 2));
      frames++;
    }
    expect(maxTravel).toBeGreaterThan(200); // it really flew out
    expect(maxTravel).toBeLessThanOrEqual(221); // ...but the 220 px cap held
    expect(e.state).toBe('hover'); // it came home
    expect(Math.abs(e.x + 9 - (2450 + 9))).toBeLessThan(20);
  });

  it('re-arms the cooldown after returning home', () => {
    const { l, e, p } = withBee();
    init(e, p, l);
    e.stingCd = 0;
    p.x = 2450 + 9 - 28;
    p.y = 320;
    updateEnemies([e], p, l, cam(), DT, { play() {} }); // fires the sting
    let frames = 0;
    while (e.state !== 'hover' && frames < 240) {
      updateEnemies([e], p, l, cam(), DT, { play() {} });
      frames++;
    }
    expect(e.stingCd).toBeGreaterThanOrEqual(3);
    expect(e.stingCd).toBeLessThan(4); // 3-4 s, seeded per home
  });
});

describe('killing the bee', () => {
  it('a stomp kills it with the bounce', () => {
    const { l, e, p } = withBee();
    p.x = e.x + 2;
    p.y = e.y - 36 + 8; // falling onto its top
    p.vy = 200;
    updateEnemies([e], p, l, cam(), DT, { play() {} });
    expect(e.dead).toBe(true);
    expect(p.vy).toBe(E_STOMP_V);
  });

  it('an arrow kills it (1 hp)', () => {
    const e = spawnEnemy({ kind: 'bee', x: 2450, y: 320, minX: 2400, maxX: 2600 }, lvl());
    expect(e.hp).toBe(1);
    damageEnemy(e, { play() {} }, cam());
    expect(e.dead).toBe(true);
  });

  it('a side sting hurts the player once (invuln window)', () => {
    const { l, e, p } = withBee();
    p.x = e.x + 2;
    p.y = e.y + 2; // side contact, not a stomp
    p.vy = 0;
    updateEnemies([e], p, l, cam(), DT, { play() {} });
    expect(p.hp).toBeLessThan(3);
    expect(p.invuln).toBeGreaterThan(0);
    // second touch inside the invuln window: no further damage
    const hp = p.hp;
    p.x = e.x + 2;
    updateEnemies([e], p, l, cam(), DT, { play() {} });
    expect(p.hp).toBe(hp);
  });

  it('a dead player does not aggro it', () => {
    const { l, e, p } = withBee();
    init(e, p, l);
    e.stingCd = 0;
    p.dead = true;
    p.x = 2450 + 9 - 28;
    p.y = 320;
    updateEnemies([e], p, l, cam(), DT, { play() {} });
    expect(e.state).toBe('hover');
  });
});
