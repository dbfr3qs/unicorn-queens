// Portcullis doors: iron-banded stone. All state lives in the level data:
// lvl.door (levels 3–6, one door) or lvl.doors (level 7, the first
// multi-door level: the iron gate + the throne gate). Each door:
// { x, y, w, h, state, openT, closeT, noKey?, kind? }.
//
// Full height (floor to ceiling): flight cannot skip the key requirement.
// noKey (level 4): opens on approach without a key — no item to consume.
//
// States: locked -> opening (auto-opens on approach WITH THE KEY: rumble,
// slides up over DOOR_OPEN s, the key is consumed) -> open (passable;
// once the player is fully past, x > x+w+DOOR_PASS) -> closing (drops
// shut behind them, DOOR_CLOSE s) -> shut (solid again: hall re-locked).
//
// Stays-open kinds: webwall (level 6 melt), irongate (level 7 — the sigil
// opens it once and it never re-seals), thronegate (level 7 — the
// trigger's flare dissolves it; the arena's west end stays an off-ramp).
import { DOOR_CRACK, DOOR_MELT } from './thaw.js'; // level 9: the frost seal's two extra states

export const DOOR_OPEN = 1.0, DOOR_CLOSE = 1.0, DOOR_PASS = 10;
const STAYS_OPEN = new Set(['webwall', 'irongate', 'thronegate', 'geardoor', 'bookwall', 'shelfpanel', 'frostseal']);

function doorsOf(lvl) {
  return lvl.doors ?? (lvl.door ? [lvl.door] : []);
}

export function updateDoor(lvl, p, dt, fx) {
  for (const door of doorsOf(lvl)) {
    if (door.flare) { // the throne-gate flare: a one-shot, then the wall dissolves
      door.flareT -= dt;
      if (door.flareT <= 0) {
        door.flare = false;
        door.state = 'opening';
        door.openT = DOOR_OPEN;
        lvl.throneGateOpen = true; // the wizard reads it (M6)
      }
      continue;
    }
    if (door.state === 'locked') {
      const near = !p.dead && p.x + p.w > door.x - 60 && p.x < door.x + door.w;
      if (near && door.noKey) { // keyless (level 4): approach is enough
        door.state = 'opening';
        door.openT = DOOR_OPEN;
        fx.play('rumble');
      } else if (near && lvl.key && lvl.key.taken && !lvl.key.consumed) {
        door.state = 'opening';
        door.openT = DOOR_OPEN;
        lvl.key.consumed = true; // the key is spent; the HUD icon goes
        fx.play('rumble');
      } else if (door.kind === 'thronegate' && lvl.throneTrigger) {
        // the spire's last hall: standing in the trigger band wakes the seal
        const tg = lvl.throneTrigger;
        if (!p.dead && p.x < tg.x + tg.w && p.x + p.w > tg.x && p.y < tg.y + tg.h && p.y + p.h > tg.y) {
          door.flare = true;
          door.flareT = 0.8;
          fx.play('boss');
        }
      }
    } else if (door.state === 'opening') {
      door.openT -= dt;
      if (door.openT <= 0) door.state = 'open';
    } else if (door.state === 'open') {
      if (STAYS_OPEN.has(door.kind)) continue; // melts / opens forever
      if (!p.dead && p.x > door.x + door.w + DOOR_PASS) { // fully past
        door.state = 'closing';
        door.closeT = DOOR_CLOSE;
        fx.play('rumble');
      }
    } else if (door.state === 'closing') {
      door.closeT -= dt;
      if (door.closeT <= 0) door.state = 'shut';
    } else if (door.state === 'shut') {
      // The re-lock keeps the hall's fight in; it is never meant to keep the
      // player out. Someone standing WEST of a shut door has already been
      // through it — it only shuts behind them — and got back here by the
      // one second the drop took, or by a respawn. Without this they are
      // stuck for good, so it lifts again for them; from the hall side it
      // stays a wall. (Key doors: the key was spent on the way in.)
      const west = !p.dead && p.x + p.w / 2 < door.x && p.x + p.w > door.x - 60;
      if (west && (door.noKey || lvl.key?.consumed)) {
        door.state = 'opening';
        door.openT = DOOR_OPEN;
        fx.play('rumble');
      }
    } else if (door.state === 'cracking') { // level 9: a hearth's fire reached it
      door.openT += dt;
      if (door.openT >= DOOR_CRACK) { door.state = 'melting'; door.openT = 0; fx.play('melt', 0.5); }
    } else if (door.state === 'melting') {
      door.openT += dt;
      if (door.openT >= DOOR_MELT) { door.state = 'open'; door.openT = 0; fx.play('puff'); }
    }
  }
}

// Locked, shut or on its way down: solid side-collision wall. The player is
// pushed back to the side of the door their centre is on. Closing counts
// from its first frame: it starts only once the player is wholly past, and a
// passable closing door let them double back through it and be shut out. A
// frost seal is solid all the way through its crack and its melt — it is
// only a way through once it is open.
const SOLID = new Set(['locked', 'shut', 'closing', 'cracking', 'melting']);

export function resolveDoor(lvl, p) {
  for (const door of doorsOf(lvl)) {
    if (!SOLID.has(door.state)) continue;
    if (p.x < door.x + door.w && p.x + p.w > door.x && p.y < door.y + door.h && p.y + p.h > door.y) {
      p.x = p.x + p.w / 2 < door.x + door.w / 2 ? door.x - p.w : door.x + door.w;
    }
  }
}
