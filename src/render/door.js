// The troll-hall door: stone jambs + header, iron lattice that retracts
// into the header while open (frac from openT/closeT), glowing gold lock
// on the lattice bottom while locked.
import { DOOR_OPEN, DOOR_CLOSE } from '../door.js';

export function drawDoor(c, lvl, gameTime) {
  const door = lvl.door;
  if (!door) return;
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
