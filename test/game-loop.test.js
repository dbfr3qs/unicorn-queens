// Game loop: no simulation step is longer than 1/60 s (stepFrame).
import { describe, it, expect, beforeEach } from 'vitest';
import { game, startGame, stepFrame, stepCount, update, fireSunbeam } from '../src/game.js';
import { arrows, fireArrow } from '../src/arrows.js';
import { BLIZZ_DRIFT, blizzardWobble } from '../src/enemies/queenboss.js';
import { input } from '../src/input.js';
import { LEVELS } from '../src/levels/index.js';
import { cellApproach } from '../src/cell.js';
import { isDialogueOpen, advanceDialogue } from '../src/dialogue.js';
import { setDifficulty, difficulty } from '../src/difficulty.js';

const fx = { play() {} };

beforeEach(() => {
  setDifficulty('hard');
  for (const k of Object.keys(input)) if (typeof input[k] === 'boolean') input[k] = false;
});

const apex = (dt, step = stepFrame) => {
  startGame(600, 0); const y0 = game.level.groundY - game.player.h; let top = y0;
  input.jump = false; for (let i = 0; i < 10; i++) step(dt, 800, fx); // settle
  input.jump = true;
  for (let t = 0; t < 1.2; t += dt) { step(dt, 800, fx); top = Math.min(top, game.player.y); }
  input.jump = false; return y0 - top;
};

describe('stepFrame', () => {
  it('the jump is as high at 24 fps as at 60', () => {
    expect(Math.abs(apex(1 / 24) - apex(1 / 60))).toBeLessThan(1.5);
    expect(apex(1 / 24)).toBeGreaterThan(121); // level 3's key ledge is +120
  });
  it('a frame up to 10 % over 1/60 s is one step (final review F1)', () => {
    for (const dt of [1 / 60, 0.016667, 0.0167, 1 / 59.94, 0.017, 1 / 75, 1 / 144]) expect(stepCount(dt)).toBe(1);
    expect(stepCount(1 / 30)).toBe(2);
    expect(stepCount(0.05)).toBe(3);
  });
  it('a 60 Hz frame with jittered timestamps jumps as one plain update does (final review F1)', () => {
    for (const dt of [0.0167, 1 / 59.94]) expect(apex(dt)).toBe(apex(dt, update));
  });
});

describe('level 9 blizzard', () => {
  it('the blizzard moves a standing player', () => {
    startGame(600, 8);
    game.player.x = 400; // out of the spawn band: its dialogue would freeze the world; and off the west wall the drift pushes toward
    for (let i = 0; i < 5; i++) update(1 / 60, 800, fx);
    game.level.blizzard = { t: 5, next: 99 };
    // the wobble can be zero at the sampled time; run on until it is not
    while (Math.abs(blizzardWobble(game.gameTime + 1 / 60)) < 0.05) update(1 / 60, 800, fx);
    const x0 = game.player.x, t = game.gameTime + 1 / 60;
    update(1 / 60, 800, fx);
    expect(game.player.x - x0).toBeCloseTo(BLIZZ_DRIFT * difficulty().hazard * blizzardWobble(t) / 60, 5);
    expect(game.player.x).not.toBe(x0);
  });
});

describe('trigger rects (bug review 2.4)', () => {
  it('the cell zone reaches the ceiling', () => {
    const l = LEVELS[2].make(600), a = cellApproach(l);
    expect(a.y).toBe(0); expect(a.y + a.h).toBe(l.cell.y + l.cell.h);
  });
  it.each([[6, 'l7-king-end'], [7, 'l8-arena'], [8, 'l9-gate']])('level %i trigger %s is full height', (idx, id) => {
    const l = LEVELS[idx].make(600), d = l.dialogs.find(x => x.id === id);
    expect(d.y).toBe(0); expect(d.h).toBe(l.groundY);
  });
  it('a beat whose condition comes true while she stands in the rect still fires', () => {
    startGame(600, 6);
    const d = game.level.dialogs.find(x => x.id === 'l7-king-end');
    game.player.x = d.x + 20; game.player.y = game.level.groundY - game.player.h;
    update(1 / 60, 800, fx);
    while (isDialogueOpen()) advanceDialogue(); // another beat may open first
    for (const e of game.enemies) if (e.kind === 'wizardboss') e.dead = true;
    // the King waits for his cage to open (final review F3): the box opens
    // the frame the 1.2 s swing ends, and not while the door is still moving
    let frames = 0;
    while (!isDialogueOpen() && frames < 200) {
      update(1 / 60, 800, fx); frames++;
      if (game.level.cage.openT > 0) expect(isDialogueOpen()).toBe(false);
    }
    expect(isDialogueOpen()).toBe(true);
    expect(game.level.ending7.started).toBe(true);
    expect(game.level.cage.openT).toBe(0);
    expect(frames).toBeGreaterThan(60); // ~1.2 s of swing, not the kill frame
  });
  it('a repeat beat fires once per entry, not every frame', () => {
    startGame(600, 4);
    const d = game.level.dialogs.find(x => x.id === 'queen');
    const stand = () => { game.player.x = d.x + 20; game.player.y = d.y + 1; };
    let opens = 0;
    const frames = n => { for (let i = 0; i < n; i++) { update(1 / 60, 800, fx); if (isDialogueOpen()) { opens++; while (isDialogueOpen()) advanceDialogue(); } } };
    stand(); frames(5);
    expect(opens).toBe(1);
    game.player.x = d.x - 500; frames(1); // leave
    stand(); frames(5);
    expect(opens).toBe(2);
  });
});

describe('loop fixes (bug review 3/4)', () => {
  it('arrows in flight are cleared when the level 9 ending starts', () => {
    startGame(600, 8); fireArrow(game.player); game.level.ending9.started = true;
    update(1 / 60, 800, fx); expect(arrows).toHaveLength(0);
  });
  it('a cast pressed during the revive beat does not fire on revival', () => {
    setDifficulty('easy'); startGame(600, 0);
    try {
      game.player.reviving = 0.5; input.cast = true; update(1 / 60, 800, fx);
      expect(input.cast).toBe(false);
    } finally { setDifficulty('hard'); }
  });
  it('the sunbeam spares the troll and does not throw', () => {
    startGame(600, 2);
    const troll = game.enemies.find(e => e.kind === 'troll'); game.camera.x = troll.x - 100;
    expect(() => fireSunbeam(game.player, game.level, fx, 800)).not.toThrow();
    expect(troll.dead).toBe(false);
  });
});
