// Arrow rendering: shaft + head, flipped by flight direction.
import { arrows } from '../arrows.js';

export function drawArrows(c) {
  for (const a of arrows) {
    c.save();
    c.translate(a.x, a.y);
    c.scale(Math.sign(a.vx), 1);
    c.fillStyle = '#d9b380'; // shaft
    c.fillRect(0, 1, 10, 2);
    c.fillStyle = '#e8e8f0'; // head
    c.beginPath();
    c.moveTo(10, 0); c.lineTo(15, 2); c.lineTo(10, 4);
    c.closePath();
    c.fill();
    c.restore();
  }
}
