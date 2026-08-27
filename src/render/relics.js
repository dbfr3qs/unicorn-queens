// Level 5 relics + the hiding bush. Relics are 16×16 sprites drawn only
// while `visible && !taken`, each with a soft glint (sin, phased by world
// x — the key's pattern). The bush is a two-tone green mound: while its
// relic is hidden a 2×2 white glint pulses on a ~4 s seed (the "something
// is in here" cue), and it sways while rustleT runs after an arrow hit.
import { palette } from './theme.js';

function glint(c, x, y, t, phase) {
  c.globalAlpha = 0.35 + 0.35 * Math.sin(t * 4 + phase);
  c.fillStyle = palette.white;
  c.fillRect(x, y, 3, 2);
  c.globalAlpha = 1;
}

export function drawRelics(c, lvl, t) {
  for (const r of lvl.relics ?? []) {
    if (!r.visible || r.taken) continue;
    const { x, y } = r;
    if (r.id === 'horseshoe') {
      c.strokeStyle = palette.gold; // golden U, opening up
      c.lineWidth = 3;
      c.beginPath(); c.arc(x + 8, y + 7, 5.5, Math.PI * 0.12, Math.PI * 0.88); c.stroke();
      c.fillStyle = palette.gold;
      c.fillRect(x + 2.5, y + 5, 2, 2); // nail dots
      c.fillRect(x + 11.5, y + 5, 2, 2);
      glint(c, x + 3, y + 1, t, x * 0.013);
    } else if (r.id === 'sapphire') {
      c.fillStyle = '#2ec4b6'; // teal faceted diamond
      c.beginPath();
      c.moveTo(x + 3, y + 3); c.lineTo(x + 13, y + 3);
      c.lineTo(x + 15, y + 7); c.lineTo(x + 8, y + 15); c.lineTo(x + 1, y + 7);
      c.closePath(); c.fill();
      c.fillStyle = '#7fe8dd'; // facets
      c.beginPath();
      c.moveTo(x + 3, y + 3); c.lineTo(x + 8, y + 3); c.lineTo(x + 1, y + 7);
      c.closePath(); c.fill();
      c.fillRect(x + 8, y + 3, 5, 3);
      glint(c, x + 4, y + 5, t, x * 0.013);
    } else { // royal acorn: gold body, brown cap, stem
      c.fillStyle = '#c98f3d';
      c.beginPath(); c.arc(x + 8, y + 10, 5.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8a5f22'; // cap
      c.beginPath(); c.arc(x + 8, y + 6, 6.5, Math.PI, 0); c.fill();
      c.fillRect(x + 7, y, 2, 3); // stem
      glint(c, x + 5, y + 8, t, x * 0.013);
    }
  }
}

export function drawBushes(c, lvl, t) {
  for (const b of lvl.bushes ?? []) {
    const { x, y, w, h } = b;
    const sway = b.rustleT > 0 ? Math.sin(t * 40) * 2 * (b.rustleT / 0.4) : 0;
    c.fillStyle = '#2e6a34'; // mound base
    c.beginPath(); c.ellipse(x + w / 2 + sway, y + h / 2 + 4, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3e8a44'; // two-tone leaves
    c.beginPath(); c.ellipse(x + w / 2 - 8 + sway, y + h / 2 - 2, w / 3, h / 3, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(x + w / 2 + 10 + sway, y + h / 2 - 1, w / 3, h / 3, 0, 0, Math.PI * 2); c.fill();
    if (b.state === 'hiding') {
      // a 2×2 white glint pulsing on a ~4 s seed (period 2π/1.57 ≈ 4 s)
      if (Math.sin(t * 1.57 + x * 0.013) > 0.55) {
        c.fillStyle = palette.white;
        c.fillRect(x + w / 2 - 6, y + 6, 2, 2);
        c.fillRect(x + w / 2 + 5, y + 12, 2, 2);
      }
    }
  }
}
