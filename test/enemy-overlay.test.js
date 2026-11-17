// Lane R, task R1: when an enemy's sprite sheet has decoded, render/enemies.js draws the
// sheet as the body and then the kind's drawOverlay (hp pips, tells, flashes, hazards).
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../src/sprites.js', async importActual => ({ ...(await importActual()), spriteReady: () => true }));
vi.mock('../src/render/sprite.js', async importActual => ({ ...(await importActual()), drawSpriteFeet: () => true }));

import { LEVELS } from '../src/levels/index.js';
import { createPlayer } from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { spawnEnemy } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { drawEnemies } from '../src/render/enemies.js';
import { createRecordingCtx } from './helpers/recording-ctx.js';

const LEVEL_OF = { mage: 1, spiderboss: 5, warden: 7, slime: 0 };
const levels = {};
const levelFor = kind => (levels[kind] ??= LEVELS[LEVEL_OF[kind]].make(600));

function spawnOne(kind) {
  const l = levelFor(kind);
  const e = spawnEnemy(l.roster.find(s => s.kind === kind), l);
  e.sleeping = false;
  return e;
}
function envFor(e, kind) {
  const l = levelFor(kind);
  const p = createPlayer(l); p.x = e.x - 200; p.y = l.groundY - p.h;
  return { p, lvl: l, cam: createCamera(), dt: 1 / 60, fx: { play() {} } };
}
const pips = lines => lines.filter(s => /^fillRect\(.*, 10, 4\)$/.test(s)).length;

afterEach(() => vi.restoreAllMocks());

describe('overlay over a drawn sprite', () => {
  it.each(['mage', 'warden', 'spiderboss'])('%s: its overlay is drawn over the sprite', kind => {
    const k = getKind(kind), spy = vi.spyOn(k, 'drawOverlay');
    const e = spawnOne(kind); k.update(e, envFor(e, kind)); // one update, so its state exists
    drawEnemies(createRecordingCtx().ctx, [e]);
    expect(spy).toHaveBeenCalledWith(expect.anything(), e);
  });

  it('the mage shows hp pips over his sprite', () => {
    const e = spawnOne('mage'); e.hp = 3; const r = createRecordingCtx();
    drawEnemies(r.ctx, [e]);
    expect(pips(r.lines)).toBe(5); // 5 pips, 3 filled
    expect(r.lines.filter(s => s === 'fillStyle=#e33')).toHaveLength(3);
  });

  it('the mage windup shows the glowing orb and a hit flashes over the sprite', () => {
    const e = spawnOne('mage'); e.state = 'windup'; e.flash = 0.1; const r = createRecordingCtx();
    drawEnemies(r.ctx, [e]);
    expect(r.lines).toContain('fillStyle=#ff8c42');
    expect(r.lines).toContain('fillRect(-17, -28, 34, 56)');
  });

  it('the warden shows his 16 hp pips over his sprite', () => {
    const e = spawnOne('warden'); const r = createRecordingCtx();
    drawEnemies(r.ctx, [e]);
    expect(pips(r.lines)).toBe(16);
  });

  it('the warden sweep band is still drawn in the world', () => {
    const e = spawnOne('warden');
    e.state = 'sweepTele'; e.sweepDir = 1; e.sweepBand = { x: e.x + e.w, w: 240 };
    const r = createRecordingCtx();
    drawEnemies(r.ctx, [e]);
    expect(r.lines).toContain(`fillRect(${e.x + e.w}, ${e.y + e.h - 8}, 240, 8)`);
  });

  it('the spider boss shows hp pips and a live web pillar over her sprite', () => {
    const e = spawnOne('spiderboss');
    e.pillars = [{ x: 500, w: 40, h: 120, gy: 600, t: 0.3 }];
    const r = createRecordingCtx();
    drawEnemies(r.ctx, [e]);
    expect(pips(r.lines)).toBe(16);
    expect(r.lines).toContain('fillRect(500, 480, 40, 120)'); // the pillar column, fully grown
  });

  it('a kind with no overlay still draws its sprite alone', () => {
    expect(() => drawEnemies(createRecordingCtx().ctx, [spawnOne('slime')])).not.toThrow();
  });
});
