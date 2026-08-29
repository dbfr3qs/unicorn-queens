// Headless scripted playthrough of the entire level 5 — the no-soft-lock
// guarantee, end to end: the intro beat, an arrow through the bush for the
// horseshoe, the Queen's count beat on each approach, the branch chain up
// into the hollow tree for the sapphire, the lily-pad pond crossing, the
// flight to the lone high pad for the acorn, the Queen's story beat
// (onOpen unlocking the mist gate), and the win at the gate. Runs the full
// game update (real physics, camera, cooldowns, dialogue), so this pins the
// whole level's reachability in one run.
import { describe, it, expect, afterEach } from 'vitest';
import { game, startGame, update } from '../src/game.js';
import { input } from '../src/input.js';
import { dialogue, advanceDialogue } from '../src/dialogue.js';
import { resetArrows } from '../src/arrows.js';
import { resetFireballs, resetCones } from '../src/projectiles.js';
import { resetParticles } from '../src/particles.js';
import { resetLoot, score } from '../src/loot.js';
import { relicsTaken } from '../src/relics.js';

const DT = 1 / 60;
const silent = { play: () => {} };

const setInput = o => {
  for (const k of ['left', 'right', 'jump', 'fire', 'up', 'down', 'cast'])
    input[k] = !!o[k];
};
const step = () => update(DT, 800, silent);
const until = (cond, max) => {
  let i = 0;
  while (!cond() && i < max) { step(); i++; }
  return cond();
};

let p, lvl;
// Is there footing at probeX at the player's current feet height? A surface
// counts only when its top is at or below the feet: a lily pad 6 px above
// the ground is not "support" for a standing player, so the walker jumps
// before the pond edge instead of stepping in. (Ground far below a branch
// does count — falling off a branch is harmless, the pond is not.)
const supported = probeX => {
  const feet = p.y + p.h;
  return lvl.ground.some(s => probeX > s.x && probeX < s.x + s.w && s.y >= feet - 2) ||
    lvl.platforms.some(pl => probeX > pl.x && probeX < pl.x + pl.w && pl.y >= feet - 2);
};
// Walk in one direction, jumping whenever the probe ahead finds a gap. The
// jump is only pressed on the ground (where the probe is consulted); once
// airborne it is held, so the arc is never mid-air-cut — but walking off a
// branch over solid ground simply falls, with no re-buffered arc into the
// pond. Stops when a dialogue opens (the world freezes) or cond() holds.
const walk = (dir, cond, max = 4000) => {
  let i = 0, held = false;
  while (!cond() && !dialogue.open && i < max) {
    const probeX = dir > 0 ? p.x + p.w + 2 : p.x - 2;
    if (p.onGround) held = !supported(probeX);
    setInput({ [dir > 0 ? 'right' : 'left']: true, jump: held });
    step();
    i++;
  }
  return cond();
};
// Close every line of the open dialogue (the headless "Space").
const closeDialog = () => { while (dialogue.open) advanceDialogue(); };

afterEach(() => {
  setInput({});
  resetArrows();
  resetFireballs();
  resetCones();
  resetParticles();
  resetLoot();
  startGame(600, 0);
});

describe('level 5 full playthrough', () => {
  it('intro -> bush -> queen (1) -> sapphire -> queen (2) -> flight acorn -> queen (3) -> mist gate', () => {
    startGame(600, 4);
    const g = game;
    p = g.player; lvl = g.level;
    // bow + flight come in via startGame's design carry (LEVELS[].carry);
    // the heart cap is run-specific, so it is set here
    p.maxHp = 4; p.hp = 4;
    // The roamers and the boxes have their own tests; clear them so the run
    // is deterministic (no enemy on the chain, no loot rolls).
    for (const e of g.enemies) e.dead = true;
    for (const b of lvl.boxes) b.broken = true;

    // --- 1. The intro beat: the spawn band fires on frame 1 ---------
    step();
    expect(dialogue.open).toBe(true);
    expect(dialogue.lines).toHaveLength(3);
    expect(dialogue.lines[0].text).toContain("dragon's lair");
    closeDialog();
    expect(dialogue.open).toBe(false);

    // --- 2. The bush: an arrow through it reveals the horseshoe -----
    expect(walk(1, () => p.x >= 1090, 2000)).toBe(true);
    setInput({ fire: true });
    step(); // the arrow spawns at the bush and is consumed by it
    expect(lvl.bushes[0].state).toBe('revealed');
    expect(lvl.relics[0].visible).toBe(true);
    setInput({});

    // Walk east: the horseshoe is picked up on the way, the pond is
    // crossed on the lily pads (the walker jumps every gap), and the run
    // lands in the Queen's glade — her count-1 beat fires on approach.
    expect(walk(1, () => dialogue.open, 5000)).toBe(true);
    expect(relicsTaken(lvl)).toBe(1);
    expect(p.hp).toBe(4); // dry: no water touched, no enemies
    expect(dialogue.lines).toHaveLength(1);
    expect(dialogue.lines[0].text).toContain('One of the three');
    closeDialog();
    expect(until(() => p.onGround, 240)).toBe(true); // the beat may open mid-arc
    expect(walk(-1, () => p.x < 3372, 600)).toBe(true); // step out to re-arm it

    // --- 3. The sapphire: back west, up the branch chain ------------
    // The west crossing lands east of the chain (pad 1 drops at ~2457):
    // walk back west under the branches to the takeoff, then up.
    expect(walk(-1, () => p.x <= 1985, 3000)).toBe(true);
    const zones = [
      [1990, 2045, 30], // ground -> branch 1 (2120-2210, 110 up)
      [2150, 2170, 30], // branch 1 -> branch 2 (2250-2340, 110 up)
    ];
    let zi = -1, hold = 0, guard = 0;
    const onBranch2 = () => p.onGround && p.x > 2220 &&
      p.y + p.h > 330 && p.y + p.h < 350;
    while (!onBranch2() && !p.dead && guard++ < 1800) {
      const z = zones.findIndex(([a, b]) => p.x >= a && p.x < b);
      if (z !== -1 && z !== zi) { zi = z; hold = 30; } // press on entry
      if (hold > 0) hold--;
      setInput({ right: true, jump: hold > 0 });
      step();
    }
    expect(onBranch2()).toBe(true); // on the upper branch, in the hollow
    // The descent into the hollow passes through the sapphire's box, so
    // it is picked up in the fall — no hop needed.
    expect(relicsTaken(lvl)).toBe(2);

    // --- 4. Down to the ground, east again: the count-2 beat --------
    expect(walk(1, () => dialogue.open, 5000)).toBe(true);
    expect(relicsTaken(lvl)).toBe(2);
    expect(p.hp).toBe(4);
    expect(dialogue.lines).toHaveLength(1);
    expect(dialogue.lines[0].text).toContain('Two of the three');
    closeDialog();
    expect(until(() => p.onGround, 240)).toBe(true);
    expect(walk(-1, () => p.x < 3372, 600)).toBe(true);

    // --- 5. The acorn: flight to the lone high pad ------------------
    // Back to the pond edge, cast, rise west over the water, drop onto
    // the acorn (picked up in passing, before the pad is touched), sink
    // right off the pad's overhang, drop to the lily pad below, and hop
    // out east to the glade for the count-3 beat and the story.
    expect(walk(-1, () => p.x <= 3262, 600)).toBe(true);
    setInput({ cast: true });
    step(); // the one-frame cast flag
    expect(p.flying).toBe(true);
    let b = 0;
    while (p.x > 2965 && !p.dead && b++ < 600) { // rise west over the pond
      setInput({ up: true, left: true });
      step();
    }
    let c = 0;
    while (relicsTaken(lvl) < 3 && !p.dead && c++ < 600) { // drop onto the acorn
      setInput({ down: true });
      step();
    }
    expect(relicsTaken(lvl)).toBe(3);
    let d = 0;
    while (p.y + p.h < 392 && !p.dead && d++ < 240) { // sink off the overhang
      setInput({ right: true });
      step();
    }
    expect(p.x).toBeGreaterThan(3000); // clear of the floating pad
    let e2 = 0;
    while (!p.onGround && !p.dead && e2++ < 300) { // controlled drop
      setInput({ down: true });
      step();
    }
    expect(p.onGround).toBe(true); // the lily pad below

    expect(walk(1, () => dialogue.open, 2000)).toBe(true); // the count-3 beat
    expect(dialogue.lines).toHaveLength(4);
    expect(dialogue.lines[2].text).toContain('flying pig');
    expect(dialogue.lines[3].text).toContain('mist gate');
    expect(lvl.exit.locked).toBe(false); // onOpen: the hand-over
    expect(lvl.mistgate.openT).toBeGreaterThan(0); // the brighten has started
    expect(lvl.queen.toldStory).toBe(true);
    expect(score).toBe(150); // three relics, +50 each
    closeDialog();
    expect(until(() => p.onGround, 240)).toBe(true);

    // --- 6. The mist gate: over the stream, walk in, win ------------
    expect(walk(1, () => p.won, 3000)).toBe(true);
    expect(p.won).toBe(true);
    expect(p.hp).toBe(4); // dry all the way: no water, no enemies
    setInput({});
  });
});
