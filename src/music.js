// The music director (MUSIC-PLAN.md §5). Owns which track is playing and
// how loud, and nothing else.
//
// Deliberately shaped like audio.js: no browser API is touched at import
// time, the Strudel bundle is fetched lazily on first user input, and the
// backend is injectable so tests can drive the whole thing in Node. That
// last part is what keeps smoke.mjs — which boots main.js under Node with
// DOM stubs — passing.
//
// Timing note: Strudel schedules on its own WebAudio clock, independent
// of the game's requestAnimationFrame loop. Track changes therefore land
// on the next cycle boundary rather than the exact frame, which is up to
// ~2 s at these tempos. That is a feature for level changes (bar-aligned
// transitions sound composed) and a mild wart for anything that wants to
// be instant — hence the live-gain trick below, which is not
// bar-quantised at all.

import { trackFor } from './music/tracks.js';

/** How far the music drops while a dialogue box is open. */
const DUCK = 0.35;

export const music = {
  loaded: false,
  /** level name whose track is current, or null */
  track: null,
  /** true once a pattern is actually scheduled */
  playing: false,
  muted: false,
  ducked: false,
  /** master, pre-duck. MUSIC-PLAN.md §7 still has this to settle by ear. */
  volume: 0.25,
};

// { evaluate, hush, signal, gain } — null until initMusic() resolves, or
// until a test injects one.
let backend = null;
// a setTrack() that arrived before the bundle finished loading
let pending = null;

/**
 * The gain every track multiplies itself by, read per event.
 *
 * This is why volume/mute/duck do not re-evaluate the pattern: Strudel
 * signals are functions of time, so a signal that closes over a mutable
 * is read fresh at every event. .gain() would *override* each voice's own
 * level; .mul(gain(...)) multiplies, which is what a master control has
 * to do.
 */
export function gainNow() {
  if (music.muted) return 0;
  return music.volume * (music.ducked ? DUCK : 1);
}

// ---- loading -----------------------------------------------------------

/**
 * Inject the vendored UMD bundle and initialise it.
 * Split out so initMusic() can be handed a fake in tests.
 */
async function loadStrudel() {
  const url = new URL('../vendor/strudel/index.js', import.meta.url).href;
  await new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = url;
    el.onload = resolve;
    el.onerror = () => reject(new Error('music: could not load ' + url));
    document.head.append(el);
  });
  // initStrudel() registers the audio unlock and prebakes the synths. No
  // samples are fetched, so this needs no network.
  await globalThis.initStrudel();
  const { evaluate, hush, signal, gain } = globalThis;
  return { evaluate, hush, signal, gain };
}

/**
 * Load Strudel and start any track already asked for. Safe to call more
 * than once; only the first call does work. Must be triggered by a user
 * gesture — the browser will not start audio otherwise.
 */
export async function initMusic(load = loadStrudel) {
  if (music.loaded) return true;
  if (initMusic.inFlight) return initMusic.inFlight;
  initMusic.inFlight = (async () => {
    try {
      _setBackend(await load());
      return true;
    } catch (err) {
      // Music is a nicety: a failure here must never take the game with
      // it. The rest of the module no-ops while backend stays null.
      console.warn('music disabled:', err);
      return false;
    } finally {
      initMusic.inFlight = null;
    }
  })();
  return initMusic.inFlight;
}

// ---- playback ----------------------------------------------------------

/**
 * Play the track for a level, by its LEVELS[].name.
 *
 * Re-asking for the level already playing is a no-op, which is the point:
 * game.startGame() runs on death-restarts as well as level advances, and
 * restarting the music every time the player dies gets grating fast. Only
 * a genuine level change re-cues.
 *
 * A level with no track yet (M7) stops the music rather than throwing —
 * the game stays playable while the set fills in.
 */
export function setTrack(levelName) {
  if (music.track === levelName) return;
  music.track = levelName;

  if (!backend) { pending = levelName; return; }

  const src = trackFor(levelName);
  if (!src) {
    backend.hush();
    music.playing = false;
    return;
  }
  // render() ends on the pattern expression, so master gain appends.
  backend.evaluate(`${src}\n  .mul(gain(__uqMusicGain))`);
  music.playing = true;
}

/** Stop playback. The next setTrack() for any level starts again. */
export function stopMusic() {
  music.track = null;
  music.playing = false;
  pending = null;
  backend?.hush();
}

// ---- levels ------------------------------------------------------------
// All three take effect on the next event rather than the next bar,
// because they ride the live gain signal instead of re-evaluating.

export function setMusicMuted(on) { music.muted = !!on; }
export function toggleMusicMuted() { music.muted = !music.muted; return music.muted; }
/** Dialogue is open: drop the music behind it. */
export function duck(on) { music.ducked = !!on; }
export function setVolume(v) { music.volume = Math.max(0, Math.min(1, v)); }

// ---- test seam ---------------------------------------------------------

/**
 * Install a backend directly, skipping the bundle. Tests pass a recorder;
 * initMusic() uses it for the real thing. Mirrors how logic modules take
 * an `fx` object so tests can hand them a recorder instead of WebAudio.
 */
export function _setBackend(b) {
  backend = b;
  music.loaded = !!b;
  if (!b) return;
  // The pattern multiplies by this; it reads gainNow() per event.
  globalThis.__uqMusicGain = b.signal(gainNow);
  if (pending !== null) {
    const level = pending;
    pending = null;
    music.track = null; // force setTrack to act rather than see itself
    setTrack(level);
  }
}

/** Tear down for tests: forget the backend and all state. */
export function _reset() {
  backend = null;
  pending = null;
  initMusic.inFlight = null;
  Object.assign(music, {
    loaded: false, track: null, playing: false,
    muted: false, ducked: false, volume: 0.25,
  });
}
