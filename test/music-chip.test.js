// The chip rack is JavaScript held in strings, so nothing normally
// checks it until it reaches a browser. These tests parse every fragment
// (without running it) so a typo fails here instead of going silently
// missing at playback.
import { describe, it, expect } from 'vitest';
import { CHIP, DRUMS, BASS, LEAD, PAD, FX, VARIANTS, cpm, stackOf } from '../src/music/chip.js';

// new Function() parses without executing: no Strudel, no AudioContext,
// nothing evaluated. It catches unbalanced parens, broken method chains
// and stray quotes — the failure modes of code kept as text. It cannot
// catch an unknown Strudel function or bad mini-notation; only ears and
// the browser can.
const parsesAsExpression = src => { new Function(`return (${src});`); };
const parsesAsProgram = src => { new Function(src); };

describe('chip rack', () => {
  it('imports in Node without touching browser globals', () => {
    // The import above is the assertion — if chip.js reached for window,
    // document or AudioContext, this file would not load. Guards
    // smoke.mjs, which boots the game under Node.
    expect(Object.keys(CHIP).length).toBeGreaterThan(0);
  });

  it('collects every voice into CHIP without name collisions', () => {
    const groups = [DRUMS, BASS, LEAD, PAD, FX];
    const total = groups.reduce((n, g) => n + Object.keys(g).length, 0);
    // a collision would silently drop a voice during the spread
    expect(Object.keys(CHIP).length).toBe(total);
  });

  it.each(Object.entries(CHIP))('voice %s is a valid JS expression', (_name, src) => {
    expect(src.trim()).not.toBe('');
    parsesAsExpression(src);
  });

  it.each(Object.entries(VARIANTS).flatMap(([slot, alts]) =>
    Object.entries(alts).map(([label, src]) => [`${slot}/${label}`, src])
  ))('variant %s is a valid JS expression', (_name, src) => {
    parsesAsExpression(src);
  });

  it('builds the arp variants from the real arp, not a stale copy', () => {
    // .replace() silently no-ops if LEAD.arp stops containing crush(8),
    // which would leave three identical "variants" in the picker.
    const alts = Object.values(VARIANTS.arp);
    expect(new Set(alts).size).toBe(alts.length);
  });
});

describe('stackOf', () => {
  it('produces a parseable program', () => {
    parsesAsProgram(stackOf(124, ['kick', 'hatsOpen', 'roll', 'arp', 'wide']));
  });

  it('sets the tempo as cycles per minute, 4 beats to the cycle', () => {
    expect(cpm(124)).toBe('setcpm(124/4)');
    expect(stackOf(118, ['kick'])).toMatch(/^setcpm\(118\/4\)\n/);
  });

  it('throws on an unknown voice rather than dropping it', () => {
    expect(() => stackOf(124, ['kick', 'tuba'])).toThrow(/unknown chip voice/);
    expect(() => stackOf(124, ['tuba', 'oboe'])).toThrow(/tuba, oboe/);
  });

  it('keeps every named voice in the output', () => {
    const src = stackOf(124, ['kick', 'clap']);
    expect(src).toContain('penv(36)'); // from kick
    expect(src).toContain('bpf(1900)'); // from clap
  });
});
