// M8: the full Level 7 playthrough — the test that proves the peak is
// completable end-to-end with real physics (the L6 playthrough pattern).
//
// Route:
//   spawn -> the Queen's intro beat
//        -> the ice run-up, crevasse 1, the ice bridge, crevasse 2
//        -> the ice block: one arrow, the sigil, +50, the iron gate rises
//        -> the cauldron pit (one mid-hop; the dais is the comfort route)
//        -> the King's porthole beat
//        -> the throne gate's flare + dissolve
//        -> the duel from the east wall: predict each swoop's landing
//           from its telegraph, sit in the narrow rune window, fire during
//           the swoop recovery; then the sorcerer's body from the same wall
//           (his drift and the seal columns clamp short of it)
//        -> the release: the pig walks off, the King's end beat, the
//           rainbow
//
// Roamers (hares, wraiths) and boxes are cleared up front (they have
// their own tests); the wizard is the one real opponent in the run.

import { describe, it, expect, afterEach } from 'vitest';
import { reseed } from './helpers/seeded-rng.js';
import { game, startGame, update } from '../src/game.js';
import { input } from '../src/input.js';
import { isDialogueOpen, advanceDialogue } from '../src/dialogue.js';
import { resetArrows } from '../src/arrows.js';
import { resetFireballs, resetCones, resetBoulders, resetShockwaves, fireballs, cones, shockwaves } from '../src/projectiles.js';
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
// zone(p), press and hold jump for `hold` frames (30 keeps a full jump,
// 12 a short step-hop). Resolves when want() is true.
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

afterEach(() => {
  setInput({});
  resetArrows();
  resetFireballs();
  resetCones();
  resetBoulders();
  resetShockwaves();
  resetParticles();
  resetLoot();
  startGame(600, 0);
});

describe('level 7 playthrough', () => {
  it('clears the peak end-to-end: the sigil, the spire, the wizard, the rainbow', () => {
    reseed();
    startGame(600, 6); // design carry: bow + flight
    p = game.player;
    lvl = game.level;
    p.maxHp = 4;
    p.hp = 4;
    // Unit-tested elsewhere; keep only the wizard in the run.
    for (const e of game.enemies) if (e.kind !== 'wizardboss') e.dead = true;
    for (const b of lvl.boxes) b.broken = true;

    // --- the intro beat (the player spawns inside its band) ---------------
    frames(1);
    expect(isDialogueOpen()).toBe(true);
    advanceDialogue(); advanceDialogue(); advanceDialogue();
    expect(isDialogueOpen()).toBe(false);

    // --- east to the ice block: crevasse 1, the bridge, crevasse 2 --------
    expect(walkJump(1, q => q.x > 1370 && q.x < 1395, 30,
      () => p.onGround && p.y + p.h >= 560 && p.x > 1580, 600), `crevasse 1; ${pos()}`).toBe(true);
    // Crevasse 2 is a 150 px pit bridged by the ice span: a single mid-hop
    // (~225 px) from just short of the edge clears it to the east bank.
    expect(walkJump(1, q => q.x > 2355 && q.x < 2385, 16,
      () => p.onGround && p.y + p.h >= 560 && p.x > 2590, 600), `bridge; ${pos()}`).toBe(true);

    // --- the ice block: one arrow, the sigil, the gate --------------------
    setInput({ right: true });
    expect(until(() => p.x > 3020 && p.x < 3060, 300), `up to the block; ${pos()}`).toBe(true);
    setInput({});
    setInput({ fire: true }); frames(1); // facing right from the walk
    setInput({ right: true }); // walk on: the sigil settles a step past the block
    expect(until(() => lvl.sigil.visible, 60), 'ice block not shattered').toBe(true);
    expect(until(() => lvl.sigil.taken, 200), `sigil missed; ${pos()}`).toBe(true);
    expect(score).toBeGreaterThanOrEqual(50); // the relic
    expect(until(() => lvl.doors[0].state === 'open', 120), 'iron gate never rose').toBe(true);

    // --- the cauldron: one mid-hop clears the 150 px pit (dais or not) -----
    // (it sits between the iron gate and the King's porthole)
    expect(walkJump(1, q => q.x > 3870 && q.x < 3895, 16,
      () => p.onGround && p.y + p.h >= 560 && p.x > 4060, 600), `cauldron; ${pos()}`).toBe(true);

    // --- the spire: the King's porthole beat -------------------------------
    setInput({ right: true });
    expect(until(() => isDialogueOpen(), 600), 'king beat never opened').toBe(true);
    advanceDialogue(); advanceDialogue();
    expect(isDialogueOpen()).toBe(false);

    // --- the throne gate: flare 0.8 s, dissolve 1.0 s, the arena -----------
    // (the beat cleared the held keys; re-assert the walk)
    setInput({ right: true });
    expect(until(() => lvl.doors[1].state === 'open', 420), 'throne gate never opened').toBe(true);
    // The duel camp is the arena's east wall: keep walking into it.
    setInput({ right: true });
    expect(until(() => p.x > 6260, 300), `east wall; ${pos()}`).toBe(true);
    setInput({});
    reseed(); // the walk consumed RNG; restart the battle sequence

    // --- the duel with the wizard ------------------------------------------
    // The camp is the arena's east wall (x 6272). The pig clamps to the
    // band [5500,6200] and, with the player always east of it, every swoop
    // runs east and lands at L = min(x0+504, 6199) — its east edge (L+64)
    // never reaches the wall, and the snort cone's 280 px beam, fired from
    // the arc's west-end bottom, dies short of the wall too. The lead-aimed
    // bolt is the one real threat: jump it. The rune (the pig's east flank
    // at ground-arrow height during the 0.5 s swoop recovery) only takes a
    // hit from a narrow ~12 px window — the arrow's first body overlap must
    // already be inside the rune or it deflects — so the duel is a
    // prediction loop: during the 0.5 s telegraph, compute L; during the
    // swoop, sit at [L+64, L+78] facing west; during the recovery, fire.
    // Stage 2: the sorcerer's drift clamps at 6160 (22 px off the camp) and
    // the seal columns clamp with him — the full body is shot from the same
    // wall; shockwaves, the <=4 hp fan and bolts are jumped.
    const boss = game.enemies.find(e => e.kind === 'wizardboss');
    expect(boss).toBeTruthy();
    let f = 0, holdJump = 0, prevStage = 1;
    let swoopL = null, target = 6272;
    while (!boss.dead && !p.dead && f < 10800) {
      const pc = p.x + 14, bc = boss.x + (boss.stage === 2 ? 28 : 32);
      if (boss.stage !== prevStage) { // the crash: the camp stays at the wall
        prevStage = boss.stage;
        swoopL = null;
        target = boss.stage === 2 ? 6240 : 6272;
        holdJump = 0;
      }
      // jump-dodge the ranged threats (never during the swoop sequence —
      // a jump lifts the arrow off the ground-arrow band)
      const bolt = fireballs.find(fb => !fb.dead && !fb.reflected &&
        Math.abs(fb.x - pc) < 130 && fb.y > p.y - 30 && fb.y < p.y + 60);
      const cone = cones.find(c => !c.dead && c.age < c.ttl &&
        Math.abs(c.x - pc) < 240 && (pc - c.x) * Math.cos(c.angle) > 0);
      const shock = shockwaves.find(s => !s.dead && Math.abs(s.x - pc) < 90);
      const col = (boss.columns || []).find(c => !c.dead && Math.abs(c.x + 20 - pc) < 55);
      if ((bolt || cone || shock || col) && p.onGround && holdJump === 0) holdJump = 30;
      if (holdJump > 0) holdJump--;
      let dir = 0, fire = false;
      if (boss.stage === 1) {
        if (boss.state === 'swoopTele') {
          swoopL = Math.min(boss.x + 504, 6199); // the landing (we are east: dir +1)
          target = Math.min(6272, swoopL + 70);
          if (p.x < 6266) dir = 1; else if (p.x > 6272) dir = -1; // hold the wall
        } else if (boss.state === 'swoop') {
          if (p.onGround) { if (p.x < target - 4) dir = 1; else if (p.x > target + 4) dir = -1; }
        } else if (boss.state === 'swoopRec') {
          if (p.onGround) {
            if (p.x >= swoopL + 64 && p.x <= swoopL + 78 && p.facing === -1) fire = true;
            else if (p.facing !== -1 && p.x > swoopL + 66) dir = -1; // tap west into the window
          }
        } else { // idle / windup / the stun: hold the wall
          if (p.x < 6266) dir = 1; else if (p.x > 6272) dir = -1;
        }
      } else { // stage 2: the full body at the wall
        if (p.x < 6234) dir = 1; else if (p.x > 6246) dir = -1;
        if (Math.abs(bc - pc) < 340) {
          const need = bc < pc ? -1 : 1;
          if (p.facing !== need) dir = need;
          else fire = true;
        }
      }
      setInput({ right: dir > 0, left: dir < 0, jump: holdJump > 0, fire });
      update(DT, 800, silent);
      f++;
    }
    setInput({});
    expect(boss.dead, `wizard survived (frames=${f}, hp=${boss.hp}, stage=${boss.stage}, ${pos()}, p.hp=${p.hp})`).toBe(true);
    expect(p.hp).toBeGreaterThan(0);

    // --- the release --------------------------------------------------------
    // updateArrows runs after updatePeakEnding in the game loop, so the
    // release (cage, pig, wraiths freed) fires on the frame after the
    // kill. The rainbow stays sealed: the stage-2 camp overlaps the exit
    // rect, so only the King's end beat may open it.
    expect(until(() => lvl.cage.open, 30), 'release never fired').toBe(true);
    expect(lvl.exit.locked).toBe(true); // the seal holds until the King speaks
    expect(lvl.pig).toBeTruthy();
    expect(until(() => lvl.pig === null, 1200), 'war-pig never walked off').toBe(true);
    // The King's end beat (its `when` gate — the wizard dead — is now open).
    setInput({ right: p.x < 6000, left: p.x > 6100 });
    expect(until(() => isDialogueOpen(), 600), 'end beat never opened').toBe(true);
    advanceDialogue(); advanceDialogue();
    expect(isDialogueOpen()).toBe(false);
    expect(lvl.exit.locked).toBe(false); // onOpen: his word lights the rainbow

    // --- into the rainbow -----------------------------------------------------
    setInput({ right: true });
    expect(until(() => p.won, 300), `never reached the exit; ${pos()}`).toBe(true);
    expect(p.hp).toBeGreaterThan(0);
    expect(score).toBeGreaterThanOrEqual(50); // the sigil's 50
  });
});
