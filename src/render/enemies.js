// Enemy rendering: per-kind sprites via the enemy kind registry, with a
// legacy map for kinds not yet migrated.
import { getKind } from '../enemies/index.js';
import { palette } from './theme.js';

const DRAW = {
  zombie: drawZombie,
  ghost: drawGhost,
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

function drawZombie(c, e) {
  c.save();
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  c.scale(e.dir, 1);
  const step = Math.sin(e.x * 0.3) * 3; // leg shuffle from position
  c.fillStyle = '#4a7c3f'; // torso
  c.fillRect(-17, -20, 34, 32);
  c.fillStyle = '#3a6132'; // legs
  c.fillRect(-14, 12, 10, 8 + step);
  c.fillRect(4, 12, 10, 8 - step);
  c.fillStyle = '#5d9450'; // outstretched arm
  c.fillRect(6, -10, 12, 6);
  c.fillStyle = '#3a6132'; // dark patch
  c.fillRect(-13, -2, 8, 10);
  c.fillStyle = palette.white; // eye
  c.fillRect(3, -16, 7, 5);
  c.fillStyle = '#e33'; // glowing pupil
  c.fillRect(6, -15, 3, 3);
  c.restore();
}

function drawGhost(c, e) {
  c.save();
  c.globalAlpha = e.flicker > 0 ? 0.4 : 0.75; // dimmer while fleeing the lantern
  c.translate(e.x + e.w / 2, e.y + e.h / 2);
  const wob = Math.sin(e.phase) * 2; // skirt wobble follows the bob phase
  c.fillStyle = '#cfe8ff'; // pale body
  c.fillRect(-14, -13, 28, 18);
  c.fillRect(-10, 5, 6, 8 + wob); // wavy skirt
  c.fillRect(-2, 5, 6, 8 - wob);
  c.fillRect(6, 5, 6, 8);
  c.fillStyle = '#2a3d66'; // dark eyes
  c.fillRect(-8, -8, 4, 6);
  c.fillRect(4, -8, 4, 6);
  c.restore();
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
