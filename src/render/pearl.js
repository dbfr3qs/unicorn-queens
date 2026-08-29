// The pearl on its pedestal. The exit itself is invisible: the level
// ends by walking down the staircase into the (unlocked) exit rect.
import { palette } from './theme.js';

export function drawPearl(c, lvl, gameTime) {
  const pearl = lvl.pearl;
  if (!pearl) return;
  // pedestal, present even before the pearl appears. Ground pearls (L2/L4)
  // get the full column; a pearl resting on a platform (L6's boss altar)
  // gets the cap only — the dais is the pedestal.
  const baseY = pearl.y + pearl.h - 4;
  const onDais = (lvl.platforms ?? []).some(pl =>
    pl.x <= pearl.x && pearl.x + pearl.w <= pl.x + pl.w && pl.y === pearl.y + pearl.h);
  if (!onDais) {
    c.fillStyle = '#3a2a5c';
    c.fillRect(pearl.x - 8, baseY, pearl.w + 16, lvl.groundY - baseY);
  }
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
