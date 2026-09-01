// M7 — the ending (release, not a kill): the one-shot death edge (bound
// wraiths freed, the cage opens, the pig appears, the rainbow lights —
// exactly once), the pig's walk-off, the freed wraith's 1 s fade with no
// contact damage, the King's end beat (gated on the wizard's death), and
// the exit (locked while the wizard lives and at the release; the
// King's end beat opens it).
import { describe, it, expect, afterEach } from 'vitest';
import { createLevel7 } from '../src/levels/level7.js';
import { createPlayer } from '../src/player.js';
import { spawnEnemy, updateEnemies } from '../src/enemies.js';
import { createCamera } from '../src/camera.js';
import { fireArrow, updateArrows, resetArrows } from '../src/arrows.js';
import { updatePig } from '../src/pig.js';
import { updatePeakEnding } from '../src/peakending.js';
import { wraithAlpha } from '../src/enemies/wraith.js';
import { game, startGame, update } from '../src/game.js';
import { isDialogueOpen, currentLine, advanceDialogue, resetDialogue } from '../src/dialogue.js';
import { input } from '../src/input.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });

afterEach(() => {
  resetDialogue();
  resetArrows();
  input.left = input.right = input.jump = input.fire = false;
  input.up = input.down = false;
  input.cast = false;
});

describe('the death edge', () => {
  it('fires exactly once: bound wraiths freed, cage opens, pig appears, rainbow lights', () => {
    const lvl = createLevel7();
    const boss = spawnEnemy({ kind: 'wizardboss', x: 6000, y: lvl.groundY - 48, sleeping: true }, lvl);
    boss.hp = 1; // the fake: one arrow ends it
    const w1 = spawnEnemy({ kind: 'wraith', x: 5700, y: 420, bound: true }, lvl);
    const w2 = spawnEnemy({ kind: 'wraith', x: 5800, y: 420, bound: true }, lvl);
    const w3 = spawnEnemy({ kind: 'wraith', x: 5000, y: 430 }, lvl); // unbound: stays with the frost
    const p = createPlayer(lvl);
    p.x = 5900; p.y = lvl.groundY - 36; p.facing = 1;
    const cam = createCamera();
    cam.x = 5500;
    fireArrow(p);
    let i = 0;
    while (!boss.dead && i++ < 30) updateArrows([boss, w1, w2, w3], lvl, cam, DT, fx([]), 800);
    expect(boss.dead).toBe(true); // one arrow to the sleeping boss

    const calls = [];
    updatePeakEnding(lvl, [boss, w1, w2, w3], DT, fx(calls));
    expect(lvl.ending7.started).toBe(true);
    expect(calls).toEqual(expect.arrayContaining(['grant', 'gate', 'rainbow', 'seal']));
    expect(w1.freed).toBe(true);
    expect(w2.freed).toBe(true);
    expect(w3.freed).toBeFalsy(); // only the bound ones release
    expect(lvl.cage.open).toBe(true);
    expect(Math.abs(lvl.cage.openT - (1.2 - DT))).toBeLessThan(1e-9); // 1.2 s swing, decaying
    expect(lvl.pig).not.toBeNull();
    expect(lvl.pig.x).toBe(6000); // where the fight ended
    expect(lvl.pig.y).toBe(lvl.groundY);
    expect(lvl.pig.state).toBe('stand');
    expect(lvl.exit.locked).toBe(true); // the seal holds until the King's end beat

    const again = [];
    updatePeakEnding(lvl, [boss, w1, w2, w3], DT, fx(again)); // a second call is a no-op
    expect(again).toEqual([]);
    expect(lvl.pig.x).toBe(6000); // still standing (no second spawn, no double walk)
  });
});

describe('the released pig', () => {
  it('stands 0.5 s, walks west at 40 px/s, and leaves the level past 5450', () => {
    const lvl = createLevel7();
    lvl.pig = { x: 6000, y: lvl.groundY, state: 'stand', t: 0.5, w: 64, h: 48 };
    let i = 0;
    while (lvl.pig.state === 'stand' && i++ < 40) updatePig(lvl, DT, fx([]));
    expect(lvl.pig.state).toBe('walk');
    expect(lvl.pig.x).toBe(6000); // the stand does not move it
    const x0 = lvl.pig.x;
    for (let f = 0; f < 60; f++) updatePig(lvl, DT, fx([])); // 1 s of walking
    expect(x0 - lvl.pig.x).toBeGreaterThan(38); // ≈ 40 px/s west
    expect(x0 - lvl.pig.x).toBeLessThan(42);
    lvl.pig.x = 5470; // near the arena edge
    i = 0;
    while (lvl.pig && i++ < 60) updatePig(lvl, DT, fx([]));
    expect(lvl.pig).toBeNull(); // walked off the level's business
  });
});

describe('the wraith release', () => {
  it('fades over 1 s and dies; no contact damage during the fade', () => {
    const lvl = createLevel7();
    const e = spawnEnemy({ kind: 'wraith', x: 6000, y: 420, bound: true }, lvl);
    e.freed = true; e.freeT = 0;
    const p = createPlayer(lvl);
    p.x = e.x + 5; p.y = e.y; // overlapping the fading spirit
    const cam = createCamera();
    cam.x = 5500;
    const calls = [];
    for (let f = 0; f < 30; f++) updateEnemies([e], p, lvl, cam, DT, fx(calls));
    expect(e.dead).toBe(false);
    expect(e.freeT).toBeCloseTo(0.5, 1);
    expect(wraithAlpha(e, 'calm')).toBeCloseTo(0.5, 1); // the draw fades with freeT
    expect(p.dead).toBe(false);
    let i = 0;
    while (!e.dead && i++ < 90) updateEnemies([e], p, lvl, cam, DT, fx(calls));
    expect(e.dead).toBe(true);
    expect(calls).not.toContain('hurt'); // a freed spirit is harmless
  });
});

describe("the King's end beat", () => {
  it('waits for the wizard to die, fires once in 5900–6200, and never repeats', () => {
    startGame(600, 6);
    update(DT, 800, fx([])); // the intro fires at spawn
    advanceDialogue(); advanceDialogue(); advanceDialogue(); // close it
    expect(isDialogueOpen()).toBe(false);
    const wiz = game.enemies.find(e => e.kind === 'wizardboss');
    expect(wiz.dead).toBe(false);
    game.player.x = 5950;
    game.player.y = game.level.groundY - 36;
    update(DT, 800, fx([])); // entry while the wizard lives: the when guard holds
    expect(isDialogueOpen()).toBe(false);
    wiz.dead = true; // the release (the player is still in the band: no re-check mid-visit)
    update(DT, 800, fx([]));
    expect(isDialogueOpen()).toBe(false);
    game.player.x = 5600; // out of the band
    for (let f = 0; f < 120; f++) update(DT, 800, fx([])); // the arena wraiths settle
    game.player.x = 5950; // back in: the gate now passes
    update(DT, 800, fx([]));
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().speaker).toBe('The Unicorn King');
    expect(currentLine().text).toBe('You did it. I am… free. The storm breaks.');
    advanceDialogue();
    expect(currentLine().text).toBe('Thank you. The rainbow is open — walk through, and the Sky Citadel is yours.');
    advanceDialogue(); // close
    expect(isDialogueOpen()).toBe(false);
    expect(game.dialogsFired.has('l7-king-end')).toBe(true);
    game.player.x = 5600;
    for (let f = 0; f < 120; f++) update(DT, 800, fx([]));
    game.player.x = 5950; // re-entry: the spent beat stays spent
    update(DT, 800, fx([]));
    expect(isDialogueOpen()).toBe(false);
  });
});

describe('the rainbow exit', () => {
  it('is sealed while the wizard lives and at the release; the King\'s end beat opens it', () => {
    startGame(600, 6);
    update(DT, 800, fx([])); // the intro
    advanceDialogue(); advanceDialogue(); advanceDialogue();
    const p = game.player;
    p.x = 6240; // inside the exit rect (6220–6280)
    p.y = game.level.groundY - 36;
    for (let f = 0; f < 5; f++) update(DT, 800, fx([]));
    expect(p.won).toBe(false); // locked: walking in does nothing
    const wiz = game.enemies.find(e => e.kind === 'wizardboss');
    wiz.dead = true; // the release edge
    const calls = [];
    update(DT, 800, fx(calls));
    expect(game.level.exit.locked).toBe(true); // the seal holds until the King speaks
    expect(p.won).toBe(false); // standing in the dim arc is not a win
    // The King's end beat (band 5900–6200) is what opens it (onOpen).
    p.x = 5950;
    update(DT, 800, fx([])); // entry edge: the when gate now passes
    expect(isDialogueOpen()).toBe(true);
    advanceDialogue(); advanceDialogue(); // the beat closes
    expect(game.level.exit.locked).toBe(false); // his word lights the rainbow
    p.x = 6240; // walk through the lit rainbow
    const win = [];
    update(DT, 800, fx(win));
    expect(p.won).toBe(true); // the standard win
    expect(win).toContain('win');
  });
});
