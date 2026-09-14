// Level 9's thaw: the puzzle that is the level.
//
// Everything the player sees change — the sky, the hall's film, the drone's
// pitch, the floor, the seals — hangs off two numbers in lvl.thaw, so these
// pin the arithmetic as well as the sequence. A wrong lerp here does not
// crash; it just means the sky never finishes moving.
import { describe, it, expect, beforeEach } from 'vitest';
import { createLevel9 } from '../src/levels/level9.js';
import {
  updateThaw, igniteBrazier, frostPatch, brazierRect, brazierGlints, humPitch,
  RING_MELT, SKY_LERP, IGNITE_FLAME, HUM_PERIOD, CREAK_PERIOD,
  DOOR_CRACK, DOOR_MELT, PATCH_LIFE, BRAZIERS,
} from '../src/thaw.js';
import { updateDoor, resolveDoor } from '../src/door.js';
import { skyPalette, starAlpha, hallFilmAlpha } from '../src/render/zones.js';

const DT = 1 / 60;

function spy() {
  const played = [];
  return { play: (n, arg) => played.push(arg === undefined ? n : [n, arg]), played };
}

// A player-shaped stand-in; the thaw only reads the rect and `dead`.
const at = (x, y = 504) => ({ x, y, w: 28, h: 56, dead: false });

function run(lvl, p, fx, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) updateThaw(lvl, p, DT, fx);
}

let lvl, fx;
beforeEach(() => { lvl = createLevel9(600); fx = spy(); });

describe('the sky', () => {
  it('names the four dawn steps', () => {
    expect(skyPalette(0).top).toBe('rgb(14, 18, 48)');
    expect(skyPalette(0).band).toBeNull(); // no first light while it is still night
    expect(skyPalette(3).top).toBe('rgb(44, 34, 80)');
    expect(skyPalette(3).bottom).toBe('rgb(122, 74, 120)');
  });

  it('clamps past the last step rather than running off the table', () => {
    expect(skyPalette(9)).toEqual(skyPalette(3));
    expect(skyPalette(-1)).toEqual(skyPalette(0));
  });

  it('fades the stars and the hall film one step per thaw', () => {
    expect([0, 1, 2, 3].map(starAlpha).map(v => +v.toFixed(3))).toEqual([1, 0.717, 0.433, 0.15]);
    expect([0, 1, 2, 3].map(hallFilmAlpha).map(v => +v.toFixed(3))).toEqual([0.25, 0.167, 0.083, 0]);
    expect(hallFilmAlpha(3)).toBe(0); // three hearths: the hall is clear, exactly
    expect(starAlpha(3)).toBe(0.15); // but the stars keep their floor: still not daylight
  });

  it('lerps toward the new step over SKY_LERP rather than snapping', () => {
    const p = at(0);
    igniteBrazier(lvl, 0, fx);
    expect(lvl.thaw.skyT).toBe(0); // the ignition does not move the sky itself
    run(lvl, p, fx, SKY_LERP / 2);
    expect(lvl.thaw.skyT).toBeGreaterThan(0.4);
    expect(lvl.thaw.skyT).toBeLessThan(0.6);
    run(lvl, p, fx, SKY_LERP / 2 + 0.1);
    expect(lvl.thaw.skyT).toBeCloseTo(1, 3);
  });
});

describe('the drone', () => {
  it('rises 6% per thaw, hearth or wound alike', () => {
    expect(humPitch(lvl)).toBeCloseTo(1, 6);
    lvl.thaw.thaws = 3;
    expect(humPitch(lvl)).toBeCloseTo(1.191016, 6);
    lvl.thaw.bossThaws = 2; // the Queen's wounds continue the same series
    expect(humPitch(lvl)).toBeCloseTo(Math.pow(1.06, 5), 6);
  });

  it('beats every HUM_PERIOD at the current pitch', () => {
    run(lvl, at(0), fx, HUM_PERIOD * 3 + 0.1);
    const hums = fx.played.filter(e => Array.isArray(e) && e[0] === 'hum');
    expect(hums).toHaveLength(3);
    for (const h of hums) expect(h[1]).toBeCloseTo(1, 6);
  });

  it('creaks while the ice is still holding, and stops once it is not', () => {
    run(lvl, at(0), fx, CREAK_PERIOD * 2 + 0.1);
    expect(fx.played.filter(e => e === 'creak')).toHaveLength(2);
    lvl.thaw.thaws = 3; // three hearths lit: nothing left to strain
    fx.played.length = 0;
    run(lvl, at(0), fx, CREAK_PERIOD * 2);
    expect(fx.played.filter(e => e === 'creak')).toHaveLength(0);
  });
});

describe('planting a seed', () => {
  const stand = k => at(BRAZIERS[k] + 10);

  it('ignites when the hearth gets its own seed', () => {
    lvl.relics[0].taken = true;
    updateThaw(lvl, stand(0), DT, fx);
    expect(lvl.relics[0].planted).toBe(true);
    expect(lvl.thaw.rings[0].lit).toBe(true);
    expect(lvl.thaw.thaws).toBe(1);
    expect(fx.played).toContain('crack');
    expect(fx.played.filter(e => e === 'fire')).toHaveLength(2);
  });

  it('does nothing but pop when the hearth gets the wrong seed', () => {
    lvl.relics[1].taken = true; // seed 2, at hearth A
    updateThaw(lvl, stand(0), DT, fx);
    expect(lvl.thaw.rings[0].lit).toBe(false);
    expect(lvl.thaw.thaws).toBe(0);
    expect(lvl.relics[1].planted).toBe(false);
    expect(fx.played).toContain('pop');
    expect(lvl.thaw.popT).toBeGreaterThan(0);
  });

  it('latches the pop instead of machine-gunning it', () => {
    lvl.relics[1].taken = true;
    run(lvl, stand(0), fx, 0.4);
    expect(fx.played.filter(e => e === 'pop')).toHaveLength(1);
    run(lvl, stand(0), fx, 0.4); // past the latch
    expect(fx.played.filter(e => e === 'pop')).toHaveLength(2);
  });

  it('takes the right one out of a handful', () => {
    lvl.relics[0].taken = true;
    lvl.relics[1].taken = true; // seed 2 is flight-reachable early: both in hand
    updateThaw(lvl, stand(0), DT, fx);
    expect(lvl.relics[0].planted).toBe(true);
    expect(lvl.relics[1].planted).toBe(false); // kept for hearth B
  });

  it('does nothing at all with empty hands', () => {
    run(lvl, stand(0), fx, 1);
    expect(lvl.thaw.thaws).toBe(0);
    expect(fx.played).not.toContain('pop');
  });

  it('ignores a dead player standing in the fire', () => {
    lvl.relics[0].taken = true;
    const dead = { ...stand(0), dead: true };
    run(lvl, dead, fx, 1);
    expect(lvl.thaw.rings[0].lit).toBe(false);
  });

  it('needs the seed picked up, not merely revealed', () => {
    lvl.relics[0].visible = true;
    run(lvl, stand(0), fx, 1);
    expect(lvl.thaw.rings[0].lit).toBe(false);
  });
});

describe('the "plant me here" glint', () => {
  it('lights only on the first unlit hearth, and only with its seed in hand', () => {
    expect([0, 1, 2].map(k => brazierGlints(lvl, k))).toEqual([false, false, false]);
    lvl.relics[0].taken = true;
    expect([0, 1, 2].map(k => brazierGlints(lvl, k))).toEqual([true, false, false]);
    lvl.relics[1].taken = true; // holding seed 2 does not light hearth B yet
    expect(brazierGlints(lvl, 1)).toBe(false);
    igniteBrazier(lvl, 0, fx);
    expect([0, 1, 2].map(k => brazierGlints(lvl, k))).toEqual([false, true, false]);
  });
});

describe('the ring under the hearth', () => {
  it('rises its flame over IGNITE_FLAME and melts its floor over RING_MELT', () => {
    igniteBrazier(lvl, 0, fx);
    const r = lvl.thaw.rings[0];
    run(lvl, at(0), fx, IGNITE_FLAME);
    expect(r.igniteT).toBeCloseTo(1, 2);
    expect(r.t).toBeLessThan(1); // the floor is slower than the flame
    run(lvl, at(0), fx, RING_MELT);
    expect(r.t).toBe(1);
  });

  it('sits on the hearth it belongs to', () => {
    expect(lvl.thaw.rings.map(r => r.x)).toEqual(BRAZIERS);
    expect(brazierRect(1, 560)).toEqual({ x: 2600, y: 504, w: 48, h: 56 });
  });
});

describe('the seal that hearth opens', () => {
  it('cracks, melts, then opens — and is solid the whole way', () => {
    const door = lvl.doors[0], p = at(1560);
    igniteBrazier(lvl, 0, fx);
    expect(door.state).toBe('cracking');

    // step one frame at a time and watch for each edge, rather than assuming
    // the phases start on a frame boundary — they do not
    const until = (want, cap = 600) => {
      for (let i = 0; i < cap; i++) {
        updateDoor(lvl, p, DT, fx);
        if (door.state === want) return i * DT;
      }
      throw new Error(`never reached ${want}`);
    };
    expect(until('melting')).toBeCloseTo(DOOR_CRACK, 1);
    expect(fx.played.some(e => Array.isArray(e) && e[0] === 'melt')).toBe(true);
    expect(until('open')).toBeCloseTo(DOOR_MELT, 1);
    expect(fx.played).toContain('puff');
  });

  it('pushes the player back until it is open', () => {
    const door = lvl.doors[0];
    for (const state of ['locked', 'cracking', 'melting']) {
      door.state = state;
      const p = at(1610, 504);
      resolveDoor(lvl, p);
      expect(p.x, state).not.toBe(1610); // shoved out of the doorway
    }
    door.state = 'open';
    const p = at(1610, 504);
    resolveDoor(lvl, p);
    expect(p.x).toBe(1610);
  });

  it('never re-locks behind the player: the retreat pocket stays', () => {
    const door = lvl.doors[0];
    door.state = 'open';
    const past = at(2000);
    for (let i = 0; i < 120; i++) updateDoor(lvl, past, DT, fx);
    expect(door.state).toBe('open');
  });

  it('opens the seal that matches the hearth, and no other', () => {
    igniteBrazier(lvl, 1, fx);
    expect(lvl.doors.map(d => d.state)).toEqual(['locked', 'cracking', 'locked']);
  });
});

describe('frost patches', () => {
  it('lays one and lets it expire', () => {
    frostPatch(lvl, 100, 80);
    expect(lvl.frostPatches).toEqual([{ x: 100, w: 80, t: 0 }]);
    run(lvl, at(0), fx, PATCH_LIFE + 0.1);
    expect(lvl.frostPatches).toHaveLength(0);
  });

  it('refreshes a nearby one instead of stacking', () => {
    frostPatch(lvl, 100, 80);
    run(lvl, at(0), fx, 2);
    frostPatch(lvl, 120, 80); // centres 20 px apart: the same sheet of ice
    expect(lvl.frostPatches).toHaveLength(1);
    expect(lvl.frostPatches[0].t).toBe(0);
  });

  it('lays a separate one further off', () => {
    frostPatch(lvl, 100, 80);
    frostPatch(lvl, 400, 80);
    expect(lvl.frostPatches).toHaveLength(2);
  });
});

describe('the ending stops the clock', () => {
  it('freezes the thaw once the ending owns the world', () => {
    lvl.ending9 = { started: true };
    run(lvl, at(0), fx, 3);
    expect(lvl.thaw.t).toBe(0);
    expect(fx.played).toHaveLength(0);
  });
});

// ---- the two shells the seeds are locked in ----
describe('the arrow shatters', () => {
  it('opens the fountain and reveals seed 1', async () => {
    const { arrows, resetArrows, updateArrows } = await import('../src/arrows.js');
    resetArrows();
    const cam = { x: 500, shake: 0, mag: 0 };
    arrows.push({ x: lvl.fountain.x - 10, y: lvl.fountain.y + 40, vx: 520, dead: false });
    updateArrows([], lvl, cam, DT, fx, 800);
    expect(lvl.fountain.shattered).toBe(true);
    expect(lvl.relics[0].visible).toBe(true);
    expect(fx.played).toContain('crack');
    expect(fx.played).toContain('crumble');
    expect(arrows).toHaveLength(0); // a plain arrow is spent on it and swept up
  });

  it('shatters the bird block and leaves the robin frozen in place', async () => {
    const { arrows, resetArrows, updateArrows } = await import('../src/arrows.js');
    resetArrows();
    const cam = { x: 4000, shake: 0, mag: 0 };
    arrows.push({ x: lvl.frozenBird.x - 10, y: lvl.frozenBird.y + 20, vx: 520, dead: false });
    updateArrows([], lvl, cam, DT, fx, 800);
    expect(lvl.frozenBird.state).toBe('shattered'); // not 'gone': the bird is still there
    expect(lvl.relics[2].visible).toBe(true);
  });

  it('is a no-op on a shell already open', async () => {
    const { arrows, resetArrows, updateArrows } = await import('../src/arrows.js');
    resetArrows();
    const cam = { x: 500, shake: 0, mag: 0 };
    lvl.fountain.shattered = true;
    lvl.fountain.t = 3;
    arrows.push({ x: lvl.fountain.x - 10, y: lvl.fountain.y + 40, vx: 520, dead: false });
    updateArrows([], lvl, cam, DT, fx, 800);
    expect(lvl.fountain.t).toBe(3); // the clock was not restarted
    expect(fx.played).not.toContain('crumble');
  });

  it('runs the shell clocks the world pass animates off', () => {
    lvl.fountain.shattered = true;
    lvl.frozenBird.state = 'shattered';
    run(lvl, at(0), fx, 0.5);
    expect(lvl.fountain.t).toBeCloseTo(0.5, 2);
    expect(lvl.frozenBird.t).toBeCloseTo(0.5, 2);
  });
});
