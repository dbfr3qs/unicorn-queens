// Headless scripted playthrough of the entire level 4 — the no-soft-lock
// guarantee, end to end: sludge pit, the platform gauntlet over the
// sludge, the keyless portcullis, the dragon duel (ground arrows only,
// using the perch/dive windows), the pearl on its pedestal, the shaft
// opening, and the fly-up exit. Runs the full game update (real physics,
// camera, cooldowns), so this pins the level's reachability in one run.
import { describe, it, expect, afterEach } from 'vitest';
import { reseed } from './helpers/seeded-rng.js'; // deterministic attack picks
import { game, startGame, update } from '../src/game.js';
import { input } from '../src/input.js';
import { resetArrows } from '../src/arrows.js';
import { resetFireballs, resetCones, fireballs } from '../src/projectiles.js';
import { resetParticles } from '../src/particles.js';
import { resetLoot } from '../src/loot.js';

const DT = 1 / 60;
const silent = { play: () => {} };

const setInput = o => {
  for (const k of ['left', 'right', 'jump', 'fire', 'up', 'down', 'cast'])
    input[k] = !!o[k];
};
const frames = n => { for (let i = 0; i < n; i++) update(DT, 800, silent); };
const until = (cond, max) => {
  let i = 0;
  while (!cond() && i < max) { update(DT, 800, silent); i++; }
  return cond();
};

afterEach(() => {
  setInput({});
  resetArrows();
  resetFireballs();
  resetCones();
  resetParticles();
  resetLoot();
  startGame(600, 0);
});

describe('level 4 full playthrough', () => {
  it('sludge -> gauntlet -> portcullis -> dragon -> pearl -> fly up the shaft', () => {
    startGame(600, 3);
    const g = game, p = g.player, lvl = g.level;
    p.hasBow = true; // carried from level 3
    p.hasFlight = true; // the witch's spell, permanent for the run
    // The roamers and the loot boxes are not part of the chain (they have
    // their own tests); clear them so the run is deterministic. The
    // dragon stays — it is the chain.
    for (const e of g.enemies) if (e.kind !== 'dragon') e.dead = true;
    for (const b of lvl.boxes) b.broken = true;

    // --- 1. Run right, jump the sludge pit (600-700) -----------------
    setInput({ right: true });
    expect(until(() => p.x > 585, 300)).toBe(true);
    setInput({ right: true, jump: true });
    expect(until(() => p.x > 710, 90)).toBe(true); // across the 100 px pit
    expect(p.hp).toBe(3);

    // --- 2. The gauntlet: 5 platforms zigzagging over the sludge -----
    // One buffered jump per zone (edge-triggered). A press that lands in
    // the air is buffered (JBUF) and fires the moment the feet touch the
    // next platform; hold length shapes the arc (30 ~ full, 12/8 ~ short,
    // needed so a descent hop does not overshoot the lower platform).
    const zones = [
      [1640, 1680, 30], // ground lip -> P1 (110 up)
      [1830, 1890, 12], // P1 -> P2 (70 up)
      [1985, 2048, 8], // P2 -> P3 (70 down)
      [2190, 2250, 12], // P3 -> P4 (70 up)
      [2420, 2460, 30], // P4 lip -> ground past P5 (110 down)
    ];
    let zi = -1, hold = 0, guard = 0;
    while (p.x < 2630 && !p.dead && guard++ < 1800) {
      const z = zones.findIndex(([a, b]) => p.x >= a && p.x < b);
      if (z !== -1 && z !== zi) { zi = z; hold = zones[z][2]; } // press on entry
      if (hold > 0) hold--;
      setInput({ right: true, jump: hold > 0 });
      update(DT, 800, silent);
    }
    expect(p.x).toBeGreaterThan(2630); // made it across
    expect(p.hp).toBe(3); // dry on the other side
    expect(until(() => p.onGround, 60)).toBe(true); // feet back on solid ground

    // --- 3. The portcullis: opens on approach, no key ----------------
    setInput({ right: true });
    expect(until(() => p.x > 3545, 600)).toBe(true);
    setInput({});
    expect(until(() => lvl.door.state === 'open', 120)).toBe(true);
    setInput({ right: true });
    expect(until(() => p.x > 3620, 240)).toBe(true);

    // --- 4. The dragon: hold the range where arrows land and the cone  ---
    // --- doesn't reach. Arrows are culled ~450 px ahead of the player;
    // the breath cone dies ~370 px from the dragon's center (the tip
    // segments widen past the 280 px length). Standing 420 px out puts
    // the player in the firing band and out of the breath: perch and
    // dive both happen where the dragon is, so at range they are free
    // arrow windows. Fireballs are the only real threat: the shield
    // reflects them, and a jump breaks the rest. When the dragon's drift
    // pushes the pair into a wall, the player runs to the far side.
    p.shield = 3; // the shield box at 3700 sits in the arena for the duel
    const dr = g.enemies.find(e => e.kind === 'dragon');
    expect(until(() => p.x > 3650, 300)).toBe(true);
    setInput({});
    frames(20);
    reseed(); // the gauntlet/door consumed RNG; restart the battle sequence
    let f = 0, holdJump = 0;
    while (!dr.dead && !p.dead && f < 7200) {
      const dc = dr.x + 30, pc = p.x + 14;
      let side = pc < dc ? -1 : 1; // the player's side of the dragon
      const jitter = (Math.floor(f / 90) % 2 ? 1 : -1) * 20 * side;
      let want = dc + side * 420 + jitter; // 420 px out, jittering ±20
      if (want < 3640 || want > 4750) { // that side is walled: flip sides
        side = -side;
        want = dc + side * 420 + jitter;
      }
      const dist = Math.abs(dc - pc);
      // the only things that reach at 420 px: a fireball in the last
      // stretch of its flight, and (mid-flip) a dive that closes to < 160
      const diveThreat = dr.state === 'dive' &&
        (dr.dive === 'descend' || dr.dive === 'low') && dist < 160;
      const ballThreat = fireballs.some(fb => !fb.dead && !fb.reflected &&
        Math.abs(fb.x - pc) < 90 && fb.y > 350);
      if ((diveThreat || ballThreat) && p.onGround) holdJump = 30;
      if (holdJump > 0) holdJump--;
      const faceDragon = side === -1 ? p.facing > 0 : p.facing < 0;
      setInput({
        right: pc < want - 6,
        left: pc > want + 6,
        jump: holdJump > 0,
        fire: dr.y > 492 && faceDragon, // arrows only when it has descended
      });
      update(DT, 800, silent);
      f++;
    }
    expect(dr.dead).toBe(true); // ground arrows at range are enough
    expect(p.hp).toBeGreaterThan(0);
    setInput({});

    // --- 5. The pearl appears on its pedestal; hop in to take it -----
    expect(until(() => lvl.pearl.visible, 60)).toBe(true);
    let pj = 0;
    while (!lvl.pearl.taken && pj < 900) {
      const want = 4060 - (p.x + 14);
      setInput({
        right: want > 6,
        left: want < -6,
        jump: pj % 40 < 20, // keep hopping: the pearl bottom is 4 px above
      });
      update(DT, 800, silent); // a standing player's head
      pj++;
    }
    expect(lvl.pearl.taken).toBe(true);
    expect(lvl.exit.locked).toBe(false);

    // --- 6. The shaft opens, and the fly spell carries her out -------
    expect(until(() => lvl.shaft.state === 'open', 180)).toBe(true);
    setInput({ right: true });
    expect(until(() => p.x > 4186 && p.x < 4214, 300)).toBe(true); // under the shaft
    setInput({});
    setInput({ cast: true });
    frames(1); // the one-frame cast flag
    expect(p.flying).toBe(true);
    setInput({ up: true });
    expect(until(() => p.won, 600)).toBe(true);
    expect(p.won).toBe(true);
    setInput({});
  });
});
