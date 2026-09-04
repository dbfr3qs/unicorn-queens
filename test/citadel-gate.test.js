// M5 — the gear door + astrolabe + arena beat + trapdoor. The third
// mainspring cut grinds the gear door open (and it stays open — the retreat
// pocket); the arena beat (cuts === 3) wakes the Warden (M6) and the 5050
// Sentinel; the pearl's showWhen is live (the Warden fully rested); the
// pearl-taken drops the trapdoor lid over the shaft, leaving a flight-only
// exit (a flier in the exit rect wins; a walker in the shaft takes the pit).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { game, startGame, update, reachedExit } from '../src/game.js';
import { isDialogueOpen, currentLine, advanceDialogue, resetDialogue } from '../src/dialogue.js';
import { input } from '../src/input.js';
import { cutSpring } from '../src/springs.js';
import { updateDoor, resolveDoor } from '../src/door.js';
import { updatePearl } from '../src/pearl.js';
import { updateClock } from '../src/clock.js';

const DT = 1 / 60;
const fx = calls => ({ play: n => calls.push(n) });

beforeEach(() => { startGame(600, 7); }); // level index 7 = the Sky Citadel

afterEach(() => {
  resetDialogue();
  input.left = input.right = input.jump = input.fire = false;
  input.up = input.down = false;
  input.cast = false;
  startGame(600, 0); // a clean level: resets score + all module state
});

// Frame 1 opens the intro at spawn (x 60, in the 40–240 band); clear it so
// the world runs again for the mechanic tests.
function closeIntro() {
  update(DT, 800, fx([]));
  while (isDialogueOpen()) advanceDialogue();
}

describe('the gear door', () => {
  it('opens on the third cut (opening 1.2s -> open) and never re-locks', () => {
    closeIntro();
    const lvl = game.level;
    const door = lvl.doors.find(d => d.kind === 'geardoor');
    expect(door.state).toBe('locked');
    // two cuts: the door stays sealed
    cutSpring(lvl, lvl.springs[0], fx([]));
    cutSpring(lvl, lvl.springs[1], fx([]));
    expect(door.state).toBe('locked');
    // the third cut: the door grinds open
    const calls = [];
    cutSpring(lvl, lvl.springs[2], fx(calls));
    expect(door.state).toBe('opening');
    expect(door.openT).toBeCloseTo(1.2, 5);
    expect(calls).toContain('seal');
    expect(calls).toContain('clank');
    // run the retraction out: opening -> open
    const p = { x: 4890, y: 524, w: 28, h: 36, dead: false };
    for (let i = 0; i < 73; i++) updateDoor(lvl, p, DT, fx([]));
    expect(door.state).toBe('open');
    // STAYS_OPEN: step 30 s, still open (the retreat pocket)
    for (let i = 0; i < 30 * 60; i++) updateDoor(lvl, p, DT, fx([]));
    expect(door.state).toBe('open');
  });

  it('an open door holds no one back: walk-through and retreat both pass', () => {
    closeIntro();
    const lvl = game.level;
    lvl.doors.find(d => d.kind === 'geardoor').state = 'open';
    // a player at the west face (4890, overlapping the 4900–4940 door) is not pushed back
    const west = { x: 4890, y: 524, w: 28, h: 36, dead: false };
    resolveDoor(lvl, west);
    expect(west.x).toBe(4890);
    // a player retreating west from the east (4920, still overlapping) is not pushed back
    const east = { x: 4920, y: 524, w: 28, h: 36, dead: false };
    resolveDoor(lvl, east);
    expect(east.x).toBe(4920);
  });
});

describe('the arena beat', () => {
  it('fires on entry at cuts 3 and wakes the Warden + the 5050 Sentinel; silent at cuts 2', () => {
    closeIntro();
    const lvl = game.level;
    const enter = () => { game.player.x = 5000; game.player.y = lvl.groundY - 36; update(DT, 800, fx([])); };
    const leave = () => { game.player.x = 4800; game.player.y = lvl.groundY - 36; update(DT, 800, fx([])); };
    // at cuts 2: entry does not fire the beat
    cutSpring(lvl, lvl.springs[0], fx([]));
    cutSpring(lvl, lvl.springs[1], fx([]));
    enter();
    expect(isDialogueOpen()).toBe(false);
    expect(game.dialogsFired.has('l8-arena')).toBe(false);
    // leave, cut the third spring, and re-enter: the beat fires and wakes the sentinel
    leave();
    cutSpring(lvl, lvl.springs[2], fx([]));
    enter();
    expect(isDialogueOpen()).toBe(true);
    expect(currentLine().speaker).toBe('The Warden');
    expect(game.dialogsFired.has('l8-arena')).toBe(true);
    const sentinel = game.enemies.find(e => e.kind === 'sentinel' && !e.sleeping && e.x > 4900);
    expect(sentinel).toBeTruthy();
    // M6: the real Warden stands up (the M5 guarded no-op is now live)
    const warden = game.enemies.find(e => e.kind === 'warden');
    expect(warden).toBeTruthy();
    expect(warden.sleeping).toBe(false);
    while (isDialogueOpen()) advanceDialogue();
  });
});

describe('the pearl', () => {
  it('shows only when the Warden has fully rested (dead AND dyingT 0)', () => {
    closeIntro();
    const lvl = game.level;
    const p = { x: 5000, y: 470, w: 28, h: 36, dead: false }; // clear of the pearl
    // fully rested: the pearl appears
    lvl.pearl.visible = false;
    updatePearl(lvl, p, [{ kind: 'warden', dead: true, dyingT: 0 }], fx([]));
    expect(lvl.pearl.visible).toBe(true);
    // still resting: it does not
    lvl.pearl.visible = false;
    updatePearl(lvl, p, [{ kind: 'warden', dead: true, dyingT: 2 }], fx([]));
    expect(lvl.pearl.visible).toBe(false);
  });
});

describe('the trapdoor', () => {
  it('drops when the pearl is taken; the shaft left behind is flight-only', () => {
    closeIntro();
    const lvl = game.level;
    const lid = lvl.platforms.find(pl => pl.kind === 'trapdoor');
    expect(lvl.trapdoor.open).toBe(false);
    expect(lid.hidden).toBeFalsy(); // the lid is up
    // take the pearl (the standard path: visible + pickup unlocks the exit)
    lvl.pearl.visible = true;
    const p = { x: lvl.pearl.x, y: lvl.pearl.y, w: 28, h: 36, dead: false };
    updatePearl(lvl, p, [], fx([]));
    expect(lvl.pearl.taken).toBe(true);
    expect(lvl.exit.locked).toBe(false);
    // updateClock drops the lid (every frame, even clock-stopped)
    const calls = [];
    updateClock(lvl, p, [], DT, fx(calls));
    expect(lvl.trapdoor.open).toBe(true);
    expect(lid.hidden).toBe(true);
    expect(calls).toContain('seal');
    // flight-only: a flier in the exit rect wins; a walker who drops into
    // the shaft takes the pit rule (1 dmg + respawn). The floor-hole exit
    // rect is gated by flightOnly (a falling walker overlaps it before the
    // pit line, so geometry alone can't keep them out).
    const flyer = { x: 5850, y: 570, w: 28, h: 36, flying: true };
    expect(reachedExit(flyer, lvl)).toBe(true);
    expect(flyer.y > lvl.height).toBe(false); // above the pit line: no fall damage
    const walker = { x: 5850, y: 570, w: 28, h: 36 }; // same spot, not flying
    expect(reachedExit(walker, lvl)).toBe(false); // the flightOnly gate
    const fallen = { x: 5850, y: 620, w: 28, h: 36 };
    expect(fallen.y > lvl.height).toBe(true); // below the pit line: the fall rule
  });
});
