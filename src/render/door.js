// Door rendering: the troll-hall portcullis (levels 3–6), the web wall
// (level 6), and the peak's two gates (level 7 — the first multi-door
// level, iterated from lvl.doors; single-door levels keep lvl.door).
import { DOOR_OPEN, DOOR_CLOSE } from '../door.js';
import { spriteReady } from '../sprites.js';
import { drawWall, drawTileGrid } from './sprite.js';

// The portcullis doors' two parts, from sheets where they have decoded.
// The jambs are the wall the door is set in — the level names the sheet on
// the door (`wall`) — so a gate in the spire is framed in spire stone and
// one in the undercroft in brick. The lattice is a tile of iron bars,
// world-anchored, clipped to the part still hanging in the opening. Each
// returns false where its sheet is not ready, and the caller draws the old
// rectangles instead.
const JAMB = 10, HEADER = 12;
function drawJambs(c, door) {
  const { x, w, h } = door;
  if (!door.wall || !spriteReady(door.wall)) return false;
  return drawWall(c, door.wall, x - JAMB, x, 0, h) && drawWall(c, door.wall, x + w, x + w + JAMB, 0, h)
    && drawWall(c, door.wall, x - JAMB, x + w + JAMB, 0, HEADER);
}
function drawBars(c, door, top, bottom) {
  if (!spriteReady('iron_bars')) return false;
  const { x, w } = door;
  // the opening behind the bars is in shadow: dark iron on a dark wall (the
  // lair's) was a gate nobody could see, and a doorway is darker than a wall
  c.fillStyle = 'rgba(0, 0, 0, 0.45)';
  c.fillRect(x, top, w, bottom - top);
  return drawTileGrid(c, 'iron_bars', x, x + w, 0, top, bottom, w, w, top); // a square tile, bar over bar
}
// The web wall's lattice: the web tile, threads only, over a shadowed
// opening, at whatever alpha the melt has left it.
function drawWeb(c, door, alpha) {
  if (!spriteReady('web_tile')) return false;
  const { x, w, h } = door;
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = 'rgba(0, 0, 0, 0.35)';
  c.fillRect(x, HEADER, w, h - HEADER);
  const drew = drawTileGrid(c, 'web_tile', x, x + w, 0, HEADER, h, w, w, HEADER);
  c.restore();
  return drew;
}


export function drawDoor(c, lvl, gameTime) {
  const doors = lvl.doors ?? (lvl.door ? [lvl.door] : []);
  for (const door of doors) {
    if (door.kind === 'webwall') drawWebWall(c, door, gameTime);
    else if (door.kind === 'irongate') drawIronGate(c, door, gameTime);
    else if (door.kind === 'thronegate') drawThroneGate(c, door, gameTime);
    else if (door.kind === 'geardoor' || door.kind === 'bookwall' || door.kind === 'shelfpanel') continue; // level 8: collision-only; citadel.js owns the visual
    else if (door.kind === 'frostseal') continue; // level 9: collision-only; frostpalace.js owns the visual
    else drawTrollDoor(c, door, gameTime);
  }
}

// The troll-hall door: stone jambs + header, iron lattice that retracts
// into the header while open (frac from openT/closeT), glowing gold lock
// on the lattice bottom while locked.
function drawTrollDoor(c, door, gameTime) {
  const { x, w, h } = door;
  const frac = door.state === 'open' ? 1
    : door.state === 'opening' ? 1 - door.openT / DOOR_OPEN
    : door.state === 'closing' ? door.closeT / DOOR_CLOSE
    : 0;
  if (!drawJambs(c, door)) {
    c.fillStyle = '#5a4a3a'; // stone jambs + header
    c.fillRect(x - 10, 0, 10, h);
    c.fillRect(x + w, 0, 10, h);
    c.fillRect(x - 10, 0, w + 20, 12);
  }
  const latticeH = 30 + (h - 30) * (1 - frac); // top stays in the header
  if (!drawBars(c, door, 12, 12 + latticeH)) {
    c.fillStyle = '#8a8f98'; // iron lattice
    c.fillRect(x, 12, w, latticeH);
    c.fillStyle = '#3a3f48'; // vertical bars
    c.fillRect(x + 7, 12, 4, latticeH);
    c.fillRect(x + 18, 12, 4, latticeH);
    c.fillRect(x + 29, 12, 4, latticeH);
  }
  if (door.state === 'locked') { // glowing lock at the lattice bottom
    c.globalAlpha = 0.6 + 0.3 * Math.sin(gameTime * 3);
    c.fillStyle = '#ffd75e';
    c.fillRect(x + w / 2 - 6, 12 + latticeH - 22, 12, 12);
    c.globalAlpha = 1;
  }
}

// The level 6 web wall: stone jambs + header, a dense white lattice
// (diagonal crosshatch) with a slow shimmer while sealed. While opening
// (the winch's melt) the whole wall fades out over WEB_DOOR_OPEN s;
// fully open it draws nothing. The wall never re-seals (M4 door guard).
const WEB_DOOR_OPEN = 1.5; // must match the openT set by the winch's w5 beat
function drawWebWall(c, door, t) {
  const { x, w, h } = door;
  if (!drawJambs(c, door)) {
    c.fillStyle = '#2c3438'; // stone jambs + header
    c.fillRect(x - 10, 0, 10, h);
    c.fillRect(x + w, 0, 10, h);
    c.fillRect(x - 10, 0, w + 20, 12);
  }
  const frac = door.state === 'open' ? 1
    : door.state === 'opening' ? 1 - door.openT / WEB_DOOR_OPEN : 0;
  if (frac >= 1) return;
  if (drawWeb(c, door, 1 - frac)) {
    const sy = 12 + ((t * 30) % Math.max(1, h - 26)); // the slow shimmer, kept
    c.globalAlpha = (1 - frac) * 0.25;
    c.fillStyle = '#ffffff';
    c.fillRect(x, sy, w, 6);
    c.globalAlpha = 1;
    return;
  }
  c.save();
  c.globalAlpha = 1 - frac; // the melt: the wall fades out
  c.fillStyle = 'rgba(232, 232, 220, 0.35)'; // the web field
  c.fillRect(x, 12, w, h - 12);
  c.strokeStyle = 'rgba(232, 232, 220, 0.5)';
  c.lineWidth = 1;
  for (let y = 12; y < h; y += 12) { // the diagonal crosshatch
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y + 8); c.stroke();
    c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x + w, y); c.stroke();
  }
  const sy = 12 + ((t * 30) % Math.max(1, h - 26)); // the slow shimmer
  c.globalAlpha = (1 - frac) * 0.25;
  c.fillStyle = '#ffffff';
  c.fillRect(x, sy, w, 6);
  c.restore();
}

// The level 7 iron gate (the sigil opens it once — it never re-seals):
// stone jambs + header, a dark iron lattice, and a dim purple seal glow
// at the hub while locked (the "this opens from the other side" cue).
function drawIronGate(c, door, t) {
  const { x, w, h } = door;
  const frac = door.state === 'open' ? 1
    : door.state === 'opening' ? 1 - door.openT / DOOR_OPEN
    : door.state === 'closing' ? door.closeT / DOOR_CLOSE
    : 0;
  if (!drawJambs(c, door)) {
    c.fillStyle = '#2c3450'; // stone jambs + header
    c.fillRect(x - 10, 0, 10, h);
    c.fillRect(x + w, 0, 10, h);
    c.fillRect(x - 10, 0, w + 20, 12);
    c.fillStyle = '#e8f0f8'; // snow caps on the jambs
    c.fillRect(x - 10, 0, 10, 4);
    c.fillRect(x + w, 0, 10, 4);
  }
  const latticeH = 30 + (h - 30) * (1 - frac); // top stays in the header
  if (!drawBars(c, door, 12, 12 + latticeH)) {
    c.fillStyle = '#23283c'; // the dark iron lattice
    c.fillRect(x, 12, w, latticeH);
    c.fillStyle = '#3a4258'; // vertical bars
    c.fillRect(x + 5, 12, 4, latticeH);
    c.fillRect(x + 16, 12, 4, latticeH);
    c.fillRect(x + 27, 12, 4, latticeH);
  }
  if (door.state === 'locked') { // the seal's dim glow at the hub
    c.globalAlpha = 0.5 + 0.25 * Math.sin(t * 2);
    c.fillStyle = '#6a3a9a';
    c.beginPath(); c.arc(x + w / 2, h / 2, 12, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
}

// The level 7 throne gate: nothing opens it — the trigger band's flare
// (door.flare, 0.8 s) dissolves it into state 'opening', which renders
// as the dissolve: the lattice fades out over DOOR_OPEN s (alpha
// openT/DOOR_OPEN) with rising dark motes. While the flare runs the
// seal blazes brighter (an alpha ramp on flareT). Fully open it draws
// nothing — the arena's west end is the off-ramp.
function drawThroneGate(c, door, t) {
  const { x, w, h } = door;
  if (door.state === 'open') return; // dissolved: the off-ramp
  const frac = door.state === 'opening' ? 1 - door.openT / DOOR_OPEN : 0;
  c.save();
  c.globalAlpha = 1 - frac; // the dissolve: overall alpha = openT/DOOR_OPEN
  if (!drawJambs(c, door)) {
    c.fillStyle = '#2c3450'; // stone jambs, dying with the wall
    c.fillRect(x - 10, 0, 10, h);
    c.fillRect(x + w, 0, 10, h);
  }
  if (!drawBars(c, door, 0, h)) {
    c.fillStyle = '#23283c'; // the dark iron lattice
    c.fillRect(x, 0, w, h);
    c.fillStyle = '#3a4258'; // vertical bars
    for (const bx of [x + 5, x + 16, x + 27]) c.fillRect(bx, 0, 4, h);
  }
  // the seal: a slow ~3 s pulse while sealed, blazing through the flare
  let glow = 0.5 + 0.25 * Math.sin(t * 2);
  let r = 14;
  if (door.flare) { // the 0.8 s flare: brighter as flareT runs down
    const f = 1 - door.flareT / 0.8;
    glow = 0.75 + 0.25 * Math.sin(t * 2) + f * 0.25;
    r = 14 + f * 8;
  }
  c.fillStyle = '#6a3a9a';
  c.globalAlpha = (1 - frac) * Math.min(1, glow);
  c.beginPath(); c.arc(x + w / 2, h / 2, r, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 6; i++) { // the rising dark motes (pure in t)
    const my = h - ((t * 40 + i * 47) % h);
    c.globalAlpha = (1 - frac) * 0.4;
    c.fillStyle = '#1a1026';
    c.fillRect(x + 4 + (i * 5) % (w - 8), my, 4, 4);
  }
  c.restore();
}
