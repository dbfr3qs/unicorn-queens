// Level 6 snakes: the registry entries (sizes/hp/stompable), a stomp
// kills (bounce + puff), an arrow kills from the ground (the 24 px arch
// is what makes the snake arrow-killable), the strike cycle (telegraph
// plays 'slither', the lunge caps at the strike distance, recover,
// patrol, cooldown re-armed), no strike while the cooldown runs, contact
// hurts once (the invuln window absorbs the rest), and the elder adder:
// sleeping is immovable and harmless, it wakes on sac.present (0.6 s
// stretch + 'slither'), takes three hits, and lunges 180 px on a 6 s
// cooldown.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startGame, game } from '../src/game.js';
import { spawnEnemy, updateEnemies, damageEnemy, E_STOMP_V } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { fireArrow, updateArrows, resetArrows } from '../src/arrows.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };
const cam = { x: 0 };

beforeEach(() => {
  calls.length = 0;
  resetArrows();
  startGame(600, 5);
});
afterEach(() => startGame(600, 5));

const lvl = () => game.level;
const p = () => game.player;
const groundY = () => lvl().groundY;
const place = (x, y) => { p().x = x; p().y = y; p().vy = 0; };
const frames = (e, n) => { for (let i = 0; i < n; i++) updateEnemies([e], p(), lvl(), cam, DT, fx); };

describe('registry', () => {
  it('both kinds are registered with the design tuning', () => {
    const s = getKind('snake'), a = getKind('adder');
    expect([s.w, s.h, s.hp, s.stompable]).toEqual([26, 24, 1, true]);
    expect([a.w, a.h, a.hp, a.stompable]).toEqual([44, 26, 3, true]);
  });

  it('the level roster has 5 snakes + the sleeping elder adder', () => {
    const roster = lvl().roster;
    expect(roster.filter(r => r.kind === 'snake')).toHaveLength(5);
    const adder = roster.find(r => r.kind === 'adder');
    expect(adder.x).toBe(4150);
    expect([adder.minX, adder.maxX]).toEqual([3550, 4450]);
    expect(adder.sleeping).toBe(true);
  });
});

describe('damage', () => {
  it('a stomp kills: the snake dies, the player bounces, the puff plays', () => {
    const e = spawnEnemy({ kind: 'snake', x: 1000, minX: 900, maxX: 1100 }, lvl());
    expect(e.y).toBe(groundY() - 24);
    place(1000, e.y - 30); // falling onto the head
    p().vy = 120;
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    expect(e.dead).toBe(true);
    expect(p().vy).toBe(E_STOMP_V);
    expect(calls).toContain('stomp');
  });

  it('an arrow kills from the ground: chest height clears the arch', () => {
    const e = spawnEnemy({ kind: 'snake', x: 1000, minX: 900, maxX: 1100 }, lvl());
    place(880, groundY() - 36); // standing, left of the snake
    p().facing = 1;
    fireArrow(p());
    for (let i = 0; i < 40 && !e.dead; i++) {
      updateArrows([e], lvl(), cam, DT, fx, 8000);
      frames(e, 1);
    }
    expect(e.dead).toBe(true);
  });

  it('contact hurts once: the invuln window absorbs the overlap', () => {
    const e = spawnEnemy({ kind: 'snake', x: 1000, minX: 900, maxX: 1100 }, lvl());
    e.cd = 99; // no strike during the test
    place(1000, groundY() - 30); // side contact: bottom well below the arch
    const hp0 = p().hp;
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    expect(p().hp).toBe(hp0 - 1);
    expect(p().invuln).toBeGreaterThan(0);
    frames(e, 30); // 0.5 s: well inside the invuln window
    expect(p().hp).toBe(hp0 - 1);
  });
});

describe('the strike cycle', () => {
  it('telegraph (slither) -> lunge capped at 120 px -> recover -> patrol with a 4 s cooldown', () => {
    // x 2500 (band 2400–3100): a full 120 px lunge stays on solid ground
    const e = spawnEnemy({ kind: 'snake', x: 2500, minX: 2400, maxX: 3100, dir: -1 }, lvl());
    e.state = 'patrol';
    e.cd = 0;
    place(2590, groundY() - 36); // within 200 px, on the ground
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    expect(e.state).toBe('telegraph');
    expect(calls).toContain('slither');
    let startX = null;
    for (let i = 0; i < 300; i++) {
      if (e.state === 'strike' && startX === null) startX = e.x;
      updateEnemies([e], p(), lvl(), cam, DT, fx);
      if (e.state === 'recover') break;
    }
    expect(startX).not.toBeNull();
    expect(e.dir).toBe(1); // lunged toward the player
    expect(e.x - startX).toBeGreaterThan(100);
    expect(e.x - startX).toBeLessThan(140);
    frames(e, 60); // through the recover (0.5 s)
    expect(e.state).toBe('patrol');
    expect(e.cd).toBeGreaterThan(3.5);
  });

  it('does not strike while the cooldown runs', () => {
    const e = spawnEnemy({ kind: 'snake', x: 2500, minX: 2400, maxX: 3100 }, lvl());
    e.state = 'patrol';
    e.cd = 2;
    place(2590, groundY() - 36); // in range
    frames(e, 30); // 0.5 s
    expect(e.state).toBe('patrol');
    expect(calls).not.toContain('slither');
  });

  it('a lunge stops at the patrol band: the snake never leaves the ground', () => {
    // band 500–1050 ends 50 px before the water at 1100: a 120 px lunge
    // from x 940 would reach 1060 — it must stop at the band edge
    const e = spawnEnemy({ kind: 'snake', x: 940, minX: 500, maxX: 1050, dir: -1 }, lvl());
    e.state = 'patrol';
    e.cd = 0;
    place(1120, groundY() - 36); // across the water edge, still in range
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    expect(e.state).toBe('telegraph');
    for (let i = 0; i < 300; i++) {
      updateEnemies([e], p(), lvl(), cam, DT, fx);
      if (e.state === 'patrol' || e.state === 'recover') break;
    }
    expect(e.x + e.w).toBeLessThanOrEqual(1050); // clamped to the band
    expect(e.y).toBe(groundY() - 24); // never left the ground
    expect(e.dead).toBe(false);
  });
});

describe('the elder adder', () => {
  it('sleeping: coiled, immovable, and harmless to an overlapping player', () => {
    const e = spawnEnemy({ kind: 'adder', x: 4150, minX: 3550, maxX: 4450, sleeping: true }, lvl());
    place(4150, groundY() - 30); // overlapping the coil
    const hp0 = p().hp;
    frames(e, 60); // 1 s
    expect(e.x).toBe(4150); // no movement
    expect(e.sleeping).toBe(true);
    expect(p().hp).toBe(hp0); // the hitPlayer guard: no contact damage
  });

  it('wakes when the egg sac appears: a 0.6 s stretch, then patrol', () => {
    const e = spawnEnemy({ kind: 'adder', x: 4150, minX: 3550, maxX: 4450, sleeping: true }, lvl());
    place(4350, groundY() - 36); // clear of the coil
    lvl().sac.present = true; // what the w3 beat sets
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    expect(e.sleeping).toBe(false);
    expect(e.waking).toBeGreaterThan(0.5);
    expect(calls).toContain('slither');
    frames(e, 40); // 0.66 s
    expect(e.state).toBe('patrol');
    expect(e.waking).toBeLessThanOrEqual(0);
  });

  it('takes three hits to kill', () => {
    const e = spawnEnemy({ kind: 'adder', x: 4150, minX: 3550, maxX: 4450 }, lvl());
    damageEnemy(e, fx, cam);
    damageEnemy(e, fx, cam);
    expect(e.dead).toBe(false);
    expect(e.hp).toBe(1);
    damageEnemy(e, fx, cam);
    expect(e.dead).toBe(true);
  });

  it('lunges 180 px toward the player and re-arms a 6 s cooldown', () => {
    const e = spawnEnemy({ kind: 'adder', x: 4000, minX: 3550, maxX: 4450, dir: -1 }, lvl());
    e.state = 'patrol';
    e.cd = 0;
    place(4200, groundY() - 36); // to the right, in range
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    expect(e.state).toBe('telegraph');
    let startX = null;
    for (let i = 0; i < 300; i++) {
      if (e.state === 'strike' && startX === null) startX = e.x;
      updateEnemies([e], p(), lvl(), cam, DT, fx);
      if (e.state === 'recover') break;
    }
    expect(startX).not.toBeNull();
    expect(e.x - startX).toBeGreaterThan(160);
    expect(e.x - startX).toBeLessThan(200);
    frames(e, 60); // through the recover (0.6 s)
    expect(e.state).toBe('patrol');
    expect(e.cd).toBeGreaterThan(5.5);
  });
});
