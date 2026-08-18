// Enemy rendering: patrolling slimes.
import { palette } from './theme.js';

export function drawEnemies(c, enemies) {
  for (const e of enemies) {
    if (e.dead) continue;
    c.save();
    c.translate(e.x + e.w / 2, e.y + e.h / 2);
    c.scale(e.dir, 1);
    c.fillStyle = '#5d3a9b'; // body
    c.fillRect(-15, -14, 30, 24);
    c.fillStyle = palette.night; // feet
    c.fillRect(-13, 10, 8, 4);
    c.fillRect(5, 10, 8, 4);
    c.fillStyle = palette.white; // eye
    c.fillRect(4, -10, 6, 6);
    c.fillStyle = '#e33';
    c.fillRect(6, -8, 3, 3);
    c.restore();
  }
}
