// Tracks are Strudel source strings assembled from chip.js voices, so
// the same rule applies as there: nothing checks them until they reach a
// browser. These cover the assembly; music-lab's ?selftest=1 evaluates
// the result in a real Strudel.
import { describe, it, expect } from 'vitest';
import { TRACKS, meadow, render, trackFor, withNotes } from '../src/music/tracks.js';
import { CHIP } from '../src/music/chip.js';
import { LEVELS } from '../src/levels/index.js';

const parses = src => { new Function(src); };

describe('render', () => {
  it('produces a parseable program at the track tempo', () => {
    const src = render(meadow);
    parses(src);
    expect(src).toMatch(/^setcpm\(118\/4\)\n/);
  });

  it('gates every layer with a 32-bar mask', () => {
    const src = render(meadow);
    const masks = [...src.matchAll(/\.mask\("<([^>]+)>"\)/g)];
    expect(masks).toHaveLength(Object.keys(meadow.layers).length);
    for (const [, m] of masks) expect(m.split(' ')).toHaveLength(32);
  });

  it('ends on the pattern expression, so a caller can append methods', () => {
    // src/music.js appends .mul(gain(...)) for its master volume. If
    // render() ever ended on a statement instead, that would become a
    // syntax error at playback and nowhere else.
    parses(`${render(meadow)}\n  .mul(gain(0.5))`);
  });

  it('rejects a mask that is not 32 bars', () => {
    expect(() => render({ bpm: 118, layers: { kick: '1111' } }))
      .toThrow(/32 bars, got 4/);
  });

  it('rejects a mask containing anything but 0 and 1', () => {
    // a stray character would otherwise become mini-notation and play
    expect(() => render({ bpm: 118, layers: { kick: '1111111x' + '1'.repeat(24) } }))
      .toThrow(/0s and 1s/);
  });

  it('throws on an unknown voice rather than dropping the layer', () => {
    expect(() => render({ bpm: 118, layers: { tuba: '1'.repeat(32) } }))
      .toThrow(/unknown chip voice: tuba/);
  });

  it('ignores whitespace in a mask, so it can be laid out in rows', () => {
    const rows = render({ bpm: 118, layers: { kick: '11111111 11111111 11111111 11111111' } });
    const flat = render({ bpm: 118, layers: { kick: '1'.repeat(32) } });
    expect(rows).toBe(flat);
  });
});

describe('every track', () => {
  const all = Object.entries(TRACKS);

  it.each(all)('%s names only real chip voices', (_n, track) => {
    for (const voice of Object.keys(track.layers)) expect(CHIP).toHaveProperty(voice);
  });

  it.each(all)('%s lays its masks out in four rows of eight', (_n, track) => {
    // bars() ignores whitespace, so a misgrouped mask still *works* — it
    // just stops being readable, which is the only reason the layout
    // exists. Six of them were wrong when first written.
    for (const [voice, mask] of Object.entries(track.layers)) {
      expect(mask.split(/\s+/).map(g => g.length), `${voice}`).toEqual([8, 8, 8, 8]);
    }
  });

  it.each(all)('%s gives a tempo in the house/trance range', (_n, track) => {
    expect(track.bpm).toBeGreaterThanOrEqual(115);
    expect(track.bpm).toBeLessThanOrEqual(135);
  });

  it.each(all)('%s only overrides notes for voices it actually plays', (_n, track) => {
    for (const voice of Object.keys(track.notes ?? {})) {
      expect(Object.keys(track.layers)).toContain(voice);
    }
  });

  it.each(all)('%s never re-pitches a drum voice', (_n, track) => {
    // the kick's first note() is its tuning, not a melody: substituting
    // there would silently detune the drum rather than transpose a part
    for (const voice of Object.keys(track.notes ?? {})) {
      expect(['kick', 'kickHard', 'snare', 'snareHalf', 'hatsOpen', 'hatsClosed', 'gearTick'])
        .not.toContain(voice);
    }
  });

  it.each(all)('%s starts quieter than it finishes somewhere in the form', (_n, track) => {
    // an all-ones track is the looping stack the 32-bar form replaced
    const masks = Object.values(track.layers).map(m => m.replace(/\s/g, ''));
    expect(masks.every(m => m === '1'.repeat(32))).toBe(false);
  });
});

describe('withNotes', () => {
  it('keeps the voice and swaps the pitches', () => {
    const out = withNotes(CHIP.chord, '<[d3,f3,a3]>');
    expect(out).toContain('[d3,f3,a3]');
    expect(out).toContain('pw(.5)');      // timbre survives
    expect(out).toContain('gain(.24)');   // and so does the mix budget
  });

  it('replaces only the first note(), so a tuned drum keeps its tuning', () => {
    expect(() => withNotes(CHIP.hatsClosed, '<a3>')).toThrow(/no note\(\) to replace/);
  });
});

describe('the meadow track', () => {
  it('starts sparse and never runs the whole 32 bars flat out', () => {
    // The point of the form: if every layer were all-ones this would be
    // the looping stack it replaced.
    const masks = Object.values(meadow.layers);
    expect(masks.some(m => m.replace(/\s/g, '').startsWith('0'))).toBe(true);
    expect(masks.every(m => m.replace(/\s/g, '') === '1'.repeat(32))).toBe(false);
  });

  it('leaves the lead out of the final section, so the loop breathes', () => {
    expect(meadow.layers.lead.replace(/\s/g, '').slice(24)).toBe('00000000');
  });
});

describe('the registry', () => {
  it('keys tracks by names that levels/index.js actually uses', () => {
    // a typo here means silence in game and nothing anywhere else
    const levelNames = LEVELS.map(l => l.name);
    for (const key of Object.keys(TRACKS)) expect(levelNames).toContain(key);
  });

  it('returns runnable source for a level that has a track', () => {
    parses(trackFor('meadow'));
  });

  it('covers every level in the game', () => {
    // the point of M7. A level with no entry plays silence, which is easy
    // to not notice — so assert the two lists match exactly.
    expect(Object.keys(TRACKS).sort()).toEqual(LEVELS.map(l => l.name).sort());
  });

  it('returns runnable source for every level', () => {
    for (const level of LEVELS) parses(trackFor(level.name));
  });

  it('returns null for a name that is not a level, rather than throwing', () => {
    expect(trackFor('no-such-level')).toBeNull();
  });
});
