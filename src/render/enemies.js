// Enemy rendering: per-kind sprites via the enemy kind registry, with a
// legacy map for kinds not yet migrated.
import { getKind } from '../enemies/index.js';
import { palette } from './theme.js';

const DRAW = {
  mage: drawMage,
};

export function drawEnemies(c, enemies) {
  for (const e of enemies) {
    if (e.dead) continue;
    const def = getKind(e.kind);
    if (def?.draw) def.draw(c, e);
    else DRAW[e.kind](c, e);
  }
}

function drawMage(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  const windup = e.state === 'windup';
  c.fillStyle = '#3d2b6b'; // robe
  c.fillRect(-16, -10, 32, 37);
  c.fillStyle = '#58418f'; // robe front
  c.fillRect(-16, -10, 12, 37);
  c.fillStyle = '#2a1d4d'; // hat
  c.fillRect(-12, -27, 24, 9);
  c.fillRect(-6, -19, 16, 4);
  c.fillStyle = palette.white; // face
  c.fillRect(-2, -16, 10, 8);
  c.fillStyle = '#e33'; // eye
  c.fillRect(4, -14, 3, 3);
  c.fillStyle = '#8a5f22'; // staff
  c.fillRect(14, -16, 3, 40);
  c.fillStyle = windup ? '#ff8c42' : '#6fe3e1'; // staff orb glows in the windup
  c.fillRect(11, -24, 9, 9);
  if (e.flash > 0) {
    c.globalAlpha = 0.7; // hit flash
    c.fillStyle = palette.white;
    c.fillRect(-17, -28, 34, 56);
  }
  c.restore();
  if (!e.dead) { // hp pips, world space above the boss
    for (let i = 0; i < 5; i++) {
      c.fillStyle = i < e.hp ? '#e33' : '#522';
      c.fillRect(e.x + e.w / 2 - 29 + i * 12, e.y - 14, 10, 4);
    }
  }
}
