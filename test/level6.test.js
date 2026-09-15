// Level 6 data: "The Blackmire". Pins the layout invariants that make the
// level fair: ground+water cover the whole width exactly once, every box
// rests on ground or a platform, the three cogs hidden by default in the
// right places, the vent dormant, the sac absent, the nest webbed, the
// winch empty, the bridge raised + non-solid, the web wall locked at full
// height, the pearl sealed behind the boss, the exit locked.
import { describe, it, expect } from 'vitest';
import { createLevel6 } from '../src/levels/level6.js';
import { LEVELS } from '../src/levels/index.js';

describe('level 6 data', () => {
  const lvl = createLevel6(600);
  const gy = 560;

  it('registered as the sixth level with the run gear carried in', () => {
    expect(LEVELS[5].name).toBe('blackmire');
    expect(LEVELS[5].make(600).width).toBe(6800);
    expect(LEVELS[5].carry).toEqual({ hasBow: true, hasFlight: true });
  });

  it('width, zones, ground segments & water', () => {
    expect(lvl.width).toBe(6800);
    expect(lvl.groundY).toBe(gy);
    expect(lvl.zones).toEqual([
      { x0: 0, x1: 3800, kind: 'mire' }, // the swamp from x 0: no gate
      { x0: 3800, x1: 6800, kind: 'mire-deep' },
    ]);
    expect(lvl.ground.map(s => [s.x, s.x + s.w])).toEqual(
      [[0, 1100], [1450, 1900], [2300, 5500], [5800, 6800]]);
    expect(lvl.lava).toEqual([
      { x: 1100, w: 350, water: true },
      { x: 1900, w: 400, water: true },
      { x: 5500, w: 300, water: true },
    ]);
    expect(lvl.ground[0].kind).toBe('ground'); // the heron grove, from the first step
  });

  it('ground + water cover the whole width exactly once', () => {
    const cover = new Array(lvl.width).fill(0);
    for (const s of lvl.ground.concat(lvl.lava)) {
      for (let x = s.x; x < s.x + s.w; x++) cover[x] += 1;
    }
    expect(cover.some(n => n !== 1)).toBe(false);
  });

  it('the zones tile the level with no gaps', () => {
    let end = 0;
    for (const z of lvl.zones) {
      expect(z.x0).toBe(end);
      end = z.x1;
    }
    expect(end).toBe(lvl.width);
  });

  it('12 boxes, all resting on ground or a platform, the safety bow first', () => {
    expect(lvl.boxes).toHaveLength(12);
    expect(lvl.boxes[0].drop).toBe('bow');
    expect(lvl.boxes[0].x).toBe(500); // just past the arch: a restart re-arms
    for (const b of lvl.boxes) {
      const onGround = lvl.ground.some(s => b.x >= s.x && b.x + b.w <= s.x + s.w
        && b.y + b.h === s.y);
      const onPlatform = lvl.platforms.some(p => b.x >= p.x && b.x + b.w <= p.x + p.w
        && b.y + b.h === p.y);
      expect(onGround || onPlatform).toBe(true);
    }
    const star = lvl.boxes.find(b => b.drop === 'star');
    const log = lvl.platforms.find(p => p.kind === 'log' && p.x === 1150);
    expect(star.y + star.h).toBe(log.y); // the star rests on its log
  });

  it('the root chain rises to the nest in ≤130 px hops', () => {
    const chain = lvl.platforms.filter(p => p.kind === 'root' || p.kind === 'nest');
    expect(chain.map(p => [p.x, p.y])).toEqual([
      [780, gy - 120], [900, gy - 210], [1010, gy - 310], [1010, gy - 390],
    ]);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i - 1].y - chain[i].y).toBeLessThanOrEqual(130); // a plain jump
    }
  });

  it('the pool crossings: two logs over 1100–1450, two lilies over 1900–2300', () => {
    const logs = lvl.platforms.filter(p => p.kind === 'log');
    const lilies = lvl.platforms.filter(p => p.kind === 'lily');
    expect(logs.map(p => [p.x, p.y])).toEqual([[1150, gy - 6], [1310, gy - 6]]);
    expect(lilies.map(p => [p.x, p.y])).toEqual([[1950, gy - 6], [2210, gy - 6]]);
    for (const p of logs) expect(p.x >= 1100 && p.x + p.w <= 1450).toBe(true);
    for (const p of lilies) expect(p.x >= 1900 && p.x + p.w <= 2300).toBe(true);
  });

  it('the altar daises: the egg-sac dais and the boss altar, tops at gy-40', () => {
    const altars = lvl.platforms.filter(p => p.kind === 'altar');
    expect(altars.map(p => [p.x, p.y, p.w])).toEqual(
      [[4250, gy - 40, 150], [6400, gy - 40, 120]]);
  });

  it('three cogs: hidden by default, the right sizes, stages 0/1/2', () => {
    expect(lvl.cogs.map(c => [c.id, c.stage])).toEqual(
      [['heron', 0], ['adder', 1], ['weaver', 2]]);
    for (const c of lvl.cogs) {
      expect([c.w, c.h, c.taken, c.visible, c.installed]).toEqual([16, 16, false, false, false]);
    }
    const [heron, adder, weaver] = lvl.cogs;
    // the heron's cog rests on the nest (webbed over it)
    const nest = lvl.platforms.find(p => p.kind === 'nest');
    expect(heron.x >= nest.x && heron.x + heron.w <= nest.x + nest.w).toBe(true);
    expect(heron.y + heron.h).toBe(nest.y);
    // the weaver's cog rests on the altar dais
    const dais = lvl.platforms.find(p => p.kind === 'altar' && p.x === 4250);
    expect(weaver.x >= dais.x && weaver.x + weaver.w <= dais.x + dais.w).toBe(true);
    expect(weaver.y + weaver.h).toBe(dais.y);
    // the adder's cog starts at the vent (its pop point, M3 re-places it)
    expect(Math.abs(adder.x - 2100)).toBeLessThanOrEqual(8);
  });

  it('nest webbed, vent dormant, sac absent, winch empty, bridge raised + hidden', () => {
    expect(lvl.nest).toEqual({ x: 1010, y: gy - 390, w: 60, h: 24, state: 'webbed', unravelT: 0 });
    expect(lvl.vent).toEqual({ x: 2100, active: false, activated: false, popped: false, t: 0, bubbleY: gy });
    expect(lvl.sac).toEqual({ x: 4310, y: gy - 64, w: 28, h: 24, present: false, popped: false });
    // the sac's bottom sits on the dais top
    expect(lvl.sac.y + lvl.sac.h).toBe(520);
    expect(lvl.winch).toEqual({ x: 4900, sockets: [false, false, false], turning: false });
    expect(lvl.bridge).toEqual({ x: 5500, y: gy - 6, w: 300, state: 'raised', lowerT: 0 });
    const bridge = lvl.platforms.find(p => p.kind === 'bridge');
    expect(bridge).toEqual({ x: 5500, y: gy - 6, w: 300, kind: 'bridge', hidden: true });
  });

  it('the web wall: locked, full height, at the hollow mouth', () => {
    expect(lvl.door).toEqual({ x: 5800, y: 0, w: 40, h: gy, state: 'locked', openT: 0, kind: 'webwall', wall: 'wall_deep' });
  });

  it('the pearl is sealed until a spiderboss is dead; the exit is locked', () => {
    expect(lvl.pearl).toMatchObject({ x: 6440, y: 504, visible: false, taken: false });
    expect(lvl.pearl.showWhen([])).toBe(false);
    expect(lvl.pearl.showWhen([{ kind: 'slime', dead: false }])).toBe(false);
    expect(lvl.pearl.showWhen([{ kind: 'spiderboss', dead: true }])).toBe(true);
    // the pearl rests on the boss altar
    const altar = lvl.platforms.find(p => p.kind === 'altar' && p.x === 6400);
    expect(lvl.pearl.y + lvl.pearl.h).toBe(altar.y);
    expect(lvl.exit).toEqual({ x: 6680, y: 430, w: 60, h: 130, locked: true });
  });

  it('the intro + the Old Winch beats', () => {
    expect(lvl.dialogs.map(d => [d.id, d.beats.map(b => b.id)])).toEqual([
      ['intro', ['l6-intro']],
      ['winch', ['w0', 'w1', 'w2', 'w3', 'w4', 'w5']],
    ]);
    expect(lvl.dialogs[0].beats[0].lines).toHaveLength(3);
    expect(lvl.dialogs[1].x).toBe(4780);
    expect(lvl.dialogs[1].x + lvl.dialogs[1].w).toBe(5080);
    // the install beats are one-shots; the pointers repeat
    const beats = Object.fromEntries(lvl.dialogs[1].beats.map(b => [b.id, b]));
    expect([beats.w0.repeat, beats.w2.repeat, beats.w4.repeat]).toEqual([true, true, true]);
    for (const id of ['w1', 'w3', 'w5']) expect(beats[id].repeat).toBeUndefined();
    for (const id of ['w1', 'w3', 'w5']) expect(typeof beats[id].onOpen).toBe('function');
  });

  it('the roster has 5 snakes + the sleeping elder adder (M5)', () => {
    expect(lvl.roster.filter(r => r.kind === 'snake')).toHaveLength(5);
    const adder = lvl.roster.find(r => r.kind === 'adder');
    expect(adder.sleeping).toBe(true);
  });

  it('the roster has six web-anchor spiders at y 410 (M6)', () => {
    const spiders = lvl.roster.filter(r => r.kind === 'spider');
    expect(spiders.map(r => r.x)).toEqual([800, 1850, 2250, 2900, 3750, 4400]);
  });

  it('the roster gains the Weaver Queen (M7)', () => {
    expect(lvl.roster).toHaveLength(13);
    const q = lvl.roster.find(r => r.kind === 'spiderboss');
    expect([q.x, q.minX, q.maxX]).toEqual([6100, 5900, 6650]);
  });
});
