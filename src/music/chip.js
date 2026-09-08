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
//
// ---- the four-channel doctrine ----------------------------------------
// The first pass of this palette sounded like a modern synth wearing a
// chiptune hat. The fix was to stop decorating and start obeying the
// hardware. An NES has exactly four voices:
//
//   2x pulse    duty-cycle switchable: 12.5%, 25%, 50%
//   1x triangle fixed volume, no envelope — hence its flat, buzzy bass
//   1x noise    the entire drum kit
//
// Three rules were proposed from that, and then A/B'd by ear. Two lost.
// What follows is the verdict, not the theory — where they disagree the
// ear wins, because this is a soundtrack and not a hardware emulator.
//
//   1. REJECTED — "use narrow pulse widths". pw(.125) is the thin nasal
//      tone that reads most obviously as "NES", but pw(.5) — a plain
//      square, supposedly the least characteristic setting — was the
//      one that actually sounded better here. It is fuller and sits
//      under gameplay without whining. Narrow duties survive as accent
//      colours (gearTick, sparkle), not as the default.
//
//   2. REJECTED — "chords must be arpeggios". The hardware could not
//      voice a triad, so chip music swept it fast enough to fuse. It is
//      the most recognisable 8-bit gesture and it lost anyway: the real
//      simultaneous chord was preferred. Arpeggios stay in ARP below as
//      a texture to reach for per level, not as the way chords are
//      spelled. A four-voice limit is a constraint we do not have and
//      pretending otherwise cost more than it bought.
//
//   3. KEPT — no reverb. room() is the clearest modern tell of the
//      three. Space is a short slap delay, or nothing.
//
// Also kept: coarse(), which aliases the high harmonics and is where the
// digital grit actually comes from (crush() alone does not get you
// there), and the triangle-with-a-flat-gate bass.
//
// The useful summary: the *timbre* rules earned their place, the
// *polyphony* rules did not. VARIANTS at the bottom keeps every
// alternative pickable so this stays re-judgeable rather than settled by
// argument.
//
// ---- the mix budget ----------------------------------------------------
// Drums were dominating the first full stack. Gains are budgeted by role
// so new voices do not drift back into that; keep new entries inside the
// band for their row.
//
//   kick          .55-.65
//   snare         .28-.34
//   hats          .08-.20     stays under the chords
//   bass          .40-.62     carries the tune as much as the lead does
//   chords / arps .18-.28
//   lead          .28-.38     sits just above the chords
//   accents       .05-.16     gearTick, sparkle
//
// The absolute numbers matter less than two relationships, which are the
// actual content of "the drums are too dominant" and are enforced in
// test/music-chip.test.js so they cannot drift back:
//
//   kick <= bass     percussion never louder than the thing playing the tune
//   hats <  chords   the top end stays behind the harmony
//
// These are pre-master: MUSIC-PLAN.md §7 still has the game-vs-sfx
// balance to settle, and the whole stack will likely sit near .25.

// ---- drums -------------------------------------------------------------
// All percussion is synthesised: pitch-enveloped sines and filtered
// noise. Nothing is sampled, which keeps the game fully offline (no
// samples() call, so initStrudel()'s prebake fetches nothing) and is
// also the honest 8-bit approach — the chips had a noise channel, not a
// drum machine.

export const DRUMS = {
  // The chip had no kick, so a kick is a pitch envelope on a tuned
  // voice: a triangle dropped two and a half octaves in 30 ms. coarse()
  // is what separates this from a modern sine kick — the aliasing gives
  // it the hard digital edge.
  kick: `s("triangle*4").note("c2")
  .attack(.001).decay(.11).sustain(0)
  .penv(30).pdecay(.03)
  .coarse(2).distort(1.2).gain(.6)`,

  // Harder variant for the boss layer and the faster levels.
  kickHard: `s("triangle*4").note("c2")
  .attack(.001).decay(.09).sustain(0)
  .penv(36).pdecay(.024)
  .coarse(3).distort(2).gain(.62)`,

  // The noise channel is the whole kit, so the hats are deliberately
  // crunchy rather than silky: coarse() to drop the rate, and no
  // careful band-passing. Accents keep it from machine-gunning.
  hatsClosed: `s("white*8").decay(.02).sustain(0)
  .coarse(7).hpf(6000).gain("[.2 .1]*4")`,

  // The offbeat open hat — the most house-defining element here. Lands
  // on the "and" of every beat, between the kicks.
  hatsOpen: `s("~ white").fast(4).decay(.09).sustain(0)
  .coarse(7).hpf(4800).gain(.18)`,

  // Snare/clap on 2 and 4. One crunchy noise burst, no pitched layer —
  // a second voice for the snare is a luxury four channels do not have.
  snare: `s("~ white ~ white").decay(.1).sustain(0)
  .coarse(5).bpf(1600).distort(1.3).gain(.3)`,

  // Half-time: the backbeat moves to bar-centre, which halves the
  // perceived tempo without touching the kick. Level 6's swamp drag.
  snareHalf: `s("~ ~ white ~").decay(.14).sustain(0)
  .coarse(5).bpf(1400).distort(1.2).gain(.3)`,

  // Level 8's clockwork tick: a 12.5% pulse at the top of its range,
  // clipped to almost nothing.
  gearTick: `s("pulse*16").note("c7").pw(.125)
  .attack(.001).decay(.008).sustain(0)
  .gain("[.12 .05 .08 .05]*4").coarse(3)`,
};

// ---- bass --------------------------------------------------------------

export const BASS = {
  // The triangle channel, which on real hardware had no volume envelope
  // at all — notes simply switch on and off. That flat gate is most of
  // why chip bass sounds the way it does, so the envelope here is a
  // near-square gate rather than the plucky filter sweep a house bass
  // would normally get.
  roll: `note("<a1 f1 g1 e1>*16").s("triangle")
  .attack(.001).decay(.03).sustain(.9).release(.01)
  .coarse(2).gain(.62)`,

  // Half-time cousin for the sparse levels (1, and 9's opening).
  slow: `note("<a1 f1 g1 e1>*8").s("triangle")
  .attack(.001).decay(.03).sustain(.9).release(.01)
  .coarse(2).gain(.5)`,

  // A 25% pulse bass instead of the triangle: reedier, cuts harder
  // through a busy mix. Mega Man rather than Super Mario Bros.
  pulseBass: `note("<a1 f1 g1 e1>*16").s("pulse").pw(.25)
  .attack(.001).decay(.04).sustain(.7).release(.01)
  .coarse(2).gain(.5)`,

  // Sub: an octave down, flat. Weight rather than motion. Strictly this
  // is a fifth channel the NES never had — use it sparingly.
  sub: `note("<a0 f0 g0 e0>").s("triangle")
  .attack(.001).sustain(1).release(.02).gain(.4)`,
};

// ---- lead ---------------------------------------------------------------

export const LEAD = {
  // The melody voice. pw(.5) per the duty verdict — fuller than the
  // narrow duties and it stays audible over the drums without having to
  // be loud. delaytime(.1875) is a dotted eighth at 4 cycles to the bar —
  // the trance delay, kept because the echoes land between the notes.
  // A slap delay is period-plausible in a way reverb is not.
  lead: `note("<a4 c5 b4 g4>").s("pulse").pw(.5)
  .attack(.001).decay(.04).sustain(.8).release(.02)
  .vib(6).vibmod(.15)
  .coarse(2).gain(.3)
  .delay(.3).delaytime(.1875).delayfeedback(.28)`,

  // The trance arp, now on a 25% pulse instead of a square.
  arp: `note("<[a3 c4 e4 a4 e4 c4]*2 [f3 a3 c4 f4 c4 a3]*2 [g3 b3 d4 g4 d4 b3]*2 [e3 g3 b3 e4 b3 g3]*2>").s("pulse").pw(.25)
  .attack(.001).decay(.05).sustain(0)
  .coarse(2).gain(.38)
  .delay(.4).delaytime(.1875).delayfeedback(.3)`,

  // Octave-doubled, for level 4 and the boss layer.
  arpOct: `note("<[a3 c4 e4 a4 e4 c4]*2 [f3 a3 c4 f4 c4 a3]*2 [g3 b3 d4 g4 d4 b3]*2 [e3 g3 b3 e4 b3 g3]*2>").add(note("<0 12>")).s("pulse").pw(.25)
  .attack(.001).decay(.05).sustain(0)
  .coarse(2).gain(.32)
  .delay(.4).delaytime(.1875).delayfeedback(.3)`,

  // Level 8's clockwork bell. partials() builds it additively, which is
  // the one voice here that a real NES could not have produced — kept
  // because the level is about a clock, not about 1985.
  bell: `note("<a5 c5 b5 g5>").s("sine").partials("1 .5 .25 .35 .1")
  .decay(.6).sustain(0).gain(.3)
  .delay(.35).delaytime(.125).delayfeedback(.35)`,

  // Level 9's thaw sparkle: high, brief, panned. A 12.5% pulse at the
  // top of the range glitters without needing reverb to do it.
  sparkle: `note("<a5 c6 e6 b5>*2").s("pulse").pw(.125)
  .attack(.001).decay(.09).sustain(0).gain(.15)
  .coarse(2)
  .delay(.45).delaytime(.125).delayfeedback(.4)
  .pan(sine.range(.25,.75).slow(5))`,
};

// ---- chords ------------------------------------------------------------
// Doctrine rule 2 was rejected: the plain simultaneous chord beat every
// arpeggio rate in the A/B, so this is the default harmony voice and the
// sweeps live in ARP below. pw(.5) follows the same verdict as the lead.
//
// No reverb (rule 3 stands) — depth comes from the slap delay and from
// keeping the voicing low and narrow.

export const PAD = {
  // The default. Four bars, one chord each.
  chord: `note("<[a3,c4,e4] [f3,a3,c4] [g3,b3,d4] [e3,g3,b3]>")
  .s("pulse").pw(.5)
  .attack(.02).decay(.3).sustain(.55).release(.25)
  .coarse(2).gain(.24)
  .delay(.25).delaytime(.375).delayfeedback(.2)`,

  // Wider voicing with the 7th on top, for the big levels (7, 8).
  chordWide: `note("<[a3,c4,e4,g4] [f3,a3,c4,e4] [g3,b3,d4,f4] [e3,g3,b3,d4]>")
  .s("pulse").pw(.5)
  .attack(.02).decay(.3).sustain(.5).release(.3)
  .coarse(2).gain(.2)
  .delay(.25).delaytime(.375).delayfeedback(.2)`,

  // Stabs rather than a bed: the house chord on the offbeat.
  stab: `note("~ [a3,c4,e4] ~ [g3,b3,d4]")
  .s("pulse").pw(.5)
  .attack(.001).decay(.12).sustain(0)
  .coarse(2).gain(.26)
  .delay(.3).delaytime(.1875).delayfeedback(.25)`,
};

// ---- arpeggios ---------------------------------------------------------
// Kept as a *texture* to reach for per level, not as the way chords are
// spelled — see doctrine rule 2 above. Still the most recognisable 8-bit
// gesture when a level wants it (9's thaw, 6's mire).
//
// Spelled as an explicit sequence, `<[a3 c4 e4]*16 [f3 a3 c4]*16>`,
// rather than with Strudel's .arp(). Two reasons:
//
//   1. .arp() throws at query time here — every spelling tried,
//      including the documented n().chord().arp() route, returns zero
//      events. It evaluates without error and then plays silence, which
//      is why music-lab's selftest counts events rather than trusting
//      evaluate() to have worked.
//   2. The explicit form is what chip trackers actually wrote, and it
//      keeps the chord change and the sweep rate independent. Putting
//      the rate inside the brackets is load-bearing: `.fast(16)` on the
//      outside speeds up the *chord changes* too, smearing both chords
//      into every cycle.
//
// The `*N` is sweeps of the figure per cycle, so a triad at *16 is 48
// notes a cycle — around 25 a second at house tempo. The rate is the
// whole character:
//
//   *32  a solid buzz — you hear a chord, not notes (nearest the real
//        hardware, which swept at 50-60 Hz)
//   *16  the classic NES shimmer, notes just distinguishable
//   *8   an audible arpeggio figure

export const ARP = {
  // Fuses into a chord, keeps a visible flutter.
  arpChord: `note("<[a3 c4 e4]*16 [f3 a3 c4]*16 [g3 b3 d4]*16 [e3 g3 b3]*16>")
  .s("pulse").pw(.25)
  .attack(.001).decay(.02).sustain(.75).release(.01)
  .coarse(2).gain(.24)`,

  // Faster and thinner: a solid harmonic wash for busy sections.
  arpBuzz: `note("<[a3 c4 e4 b4]*32 [f3 a3 c4 g4]*32 [g3 b3 d4 a4]*32 [e3 g3 b3 f4]*32>")
  .s("pulse").pw(.125)
  .attack(.001).decay(.015).sustain(.7).release(.01)
  .coarse(2).gain(.18)`,

  // Slow enough to hear as a figure rather than a texture — for sparse
  // levels where the arpeggio should be a part, not a bed. Up-and-down
  // rather than straight up, so it reads as a melody.
  arpSlow: `note("<[a3 c4 e4 c4]*8 [f3 a3 c4 a3]*8 [g3 b3 d4 b3]*8 [e3 g3 b3 g3]*8>")
  .s("pulse").pw(.25)
  .attack(.001).decay(.04).sustain(.5).release(.01)
  .coarse(2).gain(.26)`,

  // The swamp/mire colour: slow vibrato detunes the whole figure, which
  // is period-plausible (pitch modulation was cheap) where a filtered
  // pad would not be.
  seasick: `note("<[g3 bb3 d4]*12 [eb3 g3 bb3]*12>")
  .s("pulse").pw(.375)
  .attack(.001).decay(.03).sustain(.6).release(.01)
  .vib(.7).vibmod(.4)
  .coarse(3).gain(.22)`,
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

// The one that answers "is it 8-bit enough yet" directly: the same
// harmony, four bars, played the old way and the new way.
const HARMONY = '<[a3,c4,e4] [f3,a3,c4] [g3,b3,d4] [e3,g3,b3]>';

export const VARIANTS = {
  // Rule 1: duty cycle. Same notes throughout, four chip characters.
  // C won — the plain square. Left here because it is the cheapest dial
  // in the rack and worth re-judging once a track is arranged around it.
  duty: {
    'A — pw .125, thin and nasal (most "NES")': `note("<a4 e4 c5 e4>*4").s("pulse").pw(.125)
  .attack(.001).decay(.04).sustain(.8).release(.02).coarse(2).gain(.3)`,
    'B — pw .25, reedy (the workhorse)': `note("<a4 e4 c5 e4>*4").s("pulse").pw(.25)
  .attack(.001).decay(.04).sustain(.8).release(.02).coarse(2).gain(.3)`,
    'C — pw .5, a plain square — WINNER, now the default': `note("<a4 e4 c5 e4>*4").s("pulse").pw(.5)
  .attack(.001).decay(.04).sustain(.8).release(.02).coarse(2).gain(.3)`,
    'D — pw swept, the duty-modulation whine': `note("<a4 e4 c5 e4>*4").s("pulse").pw(.5).pwrate(1.5).pwsweep(.4)
  .attack(.001).decay(.04).sustain(.8).release(.02).coarse(2).gain(.3)`,
  },

  // Rule 2: how hard the arpeggio fuses. D was the control — the chord
  // played as an actual chord, which the hardware could not do — and D
  // won, so the doctrine lost and PAD.chord is the default. A-C survive
  // as ARP, a per-level texture.
  arpRate: {
    'A — *32, fuses into a chord (nearest real hardware)': ARP.arpBuzz,
    'B — *16, classic shimmer': ARP.arpChord,
    'C — *8, audible figure': ARP.arpSlow,
    'D — no arpeggio, real simultaneous chord — WINNER, now PAD.chord':
      `note("${HARMONY}").s("pulse").pw(.25)
  .attack(.001).decay(.03).sustain(.7).release(.02).coarse(2).gain(.24)`,
  },

  // Rule 3 plus the rest of it: the before/after for your actual note.
  // Same harmony, same tempo — only the doctrine differs.
  era: {
    'A — before: detuned square pad, reverb, filter envelopes':
      `stack(
    s("sine*4").note("c1").decay(.13).sustain(0).penv(36).pdecay(.035).distort(1.1).gain(.85),
    s("white*8").decay(.025).sustain(0).hpf(8000).gain("[.5 .3]*4"),
    note("<a1 a1 f1 g1>*16").s("square").lpf(420).lpenv(3.2).lpdecay(.06).lpq(9)
      .decay(.07).sustain(0).gain(.7),
    note("${HARMONY}".add("<0 .08 -.08>")).s("square")
      .attack(.9).release(1.4).lpf(2600).gain(.22).room(.6)
  )`,
    'B — after: pulse duty, arpeggiated chords, coarse, no reverb':
      `stack(
    ${DRUMS.kick},
    ${DRUMS.hatsClosed},
    ${BASS.roll},
    ${PAD.chord}
  )`,
  },
};

// ---- composition -------------------------------------------------------

/** All voices, flat, by name. */
export const CHIP = { ...DRUMS, ...BASS, ...LEAD, ...PAD, ...ARP, ...FX };

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
