// The sprite path's art-agnostic tell: a soft translucent ellipse over the drawn
// sheet (world space). A static sheet cannot change pose or colour, and the vector
// body's anatomy (arms, clubs, orbs, eyes, fangs, staffs) does not sit on the art,
// so a state the vector body shows by pose is shown over a sprite by this glow, in
// the tell's colour (the spider boss's lunge tell is the model). `top` is the drawn
// sheet's top edge (render/enemies.js passes it); the sheet's feet are the box's.
export function spriteGlow(c, e, top, colour, alpha = 0.45) {
  const bottom = e.y + e.h;
  c.globalAlpha = alpha;
  c.fillStyle = colour;
  c.beginPath();
  c.ellipse(e.x + e.w / 2, (top + bottom) / 2, e.w * 0.55, (bottom - top) * 0.42, 0, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
}
