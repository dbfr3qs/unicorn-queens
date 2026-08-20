// Loot rendering: per-kind sprites via the loot-items registry, with a
// legacy chain for kinds not yet migrated.
import { loot } from '../loot.js';
import { getItem } from '../loot-items/index.js';
import { palette } from './theme.js';

export function drawLoot(c) {
  for (const it of loot) {
    if (it.taken) continue;
    const bob = it.onGround ? Math.sin(it.t * 4) * 3 : 0;
    c.save();
    c.translate(it.x + it.w / 2, it.y + it.h / 2 + bob);
    const def = getItem(it.kind);
    if (def?.draw) {
      def.draw(c, it);
    } else if (it.kind === 'lantern') {
      c.fillStyle = '#ffb36b';             // warm glass
      c.fillRect(-4, -6, 8, 10);
      c.fillStyle = '#8a5f22';             // frame
      c.fillRect(-6, -8, 12, 2);
      c.fillRect(-6, 4, 12, 2);
      c.strokeStyle = '#8a5f22';           // handle
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(0, -8, 4, Math.PI, 0); c.stroke();
    } else if (it.kind === 'shield') {
      c.fillStyle = '#cfe8ff';             // mirror disc
      c.beginPath(); c.arc(0, -1, 6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#8fd3f4';
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(0, -1, 6, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#8fd3f4';             // handle
      c.fillRect(-1.5, 5, 3, 5);
    } else if (it.kind === 'hops') {
      c.fillStyle = '#e8e8f0';             // pair of small wings
      c.beginPath(); c.ellipse(-4, 0, 5, 3.5, -0.5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(4, 0, 5, 3.5, 0.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = palette.lavender;      // feather lines
      c.fillRect(-6, 1, 3, 1);
      c.fillRect(3, 1, 3, 1);
    } else if (it.kind === 'star') {
      c.fillStyle = palette.gold;           // four-point star, slow spin
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 === 0 ? 9 : 3.5;
        const a = (i * Math.PI) / 4 - Math.PI / 2 + it.t;
        c[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
    } else if (it.kind === 'heartcap') {
      c.fillStyle = palette.gold;           // golden heart
      c.beginPath();
      c.arc(-3.5, -2, 4.5, 0, Math.PI * 2);
      c.arc(3.5, -2, 4.5, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(-7.5, 0); c.lineTo(0, 8); c.lineTo(7.5, 0);
      c.closePath(); c.fill();
      c.fillStyle = '#fff';                 // little crown
      c.fillRect(-5.5, -9.5, 11, 2.5);
      c.fillRect(-5.5, -13, 2.5, 5);
      c.fillRect(-1.25, -13.5, 2.5, 5.5);
      c.fillRect(3, -13, 2.5, 5);
    } else if (it.kind === 'sunbeam') {
      c.strokeStyle = '#ffe9b0';             // rotating rays
      c.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + it.t;
        c.beginPath();
        c.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
        c.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
        c.stroke();
      }
      c.fillStyle = '#ffd75e';               // radiant disc
      c.beginPath();
      c.arc(0, 0, 6, 0, Math.PI * 2);
      c.fill();
    } else if (it.kind === 'magnet') {
      c.strokeStyle = palette.pink;          // horseshoe magnet
      c.lineWidth = 4;
      c.beginPath();
      c.arc(0, 1, 6, Math.PI, Math.PI * 2);  // open at the bottom
      c.stroke();
      c.fillStyle = '#fff';                  // ferrule tips
      c.fillRect(-8, 0, 4, 3);
      c.fillRect(4, 0, 4, 3);
    } else if (it.kind === 'boots') {
      c.fillStyle = palette.gold;            // golden boot pair
      c.fillRect(-8, -6, 6, 12);
      c.fillRect(2, -6, 6, 12);
      c.fillRect(-9, 4, 7, 3);               // soles
      c.fillRect(1, 4, 7, 3);
      c.fillStyle = '#8a5f22';               // trim
      c.fillRect(-8, -6, 6, 2);
      c.fillRect(2, -6, 6, 2);
    }
    c.restore();
  }
}
