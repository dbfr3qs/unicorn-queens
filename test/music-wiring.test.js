// M5: the director's call sites in the game. These run the real
// startGame/update against a recorder backend, so they cover the wiring
// rather than the director's own logic (test/music.test.js does that).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { music, _setBackend, _reset } from '../src/music.js';
import { openDialogue, resetDialogue } from '../src/dialogue.js';
import { LEVELS } from '../src/levels/index.js';

const fx = { play: () => {} };
let evals;

beforeEach(() => {
  _reset();
  evals = [];
  _setBackend({
    evaluate: src => evals.push(src),
    hush: () => evals.push('<hush>'),
    signal: fn => ({ __signal: fn }),
    gain: v => v,
  });
});
afterEach(() => { resetDialogue(); _reset(); startGame(600, 0); });

describe('startGame cues the level track', () => {
  it('names the track after the level being started', () => {
    startGame(600, 0);
    expect(music.track).toBe('meadow');
    expect(evals).toHaveLength(1);
  });

  it('follows a level advance', () => {
    startGame(600, 0);
    startGame(600, 1, game.player); // advance to the bridge
    expect(music.track).toBe('bridge-castle');
  });

  it('keeps playing across a death restart of the same level', () => {
    // startGame runs on death too. Re-cueing the music every death is
    // exactly the annoyance setTrack's no-op guard exists to prevent.
    startGame(600, 0);
    startGame(600, 0, game.player);
    startGame(600, 0, game.player);
    expect(evals).toHaveLength(1);
  });

  it('asks for a track for every level, even the ones M7 has not written', () => {
    // a level with no track hushes; the point is that startGame never
    // throws and never leaves the previous level's music running
    for (let i = 0; i < LEVELS.length; i++) {
      startGame(600, i);
      expect(music.track).toBe(LEVELS[i].name);
    }
  });
});

describe('dialogue ducks the music', () => {
  it('drops the level while a box is open and restores it after', () => {
    startGame(600, 0);
    update(0.016, 800, fx);
    expect(music.ducked).toBe(false);

    openDialogue(['the witch says hello']);
    update(0.016, 800, fx); // frozen frame
    expect(music.ducked).toBe(true);

    resetDialogue();
    update(0.016, 800, fx);
    expect(music.ducked).toBe(false);
  });

  it('does not re-evaluate the pattern to duck', () => {
    // ducking rides the live gain signal; if it re-evaluated, every
    // dialogue box would restart the track from bar 1
    startGame(600, 0);
    const before = evals.length;
    openDialogue(['a']);
    update(0.016, 800, fx);
    resetDialogue();
    update(0.016, 800, fx);
    expect(evals).toHaveLength(before);
  });
});
