// Level 6 spiders: the registry entry (20×22, 1 hp, stompable — the
// design's 14 px height made a landed spider un-arrowable, see the
// LEVEL6-DESIGN.md footnote), a jump-stomp kills the hanging spider, an
// arrow kills the landed one, the pounce (in range + cooldown done →
// the arc goes toward the player with an apex above the launch, lands
// on the ground, recovers, climbs back to the anchor ±2 px), no pounce
// while the cooldown runs, and contact hurts once.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startGame, game } from '../src/game.js';
import { spawnEnemy, updateEnemies, E_STOMP_V } from '../src/enemies.js';
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

describe('registry + roster', () => {
  it('spider: 20×22, 1 hp, stompable', () => {
    const s = getKind('spider');
    expect([s.w, s.h, s.hp, s.stompable]).toEqual([20, 22, 1, true]);
  });

  it('six anchors at y 410: 800, 1850, 2250, 2900, 3750, 4400', () => {
    const spiders = lvl().roster.filter(r => r.kind === 'spider');
    expect(spiders.map(r => r.x)).toEqual([800, 1850, 2250, 2900, 3750, 4400]);
    for (const r of spiders) expect(r.y).toBe(410);
    const e = spawnEnemy(spiders[0], lvl());
    expect([e.anchorX, e.anchorY]).toEqual([800, 410]);
  });
});

describe('damage', () => {
  it('a jump-stomp kills the hanging spider (top ≈ 458, jump-reachable)', () => {
    const e = spawnEnemy({ kind: 'spider', x: 800, y: 410 }, lvl());
    updateEnemies([e], p(), lvl(), cam, DT, fx); // one hang frame to settle the thread
    expect(e.state).toBe('hang');
    place(800, 424); // falling, bottom 460: within 16 px of the spider's top
    p().vy = 120;
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    expect(e.dead).toBe(true);
    expect(p().vy).toBe(E_STOMP_V);
  });

  it('an arrow at chest height kills the landed spider', () => {
    const e = spawnEnemy({ kind: 'spider', x: 2900, y: 410 }, lvl());
    e.state = 'recover'; // resting on the ground after a pounce
    e.x = 2900;
    e.y = groundY() - e.h;
    e.vx = 0;
    e.vy = 0;
    place(2800, groundY() - 36);
    p().facing = 1;
    fireArrow(p());
    for (let i = 0; i < 40 && !e.dead; i++) {
      updateArrows([e], lvl(), cam, DT, fx, 8000);
      updateEnemies([e], p(), lvl(), cam, DT, fx);
    }
    expect(e.dead).toBe(true);
  });

  it('contact with the hanging spider hurts once', () => {
    const e = spawnEnemy({ kind: 'spider', x: 3750, y: 410 }, lvl());
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    place(3750, 440); // overlapping the hanging body, side contact
    const hp0 = p().hp;
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    expect(p().hp).toBe(hp0 - 1);
    for (let i = 0; i < 30; i++) updateEnemies([e], p(), lvl(), cam, DT, fx);
    expect(p().hp).toBe(hp0 - 1); // the invuln window absorbs the rest
  });
});

describe('the pounce', () => {
  it('in range with the cooldown done: the arc aims at the player, lands, recovers, climbs back ±2 px', () => {
    const e = spawnEnemy({ kind: 'spider', x: 1850, y: 410 }, lvl());
    e.cd = 0;
    // right of the anchor: the arc lands on open ground (the box at 1650
    // would catch a left-side pounce — boxes are solid)
    place(1880, groundY() - 36);
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    expect(e.state).toBe('pounce');
    expect(e.vx).toBeGreaterThan(0); // toward the player
    const launchY = e.y;
    let minY = launchY, landed = false;
    for (let i = 0; i < 400; i++) {
      updateEnemies([e], p(), lvl(), cam, DT, fx);
      if (e.state === 'pounce') minY = Math.min(minY, e.y);
      if (e.state === 'recover') { landed = true; break; }
    }
    expect(landed).toBe(true);
    expect(minY).toBeLessThan(launchY); // an apex above the launch point
    expect(e.y).toBe(groundY() - e.h); // feet on the ground
    expect(e.onGround).toBe(true);
    // recover 0.5 s, then climb back to the anchor
    for (let i = 0; i < 300 && e.state !== 'hang'; i++) {
      updateEnemies([e], p(), lvl(), cam, DT, fx);
    }
    expect(e.state).toBe('hang');
    expect(Math.abs(e.x - 1850)).toBeLessThanOrEqual(2);
    expect(Math.abs(e.y - 456)).toBeLessThanOrEqual(4); // 410 + 46, plus the bob
  });

  it('does not pounce while the cooldown runs', () => {
    const e = spawnEnemy({ kind: 'spider', x: 1850, y: 410 }, lvl());
    e.cd = 2;
    place(1660, groundY() - 36); // in range
    for (let i = 0; i < 30; i++) updateEnemies([e], p(), lvl(), cam, DT, fx); // 0.5 s
    expect(e.state).toBe('hang');
  });

  it('does not pounce at a player over open water (no solid below)', () => {
    const e = spawnEnemy({ kind: 'spider', x: 2250, y: 410 }, lvl()); // over the 1900–2300 pool
    e.cd = 0;
    // the lily pads span 1950–2020 and 2210–2280: x 2090 is open water
    place(2090, groundY() - 36);
    updateEnemies([e], p(), lvl(), cam, DT, fx);
    expect(e.state).toBe('hang');
  });
});
