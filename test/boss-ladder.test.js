// The boss ladder (BOSS-PLAN B8): the lab's bot fights and reach map, run
// short, pinning what the ladder work fixed — not the exact order, which
// is within the bot's noise for some neighbours (the Weaver Queen and the
// Wizard; the Mage, the Troll and the Dragon). Seeded, so it is stable; a
// failure here means a boss has slid back into an old fault.
import { describe, it, expect, beforeAll } from 'vitest';
import { BOSSES, fights, reachMap } from '../tools/bosslab.mjs';
import { setDifficulty, DEFAULT_DIFFICULTY } from '../src/difficulty.js';
import { startGame } from '../src/game.js';

const N = 10; // fights per boss
const r = {};

beforeAll(() => {
  for (const [k, b] of Object.entries(BOSSES)) r[k] = fights(b, N);
  setDifficulty(DEFAULT_DIFFICULTY);
  startGame(600, 0);
}, 120000);

describe('the boss ladder (hard, the lab bot)', () => {
  it.each(Object.keys(BOSSES))('%s dies in every fight', k => {
    expect(r[k].kills).toBe(N);
  });

  it.each(Object.keys(BOSSES))('%s is never stun-locked (staggered under 20% of its fight)', k => {
    expect(r[k].stagger).toBeLessThan(0.2);
  });

  // They used to die in 4–5 s of held fire, before landing an attack.
  it.each(['troll', 'weaver', 'warden'])('%s lives long enough to fight (8 s or more)', k => {
    expect(r[k].median).toBeGreaterThanOrEqual(8);
  });

  // He was a 2-minute slog, the hardest fight in the game.
  it('the wizard is no longer a slog (under 40 s)', () => {
    expect(r.wizard.median).toBeLessThan(40);
  });

  it('the warden and the queen both hit harder than the wizard', () => {
    expect(r.warden.hits).toBeGreaterThan(r.wizard.hits);
    expect(r.queen.hits).toBeGreaterThan(r.wizard.hits);
  });

  it('the Frost Queen is the hardest fight', () => {
    for (const k of Object.keys(BOSSES)) if (k !== 'queen') expect(r.queen.hits, k).toBeGreaterThan(r[k].hits);
  });
});

describe('no safe zones (the reach map)', () => {
  it.each(Object.keys(BOSSES))('%s can reach every stretch of its floor', k => {
    for (const ph of reachMap(BOSSES[k])) expect(ph.safe, `from ${ph.hp}`).toEqual([]);
  }, 60000);
});
