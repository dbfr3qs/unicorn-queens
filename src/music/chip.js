// The Unicorn Queens chip rack: the shared voice palette for the
// soundtrack (MUSIC-PLAN.md §4), as Strudel *source strings*.
//
// Strings rather than Strudel pattern objects, on purpose:
//
//   1. This module stays importable in Node. It imports nothing, touches
//      no AudioContext, and has no idea Strudel exists — so the track
//      registry can be unit-tested and smoke.mjs keeps passing.
//   2. Every fragment pastes straight into strudel.cc and back. The text
//      tuned by ear in the REPL is the text that ships; there is no
//      translation step to drift out of sync.
//
// Each fragment is a bare *expression* (no setcpm, no trailing
// semicolon) so it composes into stack(). Build runnable source with
// stackOf() below.
//
// The genre target is 8-bit house/trance: four-on-the-floor kick,
// offbeat open hat, rolling 16th bass, dotted-eighth-delayed arp. The
// unicorn half comes from harmony rather than timbre — sus/add9
// voicings and lydian brightness — so the voices here stay deliberately
// plain and the colour arrives in the per-level tracks.

// ---- drums -------------------------------------------------------------
// All percussion is synthesised: pitch-enveloped sines and filtered
// noise. Nothing is sampled, which keeps the game fully offline (no
// samples() call, so initStrudel()'s prebake fetches nothing) and is
// also the honest 8-bit approach — the chips had a noise channel, not a
// drum machine.

export const DRUMS = {
  // Four-on-the-floor. penv(36)/pdecay(.035) is the whole trick: a
  // three-octave pitch drop over 35 ms reads as a kick rather than a
  // low blip. distort adds the click that cuts through the bass.
  kick: `s("sine*4").note("c1")
  .decay(.13).sustain(0)
  .penv(36).pdecay(.035)
  .distort(1.1).gain(.9)`,

  // Harder variant for the boss layer and the faster levels: shorter
  // decay, deeper drop, more grit.
  kickHard: `s("sine*4").note("c1")
  .decay(.1).sustain(0)
  .penv(42).pdecay(.028)
  .distort(1.8).gain(.95)`,

  // Closed 16ths with an accent pattern, so the hat breathes instead of
  // machine-gunning.
  hatsClosed: `s("white*8").decay(.025).sustain(0).hpf(8000).gain("[.5 .3]*4")`,

  // The offbeat open hat — the single most house-defining element here.
  // Lands on the "and" of every beat, between the kicks.
  hatsOpen: `s("~ white").fast(4).decay(.11).sustain(0).hpf(6500).gain(.42)`,

  // Band-passed noise on 2 and 4. Reads as a clap in context.
  clap: `s("~ white ~ white").decay(.085).sustain(0).bpf(1900).gain(.55)`,

  // Snare: lower and longer than the clap, with a pitched body under the
  // noise so it carries on small speakers.
  snare: `stack(
    s("~ white ~ white").decay(.11).sustain(0).bpf(1400).gain(.5),
    s("~ triangle ~ triangle").note("d3").decay(.07).sustain(0).gain(.25)
  )`,

  // Level 8's clockwork tick — dry, tiny, metallic. Sits under the kit.
  gearTick: `s("square*16").note("c7").decay(.008).sustain(0)
  .gain("[.18 .07 .11 .07]*4").hpf(4000).pan(sine.range(.35,.65).slow(3))`,
};

// ---- bass --------------------------------------------------------------

export const BASS = {
  // The trance engine: 16ths with a fast filter envelope, so each note
  // plucks. lpq(9) gives the resonant bite; without it this is mud.
  roll: `note("<a1 a1 f1 g1>*16").s("square")
  .lpf(420).lpenv(3.2).lpdecay(.06).lpq(9)
  .decay(.07).sustain(0).gain(.7)`,

  // Half-time cousin for the sparse levels (1, 9's opening).
  slow: `note("<a1 a1 f1 g1>*8").s("square")
  .lpf(380).lpenv(3).lpdecay(.06).lpq(8)
  .decay(.07).sustain(0).gain(.5)`,

  // Sub: a clean triangle an octave down, no filter movement. Layer it
  // under roll when a level needs weight rather than motion.
  sub: `note("<a0 a0 f0 g0>").s("triangle").decay(.5).sustain(.2).gain(.45)`,
};

// ---- lead / arp --------------------------------------------------------

export const LEAD = {
  // The trance arp. delaytime(.1875) is a dotted eighth at 4 cycles per
  // bar — the delay that makes trance sound like trance, because the
  // echoes land between the notes instead of on them.
  arp: `note("a3 c4 e4 a4 e4 c4".fast(2)).s("square").crush(8)
  .decay(.09).sustain(0).gain(.4)
  .delay(.45).delaytime(.1875).room(.3)`,

  // Octave-doubled, for level 4 and the boss layer.
  arpOct: `note("a3 c4 e4 a4 e4 c4".fast(2)).add(note("<0 12>")).s("square").crush(8)
  .decay(.09).sustain(0).gain(.34)
  .delay(.45).delaytime(.1875).room(.3)`,

  // A sparse bell built additively rather than by filtering — partials
  // gives the inharmonic ring that suits level 8's clockwork.
  bell: `note("<a5 e5 c5 e5>").s("sine").partials("1 .5 .25 .35 .1")
  .decay(.6).sustain(0).gain(.3).room(.6)`,

  // Level 9's thaw sparkle: high, brief, wide.
  sparkle: `note("<a5 c6 e6 b5>*2").s("triangle")
  .decay(.12).sustain(0).gain(.16)
  .delay(.5).delaytime(.125).room(.7).pan(sine.range(.2,.8).slow(5))`,
};

// ---- pads --------------------------------------------------------------
// Strudel has no .detune, so a chip "supersaw" is stacked copies of the
// same voicing pushed a few cents apart with .add(). The beating between
// them is the width. See VARIANTS.pad — which spacing actually sounds
// good is an ear question, not a code question.

export const PAD = {
  // Three copies at ±8 cents. The default.
  wide: `note("<[a3,c4,e4,b4] [f3,a3,c4,g4]>".add("<0 .08 -.08>"))
  .s("square").attack(.9).release(1.4)
  .lpf(2600).gain(.22).room(.6)`,

  // Single copy, no detune — clean and small. For sparse levels where
  // the pad should sit behind everything.
  plain: `note("<[a3,c4,e4] [f3,a3,c4] [g3,b3,d4] [e3,g3,b3]>")
  .s("square").attack(.9).release(1.6)
  .lpf(2200).gain(.18).room(.7)`,

  // Slow vibrato instead of detune — the swamp/mire colour.
  seasick: `note("<[g3,bb3,d4] [eb3,g3,bb3]>")
  .s("square").attack(1.2).release(1.8)
  .vib(.6).vibmod(.35)
  .lpf(1800).gain(.2).room(.75)`,
};

// ---- transitions -------------------------------------------------------

export const FX = {
  // 16-cycle noise sweep: the breakdown riser. Park it under the last
  // bars before a drop.
  riser: `s("white").segment(32).decay(.08).sustain(0)
  .hpf(saw.range(200,9000).slow(16))
  .gain(saw.range(.05,.4).slow(16))`,

  // Downward sweep for entering a quiet section.
  faller: `s("white").segment(16).decay(.1).sustain(0)
  .hpf(saw.range(9000,200).slow(8))
  .gain(saw.range(.3,.05).slow(8))`,
};

// ---- the open questions ------------------------------------------------
// Two choices from M1 that code cannot settle — they need ears. Each
// entry is a set of alternatives for the same slot, surfaced in
// music-lab.html as an A/B/C picker. Pick a winner in M2 and fold it
// back into PAD/LEAD above.

export const VARIANTS = {
  pad: {
    'A — ±8 cents (current default)': PAD.wide,
    'B — ±20 cents, wider beating': `note("<[a3,c4,e4,b4] [f3,a3,c4,g4]>".add("<0 .2 -.2>"))
  .s("square").attack(.9).release(1.4)
  .lpf(2600).gain(.22).room(.6)`,
    'C — ±8 cents + octave, 5 voices': `note("<[a3,c4,e4,b4] [f3,a3,c4,g4]>".add("<0 .08 -.08 12.04 -11.96>"))
  .s("square").attack(.9).release(1.4)
  .lpf(2600).gain(.18).room(.6)`,
    'D — no detune, sawtooth instead': `note("<[a3,c4,e4,b4] [f3,a3,c4,g4]>")
  .s("sawtooth").attack(.9).release(1.4)
  .lpf(2200).gain(.2).room(.6)`,
  },
  arp: {
    'A — crush(8) (current default)': LEAD.arp,
    'B — crush(4), harsher': LEAD.arp.replace('crush(8)', 'crush(4)'),
    'C — crush(12), barely there': LEAD.arp.replace('crush(8)', 'crush(12)'),
    'D — no crush, clean square': LEAD.arp.replace('.crush(8)', ''),
  },
};

// ---- composition -------------------------------------------------------

/** All voices, flat, by name. */
export const CHIP = { ...DRUMS, ...BASS, ...LEAD, ...PAD, ...FX };

/** `setcpm` line for a tempo in BPM, assuming 4/4 (4 beats per cycle). */
export function cpm(bpm) {
  return `setcpm(${bpm}/4)`;
}

/**
 * Runnable Strudel source stacking the named voices at `bpm`.
 * Unknown names throw — a typo in a track definition should fail loudly
 * in a unit test, not go silently missing at playback.
 */
export function stackOf(bpm, names) {
  const missing = names.filter(n => !(n in CHIP));
  if (missing.length) throw new Error(`unknown chip voice(s): ${missing.join(', ')}`);
  const body = names.map(n => CHIP[n].replace(/^/gm, '  ')).join(',\n');
  return `${cpm(bpm)}\nstack(\n${body}\n)`;
}
