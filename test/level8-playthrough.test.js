// M8: the full Level 8 playthrough — the test that proves the sky citadel
// is completable end-to-end with real physics (the L7 playthrough pattern).
//
// Route:
//   spawn -> the Queen's intro beat
//        -> the shelf chain, spring 1 (a touch), the gear platform crossing
//        -> the bookcase pit, the library sentinel (two arrows), the panel
//           window, spring 2 from the dais
//        -> the hub sentinels (two arrows each), the hub beat (cut 2)
//        -> the pendulum: a hop to the west platform, flight across to
//           spring 3, a glide down to the east platform
//        -> the gear door, the arena beat (Warden + sentinel wake)
//        -> the duel from camp 4943: two volleys per reset window, jumping
//           the chime bolts, the shockwaves and the west-bound sweeps
//        -> the rest (dyingT 3.3, the toll), the pearl on the pedestal,
//           the lid + the silhouette, the King's shaft-lip beat
//        -> the flight dive into the open shaft
//
// The darting moths are cleared up front (they have their own tests; a
// dart into the shelf approach is un-scriptable). The sentinels are part
// of the route — each is killed in-run, west-facing, with two arrows (a
// front arrow is never blocked: the shield's polarity is test-locked in
// sentinel.test.js).
//
// Hop sizes are calibrated against the real integrator (measured, not
// derived): 6f ~ 139–150 px, 12f ~ 190 px, 16f ~ 217 px at same level,
// landing earlier on higher surfaces. Spring 3 is touched in flight: a
// jump from the west platform passes ~40 px above it and an arrow misses
// by 30 px (plan: "spring 3 by jump from the left platform" — deviation:
// the jump cannot reach it; the flight touch is the deterministic
// equivalent, from the same platform).

import { describe, it, expect, afterEach } from 'vitest';
import { reseed } from './helpers/seeded-rng.js';
import { game, startGame, update } from '../src/game.js';
import { input } from '../src/input.js';
import { isDialogueOpen, advanceDialogue } from '../src/dialogue.js';
import { resetArrows } from '../src/arrows.js';
import { resetFireballs, resetCones, resetBoulders, resetShockwaves, fireballs, shockwaves } from '../src/projectiles.js';
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
// 12 a mid-hop, 6 a short hop). Resolves when want() is true.
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

// Two arrows into a sentinel from the west: front arrows are never blocked,
// and a jump-dodge keeps the player clean of the chest bolts that cross
// after each chime while the kill completes.
const shootSentinel = (s, maxF = 900) => {
  p.facing = 1;
  let f = 0, holdJump = 0;
  while (f++ < maxF && !s.dead) {
    const pc = p.x + 14;
    const bolt = fireballs.find(fb => !fb.dead && !fb.reflected &&
      Math.abs(fb.x - pc) < 130 && fb.y > p.y - 30 && fb.y < p.y + 60);
    if (bolt && p.onGround && holdJump === 0) holdJump = 30;
    if (holdJump > 0) holdJump--;
    setInput({ fire: p.fireCd <= 0, jump: holdJump > 0 });
    update(DT, 800, silent);
  }
  return s.dead;
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

describe('level 8 playthrough', () => {
  it('clears the sky citadel end-to-end: the springs, the Warden, the pearl, the dive', () => {
    reseed();
    startGame(600, 7); // design carry: bow + flight
    p = game.player;
    lvl = game.level;
    for (const e of game.enemies) if (e.kind === 'moth') e.dead = true;
    for (const b of lvl.boxes) b.broken = true;
    const sentinel = x0 => game.enemies.find(e => e.kind === 'sentinel' && e.x >= x0 && !e.dead);

    // --- the intro beat (the player spawns inside its band) ---------------
    frames(1);
    expect(isDialogueOpen()).toBe(true);
    advanceDialogue(); advanceDialogue();
    expect(isDialogueOpen()).toBe(false);

    // --- spring 1: the shelf chain (a touch) -------------------------------
    // Shelf 1 (top 450) takes a 16f hop from ~1235: a mid-hop's apex sits
    // under its west face. Shelf 2 (top 360) takes a 12f hop from the west
    // of shelf 1: the landing overlaps spring 1, so the touch is the
    // landing itself.
    expect(walkJump(1, q => q.x > 1230 && q.x < 1245, 16,
      () => p.onGround && p.y === 414, 480), `shelf 1; ${pos()}`).toBe(true);
    const s1 = lvl.springs.find(s => s.x === 1510);
    expect(walkJump(1, q => q.x > 1385 && q.x < 1395, 12,
      () => p.onGround && p.y === 324 && s1.cut, 300), `shelf 2 + spring 1; ${pos()}`).toBe(true);
    setInput({ left: true });
    expect(until(() => p.onGround && p.y === 524 && p.x > 1200 && p.x < 1400, 240), `drop; ${pos()}`).toBe(true);

    // --- the gear platform: ride the chime slide across 1700–1850 ----------
    const gear = lvl.platforms.find(pl => pl.kind === 'gear');
    setInput({ right: true });
    expect(until(() => p.x > 1560 && p.x < 1605, 300), `gear approach; ${pos()}`).toBe(true);
    setInput({});
    expect(until(() => gear.x === 1700 && lvl.clock.t > 0.6, 560), `gear west slot; ${pos()}`).toBe(true);
    expect(walkJump(1, q => q.x > 1560 && q.x < 1605, 6,
      () => p.onGround && p.y === 518, 240), `gear on; ${pos()}`).toBe(true);
    setInput({}); // stand still: the slide does the crossing
    const rideX = p.x;
    expect(until(() => p.x > rideX + 50, 560), `gear carried; ${pos()}`).toBe(true);
    expect(p.x).toBeGreaterThan(rideX + 50); // the slide carried the player
    expect(until(() => gear.x === 1770 && lvl.clock.t > 0.6, 200), `gear at rest east; ${pos()}`).toBe(true);
    expect(walkJump(1, q => q.x > 1815 && q.x < 1832, 6,
      () => p.onGround && p.y === 524 && p.x > 1860, 240), `east bank; ${pos()}`).toBe(true);

    // --- the bookcase pit (2200–2350) and the library sentinel -------------
    expect(walkJump(1, q => q.x > 2120 && q.x < 2175, 6,
      () => p.onGround && p.y === 518, 300), `bookcase west; ${pos()}`).toBe(true);
    setInput({ right: true });
    expect(until(() => p.onGround && p.y === 524 && p.x > 2340 && p.x < 2385, 200), `east of pit; ${pos()}`).toBe(true);
    setInput({});
    const libSent = sentinel(2400);
    expect(libSent).toBeTruthy();
    expect(shootSentinel(libSent), `library sentinel; ${pos()}`).toBe(true);

    // --- the panel + spring 2: the no-crush window --------------------------
    // The dais (2600–2660, top 536) needs a 6f hop from the west bay
    // (2495–2525): from further west the face blocks and the player falls
    // under the wall into the next pit. The no-crush hold keeps the slab
    // up while the player stands on the dais (t >= 2.0 inside the band).
    setInput({ right: true });
    expect(until(() => p.x > 2495 && p.x < 2525, 300), `panel approach; ${pos()}`).toBe(true);
    setInput({});
    expect(until(() => lvl.clock.t > 0.45 && lvl.clock.t < 1.55, 560), `panel window; ${pos()}`).toBe(true);
    const s2 = lvl.springs.find(s => s.x === 2620);
    expect(walkJump(1, q => q.x > 2495 && q.x < 2525, 6,
      () => p.onGround && p.y === 500 && s2.cut, 300), `dais + spring 2; ${pos()}`).toBe(true);
    setInput({ right: true });
    expect(until(() => p.onGround && p.y === 524 && p.x > 2735, 300), `past the wall; ${pos()}`).toBe(true);

    // --- the hub: two sentinels, then the beat (cut 2) ----------------------
    expect(until(() => p.x > 2845 && p.x < 2870, 300), `hub approach; ${pos()}`).toBe(true);
    setInput({});
    const hubW = sentinel(3000);
    expect(hubW).toBeTruthy();
    expect(shootSentinel(hubW), `hub sentinel west; ${pos()}`).toBe(true);
    expect(walkJump(1, q => q.x > 2845 && q.x < 2870, 6,
      () => p.onGround && p.y === 518, 300), `bookcase east; ${pos()}`).toBe(true);
    setInput({ right: true });
    expect(until(() => p.onGround && p.y === 524 && p.x > 3040 && p.x < 3070, 200), `east of pit 2; ${pos()}`).toBe(true);
    expect(until(() => p.x > 3332 && p.x < 3354, 300), `hub approach 2; ${pos()}`).toBe(true);
    setInput({});
    const hubE = sentinel(3400);
    expect(hubE).toBeTruthy();
    expect(shootSentinel(hubE), `hub sentinel east; ${pos()}`).toBe(true);
    setInput({ right: true });
    expect(until(() => isDialogueOpen(), 400), 'hub beat never opened').toBe(true);
    advanceDialogue(); // closing a beat clears the input
    expect(isDialogueOpen()).toBe(false);
    setInput({ right: true });
    expect(until(() => p.x > 3690 && p.x < 3745, 300), `west bank; ${pos()}`).toBe(true);
    setInput({});

    // --- the pendulum: hop the west platform, flight to spring 3 -----------
    // The rod must be at its east extreme (t near period/4) so the west
    // side of the gap is clear for the hop.
    const per = lvl.clock.period;
    expect(until(() => lvl.clock.t > per / 4 - 0.25 && lvl.clock.t < per / 4 + 0.25, 560),
      `rod east extreme; t=${lvl.clock.t.toFixed(2)}`).toBe(true);
    expect(walkJump(1, q => q.x > 3690 && q.x < 3745, 6,
      () => p.onGround && p.y === 518, 240), `pendulum west platform; ${pos()}`).toBe(true);
    // Spring 3 (4050, 460) is 114 px above the platform and 180 px east:
    // a short flight from the same platform touches it; the landing is a
    // straight glide down onto the east platform.
    setInput({ right: true });
    expect(until(() => p.x > 3840 && p.x < 3895, 120), `cast point; ${pos()}`).toBe(true);
    setInput({ cast: true });
    frames(1);
    setInput({ right: true, up: true });
    expect(until(() => p.y <= 437, 120), `rise; ${pos()}`).toBe(true);
    setInput({ right: true }); // sink + drift east through the spring's band
    const s3 = lvl.springs.find(s => s.x === 4050);
    expect(until(() => s3.cut, 300), `spring 3; ${pos()}`).toBe(true);
    setInput({ right: true, down: true });
    expect(until(() => p.onGround && p.y === 518, 300), `east platform; ${pos()}`).toBe(true);
    setInput({ right: true });
    expect(until(() => p.onGround && p.y === 524 && p.x > 4210, 240), `ground 4200; ${pos()}`).toBe(true);

    // --- the gear door (open on the third cut) + the arena beat -------------
    const door = lvl.doors.find(d => d.kind === 'geardoor');
    // the third cut starts the 1 s opening; the walk to the arena covers it
    expect(until(() => door.state === 'open', 240), 'gear door never opened').toBe(true);
    // The arena beat's band (4900–5150) opens the moment the player's right
    // edge crosses 4900 (three cuts now) and freezes the player there:
    // walk in, let it open, close it, then hold camp.
    expect(until(() => isDialogueOpen(), 400), `arena beat; ${pos()}`).toBe(true);
    advanceDialogue(); advanceDialogue(); // closing a beat clears the input
    expect(isDialogueOpen()).toBe(false);
    const warden = game.enemies.find(e => e.kind === 'warden');
    expect(warden.sleeping, 'Warden never woke').toBe(false);
    const arenaSent = sentinel(4900);
    expect(arenaSent && !arenaSent.dead, 'arena sentinel never woke').toBe(true);
    // --- the duel: two volleys per reset window, jump the rest --------------
    // Camp 4943: just east of the gear door, ~157 px west of the Warden's
    // band-min. The chime bolt (~0.7 s flight) and the shockwave (~0.9 s)
    // both arrive after the 0.6 s window: fire first, dodge the aftermath.
    setInput({ right: true });
    expect(until(() => p.x > 4935 && p.x < 4955, 200), `camp; ${pos()}`).toBe(true);
    setInput({});
    expect(shootSentinel(arenaSent), `arena sentinel; ${pos()}`).toBe(true);
    p.facing = 1;
    reseed(); // the walk consumed RNG; restart the battle sequence
    let f = 0, holdJump = 0;
    while (!warden.dead && !p.dead && f < 3600) {
      const pc = p.x + 14;
      const fire = lvl.clock.t < 0.4 && p.fireCd <= 0;
      const bolt = fireballs.find(fb => !fb.dead && !fb.reflected &&
        Math.abs(fb.x - pc) < 130 && fb.y > p.y - 30 && fb.y < p.y + 60);
      const shock = shockwaves.find(s => !s.dead && Math.abs(s.x - pc) < 90);
      const sweep = warden.state === 'sweep' && warden.sweepDir < 0;
      if ((bolt || shock || sweep) && p.onGround && holdJump === 0) holdJump = 30;
      if (holdJump > 0) holdJump--;
      setInput({ jump: holdJump > 0, fire });
      update(DT, 800, silent);
      f++;
    }
    setInput({});
    expect(warden.dead,
      `the Warden survived (f=${f}, hp=${warden.hp}, state=${warden.state}, ${pos()}, p.hp=${p.hp})`).toBe(true);
    expect(p.hp).toBeGreaterThan(0);

    // --- the rest: dyingT 3.3, the toll, the pearl --------------------------
    expect(until(() => warden.dyingT === 0, 300), `rest; dyingT=${warden.dyingT.toFixed(2)}`).toBe(true);
    expect(warden.tolled).toBe(true);
    expect(lvl.clock.stopped).toBe(true);
    expect(lvl.pearl.visible).toBe(true);

    // --- the pearl: the pedestal hop (the landing overlaps the pearl) -------
    expect(lvl.exit.locked, 'seal should hold until the pearl').toBe(true);
    expect(walkJump(1, q => q.x > 5280 && q.x < 5300, 12,
      () => p.onGround && p.y === 484 && lvl.pearl.taken, 400), `pedestal + pearl; ${pos()}`).toBe(true);
    expect(lvl.exit.locked).toBe(false); // the seal breaks
    expect(lvl.trapdoor.open).toBe(true); // the lid drops
    expect(lvl.kingSil.present).toBe(true); // the silhouette appears

    // --- the King's shaft-lip beat -------------------------------------------
    setInput({ right: true });
    expect(until(() => isDialogueOpen(), 400), `shaft beat; ${pos()}`).toBe(true);
    advanceDialogue(); advanceDialogue(); // closing a beat clears the input
    expect(isDialogueOpen()).toBe(false);

    // --- the dive: flight into the open shaft --------------------------------
    setInput({ right: true });
    expect(until(() => p.x > 5752 && p.x < 5768, 200), `dive point; ${pos()}`).toBe(true);
    setInput({ cast: true });
    frames(1);
    setInput({ right: true, down: true });
    expect(until(() => p.won, 300), `dive; ${pos()}`).toBe(true);
    expect(score).toBeGreaterThanOrEqual(150); // the three springs
    expect(warden.dyingT).toBe(0);
  });
});
