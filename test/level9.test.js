// Level 9 — The Frozen Throne — data shape.
//
// The level's whole puzzle is data (three seeds, three hearths, three seals,
// the frozen cast), and every subsystem M2–M7 reads coordinates out of it, so
// the layout is pinned here: a moved brazier or a mistyped relic id would
// otherwise show up as a puzzle that silently cannot be finished.
import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/levels/index.js';
import { createLevel9 } from '../src/levels/level9.js';

const lvl = createLevel9(600);

describe('registration', () => {
  it('is the ninth level, carrying the bow and flight', () => {
    expect(LEVELS).toHaveLength(9);
    expect(LEVELS[8].name).toBe('frozen-throne');
    expect(LEVELS[8].carry).toEqual({ hasBow: true, hasFlight: true });
  });

  it('builds at the house size', () => {
    expect(lvl.width).toBe(6000);
    expect(lvl.height).toBe(600);
    expect(lvl.groundY).toBe(560);
  });
});

describe('zones', () => {
  it('runs glacier -> palace -> hall -> throne with no gaps', () => {
    expect(lvl.zones).toEqual([
      { x0: 0, x1: 1600, kind: 'glacier' },
      { x0: 1600, x1: 3800, kind: 'palace' },
      { x0: 3800, x1: 5200, kind: 'frosthall' },
      { x0: 5200, x1: 6000, kind: 'frostthrone' },
    ]);
  });

  it('does not reuse a zone kind another level already dispatches on', () => {
    // zones.js matches kind alone, with no level context: level 7 owns
    // 'throne' and level 2 owns 'hall', so level 9's are prefixed
    const kinds = lvl.zones.map(z => z.kind);
    expect(kinds).not.toContain('throne');
    expect(kinds).not.toContain('hall');
  });
});

describe('terrain', () => {
  it('lays the seven segments: ice to the hall, stone through it, the arena', () => {
    expect(lvl.ground).toEqual([
      { x: 0, w: 1400, kind: 'ice', y: 560 },
      { x: 1550, w: 1650, kind: 'ice', y: 560 },
      { x: 3450, w: 350, kind: 'ice', y: 560 },
      { x: 3800, w: 1400, kind: 'stone', y: 560 },
      { x: 5200, w: 75, kind: 'ice', y: 560 },
      { x: 5275, w: 65, kind: 'stone', y: 560 },
      { x: 5340, w: 660, kind: 'ice', y: 560 },
    ]);
  });

  it('gives the King the only footing in the arena that does not slide', () => {
    const pad = lvl.ground.find(g => g.x === 5275);
    expect(pad.kind).toBe('stone');
    expect(5300).toBeGreaterThanOrEqual(pad.x); // where he stands
    expect(5300).toBeLessThan(pad.x + pad.w);
  });

  it('leaves exactly the two pits, both crevasses', () => {
    expect(lvl.lava).toEqual([
      { x: 1400, w: 150, crevasse: true },
      { x: 3200, w: 250, crevasse: true },
    ]);
  });

  it('opens each pit exactly where the ground stops', () => {
    for (const pit of lvl.lava) {
      const before = lvl.ground.find(g => g.x + g.w === pit.x);
      const after = lvl.ground.find(g => g.x === pit.x + pit.w);
      expect(before, `pit at ${pit.x} has ground up to its west lip`).toBeTruthy();
      expect(after, `pit at ${pit.x} has ground from its east lip`).toBeTruthy();
    }
  });

  it('places the eight platforms of the climb, the crossing and the throne', () => {
    expect(lvl.platforms).toEqual([
      { x: 620, y: 536, w: 120, kind: 'dais' },
      { x: 2250, y: 510, w: 80, kind: 'ice' },
      { x: 2330, y: 455, w: 80, kind: 'ice' },
      { x: 2420, y: 400, w: 70, kind: 'ice' },
      { x: 3240, y: 554, w: 40, kind: 'ice' },
      { x: 3380, y: 554, w: 40, kind: 'ice' },
      { x: 4230, y: 436, w: 60, kind: 'ice' },
      { x: 5620, y: 520, w: 160, kind: 'dais' },
    ]);
  });

  it('spans the frostfall with two bridges inside the gap', () => {
    const gap = lvl.lava[1];
    const bridges = lvl.platforms.filter(p => p.x >= gap.x && p.x < gap.x + gap.w);
    expect(bridges).toHaveLength(2);
  });
});

describe('boxes', () => {
  it('sets twelve, all unbroken on the floor line', () => {
    expect(lvl.boxes).toHaveLength(12);
    for (const b of lvl.boxes) {
      expect(b.y).toBe(524);
      expect(b.w).toBe(36);
      expect(b.h).toBe(36);
      expect(b.broken).toBe(false);
      expect(b.kind).toBe('box');
    }
  });

  it('drops the safety bow first and the grip boots before the first ice run', () => {
    const at = x => lvl.boxes.find(b => b.x === x);
    expect(at(300).drop).toBe('bow');
    expect(at(1200).drop).toBe('boots'); // ahead of crevasse 1 at 1400
    expect(at(1200).x).toBeLessThan(lvl.lava[0].x);
  });

  it('carries one mystery box and the house drop spread', () => {
    const drops = lvl.boxes.map(b => b.mystery ? 'mystery' : b.drop);
    expect(drops.filter(d => d === 'mystery')).toHaveLength(1);
    expect(drops.filter(d => d === 'boots')).toHaveLength(2);
    expect(drops.filter(d => d === 'star')).toHaveLength(2);
    expect(drops.filter(d => d === 'heart')).toHaveLength(3);
    expect(drops.filter(d => d === 'gem')).toHaveLength(3);
    expect(drops.filter(d => d === 'bow')).toHaveLength(1);
  });
});

describe('the frost seals', () => {
  it('walls each zone boundary floor to ceiling', () => {
    expect(lvl.doors).toHaveLength(3);
    for (const d of lvl.doors) {
      expect(d.kind).toBe('frostseal');
      expect(d.w).toBe(40);
      expect(d.y).toBe(0);
      expect(d.h).toBe(lvl.groundY);
      expect(d.openT).toBe(0);
    }
    expect(lvl.doors.map(d => d.x)).toEqual([1600, 3800, 5200]);
  });

  it('spawns locked: the way east is the puzzle', () => {
    for (const d of lvl.doors) expect(d.state).toBe('locked');
  });

  it('puts one seal at each zone boundary', () => {
    expect(lvl.doors.map(d => d.x)).toEqual(lvl.zones.slice(1).map(z => z.x0));
  });
});

describe('the sun seeds', () => {
  it('seats three relics, only the crest one visible from the start', () => {
    expect(lvl.relics).toEqual([
      { id: 'seed1', x: 642, y: 520, w: 16, h: 16, taken: false, planted: false, visible: false },
      { id: 'seed2', x: 2445, y: 384, w: 16, h: 16, taken: false, planted: false, visible: true },
      { id: 'seed3', x: 4242, y: 420, w: 16, h: 16, taken: false, planted: false, visible: false },
    ]);
  });

  it('seats each hidden seed on the surface its shell sits over', () => {
    const pedestal = lvl.platforms[0]; // the fountain's dais
    expect(lvl.relics[0].x).toBeGreaterThan(pedestal.x);
    expect(lvl.relics[0].x).toBeLessThan(pedestal.x + pedestal.w);
    const shelf = lvl.platforms.find(p => p.x === 4230); // the bird's shelf
    expect(lvl.relics[2].x).toBeGreaterThan(shelf.x);
    expect(lvl.relics[2].x).toBeLessThan(shelf.x + shelf.w);
  });
});

describe('the thaw clock', () => {
  it('starts cold, with three unlit rings on the three hearths', () => {
    expect(lvl.thaw.t).toBe(0);
    expect(lvl.thaw.thaws).toBe(0);
    expect(lvl.thaw.skyT).toBe(0);
    expect(lvl.thaw.bossThaws).toBe(0);
    expect(lvl.thaw.rings).toEqual([
      { x: 950, lit: false, igniteT: 0, t: 0 },
      { x: 2600, lit: false, igniteT: 0, t: 0 },
      { x: 4400, lit: false, igniteT: 0, t: 0 },
    ]);
    expect(lvl.frostPatches).toEqual([]);
  });

  it('puts one hearth in each of the first three zones', () => {
    const zoneOf = x => lvl.zones.find(z => x >= z.x0 && x < z.x1).kind;
    expect(lvl.thaw.rings.map(r => zoneOf(r.x))).toEqual(['glacier', 'palace', 'frosthall']);
  });
});

describe('the frozen cast', () => {
  it('catches the fountain mid-splash over its pedestal', () => {
    expect(lvl.fountain).toEqual({ x: 630, y: 436, w: 40, h: 124, shattered: false, t: 0 });
    // it reaches the floor: an arrow leaves the bow at groundY - 24, and a
    // column ending at the pedestal top would sit on the edge of that shot
    expect(lvl.fountain.y + lvl.fountain.h).toBe(lvl.groundY);
  });

  it('freezes the hare, the wraith and the bird in their blocks', () => {
    expect(lvl.frozenHare).toEqual({ x: 880, y: 504, w: 56, h: 56, state: 'frozen', t: 0 });
    expect(lvl.frozenWraith).toEqual({ x: 2750, y: 504, w: 56, h: 56, state: 'frozen', t: 0 });
    expect(lvl.frozenBird).toEqual({ x: 4232, y: 380, w: 56, h: 56, state: 'frozen', t: 0 });
  });

  it('stands the bird block on the shelf its seed falls to', () => {
    const shelf = lvl.platforms.find(p => p.x === 4230);
    expect(lvl.frozenBird.y + lvl.frozenBird.h).toBe(shelf.y);
  });

  it('freezes five people and two fountains in the hall', () => {
    expect(lvl.hallFigures.map(f => f.x)).toEqual([4050, 4200, 4650, 4750, 4900]);
    expect(lvl.hallFigures.map(f => f.kind))
      .toEqual(['guard', 'scholar', 'couple', 'child', 'attendant']);
    for (const f of lvl.hallFigures) expect(f.state).toBe('frozen');
    expect(lvl.hallFountains.map(f => f.x)).toEqual([4100, 4600]);
    for (const f of lvl.hallFountains) expect(f.state).toBe('frozen');
  });

  it('keeps the whole hall cast inside the hall zone', () => {
    const hall = lvl.zones.find(z => z.kind === 'frosthall');
    for (const f of [...lvl.hallFigures, ...lvl.hallFountains]) {
      expect(f.x).toBeGreaterThanOrEqual(hall.x0);
      expect(f.x).toBeLessThan(hall.x1);
    }
  });
});

describe('the roster', () => {
  it('anchors four frost sprites along the route', () => {
    const sprites = lvl.roster.filter(r => r.kind === 'sprite');
    expect(sprites.map(s => [s.x, s.y])).toEqual([[2150, 400], [2850, 380], [4300, 360], [4900, 380]]);
  });

  it('gives each golem a patrol band it starts inside', () => {
    const golems = lvl.roster.filter(r => r.kind === 'golem');
    expect(golems).toHaveLength(2);
    for (const g of golems) {
      expect(g.x).toBeGreaterThanOrEqual(g.band[0]);
      expect(g.x + 48).toBeLessThanOrEqual(g.band[1]);
    }
  });

  it('keeps everything but the Queen out of the arena', () => {
    for (const r of lvl.roster) {
      if (r.kind === 'queenboss') continue;
      expect(r.x).toBeLessThan(5200);
    }
  });

  it('seats the Queen on the throne, asleep', () => {
    const q = lvl.roster.find(r => r.kind === 'queenboss');
    expect(q).toEqual({ kind: 'queenboss', x: 5672, y: 400, sleeping: true }); // on the seat, not above it
  });
});

describe('the King', () => {
  it('starts at the spawn, walking', () => {
    expect(lvl.king).toEqual({ x: 60, y: 560, w: 28, h: 44, state: 'walk', t: 0 });
  });
});

describe('the ending is the only ending', () => {
  it('has no exit, no goal and no pearl', () => {
    expect(lvl.exit).toBeUndefined();
    expect(lvl.goal).toBeUndefined();
    expect(lvl.pearl).toBeUndefined();
  });

  it('speaks twice on the way in: the King at the spawn, the Queen at her door', () => {
    expect(lvl.dialogs.map(d => d.id)).toEqual(['l9-intro', 'l9-gate']);
    const gate = lvl.dialogs[1].beats[0];
    // she is not a proximity trigger: she is a reward for finishing the puzzle
    expect(gate.when({ level: { thaw: { thaws: 2 } } })).toBe(false);
    expect(gate.when({ level: { thaw: { thaws: 3 } } })).toBe(true);
  });

  it('starts the unfreezing as the gate beat opens, not when it closes', () => {
    const g = { level: createLevel9(600) };
    lvl.dialogs[1].beats[0].onOpen(g);
    expect(g.level.queenUnfreeze).toEqual({ t: 0, boss: false });
  });
});
