// Enemy projectiles: fireballs (hot core in an orange glow), troll
// boulders (rock with speckles), shockwave fronts (dust + rock shard).
import { fireballs, boulders, shockwaves, cones, coneSegment, CONE_SEGS } from '../projectiles.js';

export function drawFireballs(c) {
  for (const f of fireballs) {
    c.save();
    c.translate(f.x + f.w / 2, f.y + f.h / 2);
    if (f.web) {
      // the Weaver Queen's glob: a pale web ball (light disc + threads)
      c.fillStyle = 'rgba(240, 240, 248, 0.9)'; // light disc
      c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(200, 200, 220, 0.9)';
      c.lineWidth = 1;
      for (let i = 0; i < 3; i++) { // crosshatch threads
        const a = (i / 3) * Math.PI;
        c.beginPath();
        c.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
        c.lineTo(-Math.cos(a) * 7, -Math.sin(a) * 7);
        c.stroke();
      }
      c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.stroke();
    } else if (f.cyan) { // the Sentinel/Warden's cyan bolt (level 8)
      c.fillStyle = '#2a8f9e'; // outer glow
      c.fillRect(-9, -9, 18, 18);
      c.fillStyle = '#6fe3e1'; // body
      c.fillRect(-7, -7, 14, 14);
      c.fillStyle = '#d8ffff'; // hot core
      c.fillRect(-3, -3, 6, 6);
    } else {
      c.fillStyle = '#c1440e'; // outer glow
      c.fillRect(-9, -9, 18, 18);
      c.fillStyle = '#ff8c42'; // body
      c.fillRect(-7, -7, 14, 14);
      c.fillStyle = '#ffd166'; // hot core
      c.fillRect(-3, -3, 6, 6);
    }
    c.restore();
  }
}

export function drawBoulders(c) {
  for (const b of boulders) {
    c.save();
    c.translate(b.x + b.w / 2, b.y + b.h / 2);
    if (b.web) {
      // the Queen's egg: a white web-wound ovoid with a thread seam
      c.fillStyle = '#f0f0f8';
      c.beginPath(); c.ellipse(0, 0, 8, 9, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(200, 200, 220, 0.9)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(-8, 0); c.quadraticCurveTo(0, 4, 8, 0); c.stroke();
      c.beginPath(); c.moveTo(0, -9); c.quadraticCurveTo(4, 0, 0, 9); c.stroke();
    } else {
      c.fillStyle = '#6b4a32'; // rock
      c.fillRect(-9, -9, 18, 18);
      c.fillStyle = '#4a2d1c'; // speckles
      c.fillRect(-5, -4, 4, 4);
      c.fillRect(1, 2, 5, 4);
    }
    c.restore();
  }
}

export function drawShockwaves(c) {
  for (const s of shockwaves) {
    c.save();
    c.translate(s.x + s.w / 2, s.y + s.h / 2);
    c.fillStyle = '#8d76b8'; // dust
    c.fillRect(-6, -9, 12, 18);
    c.fillStyle = '#6b4a32'; // rock shard
    c.fillRect(-4, -4, 8, 8);
    c.restore();
  }
}

export function drawCones(c) {
  // Flame beam: the segment circles, drawn inner (hot) to outer (dim)
  // along the beam so the core reads over the body.
  for (const cone of cones) {
    for (let i = 0; i < CONE_SEGS; i++) {
      const s = coneSegment(cone, i);
      // the wizard's snort is dark violet (the L6 web-glob recolor pattern)
      c.fillStyle = cone.violet ? (i % 2 ? '#6a3a9a' : '#4a2a72') : (i % 2 ? '#ff8c42' : '#e85d2a');
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill();
    }
    for (let i = 0; i < CONE_SEGS; i++) {
      const s = coneSegment(cone, i);
      c.fillStyle = cone.violet ? '#9a6ac8' : '#ffd166'; // hot core
      c.beginPath(); c.arc(s.x, s.y, s.r * 0.45, 0, Math.PI * 2); c.fill();
    }
  }
}
