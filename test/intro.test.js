// The opening scene: a pure function of its clock, with one-shot cues and a
// skip. Pinned because it plays before anyone can see a level, and because
// the game underneath it must come out exactly as a plain start would.
import { describe, it, expect, beforeEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { startIntro, endIntro, updateIntro, pose, LINES, CUES, INTRO_LENGTH, CAM_X } from '../src/intro.js';
import { particles, resetParticles } from '../src/particles.js';
import { music } from '../src/music.js';

const DT = 1 / 60;
const spy = () => { const played = []; return { play: n => played.push(n), played }; };
let fx;
beforeEach(() => { fx = spy(); resetParticles(); startIntro(600); });

describe('the pose', () => {
  it('opens on the two of them strolling east, him a little ahead', () => {
    const p = pose(0.5);
    expect(p.king.x).toBeGreaterThan(p.queen.x);
    expect(pose(3).queen.x).toBeGreaterThan(pose(1).queen.x);
    expect(p.wizard.visible).toBe(false);
    expect(p.fadeIn).toBeGreaterThan(0); // still lifting
    expect(pose(1.2).fadeIn).toBe(0);
  });

  it('brings the sorcerer down from the high east and settles him over the wood', () => {
    const a = pose(4.5), b = pose(5.2);
    expect(a.wizard.visible).toBe(true);
    expect(a.wizard.x).toBeGreaterThan(b.wizard.x); // coming in from the east
    expect(a.wizard.y).toBeLessThan(b.wizard.y); // and down
    expect(b.wizard).toMatchObject({ x: 1080, y: 440 });
    expect(pose(4.4).dark).toBe(0);
    expect(pose(5.4).dark).toBeCloseTo(0.35, 5);
  });

  it('has the King charge, meet the ward, and come back down thrown', () => {
    expect(pose(9.3).king.x).toBeGreaterThan(pose(9.0).king.x);
    const mid = pose(9.6);
    expect(mid.king.y).toBeLessThan(560); // off the ground
    expect(pose(10).king).toMatchObject({ x: 985, y: 560 });
  });

  it('carries him off: both rise together and leave the frame, him facing back', () => {
    const p = pose(12);
    expect(p.king.x).toBe(p.wizard.x);
    expect(p.wizard.y).toBe(p.king.y - 46); // the rider above the carried
    expect(p.king.y).toBeLessThan(560);
    expect(p.king.face).toBe(-1);
    expect(pose(13.5).king.visible).toBe(false);
    expect(pose(13.5).wizard.visible).toBe(false);
  });

  it('leaves the Queen alone, having run after them and stopped', () => {
    expect(pose(12.5).queen.x).toBe(985);
    expect(pose(12.5).queen.bob).toBe(0);
  });

  it('says each line in its slot, and nothing between', () => {
    for (const l of LINES) expect(pose(l.at + 0.01).caption).toBe(l);
    expect(pose(0.2).caption).toBe(null);
    expect(pose(4.8).caption).toBe(null);
    expect(pose(16).caption).toBe(null);
  });

  it('fades to black, shows the card, and is done by INTRO_LENGTH', () => {
    expect(pose(16.4).fadeOut).toBe(1);
    expect(pose(17.2).card).toBe(1);
    expect(pose(INTRO_LENGTH).card).toBe(0);
  });

  it('wraps every caption in two rows of the box', () => {
    for (const l of LINES) expect(l.text.length).toBeLessThanOrEqual(110);
  });
});

describe('the run', () => {
  const run = seconds => { for (let i = 0; i < Math.round(seconds / DT); i++) update(DT, 800, fx); };

  it('builds level 1 underneath and holds its clock while the scene plays', () => {
    expect(game.intro).toBeTruthy();
    expect(game.intro.camera.x).toBe(CAM_X);
    expect(game.levelIndex).toBe(0);
    const x0 = game.player.x;
    run(3);
    expect(game.gameTime).toBe(0);
    expect(game.player.x).toBe(x0);
    expect(game.intro.t).toBeCloseTo(3, 1);
  });

  it('plays the forest music over the wood, and level 1 music after', () => {
    expect(music.track).toBe('enchanted-forest');
    endIntro();
    expect(music.track).toBe('meadow');
  });

  it('fires every cue once, in order, as the clock passes it', () => {
    run(9.4);
    expect(particles.length).toBeGreaterThan(0); // the charge's sparks, just burst
    run(INTRO_LENGTH - 0.5 - 9.4);
    const sfx = CUES.filter(c => c.sfx).map(c => c.sfx);
    expect(fx.played).toEqual(sfx);
  });

  it('ends on its own at INTRO_LENGTH, into level 1', () => {
    run(INTRO_LENGTH + 0.1);
    expect(game.intro).toBe(null);
    expect(game.levelIndex).toBe(0);
    expect(game.gameTime).toBeGreaterThan(0); // and level 1's clock is running
  });

  it('does not count the key that skipped it as a jump', () => {
    run(2);
    endIntro();
    expect(game.player.jumpHeld).toBe(true); // the restart-key rule: release and press again to jump
  });

  it('skips cleanly from anywhere, and a second end is a no-op', () => {
    run(6);
    endIntro();
    expect(game.intro).toBe(null);
    endIntro();
    expect(game.intro).toBe(null);
    run(1);
    expect(game.gameTime).toBeGreaterThan(0); // level 1 is live
  });

  it('is what a plain startGame(600, 0) is, once it lets go', () => {
    run(2); endIntro();
    const viaIntro = { hp: game.player.hp, big: game.player.big, hasBow: game.player.hasBow, hasFlight: game.player.hasFlight, x: game.player.x };
    startGame(600, 0);
    expect(viaIntro).toEqual({ hp: game.player.hp, big: game.player.big, hasBow: game.player.hasBow, hasFlight: game.player.hasFlight, x: game.player.x });
  });
});
