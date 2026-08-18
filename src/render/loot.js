// Loot rendering: gem, grow sparkle, bow, heart.
import { loot } from '../loot.js';
import { palette } from './theme.js';

export function drawLoot(c) {
  for (const it of loot) {
    if (it.taken) continue;
    const bob = it.onGround ? Math.sin(it.t * 4) * 3 : 0;
    c.save();
    c.translate(it.x + it.w / 2, it.y + it.h / 2 + bob);
    if (it.kind === 'gem') {
      c.fillStyle = palette.teal;
      c.beginPath();
      c.moveTo(0, -8); c.lineTo(7, 0); c.lineTo(0, 8); c.lineTo(-7, 0);
      c.closePath(); c.fill();
      c.fillStyle = '#c8fbfa'; // glint
      c.beginPath();
      c.moveTo(0, -8); c.lineTo(7, 0); c.lineTo(0, 0);
      c.closePath(); c.fill();
    } else if (it.kind === 'grow') {
      c.fillStyle = palette.gold;
      c.beginPath(); // four-point sparkle
      c.moveTo(0, -8); c.lineTo(3, -3); c.lineTo(8, 0); c.lineTo(3, 3);
      c.lineTo(0, 8); c.lineTo(-3, 3); c.lineTo(-8, 0); c.lineTo(-3, -3);
      c.closePath();
      c.fill();
    } else if (it.kind === 'bow') {
      c.strokeStyle = palette.wood;
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(-2, 0, 7, -Math.PI / 2, Math.PI / 2); // limb
      c.stroke();
      c.strokeStyle = palette.white;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-2, -7); c.lineTo(-2, 7); // string
      c.stroke();
    } else { // heart
      c.fillStyle = palette.pink;
      c.beginPath();
      c.arc(-3.5, -3, 4.5, 0, Math.PI * 2);
      c.arc(3.5, -3, 4.5, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(-7.5, -1); c.lineTo(0, 8); c.lineTo(7.5, -1);
      c.closePath(); c.fill();
    }
    c.restore();
  }
}
