import { describe, it, expect, afterEach } from 'vitest';
import { createLevel, pitLine } from '../src/levels/level.js';
import { LEVELS } from '../src/levels/index.js';
import { createPlayer, updatePlayer, revivePlayer, respawnY, BIG_W, BIG_H } from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { setDifficulty } from '../src/difficulty.js';

const DT = 1 / 60;
const fx = { play() {} };
const cam = createCamera();
const noInput = { left: false, right: false, jump: false, fire: false, up: false, down: false, cast: false };

afterEach(() => setDifficulty('hard'));

describe('respawn height (§2.1)', () => {
  it('growing in mid-air then falling in a pit respawns on the floor, not in it', () => {
    const l = createLevel(600), p = createPlayer(l);
    for (let i = 0; i < 5; i++) updatePlayer(p, noInput, l, cam, DT, fx); // lands: safe spot recorded at h 36
    p.big = true; p.w = BIG_W; p.h = BIG_H;                               // the grow pickup, taken in the air
    p.y = l.height + 1; updatePlayer(p, noInput, l, cam, DT, fx);
    expect(p.y + p.h).toBe(l.groundY);
  });
  it('easy revive uses the same height', () => {
    setDifficulty('easy');
    const l = createLevel(600), p = createPlayer(l);
    p.safeSurf = l.ground[0]; p.h = BIG_H; revivePlayer(p, l, fx);
    expect(p.y + p.h).toBe(l.groundY);
  });
  it('no recorded surface: the ground line; a platform: its top (Review Focus 4)', () => {
    const l = createLevel(600), p = createPlayer(l);
    expect(respawnY(p, l)).toBe(l.groundY - p.h);
    p.safeSurf = l.platforms[0];
    expect(respawnY(p, l)).toBe(l.platforms[0].y - p.h);
  });
});

describe('the pit line (§2.2)', () => {
  it.each([[1, 3550], [2, 4350]])('small player standing on the bottom exit step of level %i is not falling', (idx, x) => {
    const l = LEVELS[idx].make(600), p = createPlayer(l);
    p.x = x; p.y = l.groundY + 80 - p.h;
    for (let i = 0; i < 60; i++) updatePlayer(p, noInput, l, cam, DT, fx);
    expect(p.hp).toBe(3); expect(Math.abs(p.x - x)).toBeLessThan(1);
  });
  it('level 1 is unchanged', () => { const l = createLevel(600); expect(pitLine(l)).toBe(l.height); });
});
