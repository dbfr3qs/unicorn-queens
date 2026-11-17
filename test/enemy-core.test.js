import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLevel } from '../src/levels/level.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies, E_STOMP_V } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { createCamera } from '../src/camera.js';

const rig = () => {
  const l = createLevel(600);
  const p = createPlayer(l);
  const e = spawnEnemy({ kind: 'slime', x: 400 }, l);
  return { l, p, e };
};

// Run only the shared contact rule: every enemy's kind update is stubbed out.
function hitOnly(enemies, p, l, dt) {
  for (const e of enemies) vi.spyOn(getKind(e.kind), 'update').mockImplementation(() => {});
  updateEnemies(enemies, p, l, createCamera(), dt, { play() {} });
}

afterEach(() => vi.restoreAllMocks());

describe('stomp contact rule', () => {
  it('a fast fall at 30 fps is still a stomp', () => {
    const { l, p, e } = rig(); p.vy = 800;
    p.x = e.x; p.y = e.y + 20 - p.h; // feet 20 px into the slime after a 26 px step
    hitOnly([e], p, l, 1 / 30);
    expect(e.dead).toBe(true); expect(p.hp).toBe(3);
  });
  it('two overlapping enemies under one stomp: neither hurts', () => {
    const { l, p, e } = rig(); const e2 = spawnEnemy({ kind: 'slime', x: e.x + 6 }, l);
    p.vy = 300; p.x = e.x; p.y = e.y + 4 - p.h;
    hitOnly([e, e2], p, l, 1 / 60);
    expect(p.hp).toBe(3);
  });
  it('the bounce off an unstompable is not cut short', () => {
    const { l, p } = rig(); const g = spawnEnemy({ kind: 'ghost', x: p.x }, l);
    p.vy = 300; p.cuttable = true; p.y = g.y + 4 - p.h;
    hitOnly([g], p, l, 1 / 60);
    expect(p.vy).toBe(E_STOMP_V); expect(p.cuttable).toBe(false);
  });
});
