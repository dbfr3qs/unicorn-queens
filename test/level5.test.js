// Level 5 data: "The Enchanted Forest". Pins the layout invariants that
// make the level fair: ground+water cover the whole width exactly once,
// every box on the ground, slimes in bounds, the three relics in place
// (horseshoe hidden in the bush, sapphire in the hollow, acorn on the
// floating pad), the queen on the glade, the locked mist-gate exit.
import { describe, it, expect } from 'vitest';
import { createLevel5 } from '../src/levels/level5.js';
import { LEVELS } from '../src/levels/index.js';

describe('level 5 data', () => {
  const lvl = createLevel5(600);
  const gy = 560;

  it('registered as the fifth level', () => {
    expect(LEVELS[4].name).toBe('enchanted-forest');
    expect(LEVELS[4].make(600).width).toBe(5600);
  });

  it('width, zones, ground segments & water', () => {
    expect(lvl.width).toBe(5600);
    expect(lvl.groundY).toBe(gy);
    expect(lvl.zones).toEqual([
      { x0: 0, x1: 500, kind: 'gate' },
      { x0: 500, x1: 5600, kind: 'forest' },
    ]);
    expect(lvl.ground.map(s => [s.x, s.x + s.w])).toEqual(
      [[0, 500], [500, 2650], [3250, 4200], [4300, 5600]]);
    expect(lvl.lava).toEqual([
      { x: 2650, w: 600, water: true }, // the pond
      { x: 4200, w: 100, water: true }, // the stream
    ]);
    expect(lvl.ground[0].kind).toBe('stone'); // the castle courtyard
  });

  it('ground + water cover the whole width exactly once', () => {
    const cover = new Array(lvl.width).fill(0);
    for (const s of lvl.ground.concat(lvl.lava)) {
      for (let x = s.x; x < s.x + s.w; x++) cover[x] += 1;
    }
    expect(cover.some(n => n !== 1)).toBe(false);
  });

  it('11 boxes, all on the ground, the safety bow first', () => {
    expect(lvl.boxes).toHaveLength(11);
    for (const b of lvl.boxes) {
      expect(b.y + b.h).toBe(gy); // ground level: stomp-reachable, no bow needed
      expect(lvl.ground.some(s => b.x >= s.x && b.x + b.w <= s.x + s.w)).toBe(true);
    }
    expect(lvl.boxes[0].drop).toBe('bow');
    expect(lvl.boxes[0].x).toBe(540); // just past the arch: a restart re-arms
  });

  it('lily pads cross the pond in 80 px hops; the lone pad floats high', () => {
    const pads = lvl.platforms.filter(p => p.kind === 'lily');
    expect(pads).toHaveLength(5);
    const crossing = pads.filter(p => p.y === gy - 6);
    expect(crossing).toHaveLength(4);
    for (let i = 1; i < crossing.length; i++) {
      const gap = crossing[i].x - (crossing[i - 1].x + crossing[i - 1].w);
      expect(gap).toBe(80); // a plain jump
    }
    const high = pads.find(p => p.y === gy - 170);
    expect([high.x, high.w, high.y]).toEqual([2940, 60, 390]);
    expect((gy - 6) - 390).toBe(164); // above a plain jump's 130 px apex
  });

  it('the hollow tree branch chain rises into the hollow', () => {
    const a = lvl.platforms.find(p => p.x === 2120);
    const b = lvl.platforms.find(p => p.x === 2250);
    expect(b.y).toBe(340); // standing on it puts the body at 304–340
    expect(a.y - b.y).toBe(110); // ≤ the 130 px standing-jump apex
    expect(b.x - (a.x + a.w)).toBe(40);
  });

  it('the stream log covers the stream gap', () => {
    const log = lvl.platforms.find(p => p.kind === 'log');
    expect(log.x).toBeLessThanOrEqual(4200);
    expect(log.x + log.w).toBeGreaterThanOrEqual(4300);
  });

  it('three relics: horseshoe hidden, sapphire + acorn in plain sight', () => {
    expect(lvl.relics.map(r => r.id)).toEqual(['horseshoe', 'sapphire', 'acorn']);
    for (const r of lvl.relics) expect([r.w, r.h, r.taken]).toEqual([16, 16, false]);
    const [ho, sa, ac] = lvl.relics;
    expect(ho.visible).toBe(false); // hidden until the bush is shot
    expect(sa.visible).toBe(true);
    expect(ac.visible).toBe(true);
    // the horseshoe sits on the bush top (not inside it — drawBushes
    // would paint over a sprite buried in the mound)
    const bush = lvl.bushes[0];
    expect([bush.relicId, bush.state]).toEqual(['horseshoe', 'hiding']);
    expect(ho.x >= bush.x && ho.x + ho.w <= bush.x + bush.w).toBe(true);
    expect(ho.y + ho.h <= bush.y).toBe(true);
    // the sapphire sits in the hollow tree's hollow (centre 2330,280, r 24)
    const scx = sa.x + sa.w / 2, scy = sa.y + sa.h / 2;
    expect(Math.hypot(scx - 2330, scy - 280)).toBeLessThan(16);
    // the acorn rests on the floating pad
    expect(ac.x >= 2940 && ac.x + ac.w <= 3000).toBe(true);
    expect(ac.y + ac.h).toBe(390);
  });

  it('queen on the glade ground; mist gate + locked exit at the east edge', () => {
    expect(lvl.queen).toEqual({ x: 3480, y: gy - 72, w: 48, h: 72, toldStory: false });
    expect(lvl.queen.y + lvl.queen.h).toBe(gy);
    expect(lvl.mistgate).toEqual({ x: 5450, y: 400, w: 100, h: 160, openT: 0 });
    expect(lvl.exit).toEqual({ x: 5470, y: 430, w: 60, h: 130, locked: true });
    const e = lvl.exit, m = lvl.mistgate; // the exit rect is inside the gate field
    expect(e.x >= m.x && e.x + e.w <= m.x + m.w).toBe(true);
    expect(e.y >= m.y && e.y + e.h <= m.y + m.h).toBe(true);
  });

  it('roster: six slimes on the ground + six bees in the canopy', () => {
    const kinds = lvl.roster.map(e => e.kind);
    expect(kinds.filter(k => k === 'slime')).toHaveLength(6);
    expect(kinds.filter(k => k === 'bee')).toHaveLength(6);
    for (const e of lvl.roster) {
      expect(e.x >= e.minX && e.x <= e.maxX).toBe(true);
      if (e.kind === 'slime') {
        // slime.js clamps the body's right edge to maxX, so maxX must clear the water
        expect(lvl.ground.some(s => e.minX >= s.x && e.maxX <= s.x + s.w)).toBe(true);
      } else { // the bees hover in the canopy band, well above the ground
        expect(e.y).toBeGreaterThanOrEqual(280);
        expect(e.y).toBeLessThan(gy - 100);
      }
    }
  });
});
