// Level 7 (The Peak) data invariants: the level registers at index 6
// with its carry, the width/ground contract, the zone tiling, the
// ground+pit coverage, the doors (the first multi-door level), the
// sigil/cage/exit shapes, and the fresh state of the M2–M7 subsystems.
import { describe, it, expect } from 'vitest';
import { createLevel7 } from '../src/levels/level7.js';
import { LEVELS } from '../src/levels/index.js';

const lvl = createLevel7(600);

describe('registration', () => {
  it('level 7 is LEVELS[6] with the carry', () => {
    expect(LEVELS[6].name).toBe('peak');
    expect(LEVELS[6].carry).toEqual({ hasBow: true, hasFlight: true });
    const fresh = LEVELS[6].make(600);
    expect(fresh.width).toBe(6300);
    expect(fresh.groundY).toBe(560);
  });
});

describe('zones', () => {
  it('tile the level exactly (gate / snowfield / spire / throne)', () => {
    const zs = lvl.zones;
    expect(zs.map(z => z.kind)).toEqual(['peakgate', 'snowfield', 'spire', 'throne']);
    expect(zs[0].x0).toBe(0);
    for (let i = 0; i < zs.length - 1; i++) expect(zs[i + 1].x0).toBe(zs[i].x1);
    expect(zs[zs.length - 1].x1).toBe(6300);
  });
});

describe('ground + pits', () => {
  const covered = new Set();
  const span = (a, b) => { for (let x = a; x < b; x += 50) covered.add(x); };

  it('ground + lava cover [0, 6300) exactly once', () => {
    for (const g of lvl.ground) span(g.x, g.x + g.w);
    for (const m of lvl.lava) span(m.x, m.x + m.w);
    for (let x = 0; x < 6300; x += 50) expect(covered.has(x)).toBe(true);
    const seen = new Set();
    for (const g of lvl.ground) { for (let x = g.x; x < g.x + g.w; x += 50) { expect(seen.has(x)).toBe(false); seen.add(x); } }
    for (const m of lvl.lava) { for (let x = m.x; x < m.x + m.w; x += 50) { expect(seen.has(x)).toBe(false); seen.add(x); } }
  });

  it('has the right kinds: stone at the gates, snow across the field, ice run-ups', () => {
    expect(lvl.ground.map(g => g.kind)).toEqual([
      'stone', 'snow', 'ice', 'snow', 'ice', 'snow', 'stone', 'stone', 'snow',
    ]);
    expect(lvl.ground[0]).toMatchObject({ x: 0, w: 500 });
    expect(lvl.ground[6]).toMatchObject({ x: 3600, w: 300 });
    expect(lvl.ground[7]).toMatchObject({ x: 4050, w: 1350 });
    expect(lvl.ground[8]).toMatchObject({ x: 5400, w: 900 });
  });

  it('has two crevasses and the cauldron pit', () => {
    expect(lvl.lava.filter(m => m.crevasse).map(m => m.x)).toEqual([1400, 2400]);
    expect(lvl.lava.filter(m => m.cauldron)).toEqual([{ x: 3900, w: 150, cauldron: true }]);
    expect(lvl.lava.every(m => m.w === 150)).toBe(true);
  });

  it('every ground segment sits on groundY', () => {
    for (const g of lvl.ground) expect(g.y).toBe(lvl.groundY);
  });
});

describe('platforms', () => {
  it('the ice bridge spans crevasse 2 at water level', () => {
    expect(lvl.platforms.find(p => p.kind === 'ice')).toEqual({ x: 2400, y: 554, w: 150, kind: 'ice' });
  });

  it('the cauldron dais sits mid-pit, the cage dais is 40 px high', () => {
    expect(lvl.platforms.find(p => p.x === 3925)).toEqual({ x: 3925, y: 554, w: 60, kind: 'dais' });
    expect(lvl.platforms.find(p => p.x === 5990)).toEqual({ x: 5990, y: 520, w: 130, kind: 'dais' });
  });
});

describe('boxes', () => {
  it('has exactly 12, all 36×36 sitting on the ground', () => {
    expect(lvl.boxes.length).toBe(12);
    for (const b of lvl.boxes) {
      expect(b.w).toBe(36);
      expect(b.h).toBe(36);
      expect(b.y + b.h).toBe(lvl.groundY);
    }
  });

  it('has one mystery box, no pearls anywhere', () => {
    expect(lvl.boxes.filter(b => b.mystery).length).toBe(1);
    expect(lvl.pearl).toBeUndefined();
  });
});

describe('doors (the first multi-door level)', () => {
  it('two full-height locked gates at the spire mouth and the throne', () => {
    expect(lvl.doors.length).toBe(2);
    expect(lvl.doors[0]).toMatchObject({ x: 3600, w: 40, kind: 'irongate', state: 'locked' });
    expect(lvl.doors[1]).toMatchObject({ x: 5400, w: 40, kind: 'thronegate', state: 'locked' });
    for (const d of lvl.doors) expect(d.h).toBe(lvl.groundY); // flight cannot skip
  });

  it('keeps a throne trigger band just west of the throne gate', () => {
    expect(lvl.throneTrigger).toEqual({ x: 5280, y: 0, w: 120, h: 560 });
  });
});

describe('the sigil chain', () => {
  it('the ice block is intact and the sigil is hidden inside it', () => {
    expect(lvl.sigilBlock).toMatchObject({ x: 3090, w: 56, h: 56, state: 'intact', shatterT: 0 });
    expect(lvl.sigilBlock.y + lvl.sigilBlock.h).toBe(lvl.groundY - 20); // on its base
    expect(lvl.sigil).toMatchObject({ x: 3112, y: 544, w: 16, h: 16, visible: false, taken: false });
    expect(lvl.sigil.x).toBeGreaterThanOrEqual(lvl.sigilBlock.x);
    expect(lvl.sigil.x + lvl.sigil.w).toBeLessThanOrEqual(lvl.sigilBlock.x + lvl.sigilBlock.w);
  });
});

describe('the King, the wind, the ending', () => {
  it('the cage is sealed on its dais', () => {
    expect(lvl.cage).toMatchObject({ x: 5998, w: 64, h: 74, open: false, openT: 0 });
    expect(lvl.cage.y + lvl.cage.h).toBe(520); // the cage dais top
  });

  it('the wind starts calm; the throne gate is sealed; no pig yet', () => {
    expect(lvl.wind).toEqual({ phase: 'calm', lastPhase: 'calm' });
    expect(lvl.throneGateOpen).toBe(false);
    expect(lvl.pig).toBeNull();
    expect(lvl.ending7).toEqual({ started: false });
  });
});

describe('the exit', () => {
  it('a locked rainbow at the east end (no pearl, no arch)', () => {
    expect(lvl.exit).toMatchObject({ x: 6220, w: 60, h: 130, locked: true, kind: 'rainbow' });
    expect(lvl.exit.y + lvl.exit.h).toBe(lvl.groundY);
  });
});
