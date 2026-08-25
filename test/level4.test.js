// Level 4 data: "The Dragon's Layer". Pins the layout invariants that make
// the level fair: jumpable gauntlet, safety bow boxes before the boss, the
// tight secret crate, the keyless portcullis, and the sealed ceiling shaft.
import { describe, it, expect } from 'vitest';
import { createLevel4 } from '../src/level4.js';
import { game, startGame, update } from '../src/game.js';
import { input } from '../src/input.js';

describe('level 4 data', () => {
  const lvl = createLevel4(600);
  const gy = 560;

  it('width, zones, ground segments & sludge pits', () => {
    expect(lvl.width).toBe(4800);
    expect(lvl.groundY).toBe(560);
    expect(lvl.zones.map(z => [z.x0, z.x1, z.kind])).toEqual([
      [0, 3550, 'deep'],
      [3550, 4800, 'deep-hall'],
    ]); // zone break at the portcullis
    expect(lvl.ground.map(s => [s.x, s.x + s.w])).toEqual(
      [[0, 600], [700, 1800], [2600, 4800]]);
    // the gaps between ground segments are sludge pits
    expect(lvl.lava.map(m => [m.x, m.x + m.w])).toEqual([[600, 700], [1800, 2600]]);
    for (const m of lvl.lava) expect(m.sludge).toBe(true);
  });

  it('the gauntlet zigzag is jumpable: rise ≤ 70, gaps 70–90, lip to lip', () => {
    const g = lvl.platforms;
    expect(g).toHaveLength(5);
    // west ground lip (1800) onto the first platform
    expect(g[0].x).toBe(1800);
    expect(g[0].y).toBe(gy - 110); // 110 rise vs ~130 apex
    for (let i = 1; i < g.length; i++) {
      const rise = g[i - 1].y - g[i].y; // +: the next platform is higher
      expect(rise).toBeLessThanOrEqual(70);
      const gap = g[i].x - (g[i - 1].x + g[i - 1].w);
      expect(gap).toBeGreaterThanOrEqual(70);
      expect(gap).toBeLessThanOrEqual(90);
    }
    // last platform back to the east ground lip (2600)
    expect(2600 - (g[4].x + g[4].w)).toBe(10);
  });

  it('14 boxes, existing pool only, all on the path or reachable', () => {
    expect(lvl.boxes).toHaveLength(14);
    for (const b of lvl.boxes) {
      const onGround = b.y + b.h === gy;
      const inVault = b.x >= 2600 && b.x < 3550;
      expect(onGround || (b.y === gy - 120 && inVault)).toBe(true); // secret crate is the only raised one
    }
  });

  it('two safety bow boxes, ground level, before the portcullis', () => {
    const bows = lvl.boxes.filter(b => b.drop === 'bow');
    expect(bows.map(b => b.x).sort((a, b) => a - b)).toEqual([450, 2650]);
    for (const b of bows) {
      expect(b.y + b.h).toBe(560); // standing on the ground: stomp-breakable, no bow needed
      expect(b.x).toBeLessThan(3550);
    }
  });

  it('secret crate: in the vault wall, above head height, heartcap', () => {
    const secret = lvl.boxes.find(b => b.drop === 'heartcap');
    expect(secret.x).toBe(3150);
    expect(secret.y).toBe(gy - 120); // top at 120: a standing jump clears it
  });

  it('keyless full-height portcullis at the hall mouth', () => {
    expect(lvl.door).toEqual(
      { x: 3550, y: 0, w: 40, h: 560, state: 'locked', noKey: true, openT: 0, closeT: 0 });
  });

  it('shaft + exit: ceiling hole at 4150, sealed and locked until the pearl beat', () => {
    expect(lvl.shaft).toMatchObject({ x: 4150, y: 0, w: 100, h: 70, state: 'sealed' });
    expect(lvl.exit).toMatchObject({ x: 4150, y: 0, w: 100, h: 70, locked: true });
  });

  it('pearl: on the hall floor west of the shaft, appears when the dragon dies', () => {
    expect(lvl.pearl).toMatchObject({ x: 4050, visible: false, taken: false });
    expect(lvl.pearl.x).toBeLessThan(4150); // west of the shaft
    expect(lvl.pearl.y + lvl.pearl.h).toBe(lvl.groundY - 40); // floats 40 px above the floor, like the troll hall
    expect(lvl.pearl.showWhen([])).toBe(false);
    expect(lvl.pearl.showWhen([{ kind: 'dragon', dead: true }])).toBe(true);
  });

  it('roster: zombies, ghosts, bats, dragon', () => {
    expect(lvl.roster.map(e => e.kind).sort()).toEqual([
      'bat', 'bat', 'bat', 'bat', 'dragon', 'ghost', 'ghost',
      'zombie', 'zombie', 'zombie', 'zombie']);
  });
});

describe('secret crate reachability', () => {
  it('breaks with a mid-jump arrow (a standing jump clears it)', () => {
    startGame(600, 3);
    const g = game, p = g.player, lvl = g.level;
    const crate = lvl.boxes.find(b => b.drop === 'heartcap');
    p.hasBow = true;
    p.x = 3070; // just left of the crate; drift right while jumping
    p.y = lvl.groundY - p.h;
    p.vy = 0;
    g.camera.x = 2950; // arrows are culled at the view edge: keep it in view
    input.right = true;
    input.jump = true;
    input.fire = true; // the held second arrow leaves at ~90 px rise, in the crate band
    for (let f = 0; f < 240 && !crate.broken; f++) update(1 / 60, 800, { play: () => {} });
    input.right = input.jump = input.fire = false;
    expect(crate.broken).toBe(true);
  });
});
