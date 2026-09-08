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

  it.each(Object.keys(VARIANTS))('variant group %s offers distinct alternatives', slot => {
    // A/B pickers are worthless if two entries are the same text — easy
    // to do by accident when variants are derived from a shared voice.
    const alts = Object.values(VARIANTS[slot]);
    expect(new Set(alts).size).toBe(alts.length);
  });

  // Doctrine rule 2. .arp() evaluated cleanly and then produced zero
  // events — silent "pads" that only an event count caught. These are
  // the cheap structural guards; music-lab's ?selftest=1 does the real
  // event count in a browser, since Strudel is not a project dependency.
  describe('the arpeggio spelling', () => {
    const pads = Object.entries(PAD);

    it.each(pads)('%s never calls .arp(), which silently yields nothing', (_n, src) => {
      expect(src).not.toMatch(/\.arp\(/);
    });

    it.each(pads)('%s puts the sweep rate inside the brackets', (_n, src) => {
      // `[a3 c4 e4]*16` keeps the chord change at one per cycle.
      // `.fast(16)` on the outside speeds the chord changes too, smearing
      // every chord into every cycle.
      expect(src).toMatch(/\]\*\d+/);
      expect(src).not.toMatch(/\.fast\(/);
    });

    it.each(pads)('%s sequences single notes rather than stacking a chord', (_n, src) => {
      const notes = src.match(/note\("([^"]+)"\)/);
      expect(notes, 'no note("...") found').not.toBeNull();
      // a comma inside the mini-notation is a stack: three notes at once,
      // which is the thing the hardware cannot do and the arpeggio replaces
      expect(notes[1]).not.toContain(',');
    });
  });

  it('keeps the era A/B genuinely different', () => {
    // This pair is the answer to "it does not sound 8-bit enough", so a
    // copy-paste slip that made them identical would be quietly useless.
    const { era } = VARIANTS;
    const [before, after] = Object.values(era);
    expect(before).toMatch(/room\(/);      // reverb: the modern tell
    expect(after).not.toMatch(/room\(/);   // doctrine rule 3
    expect(after).toMatch(/\]\*\d+/);      // doctrine rule 2: arpeggiated chord
    expect(after).toMatch(/pw\(/);         // doctrine rule 1
  });
});

describe('stackOf', () => {
  it('produces a parseable program', () => {
    parsesAsProgram(stackOf(124, ['kick', 'hatsOpen', 'roll', 'arp', 'arpChord']));
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
    const src = stackOf(124, ['kick', 'snare']);
    expect(src).toContain('penv(30)'); // from kick
    expect(src).toContain('bpf(1600)'); // from snare
  });
});
