// Star arrows: piercing star projectiles.
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel } from '../src/level.js';
import { createLevel2 } from '../src/level2.js';
import { createPlayer, updatePlayer, P_H } from '../src/player.js';
import { loot, resetLoot, spawnLoot, updateLoot } from '../src/loot.js';
import { arrows, resetArrows, fireArrow, fireStarArrow, updateArrows } from '../src/arrows.js';
import { spawnEnemy } from '../src/enemies.js';
import { createCamera } from '../src/camera.js';
import { game, startGame } from '../src/game.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const box = (over = {}) => ({ x: 100, y: 200, w: 32, h: 32, broken: false, ...over });
const itemAt = (kind, x, y, onGround = true) => ({ x, y, w: 16, h: 16, vx: 0, vy: 0, onGround, kind, taken: false, t: 0 });
const standingPlayer = () => {
  const l = lvl();
  const p = createPlayer(l);
  p.x = 500; p.y = l.groundY - P_H;
  return { l, p };
};
const inp = fire => ({ left: false, right: false, jump: false, fire });

afterEach(() => {
  resetLoot();
  resetArrows();
  startGame(600, 0);
});

describe('drop table', () => {
  const kindAt = r => {
    resetLoot();
    spawnLoot(box(), () => 0); // consume the one-time bow
    spawnLoot(box(), () => r);
    return loot[1].kind;
  };

  it('heart 20, boots 5, magnet 5, sunbeam 3, star 4, gem the rest', () => {
    expect(kindAt(0.19)).toBe('heart');
    expect(kindAt(0.22)).toBe('boots');
    expect(kindAt(0.26)).toBe('magnet');
    expect(kindAt(0.32)).toBe('sunbeam');
    expect(kindAt(0.34)).toBe('star');
    expect(kindAt(0.369)).toBe('star');
    expect(kindAt(0.42)).toBe('gem'); // hops band starts at 0.37 (P6)
  });
});

describe('pickup', () => {
  it('adds 5 stars and plays the sfx', () => {
    const { l, p } = standingPlayer();
    const calls = [];
    loot.push(itemAt('star', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx(calls));
    expect(p.stars).toBe(5);
    expect(calls).toContain('star');
  });

  it('caps at 10', () => {
    const { l, p } = standingPlayer();
    p.stars = 8;
    loot.push(itemAt('star', 505, l.groundY - 16));
    updateLoot(p, l, DT, fx([]));
    expect(p.stars).toBe(10);
  });
});

describe('firing', () => {
  it('consumes a star before a regular arrow', () => {
    const { l, p } = standingPlayer();
    const cam = createCamera();
    p.hasBow = true; p.stars = 1; p.fireCd = 0;
    updatePlayer(p, inp(true), l, cam, DT, fx([]));
    expect(p.stars).toBe(0);
    expect(arrows[0].star).toBe(true);
    p.fireCd = 0;
    updatePlayer(p, inp(true), l, cam, DT, fx([]));
    expect(arrows[1].star).toBeUndefined(); // back to regular arrows
  });
});

describe('piercing', () => {
  it('a star arrow kills two slimes and is spent on the second', () => {
    const { l, p } = standingPlayer();
    p.x = 100; p.facing = 1;
    const e1 = spawnEnemy({ kind: 'slime', x: 300, minX: 300, maxX: 340 }, l);
    const e2 = spawnEnemy({ kind: 'slime', x: 420, minX: 420, maxX: 460 }, l);
    fireStarArrow(p);
    const cam = createCamera();
    for (let i = 0; i < 25; i++) updateArrows([e1, e2], l, cam, DT, fx([]));
    expect(e1.dead).toBe(true);
    expect(arrows.length).toBe(1); // still flying after the first kill
    for (let i = 0; i < 25; i++) updateArrows([e1, e2], l, cam, DT, fx([]));
    expect(e2.dead).toBe(true);
    expect(arrows.length).toBe(0); // 2-hit budget spent on the second kill
  });

  it('a star arrow damages the mage and never re-hits him', () => {
    startGame(600, 1);
    const g = game;
    const mage = g.enemies.find(e => e.kind === 'mage');
    g.player.x = mage.x - 150;
    g.player.y = g.level.groundY - P_H;
    g.player.facing = 1;
    g.camera.x = g.player.x + 14 - 400; // keep the fight on screen (arrows cull off-screen)
    fireStarArrow(g.player);
    for (let i = 0; i < 40; i++) updateArrows(g.enemies, g.level, g.camera, DT, fx([]));
    expect(mage.hp).toBe(4); // staggered once...
    expect(arrows.length).toBe(1); // ...and the arrow kept flying through him
    for (let i = 0; i < 160; i++) updateArrows(g.enemies, g.level, g.camera, DT, fx([]));
    expect(mage.hp).toBe(4); // no double-dips while overlapping
  });

  it('a regular arrow still dies on first hit', () => {
    const { l, p } = standingPlayer();
    p.x = 100; p.facing = 1;
    const e = spawnEnemy({ kind: 'slime', x: 300, minX: 300, maxX: 340 }, l);
    fireArrow(p);
    for (let i = 0; i < 40; i++) updateArrows([e], l, createCamera(), DT, fx([]));
    expect(e.dead).toBe(true);
    expect(arrows.length).toBe(0);
  });

  it('a star arrow shatters boxes in its path and keeps flying', () => {
    const { l, p } = standingPlayer();
    p.x = 100; p.facing = 1;
    const b = { x: 300, y: l.groundY - 40, w: 36, h: 36, broken: false };
    l.boxes.push(b);
    const calls = [];
    fireStarArrow(p);
    for (let i = 0; i < 40; i++) updateArrows([], l, createCamera(), DT, fx(calls));
    expect(b.broken).toBe(true); // broken as it flew past
    expect(calls).toContain('box');
    expect(arrows.length).toBe(1); // ...and the star kept flying
  });
});

describe('placement', () => {
  it('level 1 has one star box; level 2 has two in the interior', () => {
    expect(createLevel(600).boxes.filter(b => b.drop === 'star').length).toBe(1);
    const stars = createLevel2(600).boxes.filter(b => b.drop === 'star');
    expect(stars.length).toBe(2);
    for (const b of stars) {
      expect(b.x).toBeGreaterThan(900); // interior zone 900..2700
      expect(b.x).toBeLessThan(2700);
    }
  });
});
