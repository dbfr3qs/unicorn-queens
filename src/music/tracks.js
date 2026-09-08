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

/**
 * The same voice — timbre, envelope, effects, gain — playing different
 * notes.
 *
 * Every voice in chip.js is written in the meadow's home key of A minor,
 * because a palette has to be written in *some* key. The other eight
 * levels each have their own mode (D dorian, E phrygian, F lydian...),
 * and transposing one progression through all of them would make nine
 * levels sound like one tune moved around. So a track supplies its own
 * note content per voice and keeps the sound.
 *
 * Substitutes the first `note("...")`, which is the pitch content of
 * every melodic voice. Do not call it on drums: the kick's first note()
 * is its tuning (`c2`), not a melody.
 */
export function withNotes(src, notes) {
  if (!/note\("[^"]*"\)/.test(src)) throw new Error('voice has no note() to replace: ' + src.slice(0, 40));
  return src.replace(/note\("[^"]*"\)/, `note("${notes}")`);
}

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
 *
 * Contract: the returned program *ends on the pattern expression*, so a
 * caller may append pattern methods to it. src/music.js relies on this
 * to add its master gain (`.mul(gain(...))`). Tested in
 * test/music-tracks.test.js — do not add a trailing statement here.
 */
export function render(track) {
  const notes = track.notes ?? {};
  for (const voice of Object.keys(notes)) {
    if (!(voice in track.layers)) throw new Error(`notes for a voice the track never plays: ${voice}`);
  }
  const layers = Object.entries(track.layers).map(([voice, mask]) => {
    if (!(voice in CHIP)) throw new Error(`unknown chip voice: ${voice}`);
    const src = voice in notes ? withNotes(CHIP[voice], notes[voice]) : CHIP[voice];
    return `  ${src.replace(/\n/g, '\n  ')}\n  .mask("<${bars(mask)}>")`;
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


// ---- level 2: the bridge & the castle -----------------------------------
// 124 BPM, D dorian. The engine starts. Dorian's tell is the major IV
// over a minor i (G over Dm) — brighter than aeolian without being
// cheerful, which suits crossing a moat towards a fight.
//
// Form: the kit is in by bar 5 rather than bar 9. Level 1 earned its slow
// open by being a tutorial; this one should feel like it has somewhere to
// be. The lead trades bars with the arp instead of taking a section.

export const bridgeCastle = {
  bpm: 124,
  layers: {
    //          1-8      9-16     17-24    25-32
    chord:   '11111111 11111111 11111111 11111111',
    kick:    '00001111 11111111 11111111 11111110',
    hatsClosed:'00001111 11111111 11111111 11111100',
    hatsOpen:'00000000 11111111 11111111 11110000',
    snare:   '00000000 11111111 11111111 11111000',
    roll:    '00001111 11111111 11111111 11111111',
    lead:    '00000000 00001111 00001111 00000000',
    arp:     '00000000 11110000 11110000 11111100',
  },
  notes: {
    chord: '<[d3,f3,a3] [g3,b3,d4] [d3,f3,a3] [c3,e3,g3]>',
    roll:  '<d1 g1 d1 c1>*16',
    lead:  '<d4 b4 a4 g4>',
    arp:   '<[d3 f3 a3 d4 a3 f3]*2 [g3 b3 d4 g4 d4 b3]*2 [d3 f3 a3 d4 a3 f3]*2 [c3 e3 g3 c4 g3 e3]*2>',
  },
};

// ---- level 3: the undercroft --------------------------------------------
// 126 BPM, E phrygian. Torch-lit brick, lava fissures, a troll behind a
// one-way door. Phrygian's flat second (F over Em) is the darkest of the
// common modes and does the work here — it is the sound of something
// being wrong.
//
// Form: bass-forward and lead-starved. The melody does not arrive until
// bar 17 and leaves at 24, so most of the level is pulse and menace. The
// chord layer drops out entirely for bars 9-16, which leaves the bass
// exposed — the emptiest the set gets outside level 9's opening.

export const undercroft = {
  bpm: 126,
  layers: {
    //          1-8      9-16     17-24    25-32
    chord:   '11111111 00000000 11111111 11111111',
    kick:    '11111111 11111111 11111111 11111100',
    hatsClosed:'00000000 11111111 11111111 11111100',
    snare:   '00000000 00000000 11111111 11111100',
    roll:    '11111111 11111111 11111111 11111111',
    sub:     '11111111 11111111 00000000 11111111',
    lead:    '00000000 00000000 11111111 00000000',
  },
  notes: {
    chord: '<[e3,g3,b3] [f3,a3,c4] [e3,g3,b3] [d3,f3,a3]>',
    roll:  '<e1 f1 e1 d1>*16',
    sub:   '<e0 f0 e0 d0>',
    lead:  '<e4 f4 b4 a4>',
  },
};

// ---- level 4: the dragon's layer ----------------------------------------
// 128 BPM, C minor. The fastest so far and the first that never really
// lets up: a 14 hp dragon that hovers out of range. Octave-doubled arp
// and the hard kick.
//
// Form: dense from bar 1, with one four-bar hole at 25-28 — the only
// breath in the track, placed so the loop point has somewhere to land.

export const dragonsLayer = {
  bpm: 128,
  layers: {
    //          1-8      9-16     17-24    25-32
    chordWide:'11111111 11111111 11111111 00001111',
    kickHard:'11111111 11111111 11111111 00001111',
    hatsClosed:'11111111 11111111 11111111 00001111',
    hatsOpen:'00000000 11111111 11111111 00000000',
    snare:   '11111111 11111111 11111111 00001111',
    roll:    '11111111 11111111 11111111 11111111',
    arpOct:  '00000000 11111111 11111111 00001111',
    lead:    '00000000 00000000 11111111 00000000',
  },
  notes: {
    chordWide: '<[c3,eb3,g3,bb3] [ab2,c3,eb3,g3] [bb2,d3,f3,ab3] [g2,bb2,d3,f3]>',
    roll:   '<c1 ab0 bb0 g0>*16',
    arpOct: '<[c3 eb3 g3 c4 g3 eb3]*2 [ab2 c3 eb3 ab3 eb3 c3]*2 [bb2 d3 f3 bb3 f3 d3]*2 [g2 bb2 d3 g3 d3 bb2]*2>',
    lead:   '<c5 eb5 d5 bb4>',
  },
};

// ---- level 5: the enchanted forest --------------------------------------
// 124 BPM, F lydian. Outdoors at last: blue sky, a low sun, wildflowers.
// Lydian's raised fourth (B natural over F) is the brightest interval in
// common use and the reason this is the only track in the set that
// sounds happy. The lead sits on that B deliberately.
//
// Form: the lead arrives at bar 9 and mostly stays, which no other level
// does. Nothing here is hiding, so the track does not either.

export const enchantedForest = {
  bpm: 124,
  layers: {
    //          1-8      9-16     17-24    25-32
    chordWide:'11111111 11111111 11111111 11111111',
    sparkle: '10101010 10101010 10001000 10101010',
    kick:    '00001111 11111111 11111111 11111100',
    hatsClosed:'00000001 11111111 11111111 11111100',
    hatsOpen:'00000000 11111111 11111111 11110000',
    snare:   '00000000 11111111 11111111 11111000',
    slow:    '00001111 11111111 11111111 11111111',
    lead:    '00000000 11111111 11111111 11110000',
  },
  notes: {
    chordWide: '<[f3,a3,c4,e4] [g3,b3,d4,f4] [a3,c4,e4,g4] [g3,b3,d4,f4]>',
    slow:  '<f1 g1 a1 g1>*8',
    lead:  '<a4 b4 c5 b4>',
    sparkle: '<a5 c6 e6 b5>*2',
  },
};

// ---- level 6: the blackmire ---------------------------------------------
// 122 BPM, G minor. Swamp gloom, a winch temple, a web wall and the
// Weaver Queen. The kick keeps four-on-the-floor but the backbeat moves
// to the centre of the bar (snareHalf), which halves the *felt* tempo
// without slowing anything down — the track drags while the pulse does
// not, which is what a swamp feels like.
//
// seasick is the palette's own G minor voice, vibrato'd flat; it is here
// rather than a clean chord because the mire should sound slightly
// out of tune.

export const blackmire = {
  bpm: 122,
  layers: {
    //          1-8      9-16     17-24    25-32
    seasick: '11111111 11111111 00000000 11111111',
    kick:    '00001111 11111111 11111111 11111100',
    snareHalf:'00000001 11111111 11111111 11111000',
    hatsClosed:'00000000 00000001 11111111 11110000',
    roll:    '00001111 11111111 00000000 11111111',
    sub:     '11111111 11111111 11111111 11111111',
    lead:    '00000000 00000000 11111111 00000000',
  },
  notes: {
    seasick: '<[g3 bb3 d4]*12 [eb3 g3 bb3]*12 [g3 bb3 d4]*12 [f3 a3 c4]*12>',
    roll: '<g1 eb1 g1 f1>*16',
    sub:  '<g0 eb0 g0 f0>',
    lead: '<g4 bb4 d5 c5>',
  },
};

// ---- level 7: the peak ---------------------------------------------------
// 130 BPM, A minor moving to C. The anthem, and the only track built
// around a proper trance breakdown: everything percussive leaves at bar
// 17, the riser runs 21-24, and the drop lands on 25 with the buzz arp
// and the hard kick together. i - VI - III - VII is the uplifting
// progression, used here without apology.

export const peak = {
  bpm: 130,
  layers: {
    //          1-8      9-16     17-24    25-32
    chordWide:'11111111 11111111 11111111 11111111',
    kickHard:'11111111 11111111 00000000 11111111',
    hatsClosed:'11111111 11111111 00000000 11111111',
    hatsOpen:'00000000 11111111 00000000 11111111',
    snare:   '00000000 11111111 00000000 11111111',
    roll:    '11111111 11111111 00000000 11111111',
    arpBuzz: '00000000 00000000 11111111 11111111',
    riser:   '00000000 00000000 00001111 00000000',
    lead:    '00000000 11111111 00000000 11111111',
  },
  notes: {
    chordWide: '<[a3,c4,e4,g4] [f3,a3,c4,e4] [c3,e3,g3,b3] [g3,b3,d4,f4]>',
    roll: '<a1 f1 c1 g1>*16',
    arpBuzz: '<[a3 c4 e4 b4]*16 [f3 a3 c4 g4]*16 [c3 e3 g3 d4]*16 [g3 b3 d4 a4]*16>',
    lead: '<a4 c5 g4 b4>',
  },
};

// ---- level 8: the sky citadel -------------------------------------------
// 132 BPM, D mixolydian. Clockwork: the Great Clock, gear doors,
// clockwork moths, a keeper who sleeps until the arena wakes him.
// Mixolydian's flat seventh (C major over D) gives it the mechanical,
// unresolved quality of something that turns without arriving.
//
// gearTick runs the whole 32 bars underneath — the machine never stops —
// and the bell carries the melody instead of the pulse lead, because the
// level is about a clock.

export const skyCitadel = {
  bpm: 132,
  layers: {
    //          1-8      9-16     17-24    25-32
    gearTick:'11111111 11111111 11111111 11111111',
    chord:   '11111111 11111111 11111111 11111111',
    kick:    '00001111 11111111 11111111 11111100',
    hatsClosed:'00001111 11111111 11111111 11111100',
    snare:   '00000000 11111111 11111111 11111000',
    pulseBass:'00001111 11111111 11111111 11111111',
    bell:    '00000000 10101010 11111111 10101010',
    arp:     '00000000 00000000 11111111 11111100',
  },
  notes: {
    chord: '<[d3,f#3,a3] [c3,e3,g3] [g3,b3,d4] [d3,f#3,a3]>',
    pulseBass: '<d1 c1 g1 d1>*16',
    bell: '<d5 c5 b5 a5>',
    arp:  '<[d3 f#3 a3 d4 a3 f#3]*2 [c3 e3 g3 c4 g3 e3]*2 [g3 b3 d4 g4 d4 b3]*2 [d3 f#3 a3 d4 a3 f#3]*2>',
  },
};

// ---- level 9: the frozen throne -----------------------------------------
// 128 BPM, B flat minor. The coldest key in the set and the sparsest
// arrangement: the track opens on almost nothing and adds a layer every
// eight bars, so it thaws as it runs.
//
// That shape is deliberate groundwork. thaw.js already counts hearths lit
// and audio.js already pitches its drone up per thaw; when M6 arrives the
// intensity gate can drive these same layers from the hearth count
// instead of from the bar number, and the level's mechanic and its music
// become the same thing.

export const frozenThrone = {
  bpm: 128,
  layers: {
    //          1-8      9-16     17-24    25-32
    sub:     '11111111 11111111 11111111 11111111',
    sparkle: '10001000 10101010 10101010 11111111',
    chord:   '00000000 11111111 11111111 11111111',
    slow:    '00000000 00000000 11111111 11111111',
    kick:    '00000000 00000000 00001111 11111111',
    hatsOpen:'00000000 00000000 00000000 11111111',
    arpChord:'00000000 00000000 00000000 11111111',
  },
  notes: {
    sub:   '<bb0 gb0 ab0 f0>',
    sparkle: '<bb5 db6 f6 ab5>*2',
    chord: '<[bb3,db4,f4] [gb3,bb3,db4] [ab3,c4,eb4] [f3,ab3,c4]>',
    slow:  '<bb1 gb1 ab1 f1>*8',
    arpChord: '<[bb3 db4 f4]*16 [gb3 bb3 db4]*16 [ab3 c4 eb4]*16 [f3 ab3 c4]*16>',
  },
};

// ---- the registry ------------------------------------------------------
// Keyed by LEVELS[].name from src/levels/index.js, and now complete —
// test/music-tracks.test.js checks the two lists against each other, so a
// renamed level fails there rather than going quietly silent in game.
// The director still treats a missing entry as silence rather than an
// error.

export const TRACKS = {
  'meadow': meadow,
  'bridge-castle': bridgeCastle,
  'undercroft': undercroft,
  'dragons-layer': dragonsLayer,
  'enchanted-forest': enchantedForest,
  'blackmire': blackmire,
  'peak': peak,
  'sky-citadel': skyCitadel,
  'frozen-throne': frozenThrone,
};

/** Runnable source for a level name, or null if it has no track yet. */
export function trackFor(levelName) {
  const t = TRACKS[levelName];
  return t ? render(t) : null;
}
