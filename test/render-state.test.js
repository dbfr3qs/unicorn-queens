// Canvas state hygiene: a draw routine leaves the context as it found it and
// sets what it depends on.
import { describe, it, expect, vi } from 'vitest';
import { drawParallax, drawZoneParallax, drawThawParallax } from '../src/render/background.js';
import { createLevel } from '../src/levels/level.js';
import { drawIntro } from '../src/render/intro.js';
import { drawHud } from '../src/render/hud.js';
import { startGame } from '../src/game.js';
import { startIntro, endIntro } from '../src/intro.js';

// Which sheet names the mocked sprite() reports as decoded; empty means the Node default.
let ready = new Set();
vi.mock('../src/sprites.js', async (orig) => {
  const real = await orig();
  return {
    ...real,
    sprite: (name) => (ready.has(name) ? { img: {}, meta: { w: 100, h: 100 } } : real.sprite(name)),
  };
});

// Like smoke.mjs's ctxStub (unknown methods are no-ops returning { width: 0 }),
// but save/restore really push and pop textAlign.
function stateCtx() {
  const t = {}, stack = [];
  t.save = () => { stack.push(t.textAlign); };
  t.restore = () => { t.textAlign = stack.pop(); };
  return new Proxy(t, {
    get: (o, prop) => (prop in o ? o[prop] : () => ({ width: 0 })),
    set: (o, prop, v) => { o[prop] = v; return true; },
  });
}

describe('canvas state', () => {
  it('drawIntro leaves textAlign as it found it', () => {
    startIntro(600);
    const c = stateCtx(); c.textAlign = 'left'; drawIntro(c, 800, 600);
    endIntro();
    expect(c.textAlign).toBe('left');
  });
  it('the HUD sets its own alignment', () => {
    const c = stateCtx(); c.textAlign = 'right'; const seen = [];
    c.fillText = () => seen.push(c.textAlign);
    startGame(600, 0); drawHud(c, 800, 600);
    expect(seen[0]).toBe('left'); // the first heart
  });

  describe('parallax needs every layer', () => {
    const run = (names, fn) => {
      ready = new Set(names);
      const c = stateCtx(); let draws = 0; c.drawImage = () => draws++;
      const r = fn(c); ready = new Set();
      return [r, draws];
    };
    it('one missing ridge sheet means no layer is drawn and the caller falls back', () => {
      const lvl = createLevel(600);
      expect(run(['bg_night_sky', 'bg_night_near'], (c) => drawParallax(c, lvl, { x: 0 }, 800))).toEqual([false, 0]);
      expect(run(['bg_night_sky', 'bg_night_far', 'bg_night_near'], (c) => drawParallax(c, lvl, { x: 0 }, 800))[0]).toBe(true);
    });
    it('zone and thaw parallax follow the same rule', () => {
      const lvl = createLevel(600);
      expect(run(['s'], (c) => drawZoneParallax(c, 's', 'r', 100, lvl, { x: 0 }, 800))).toEqual([false, 0]);
      expect(run(['s', 'r'], (c) => drawZoneParallax(c, 's', 'r', 100, lvl, { x: 0 }, 800))[0]).toBe(true);
      expect(run(['cold', 'r'], (c) => drawThawParallax(c, 'cold', 'warm', 1, 'r', 100, lvl, { x: 0 }, 800))).toEqual([false, 0]);
      expect(run(['cold', 'warm'], (c) => drawThawParallax(c, 'cold', 'warm', 1, 'r', 100, lvl, { x: 0 }, 800))).toEqual([false, 0]);
      expect(run(['cold', 'r'], (c) => drawThawParallax(c, 'cold', 'warm', 0, 'r', 100, lvl, { x: 0 }, 800))[0]).toBe(true);
    });
  });
});
