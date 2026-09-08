// The per-level tracks (MUSIC-PLAN.md §4). One entry per level, keyed by
// the name in src/levels/index.js so the director can look a track up
// from the level it is starting.
//
// Like chip.js, everything here is Strudel *source strings* and this
// module imports nothing but chip.js — no Strudel, no AudioContext — so
// it stays importable in Node and unit-testable.
//
// ---- how a track is shaped ---------------------------------------------
// A track is not one pattern but a set of named LAYERS, each with a
// 32-bar mask saying which bars it plays. Two reasons:
//
//   1. Arrangement. A game loop that never changes is unbearable after
//      four minutes; a 32-bar form with parts entering and leaving is
//      not. The mask is the arrangement, written where you can read it.
//   2. M6 wants gameplay to drive intensity (boss arrives, level 9 thaws
//      one hearth at a time). Layers that can already be masked in and
//      out are exactly the handle that needs — intensity becomes a
//      second gate multiplied into the first, with no restructuring.
//
// Masks are strings of 32 ones and zeros, one per bar, laid out in four
// rows of eight so the form is visible at a glance. `.mask("<...>")`
// takes one value per cycle and setcpm() is set so one cycle is one bar.

import { CHIP } from './chip.js';

/** 32 bars, four rows of eight, whitespace-insensitive. */
function bars(mask) {
  const flat = mask.replace(/\s+/g, '');
  if (flat.length !== 32) throw new Error(`mask must be 32 bars, got ${flat.length}`);
  if (!/^[01]+$/.test(flat)) throw new Error(`mask must be 0s and 1s: ${mask}`);
  return flat.split('').join(' ');
}

/**
 * Runnable Strudel source for a track: each layer gated by its mask,
 * stacked, at the track's tempo.
 */
export function render(track) {
  const layers = Object.entries(track.layers).map(([voice, mask]) => {
    if (!(voice in CHIP)) throw new Error(`unknown chip voice: ${voice}`);
    return `  ${CHIP[voice].replace(/\n/g, '\n  ')}\n  .mask("<${bars(mask)}>")`;
  });
  return `setcpm(${track.bpm}/4)\nstack(\n${layers.join(',\n')}\n)`;
}

// ---- level 1: the meadow -----------------------------------------------
// Night, flat, sparse. This is the tutorial level — the player is
// learning to jump and break boxes, so the track has to stay out of the
// way and still be worth hearing on the fifth attempt.
//
// 118 BPM, the slowest in the set. A aeolian on Am - F - G - Em, which is
// the whole palette's home progression.
//
// The form, read down the mask columns:
//
//   bars  1-8   chords and sparkle only. The level opens quiet.
//   bars  9-16  bass and kick enter — the pulse arrives under you.
//   bars 17-24  the lead plays the tune. Not the densest section — the
//               sparkle steps aside for it — but the melodic peak.
//   bars 25-32  lead drops out, hat thins. Room to breathe before the
//               loop, so the repeat lands as a return rather than a seam.
//
// The open hat deliberately runs from bar 9 to bar 28 and stops early:
// four bars of near-silence before the loop point is what keeps a
// 65-second cycle from feeling like a 65-second cycle.

export const meadow = {
  bpm: 118,
  name: 'meadow',
  layers: {
    //          1-8      9-16     17-24    25-32
    chord:   '11111111 11111111 11111111 11111111',
    sparkle: '10001000 10001000 00000000 10001000',
    slow:    '00000000 11111111 11111111 11111111',
    kick:    '00000000 11111111 11111111 11111100',
    hatsOpen:'00000000 11111111 11111111 11110000',
    lead:    '00000000 00000000 11111111 00000000',
  },
};

// ---- the registry ------------------------------------------------------
// Keyed by LEVELS[].name from src/levels/index.js. The remaining eight
// levels are M7; the director (M4) treats a missing entry as silence
// rather than an error, so the game stays playable while this fills in.

export const TRACKS = { meadow };

/** Runnable source for a level name, or null if it has no track yet. */
export function trackFor(levelName) {
  const t = TRACKS[levelName];
  return t ? render(t) : null;
}
