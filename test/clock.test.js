// The Great Clock (level 8, M2): the pure reads (period, gear speed, light,
// chime pitch, gear-platform x, panel frac, pendulum pose) and the
// updateClock simulation (chime wrap + near/far voice, the gear-platform
// slide + the grounded-player carry, the bookcase panel window + the
// no-crush hold + resolveDoor, the pendulum rod push, gearRot + the stop).
import { describe, it, expect } from 'vitest';
import {
  periodFor, gearSpeed, lightLevel, chimePitch,
  gearPlatX, panelFrac, pendulumPose, updateClock,
} from '../src/clock.js';
import { createLevel8 } from '../src/levels/level8.js';
import { resolveDoor } from '../src/door.js';

const DT = 1 / 60;

// A headless level + a player-shaped object + a fake fx recorder.
function sim() {
  const lvl = createLevel8(600);
  const plays = [];
  const fx = { play: (n, a) => plays.push([n, a]) };
  const p = { x: 3000, y: 524, w: 28, h: 36, onGround: false, dead: false };
  const step = secs => {
    for (let i = 0, n = Math.round(secs / DT); i < n; i++) updateClock(lvl, p, lvl.roster, DT, fx);
  };
  return { lvl, p, plays, step };
}

const panelOf = lvl => lvl.doors.find(d => d.kind === 'shelfpanel');
const gearOf = lvl => lvl.platforms.find(pl => pl.kind === 'gear');

// Distance from the player centre to the rod segment (the push radius check).
function distToRod(p, pose) {
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  const { px, py, tx, ty } = pose;
  const dx = tx - px, dy = ty - py;
  const s = Math.max(0, Math.min(1, ((cx - px) * dx + (cy - py) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(cx - (px + s * dx), cy - (py + s * dy));
}

describe('pure reads', () => {
  it('the period lengthens with each mainspring cut', () => {
    expect([0, 1, 2, 3].map(periodFor)).toEqual([6.0, 6.8, 7.6, 8.4]);
  });

  it('the gear speed and the light fall with the cuts', () => {
    expect(gearSpeed(2, false)).toBe(0.5);
    expect(gearSpeed(0, true)).toBe(0);
    expect(lightLevel(0, false)).toBe(1);
    expect(lightLevel(3, true)).toBe(0.2); // the final dim (M6)
  });

  it('the chime flattens a notch per cut', () => {
    expect(chimePitch(0)).toBe(1);
    expect(chimePitch(3)).toBeCloseTo(0.83, 2);
  });

  it('the gear platform rests at a slot and slides 70 px after a chime', () => {
    expect(gearPlatX({ t: 1, chimeCount: 0 })).toBe(1700);
    expect(gearPlatX({ t: 0.25, chimeCount: 1 })).toBeCloseTo(1735); // mid-slide
    expect(gearPlatX({ t: 1, chimeCount: 1 })).toBe(1770);
  });

  it('the panel slides 0.4 / holds 1.2 / slides 0.4, and the hold wins', () => {
    const c = t => ({ t, chimeCount: 0 });
    expect(panelFrac(c(3.0))).toBe(0);
    expect(panelFrac(c(0.2))).toBe(0.5);
    expect(panelFrac(c(1.0))).toBe(1);
    expect(panelFrac(c(1.8))).toBeCloseTo(0.5);
    expect(panelFrac(c(2.5))).toBe(0);
    expect(panelFrac(c(3.0), true)).toBe(1); // the no-crush hold
  });

  it('the pendulum pose: vertical at the chime, ±40° at the quarters', () => {
    const lvl = { clock: { t: 0, period: 6 } };
    expect(pendulumPose(lvl)).toEqual({ px: 4000, py: 100, tx: 4000, ty: 520 });
    lvl.clock.t = 1.5; // period / 4
    const pose = pendulumPose(lvl);
    expect(pose.tx).toBeCloseTo(4270, 0); // 420 · sin 40° ≈ 270
    expect(pose.ty).toBeCloseTo(422, 0);
  });
});

describe('updateClock', () => {
  it('chimes on each wrap, near and far, pitched by the cuts', () => {
    const s = sim(); // the player at x 3000 (interior)
    s.step(7.0); // t 1.0 -> ~8.0: exactly one wrap
    expect(s.lvl.clock.chimeCount).toBe(1);
    expect(s.plays.filter(([n]) => n === 'chime' || n === 'chimeFar')).toEqual([['chime', 1]]);

    const far = sim();
    far.p.x = 300; // out on the skybridge
    far.step(7.0);
    expect(far.plays.filter(([n]) => n === 'chime' || n === 'chimeFar')).toEqual([['chimeFar', 1]]);
  });

  it('slides the gear platform between its slots, one per chime', () => {
    const s = sim();
    const g = gearOf(s.lvl);
    expect(g.x).toBe(1700);
    s.step(6.2); // one wrap: the slide is done well before t lands
    expect(s.lvl.clock.chimeCount).toBe(1);
    expect(g.x).toBe(1770);
    s.step(6.2); // the second wrap: back
    expect(g.x).toBe(1700);
  });

  it('carries a grounded player standing on the gear platform', () => {
    const s = sim();
    const g = gearOf(s.lvl);
    s.p.x = 1710; s.p.y = 554 - 36; s.p.onGround = true; // feet on the 554 plate
    s.step(6.2); // one wrap: the 1700 -> 1770 slide
    expect(g.x).toBe(1770);
    expect(s.p.x).toBeCloseTo(1780, 1); // carried the full 70 px
  });

  it('opens the bookcase panel for its 2 s window and holds it (no crush)', () => {
    const s = sim();
    s.step(2.0); // t 1.0 -> ~3.0: the window is closed
    expect(panelOf(s.lvl).state).toBe('locked');
    // a player approaching from the west is held at the panel face (the bays
    // are scenery, not solid walls — deviation 17)
    const ap = { x: 2590, y: 524, w: 28, h: 36, dead: false };
    resolveDoor(s.lvl, ap);
    expect(ap.x).toBe(2572); // 2600 - w: outside the panel

    const s2 = sim();
    s2.step(0.05); // t ~1.02: inside the window
    expect(panelOf(s2.lvl).state).toBe('open');
    // a player in the opening passes untouched
    const inOpen = { x: 2650, y: 524, w: 28, h: 36, dead: false };
    resolveDoor(s2.lvl, inOpen);
    expect(inOpen.x).toBe(2650);

    // no-crush: still in the opening when t crosses 2.0 -> held, stays open
    s2.p.x = 2650;
    s2.step(1.0); // t ~1.05 -> ~2.05
    expect(s2.lvl.shelfPanel.held).toBe(true);
    expect(panelOf(s2.lvl).state).toBe('open');
    // once they clear the opening it closes
    s2.p.x = 2900;
    s2.step(0.1);
    expect(s2.lvl.shelfPanel.held).toBe(false);
    expect(panelOf(s2.lvl).state).toBe('locked');
  });

  it('pushes the player off the pendulum rod, and only when it is near', () => {
    const s = sim();
    s.lvl.clock.t = 0; // the chime: the rod vertical, tip (4000, 520)
    s.p.x = 4000 - 14; s.p.y = 538 - 18; // centre (4000, 538): 18 px from the tip
    s.step(DT); // one frame
    const pose = pendulumPose(s.lvl);
    expect(distToRod(s.p, pose)).toBeGreaterThanOrEqual(19 - 1e-6); // pushed out
    expect(s.p.y).toBeGreaterThan(538 - 18); // the push is down, away from the tip

    const s2 = sim();
    s2.lvl.clock.t = s2.lvl.clock.period / 4; // the +40° extreme, tip ~(4270, 422)
    s2.p.x = 4000 - 14; s2.p.y = 538 - 18;
    s2.step(DT);
    expect(s2.p.x).toBe(4000 - 14); // not pushed
    expect(s2.p.y).toBe(538 - 18);
  });

  it('turns the background gear while running and freezes it when stopped', () => {
    const s = sim();
    const before = s.lvl.clock.gearRot;
    s.step(1.0);
    expect(s.lvl.clock.gearRot).toBeCloseTo(before + 0.6, 5); // speed 1 × 0.6 rad/s
    s.lvl.clock.stopped = true;
    const frozen = s.lvl.clock.gearRot;
    s.step(0.5);
    expect(s.lvl.clock.gearRot).toBe(frozen);
  });

  it('runs the Warden down even with the clock stopped (the M6 rest)', () => {
    const s = sim();
    s.lvl.roster.push({ kind: 'warden', dead: true, dyingT: 3.3 });
    s.lvl.clock.stopped = true;
    s.step(1.0);
    const warden = s.lvl.roster.find(e => e.kind === 'warden');
    expect(warden.dyingT).toBeCloseTo(2.3, 5);
  });
});
