// The wraith: hovers at its anchor (±6 px bob), drifts at the player
// 45 px/s within 260 px, descends to the ground-arrow band
// (y = groundY − 44) within 120 px and holds, disengages past 320 px
// and eases home. Unstompable (the codified ghost bounce). Arrow- and
// sunbeam-killable (the house rule). The wind-phase alpha; the bound
// arena wraiths are always solid; the M7 release fades a freed wraith.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLevel7 } from '../src/levels/level7.js';
import { createPlayer, P_H } from '../src/player.js';
import { spawnEnemy, updateEnemies, createEnemies, E_STOMP_V } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { wraithAlpha } from '../src/enemies/wraith.js';
import { createCamera } from '../src/camera.js';
import { resetArrows, fireArrow, updateArrows } from '../src/arrows.js';
import { startGame, game, fireSunbeam } from '../src/game.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });
const lvl = () => createLevel7(600);

// A wraith at its roster anchor; the player far away (no aggro at spawn).
const rig = (x = 1100, y = 420, over = {}) => {
  const l = lvl();
  const e = spawnEnemy({ kind: 'wraith', x, y, ...over }, l);
  const p = createPlayer(l, { hasBow: true, hasFlight: true });
  p.x = x - 500; p.y = l.groundY - P_H;
  const cam = createCamera();
  updateEnemies([e], p, l, cam, DT, fx([])); // settle
  return { l, e, p, cam };
};

beforeEach(() => resetArrows());
afterEach(() => startGame(600, 0));

describe('spawn', () => {
  it('registers a 26×30, 1 hp, unstompable wraith', () => {
    const k = getKind('wraith');
    expect([k.w, k.h, k.stompable, k.hp]).toEqual([26, 30, false, 1]);
    const { e } = rig();
    expect(e.bound).toBe(false);
  });

  it('the L7 roster spawns its five wraiths, two of them bound arena wraiths', () => {
    const enemies = createEnemies(lvl());
    const wraiths = enemies.filter(e => e.kind === 'wraith');
    expect(wraiths.length).toBe(5);
    const bound = wraiths.filter(e => e.bound);
    expect(bound.length).toBe(2);
    expect(bound.map(b => b.x).sort((a, b) => a - b)).toEqual([5550, 5950]);
  });
});

describe('hovering', () => {
  it('bobs ±6 px at its anchor while the player is far', () => {
    const { e, l, p, cam } = rig();
    let minY = Infinity, maxY = -Infinity, maxDrift = 0;
    for (let i = 0; i < 120; i++) { // one full bob period
      updateEnemies([e], p, l, cam, DT, fx([]));
      minY = Math.min(minY, e.y); maxY = Math.max(maxY, e.y);
      maxDrift = Math.max(maxDrift, Math.abs(e.x - 1100));
    }
    expect(minY).toBeGreaterThanOrEqual(420 - 10);
    expect(maxY).toBeLessThanOrEqual(420 + 10);
    expect(maxDrift).toBeLessThan(2); // stays at its anchor x
  });
});

describe('the drift', () => {
  it('a player 200 px away: it moves toward the player at 45 px/s', () => {
    const { e, l, p, cam } = rig();
    p.x = 1113 - 200 - 14; p.y = l.groundY - P_H; // player centre 200 px left
    const x0 = e.x;
    for (let i = 0; i < 10; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.x - x0).toBeCloseTo(-7.5, 1); // 45 px/s × 10 frames, toward the player
  });

  it('a player 100 px away: it descends to groundY − 44 and holds', () => {
    const { e, l, p, cam } = rig();
    p.x = 1113 - 100 - 14; p.y = 420; // level with the anchor: no body overlap
    for (let i = 0; i < 240; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.y).toBe(l.groundY - 44); // the ground-arrow band, reached and held
    for (let i = 0; i < 30; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.y).toBe(l.groundY - 44);
  });

  it('a player 400 px away: after drifting it eases back to its anchor', () => {
    const { e, l, p, cam } = rig();
    p.x = 1113 - 200 - 14; p.y = l.groundY - P_H;
    for (let i = 0; i < 60; i++) updateEnemies([e], p, l, cam, DT, fx([])); // drift left
    expect(e.x).toBeLessThan(1100);
    p.x = 1500; p.y = l.groundY - P_H; // the player leaves: > 320 px
    let back = false;
    for (let i = 0; i < 600; i++) {
      updateEnemies([e], p, l, cam, DT, fx([]));
      if (Math.abs(e.x - 1100) < 2 && Math.abs(e.y - 420) < 10) { back = true; break; }
    }
    expect(back).toBe(true);
  });
});

describe('kills', () => {
  it('is unstompable: the ghost bounce rebounds the player, no damage, no stomp sfx', () => {
    const { e, l, p, cam } = rig(1100, 516); // groundY (560) − 44: the chest band
    p.x = e.x + 10; p.y = e.y - 36 + 8; p.vy = 200; // falling onto it
    const calls = [];
    const hp0 = p.hp;
    updateEnemies([e], p, l, cam, DT, fx(calls));
    expect(e.dead).toBe(false);
    expect(p.vy).toBe(E_STOMP_V);
    expect(p.hp).toBe(hp0);
    expect(calls).not.toContain('stomp');
  });

  it('a ground arrow pops it in the chest band (arrow-only, house rule)', () => {
    const { e, l, p, cam } = rig(1100, 516); // groundY (560) − 44: the chest band
    cam.x = 950; // arrows cull at the viewport edge — keep the wraith on screen
    p.x = e.x - 150; p.y = l.groundY - P_H; p.facing = 1;
    const calls = [];
    fireArrow(p);
    for (let i = 0; i < 60 && !e.dead; i++) updateArrows([e], l, cam, DT, fx(calls), 800);
    expect(e.dead).toBe(true);
  });

  it('a sunbeam pops it (one kill, nailing the house rule)', () => {
    startGame(600, 6);
    const g = game;
    const w = g.enemies.find(e => e.kind === 'wraith' && e.x === 1100);
    g.camera.x = 1000; // viewport 1000..1800: the 1100 wraith is on screen
    fireSunbeam(g.player, g.level, fx([]), 800);
    expect(w.dead).toBe(true);
  });
});

describe('the wind alpha', () => {
  it('unbound: 0.45 calm / 0.7 telegraph / 1.0 gust; bound: always 1.0', () => {
    const free = { bound: false };
    expect(wraithAlpha(free, 'calm')).toBeCloseTo(0.45);
    expect(wraithAlpha(free, 'telegraph')).toBeCloseTo(0.7);
    expect(wraithAlpha(free, 'gust')).toBe(1);
    const bound = { bound: true };
    expect(wraithAlpha(bound, 'calm')).toBe(1);
    expect(wraithAlpha(bound, 'telegraph')).toBe(1);
    expect(wraithAlpha(bound, 'gust')).toBe(1);
  });

  it('a freed wraith fades out over its release second', () => {
    expect(wraithAlpha({ bound: false, freed: true, freeT: 0 }, 'calm')).toBe(1);
    expect(wraithAlpha({ bound: false, freed: true, freeT: 0.5 }, 'calm')).toBeCloseTo(0.5);
    expect(wraithAlpha({ bound: false, freed: true, freeT: 1 }, 'calm')).toBe(0);
  });

  it('the release: a freed wraith drifts up and dies after 1 s', () => {
    const { e, l, p, cam } = rig();
    e.freed = true; e.freeT = 0;
    const y0 = e.y;
    for (let i = 0; i < 30; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.y).toBeLessThan(y0); // rising
    for (let i = 0; i < 40; i++) updateEnemies([e], p, l, cam, DT, fx([]));
    expect(e.dead).toBe(true); // freeT ran past 1 s
  });
});
