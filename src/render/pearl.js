// The pearl on its pedestal. The exit itself is invisible: the level
// ends by walking down the staircase into the (unlocked) exit rect.
import { palette } from './theme.js';

export function drawPearl(c, lvl, gameTime) {
  const pearl = lvl.pearl;
  if (!pearl) return;
  // pedestal, present even before the pearl appears
  c.fillStyle = '#3a2a5c';
  c.fillRect(pearl.x - 8, pearl.y + pearl.h - 4, pearl.w + 16, lvl.groundY - (pearl.y + pearl.h - 4));
  c.fillStyle = '#4a3a70'; // cap
  c.fillRect(pearl.x - 12, pearl.y + pearl.h - 10, pearl.w + 24, 8);
  if (!pearl.visible || pearl.taken) return;
  const bob = Math.sin(gameTime * 3) * 3;
  c.save();
  c.translate(pearl.x + pearl.w / 2, pearl.y + pearl.h / 2 + bob);
  c.fillStyle = '#fff5fa'; // pearl
  c.fillRect(-9, -9, 18, 18);
  c.fillStyle = palette.white; // shine
  c.fillRect(-5, -6, 5, 4);
  c.restore();
}
