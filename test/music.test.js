// The director, driven entirely in Node against a recorder backend —
// the same trick the game's logic modules use with `fx`. Nothing here
// touches WebAudio, which is also the assertion that music.js is safe to
// import from main.js under smoke.mjs.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  music, setTrack, stopMusic, initMusic, gainNow,
  setMusicMuted, toggleMusicMuted, duck, setVolume,
  _setBackend, _reset,
} from '../src/music.js';

/** Records what the director asked Strudel to do. */
function recorder() {
  const calls = [];
  return {
    calls,
    evaluate: src => calls.push(['evaluate', src]),
    hush: () => calls.push(['hush']),
    // the real signal() takes a function of time; the director passes
    // gainNow, and holding onto it lets a test read the live value
    signal: fn => { calls.push(['signal']); recorder.live = fn; return { __signal: fn }; },
    gain: v => v,
  };
}
const evaluated = r => r.calls.filter(c => c[0] === 'evaluate');
const hushes = r => r.calls.filter(c => c[0] === 'hush');

beforeEach(_reset);

describe('setTrack', () => {
  it('evaluates the level track at its own tempo', () => {
    const r = recorder();
    _setBackend(r);
    setTrack('meadow');
    expect(evaluated(r)).toHaveLength(1);
    expect(evaluated(r)[0][1]).toMatch(/setcpm\(118\/4\)/);
    expect(music.playing).toBe(true);
  });

  it('appends the master gain so volume rides on top of each voice', () => {
    const r = recorder();
    _setBackend(r);
    setTrack('meadow');
    // .mul() multiplies; .gain() would overwrite every voice's own level
    expect(evaluated(r)[0][1]).toMatch(/\.mul\(gain\(__uqMusicGain\)\)$/);
  });

  it('does not restart the music when the same level is re-entered', () => {
    // startGame() runs on death-restarts too. Restarting the track every
    // time the player dies is the thing this prevents.
    const r = recorder();
    _setBackend(r);
    setTrack('meadow');
    setTrack('meadow');
    setTrack('meadow');
    expect(evaluated(r)).toHaveLength(1);
  });

  it('re-cues on a genuine level change', () => {
    const r = recorder();
    _setBackend(r);
    setTrack('meadow');
    setTrack('bridge-castle'); // no track yet
    setTrack('meadow');
    expect(evaluated(r)).toHaveLength(2);
  });

  it('falls silent for a level with no track yet, rather than throwing', () => {
    // the other eight levels are M7; the game must stay playable
    const r = recorder();
    _setBackend(r);
    setTrack('meadow');
    setTrack('frozen-throne');
    expect(hushes(r)).toHaveLength(1);
    expect(music.playing).toBe(false);
  });

  it('queues a track asked for before the bundle has loaded', () => {
    // input.js will call setTrack from startGame long before the ~200 KB
    // bundle has finished loading
    const r = recorder();
    setTrack('meadow');            // no backend yet
    expect(music.track).toBe('meadow');
    _setBackend(r);                // bundle arrives
    expect(evaluated(r)).toHaveLength(1);
    expect(music.playing).toBe(true);
  });

  it('only plays the most recent queued track', () => {
    const r = recorder();
    setTrack('meadow');
    setTrack('frozen-throne');
    _setBackend(r);
    expect(evaluated(r)).toHaveLength(0); // frozen-throne has no track
    expect(music.track).toBe('frozen-throne');
  });
});

describe('stopMusic', () => {
  it('hushes and lets the same level start again afterwards', () => {
    const r = recorder();
    _setBackend(r);
    setTrack('meadow');
    stopMusic();
    expect(hushes(r)).toHaveLength(1);
    expect(music.playing).toBe(false);
    setTrack('meadow'); // must not be swallowed as "already playing"
    expect(evaluated(r)).toHaveLength(2);
  });
});

describe('the live gain', () => {
  // These ride a Strudel signal read per event, so none of them
  // re-evaluate the pattern — that is the whole point of the mechanism.
  it('is the master volume by default', () => {
    expect(gainNow()).toBeCloseTo(0.25);
  });

  it('goes silent when muted, without stopping playback', () => {
    const r = recorder();
    _setBackend(r);
    setTrack('meadow');
    setMusicMuted(true);
    expect(gainNow()).toBe(0);
    expect(music.playing).toBe(true);
    expect(evaluated(r)).toHaveLength(1); // no re-evaluation
  });

  it('toggles and reports the new state', () => {
    expect(toggleMusicMuted()).toBe(true);
    expect(gainNow()).toBe(0);
    expect(toggleMusicMuted()).toBe(false);
    expect(gainNow()).toBeCloseTo(0.25);
  });

  it('drops behind an open dialogue and comes back', () => {
    duck(true);
    expect(gainNow()).toBeLessThan(0.25);
    expect(gainNow()).toBeGreaterThan(0);
    duck(false);
    expect(gainNow()).toBeCloseTo(0.25);
  });

  it('keeps mute winning over duck', () => {
    duck(true);
    setMusicMuted(true);
    expect(gainNow()).toBe(0);
  });

  it('clamps the volume to 0..1', () => {
    setVolume(5);
    expect(music.volume).toBe(1);
    setVolume(-2);
    expect(music.volume).toBe(0);
  });

  it('is handed to Strudel as a signal, not a fixed number', () => {
    // if the director passed a number the pattern would be frozen at
    // whatever the volume happened to be when the track started
    const r = recorder();
    _setBackend(r);
    expect(r.calls.some(c => c[0] === 'signal')).toBe(true);
    setVolume(0.5);
    expect(recorder.live()).toBeCloseTo(0.5);
  });
});

describe('initMusic', () => {
  it('survives a bundle that will not load, leaving the game playable', async () => {
    const ok = await initMusic(() => Promise.reject(new Error('offline')));
    expect(ok).toBe(false);
    expect(music.loaded).toBe(false);
    // and the director stays inert rather than throwing
    expect(() => setTrack('meadow')).not.toThrow();
  });

  it('loads once however many times it is called', async () => {
    let loads = 0;
    const load = async () => { loads++; return recorder(); };
    await Promise.all([initMusic(load), initMusic(load), initMusic(load)]);
    await initMusic(load);
    expect(loads).toBe(1);
    expect(music.loaded).toBe(true);
  });

  it('starts the track that was queued while it was loading', async () => {
    const r = recorder();
    setTrack('meadow');
    await initMusic(async () => r);
    expect(evaluated(r)).toHaveLength(1);
  });
});
