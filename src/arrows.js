// Arrows: firing, flight, enemy hits, box breaks. Module-owned arrow list.
import { burst } from './particles.js';
import { spawnLoot } from './loot.js';
import { shake } from './camera.js';
import { damageEnemy } from './enemies.js';
import { getKind } from './enemies/index.js';
import { FX } from './effects.js';
import { MARKER_GLINT, MARKER_HITS, CRUMBLE_T } from './key.js';
import { cutSpring } from './springs.js'; // level 8: one arrow severs a mainspring
import { ventBubbleRect, ventBubbleUp } from './vent.js';
import { popSac } from './cogs.js';

export const arrows = [];
export const ARROW_SPEED = 520, FIRE_CD = 0.22;

export function resetArrows() {
  arrows.length = 0;
}

export function fireArrow(p) {
  arrows.push({
    x: p.facing > 0 ? p.x + p.w : p.x - 14,
    y: p.y + p.h - 24, // chest height at either size, so ground enemies are still hit
    vx: p.facing * ARROW_SPEED,
    dead: false,
  });
}

// Star arrow: pierces up to 2 enemies (never re-hitting one), shatters
// boxes in its path and keeps flying, no gravity (like every arrow here).
export function fireStarArrow(p) {
  arrows.push({
    x: p.facing > 0 ? p.x + p.w : p.x - 14,
    y: p.y + p.h - 24,
    vx: p.facing * ARROW_SPEED,
    dead: false,
    star: true, pierces: 2, hit: new Set(),
  });
}

export function updateArrows(enemies, lvl, cam, dt, fx, viewW = 800) {
  for (const a of arrows) {
    if (a.dead) continue;
    a.x += a.vx * dt;
    // Arrows only affect what's on screen: they vanish at the viewport
    // edge (small grace so a shot fired from the screen edge still leaves
    // the bow). No more sniping enemies or boxes across the level.
    if (a.x > cam.x + viewW + 20 || a.x + 14 < cam.x - 20) { a.dead = true; continue; }
    for (const e of enemies) { // hit an enemy
      if (e.dead || (a.hit && a.hit.has(e))) continue; // no double-dips
      if (a.x < e.x + e.w && a.x + 14 > e.x && a.y < e.y + e.h && a.y + 4 > e.y) {
        // weak-point hook (wizardboss stage 1): a body hit sparks off;
        // only the rune takes damage. Stars keep flying (the box rule).
        const k = getKind(e.kind);
        const weak = k.weakPoint ? k.weakPoint(e) : null;
        if (weak && !(a.x < weak.x + weak.w && a.x + 14 > weak.x &&
                      a.y < weak.y + weak.h && a.y + 4 > weak.y)) {
          fx.play('deflect');
          burst(a.x + 7, a.y + 2, FX.mageSpark);
          if (a.star) { a.hit.add(e); } // no re-spark while it passes
          else { a.dead = true; break; }
          continue;
        }
        damageEnemy(e, fx, cam); // hp, per-kind hit reaction, death at 0
        shake(cam, 3, 0.12);
        if (a.star) { // pierce: remember the hit, keep flying on budget
          a.hit.add(e);
          a.pierces -= 1;
          if (a.pierces <= 0) { a.dead = true; break; }
          continue;
        }
        a.dead = true;
        break;
      }
    }
    if (a.dead) continue;
    for (const b of lvl.boxes) { // break a box from range
      if (b.broken) continue;
      if (a.x < b.x + b.w && a.x + 14 > b.x && a.y < b.y + b.h && a.y + 4 > b.y) {
        b.broken = true;
        fx.play('box');
        if (spawnLoot(b) === null) fx.play('fizzle'); // mystery dud: nothing fell
        burst(b.x + b.w / 2, b.y + b.h / 2, FX.boxBreak);
        shake(cam, 4, 0.15);
        if (!a.star) a.dead = true; // stars shatter the box and keep flying
        break;
      }
    }
    if (a.dead) continue;
    for (const b of lvl.bushes ?? []) { // level 5: shoot the bush, the relic is in there
      if (b.state !== 'hiding') continue;
      if (a.x < b.x + b.w && a.x + 14 > b.x && a.y < b.y + b.h && a.y + 4 > b.y) {
        b.state = 'revealed';
        b.rustleT = 0.4;
        const r = (lvl.relics ?? []).find(r => r.id === b.relicId);
        if (r) r.visible = true; // the horseshoe pops out, pickable
        fx.play('rustle');
        burst(b.x + b.w / 2, b.y + b.h / 2, FX.rustle); // leaf-puff
        if (!a.star) a.dead = true; // stars rustle and keep flying (box rule)
        break;
      }
    }
    if (a.dead) continue;
    for (const s of lvl.springs ?? []) { // level 8: one arrow severs a mainspring
      if (s.cut) continue;
      if (a.x < s.x + s.w && a.x + 14 > s.x && a.y < s.y + s.h && a.y + 4 > s.y) {
        cutSpring(lvl, s, fx);
        if (!a.star) a.dead = true; // stars sever and keep flying (the box rule)
        break;
      }
    }
    if (a.dead) continue;
    // The Blackmire's nest web (level 6): an arrow that crosses the
    // webbed nest's rect unravels it - the heron's cog appears and the
    // arrow is spent in the threads. Star arrows pass through: the web
    // parts around them. The window extends 24 px above the rim: a queen
    // standing on the nest fires at chest height, 24 px over the threads.
    const nest = lvl.nest;
    if (nest && nest.state === 'webbed' &&
        a.x < nest.x + nest.w && a.x + 14 > nest.x &&
        a.y < nest.y + nest.h && a.y + 4 > nest.y - 24) {
      nest.state = 'open';
      nest.unravelT = 0.5; // the thread puffs away (decays in updateCogs)
      lvl.cogs[0].visible = true; // the heron's cog appears
      fx.play('puff');
      burst(nest.x + nest.w / 2, nest.y + nest.h / 2, FX.webPuff);
      if (!a.star) a.dead = true;
    }
    if (a.dead) continue;
    // The Peak's ice block (level 7): an arrow crossing it while intact
    // shatters the block and the sigil inside becomes visible. Box rule:
    // a normal arrow is spent, a star shatters it and keeps flying.
    const iceBlock = lvl.sigilBlock;
    if (iceBlock && iceBlock.state === 'intact' &&
        a.x < iceBlock.x + iceBlock.w && a.x + 14 > iceBlock.x &&
        a.y < iceBlock.y + iceBlock.h && a.y + 4 > iceBlock.y) {
      iceBlock.state = 'gone';
      iceBlock.shatterT = 0.4;
      lvl.sigil.visible = true;
      fx.play('crack');
      burst(iceBlock.x + iceBlock.w / 2, iceBlock.y + iceBlock.h / 2, FX.iceShatter);
      if (!a.star) a.dead = true;
    }
    if (a.dead) continue;
    // The mud vent's bubble: shot while up, it pops and the adder's cog
    // floats at the pop point.
    const vent = lvl.vent;
    if (vent && ventBubbleUp(lvl)) {
      const r = ventBubbleRect(lvl);
      if (a.x < r.x + r.w && a.x + 14 > r.x &&
          a.y < r.y + r.h && a.y + 4 > r.y) {
        vent.popped = true;
        lvl.cogs[1].x = vent.x - 8; // float at the pop point
        lvl.cogs[1].y = 490;
        lvl.cogs[1].visible = true;
        fx.play('pop');
        burst(r.x + r.w / 2, r.y + r.h / 2, FX.webPuff);
        a.dead = true; // spent in the burst
      }
    }
    if (a.dead) continue;
    // The egg sac on the altar: an arrow pops it (the stomp route is in
    // cogs.js) and the weaver's cog floats where the sac was.
    const sac = lvl.sac;
    if (sac && sac.present && !sac.popped &&
        a.x < sac.x + sac.w && a.x + 14 > sac.x &&
        a.y < sac.y + sac.h && a.y + 4 > sac.y) {
      popSac(lvl, fx);
      a.dead = true; // spent in the web
    }
    if (a.dead) continue;
    if (lvl.marker && // marker brick: glint on hit, arrow passes through;
        a.x < lvl.marker.x + lvl.marker.w && a.x + 14 > lvl.marker.x &&
        a.y < lvl.marker.y + lvl.marker.h && a.y + 4 > lvl.marker.y) {
      lvl.marker.glintT = MARKER_GLINT;
      const nook = lvl.keyNook; // level 3: the marker is the weak brick
      // the arrow crosses the brick over several frames: one hit per arrow
      if (nook && !nook.revealed && nook.crumbleT <= 0 && !a.markerHit) {
        a.markerHit = true;
        lvl.marker.hits = (lvl.marker.hits ?? 0) + 1;
        fx.play('crack');
        burst(lvl.marker.x + lvl.marker.w / 2, lvl.marker.y + lvl.marker.h / 2, FX.brickChip); // chips off the weak brick
        if (lvl.marker.hits >= MARKER_HITS) nook.crumbleT = CRUMBLE_T;
      }
    }
  }
  for (let i = arrows.length - 1; i >= 0; i--) if (arrows[i].dead) arrows.splice(i, 1);
}
