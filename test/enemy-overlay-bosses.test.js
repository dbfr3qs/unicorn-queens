// Lane R, task R2: the troll, the dragon, the wizard and the Frost Queen keep their
// pips, tells, windows and hazards when render/enemies.js draws a sprite sheet as the
// body and then the kind's drawOverlay.
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../src/sprites.js', async importActual => ({ ...(await importActual()), spriteReady: () => true }));
vi.mock('../src/render/sprite.js', async importActual => ({ ...(await importActual()), drawSpriteFeet: vi.fn(() => true) }));

import { LEVELS } from '../src/levels/index.js';
import { createPlayer } from '../src/player.js';
import { createCamera } from '../src/camera.js';
import { spawnEnemy } from '../src/enemies.js';
import { getKind } from '../src/enemies/index.js';
import { drawEnemies } from '../src/render/enemies.js';
import { drawSpriteFeet } from '../src/render/sprite.js';
import { createRecordingCtx } from './helpers/recording-ctx.js';

const LEVEL_OF = { troll: 2, dragon: 3, wizardboss: 6, queenboss: 8 };
const BOSSES = Object.keys(LEVEL_OF);
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
// One spawned, updated once (so its state exists), then shaped by `set`.
function boss(kind, set = () => {}) {
  const e = spawnOne(kind);
  getKind(kind).update(e, envFor(e, kind));
  set(e);
  return e;
}
const drawn = e => { const r = createRecordingCtx(); drawEnemies(r.ctx, [e]); return r.lines; };
const count = (lines, re) => lines.filter(s => re.test(s)).length;
const pipMaxOf = (e, kind) => e.maxHp ?? getKind(kind).hp;
const args = (...v) => v.map(x => Number(x.toFixed(3))).join(', '); // as the recording ctx rounds

afterEach(() => { vi.restoreAllMocks(); drawSpriteFeet.mockClear(); });

describe('boss overlays over a drawn sprite', () => {
  it('every boss has an overlay', () => {
    for (const kind of ['mage', 'troll', 'dragon', 'spiderboss', 'wizardboss', 'warden', 'queenboss'])
      expect(typeof getKind(kind).drawOverlay).toBe('function');
  });

  it.each(BOSSES)('%s: its overlay is drawn over the sprite', kind => {
    const k = getKind(kind), spy = vi.spyOn(k, 'drawOverlay');
    const e = boss(kind, s => { if (kind === 'wizardboss') s.stage = 2; }); // the form his sheet depicts
    drawEnemies(createRecordingCtx().ctx, [e]);
    expect(spy).toHaveBeenCalledWith(expect.anything(), e);
  });

  it.each([
    ['troll', s => s.state = 'slamWindup'],
    ['troll', s => { s.state = 'shield'; s.shield = true; s.phase2 = true; s.flash = 0.1; }],
    ['dragon', s => { s.state = 'perch'; s.perch = 'breath'; s.flash = 0.1; }],
    ['wizardboss', s => { s.stage = 2; s.state = 'sealTele'; s.sealX = 5700; s.flash = 0.1; s.columns = [{ x: 5800, w: 40, h: 140, t: 0.5, baseY: 560 }]; }],
    ['wizardboss', s => { s.stage = 2; s.state = 'windup'; s.hp = 2; }],
    ['wizardboss', s => { s.stage = 2; s.state = 'slamTele'; s.hp = 2; s.flash = 0.1; }],
    ['wizardboss', s => { s.stage = 2; s.state = 'idle'; }],
    ['queenboss', s => { s.wind = 'slam'; s.phaseT = 0.5; s.staggerT = 0.2; s.spikes = [{ x: 5500, t: 0.3 }, { x: 5600, t: 1.0 }]; }],
    ['queenboss', s => { s.dead = true; s.dying = true; s.dyingT = 1.5; }],
  ])('%s: drawOverlay leaves the canvas balanced (%#)', (kind, set) => {
    const e = boss(kind, set);
    const r = createRecordingCtx();
    getKind(kind).drawOverlay(r.ctx, e);
    const n = name => r.lines.filter(s => s === name).length;
    expect(n('save()')).toBeGreaterThan(0);
    expect(n('save()')).toBe(n('restore()'));
  });
});

describe('the troll over his sprite', () => {
  it('shows his hp pips, two rows of 7x4', () => {
    const e = boss('troll', s => s.hp = 5);
    const lines = drawn(e);
    expect(count(lines, /^fillRect\(.*, 7, 4\)$/)).toBe(pipMaxOf(e, 'troll'));
    expect(lines.filter(s => s === 'fillStyle=#a3d977')).toHaveLength(5);
  });

  it('flashes when hit', () => {
    expect(drawn(boss('troll', s => s.flash = 0.1))).toContain('fillRect(-24, -36, 48, 72)');
    expect(drawn(boss('troll'))).not.toContain('fillRect(-24, -36, 48, 72)');
  });

  it('raises the club for the slam (crouched) and the lob, and only then', () => {
    const slam = drawn(boss('troll', s => s.state = 'slamWindup'));
    const lob = drawn(boss('troll', s => s.state = 'lobWindup'));
    const idle = drawn(boss('troll', s => s.state = 'idle'));
    expect(slam).toContain('translate(0, 5)'); // the crouch
    expect(slam).toContain('fillRect(1, -52, 13, 10)'); // the club head, overhead
    expect(lob).toContain('fillRect(19, -52, 13, 10)'); // the club head, cocked to throw
    expect(idle.some(s => /, 13, 10\)$/.test(s))).toBe(false);
  });

  it('holds the stone slab while shielding, and only then', () => {
    const up = drawn(boss('troll', s => { s.state = 'shield'; s.shield = true; }));
    const down = drawn(boss('troll', s => { s.state = 'idle'; s.shield = false; }));
    expect(up).toContain('fillStyle=#9aa0a8');
    expect(up).toContain('fillRect(20, -20, 9, 44)');
    expect(down).not.toContain('fillStyle=#9aa0a8');
  });

  it('shows the ember eyes in phase 2, and only then', () => {
    expect(drawn(boss('troll', s => s.phase2 = true))).toContain('fillStyle=#ff8c42');
    expect(drawn(boss('troll', s => s.phase2 = false))).not.toContain('fillStyle=#ff8c42');
  });
});

describe('the dragon over its sprite', () => {
  it('shows its hp pips, two rows', () => {
    const e = boss('dragon', s => s.hp = 4);
    const lines = drawn(e);
    expect(count(lines, /^fillRect\(.*, 10, 4\)$/)).toBe(pipMaxOf(e, 'dragon'));
    expect(lines.filter(s => s === 'fillStyle=#e33')).toHaveLength(4);
  });

  it('flashes when hit', () => {
    expect(drawn(boss('dragon', s => s.flash = 0.1))).toContain('ellipse(0, 0, 28, 18, 0, 0, 6.283)');
  });

  it('glows its eye through the fireball windup, and only then', () => {
    expect(drawn(boss('dragon', s => s.state = 'windup'))).toContain('fillStyle=#ffd166');
    expect(drawn(boss('dragon', s => s.state = 'idle'))).not.toContain('fillStyle=#ffd166');
  });

  it('shows the chest glow through the inhale and the open jaw through the breath', () => {
    const inhale = drawn(boss('dragon', s => { s.state = 'perch'; s.perch = 'inhale'; }));
    const breath = drawn(boss('dragon', s => { s.state = 'perch'; s.perch = 'breath'; }));
    const descend = drawn(boss('dragon', s => { s.state = 'perch'; s.perch = 'descend'; }));
    expect(inhale).toContain('fillStyle=#ff8c42');
    expect(inhale).not.toContain('fillRect(28, -2, 12, 8)');
    expect(breath).toContain('fillRect(28, -2, 12, 8)');
    expect(descend).not.toContain('fillStyle=#ff8c42');
  });
});

describe('the wizard over his sprite', () => {
  it('stage 1: violet pips and the rune on the near flank', () => {
    const e = boss('wizardboss', s => { s.state = 'idle'; s.hp = 7; });
    const lines = drawn(e);
    expect(count(lines, /^fillRect\(.*, 10, 4\)$/)).toBe(pipMaxOf(e, 'wizardboss'));
    expect(lines.filter(s => s === 'fillStyle=#b06aff')).toHaveLength(7);
    expect(lines).toContain('fillStyle=#6a3a9a'); // the rune
    expect(e.weakSide).toBe(-1); // the player stands to his left
    expect(lines).toContain(`translate(${args(e.x + 8 + 12, e.y + 24)})`);
  });

  it('stage 1: the bolt windup and the swoop telegraph, and only then', () => {
    const windup = drawn(boss('wizardboss', s => s.state = 'windup'));
    const swoop = drawn(boss('wizardboss', s => s.state = 'swoopTele'));
    const idle = drawn(boss('wizardboss', s => s.state = 'idle'));
    expect(windup).toContain('fillStyle=#ffd166');
    expect(swoop).toContain('fillStyle=#ffd166');
    expect(idle).not.toContain('fillStyle=#ffd166');
  });

  it('downed: no rune; the daze stars while he is open on the floor', () => {
    const lines = drawn(boss('wizardboss', s => s.state = 'stunned'));
    expect(lines).not.toContain('fillStyle=#6a3a9a');
    expect(count(lines, /^fillRect\(.*, 3, 3\)$/)).toBe(3);
  });

  it('stage 2: the ward while it is up, gone while he casts', () => {
    const warded = drawn(boss('wizardboss', s => { s.stage = 2; s.state = 'idle'; }));
    const casting = drawn(boss('wizardboss', s => { s.stage = 2; s.state = 'windup'; }));
    expect(warded).toContain('strokeStyle=#b06aff');
    expect(casting).not.toContain('strokeStyle=#b06aff');
  });

  it('stage 2: the slam telegraph, and only then', () => {
    const slam = drawn(boss('wizardboss', s => { s.stage = 2; s.state = 'slamTele'; }));
    const idle = drawn(boss('wizardboss', s => { s.stage = 2; s.state = 'idle'; }));
    expect(slam).toContain('fillStyle=#ff8c42');
    expect(idle).not.toContain('fillStyle=#ff8c42');
  });

  it('stage 2: the staff raised to cast, and the seal glint on the floor', () => {
    const e = boss('wizardboss', s => { s.stage = 2; s.state = 'sealTele'; s.sealX = 5700; });
    const seal = drawn(e);
    const idle = drawn(boss('wizardboss', s => { s.stage = 2; s.state = 'idle'; }));
    expect(seal.some(s => s.startsWith('arc(16, -30,'))).toBe(true); // the staff tip, raised
    expect(seal).toContain(`moveTo(${args(5700, e.y + e.h - 10)})`); // the glint
    expect(idle.some(s => s.startsWith('arc(16, -30,'))).toBe(false);
  });

  it('stage 2: the embered eyes and the gold staff glow at the last stand', () => {
    const low = drawn(boss('wizardboss', s => { s.stage = 2; s.state = 'idle'; s.hp = 2; }));
    const high = drawn(boss('wizardboss', s => { s.stage = 2; s.state = 'idle'; s.hp = 6; }));
    expect(low).toContain('fillRect(1, -23, 2, 2)');
    expect(low).toContain('fillStyle=#ffd166');
    expect(high).not.toContain('fillRect(1, -23, 2, 2)');
    expect(high).not.toContain('fillStyle=#ffd166');
  });

  it('a live seal column is still drawn in the world', () => {
    const e = boss('wizardboss', s => { s.stage = 2; s.state = 'idle'; s.columns = [{ x: 5800, w: 40, h: 140, t: 0.5, baseY: 560 }]; });
    expect(drawn(e)).toContain('fillRect(5800, 420, 40, 140)');
  });

  it('flashes when hit, in every form', () => {
    for (const set of [s => s.state = 'idle', s => s.state = 'stunned', s => { s.stage = 2; s.state = 'idle'; }]) {
      const e = boss('wizardboss', s => { set(s); s.flash = 0.1; });
      expect(drawn(e)).toContain(`fillRect(${args(e.x, e.y, e.w, e.h)})`);
    }
  });
});

describe('the Frost Queen over a sprite', () => {
  it('shows her pips, three rows of 14x6', () => {
    const e = boss('queenboss', s => s.hp = 10);
    expect(count(drawn(e), /^fillRect\(.*, 14, 6\)$/)).toBe(3 * Math.ceil(pipMaxOf(e, 'queenboss') / 3));
  });

  it('draws her spikes: the glint, then the risen column', () => {
    const e = boss('queenboss', s => s.spikes = [{ x: 5500, t: 0.3 }, { x: 5600, t: 1.2 }]);
    const lines = drawn(e);
    expect(lines).toContain('fillRect(5496, 556, 28, 4)'); // the glint
    expect(lines).toContain('moveTo(5600, 560)'); // the column, fully risen
    expect(lines).toContain('lineTo(5610, 420)');
  });

  it('the slam crouch, and only then', () => {
    const e = boss('queenboss', s => s.wind = 'slam');
    expect(drawn(e)).toContain(`fillRect(${args(e.x + e.w / 2 - 3, e.y + e.h - 10, 6, 10)})`);
    const idle = boss('queenboss', s => s.wind = null);
    expect(drawn(idle)).not.toContain(`fillRect(${args(idle.x + idle.w / 2 - 3, idle.y + idle.h - 10, 6, 10)})`);
  });

  it('the staff flare of a phase gate (she is open) and the stagger flash, and only then', () => {
    const open = boss('queenboss', s => { s.phaseT = 0.5; s.staggerT = 0.2; });
    const shut = boss('queenboss', s => { s.phaseT = 0; s.staggerT = 0; });
    const a = drawn(open), b = drawn(shut);
    expect(a).toContain(`fillRect(${args(open.x + open.w - 6, open.y - 30, 12, 40)})`);
    expect(a).toContain(`fillRect(${args(open.x, open.y, open.w, open.h)})`);
    expect(b).not.toContain('fillStyle=#e8f7fc');
    expect(b).not.toContain('fillStyle=#ffffff');
  });

  it('asleep: no pips and no tells over the frozen statue', () => {
    const e = boss('queenboss', s => { s.sleeping = true; s.phaseT = 0.5; });
    const lines = drawn(e);
    expect(count(lines, /^fillRect\(.*, 14, 6\)$/)).toBe(0);
    expect(lines).not.toContain('fillStyle=#e8f7fc');
  });

  it('dying: her unmaking is drawn, and no pips', () => {
    const panels = drawn(boss('queenboss', s => { s.dead = true; s.dying = true; s.dyingT = 4; s.spikes = []; }));
    const light = drawn(boss('queenboss', s => { s.dead = true; s.dying = true; s.dyingT = 1.5; s.spikes = []; }));
    expect(count(panels, /^fillRect\(.*, 8, 8\)$/)).toBe(5); // the armour panels
    expect(light).toContain('fillStyle=#ffe9b0'); // the light going up
    expect(count(light, /^fillRect\(.*, 14, 6\)$/)).toBe(0);
  });
});

describe('the sheet is used only for the forms it depicts', () => {
  const sheetDrawnFor = e => drawSpriteFeet.mock.calls.some(([, name]) => name === e.kind);

  it.each([
    ['the war-pig in flight', s => s.state = 'idle', 'fillStyle=#5a6488'], // the hog's body
    ['the swooping war-pig', s => s.state = 'swoopTele', 'fillStyle=#5a6488'],
    ['the downed hog', s => s.state = 'stunned', 'fillStyle=#3a4258'], // the folded legs
    ['the shattering hog', s => s.state = 'shatter', 'fillStyle=#3a4258'],
  ])('the wizard as %s keeps his vector drawing', (_, set, body) => {
    const e = boss('wizardboss', set);
    const spy = vi.spyOn(getKind('wizardboss'), 'drawOverlay');
    const lines = drawn(e);
    expect(sheetDrawnFor(e)).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    expect(lines).toContain(body);
  });

  it('the wizard as the sorcerer gets his sheet and the overlay', () => {
    const e = boss('wizardboss', s => { s.stage = 2; s.state = 'idle'; });
    const spy = vi.spyOn(getKind('wizardboss'), 'drawOverlay');
    const lines = drawn(e);
    expect(sheetDrawnFor(e)).toBe(true);
    expect(spy).toHaveBeenCalledWith(expect.anything(), e);
    expect(lines).not.toContain('fillStyle=#2c2c48'); // not the vector robe
  });

  it('a kind with no wantsSprite still gets its sheet', () => {
    expect(getKind('troll').wantsSprite).toBeUndefined();
    const e = boss('troll');
    drawn(e);
    expect(sheetDrawnFor(e)).toBe(true);
  });
});
