// The loader's contract under Node, which is where the whole test suite and smoke.mjs
// run: no Image global, so every lookup must return null rather than throw, and metadata
// must still be readable so callers can size things correctly.
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  sprite, spriteMeta, frameAt, spriteStatus, spritesLoaded, loadProgress, LOAD_TIMEOUT,
} from '../src/sprites.js';
import { SPRITES } from '../src/sprite-manifest.js';
import { drawSprite, drawSpriteFeet, scaleToHeight } from '../src/render/sprite.js';
import { createRecordingCtx } from './helpers/recording-ctx.js';

describe('sprite loader under Node', () => {
  it('reports that images are unsupported here', () => {
    expect(typeof Image).toBe('undefined'); // guards the assumption the module rests on
    expect(spriteStatus().supported).toBe(false);
    expect(spriteStatus().ready).toBe(0);
  });

  it('returns null for every sheet instead of throwing', () => {
    for (const name of Object.keys(SPRITES)) expect(sprite(name)).toBeNull();
    expect(sprite('no-such-sprite')).toBeNull();
  });

  it('still serves metadata synchronously', () => {
    const p = spriteMeta('player');
    expect(p).toMatchObject({ w: 96, h: 96, frames: 1 });
    expect(p.hitbox).toEqual({ w: 28, h: 36 });
    expect(spriteMeta('no-such-sprite')).toBeNull();
  });

  it('describes the jump strip as 2 held poses', () => {
    expect(spriteMeta('player_jump')).toMatchObject({ w: 96, h: 96, frames: 2, fps: 0 });
    expect(frameAt('player_jump', 99)).toBe(0); // fps 0 means state picks the frame, not time
  });

  it('describes the run strip as 8 cells', () => {
    expect(spriteMeta('player_run')).toMatchObject({ w: 96, h: 96, frames: 8, fps: 12 });
  });
});

describe('frame selection', () => {
  it('advances with time and wraps', () => {
    expect(frameAt('player_run', 0)).toBe(0);
    expect(frameAt('player_run', 1 / 12)).toBe(1);
    expect(frameAt('player_run', 7 / 12)).toBe(7);
    expect(frameAt('player_run', 8 / 12)).toBe(0); // wraps back round the cycle
  });

  it('pins single-frame sprites to 0', () => {
    expect(frameAt('player', 5)).toBe(0);
    expect(frameAt('no-such-sprite', 5)).toBe(0);
  });
});

describe('manifest integrity', () => {
  it('gives every sprite a positive cell size and frame count', () => {
    for (const [name, m] of Object.entries(SPRITES)) {
      expect(m.file, name).toMatch(/\.png$/);
      expect(m.w, name).toBeGreaterThan(0);
      expect(m.h, name).toBeGreaterThan(0);
      expect(m.frames, name).toBeGreaterThanOrEqual(1);
    }
  });

  it('sizes every sprite cell at least as large as its hitbox', () => {
    // the sprite is drawn over the collision box, never smaller than it
    for (const [name, m] of Object.entries(SPRITES)) {
      if (!m.hitbox) continue;
      expect(m.w, name).toBeGreaterThanOrEqual(m.hitbox.w);
      expect(m.h, name).toBeGreaterThanOrEqual(m.hitbox.h);
    }
  });
});

// ---- draw helper ----
describe('draw helper without decoded images', () => {
  it('reports false so the caller can fall back, and emits nothing', () => {
    const { ctx, lines } = createRecordingCtx();
    expect(drawSprite(ctx, 'player', 0, 0, 0, 96, 96)).toBe(false);
    expect(drawSpriteFeet(ctx, 'player_run', 3, 1)).toBe(false);
    expect(lines.join('')).toBe(''); // nothing drawn: no half-rendered frame
  });

  it('reports false for an unknown sprite', () => {
    const { ctx } = createRecordingCtx();
    expect(drawSpriteFeet(ctx, 'no-such-sprite', 0)).toBe(false);
  });
});

describe('draw sizing', () => {
  it('scales a 96px cell to the requested on-screen height', () => {
    // the vector player stands 52px above its feet, so that is what the sprite must match
    expect(scaleToHeight('player', 52)).toBeCloseTo(52 / 96, 5);
    expect(scaleToHeight('player', 96)).toBeCloseTo(1, 5);
  });

  it('falls back to 1 for an unknown sprite', () => {
    expect(scaleToHeight('no-such-sprite', 52)).toBe(1);
  });
});

// ---- the preload gate ----
// main.js holds the first frame on spritesLoaded(). Two things must hold or
// the game either flickers (starting too early) or never starts at all.
describe('the preload gate', () => {
  it('resolves at once where there is no Image, so Node never waits', async () => {
    const t0 = Date.now();
    const r = await spritesLoaded(50);
    expect(Date.now() - t0).toBeLessThan(40);
    expect(r).toEqual({ ready: 0, total: 0 });
  });

  it('reports a complete load here, so no loading screen is drawn', () => {
    // loadProgress is what main.js checks before it puts a bar on screen: with
    // nothing to wait for there must be nothing to look at
    expect(loadProgress()).toBe(1);
  });

  it('keeps a timeout, so a broken sheet can delay the start but never stop it', () => {
    expect(LOAD_TIMEOUT).toBeGreaterThan(0);
    expect(Number.isFinite(LOAD_TIMEOUT)).toBe(true);
  });
});

// spritesLoaded() decodes each sheet before resolving. These tests need an `Image`, which
// the module reads at import time, so each one stubs it and imports a fresh copy.
describe('spritesLoaded decodes sheets before resolving', () => {
  const N = Object.keys(SPRITES).length;

  async function load(configure = () => {}) {
    const made = [];
    class FakeImage {
      constructor() {
        this.complete = false; this.naturalWidth = 0; this.listeners = {};
        this.decodeCalls = 0; this.decodeResult = null;
        made.push(this);
        configure(this, made.length - 1);
      }
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
      fire(type) {
        if (type === 'load') { this.complete = true; this.naturalWidth = 8; }
        for (const fn of this.listeners[type] || []) fn();
      }
      decode() {
        this.decodeCalls++;
        return new Promise((res, rej) => { this.decodeResult = { res, rej }; });
      }
    }
    vi.stubGlobal('Image', FakeImage);
    vi.resetModules();
    const mod = await import('../src/sprites.js');
    return { mod, made };
  }
  const flush = () => new Promise(r => setImmediate(r));
  const track = p => { const o = { done: false }; p.then(() => { o.done = true; }); return o; };

  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('stays pending after every load until every decode() settles', async () => {
    const { mod, made } = await load();
    const t = track(mod.spritesLoaded());
    made.forEach(i => i.fire('load'));
    await flush();
    expect(made.every(i => i.decodeCalls === 1)).toBe(true);
    expect(t.done).toBe(false);
    made.slice(1).forEach(i => i.decodeResult.res());
    await flush();
    expect(t.done).toBe(false); // the first is still decoding
    made[0].decodeResult.res();
    await flush();
    expect(t.done).toBe(true);
  });

  it('a decode() that rejects still settles that sheet', async () => {
    const { mod, made } = await load();
    const t = track(mod.spritesLoaded());
    made.forEach(i => i.fire('load'));
    made.forEach((i, k) => (k === 0 ? i.decodeResult.rej(new Error('bad')) : i.decodeResult.res()));
    await flush();
    expect(t.done).toBe(true);
  });

  it('an image without decode() settles on load', async () => {
    const { mod, made } = await load(img => { img.decode = undefined; });
    const t = track(mod.spritesLoaded());
    made.forEach(i => i.fire('load'));
    await flush();
    expect(t.done).toBe(true);
  });

  it('an error settles without decoding', async () => {
    const { mod, made } = await load();
    const t = track(mod.spritesLoaded());
    made.forEach(i => i.fire('error'));
    await flush();
    expect(t.done).toBe(true);
    expect(made.every(i => i.decodeCalls === 0)).toBe(true);
  });

  it('already-complete images are decoded too; failed ones are skipped', async () => {
    const { mod, made } = await load((img, k) => {
      img.complete = true; img.naturalWidth = k === 0 ? 0 : 8; // first one failed earlier
    });
    const t = track(mod.spritesLoaded());
    await flush();
    expect(made[0].decodeCalls).toBe(0);
    expect(made.slice(1).every(i => i.decodeCalls === 1)).toBe(true);
    expect(t.done).toBe(N === 1);
    made.slice(1).forEach(i => i.decodeResult.res());
    await flush();
    expect(t.done).toBe(true);
  });

  it('the timeout resolves if a decode never settles', async () => {
    vi.useFakeTimers();
    const { mod, made } = await load();
    const t = track(mod.spritesLoaded(1000));
    made.forEach(i => i.fire('load'));
    await vi.advanceTimersByTimeAsync(999);
    expect(t.done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(t.done).toBe(true);
  });
});
