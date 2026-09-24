// Difficulty D6: level hazards scale by the preset's `hazard`; roster
// entries can be kept to the harder presets.
import { describe, it, expect, afterEach } from 'vitest';
import { createPlayer, updatePlayer, webSlowTime, flightRecharge, WEB_SLOW_TIME, FLIGHT_CD, GUST_PUSH } from '../src/player.js';
import { createEnemies } from '../src/enemies.js';
import { fireWebGlob, updateFireballs, fireballs, resetFireballs } from '../src/projectiles.js';
import { createLevel } from '../src/levels/level.js';
import { createCamera } from '../src/camera.js';
import { PRESETS, setDifficulty, DEFAULT_DIFFICULTY } from '../src/difficulty.js';

const DT = 1 / 60;
const fx = { play() {} };
const noInput = { left: false, right: false, jump: false, fire: false };
afterEach(() => { setDifficulty(DEFAULT_DIFFICULTY); resetFireballs(); });

describe('scaled hazards', () => {
  it('are the designed constants at hard', () => {
    expect(webSlowTime()).toBe(WEB_SLOW_TIME);
    expect(flightRecharge()).toBe(FLIGHT_CD);
  });

  it.each(['easy', 'medium'])('shrink by hazard on %s', d => {
    setDifficulty(d);
    expect(webSlowTime()).toBeCloseTo(WEB_SLOW_TIME * PRESETS[d].hazard);
    expect(flightRecharge()).toBeCloseTo(FLIGHT_CD * PRESETS[d].hazard);
  });

  it('a web glob slows for the scaled time', () => {
    setDifficulty('easy');
    const l = createLevel(600);
    const p = createPlayer(l);
    p.x = 300; p.y = l.groundY - p.h;
    fireWebGlob(p.x, p.y + 10, 0, 0, fx);
    updateFireballs(p, l, createCamera(), DT, fx);
    expect(p.webT).toBeCloseTo(WEB_SLOW_TIME * PRESETS.easy.hazard);
  });

  it('the gust pushes a grounded player hazard × GUST_PUSH', () => {
    const push = d => {
      setDifficulty(d);
      const l = { ...createLevel(600), wind: { phase: 'gust' } };
      const p = createPlayer(l);
      p.x = 600; p.y = l.groundY - p.h; p.onGround = true;
      updatePlayer(p, noInput, l, createCamera(), DT, fx);
      updatePlayer(p, noInput, l, createCamera(), DT, fx);
      const x0 = p.x;
      updatePlayer(p, noInput, l, createCamera(), DT, fx);
      return x0 - p.x;
    };
    expect(push('hard')).toBeCloseTo(GUST_PUSH * DT);
    expect(push('easy')).toBeCloseTo(GUST_PUSH * PRESETS.easy.hazard * DT);
  });
});

describe('roster `only`', () => {
  const lvl = () => ({
    ...createLevel(600),
    roster: [
      { kind: 'slime', x: 100 },
      { kind: 'slime', x: 200, only: ['hard'] },
      { kind: 'slime', x: 300, only: ['medium', 'hard'] },
    ],
  });

  it.each([['easy', [100]], ['medium', [100, 300]], ['hard', [100, 200, 300]]])('%s spawns %j', (d, xs) => {
    setDifficulty(d);
    expect(createEnemies(lvl()).map(e => e.x)).toEqual(xs);
  });
});
