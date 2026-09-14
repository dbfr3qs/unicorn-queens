// Level 8 (The Sky Citadel) data invariants: the level registers at
// index 7 with its carry, the width/ground contract, the zone tiling,
// the ground+pit coverage, the platforms (the clock's machines), the
// three mainsprings, the gear door, the clock init, the pearl/exit
// shapes, and the fresh state of the M2–M7 subsystems.
import { describe, it, expect } from 'vitest';
import { createLevel8 } from '../src/levels/level8.js';
import { LEVELS } from '../src/levels/index.js';

const lvl = createLevel8(600);

describe('registration', () => {
  it('level 8 is LEVELS[7] with the carry', () => {
    expect(LEVELS[7].name).toBe('sky-citadel');
    expect(LEVELS[7].carry).toEqual({ hasBow: true, hasFlight: true });
    const fresh = LEVELS[7].make(600);
    expect(fresh.width).toBe(6000);
    expect(fresh.groundY).toBe(560);
  });
});

describe('zones', () => {
  it('tile the level exactly (skybridge / citadel / citadel-deep / observatory)', () => {
    const zs = lvl.zones;
    expect(zs.map(z => z.kind)).toEqual(['skybridge', 'citadel', 'citadel-deep', 'observatory']);
    expect(zs.map(z => [z.x0, z.x1])).toEqual([[0, 600], [600, 3300], [3300, 4600], [4600, 6000]]);
    for (let i = 0; i < zs.length - 1; i++) expect(zs[i + 1].x0).toBe(zs[i].x1);
    expect(zs[zs.length - 1].x1).toBe(6000);
  });
});

describe('ground + pits', () => {
  const covered = new Set();
  // sample on the global 50-px grid, aligned to it (span start offsets vary)
  const span = (a, b) => { for (let x = Math.ceil(a / 50) * 50; x < b; x += 50) covered.add(x); };
  const seen = new Set();
  const spanSeen = (a, b) => { for (let x = Math.ceil(a / 50) * 50; x < b; x += 50) { expect(seen.has(x)).toBe(false); seen.add(x); } };

  it('ground + lava cover [0, 6000) exactly once', () => {
    for (const g of lvl.ground) span(g.x, g.x + g.w);
    for (const m of lvl.lava) span(m.x, m.x + m.w);
    for (let x = 0; x < 6000; x += 50) expect(covered.has(x)).toBe(true);
    for (const g of lvl.ground) spanSeen(g.x, g.x + g.w);
    for (const m of lvl.lava) spanSeen(m.x, m.x + m.w);
  });

  it('has six stone segments at the planned spans', () => {
    expect(lvl.ground.map(g => [g.x, g.w])).toEqual([
      [0, 1700], [1850, 350], [2350, 550], [3050, 750], [4200, 1620], [5940, 60],
    ]);
    expect(lvl.ground.every(g => g.kind === 'stone')).toBe(true);
    expect(lvl.ground.every(g => g.y === 560)).toBe(true);
  });

  it('has four grates and the cloud shaft', () => {
    expect(lvl.lava.filter(m => m.kind === 'grate').map(m => [m.x, m.w]))
      .toEqual([[1700, 150], [2200, 150], [2900, 150], [3800, 400]]);
    expect(lvl.lava.filter(m => m.kind === 'shaft')).toEqual([{ x: 5820, w: 120, kind: 'shaft' }]);
  });
});

describe('platforms', () => {
  it('has the eleven machine platforms at the planned rects', () => {
    expect(lvl.platforms.map(p => [p.kind, p.x, p.y, p.w])).toEqual([
      ['gear', 1700, 554, 60],
      ['shelf', 1380, 450, 90],
      ['shelf', 1470, 360, 90],
      ['shelf', 2260, 554, 70],
      ['shelf', 2600, 536, 60],
      ['shelf', 2960, 554, 70],
      ['pend', 3830, 554, 70],
      ['pend', 4100, 554, 70],
      ['pend', 4650, 480, 60],
      ['pedestal', 5430, 520, 60],
      ['trapdoor', 5820, 554, 120],
    ]);
    expect(lvl.platforms.every(p => !p.hidden)).toBe(true);
  });
});

describe('springs', () => {
  it('has the three mainsprings, uncut, at the planned rects', () => {
    expect(lvl.springs.map(s => [s.x, s.y, s.w, s.h, s.cut])).toEqual([
      [1510, 334, 20, 20, false],
      [2620, 516, 20, 20, false],
      [4050, 460, 20, 20, false],
    ]);
  });
});

describe('boxes', () => {
  it('has twelve boxes, one mystery, at groundY - 36', () => {
    expect(lvl.boxes).toHaveLength(12);
    expect(lvl.boxes.every(b => b.y === 524 && b.w === 36 && b.h === 36 && !b.broken)).toBe(true);
    expect(lvl.boxes.filter(b => b.mystery)).toHaveLength(1);
    expect(lvl.boxes.find(b => b.mystery).x).toBe(3200);
    expect(lvl.boxes.filter(b => !b.mystery).map(b => b.drop))
      .toEqual(['bow', 'gem', 'star', 'heart', 'boots', 'magnet', 'gem', 'heart', 'star', 'shield', 'heart']);
  });
});

describe('doors + clock + story state', () => {
  it('has the sealed gear door + the bookcase wall (the sliding panel; bays are scenery)', () => {
    expect(lvl.doors).toEqual([
      { x: 4900, y: 0, w: 40, h: 560, state: 'locked', openT: 0, kind: 'geardoor' },
      { x: 2600, y: 0, w: 120, h: 560, state: 'locked', openT: 0, kind: 'shelfpanel' },
    ]);
  });

  it('starts the clock static at t = 1.0 (no chime pulse, panel drawn open)', () => {
    expect(lvl.clock).toEqual({ t: 1.0, period: 6.0, chimeCount: 0, stopped: false, gearRot: 0 });
  });

  it('starts the M5–M7 subsystem state fresh', () => {
    expect(lvl.shelfPanel).toEqual({ held: false });
    expect(lvl.trapdoor).toEqual({ open: false });
    expect(lvl.kingSil).toEqual({ present: false });
  });
});

describe('pearl + exit', () => {
  it('hides the pearl on the astrolabe plinth', () => {
    expect(lvl.pearl).toMatchObject({ x: 5450, y: 504, w: 16, h: 16, visible: false, taken: false });
    expect(typeof lvl.pearl.showWhen).toBe('function');
    expect(lvl.pearl.showWhen([])).toBe(false);
    expect(lvl.pearl.showWhen([{ kind: 'warden', dead: true, dyingT: 2 }])).toBe(false);
    expect(lvl.pearl.showWhen([{ kind: 'warden', dead: true, dyingT: 0 }])).toBe(true);
  });

  it('exits through the cloud shaft under the trapdoor lid (M7; open to walkers and fliers alike)', () => {
    expect(lvl.exit).toEqual({ x: 5820, y: 560, w: 120, h: 100, locked: true });
  });
});

describe('roster + dialogs', () => {
  it('M4 adds the regulars, M6 adds the keeper: 4 sentinels + 5 moths + the Warden', () => {
    const s = lvl.roster.filter(r => r.kind === 'sentinel');
    const m = lvl.roster.filter(r => r.kind === 'moth');
    const w = lvl.roster.filter(r => r.kind === 'warden');
    expect(lvl.roster).toHaveLength(10);
    expect(s).toHaveLength(4);
    expect(m).toHaveLength(5);
    expect(w).toHaveLength(1);
    expect(w[0]).toEqual({ kind: 'warden', x: 5300, band: [5100, 5800], sleeping: true });
    // the arena-approach sentinel sleeps until the Warden wakes it (M5)
    expect(s.filter(r => r.sleeping)).toHaveLength(1);
    expect(s.find(r => r.sleeping).x).toBe(5050);
  });

  it('carries the M3 + M5 + M7 beats: intro, the Great Clock hub, the arena, the shaft lip', () => {
    const ids = lvl.dialogs.map(d => d.id);
    expect(ids).toEqual(['l8-intro', 'l8-hub', 'l8-arena', 'l8-shaft']);
    const intro = lvl.dialogs[0];
    expect(intro.beats).toHaveLength(1);
    expect(intro.beats[0].lines.map(l => l.speaker)).toEqual(['The Warden', 'The Warden']);
    const hub = lvl.dialogs[1];
    expect(hub.x).toBe(3550); // the hub band, in front of the clock face
    expect(hub.beats.map(b => b.id)).toEqual(['l8-hub-0', 'l8-hub-1', 'l8-hub-2']);
    expect(hub.beats[0].repeat).toBe(true); // c0 repeats at 0 cuts
    expect(hub.beats[0].when({ level: lvl })).toBe(true); // 0 cuts now
    expect(hub.beats[1].when({ level: lvl })).toBe(false);
    expect(hub.beats[1].repeat).toBeFalsy(); // c1 fires once
    // the M5 arena beat: gated on 3 cuts, at the threshold of the Warden's arena
    const arena = lvl.dialogs[2];
    expect(arena.x).toBe(4900); // the gear door threshold
    expect(arena.beats).toHaveLength(1);
    expect(arena.beats[0].when({ level: lvl })).toBe(false); // 0 cuts now
    // the M7 shaft-lip beat: the King, at the lip (5700–5820), fires on entry
    // only once the pearl is taken
    const shaft = lvl.dialogs[3];
    expect(shaft.x).toBe(5700);
    expect(shaft.w).toBe(120); // ends at the shaft edge 5820; the shaft itself is the exit
    expect(shaft.beats).toHaveLength(1);
    expect(shaft.beats[0].lines).toHaveLength(2);
    expect(shaft.beats[0].lines.every(l => l.speaker === 'The Unicorn King')).toBe(true);
    expect(shaft.beats[0].when({ level: lvl })).toBe(false); // pearl not taken
  });
});
