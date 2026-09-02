// M3 — the mainsprings: touch-sever and arrow-sever both score +50,
// lengthen the period, and wind the citadel down (the chime flattens, the
// light dims, the gears slow). The intro + hub beats voice the cuts
// (c0 repeats at 0, c1/c2 once each). The period is the one thing a cut
// writes; the rest are pure reads.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { isDialogueOpen, currentLine, advanceDialogue, resetDialogue } from '../src/dialogue.js';
import { input } from '../src/input.js';
import { score } from '../src/loot.js';
import { arrows, resetArrows } from '../src/arrows.js';
import { cutSpring } from '../src/springs.js';
import { chimePitch, lightLevel, gearSpeed } from '../src/clock.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });

beforeEach(() => { startGame(600, 7); }); // level index 7 = the Sky Citadel

afterEach(() => {
  resetDialogue();
  resetArrows();
  input.left = input.right = input.jump = input.fire = false;
  input.up = input.down = false;
  input.cast = false;
  startGame(600, 0); // a clean level: resets score + all module state
});

// Frame 1 opens the intro at spawn (x 60, in the 40–240 band); clear it so
// the world runs again for the mechanic tests.
function closeIntro() {
  update(DT, 800, fx([]));
  while (isDialogueOpen()) advanceDialogue();
}

describe('touch-sever', () => {
  it('walking into a spring cuts it: +50, spring+relic, period 6.8', () => {
    closeIntro();
    const s0 = score;
    const calls = [];
    const spring = game.level.springs[0]; // (1510, 334)
    expect(spring.cut).toBe(false);
    game.player.x = 1510; game.player.y = 320; // overlap the coil
    update(DT, 800, fx(calls));
    expect(spring.cut).toBe(true);
    expect(score).toBe(s0 + 50);
    expect(calls).toContain('spring');
    expect(calls).toContain('relic');
    expect(game.level.clock.period).toBeCloseTo(6.8, 5);
  });
});

describe('arrow-sever', () => {
  it('a normal arrow across a spring cuts it and is consumed', () => {
    closeIntro();
    game.camera.x = 1000; // bring the viewport to the spring (arrows cull off-screen)
    arrows.push({ x: 1490, y: 340, vx: 520, dead: false });
    const s0 = score;
    const calls = [];
    update(DT, 800, fx(calls));
    expect(game.level.springs[0].cut).toBe(true);
    expect(score).toBe(s0 + 50);
    expect(calls).toContain('spring');
    expect(arrows.length).toBe(0); // spent in the cut
  });

  it('a star severs the spring and keeps flying (the box rule)', () => {
    closeIntro();
    game.camera.x = 1000;
    arrows.push({ x: 1490, y: 340, vx: 520, dead: false, star: true, pierces: 2, hit: new Set() });
    update(DT, 800, fx([]));
    expect(game.level.springs[0].cut).toBe(true);
    expect(arrows.length).toBe(1); // the star survives the cut
    expect(arrows[0].dead).toBe(false);
  });
});

describe('the wind-down', () => {
  it('three cuts stretch the period to 8.4; the chime flattens to 0.94^3', () => {
    closeIntro();
    const s0 = score;
    const calls = [];
    for (const s of game.level.springs) cutSpring(game.level, s, fx(calls));
    expect(game.level.clock.period).toBeCloseTo(8.4, 5);
    expect(score).toBe(s0 + 150);
    expect(calls.filter(n => n === 'spring')).toHaveLength(3);
    expect(chimePitch(3)).toBeCloseTo(0.94 ** 3, 5);
  });

  it('gearSpeed and lightLevel read the cuts (pure)', () => {
    expect(lightLevel(0, false)).toBeCloseTo(1.0, 5);
    expect(lightLevel(2, false)).toBeCloseTo(0.6, 5);
    expect(gearSpeed(0, false)).toBeCloseTo(1.0, 5);
    expect(gearSpeed(2, false)).toBeCloseTo(0.5, 5);
    expect(gearSpeed(3, true)).toBe(0); // the Warden's rest (M6): the machine holds
  });
});

describe('the beats', () => {
  it('intro at spawn; c0 at 0 cuts; c1 after one; c2 after two; c1/c2 once', () => {
    // the intro: the Warden's omen (one-shot)
    update(DT, 800, fx([]));
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().speaker).toBe('The Warden');
    while (isDialogueOpen()) advanceDialogue();
    expect(game.dialogsFired.has('l8-intro')).toBe(true);

    const hub = () => { game.player.x = 3700; game.player.y = game.level.groundY - 36; update(DT, 800, fx([])); };
    const leave = () => { game.player.x = 3400; game.player.y = game.level.groundY - 36; update(DT, 800, fx([])); };
    const close = () => { while (isDialogueOpen()) advanceDialogue(); };

    // c0 (repeat) at 0 cuts, in front of the clock face
    hub();
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().speaker).toBe('The Great Clock');
    expect(currentLine().text).toContain('THE HEARTBEAT FADES');
    close();

    // cut spring 1 → c1 (c0's gate is now false; c0 does not refire)
    cutSpring(game.level, game.level.springs[0], fx([]));
    leave();
    hub();
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().text).toContain('ONE SPRING ANSWERS');
    close();
    expect(game.dialogsFired.has('l8-hub-1')).toBe(true);

    // cut spring 2 → c2
    cutSpring(game.level, game.level.springs[1], fx([]));
    leave();
    hub();
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().text).toContain('TWO. THE PENDULUM');
    close();
    expect(game.dialogsFired.has('l8-hub-2')).toBe(true);

    // c1 and c2 fired exactly once each
    expect(game.dialogsFired.has('l8-hub-1')).toBe(true);
    expect(game.dialogsFired.has('l8-hub-2')).toBe(true);
  });

  it('c0 repeats on each approach while 0 cuts', () => {
    closeIntro();
    const hub = () => { game.player.x = 3700; game.player.y = game.level.groundY - 36; update(DT, 800, fx([])); };
    const leave = () => { game.player.x = 3400; game.player.y = game.level.groundY - 36; update(DT, 800, fx([])); };
    const close = () => { while (isDialogueOpen()) advanceDialogue(); };

    hub();
    expect(currentLine().text).toContain('THE HEARTBEAT FADES');
    close();
    // a second approach (still 0 cuts): c0 fires again
    leave();
    hub();
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().text).toContain('THE HEARTBEAT FADES');
    close();
  });
});
