// M7 — the ending: rest, not ruin. The Warden's rest runs out, the pearl
// is taken by the standard path, and then: the King's silhouette steps
// onto the rim ('grant', latched — same frame as the lid drops), the
// shaft-lip beat fires on entry with the pearl taken (the King's two
// lines), anyone who goes down the open shaft wins — flying or simply
// stepping off the lip (the standard victory path either way) — and the
// Warden's statue remains (still in enemies,
// drawn by the world pass — the draw itself is an M8 scenario).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { isDialogueOpen, currentLine, advanceDialogue, resetDialogue } from '../src/dialogue.js';
import { input } from '../src/input.js';
import { updatePearl } from '../src/pearl.js';
import { updateClock } from '../src/clock.js';
import { getKind } from '../src/enemies/index.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });

beforeEach(() => { startGame(600, 7); }); // level index 7 = the Sky Citadel

afterEach(() => {
  resetDialogue();
  input.left = input.right = input.jump = input.fire = false;
  input.up = input.down = false;
  input.cast = false;
  startGame(600, 0); // a clean level: resets score + all module state
});

// Frame 1 opens the intro at spawn; clear it so the world runs again.
function closeIntro() {
  update(DT, 800, fx([]));
  while (isDialogueOpen()) advanceDialogue();
}

// The ending state, by the standard paths: the Warden killed (onZero —
// dead immediately, dyingT 3.3, the clock stops), his rest run out on the
// clock (the toll at the 1.0 crossing, the pearl at 0), and the pearl
// picked up (show → pick up: taken + the exit seal breaks).
function restAndTake() {
  closeIntro();
  const lvl = game.level;
  const w = game.enemies.find(e => e.kind === 'warden');
  getKind('warden').onZero(w, fx([]), game.camera, lvl);
  expect(w.dead).toBe(true);
  expect(lvl.clock.stopped).toBe(true);
  for (let i = 0; i < 210; i++) updateClock(lvl, game.player, game.enemies, DT, fx([])); // 3.5 s > the 3.3 s rest
  expect(w.dyingT).toBe(0);
  const p = { x: lvl.pearl.x, y: lvl.pearl.y, w: 28, h: 36, dead: false };
  updatePearl(lvl, p, game.enemies, fx([])); // show (showWhen: the Warden fully rested)
  updatePearl(lvl, p, game.enemies, fx([])); // pick up
  expect(lvl.pearl.taken).toBe(true);
  expect(lvl.exit.locked).toBe(false); // the seal is broken
  return lvl;
}

// The next clock frame after the pearl: the lid drops and the King steps
// onto the rim, in the same frame. Returns the frame's fx calls.
function dropLid() {
  const calls = [];
  updateClock(game.level, game.player, game.enemies, DT, fx(calls));
  return calls;
}

describe("the King's silhouette", () => {
  it("steps onto the rim on the pearl-taken frame — 'grant' once (latched), with the lid", () => {
    restAndTake();
    const lvl = game.level;
    expect(lvl.kingSil.present).toBe(false);
    const calls = dropLid();
    expect(lvl.kingSil.present).toBe(true);
    expect(lvl.trapdoor.open).toBe(true); // same frame: the lid drops
    expect(calls.filter(n => n === 'grant')).toHaveLength(1);
    // latched: ten more frames, no second grant
    for (let i = 0; i < 10; i++) updateClock(lvl, game.player, game.enemies, DT, fx(calls));
    expect(calls.filter(n => n === 'grant')).toHaveLength(1);
  });
});

describe('the shaft-lip beat', () => {
  it("fires the King's two lines on entry, with the pearl taken", () => {
    restAndTake();
    const p = game.player;
    p.x = 5750;
    p.y = game.level.groundY - 36; // the lip band (5700–5820)
    update(DT, 800, fx([]));
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().speaker).toBe('The Unicorn King');
    advanceDialogue();
    expect(currentLine().text).toContain('The throne is waiting.');
    advanceDialogue();
    expect(isDialogueOpen()).toBe(false);
    expect(game.dialogsFired.has('l8-shaft')).toBe(true);
  });

  it('does not fire on entry without the pearl', () => {
    closeIntro();
    const p = game.player;
    p.x = 5750;
    p.y = game.level.groundY - 36;
    update(DT, 800, fx([]));
    expect(isDialogueOpen()).toBe(false);
    expect(game.dialogsFired.has('l8-shaft')).toBe(false);
  });
});

describe('the way down', () => {
  it('a flying player in the open shaft wins (the standard path: won + win sfx)', () => {
    restAndTake();
    dropLid();
    expect(game.level.trapdoor.open).toBe(true);
    const p = game.player;
    p.flying = true;
    p.flightT = 10;
    p.flightCd = 0;
    p.x = 5850;
    p.y = 570; // in the shaft, inside the exit rect (560–660)
    const winCalls = [];
    update(DT, 800, fx(winCalls));
    expect(p.won).toBe(true);
    expect(winCalls).toContain('win');
  });
});

describe('the walker', () => {
  it('who steps off the lip into the open shaft wins too: no flight needed', () => {
    restAndTake();
    dropLid();
    const p = game.player;
    const hp0 = p.hp;
    p.x = 5790;
    p.y = game.level.groundY - 36; // the deck edge, inside the lip band
    update(DT, 800, fx([])); // the King's beat fires (entry, pearl taken)
    expect(isDialogueOpen()).toBe(true);
    while (isDialogueOpen()) advanceDialogue();
    input.right = true; // openDialogue cleared the held keys
    let frames = 0;
    while (!p.dead && !p.won && p.invuln <= 0 && frames < 240) {
      update(DT, 800, fx([]));
      frames++;
    }
    input.right = false;
    expect(p.won).toBe(true); // the fall through the exit rect is the win
    expect(p.hp).toBe(hp0); // and never reaches the pit line: no damage
  });
});

describe('the statue remains', () => {
  it('after the win: the Warden is still in enemies (dead, dyingT 0)', () => {
    restAndTake();
    const w = game.enemies.find(e => e.kind === 'warden');
    expect(w.dead).toBe(true);
    expect(w.dyingT).toBe(0);
    dropLid();
    const p = game.player;
    p.flying = true;
    p.flightT = 10;
    p.flightCd = 0;
    p.x = 5850;
    p.y = 570;
    update(DT, 800, fx([]));
    expect(p.won).toBe(true);
    expect(game.enemies).toContain(w); // the world pass still draws him (M8 covers the draw)
    expect(w.dead).toBe(true);
    expect(w.dyingT).toBe(0);
  });
});
