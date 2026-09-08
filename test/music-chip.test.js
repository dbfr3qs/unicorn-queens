// The chip rack is JavaScript held in strings, so nothing normally
// checks it until it reaches a browser. These tests parse every fragment
// (without running it) so a typo fails here instead of going silently
// missing at playback.
import { describe, it, expect } from 'vitest';
import { CHIP, DRUMS, BASS, LEAD, PAD, ARP, FX, VARIANTS, cpm, stackOf } from '../src/music/chip.js';

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
    const groups = [DRUMS, BASS, LEAD, PAD, ARP, FX];
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
    const pads = Object.entries(ARP);

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

  // The palette's default voices all sit on one four-bar progression,
  // Am - F - G - Em. They did not always: the bass ran A A F G against a
  // chord track of Am F G Em, so bars 2-4 disagreed, and arpBuzz ran a
  // two-bar cycle that drifted against everything else. Both were audible
  // and neither was caught by anything, so: count the alternatives.
  describe('the four-bar progression', () => {
    // `<a b c d>` cycles one entry per bar. Count entries at bracket
    // depth zero, so `<[a3 c4]*8 [f3 a3]*8>` counts 2, not 4.
    const cycleLength = src => {
      // the `>` may be followed by a repeat, as in `<a1 f1 g1 e1>*16`
      const m = src.match(/note\("<([^"]*)>[^"]*"\)/);
      if (!m) return null;
      let depth = 0, n = 1, prevSpace = true;
      for (const ch of m[1]) {
        if (ch === '[') depth++;
        else if (ch === ']') depth--;
        else if (ch === ' ' && depth === 0) { if (!prevSpace) n++; prevSpace = true; continue; }
        prevSpace = false;
      }
      return n;
    };

    // stab and seasick are deliberately outside this: stab is a within-bar
    // figure, seasick is the mire's own key.
    const onTheProgression = {
      ...BASS, chord: PAD.chord, chordWide: PAD.chordWide,
      lead: LEAD.lead, arp: LEAD.arp, arpOct: LEAD.arpOct, bell: LEAD.bell,
      arpChord: ARP.arpChord, arpBuzz: ARP.arpBuzz, arpSlow: ARP.arpSlow,
    };

    it.each(Object.entries(onTheProgression))('%s spans four bars', (name, src) => {
      expect(cycleLength(src), `${name} is not a 4-bar cycle`).toBe(4);
    });

    it('roots the bass on Am F G Em', () => {
      for (const [name, src] of Object.entries(BASS)) {
        const roots = src.match(/note\("<([a-g]#?b?\d) ([a-g]#?b?\d) ([a-g]#?b?\d) ([a-g]#?b?\d)>/);
        expect(roots, `${name} has no four-root cycle`).not.toBeNull();
        expect(roots.slice(1).map(r => r[0])).toEqual(['a', 'f', 'g', 'e']);
      }
    });
  });

  // "The drums are too dominant" was the verdict on the first full stack.
  // The fix was a set of gain cuts, which is exactly the kind of thing
  // that drifts back the next time a voice is added. The mix budget in
  // the chip.js header states the relationships; these enforce them.
  describe('the mix budget', () => {
    // gain() takes a number, a mini-notation pattern of them
    // (`gain("[.26 .12]*4")`), or a signal (`gain(saw.range(.05,.4))`).
    // Scan for the balanced closing paren rather than regex-matching it:
    // a greedy `[^)]*` runs straight into the *next* call and silently
    // reads .delay(.25) as a gain.
    const argOf = (src, at) => {
      let depth = 0;
      for (let i = at; i < src.length; i++) {
        if (src[i] === '(') depth++;
        else if (src[i] === ')' && --depth === 0) return src.slice(at + 1, i);
      }
      throw new Error('unbalanced gain( in: ' + src.slice(at, at + 40));
    };
    const gainsOf = src => [...src.matchAll(/\.gain\(/g)]
      .map(m => argOf(src, m.index + '.gain'.length))
      // `*4` is a mini-notation repeat and `.slow(16)` a rate — counts, not levels
      .map(a => a.replace(/\*\s*\d+/g, '').replace(/\.\w+\(\s*[\d.]+\s*\)/g, ''))
      .flatMap(t => (t.match(/\d*\.?\d+/g) || []).map(Number));
    const peak = src => Math.max(...gainsOf(src));

    it('finds a gain on every voice it should', () => {
      // guards the regexes above: a silent parse failure would make every
      // assertion below vacuously true
      for (const [name, src] of Object.entries({ ...DRUMS, ...BASS, ...PAD, ...ARP })) {
        expect(gainsOf(src).length, `no gain found in ${name}`).toBeGreaterThan(0);
      }
    });

    it('never lets the kick out-shout the bass', () => {
      expect(peak(DRUMS.kick)).toBeLessThanOrEqual(peak(BASS.roll));
      expect(peak(DRUMS.kickHard)).toBeLessThanOrEqual(peak(BASS.roll));
    });

    it('keeps the hats behind the harmony', () => {
      const hats = Math.max(peak(DRUMS.hatsClosed), peak(DRUMS.hatsOpen));
      expect(hats).toBeLessThan(peak(PAD.chord));
    });

    it('keeps the snare under the kick', () => {
      expect(peak(DRUMS.snare)).toBeLessThan(peak(DRUMS.kick));
    });

    it('keeps every voice under unity', () => {
      for (const [name, src] of Object.entries(CHIP)) {
        for (const g of gainsOf(src)) {
          expect(g, `${name} gain ${g}`).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  it('keeps the era A/B genuinely different', () => {
    // This pair is the answer to "it does not sound 8-bit enough", so a
    // copy-paste slip that made them identical would be quietly useless.
    const { era } = VARIANTS;
    const [before, after] = Object.values(era);
    expect(before).toMatch(/room\(/);       // reverb: the clearest modern tell
    expect(after).not.toMatch(/room\(/);    // rule 3, the one that survived A/B
    expect(after).toMatch(/coarse\(/);      // the grit that replaced crush()
    expect(after).toMatch(/pw\(\.5\)/);     // duty verdict: the plain square
    expect(after).toMatch(/s\("triangle"\)/); // flat-gate triangle bass
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
