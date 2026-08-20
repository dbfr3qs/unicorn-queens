// Arrow rendering: shaft + head, flipped by flight direction.
import { arrows } from '../arrows.js';
import { palette } from './theme.js';

export function drawArrows(c) {
  for (const a of arrows) {
    c.save();
    c.translate(a.x, a.y);
    if (a.star) {
      c.fillStyle = palette.gold; // four-point star (symmetric: no flip)
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? 7 : 2.5;
        const an = (i * Math.PI) / 4 - Math.PI / 2;
        c[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(an) * r, Math.sin(an) * r);
      }
      c.closePath();
      c.fill();
    } else {
      c.scale(Math.sign(a.vx), 1);
      c.fillStyle = palette.wood; // shaft
      c.fillRect(0, 1, 10, 2);
      c.fillStyle = '#e8e8f0'; // head
      c.beginPath();
      c.moveTo(10, 0); c.lineTo(15, 2); c.lineTo(10, 4);
      c.closePath();
      c.fill();
    }
    c.restore();
  }
}
