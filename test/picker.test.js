// Difficulty D7: the difficulty card.
import { describe, it, expect, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { openPicker, pickerKey } from '../src/picker.js';
import { drawPicker } from '../src/render/picker.js';
import { drawHud } from '../src/render/hud.js';
import { createRecordingCtx } from './helpers/recording-ctx.js';
import { difficultyName, setDifficulty, initDifficulty, DEFAULT_DIFFICULTY } from '../src/difficulty.js';

const fx = { play() {} };

afterEach(() => {
  setDifficulty(DEFAULT_DIFFICULTY);
  game.intro = null;
  startGame(600, 0);
});

const card = () => { startGame(600, 0); openPicker(); return game.picker; };

describe('the card', () => {
  it('opens on the current choice', () => {
    setDifficulty('medium');
    expect(card().i).toBe(1);
  });

  it('←/→ choose, wrapping', () => {
    const pk = card(); // hard: 2
    pickerKey('ArrowRight', 600);
    expect(pk.i).toBe(0);
    pickerKey('ArrowLeft', 600);
    pickerKey('KeyA', 600);
    expect(pk.i).toBe(1);
    expect(difficultyName()).toBe('hard'); // nothing applies until Space
  });

  it('holds the world still and takes every key', () => {
    card();
    const t = game.gameTime;
    update(0.1, 800, fx);
    expect(game.gameTime).toBe(t);
    expect(pickerKey('KeyX', 600)).toBe(true);
  });

  it('Space applies the choice and starts the opening on it', () => {
    card();
    pickerKey('ArrowRight', 600); // → easy
    pickerKey('Space', 600);
    expect(difficultyName()).toBe('easy');
    expect(game.picker).toBe(null);
    expect(game.intro).not.toBe(null);
    expect(game.player.maxHp).toBe(5);
  });

  it('is not the card\'s key once closed', () => {
    startGame(600, 0);
    expect(pickerKey('Space', 600)).toBe(false);
  });

  it('draws the three choices and the chosen blurb', () => {
    card();
    const rec = createRecordingCtx();
    drawPicker(rec.ctx, 800, 600);
    const s = rec.text();
    for (const w of ['UNICORN QUEENS', 'EASY', 'MEDIUM', 'HARD', 'the game as designed']) expect(s).toContain(w);
  });
});

describe('the HUD label', () => {
  it.each([['easy', true], ['medium', true], ['hard', false]])('%s shown: %s', (d, shown) => {
    setDifficulty(d);
    startGame(600, 0);
    const rec = createRecordingCtx();
    drawHud(rec.ctx, 800, 600);
    expect(rec.text().includes(`fillText(${d.toUpperCase()},`)).toBe(shown);
  });
});

describe('the first time', () => {
  const store = (init = {}) => ({ m: { ...init }, getItem(k) { return this.m[k] ?? null; }, setItem(k, v) { this.m[k] = v; } });

  it('a first-time player sees easy picked (the game default stays hard)', () => {
    initDifficulty('', store());
    expect(difficultyName()).toBe('hard');
    expect(card().i).toBe(0);
  });

  it('a remembered choice is picked instead', () => {
    initDifficulty('', store({ 'unicorn-queens.difficulty': 'hard' }));
    expect(card().i).toBe(2);
  });

  it('so is a ?difficulty= link', () => {
    initDifficulty('?difficulty=medium', store());
    expect(card().i).toBe(1);
  });

  it('after a run, the card comes back on what they chose', () => {
    initDifficulty('', store());
    card();
    pickerKey('ArrowRight', 600); // easy -> medium
    pickerKey('Space', 600);
    game.intro = null;
    expect(card().i).toBe(1);
  });
});
