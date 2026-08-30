// Door rendering: the troll-hall portcullis (levels 3–6), the web wall
// (level 6), and the peak's two gates (level 7 — the first multi-door
// level, iterated from lvl.doors; single-door levels keep lvl.door).
import { DOOR_OPEN, DOOR_CLOSE } from '../door.js';

export function drawDoor(c, lvl, gameTime) {
  const doors = lvl.doors ?? (lvl.door ? [lvl.door] : []);
  for (const door of doors) {
    if (door.kind === 'webwall') drawWebWall(c, door, gameTime);
    else if (door.kind === 'irongate') drawIronGate(c, door, gameTime);
    else if (door.kind === 'thronegate') drawThroneGate(c, door, gameTime);
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
  c.fillStyle = '#5a4a3a'; // stone jambs + header
  c.fillRect(x - 10, 0, 10, h);
  c.fillRect(x + w, 0, 10, h);
  c.fillRect(x - 10, 0, w + 20, 12);
  const latticeH = 30 + (h - 30) * (1 - frac); // top stays in the header
  c.fillStyle = '#8a8f98'; // iron lattice
  c.fillRect(x, 12, w, latticeH);
  c.fillStyle = '#3a3f48'; // vertical bars
  c.fillRect(x + 7, 12, 4, latticeH);
  c.fillRect(x + 18, 12, 4, latticeH);
  c.fillRect(x + 29, 12, 4, latticeH);
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
  c.fillStyle = '#2c3438'; // stone jambs + header
  c.fillRect(x - 10, 0, 10, h);
  c.fillRect(x + w, 0, 10, h);
  c.fillRect(x - 10, 0, w + 20, 12);
  const frac = door.state === 'open' ? 1
    : door.state === 'opening' ? 1 - door.openT / WEB_DOOR_OPEN : 0;
  if (frac >= 1) return;
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
  c.fillStyle = '#2c3450'; // stone jambs + header
  c.fillRect(x - 10, 0, 10, h);
  c.fillRect(x + w, 0, 10, h);
  c.fillRect(x - 10, 0, w + 20, 12);
  c.fillStyle = '#e8f0f8'; // snow caps on the jambs
  c.fillRect(x - 10, 0, 10, 4);
  c.fillRect(x + w, 0, 10, 4);
  const latticeH = 30 + (h - 30) * (1 - frac); // top stays in the header
  c.fillStyle = '#23283c'; // the dark iron lattice
  c.fillRect(x, 12, w, latticeH);
  c.fillStyle = '#3a4258'; // vertical bars
  c.fillRect(x + 5, 12, 4, latticeH);
  c.fillRect(x + 16, 12, 4, latticeH);
  c.fillRect(x + 27, 12, 4, latticeH);
  if (door.state === 'locked') { // the seal's dim glow at the hub
    c.globalAlpha = 0.5 + 0.25 * Math.sin(t * 2);
    c.fillStyle = '#6a3a9a';
    c.beginPath(); c.arc(x + w / 2, h / 2, 12, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
  }
}

// The level 7 throne gate: nothing opens it — the trigger band's flare
// dissolves it (state 'opening' + openT), so 'opening' renders as the
// dissolve: the lattice fades out over GATE_DISSOLVE s with rising dark
// motes. Fully open it draws only the jambs (the west off-ramp stays).
const GATE_DISSOLVE = 1.5; // must match the openT set by the M5 trigger
function drawThroneGate(c, door, t) {
  const { x, w, h } = door;
  const frac = door.state === 'open' ? 1
    : door.state === 'opening' ? 1 - door.openT / GATE_DISSOLVE
    : 0;
  c.fillStyle = '#2c3450'; // stone jambs
  c.fillRect(x - 10, 0, 10, h);
  c.fillRect(x + w, 0, 10, h);
  if (frac >= 1) return; // dissolved: the off-ramp
  c.save();
  c.globalAlpha = 1 - frac; // the dissolve
  c.fillStyle = '#23283c'; // the dark iron lattice
  c.fillRect(x, 0, w, h);
  c.fillStyle = '#3a4258'; // vertical bars
  for (const bx of [x + 5, x + 16, x + 27]) c.fillRect(bx, 0, 4, h);
  c.fillStyle = '#6a3a9a'; // the seal's glow, dying with the lattice
  c.globalAlpha = (1 - frac) * (0.5 + 0.25 * Math.sin(t * 2));
  c.beginPath(); c.arc(x + w / 2, h / 2, 14, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 6; i++) { // the rising dark motes
    const my = h - ((t * 40 + i * 47) % h);
    c.globalAlpha = (1 - frac) * 0.4;
    c.fillStyle = '#1a1026';
    c.fillRect(x + 4 + (i * 5) % (w - 8), my, 4, 4);
  }
  c.restore();
}
