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
export const DOOR_OPEN = 1.0, DOOR_CLOSE = 1.0, DOOR_PASS = 10;
const STAYS_OPEN = new Set(['webwall', 'irongate', 'thronegate']);

function doorsOf(lvl) {
  return lvl.doors ?? (lvl.door ? [lvl.door] : []);
}

export function updateDoor(lvl, p, dt, fx) {
  for (const door of doorsOf(lvl)) {
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
    }
  }
}

// Locked or shut: solid side-collision wall. The player is pushed back to
// the side of the door their centre is on.
export function resolveDoor(lvl, p) {
  for (const door of doorsOf(lvl)) {
    if (door.state !== 'locked' && door.state !== 'shut') continue;
    if (p.x < door.x + door.w && p.x + p.w > door.x && p.y < door.y + door.h && p.y + p.h > door.y) {
      p.x = p.x + p.w / 2 < door.x + door.w / 2 ? door.x - p.w : door.x + door.w;
    }
  }
}
