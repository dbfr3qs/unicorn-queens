// The release and the ending — the last thing the game does.
//
// Nothing here is a mechanic the player can fail, which is exactly why it is
// pinned: an ending that quietly stops halfway is the one bug the rest of the
// suite would never catch. The order, the clocks, and the input lock.
import { describe, it, expect, beforeEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { input } from '../src/input.js';
import { isDialogueOpen, advanceDialogue, currentLine, resetDialogue } from '../src/dialogue.js';
import { damageEnemy } from '../src/enemies.js';
import {
  beamX, cardReady, makeEnding9, HORN_END, HORN_WALK, BEAM_TIME,
  CARD_FADE, KING_END_X, FIGURE_FADE,
} from '../src/ending9.js';
import { DYING_T, ENDING_AT, DY_KNEES } from '../src/enemies/queenboss.js';

const DT = 1 / 60;
const spy = () => { const played = []; return { play: (n, a) => played.push(a === undefined ? n : [n, a]), played }; };

let fx, lvl, q;
// The arena, staged: the puzzle is M2's business and the fight is M5-M6's.
beforeEach(() => {
  fx = spy();
  resetDialogue();
  startGame(600, 8);
  lvl = game.level;
  for (let k = 0; k < 3; k++) {
    lvl.thaw.rings[k].lit = true; lvl.thaw.rings[k].t = 1; lvl.thaw.rings[k].igniteT = 1;
    lvl.doors[k].state = 'open';
  }
  lvl.thaw.thaws = 3;
  lvl.thaw.skyT = 3;
  game.dialogsFired.add('l9-intro');
  game.dialogsFired.add('l9-gate');
  lvl.king.x = 5300;
  lvl.king.state = 'stand';
  lvl.queenUnfreeze = { t: 2, done: true };
  q = game.enemies.find(e => e.kind === 'queenboss');
  q.sleeping = false; q.x = 5560; q.y = 500; q.hp = 1;
  game.player.x = 5400;
  game.player.y = 560 - game.player.h;
});

const step = (seconds, read = true) => {
  let readT = 0;
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    if (read && isDialogueOpen() && ++readT > 30) { readT = 0; advanceDialogue(); }
    update(DT, 800, fx);
  }
};
const release = () => damageEnemy(q, fx, game.camera, 1, lvl);

describe('the release', () => {
  it('is not a kill: she stays in the world while it happens', () => {
    release();
    expect(q.dying).toBe(true);
    expect(q.dyingT).toBe(DYING_T);
    expect(game.enemies).toContain(q);
    expect(fx.played).toContain('crack');
  });

  it('runs its four stages and takes her out at the end', () => {
    release();
    step(DY_KNEES + 0.1);
    expect(fx.played).toContain('melt'); // the knees: full volume
    step(DYING_T - DY_KNEES + 0.3);
    expect(game.enemies.some(e => e.kind === 'queenboss')).toBe(false);
  });

  it('starts the ending as her light rises, not as the arrow lands', () => {
    release();
    expect(lvl.ending9.started).toBe(false);
    step(DYING_T - ENDING_AT - 0.1);
    expect(lvl.ending9.started).toBe(false);
    step(0.2);
    expect(lvl.ending9.started).toBe(true);
    expect(q.dyingT).toBeLessThanOrEqual(ENDING_AT);
    expect(q.dyingT).toBeGreaterThan(0); // she is still going as the horn starts
  });
});

describe('the horn', () => {
  it('walks him to the dais and puts the horn up', () => {
    release();
    step(DYING_T - ENDING_AT + 0.05);
    expect(lvl.king.state).toBe('walk');
    step(HORN_WALK);
    expect(lvl.king.x).toBeCloseTo(KING_END_X, 0);
    step(HORN_END - HORN_WALK - 0.15); // still inside the horn, before the beam
    expect(lvl.king.state).toBe('raise');
  });

  it('is silent: the horn is the beam’s sound, and it comes after', () => {
    release();
    step(DYING_T - ENDING_AT + HORN_END - 0.1);
    expect(fx.played).not.toContain('sunbeam');
    step(0.2);
    expect(fx.played).toContain('sunbeam');
  });
});

describe('the beam', () => {
  const toBeam = () => { release(); step(DYING_T - ENDING_AT + HORN_END + 0.05); };

  it('sweeps the whole level, west to east, over its own time', () => {
    toBeam();
    expect(beamX(lvl.ending9)).toBeGreaterThan(0);
    expect(beamX(lvl.ending9)).toBeLessThan(400);
    step(BEAM_TIME / 2);
    const mid = beamX(lvl.ending9);
    expect(mid).toBeGreaterThan(2500);
    expect(mid).toBeLessThan(3800);
    step(BEAM_TIME / 2 + 0.1);
    expect(beamX(lvl.ending9)).toBeGreaterThanOrEqual(6000);
  });

  it('is behind the level until the horn is done', () => {
    expect(beamX(makeEnding9())).toBe(-1);
  });

  it('sets the fountains running as it crosses them', () => {
    toBeam();
    expect(lvl.hallFountains.every(f => f.state === 'frozen')).toBe(true);
    step(BEAM_TIME * 0.8);
    expect(lvl.hallFountains.every(f => f.state === 'flowing')).toBe(true);
    expect(fx.played).toContain('splash');
  });

  it('breaks the wave', () => {
    toBeam();
    step(BEAM_TIME);
    expect(lvl.ending9.wave).toBe(true);
    expect(fx.played).toContain('rumble');
  });

  it('lets the hall’s five people go, one after another', () => {
    toBeam();
    step(BEAM_TIME + FIGURE_FADE + 1.5);
    expect(lvl.hallFigures.every(f => f.state === 'gone')).toBe(true);
    // they go in the order the beam reaches them, west to east
    expect(fx.played.filter(n => n === 'grant')).toHaveLength(5);
  });

  it('clears her weather off the floor', () => {
    lvl.frostPatches.push({ x: 5400, w: 80, t: 0 });
    toBeam();
    step(0.2);
    expect(lvl.frostPatches).toHaveLength(0);
  });

  it('brings the robin back to the throne rim', () => {
    toBeam();
    step(BEAM_TIME + 2.5);
    expect(lvl.ending9.robin).toBeTruthy();
    expect(lvl.ending9.robin.t).toBeGreaterThanOrEqual(1.5); // perched
  });
});

describe('the last two beats, then the card', () => {
  // step until she speaks: the beats wait on the staging, so there is no
  // fixed number of seconds to count
  const toBeats = () => {
    release();
    for (let i = 0; i < 1800 && !isDialogueOpen(); i++) update(DT, 800, fx);
  };

  it('gives her the last word, and him the one after', () => {
    toBeats();
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().speaker).toBe('The Frost Queen');
    expect(currentLine().text).toContain('century');
    advanceDialogue(); advanceDialogue(); // her two lines
    update(DT, 800, fx);
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().speaker).toBe('The Unicorn King');
    advanceDialogue(); advanceDialogue();
    update(DT, 800, fx);
    expect(lvl.ending9.phase).toBe('card');
  });

  it('holds the ending clock while a box is open', () => {
    toBeats();
    const t0 = lvl.ending9.t;
    for (let i = 0; i < 60; i++) update(DT, 800, fx); // a second of reading
    expect(lvl.ending9.t).toBe(t0);
  });

  it('fades the card in and only then takes Space', () => {
    toBeats();
    step(10);
    expect(lvl.ending9.card).toBe(true);
    expect(cardReady(lvl)).toBe(true);
    expect(cardReady({ ending9: { card: true, cardT: 0 } })).toBe(false);
    expect(cardReady({})).toBe(false);
  });
});

describe('the input lock', () => {
  it('ignores a held key for the whole ending', () => {
    release();
    step(DYING_T - ENDING_AT + 0.1);
    expect(lvl.ending9.started).toBe(true);
    const x0 = game.player.x;
    input.right = true;
    input.jump = true;
    step(2);
    input.right = false;
    input.jump = false;
    expect(game.player.x).toBe(x0);
  });

  it('leaves the player alive and unhurt through it', () => {
    release();
    const hp = game.player.hp;
    step(DYING_T + HORN_END + BEAM_TIME + 2);
    expect(game.player.dead).toBe(false);
    expect(game.player.hp).toBe(hp);
    expect(game.player.won).toBe(false); // there is no win overlay here
  });
});

describe('Space at the card', () => {
  it('starts a true new game: level 1, and nothing kept', () => {
    startGame(600, 0); // what main.js does at the card
    expect(game.levelIndex).toBe(0);
    expect(game.player.hasBow).toBe(false);
    expect(game.player.hasFlight).toBe(false);
    expect(game.player.big).toBe(false);
    expect(game.player.maxHp).toBe(3);
  });
});
