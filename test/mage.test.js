import { describe, it, expect } from 'vitest';
import { createLevel } from '../src/levels/level.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies, damageEnemy, E_STOMP_V } from '../src/enemies.js';
import { resetFireballs, fireballs, FIREBALL_SPEED } from '../src/projectiles.js';
import { resetArrows, updateArrows, arrows, ARROW_SPEED } from '../src/arrows.js';
import { reseed } from './helpers/seeded-rng.js';
import { createCamera } from '../src/camera.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const m = x => spawnEnemy({ kind: 'mage', x }, lvl());

describe('spawn', () => {
  it('spawns a 42x54 boss with 5 hp on the ground line', () => {
    const e = m(2200);
    expect(e.kind).toBe('mage');
    expect(e.w).toBe(42);
    expect(e.h).toBe(54);
    expect(e.hp).toBe(5);
    expect(e.y).toBe(560 - 54);
  });
});

describe('attack cycle', () => {
  it('fires a fireball at the player after idle + windup', () => {
    resetFireballs();
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 2000; // 180px away: in aggro range
    const cam = createCamera();
    const calls = [];
    for (let i = 0; i < 170; i++) updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(fireballs.length).toBe(1);
    expect(calls).toContain('fireball');
    const f = fireballs[0];
    expect(f.vx).toBeLessThan(0); // flies left, toward the player
    expect(f.vy).toBeGreaterThan(10); // grounded player center is below the orb: aims down
    expect(Math.hypot(f.vx, f.vy)).toBeCloseTo(FIREBALL_SPEED, 0); // full speed, any angle
  });

  it('aims level when the player is centered on the orb height', () => {
    resetFireballs();
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 2000;
    p.y = e.y + e.h / 2 - 19.5 - p.h / 2; // player center exactly on the orb line
    const cam = createCamera();
    for (let i = 0; i < 170; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(Math.abs(fireballs[0].vy)).toBeLessThan(0.5); // level shot
  });

  it('aims up at an elevated player', () => {
    resetFireballs();
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 2000;
    p.y = 200; // well above the orb
    const cam = createCamera();
    for (let i = 0; i < 170; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(fireballs[0].vy).toBeLessThan(-50); // flies up-left
  });

  it('keeps at most one fireball in the air', () => {
    resetFireballs();
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 2000;
    const cam = createCamera();
    e.state = 'idle'; e.t = 0; // ready to fire immediately
    fireballs.push({ x: 0, y: 0, w: 14, h: 14, vx: -10, vy: 0, ttl: 1, dead: false });
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(fireballs.length).toBe(1); // refused to fire a second
    expect(e.state).toBe('idle');
    fireballs.length = 0; // clear the air
    for (let i = 0; i < 80; i++) updateEnemies([e], p, l, cam, DT, fx([])); // idle remainder + windup
    expect(fireballs.length).toBe(1); // fires once the air is clear
  });
});

describe('levitation', () => {
  it('floats to a floatY target with eased motion, then eases back to the ground', () => {
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 1200; // out of aggro range: no firing during the test
    const cam = createCamera();
    const home = e.y;
    e.floatY = e.y - 100;
    for (let i = 0; i < 60; i++) updateEnemies([e], p, l, cam, DT, fx([])); // 150 px/s: 100px in ~40 frames
    expect(e.y).toBeCloseTo(home - 100, 5);
    expect(e.levitating).toBe(true);
    e.floatY = e.homeY;
    for (let i = 0; i < 60; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.y).toBeCloseTo(home, 5);
    expect(e.levitating).toBe(false);
  });

  it('clamps to the band top and to the arena x range', () => {
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 1200;
    const cam = createCamera();
    e.floatY = 0; // far above the band
    for (let i = 0; i < 200; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.y).toBeCloseTo(Math.max(150, l.groundY - 400), 5); // band top
    e.minX = 2100; e.maxX = 2300;
    e.x = 2000; // outside the arena on the left
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.x).toBe(2100);
    e.x = 2400; // outside on the right
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.x).toBe(2300);
  });

  it('stays frozen mid-air while staggering', () => {
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 1200;
    const cam = createCamera();
    e.floatY = e.y - 100;
    for (let i = 0; i < 60; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    const midY = e.y;
    e.state = 'stagger'; e.t = 5; // long stagger
    updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.y).toBe(midY); // no easing while staggered
    expect(e.levitating).toBe(true); // flag retained
  });
});

describe('arrow dodge', () => {
  const setup = () => {
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 1200; // out of aggro range: the boss never fires during these tests
    const cam = createCamera();
    cam.x = 1800; // keep scripted arrows inside the viewport (arrows die at the edge)
    return { e, l, p, cam };
  };

  it('dodges an approaching arrow, then settles back on the ground', () => {
    resetArrows();
    const { e, l, p, cam } = setup();
    const home = e.y;
    const calls = [];
    arrows.push({ x: 1900, y: 510, vx: ARROW_SPEED, dead: false }); // body height, 286px out
    let minY = e.y;
    for (let i = 0; i < 200; i++) {
      updateEnemies([e], p, l, cam, DT, fx(calls));
      updateArrows([e], l, cam, DT, fx(calls)); // real arrow flight
      minY = Math.min(minY, e.y);
    }
    expect(minY).toBeLessThan(home - 40); // floated clear of the arrow's band
    expect(e.hp).toBe(5); // the arrow passed without a hit
    expect(e.y).toBeCloseTo(home, 5); // settled back on the ground
    expect(calls).toContain('hop'); // whoosh on the dodge
  });

  it('does not dodge arrows moving away or beyond the look range', () => {
    resetArrows();
    const { e, l, p, cam } = setup();
    const home = e.y;
    const calls = [];
    arrows.push({ x: 1800, y: 510, vx: -ARROW_SPEED, dead: false }); // left of the mage, moving left: away
    updateEnemies([e], p, l, cam, DT, fx(calls));
    arrows.push({ x: 1772, y: 510, vx: ARROW_SPEED, dead: false }); // approaching, but 414px out > dodgeLook
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.y).toBe(home); // never moved
    expect(e.floatY).toBeUndefined();
    expect(calls).not.toContain('hop');
  });

  it('does not dodge while staggering', () => {
    resetArrows();
    const { e, l, p, cam } = setup();
    const home = e.y;
    e.state = 'stagger'; e.t = 0.05; // one frame of stagger
    arrows.push({ x: 2000, y: 510, vx: ARROW_SPEED, dead: false }); // inside the threat window
    const calls = [];
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.y).toBe(home); // frozen mid-threat
    expect(e.floatY).toBeUndefined();
    expect(calls).not.toContain('hop');
  });

  it('dodges down at the band top (no room above)', () => {
    resetArrows();
    const { e, l, p, cam } = setup();
    e.floatY = 0; // float to the band top first
    for (let i = 0; i < 200; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    const topY = e.y;
    expect(topY).toBeCloseTo(Math.max(150, l.groundY - 400), 5); // at the band top
    arrows.push({ x: 2000, y: topY, vx: ARROW_SPEED, dead: false }); // band across the mage's top
    const calls = [];
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.floatY).toBeCloseTo(topY + 64, 5); // escapes downward
    expect(calls).toContain('hop');
    for (let i = 0; i < 20; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.y).toBeGreaterThan(topY); // descending
  });

  it('ignores new threats inside the cooldown, re-dodges after it elapses', () => {
    resetArrows();
    const { e, l, p, cam } = setup();
    const home = e.y;
    const calls = [];
    arrows.push({ x: 2000, y: 510, vx: ARROW_SPEED, dead: false }); // inside the threat window
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.floatY).toBeCloseTo(home - 64, 5); // first dodge: up
    expect(calls.filter(n => n === 'hop').length).toBe(1);
    arrows.push({ x: 2050, y: 510, vx: ARROW_SPEED, dead: false }); // second threat, cooldown active
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.floatY).toBeCloseTo(home - 64, 5); // unchanged: no jitter
    expect(calls.filter(n => n === 'hop').length).toBe(1);
    for (let i = 0; i < 45; i++) updateEnemies([e], p, l, cam, DT, fx([])); // > 0.7s cooldown
    expect(e.y).toBeCloseTo(home - 64, 5); // settled at the dodge height
    const y0 = e.y;
    arrows.push({ x: 2000, y: y0 + 10, vx: ARROW_SPEED, dead: false }); // arrow at the dodge height
    const calls2 = [];
    updateEnemies([e], p, l, cam, DT, fx(calls2));
    expect(calls2).toContain('hop'); // re-dodges once the cooldown is gone
    expect(e.floatY).toBeGreaterThan(y0); // alternates to the other side (down)
  });

  it('holds altitude against an arrow stream, descends when the stream stops', () => {
    resetArrows();
    const { e, l, p, cam } = setup();
    const home = e.y;
    let lastShot = -99, heldFrames = 0;
    for (let i = 0; i < 60 * 4; i++) { // 4s of firing at the player's 0.22s cadence
      updateEnemies([e], p, l, cam, DT, fx([]));
      if (i - lastShot >= 13) { // 13 frames ≈ 0.22s
        arrows.push({ x: 1900, y: 510, vx: ARROW_SPEED, dead: false });
        lastShot = i;
      }
      updateArrows([e], l, cam, DT, fx([]));
      if (e.y < home - 40) heldFrames++;
    }
    expect(e.hp).toBe(5); // the stream never landed a hit
    expect(heldFrames).toBeGreaterThan(60); // spent real time off the ground
    for (let i = 0; i < 120; i++) { // stream stopped: settle back down
      updateEnemies([e], p, l, cam, DT, fx([]));
      updateArrows([e], l, cam, DT, fx([]));
    }
    expect(e.y).toBeCloseTo(home, 5);
  });
});

describe('hover and aim lead', () => {
  // Duel helper: the player stands in aggro range, unupdated (no arrows,
  // no movement), and the fireball is cleared every frame - no player
  // damage, and the air is always "clear" so the mage keeps shooting.
  const duel = (e, frames) => {
    const l = lvl();
    const p = createPlayer(l);
    p.x = 2000; // 200px from the mage: in aggro range
    const cam = createCamera();
    const home = e.y;
    let starts = 0, was = false, minY = e.y;
    for (let i = 0; i < frames; i++) {
      updateEnemies([e], p, l, cam, DT, fx([]));
      resetFireballs();
      const is = e.hover > 0;
      if (is && !was) starts++;
      was = is;
      minY = Math.min(minY, e.y);
    }
    return { starts, minY, home };
  };

  it('proactively hovers off the ground after a shot (seeded)', () => {
    reseed();
    resetFireballs();
    const { starts, minY, home } = duel(m(2200), 60 * 40);
    expect(starts).toBeGreaterThanOrEqual(1);
    expect(minY).toBeLessThan(home - 40); // reached a real hover height
  });

  it('hovers more often at low hp (seeded)', () => {
    reseed();
    resetFireballs();
    const full = duel(m(2200), 60 * 45);
    reseed();
    resetFireballs();
    const lowE = m(2200); lowE.hp = 1;
    const low = duel(lowE, 60 * 45);
    expect(low.starts).toBeGreaterThan(full.starts);
  });

  it('leads the shot at a moving player (aims at the predicted point)', () => {
    resetFireballs();
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 1900;
    p.vx = -260; // running left, away from the mage
    const cam = createCamera();
    e.state = 'windup'; e.t = 0; // fire this frame
    updateEnemies([e], p, l, cam, DT, fx([]));
    const f = fireballs[0];
    // expected aim point: the player's position after the flight time
    const ox = e.x + e.w / 2 + e.dir * 15.5, oy = e.y + e.h / 2 - 19.5;
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const tFlight = Math.hypot(cx - ox, cy - oy) / FIREBALL_SPEED;
    const tx = cx + p.vx * tFlight;
    const d = Math.hypot(tx - ox, cy - oy);
    expect(f.vx).toBeCloseTo((tx - ox) / d * FIREBALL_SPEED, 5);
    expect(f.vy).toBeCloseTo((cy - oy) / d * FIREBALL_SPEED, 5);
    expect(tx).toBeLessThan(cx); // the aim point is ahead of the fleeing player
  });

  it('clamps the lead to the level bounds', () => {
    resetFireballs();
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 10;
    p.vx = -260; // the naive lead point is far off the left edge
    const cam = createCamera();
    e.state = 'windup'; e.t = 0;
    updateEnemies([e], p, l, cam, DT, fx([]));
    const f = fireballs[0];
    const ox = e.x + e.w / 2 + e.dir * 15.5, oy = e.y + e.h / 2 - 19.5;
    const cy = p.y + p.h / 2;
    const d = Math.hypot(0 - ox, cy - oy); // tx clamps to 0
    expect(f.vx).toBeCloseTo((0 - ox) / d * FIREBALL_SPEED, 5);
    expect(f.vx).toBeLessThan(0);
  });
});

describe('taking damage', () => {
  it('loses one hp per arrow hit, flashes and staggers', () => {
    const e = m(2200);
    const calls = [];
    damageEnemy(e, fx(calls));
    expect(e.hp).toBe(4);
    expect(e.dead).toBe(false);
    expect(e.flash).toBeGreaterThan(0);
    expect(e.state).toBe('stagger');
    expect(calls).toContain('bossHit');
  });

  it('dies on the fifth hit with the boss death fanfare', () => {
    const e = m(2200);
    const calls = [];
    for (let i = 0; i < 5; i++) damageEnemy(e, fx(calls));
    expect(e.dead).toBe(true);
    expect(calls.filter(n => n === 'boss').length).toBe(1);
  });

  it('bounces stomps without damage (arrows only)', () => {
    const e = m(2200);
    const l = lvl();
    const p = createPlayer(l);
    p.x = 2210;
    p.y = (l.groundY - 54) - 36 + 8; // bottom 8px below the mage's top
    p.vy = 200;
    const calls = [];
    updateEnemies([e], p, l, createCamera(), DT, fx(calls));
    expect(e.dead).toBe(false);
    expect(p.hp).toBe(3);
    expect(p.vy).toBe(E_STOMP_V);
    expect(calls).not.toContain('hurt');
  });
});
