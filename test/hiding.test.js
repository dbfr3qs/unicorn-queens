// Level 6 hiding spots: the webbed nest (arrow unravels it, star arrows
// pass through), the mud vent (dormant until socket 1, 10 s bubble
// cycle, shootable while up), and the egg sac (real-drop stomp or
// arrow). Each reveal sets its cog visible; the stage gates are the
// winch sockets (M2 beats).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startGame, game } from '../src/game.js';
import { fireArrow, fireStarArrow, updateArrows, resetArrows, arrows } from '../src/arrows.js';
import { updateVent, ventBubbleUp, VENT_TOP } from '../src/vent.js';
import { updateCogs } from '../src/cogs.js';
import { P_BOUNCE_V } from '../src/player.js';
import { particles } from '../src/particles.js';

const DT = 1 / 60;
const calls = [];
const fx = { play: n => calls.push(n) };

beforeEach(() => {
  calls.length = 0;
  resetArrows();
  startGame(600, 5);
});
afterEach(() => startGame(600, 5));

const p = () => game.player;
const lvl = () => game.level;

describe('the webbed nest (heron\'s cog)', () => {
  // The player hovers left of the nest with their bottom at 196: the
  // arrow (chest height) crosses the web's band 170-194.
  // viewW 8000: no culling, so arrows fired in world space reach the
  // target no matter where the (test) camera is.
  function hoverAndShoot(star = false) {
    p().x = 860; p().y = 160; p().facing = 1;
    star ? fireStarArrow(p()) : fireArrow(p());
    for (let i = 0; i < 30; i++) updateArrows([], lvl(), { x: 0 }, DT, fx, 8000);
  }

  it('an arrow unravels the web: cog 0 appears, thread puffs, arrow spent', () => {
    hoverAndShoot();
    expect(lvl().nest.state).toBe('open');
    expect(lvl().cogs[0].visible).toBe(true);
    expect(calls).toContain('puff');
    expect(particles.length).toBeGreaterThan(0);
  });

  it('a star arrow unravels the web too and keeps flying (bush rule)', () => {
    p().x = 860; p().y = 160; p().facing = 1;
    fireStarArrow(p());
    for (let i = 0; i < 30; i++) updateArrows([], lvl(), { x: 0 }, DT, fx, 8000);
    expect(lvl().nest.state).toBe('open'); // the web unravels either way
    expect(lvl().cogs[0].visible).toBe(true);
    expect(calls).toContain('puff');
    // the star is not spent: it flies on past the web
    expect(arrows.some(a => a.star && !a.dead)).toBe(true);
  });

  it('unravelT is set and decays (cogs.js)', () => {
    hoverAndShoot();
    expect(lvl().nest.unravelT).toBeCloseTo(0.5, 5);
    updateCogs(lvl(), p(), DT, fx);
    expect(lvl().nest.unravelT).toBeCloseTo(0.5 - DT, 5);
  });
});

describe('the mud vent (adder\'s cog)', () => {
  it('stays dormant until socket 1 fills: the clock does not run', () => {
    expect(lvl().vent.active).toBe(false);
    updateVent(lvl(), DT, fx);
    expect(lvl().vent.t).toBe(0);
    expect(lvl().vent.bubbleY).toBe(560);
  });

  it('runs the 10 s cycle: mud -> pop point -> bob -> sink -> idle', () => {
    const v = lvl().vent;
    v.active = true; // socket 1 filled (the w1 beat)
    v.t = 0; updateVent(lvl(), DT, fx);
    expect(v.bubbleY).toBeGreaterThan(550); // rising out of the mud
    v.t = 1.2; updateVent(lvl(), DT, fx);
    expect(Math.abs(v.bubbleY - VENT_TOP)).toBeLessThanOrEqual(5); // at the pop point
    v.t = 4; updateVent(lvl(), DT, fx);
    expect(Math.abs(v.bubbleY - VENT_TOP)).toBeLessThanOrEqual(5); // bobbing
    v.t = 7.5; updateVent(lvl(), DT, fx);
    expect(v.bubbleY).toBe(560); // idle in the mud
    v.t = 9.9; updateVent(lvl(), DT, fx);
    expect(v.bubbleY).toBe(560); // still idle
  });

  it('puffs exactly once per cycle, when the bubble surfaces', () => {
    const v = lvl().vent;
    v.active = true;
    v.t = 0;
    for (let i = 0; i < 600; i++) updateVent(lvl(), DT, fx); // one full 10 s cycle
    expect(calls.filter(n => n === 'puff')).toHaveLength(1);
  });

  it('shot while up: the bubble pops and the adder\'s cog floats at the pop point', () => {
    const v = lvl().vent;
    v.active = true;
    v.t = 2; // mid-bob, up
    updateVent(lvl(), DT, fx); // the bubble surfaces to the pop point
    expect(ventBubbleUp(lvl())).toBe(true);
    p().x = 1900; p().y = 468; p().facing = 1; // hovering over the water
    fireArrow(p());
    for (let i = 0; i < 30 && !v.popped; i++) updateArrows([], lvl(), { x: 0 }, DT, fx, 8000);
    expect(v.popped).toBe(true);
    expect(lvl().cogs[1].visible).toBe(true);
    expect(lvl().cogs[1].x).toBe(2092);
    expect(lvl().cogs[1].y).toBe(490);
    expect(calls).toContain('pop');
  });

  it('cannot be shot while down in the mud', () => {
    const v = lvl().vent;
    v.active = true;
    v.t = 9; // idle: the bubble is under the mud line
    expect(ventBubbleUp(lvl())).toBe(false);
    p().x = 1900; p().y = 516; p().facing = 1; // arrow at the mud level
    fireArrow(p());
    for (let i = 0; i < 40; i++) updateArrows([], lvl(), { x: 0 }, DT, fx, 8000);
    expect(v.popped).toBe(false);
    expect(lvl().cogs[1].visible).toBe(false);
  });
});

describe('the egg sac (weaver\'s cog)', () => {
  it('a real drop (vy > 50) pops it: cog 2 floats, the player bounces', () => {
    const sac = lvl().sac;
    sac.present = true; // socket 2 filled (the w3 beat)
    p().x = 4315; p().y = 480; p().vy = 200; // falling onto the sac
    updateCogs(lvl(), p(), DT, fx);
    expect(sac.popped).toBe(true);
    expect(lvl().cogs[2].visible).toBe(true);
    expect(p().vy).toBe(P_BOUNCE_V);
    expect(calls).toContain('pop');
    expect(particles.length).toBeGreaterThan(0);
  });

  it('walking on the dais overlaps the sac without popping it', () => {
    const sac = lvl().sac;
    sac.present = true;
    p().x = 4315; p().y = 490; p().vy = 0; // standing still on/over the sac
    updateCogs(lvl(), p(), DT, fx);
    expect(sac.popped).toBe(false);
    expect(lvl().cogs[2].visible).toBe(false);
    p().vy = 30; // a small hop is not a drop
    updateCogs(lvl(), p(), DT, fx);
    expect(sac.popped).toBe(false);
  });

  it('an arrow from the dais pops it', () => {
    const sac = lvl().sac;
    sac.present = true;
    p().x = 4280; p().y = 520 - p().h; p().facing = 1; // standing on the dais, left of the sac
    fireArrow(p()); // chest-height arrow crosses the sac
    updateArrows([], lvl(), { x: 0 }, DT, fx, 8000);
    expect(sac.popped).toBe(true);
    expect(lvl().cogs[2].visible).toBe(true);
    expect(calls).toContain('pop');
  });
});
