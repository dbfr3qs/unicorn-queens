// Lane R, task R3: the non-boss kinds. With the sprite sheet "decoded" (mocked ready),
// render/enemies.js draws the sheet and then the kind's drawOverlay; these tests pin what
// the player must still be able to read (shield, tells, thread, sleeping coil, rim ...).
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../src/sprites.js', async importActual => ({ ...(await importActual()), spriteReady: () => true }));
vi.mock('../src/render/sprite.js', async importActual => ({ ...(await importActual()), drawSpriteFeet: () => true }));

import { spawnEnemy } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { drawEnemies } from '../src/render/enemies.js';
import { game } from '../src/game.js';
import { createRecordingCtx } from './helpers/recording-ctx.js';

const LVL = { groundY: 600, width: 3000, roster: [] };
const spawnOne = (kind, extra = {}) => Object.assign(spawnEnemy({ kind, x: 400 }, LVL), extra);
const lines = e => { const r = createRecordingCtx(); drawEnemies(r.ctx, [e]); return r.lines; };

afterEach(() => { vi.restoreAllMocks(); game.gameTime = 0; });

const WITH_OVERLAY = ['sentinel', 'hare', 'ghost', 'snake', 'adder', 'spider', 'wraith'];
const WITHOUT = ['zombie', 'bat', 'bee', 'moth', 'slime'];

describe('overlays over a drawn sprite (non-boss kinds)', () => {
  it.each(WITH_OVERLAY)('%s: its overlay is drawn over the sprite', kind => {
    const k = getKind(kind), spy = vi.spyOn(k, 'drawOverlay');
    const e = spawnOne(kind);
    drawEnemies(createRecordingCtx().ctx, [e]);
    expect(spy).toHaveBeenCalledWith(expect.anything(), e, { top: e.y + e.h - e.h * 1.45 }); // the drawn sheet's top
  });

  it.each(WITHOUT)('%s: nothing state-dependent to read, so no overlay; the sprite alone draws', kind => {
    expect(getKind(kind).drawOverlay).toBeUndefined();
    expect(() => lines(spawnOne(kind))).not.toThrow();
  });

  it('the sentinel shows its raised shield only while shieldUp', () => {
    expect(lines(spawnOne('sentinel', { shieldUp: true }))).toContain('fillRect(12, -15, 8, 30)');
    expect(lines(spawnOne('sentinel', { shieldUp: false }))).not.toContain('fillRect(12, -15, 8, 30)');
  });

  it('the sentinel shield turns with its facing', () => {
    const l = lines(spawnOne('sentinel', { shieldUp: true, dir: -1 }));
    expect(l).toContain('scale(-1, 1)');
  });

  it('the hare shows its crouch tell only while crouching', () => {
    expect(lines(spawnOne('hare', { state: 'crouch' }))).toContain('fillStyle=#ff8c42');
    expect(lines(spawnOne('hare', { state: 'patrol' }))).not.toContain('fillStyle=#ff8c42');
  });

  it('the ghost shows the lantern-repelled glint only while flickering', () => {
    expect(lines(spawnOne('ghost', { flicker: 0.2, phase: 0 }))).toContain('strokeStyle=rgba(255, 205, 130, 0.6)');
    expect(lines(spawnOne('ghost', { flicker: 0, phase: 0 }))).not.toContain('strokeStyle=rgba(255, 205, 130, 0.6)');
  });

  it('the snake shows its tongue\'s red as a glow over the sheet on the telegraph only', () => {
    expect(lines(spawnOne('snake', { state: 'telegraph' }))).toContain('fillStyle=#e33');
    expect(lines(spawnOne('snake', { state: 'telegraph' })).some(s => s.startsWith('ellipse('))).toBe(true);
    expect(lines(spawnOne('snake', { state: 'telegraph' }))).not.toContain('strokeStyle=#e33'); // no tongue off the sheet
    expect(lines(spawnOne('snake', { state: 'patrol' }))).not.toContain('fillStyle=#e33');
    expect(lines(spawnOne('adder', { state: 'telegraph' }))).toContain('fillStyle=#e33');
  });

  it('a sleeping snake\'s z\'s sit over the middle of its box, whichever way it faces', () => {
    const e = spawnOne('snake', { sleeping: true, dir: -1 });
    const r = createRecordingCtx();
    getKind('snake').drawOverlay(r.ctx, e);
    expect(r.lines).toContain(`translate(${e.x + e.w / 2}, ${e.y + e.h})`);
    expect(r.lines).toContain('moveTo(6, -30)'); // the first z, just past the middle
  });

  it('a sleeping adder shows its sleeping mark, an awake one does not', () => {
    const sleep = lines(spawnOne('adder', { sleeping: true })).filter(s => s.startsWith('strokeStyle='));
    const awake = lines(spawnOne('adder', { sleeping: false })).filter(s => s.startsWith('strokeStyle='));
    expect(sleep.length).toBeGreaterThan(0);
    expect(awake).toHaveLength(0);
  });

  it('the spider thread is drawn in world space from its anchor, only while attached', () => {
    const hang = spawnOne('spider', { state: 'hang', anchorX: 410, anchorY: 300, y: 350 });
    const l = lines(hang);
    expect(l).toContain('moveTo(410, 300)');
    expect(l).toContain(`lineTo(${hang.x + hang.w / 2}, ${hang.y + 2})`);
    expect(lines(spawnOne('spider', { state: 'pounce', anchorY: 300 })).filter(s => s.startsWith('moveTo'))).toHaveLength(0);
    expect(lines(spawnOne('spider', { state: 'climb', anchorX: 410, anchorY: 300 }))).toContain('moveTo(410, 300)');
  });

  it('the snowfield wraith shows its rim by wind phase; bound wraiths show none', () => {
    const rim = e => lines(e).filter(s => s === 'strokeStyle=#8fd3f4').length;
    game.gameTime = 8; // gust
    expect(rim(spawnOne('wraith', { phase: 0 }))).toBe(1);
    expect(rim(spawnOne('wraith', { phase: 0, bound: true }))).toBe(0);
    game.gameTime = 1; // calm: a faint rim, thinner than the gust's
    const calm = lines(spawnOne('wraith', { phase: 0 }));
    expect(calm).toContain('globalAlpha=0.45');
  });

  it('a freed wraith shows its rim fading with its release', () => {
    expect(lines(spawnOne('wraith', { phase: 0, freed: true, freeT: 0.5 }))).toContain('globalAlpha=0.5');
  });

  it.each(WITH_OVERLAY)('%s: drawOverlay leaves the canvas balanced', kind => {
    game.gameTime = 8;
    const e = spawnOne(kind, { shieldUp: true, state: kind === 'hare' ? 'crouch' : 'telegraph', flicker: 0.2, phase: 0, sleeping: false });
    const r = createRecordingCtx();
    getKind(kind).drawOverlay(r.ctx, e);
    const n = name => r.lines.filter(s => s === name).length;
    expect(n('save()')).toBeGreaterThan(0);
    expect(n('save()')).toBe(n('restore()'));
  });
});
