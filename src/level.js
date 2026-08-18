// Level layout, shared collision resolution, and level rendering.
// Pure module: no DOM/canvas globals (view height is passed in).

export const WORLD_W = 2400;
export const GROUND_H = 40;

export function createLevel(viewH = 600) {
  const groundY = viewH - GROUND_H;
  return {
    width: WORLD_W,
    height: viewH,
    groundY,
    goal: { x: 2340 },
    ground: [
      { x: 0, w: 820, kind: 'ground' },
      { x: 940, w: 660, kind: 'ground' },
      { x: 1800, w: 600, kind: 'ground' },
    ],
    platforms: [
      { x: 320, y: groundY - 110, w: 140, kind: 'platform' },
      { x: 540, y: groundY - 190, w: 140, kind: 'platform' },
      { x: 840, y: groundY - 150, w: 120, kind: 'platform' },
      { x: 1200, y: groundY - 130, w: 140, kind: 'platform' },
      { x: 1640, y: groundY - 160, w: 130, kind: 'platform' },
      { x: 2000, y: groundY - 140, w: 140, kind: 'platform' },
    ],
    boxes: [
      { x: 450, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box' },
      { x: 700, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'grow' },
      { x: 1300, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box' },
      { x: 1950, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box' },
      { x: 1250, y: groundY - 166, w: 36, h: 36, broken: false, kind: 'box' },
    ],
  };
}

// Land a falling entity on the first surface it crossed this frame.
// Returns the surface ({kind: 'ground'|'platform'|'box'}) or null.
export function resolveGroundCollision(entity, lvl, dt) {
  entity.onGround = false;
  const left = entity.x, right = entity.x + entity.w;
  const bottom = entity.y + entity.h;
  let landed = null;
  if (entity.vy >= 0) {
    const prevBottom = bottom - entity.vy * dt;
    // +0.5px tolerance: prevBottom is reconstructed (bottom - vy*dt), so float
    // rounding can leave it 1e-13 px below the surface and miss the landing
    for (const seg of lvl.ground) {
      if (right > seg.x && left < seg.x + seg.w && prevBottom <= lvl.groundY + 0.5 && bottom >= lvl.groundY) {
        entity.y = lvl.groundY - entity.h;
        entity.vy = 0;
        entity.onGround = true;
        landed = seg;
        break;
      }
    }
    if (!landed) {
      const solids = lvl.platforms.concat(lvl.boxes.filter(b => !b.broken));
      for (const s of solids) {
        if (right > s.x && left < s.x + s.w && prevBottom <= s.y + 0.5 && bottom >= s.y) {
          entity.y = s.y - entity.h;
          entity.vy = 0;
          entity.onGround = true;
          landed = s;
          break;
        }
      }
    }
  }
  // boxes also block from the side for flagged entities (the player)
  if (entity.solidToBoxes && (!landed || landed.kind !== 'box')) {
    for (const b of lvl.boxes) {
      if (b.broken) continue;
      if (right > b.x && left < b.x + b.w && bottom > b.y + 6 && entity.y < b.y + b.h - 2) {
        entity.x = (entity.x + entity.w / 2 < b.x + b.w / 2) ? b.x - entity.w : b.x + b.w;
      }
    }
  }
  return landed;
}

export function drawLevel(c, lvl, camera) {
  c.save();
  c.translate(-(camera ? camera.x : 0), 0);
  for (const seg of lvl.ground) {
    c.fillStyle = '#2d1b4e';
    c.fillRect(seg.x, lvl.groundY, seg.w, lvl.height - lvl.groundY);
    c.fillStyle = '#7b4fa6';
    c.fillRect(seg.x, lvl.groundY, seg.w, 4);
  }
  c.fillStyle = '#4a2d7a';
  for (const p of lvl.platforms) c.fillRect(p.x, p.y, p.w, 12);
  for (const b of lvl.boxes) {
    if (b.broken) continue;
    c.fillStyle = '#c98f3d';
    c.fillRect(b.x, b.y, b.w, b.h);
    c.strokeStyle = '#8a5f22';
    c.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
  }
  const g = lvl.goal; // goal flag
  c.fillStyle = '#cbb8ff';
  c.fillRect(g.x, lvl.groundY - 90, 4, 90);
  c.fillStyle = '#ffd75e';
  c.beginPath();
  c.arc(g.x + 2, lvl.groundY - 94, 5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ff6f91';
  c.beginPath();
  c.moveTo(g.x + 4, lvl.groundY - 86);
  c.lineTo(g.x + 40, lvl.groundY - 74);
  c.lineTo(g.x + 4, lvl.groundY - 62);
  c.closePath();
  c.fill();
  c.restore();
}
