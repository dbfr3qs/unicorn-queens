// The sentinel: a 40×44, 2 hp, stompable guard that patrols its band on the
// clockwork floor. Its shield plate is up for the 1.0 s after each chime — a
// pure read of `clock.t` — and it deflects front-facing arrows in that window
// (a rear arrow, or a front arrow at t ≥ 1.0, lands). At each chime it fires
// one cyan chest bolt at a player within 140 px, on a 4 s cooldown. The
// sleeping arena-approach sentinel is inert until the Warden wakes it (M5).
// Arrow-killable per the house rule; the stomp is the `gear` sound + a
// `gearBurst` (no stompable-reuse).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLevel8 } from '../src/levels/level8.js';
import { createPlayer, P_H } from '../src/player.js';
import { spawnEnemy, updateEnemies, createEnemies, E_STOMP_V } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { createCamera } from '../src/camera.js';
import { resetArrows, fireArrow, updateArrows } from '../src/arrows.js';
import { fireballs, resetFireballs } from '../src/projectiles.js';
import { startGame } from '../src/game.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });
const lvl = () => createLevel8(600);

// A sentinel on its band; the player far away (no focus turn, no bolt at setup).
const rig = (x = 2450, over = {}) => {
  const l = lvl();
  const e = spawnEnemy({ kind: 'sentinel', x, band: [x - 100, x + 100], ...over }, l);
  const p = createPlayer(l, { hasBow: true, hasFlight: true });
  p.x = x - 400; p.y = l.groundY - P_H;
  const cam = createCamera();
  return { l, e, p, cam };
};

beforeEach(() => { resetArrows(); resetFireballs(); });
afterEach(() => startGame(600, 0));

describe('spawn', () => {
  it('registers a 40×44, 2 hp, stompable sentinel', () => {
    const k = getKind('sentinel');
    expect([k.w, k.h, k.stompable, k.hp]).toEqual([40, 44, true, 2]);
    expect(k.stompSound).toBe('gear');
  });

  it('the L8 roster spawns 4 sentinels (one sleeping) with band-mapped bounds', () => {
    const s = createEnemies(lvl()).filter(e => e.kind === 'sentinel');
    expect(s.length).toBe(4);
    expect(s.filter(e => e.sleeping).length).toBe(1);
    // the roster's first sentinel: band [2380, 2560] maps to minX/maxX
    expect([s[0].minX, s[0].maxX]).toEqual([2380, 2560]);
  });
});

describe('patrol', () => {
  it('walks its band and turns at the edges', () => {
    const { l, e, p, cam } = rig(2450);
    const calls = [];
    let maxX = -Infinity, minX = Infinity;
    for (let i = 0; i < 600; i++) { // 10 s: enough to reach an edge and turn
      updateEnemies([e], p, l, cam, DT, fx(calls));
      maxX = Math.max(maxX, e.x); minX = Math.min(minX, e.x);
    }
    expect(minX).toBeGreaterThanOrEqual(2350 - 1); // band [2350, 2550], 1 px tolerance
    expect(maxX).toBeLessThanOrEqual(2550 + 1);
  });
});

describe('the shield (a pure read of the clock)', () => {
  it('is up for the 1.0 s after a chime and down after that', () => {
    const { l, e, p, cam } = rig();
    l.clock.stopped = false;
    l.clock.t = 0.5;
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.shieldUp).toBe(true);
    l.clock.t = 2.0;
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.shieldUp).toBe(false);
  });

  it('is frozen out when the clock is stopped', () => {
    const { l, e, p, cam } = rig();
    l.clock.stopped = true;
    l.clock.t = 0.5;
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.shieldUp).toBe(false);
  });
});

describe('the shield deflects front arrows', () => {
  // Isolate the arrow from level obstacles so it can only meet the sentinel.
  const bare = r => { r.l.boxes.length = 0; r.l.springs.length = 0; return r; };

  it('a front arrow into a raised shield is consumed: deflect, no damage', () => {
    const { l, e, p, cam } = bare(rig());
    e.shieldUp = true; e.dir = -1; // facing left, shield up
    p.x = e.x + e.w + 100; p.y = l.groundY - P_H; p.facing = -1; // arrow flies left (vx < 0), into the front
    cam.x = e.x - 100;
    const calls = [];
    fireArrow(p);
    for (let i = 0; i < 60; i++) updateArrows([e], l, cam, DT, fx(calls), 800);
    expect(e.hp).toBe(2); // no damage
    expect(calls).toContain('deflect');
  });

  it('a rear arrow during the shield lands (hp 2 -> 1)', () => {
    const { l, e, p, cam } = bare(rig());
    e.shieldUp = true; e.dir = -1; // facing left; the arrow comes from behind (vx > 0)
    p.x = e.x - 150; p.y = l.groundY - P_H; p.facing = 1;
    cam.x = e.x - 200;
    const calls = [];
    fireArrow(p);
    for (let i = 0; i < 60; i++) updateArrows([e], l, cam, DT, fx(calls), 800);
    expect(e.hp).toBe(1);
  });

  it('a front arrow at t ≥ 1.0 (shield down) lands (hp 2 -> 1)', () => {
    const { l, e, p, cam } = bare(rig());
    e.shieldUp = false; e.dir = -1;
    p.x = e.x + e.w + 100; p.y = l.groundY - P_H; p.facing = -1;
    cam.x = e.x - 100;
    const calls = [];
    fireArrow(p);
    for (let i = 0; i < 60; i++) updateArrows([e], l, cam, DT, fx(calls), 800);
    expect(e.hp).toBe(1);
  });
});

describe('the chest bolt', () => {
  it('fires one cyan fireball on the chime (0.3 s) at a player within 140 px', () => {
    const { l, e, p, cam } = rig(3100);
    p.x = e.x + 110; p.y = l.groundY - P_H; // within 140 px of the chest
    e.boltCd = 0; // cooldown ready
    l.clock.stopped = false;
    l.clock.t = 0.2;
    updateEnemies([e], p, l, cam, DT, fx([])); // lastT = 0.2, no crossing yet
    expect(fireballs.length).toBe(0);
    l.clock.t = 0.31; // the 0 -> 0.3 crossing
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(fireballs.length).toBe(1);
    expect(fireballs[0].cyan).toBe(true);
    expect(e.boltCd).toBeGreaterThan(3.5); // the 4 s cooldown started
  });

  it('the cooldown suppresses a second bolt inside 4 s', () => {
    const { l, e, p, cam } = rig(3100);
    p.x = e.x + 110; p.y = l.groundY - P_H;
    e.boltCd = 0;
    l.clock.t = 0.2;
    updateEnemies([e], p, l, cam, DT, fx([]));
    l.clock.t = 0.31;
    updateEnemies([e], p, l, cam, DT, fx([])); // first bolt fires
    expect(fireballs.length).toBe(1);
    // a second 0 -> 0.3 crossing within the cooldown window: suppressed
    l.clock.t = 0.2;
    updateEnemies([e], p, l, cam, DT, fx([]));
    l.clock.t = 0.31;
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(fireballs.length).toBe(1); // still one: the second was suppressed
  });

  it('fires nothing when no player is within 140 px', () => {
    const { l, e, p, cam } = rig(3100);
    p.x = e.x - 400; p.y = l.groundY - P_H; // far away
    e.boltCd = 0;
    l.clock.t = 0.2;
    updateEnemies([e], p, l, cam, DT, fx([]));
    l.clock.t = 0.31;
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(fireballs.length).toBe(0);
  });
});

describe('stomp and contact', () => {
  it('a falling player on the head kills it: gear sound + bounce', () => {
    const { l, e, p, cam } = rig();
    const calls = [];
    p.x = e.x + e.w / 2 - p.w / 2;
    p.y = e.y + 10 - p.h; // 10 px into the head, falling
    p.vy = 200;
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.dead).toBe(true);
    expect(p.vy).toBe(E_STOMP_V);
    expect(calls).toContain('stomp');
    expect(calls).toContain('gear');
  });

  it('a side overlap hurts the player once (invuln respected)', () => {
    const { l, e, p, cam } = rig();
    const calls = [];
    const hp0 = p.hp;
    p.x = e.x - p.w + 6; // 6 px side overlap
    p.y = e.y + 12; // mid-body
    p.vy = 0; // not falling: a contact hit, not a stomp
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(p.hp).toBe(hp0 - 1);
    expect(p.invuln).toBeGreaterThan(0);
    expect(calls).toContain('hurt');
    const hp1 = p.hp;
    updateEnemies([e], p, l, cam, DT, fx(calls)); // still overlapping, invuln active
    expect(p.hp).toBe(hp1); // no second hit while invulnerable
  });
});

describe('the sleeping sentinel', () => {
  it('is inert: no patrol, no shield, no bolt until woken', () => {
    const { l, e, p, cam } = rig(5050, { sleeping: true });
    const x0 = e.x;
    const calls = [];
    l.clock.t = 0.2;
    updateEnemies([e], p, l, cam, DT, fx(calls));
    l.clock.t = 0.31; // a chime crossing: a waking sentinel would bolt
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.x).toBe(x0); // did not patrol
    expect(e.shieldUp).toBe(false); // shield never raised
    expect(fireballs.length).toBe(0); // no bolt
  });
});
