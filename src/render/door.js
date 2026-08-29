// The troll-hall door: stone jambs + header, iron lattice that retracts
// into the header while open (frac from openT/closeT), glowing gold lock
// on the lattice bottom while locked.
import { DOOR_OPEN, DOOR_CLOSE } from '../door.js';

export function drawDoor(c, lvl, gameTime) {
  const door = lvl.door;
  if (!door) return;
  if (door.kind === 'webwall') { drawWebWall(c, door, gameTime); return; } // level 6
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
