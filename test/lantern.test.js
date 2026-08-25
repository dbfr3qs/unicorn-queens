// Lantern: timed ghost repel.
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel } from '../src/levels/level.js';
import { createLevel2 } from '../src/levels/level2.js';
import { createPlayer, P_H, LANTERN_TIME, updatePlayer } from '../src/player.js';
import { loot, resetLoot, updateLoot } from '../src/loot.js';
import { spawnEnemy, updateEnemies } from '../src/enemies.js';
import { createCamera } from '../src/camera.js';
import { game, startGame } from '../src/game.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });
const itemAt = (kind, x, y, onGround = true) => ({ x, y, w: 16, h: 16, vx: 0, vy: 0, onGround, kind, taken: false, t: 0 });
const dist = (a, b) => Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), a.y + a.h / 2 - (b.y + b.h / 2));
const cam = () => createCamera();

afterEach(() => {
  resetLoot();
  startGame(600, 0);
});

describe('pickup', () => {
  it('sets the lantern to 8 s and plays the sfx', () => {
    const l = createLevel(600);
    const p = createPlayer(l);
    p.x = 500; p.y = l.groundY - P_H;
    const calls = [];
    loot.push(itemAt('lantern', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx(calls));
    expect(p.lantern).toBe(LANTERN_TIME);
    expect(calls).toContain('lantern');
  });

  it('decays to 0 and resets on a fresh start', () => {
    startGame(600, 1);
    game.player.lantern = LANTERN_TIME;
    for (let i = 0; i < Math.ceil(LANTERN_TIME / DT) + 2; i++) updatePlayer(game.player, {}, game.level, cam(), DT, fx([]));
    expect(game.player.lantern).toBe(0);
    game.player.lantern = 8;
    startGame(600, 1);
    expect(game.player.lantern).toBe(0);
  });
});

describe('ghost AI', () => {
  // a ghost 100px to the right of a player standing at x=1000
  const setup = (lantern) => {
    const l = createLevel2(600);
    const p = createPlayer(l);
    p.x = 1000; p.y = l.groundY - P_H;
    p.lantern = lantern;
    const g = spawnEnemy({ kind: 'ghost', x: 1100, y: p.y }, l);
    return { l, p, g };
  };

  it('in radius the ghost moves directly away, flickering', () => {
    const { l, p, g } = setup(8);
    const x0 = g.x, y0 = g.y;
    const d0 = dist(g, p);
    for (let i = 0; i < 30; i++) updateEnemies([g], p, l, cam(), DT, fx([]));
    expect(dist(g, p)).toBeGreaterThan(d0 + 10); // fled, not just drifted
    expect(g.x).toBeGreaterThan(x0); // player is on its left: fled right
    expect(Math.abs(g.y - y0)).toBeLessThan(3); // nearly horizontal (player center is 5px below)
    expect(g.flicker).toBeGreaterThan(0);
  });

  it('outside R (160px) it still drifts in even with the lantern lit', () => {
    const { l, p, g } = setup(8);
    g.x = 1000 + 200; // 200px: within aggro (260), outside lantern R (160)
    const d0 = dist(g, p);
    for (let i = 0; i < 20; i++) updateEnemies([g], p, l, cam(), DT, fx([]));
    expect(dist(g, p)).toBeLessThan(d0 - 5); // normal drift in
    expect(g.flicker).toBe(0);
  });

  it('when the lantern expires the ghost drifts in again', () => {
    const { l, p, g } = setup(8);
    for (let i = 0; i < 30; i++) updateEnemies([g], p, l, cam(), DT, fx([])); // flees
    const xAfterFlee = g.x;
    p.lantern = 0;
    for (let i = 0; i < 30; i++) updateEnemies([g], p, l, cam(), DT, fx([]));
    expect(g.x).toBeLessThan(xAfterFlee); // player is to its left: comes back
  });

  it('zombies are unaffected: they still chase through the light', () => {
    const l = createLevel2(600);
    const p = createPlayer(l);
    p.x = 1000; p.y = l.groundY - P_H;
    p.lantern = 8;
    const z = spawnEnemy({ kind: 'zombie', x: 1150, minX: 900, maxX: 1400 }, l);
    const d0 = dist(z, p);
    for (let i = 0; i < 30; i++) updateEnemies([z], p, l, cam(), DT, fx([]));
    expect(dist(z, p)).toBeLessThan(d0 - 5); // still closing in
  });

  it('ghosts still damage on touch', () => {
    const { l, p, g } = setup(8);
    g.x = p.x + 10; g.y = p.y; // already overlapping
    updateEnemies([g], p, l, cam(), DT, fx([]));
    expect(p.hp).toBe(2);
  });
});

describe('placement', () => {
  it('two designated boxes, level 2 interior only, no table weight', () => {
    expect(createLevel(600).boxes.some(b => b.drop === 'lantern')).toBe(false);
    const bs = createLevel2(600).boxes.filter(b => b.drop === 'lantern');
    expect(bs.length).toBe(2);
    for (const b of bs) expect(b.x).toBeGreaterThan(900); // interior zone
  });
});
