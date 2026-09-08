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

**The palette now lives in [src/music/chip.js](src/music/chip.js)** —
this section's original sketches are superseded by it, and by the A/B
verdicts in M2c below. The short version of what survived contact with
ears:

- `s("pulse").pw(.5)` for lead and chords, not narrow duties
- real simultaneous chords, not arpeggios (arpeggios kept in `ARP` as a
  per-level texture)
- triangle bass with a flat gate, no filter envelope
- `coarse()` for grit, and **no `room()`** — reverb is the clearest
  modern tell
- every default voice on one progression, Am - F - G - Em

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

**M3 — first track. ◐ built, needs a listen.**
[src/music/tracks.js](src/music/tracks.js) holds the level 1 "meadow"
arrangement and the machinery the other eight will reuse.

A track is **not one pattern** but named layers, each with a 32-bar mask
of ones and zeros laid out in four rows of eight, so the form is legible
as text:

```js
    //          1-8      9-16     17-24    25-32
    chord:   '11111111 11111111 11111111 11111111',
    sparkle: '10001000 10001000 00000000 10001000',
    slow:    '00000000 11111111 11111111 11111111',
    kick:    '00000000 11111111 11111111 11111100',
    hatsOpen:'00000000 11111111 11111111 11110000',
    lead:    '00000000 00000000 11111111 00000000',
```

That shape is chosen with M6 in mind: layers that can already be masked
in and out are exactly the handle gameplay-driven intensity needs, so
the boss cue and level 9's thaw become a second gate multiplied into the
first rather than a restructuring.

Verified by querying the rendered pattern (Node, no browser): density
runs `3-5 → 19-21 → 20 → tapering to 11` events per bar across the four
sections, no silent bars, 476 events over the form. It evaluates in a
real Strudel too — 43/43 presets.

**A real bug found on the way in.** The palette's bass was rooted
`A A F G` while the chords played `Am F G Em`, so bars 2-4 disagreed —
audible, and present since M2. `LEAD.arp` sat on Am for all four bars,
and `ARP.arpBuzz` ran a two-bar cycle that drifted against everything
else. All now on one progression, with a test that counts the
alternatives in each `<...>` so they cannot drift apart again.

**M4 — the director. ✅ DONE.** [src/music.js](src/music.js) — still not
wired into the game; that is M5.

```js
initMusic(load?)      // lazy, once, survives failure
setTrack(levelName)   // no-op if that level is already playing
stopMusic()
setMusicMuted/toggle  duck(on)  setVolume(v)
_setBackend/_reset    // the test seam
```

Two decisions worth recording:

**Master volume rides a live signal, not a re-evaluation.** `.gain()`
*overrides* each voice's own level (0.6 → 0.5); `.mul(gain(x))`
multiplies (0.6 → 0.3), which is what a master control must do. Better
still, Strudel signals are functions of time, so
`signal(() => gainNow())` is read fresh at every event — volume, mute
and duck take effect on the next *event* rather than the next bar, with
no re-evaluation. That matters for ducking, which follows dialogue and
would otherwise lag by up to ~2 s (§3.3).

**Re-entering the same level does not restart the track.** `startGame()`
runs on death-restarts as well as advances, and re-cueing the music every
time the player dies gets grating fast — this settles §7 Q2.

A level with no track yet falls silent instead of throwing, so the game
stays playable while M7 fills the other eight in. A bundle that fails to
load logs and leaves the director inert: music must never take the game
with it.

Verified twice over: 19 director tests drive it in Node against a
recorder backend (the same seam the game's `fx` uses), and a throwaway
browser harness exercised the real script-injection path — track queued
before the bundle existed then played on arrival, clock advancing,
live gain responding to volume and duck, silent on a trackless level.

**Decision gate §3.1 is still open**, and it is now the last cheap moment:
everything so far is portable to a hand-rolled sequencer, but M5 wires
Strudel into the game proper.

**M5 — wire it in. ✅ DONE.** Four call sites, all existing seams:

- [input.js](src/input.js) — `initMusic()` beside `initAudio()` on first
  keypress, which satisfies the autoplay policy for free. **M** mutes
  everything, **N** mutes only the music (handy while balancing one
  against the other).
- [game.js `startGame`](src/game.js#L54) — `setTrack(levelDef.name)`.
- [game.js `update`](src/game.js#L98) — `duck(true)` on the existing
  `isDialogueOpen()` early return.

Verified in the **real booted game** headlessly, not just in the lab:
track queued before the bundle loaded, playing after the first keypress,
audio clock running, N and M behaving separately, a jump to level 5
(no track yet) going silent, and level 1 resuming. 1094 tests and smoke
green.

§3.1 is **settled: AGPL-3.0-or-later**, `LICENSE` added and declared in
`package.json`. Rendering to audio files stays available as a later exit
(program output is not covered by the program's licence, and we use no
samples) — the director's injectable backend is the seam for it.

**M6 — intensity.** Layer in/out on boss cues; level 9's thaw-driven
build. This is the milestone that makes it feel like a game soundtrack
rather than a loop.

**M7 — the other eight tracks. ✅ DONE.** All nine levels have music.

The blocker was that every chip.js voice is written in A minor, because a
palette has to be written in *some* key. Transposing one progression
through nine levels would make them sound like one tune moved around, so
`render()` now takes per-track **note overrides** (`withNotes`): a track
supplies its own pitch content and keeps the voice's timbre, envelope,
effects and mix budget.

| # | level | BPM | mode | the idea |
|---|---|---|---|---|
| 1 | meadow | 118 | A aeolian | tutorial; stays out of the way |
| 2 | bridge-castle | 124 | D dorian | major IV over minor i — somewhere to be |
| 3 | undercroft | 126 | E phrygian | ♭II; bass-forward, lead-starved |
| 4 | dragons-layer | 128 | C minor | dense throughout, one hole at 25-28 |
| 5 | enchanted-forest | 124 | F lydian | the ♯4; the only happy one |
| 6 | blackmire | 122 | G minor | half-time backbeat, vibrato'd chords |
| 7 | peak | 130 | A minor → C | breakdown at 17, riser 21-24, drop on 25 |
| 8 | sky-citadel | 132 | D mixolydian | ♭VII; gearTick never stops, bell melody |
| 9 | frozen-throne | 128 | B♭ minor | opens on almost nothing, a layer every 8 bars |

Level 9's shape is groundwork for M6: the layers already enter one at a
time, so the intensity gate can drive them from `thaw.js`'s hearth count
instead of the bar number.

Measured rather than assumed — density per section, loop length, peak
concurrent voices:

- Every form has real contrast. Two did not at first: the mire ran
  47/59/51/61 because its arpeggio never stopped (now 47/59/**15**/61),
  and the peak ran at 52 events/sec against 7-28 everywhere else (its
  `*32` sweep halved to `*16`).
- Peak concurrency is 5-13 voices against Strudel's `maxPolyphony` of
  **128** — worth checking, because exceeding it drops notes silently.
- 52/52 presets evaluate; 1160 tests and smoke green.

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
