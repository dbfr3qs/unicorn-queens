// The exit (a sealed or open portal) and the pearl on its pedestal.
import { palette } from './theme.js';

export function drawExit(c, lvl, gameTime) {
  const e = lvl.exit;
  if (!e) return;
  c.save();
  c.globalAlpha = e.locked ? 0.45 + 0.2 * Math.sin(gameTime * 4) : 0.35;
  c.fillStyle = e.locked ? '#6fe3e1' : palette.gold; // seal vs open glow
  c.fillRect(e.x, e.y, e.w, e.h);
  c.restore();
}

export function drawPearl(c, lvl, gameTime) {
  const pearl = lvl.pearl;
  if (!pearl || !pearl.visible || pearl.taken) return;
  const bob = Math.sin(gameTime * 3) * 3;
  c.save();
  c.translate(pearl.x + pearl.w / 2, pearl.y + pearl.h / 2 + bob);
  c.fillStyle = '#fff5fa'; // pearl
  c.fillRect(-9, -9, 18, 18);
  c.fillStyle = palette.white; // shine
  c.fillRect(-5, -6, 5, 4);
  c.restore();
}
