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
// The drawn sheet's top edge, as render/enemies.js passes it (OVERHANG 1.45), and the
// sprite path's glow cue over the sheet (src/enemies/glow.js), as the recording ctx rounds.
const topOf = e => e.y + e.h - e.h * 1.45;
const r3 = v => Number(v.toFixed(3));
const glowOf = e => {
  const top = topOf(e), bottom = e.y + e.h;
  return `ellipse(${[e.x + e.w / 2, (top + bottom) / 2, e.w * 0.55, (bottom - top) * 0.42].map(r3).join(', ')}, 0, 0, 6.283)`;
};

afterEach(() => vi.restoreAllMocks());

describe('overlay over a drawn sprite', () => {
  it.each(['mage', 'warden', 'spiderboss'])('%s: its overlay is drawn over the sprite', kind => {
    const k = getKind(kind), spy = vi.spyOn(k, 'drawOverlay');
    const e = spawnOne(kind); k.update(e, envFor(e, kind)); // one update, so its state exists
    drawEnemies(createRecordingCtx().ctx, [e]);
    expect(spy).toHaveBeenCalledWith(expect.anything(), e, { top: topOf(e) });
  });

  it('the mage shows hp pips over his sprite', () => {
    const e = spawnOne('mage'); e.hp = 3; const r = createRecordingCtx();
    drawEnemies(r.ctx, [e]);
    expect(pips(r.lines)).toBe(5); // 5 pips, 3 filled
    expect(r.lines.filter(s => s === 'fillStyle=#e33')).toHaveLength(3);
  });

  it('the mage pips sit above the drawn sheet, not the box (final review F9)', () => {
    const e = spawnOne('mage'); const r = createRecordingCtx();
    drawEnemies(r.ctx, [e]);
    expect(r.lines).toContain(`fillRect(${r3(e.x + e.w / 2 - 30 + 1)}, ${r3(topOf(e) - 14)}, 10, 4)`);
  });

  it('the mage windup shows the orb\'s orange as a glow over the sheet, and a hit flashes over the sprite', () => {
    const e = spawnOne('mage'); e.state = 'windup'; e.flash = 0.1; const r = createRecordingCtx();
    drawEnemies(r.ctx, [e]);
    expect(r.lines).toContain('fillStyle=#ff8c42');
    expect(r.lines).toContain(glowOf(e));
    expect(r.lines).not.toContain('fillRect(11, -24, 9, 9)'); // no orb off the sheet's shoulder
    expect(r.lines).toContain('fillRect(-17, -28, 34, 56)');
    const idle = spawnOne('mage'); idle.state = 'idle'; const b = createRecordingCtx();
    drawEnemies(b.ctx, [idle]);
    expect(b.lines).not.toContain(glowOf(idle));
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

  it('the spider boss shows the gold web only while open', () => {
    const open = spawnOne('spiderboss'); open.state = 'recover';
    const shut = spawnOne('spiderboss'); shut.state = 'idle';
    const a = createRecordingCtx(), b = createRecordingCtx();
    drawEnemies(a.ctx, [open]); drawEnemies(b.ctx, [shut]);
    expect(a.lines.filter(s => s === 'strokeStyle=rgba(255, 209, 102, 0.95)')).toHaveLength(1);
    expect(a.lines.filter(s => s.startsWith('ellipse(0,'))).toHaveLength(3); // centred on the sheet (F9)
    expect(b.lines.filter(s => s.startsWith('strokeStyle='))).toHaveLength(0);
  });

  it('the spider boss lunge tell is shown for lungeTele only', () => {
    const tell = spawnOne('spiderboss'); tell.state = 'lungeTele';
    const idle = spawnOne('spiderboss'); idle.state = 'idle';
    const a = createRecordingCtx(), b = createRecordingCtx();
    drawEnemies(a.ctx, [tell]); drawEnemies(b.ctx, [idle]);
    expect(a.lines).toContain('fillStyle=#ff8c42');
    expect(b.lines).not.toContain('fillStyle=#ff8c42');
  });

  it('the warden core glow (dim, phase 2, sleeping) is a glow over the sheet at half the core\'s alpha', () => {
    const dim = spawnOne('warden'); dim.phase = 1;
    const p2 = spawnOne('warden'); p2.phase = 1; p2.hp = 4;
    const asleep = spawnOne('warden'); asleep.phase = 1; asleep.sleeping = true;
    const glow = e => { const r = createRecordingCtx(); drawEnemies(r.ctx, [e]); return r.lines; };
    expect(glow(dim)).toContain('globalAlpha=0.225');
    expect(glow(dim)).toContain('fillStyle=#c98f3d');
    expect(glow(dim)).toContain(glowOf(dim));
    expect(glow(dim)).not.toContain('fillRect(-7, -42, 14, 14)'); // no chest square on the sheet
    expect(glow(p2)).toContain('globalAlpha=0.4');
    expect(glow(p2)).toContain('fillStyle=#e8b86d');
    expect(glow(asleep).some(s => /^globalAlpha=0\.(1|2)\d*$/.test(s))).toBe(true);
  });

  it('the warden reset window is the cyan glow over the sheet, and only then', () => {
    const open = spawnOne('warden'); open.phase = 0; open.inWindow = true;
    const shut = spawnOne('warden'); shut.phase = 0;
    const glow = e => { const r = createRecordingCtx(); drawEnemies(r.ctx, [e]); return r.lines; };
    expect(glow(open)).toContain('fillStyle=#7ec8ff');
    expect(glow(open)).toContain(glowOf(open));
    expect(glow(shut)).not.toContain('fillStyle=#7ec8ff');
  });

  it('the warden slam and bolt wind-ups are the orange glow over the sheet, not the vector arms', () => {
    const glow = state => { const e = spawnOne('warden'); e.state = state; e.phase = 1; const r = createRecordingCtx(); drawEnemies(r.ctx, [e]); return r.lines; };
    for (const state of ['slamWind', 'charge']) {
      expect(glow(state)).toContain('fillStyle=#ff8c42');
      expect(glow(state).some(s => /^fillRect\(8, /.test(s))).toBe(false); // no arm rectangle
    }
    expect(glow('idle')).not.toContain('fillStyle=#ff8c42');
    expect(glow('sweepTele').some(s => /^fillRect\(8, /.test(s))).toBe(false); // the band and blade carry it
  });

  it('the spider boss spit wind-up is the fangs\' pale glow over the sheet, and only then', () => {
    const spit = spawnOne('spiderboss'); spit.state = 'spitWind';
    const idle = spawnOne('spiderboss'); idle.state = 'idle';
    const a = createRecordingCtx(), b = createRecordingCtx();
    drawEnemies(a.ctx, [spit]); drawEnemies(b.ctx, [idle]);
    expect(a.lines).toContain('fillStyle=rgba(240, 240, 248, 0.5)');
    expect(a.lines).toContain(glowOf(spit));
    expect(a.lines.some(s => s.startsWith('ellipse(30,'))).toBe(false); // no fang dot off the sheet
    expect(b.lines).not.toContain('fillStyle=rgba(240, 240, 248, 0.5)');
  });

  it.each(['mage', 'warden', 'spiderboss'])('%s: drawOverlay leaves the canvas balanced', kind => {
    const e = spawnOne(kind); e.flash = 0.1; e.levitating = true; e.homeY = e.y + 40;
    const r = createRecordingCtx();
    getKind(kind).drawOverlay(r.ctx, e);
    const n = name => r.lines.filter(s => s === name).length;
    expect(n('save()')).toBeGreaterThan(0);
    expect(n('save()')).toBe(n('restore()'));
  });

  it('a kind with no overlay still draws its sprite alone', () => {
    expect(() => drawEnemies(createRecordingCtx().ctx, [spawnOne('slime')])).not.toThrow();
  });
});
