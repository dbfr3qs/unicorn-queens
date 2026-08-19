import { describe, it, expect } from 'vitest';
import { createLevel } from '../src/level.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies, E_STOMP_V } from '../src/enemies.js';
import { updateArrows, arrows, ARROW_SPEED } from '../src/arrows.js';
import { createCamera } from '../src/camera.js';

const DT = 1 / 60;
const lvl = () => createLevel(600);
const fx = calls => ({ play: n => calls.push(n) });
const z = (x, l, minX = 0, maxX = l.width) =>
  spawnEnemy({ kind: 'zombie', x, minX, maxX }, l);

describe('spawn', () => {
  it('spawns a 34x40 zombie on the ground line', () => {
    const l = lvl();
    const e = z(560, l, 500, 700);
    expect(e.kind).toBe('zombie');
    expect(e.w).toBe(34);
    expect(e.h).toBe(40);
    expect(e.y).toBe(l.groundY - 40);
  });
});

describe('movement', () => {
  it('shambles within its patrol bounds when the player is far', () => {
    const l = lvl();
    const e = z(566, l, 560, 800); // 6px from the left bound, walking left
    const p = createPlayer(l); // x 60 — well past aggro range
    const cam = createCamera();
    let minX = Infinity;
    for (let i = 0; i < 16; i++) {
      updateEnemies([e], p, l, cam, DT, fx([]));
      minX = Math.min(minX, e.x);
    }
    expect(minX).toBeGreaterThanOrEqual(559.99);
    expect(e.dir).toBe(1); // bounced off the left edge
  });

  it('chases the player at chase speed while in range', () => {
    const l = lvl();
    const e = z(560, l, 500, 700);
    const p = createPlayer(l);
    p.x = 400; // centers 414 vs 577: dx -163, inside aggro range
    updateEnemies([e], p, l, createCamera(), DT, fx([]));
    expect(e.dir).toBe(-1);
    expect(e.vx).toBe(-70);
    expect(e.x).toBeLessThan(560);
  });

  it('returns to its shamble when the player leaves range', () => {
    const l = lvl();
    const e = z(560, l, 500, 700);
    const p = createPlayer(l);
    p.x = 400;
    updateEnemies([e], p, l, createCamera(), DT, fx([])); // chasing left
    expect(e.vx).toBe(-70);
    p.x = 900; // centers 914 vs ~570: dx +344, out of range
    updateEnemies([e], p, l, createCamera(), DT, fx([]));
    expect(e.vx).toBe(-40); // still facing left, back to shamble speed
  });
});

describe('killing a zombie', () => {
  it('can be stomped', () => {
    const l = lvl();
    const e = z(560, l, 500, 700);
    const p = createPlayer(l);
    p.x = 570;
    p.y = (l.groundY - 40) - 36 + 8; // bottom 8px below the zombie's top
    p.vy = 200;
    const calls = [];
    updateEnemies([e], p, l, createCamera(), DT, fx(calls));
    expect(e.dead).toBe(true);
    expect(p.vy).toBe(E_STOMP_V);
    expect(calls).toContain('stomp');
  });

  it('dies to an arrow', () => {
    const l = lvl();
    const e = z(560, l, 500, 700);
    arrows.push({ x: 555, y: l.groundY - 40 + 10, vx: ARROW_SPEED, dead: false });
    updateArrows([e], l, createCamera(), DT, fx([]));
    expect(e.dead).toBe(true);
  });
});
