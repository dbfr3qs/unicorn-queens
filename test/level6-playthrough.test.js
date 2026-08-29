// M8: the full Level 6 playthrough — the test that proves the mire is
// completable end-to-end with real physics (the L4 playthrough pattern).
//
// Route:
//   spawn -> fly up the cypress: melt the nest web, take the heron's cog
//        -> log pool, lily pool, on to the winch   (w1: the vent wakes)
//        -> back to the lilies: jump-shoot the bubble, fly up for the
//           adder's cog
//        -> the winch again                         (w3: the sac appears)
//        -> the altar: stomp the sac, take the weaver's cog
//        -> the winch, last time                    (w5: bridge + web wall)
//        -> across the bridge, through the wall, the duel with the
//           Weaver Queen (real scripted duel: hold range, dodge, fire)
//        -> the pearl, the exit
//
// Snakes, adder and spiders are cleared up front (they have their own
// unit tests); the Weaver Queen is the one real opponent left in the run.

import { describe, it, expect, afterEach } from 'vitest';
import { reseed } from './helpers/seeded-rng.js';
import { game, startGame, update } from '../src/game.js';
import { input } from '../src/input.js';
import { isDialogueOpen, advanceDialogue } from '../src/dialogue.js';
import { resetArrows } from '../src/arrows.js';
import { resetFireballs, resetCones, resetBoulders, fireballs, boulders } from '../src/projectiles.js';
import { ventBubbleUp } from '../src/vent.js';
import { resetParticles } from '../src/particles.js';
import { resetLoot, score } from '../src/loot.js';

const DT = 1 / 60;
const silent = { play: () => {} };

let p;
let lvl;

const setInput = o => {
  for (const k of ['left', 'right', 'jump', 'fire', 'up', 'down', 'cast']) input[k] = !!o[k];
};
const frames = n => { for (let i = 0; i < n; i++) update(DT, 800, silent); };
const until = (cond, max) => {
  let i = 0;
  while (!cond() && i < max) { update(DT, 800, silent); i++; }
  return cond();
};
const pos = () => `p.x=${p?.x?.toFixed(0)} p.y=${p?.y?.toFixed(0)}`;

// Walk in `dir` (1 = right, -1 = left); on the first grounded frame inside
// zone(p), press and hold jump for `hold` frames (hold shapes the arc:
// 30 frames keeps a full jump, a small hold makes a short hop). Retries
// if the landing falls short of the zone. Resolves when want() is true.
const walkJump = (dir, zone, hold, want, maxF) => {
  let inZone = 0, holdNow = 0, f = 0;
  while (!want() && f++ < maxF && !p.dead) {
    const z = p.onGround && zone(p);
    if (z && !inZone) { inZone = 1; holdNow = hold; }
    if (!z) inZone = 0;
    if (holdNow > 0) holdNow--;
    setInput({ [dir > 0 ? 'right' : 'left']: true, jump: holdNow > 0 });
    update(DT, 800, silent);
  }
  return want();
};

// Wait for the vent bubble to surface (cycle is 10 s, so 720 frames always
// covers a full wait), then jump-shoot it: 3 frames into the jump the arrow
// leaves at chest height, inside the bubble's band.
const shootBubble = () => {
  expect(until(() => ventBubbleUp(lvl), 720), 'bubble never surfaced').toBe(true);
  setInput({ jump: true }); frames(3);
  setInput({ jump: true, fire: true }); frames(1);
  setInput({});
  expect(until(() => lvl.vent.popped, 60), `bubble not popped; ${pos()}`).toBe(true);
  expect(lvl.cogs[1].visible).toBe(true);
};

afterEach(() => {
  setInput({});
  resetArrows();
  resetFireballs();
  resetCones();
  resetBoulders();
  resetParticles();
  resetLoot();
  startGame(600, 0);
});

describe('level 6 playthrough', () => {
  it('clears the mire end-to-end: three cogs, the bridge, the Queen, the pearl', () => {
    reseed();
    startGame(600, 5); // design carry: bow + flight
    p = game.player;
    lvl = game.level;
    p.maxHp = 4;
    p.hp = 4;
    // Unit-tested elsewhere; keep only the Queen in the run.
    for (const e of game.enemies) if (e.kind !== 'spiderboss') e.dead = true;
    for (const b of lvl.boxes) b.broken = true;

    // --- the intro beat (the player spawns inside its band) ---------------
    frames(1);
    expect(isDialogueOpen()).toBe(true);
    advanceDialogue(); advanceDialogue(); advanceDialogue();
    expect(isDialogueOpen()).toBe(false);

    // --- the heron's nest: fly up, melt the web, take the cog -------------
    // The nest (y 170) is above full-jump height from the roots, so the
    // intended path is flight. Rising 354 px at 220 px/s takes 1.6 s, and
    // the wings drift east at 260 px/s the whole way — so take off well
    // west of the tree: at nest height the arrow then leaves at chest
    // height, level with the threads.
    setInput({ right: true });
    expect(until(() => p.x > 545 && p.x < 595 && p.onGround, 300), `reached the cypress; ${pos()}`).toBe(true);
    setInput({ cast: true }); frames(1);
    expect(p.flying, 'flight should start on the ground').toBe(true);
    // Keep climbing through the cog's band (feet 154–206): the arrow that
    // fires level with the threads melts the web, and the climb carries the
    // queen up through the heron's cog as it appears.
    setInput({ right: true, up: true, fire: true });
    expect(until(() => lvl.nest.state === 'open', 300), `web not melted; ${pos()}`).toBe(true);
    expect(lvl.cogs[0].visible).toBe(true);
    expect(until(() => lvl.cogs[0].taken, 240), `heron's cog missed; ${pos()}`).toBe(true);
    setInput({ down: true }); // drop back down (may catch root 3 on the way)
    expect(until(() => p.onGround, 300), `did not land; ${pos()}`).toBe(true);
    setInput({ left: true }); // step west onto the firm ground
    expect(until(() => p.x < 990 && p.y + p.h >= 559, 300), `back on the ground; ${pos()}`).toBe(true);

    // --- east across the log pool ----------------------------------------
    expect(walkJump(1, q => q.x > 1085 && q.x < 1105, 30,
      () => p.onGround && p.y + p.h <= 554.5 && p.x >= 1305, 600), `log pool A; ${pos()}`).toBe(true);
    expect(walkJump(1, q => q.x > 1330 && q.x < 1362, 30,
      () => p.onGround && p.y + p.h >= 559 && p.x > 1450, 600), `log pool B; ${pos()}`).toBe(true);

    // --- the lily pool -----------------------------------------------------
    expect(walkJump(1, q => q.x > 1740 && q.x < 1768, 30,
      () => p.onGround && p.y + p.h <= 554.5 && p.x < 2020, 600), `lily pool C; ${pos()}`).toBe(true);
    expect(walkJump(1, q => q.x > 1990 && q.x < 2014, 30,
      () => p.onGround && p.y + p.h <= 554.5 && p.x > 2150, 600), `lily pool D; ${pos()}`).toBe(true);
    expect(walkJump(1, q => q.x > 2252 && q.x < 2276, 30,
      () => p.onGround && p.y + p.h >= 559 && p.x > 2300, 600), `lily pool E; ${pos()}`).toBe(true);

    // --- the winch, first visit: w1 installs the heron's cog --------------
    setInput({ right: true });
    expect(until(() => isDialogueOpen(), 900), 'winch beat w1 never opened').toBe(true);
    advanceDialogue(); // w1 is one line
    expect(lvl.winch.sockets[0]).toBe(true);
    expect(lvl.vent.active).toBe(true);

    // --- back west to the vent: pop the bubble, fly up for the cog --------
    expect(walkJump(-1, q => q.x > 2440 && q.x < 2500, 30,
      () => p.onGround && p.y + p.h <= 554.5 && p.x < 2280, 1200), `back to lilies; ${pos()}`).toBe(true);
    setInput({ left: true }); frames(5); // face the bubble (it sits west of lily 2)
    setInput({});
    shootBubble();
    // The adder's cog floats just below the vent mouth — out of jump
    // reach, so take it on the wings. A short lift, then level out west
    // through the cog's band (p.y 454–506); the jump shot leaves the
    // queen mid-air, so the cast happens at the apex of the cut jump.
    setInput({ cast: true }); frames(1);
    expect(p.flying).toBe(true);
    setInput({ left: true, up: true }); frames(6);
    setInput({ left: true });
    expect(until(() => lvl.cogs[1].taken, 240), `adder's cog missed; ${pos()}`).toBe(true);
    // Climb clear of the lily pool, then drop straight down onto the
    // firm west bank (no horizontal drift on the way down).
    setInput({ left: true, up: true });
    expect(until(() => p.x < 1760, 240), `not clear of the pool; ${pos()}`).toBe(true);
    setInput({ down: true });
    expect(until(() => p.onGround, 300), `did not land on the west bank; ${pos()}`).toBe(true);
    expect(p.x > 1450 && p.x < 1900 && p.y + p.h >= 559, `west bank; ${pos()}`).toBe(true);

    // --- back east over the lily pool: lily 1, lily 2, then the bank -------
    expect(walkJump(1, q => q.x > 1745 && q.x < 1780, 30,
      () => p.onGround && p.y + p.h <= 554.5 && p.x > 1922 && p.x < 2020, 600), `lily hop F; ${pos()}`).toBe(true);
    expect(walkJump(1, q => q.x > 1990 && q.x < 2014, 30,
      () => p.onGround && p.y + p.h <= 554.5 && p.x > 2150, 600), `lily hop G; ${pos()}`).toBe(true);
    expect(walkJump(1, q => q.x > 2252 && q.x < 2276, 30,
      () => p.onGround && p.y + p.h >= 559 && p.x > 2300, 600), `lily hop H; ${pos()}`).toBe(true);
    setInput({ right: true });
    expect(until(() => isDialogueOpen(), 900), 'winch beat w3 never opened').toBe(true);
    advanceDialogue();
    expect(lvl.winch.sockets[1]).toBe(true);
    expect(lvl.sac.present).toBe(true);

    // --- the altar: stomp the sac for the weaver's cog --------------------
    expect(walkJump(-1, q => q.x > 4450 && q.x < 4600, 30,
      () => p.onGround && p.y + p.h <= 520.5 && p.x > 4200, 1200), `altar hop; ${pos()}`).toBe(true);
    setInput({ left: true });
    expect(until(() => p.x < 4315 && p.x > 4290, 240), `sac alignment; ${pos()}`).toBe(true);
    setInput({ jump: true }); frames(30); // a straight drop-jump onto the sac
    setInput({});
    expect(until(() => lvl.sac.popped, 120), `sac not popped; ${pos()}`).toBe(true);
    expect(lvl.cogs[2].visible).toBe(true);
    expect(until(() => lvl.cogs[2].taken, 120), `weaver's cog missed; ${pos()}`).toBe(true);
    setInput({ right: true });
    expect(until(() => p.x > 4420 && p.y + p.h >= 559, 240), `off the dais; ${pos()}`).toBe(true);

    // --- the winch, last time: w5 lowers the bridge and melts the wall ----
    expect(until(() => isDialogueOpen(), 900), 'winch beat w5 never opened').toBe(true);
    advanceDialogue();
    expect(lvl.winch.sockets[2]).toBe(true);
    expect(until(() => lvl.bridge.state === 'down', 120), 'bridge never lowered').toBe(true);
    expect(until(() => lvl.door.state === 'open', 150), 'web wall never opened').toBe(true);

    // --- across the bridge, into the hollow --------------------------------
    setInput({ right: true });
    expect(until(() => p.x > 5870, 600), `never reached the hollow; ${pos()}`).toBe(true);
    setInput({});

    // --- the duel with the Weaver Queen ------------------------------------
    // A real scripted duel (the L4 dragon pattern). Policy: hold ~380 px of
    // range and fire whenever roughly at it (step toward her first if we
    // are facing the wrong way); fall back to the arena wall while she
    // lunges or telegraphs a pillar (her dash and pillars are clamped to
    // her band, so the wall is always safe); leave the spot her eggs are
    // aimed at; and hop straight up over incoming globs and eggs. RNG is
    // reseeded so the fight is reproducible.
    const q = game.enemies.find(e => e.kind === 'spiderboss');
    expect(q).toBeTruthy();
    reseed();
    let f = 0;
    while (!q.dead && !p.dead && f < 10800) {
      const bc = q.x + 36, pc = p.x + 14;
      const side = pc < bc ? -1 : 1; // -1: we are west of her
      const faceDir = -side; // the direction that faces her
      const threat =
        fireballs.some(fb => !fb.dead && fb.web && Math.abs(fb.x - pc) < 130 && fb.y > 430) ||
        boulders.some(b => !b.dead && b.web && Math.abs(b.x - pc) < 100 && b.y > 440);
      let dir = 0, jump = false, fire = false;
      if (threat && !p.onGround) {
        dir = 0; // finish the hop straight up
      } else if (threat && p.onGround) {
        jump = true; // a straight hop clears the glob / egg's line
      } else if (q.state === 'lungeTele' || q.state === 'lunge' || q.state === 'lungeRec' || q.state === 'pillarTele') {
        dir = side; // fall back to our wall
      } else if (q.state === 'volley') {
        dir = side; // the eggs land where we stood when she picked
      } else {
        const want = Math.max(5812, Math.min(6755, bc + side * 380));
        const d = want - pc;
        dir = d > 8 ? 1 : d < -8 ? -1 : 0; // hold range
        if (Math.abs(d) < 30) fire = true; // shoot whenever roughly at range
      }
      if (fire && p.facing !== faceDir) dir = faceDir; // step into facing first
      setInput({ right: dir > 0, left: dir < 0, jump, fire });
      update(DT, 800, silent);
      f++;
    }
    setInput({});
    expect(q.dead, `Queen survived the duel (frames=${f}, hp=${q.hp}, ${pos()}, p.hp=${p.hp})`).toBe(true);
    expect(p.hp).toBeGreaterThan(0);

    // --- the pearl and the exit ---------------------------------------------
    expect(until(() => lvl.pearl.visible, 30), 'pearl never appeared').toBe(true);
    expect(walkJump(1, q2 => q2.x > 6180 && q2.x < 6260, 30,
      () => p.onGround && p.y + p.h <= 520.5, 600), `altar hop 2; ${pos()}`).toBe(true);
    let guard = 0;
    while (!lvl.pearl.taken && guard++ < 300) {
      setInput({ right: p.x < 6420, left: p.x > 6450 });
      update(DT, 800, silent);
    }
    expect(lvl.pearl.taken, `pearl missed; ${pos()}`).toBe(true);
    expect(lvl.exit.locked).toBe(false);
    setInput({ right: true });
    expect(until(() => p.won, 300), `never reached the exit; ${pos()}`).toBe(true);
    expect(score).toBeGreaterThanOrEqual(150); // the three cogs (50 each)
  });
});
