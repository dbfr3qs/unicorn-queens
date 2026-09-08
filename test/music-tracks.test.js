// Tracks are Strudel source strings assembled from chip.js voices, so
// the same rule applies as there: nothing checks them until they reach a
// browser. These cover the assembly; music-lab's ?selftest=1 evaluates
// the result in a real Strudel.
import { describe, it, expect } from 'vitest';
import { TRACKS, meadow, render, trackFor } from '../src/music/tracks.js';
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

describe('the meadow track', () => {
  it('names only real chip voices', () => {
    for (const voice of Object.keys(meadow.layers)) expect(CHIP).toHaveProperty(voice);
  });

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

  it('returns null for a level with no track yet, rather than throwing', () => {
    // M7 fills the rest in; until then the game must stay playable
    expect(trackFor('frozen-throne')).toBeNull();
    expect(trackFor('no-such-level')).toBeNull();
  });
});
