# Music plan — Strudel

8-bit house/trance with a unicorn/fantasy bent, driven by
[Strudel](https://strudel.cc) (the browser port of TidalCycles).

Short answer: **yes, this works**, and it fits this codebase unusually
well. There is one licensing decision to make before the game is ever
published, and one architectural fork that can be deferred. Everything
else is straightforward.

---

## 1. What I verified (not guessed)

| Thing | Finding |
|---|---|
| Package | `@strudel/web@1.3.0` — an opinionated bundle of core + mini + tonal + transpiler + webaudio |
| Size | `dist/index.js` (UMD) is 644 KB raw, **209 KB gzipped** |
| Bundler needed? | **No.** The UMD build is a plain `<script src>`; `initStrudel()` lands on `window` |
| External assets | One file: `assets/clockworker-ZDiUtESR.js`, resolved relative to `document.currentScript.src` |
| AudioWorklets | Inlined as blob URLs in the bundle — nothing extra to serve |
| Samples | **None loaded by default.** `registerSynthSounds()` runs in the default prebake; drum samples are opt-in via `samples('github:tidalcycles/dirt-samples')` |
| Offline | Fully offline if we stay synth-only and vendor the bundle |
| Secure context | `audioWorklet` requires one. `http://localhost:9000` qualifies |
| Worker | Uses `SharedWorker` for its clock — fine on desktop Firefox/Chrome; **unsupported on Chrome for Android** |
| Licence | **AGPL-3.0-or-later** |

The last two rows are the only unpleasant ones. See §3.

## 2. Why this fits *this* project

Three things line up better than they had any right to:

1. **No build step, and Strudel doesn't need one.** `index.html` already
   loads a bare ES module. A vendored `<script>` tag before it changes
   nothing about how the project is served.

2. **[audio.js](src/audio.js) already has the right shape.** It creates
   no `AudioContext` at import time, unlocks on first input from
   [input.js:19](src/input.js#L19), and exposes an injectable `fx`
   object so tests pass a recorder instead. Music can copy that pattern
   exactly — Node-safe import, lazy init, injectable backend.

3. **The tracks can be *strings of Strudel code*.** Strudel's
   `evaluate()` runs source with the REPL's own semantics (double quotes
   = mini-notation). So the same text round-trips: compose it live at
   strudel.cc, paste it into `src/music/tracks.js`, and the game plays
   that text verbatim. No translation layer, no divergence between the
   thing you tuned by ear and the thing that ships.

   That last point is the real argument for Strudel over hand-rolling a
   sequencer. The iteration loop for music is *listen, tweak, listen* —
   and Strudel gives us a live one.

## 3. The three things to decide

### 3.1 Licence — decide before publishing, not before trying

Strudel is **AGPL-3.0-or-later**. This repo has no `LICENSE` file today.
If `@strudel/web` ships inside the game and the game is served publicly,
the combined work falls under AGPL's network clause: source must be
offered to players.

For a personal project served from localhost this is a non-issue. It
becomes one the day it goes on a public URL. Three exits, in order of
how much I'd recommend them:

- **Accept AGPL.** Add `LICENSE` (AGPL-3.0), publish the source. The
  source is already plain readable JS with no secrets — the practical
  cost is near zero.
- **Compose in Strudel, ship a transcription.** Use strudel.cc as a
  studio; write the finished patterns into a ~150-line in-house
  sequencer. Zero dependency, zero licence question, but you lose live
  coding in-game. (See §6, M4 gate.)
- **Don't publish.** Perfectly fine if this stays a local toy.

Nothing before milestone M4 forces this choice, and **the expensive work
— the actual music — is portable across all three.**

### 3.2 Samples: none

Recommendation: **synth-only, no `samples()` call.** Reasons: it keeps
the game fully offline, avoids a GitHub fetch on boot, and 8-bit is a
*synthesis* aesthetic anyway — squares, triangles and noise are the
authentic palette, not sampled 909s. §4 builds the whole drum kit from
noise and pitch-enveloped sines.

(If we ever do want samples, `server.mjs`'s MIME map needs `.wav`/`.ogg`
entries — it has none today.)

### 3.3 The clock is not the game loop

Strudel schedules on its own WebAudio clock, independent of the game's
`requestAnimationFrame`. Music transitions therefore land on the next
**cycle boundary**, not the exact frame the player crossed a trigger.

This is a feature. Bar-quantised transitions are what makes a soundtrack
sound composed rather than reactive. But it means "boss music starts the
instant he wakes" is not on offer — it starts on the next bar, up to
~2 s later. Design the cues around that.

---

## 4. The sound — "the Unicorn Queens chip rack"

The genre target: **8-bit house/trance**. Concretely that means
four-on-the-floor kick, an offbeat open hat, a rolling 16th bass, a
dotted-eighth-delayed arpeggio (the trance signature), and long filter
sweeps into breakdowns — all rendered through a chiptune voice palette
of pulse, triangle and noise.

The unicorn/fantasy half comes from harmony, not timbre: **suspended and
add9 chords, lydian brightness on the outdoor levels, and arps that walk
in fourths** rather than the usual minor-triad trance climb. Sparkle
without saccharine.

Verified building blocks (`penv`/`pdecay`, `lpenv`, `crush`, `distort`,
`room`, `delaytime`, `partials`, `vib` are all real Strudel params):

```js
// KICK — pitch-enveloped sine, the house four-on-the-floor
const kick = s("sine*4").note("c1").decay(.13).sustain(0)
               .penv(36).pdecay(.035).distort(1.1).gain(.9)

// HAT — filtered white noise; the offbeat open hat is the house tell
const hats = stack(
  s("white*8").decay(.025).sustain(0).hpf(8000).gain(".5 .3"),
  s("~ white").fast(4).decay(.11).sustain(0).hpf(6500).gain(.42)  // offbeats
)

// CLAP — band-passed noise on 2 and 4
const clap = s("~ white ~ white").decay(.085).sustain(0).bpf(1900).gain(.55)

// BASS — rolling 16ths, plucked with a filter envelope
const bass = note("<a1 a1 f1 g1>*16").s("square")
               .lpf(420).lpenv(3.2).lpdecay(.06).lpq(9)
               .decay(.07).sustain(0).gain(.7)

// LEAD ARP — the trance arp, bit-crushed, dotted-8th delay
const arp  = note("a3 c4 e4 a4 e4 c4".fast(2)).s("square").crush(8)
               .decay(.09).sustain(0).gain(.4)
               .delay(.45).delaytime(.1875).room(.3)

// PAD — a chip "supersaw": stacked squares micro-detuned against each other
const pad  = note("<a3,c4,e4,b4  f3,a3,c4,g4>".add("<0 .08 -.08>"))
               .s("square").attack(.9).release(1.4).lpf(2600)
               .gain(.22).room(.6)
```

Two of these need proving by ear in M2: the `.add()` detune trick for
the pad (Strudel has no `.detune`, so we stack micro-offset copies), and
whether `crush(8)` on the lead reads as "8-bit" or just as "broken".

**Global feel:** `setcpm(124/4)` — 124 BPM in 4/4. House tempo, and slow
enough that 16th arps stay legible under gameplay.

### The nine tracks

Each keyed to the level's existing mood (from the `LEVELn-DESIGN.md`
docs) rather than invented fresh:

| # | Level | BPM | Mode / key | Character |
|---|---|---|---|---|
| 1 | meadow | 118 | A aeolian | Night, sparse. Kick + pad + a two-note arp. The tutorial should breathe. |
| 2 | bridge-castle | 124 | D dorian | The engine starts. Full kit, bass enters at the gate. |
| 3 | undercroft | 126 | E phrygian | Low, torch-lit, ♭2 menace. Bass-forward, arp muted behind a low lpf. |
| 4 | dragons-layer | 128 | C minor | Fastest yet, distorted kick, arp doubled an octave up. |
| 5 | enchanted-forest | 124 | **F lydian** | Daylight. The bright one — ♯4 pad, no distortion, wide reverb. |
| 6 | blackmire | 122 | G minor | Half-time drums under full-time arp. Detuned, swampy, `vib` on the pad. |
| 7 | peak | 130 | A minor → C | **The anthem.** Full trance breakdown at bar 16, riser, drop. |
| 8 | sky-citadel | 132 | D mixolydian | Clockwork: mechanical 16ths, `partials`-built bell lead, gear-tick perc. |
| 9 | frozen-throne | 128 | B♭ minor | Starts almost silent. **Each thaw unlocks a layer** (see below). |

Plus four short cues: `title`, `boss` (a layer, not a track — §5),
`death` (2-bar stinger, then silence), `victory`.

**Level 9 is the one to be excited about.** [thaw.js](src/thaw.js)
already counts hearths lit, and [audio.js:96](src/audio.js#L96) already
pitches its `hum` drone up per thaw. Wiring music intensity to that same
counter means the soundtrack literally thaws as you play: drone → +kick
→ +bass → +arp → +pad, one element per hearth. The mechanic and the
score become the same thing.

---

## 5. Architecture

```
vendor/strudel/index.js                 (vendored UMD, 644 KB)
vendor/strudel/assets/clockworker-*.js  (its SharedWorker; path matters)
src/music.js                            the director  — Node-safe
src/music/tracks.js                     the tracks as Strudel source strings
src/music/chip.js                       shared palette snippets (§4)
music-lab.html                          standalone composition page (not shipped)
```

**`src/music.js` mirrors `audio.js` deliberately:**

```js
// no top-level Strudel import — this module must stay importable in Node
let backend = null;                 // { evaluate, hush } or null

export async function initMusic() { /* lazy: attach window.initStrudel, prebake */ }
export function setTrack(name, opts) { /* no-op until backend exists */ }
export function setIntensity(n) { /* 0..3 — layers in/out */ }
export function duck(on) { /* dialogue open → drop gain */ }
export function stopMusic() { }
export function _setBackend(b) { backend = b; }   // tests inject a recorder
```

That `_setBackend` hook is the same trick `fx` already uses, and it's
what keeps the director **fully unit-testable in Node** with no
`AudioContext` anywhere.

**Call sites** (small, all existing seams):

- [input.js:19](src/input.js#L19) — `initAudio()` already unlocks on
  first key. `initMusic()` goes right beside it. This satisfies the
  autoplay policy for free.
- [game.js:46](src/game.js#L46) `startGame()` — `setTrack(LEVELS[i].name)`.
  It already knows the level index and name.
- [main.js:22](src/main.js#L22) — the death/win branch already exists;
  hang the `death`/`victory` cues there.
- [game.js:92](src/game.js#L92) `update()` — `isDialogueOpen()` is
  already checked on the first line; `duck(true)` there.
- Boss cue: the boss is always the last enemy in a level's spec
  (`kind: 'mage' | 'troll' | 'dragon' | 'warden' | 'queen'` …).
  `setIntensity(3)` when one is alive and on screen.

**Mute:** `M` stays master (music + sfx). Add `N` for music-only, since
you'll want to kill the loop while testing sfx.

**Tests** (`test/music.test.js`):

- every entry in `LEVELS` has a track in the registry;
- the director emits the right calls on level change / death / win /
  boss, against an injected fake backend;
- `import('../src/music.js')` under Node touches no browser globals.

And `npm run smoke` must stay green — that's the real guard, since
[smoke.mjs](smoke.mjs) boots `main.js` under Node with DOM stubs and
would break instantly if music.js reached for `AudioContext`.

---

## 6. Milestones

Staged per [AGENTS.md](AGENTS.md) — one subsystem per turn, stop after each.

**M1 — spike (the go/no-go). ✅ DONE.** Vendored to
[vendor/strudel/](vendor/strudel/) (see
[VENDORED.md](vendor/strudel/VENDORED.md)) and built
[music-lab.html](music-lab.html) — a small live-coding bench rather than
a bare play button, since M2 needs exactly that.

Verified in headless Firefox against the real static server
(`music-lab.html?selftest=1` runs the chain without a click and POSTs
its result):

```
SELFTEST PASS
bundle loaded:      true
initStrudel():      true
SharedWorker avail: true
evaluate():         ok
audio ctx (t=0s):   state=running time=0.187 rate=48000
audio ctx (t=3s):   state=running time=3.184
clock advancing:    true
```

So: the vendored path resolves, the prebake registers the synths, the
`SharedWorker` clock URL resolves from `assets/`, `evaluate()` accepts
REPL-flavoured source, the AudioContext reaches `running`, and the clock
advances in real time. `npm test` (972) and `npm run smoke` still green.

**Not verified: what it sounds like.** That needs ears — open
`http://localhost:9000/music-lab.html` and press play.

**M2 — the chip rack. ◐ built, not yet tuned.**
[src/music/chip.js](src/music/chip.js) holds the palette — 17 voices
across `DRUMS`/`BASS`/`LEAD`/`PAD`/`FX`, plus `stackOf()` to compose
them. The lab imports it, so bench and game read one source of truth.

Two layers of checking, because these fragments are code kept in strings
and nothing else would look at them:

- [test/music-chip.test.js](test/music-chip.test.js) parses every
  fragment with `new Function` (parse only, never run) — catches
  unbalanced parens and broken chains in Node. 34 tests.
- `?selftest=1` now evaluates **all 35 presets in a real Strudel**:
  `presets evaluated: 35/35 ok`. That confirms the parameters exist —
  `penv`, `lpenv`, `lpq`, `partials`, `vib`/`vibmod`, `segment`,
  `crush`, `distort`, `saw`/`sine.range` — which the docs promised but
  no run had shown.

**Then the verdict came back: "it doesn't sound 8-bit enough."** Correct
— the first palette was a modern synth in a chiptune hat. The rewrite
put the hardware's constraints in charge (the four-channel doctrine, in
the chip.js header):

| | before | after |
|---|---|---|
| lead/pad voice | `square` (a 50% pulse — the *least* characteristic NES duty) | `pulse` with `pw(.125)`/`.25`/`.375` |
| chords | real simultaneous triads | arpeggios sweeping 24–96 notes/cycle |
| bass | filtered square with a pluck envelope | triangle, flat gate, no filter |
| space | `room(.6)` reverb | slap `delay`, or nothing |
| grit | `crush` | `coarse` (sample-rate aliasing) |

Chords-as-arpeggios is the big one: two pulse channels cannot voice a
triad, so chip music sweeps it fast enough to fuse. Nothing else reads
as 8-bit so immediately.

**One bug worth remembering.** The first arpeggio used Strudel's
`.arp("up").fast(16)`. It evaluated with no error and produced **zero
events** — silent pads. Every spelling failed, including the documented
`n().chord().arp()` route; `.arp()` throws at query time in this build.
The fix is the explicit `<[a3 c4 e4]*16 ...>`, which is what chip
trackers wrote anyway, and which keeps the chord change independent of
the sweep rate — `.fast()` on the outside speeds the chord changes too
and smears every chord into every cycle.

That is why the selftest now **counts events** instead of trusting
`evaluate()`: `48 events, 48 onsets, max 1 note at once`. Clean
evaluation proves nothing about whether a pattern makes sound.

**The A/B verdict: `era B`, `duty C`, `arpRate D` — and two of the three
doctrine rules lost.**

| rule | proposed | verdict |
|---|---|---|
| 1. narrow pulse widths | `pw(.125)`, the nasal "NES" tone | **rejected** — `pw(.5)`, a plain square, won. Narrow duties survive as accents (`gearTick`, `sparkle`) |
| 2. chords must be arpeggios | the most recognisable 8-bit gesture | **rejected** — the real simultaneous chord won. Arpeggios moved to `ARP` as a per-level texture |
| 3. no reverb | `room()` is the modern tell | **kept** |

Also kept: `coarse()` for the aliasing grit, and the flat-gate triangle
bass. So the *timbre* rules earned their place and the *polyphony* rules
did not — which makes sense, since the four-voice limit is a constraint
we don't actually have. `PAD` is now real chords (default `PAD.chord`),
`ARP` holds the sweeps, and the header in chip.js records the verdict
rather than the theory.

**"The drums are too dominant"** is now a budget in the chip.js header
and four enforced tests, so it can't drift back when a voice is added:
`kick <= bass` and `hats < chords`. Writing the check found two real
breaches — `kickHard` at `.65` against a `.62` bass, and the closed hat
at `.26` against a `.24` chord — both since corrected. (It also found
two bugs in my own gain parser: a greedy regex was reading `.delay(.25)`
as a gain and `[...]*4` as a level of 4.)

42/42 presets evaluate; 1042 tests and smoke green.

**Still open:** the `duty` and `arpRate` sets stay pickable, because
both are worth re-judging once a track is arranged around them rather
than heard in isolation.

**M3 — first track.** Level 1 "meadow", full 32-bar arrangement, as a
Strudel source string. Listen, iterate, lock it. This calibrates every
other track.

**M4 — the director.** `src/music.js` + `tracks.js` + tests. Still not
wired into the game. **Decision gate: §3.1.** Everything up to here is
portable to a hand-rolled sequencer, so this is the last cheap moment to
change course.

**M5 — wire it in.** The call sites in §5. Level transitions, mute keys,
dialogue ducking. Smoke + tests green.

**M6 — intensity.** Layer in/out on boss cues; level 9's thaw-driven
build. This is the milestone that makes it feel like a game soundtrack
rather than a loop.

**M7 — the other eight tracks.** Grind through the table in §4, one
level per turn, plus the four short cues. Update README.

M1–M3 is roughly an evening and gets you something to listen to. M4–M5
is the real engineering, and it's small.

---

## 7. Open questions

1. **Licence** — §3.1. Not blocking until publish, but worth an opinion
   early. My recommendation: accept AGPL and add a `LICENSE` file.
2. **Should music survive a death-restart?** `startGame()` runs on both
   advance and death. Restarting the track on every death gets grating
   fast — I'd keep the track playing across a death within the same
   level, and only re-cue on level change.
3. **Volume balance.** The sfx in `audio.js` are loud (gains up to 0.35)
   and there are ~60 of them. Music will probably need to sit around
   0.25 master with a duck on `boss`/`roar`/`crumble`. Tunable in M5.
