import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLevel } from '../src/levels/level.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies, damageEnemy, E_STOMP_V } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { createCamera } from '../src/camera.js';
import { LEVELS } from '../src/levels/index.js';
import { createLevel8 } from '../src/levels/level8.js';
import { createLevel9 } from '../src/levels/level9.js';
import { updateClock } from '../src/clock.js';
import { setDifficulty, difficultyName } from '../src/difficulty.js';
import { SPIKE_LIFE } from '../src/enemies/queenboss.js';
import { fireballs, boulders, cones, shockwaves } from '../src/projectiles.js';

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

describe('a boss\'s last hit', () => {
  it.each(['queenboss', 'warden'])('%s: the final blow empties the air', kind => {
    const l = LEVELS[kind === 'warden' ? 7 : 8].make(600);
    const e = spawnEnemy(l.roster.find(s => s.kind === kind), l); e.sleeping = false;
    const fx = { play() {} };
    for (const list of [fireballs, boulders, cones, shockwaves]) list.push({ dead: false });
    l.blizzard = { t: 5, next: 1 };
    damageEnemy(e, fx, createCamera(), e.hp, l);
    for (const list of [fireballs, boulders, cones, shockwaves]) expect(list).toHaveLength(0);
    if (kind === 'queenboss') expect(l.blizzard).toBe(null);
  });
});

describe('boss clocks', () => {
  const cam = createCamera(), fx = { play() {} }, DT = 1 / 60;
  const startDifficulty = difficultyName();
  afterEach(() => { setDifficulty(startDifficulty); });

  it('the Warden never reads a stale chime on waking', () => {
    for (let wakeAt = 0; wakeAt < 16; wakeAt++) { // sweep the clock phase he wakes on
      const l = createLevel8();
      const p = createPlayer(l); p.x = 5400; p.y = l.groundY - p.h;
      const e = spawnEnemy({ kind: 'warden', x: 5560, band: [5100, 5800] }, l);
      e.sleeping = true; const x0 = e.x;
      const tickClock = () => updateClock(l, p, [e], DT, fx);
      for (let i = 0; i < 200 + wakeAt * 20; i++) { tickClock(); updateEnemies([e], p, l, cam, DT, fx); }
      const chimes = l.clock.chimeCount;
      e.sleeping = false; tickClock(); updateEnemies([e], p, l, cam, DT, fx);
      if (l.clock.chimeCount !== chimes) continue; // a real chime on the waking frame: he may rightly advance
      expect(e.state, `wakeAt ${wakeAt}`).toBe('idle'); expect(e.x).toBe(x0);
    }
  });
  it("easy: the Queen's spike lasts as long as on hard while she winds up", () => {
    setDifficulty('easy');
    const l = createLevel9(600);
    const p = createPlayer(l); p.x = 100; // far from the spike
    const e = spawnEnemy(l.roster.find(s => s.kind === 'queenboss'), l); e.sleeping = true;
    vi.spyOn(getKind('queenboss'), 'isTell').mockReturnValue(true); // every frame is tell-scaled
    updateEnemies([e], p, l, cam, DT, fx); // first update creates her state
    const sp = { x: 5000, t: 0, cracked: false }; e.spikes.push(sp);
    for (let t = 0; t < SPIKE_LIFE + 0.1; t += DT) updateEnemies([e], p, l, cam, DT, fx);
    expect(e.spikes).not.toContain(sp); // gone after SPIKE_LIFE, not SPIKE_LIFE x bossTell
  });
});
