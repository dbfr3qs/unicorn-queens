// The boss lab: headless measurements of the seven boss fights.
//
//   npm run bosslab            every boss
//   npm run bosslab troll      one (mage, troll, dragon, weaver, wizard, warden, queen)
//
// The reach map: a dummy player stands at each spot across the arena
// (pinned there, 99 hp, the usual hit invulnerability) while the boss
// fights it, once per boss phase. It counts the hits it takes. A stretch
// of floor where the boss never lands a hit is a safe zone — a place to
// stand and win. Only the boss is in the room (every other enemy is
// removed), dialogue is off, and Math.random is seeded, so a run is
// repeatable. Difficulty is hard: the game as designed.
import { game, startGame, update } from '../src/game.js';
import { input } from '../src/input.js';
import { setDifficulty } from '../src/difficulty.js';
import { P_W } from '../src/player.js';
import { periodFor } from '../src/clock.js';

const DT = 1 / 60, VIEW_W = 800;
const WARMUP = 4, WINDOW = 40, STEP = 50; // s before counting, s counted, px between spots
const fx = { play() {} };

// Each fight: its level, the floor you can stand on in the arena, the hp
// at the start of each phase, and how to wake it the way the level does.
export const BOSSES = {
  mage: { name: 'Mage', level: 2, kind: 'mage', arena: [2600, 3450], phases: [5, 2] },
  troll: { name: 'Troll', level: 3, kind: 'troll', arena: [3590, 4250], phases: [8, 4] },
  dragon: { name: 'Dragon', level: 4, kind: 'dragon', arena: [3590, 4800], phases: [14, 7] },
  weaver: {
    name: 'Weaver Queen', level: 6, kind: 'spiderboss', arena: [5840, 6800], phases: [16, 8],
    wake: g => { g.level.door.state = 'open'; },
  },
  wizard: {
    name: 'Wizard', level: 7, kind: 'wizardboss', arena: [5440, 6300], phases: [16, 8], // 8: the rune breaks, stage 2
    wake: g => { g.level.throneGateOpen = true; for (const d of g.level.doors ?? []) d.state = 'open'; },
  },
  warden: {
    name: 'Warden', level: 8, kind: 'warden', arena: [4940, 5820], phases: [16, 8],
    wake: (g, boss) => {
      boss.sleeping = false;
      for (const s of g.level.springs ?? []) s.cut = true; // the fight comes after the third cut
      g.level.clock.period = periodFor(3);
    },
  },
  queen: {
    name: 'Frost Queen', level: 9, kind: 'queenboss', arena: [5240, 6000], phases: [24, 16, 8],
    wake: g => { g.level.queenUnfreeze = { t: 0, boss: false }; },
  },
};

// A repeatable Math.random (mulberry32).
function seed(n) {
  let a = n >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function groundAt(lvl, x) {
  return lvl.ground.find(s => x >= s.x && x + P_W <= s.x + s.w);
}

// A fresh fight with the player at x. Returns the boss, or null if there
// is no floor at x.
export function arena(b, x, hp) {
  startGame(600, b.level - 1);
  const g = game;
  g.level.dialogs = null;
  const boss = g.enemies.find(e => e.kind === b.kind);
  g.enemies = [boss];
  b.wake?.(g, boss);
  const seg = groundAt(g.level, x);
  if (!seg) return null;
  const p = g.player;
  p.hasBow = true;
  p.x = x; p.y = (seg.y ?? g.level.groundY) - p.h; p.vy = 0;
  p.hp = 99;
  boss.hp = hp;
  return boss;
}

function frame(x) {
  const p = game.player;
  update(DT, VIEW_W, fx);
  p.x = x; p.vx = 0; // pinned: she stands her ground
  if (p.hp < 50) p.hp = 99;
}

// Hits per minute at x in the phase that starts at hp.
export function hitsAt(b, x, hp) {
  seed(Math.round(x) * 31 + hp);
  const boss = arena(b, x, hp);
  if (!boss) return null;
  for (let t = 0; t < WARMUP; t += DT) frame(x);
  let hits = 0, last = game.player.hp;
  for (let t = 0; t < WINDOW; t += DT) {
    frame(x);
    const hp1 = game.player.hp;
    if (hp1 < last) hits += last - hp1;
    last = hp1;
  }
  return (hits / WINDOW) * 60;
}

// One column per spot: · never hit, else hits/min in fives (1 = up to 5,
// 8 = 35–40: a hit every time the invulnerability runs out).
function glyph(v) {
  if (v === null) return ' '; // no floor here
  if (v === 0) return '·';
  return String(Math.min(9, Math.ceil(v / 5)));
}

// Runs of zero-hit spots at least two steps wide.
function safeZones(xs, vs) {
  const out = [];
  let start = null;
  xs.forEach((x, i) => {
    const safe = vs[i] === 0;
    if (safe && start === null) start = i;
    if ((!safe || i === xs.length - 1) && start !== null) {
      const end = safe ? i : i - 1;
      if (end - start >= 1) out.push(`${xs[start]}–${xs[end] + P_W}`);
      start = null;
    }
  });
  return out;
}

export function reachMap(b) {
  setDifficulty('hard');
  input.left = input.right = input.jump = input.fire = input.cast = false;
  const xs = [];
  for (let x = b.arena[0]; x <= b.arena[1] - P_W; x += STEP) xs.push(x);
  return b.phases.map(hp => {
    const vs = xs.map(x => hitsAt(b, x, hp));
    const stood = vs.filter(v => v !== null);
    return {
      hp, xs, vs,
      mean: stood.reduce((a, v) => a + v, 0) / stood.length,
      safe: safeZones(xs, vs),
    };
  });
}

function report(key) {
  const b = BOSSES[key];
  console.log(`\n${b.name} (level ${b.level})  arena ${b.arena[0]}–${b.arena[1]}`);
  for (const ph of reachMap(b)) {
    const strip = ph.vs.map(glyph).join('');
    console.log(`  from ${String(ph.hp).padStart(2)} hp  |${strip}|  ${ph.mean.toFixed(1)} hits/min across the arena`);
    console.log(`  ${' '.repeat(11)}${ph.xs[0]}${' '.repeat(Math.max(1, strip.length - 8))}${ph.xs.at(-1)}`);
    if (ph.safe.length) console.log(`  ${' '.repeat(11)}SAFE (never hit): ${ph.safe.join(', ')}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();

function main() {
const only = process.argv[2];
const keys = only ? [only] : Object.keys(BOSSES);
if (only && !BOSSES[only]) { console.error(`unknown boss: ${only} (${Object.keys(BOSSES).join(', ')})`); process.exit(1); }
console.log(`Boss lab — reach map. ${WINDOW} s per spot, every ${STEP} px, hard.`);
console.log('Each column is a spot on the floor: · never hit; 1–8 hits/min in fives (8 = every time invulnerability ends).');
for (const k of keys) report(k);
}
