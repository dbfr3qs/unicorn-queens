// Player: state and physics (jump buffering, coyote time, squash & stretch).
import { resolveGroundCollision } from './level.js';
import { burst } from './particles.js';
import { shake } from './camera.js';
import { spawnLoot } from './loot.js';
import { fireArrow, fireStarArrow, FIRE_CD } from './arrows.js';
import { FX } from './effects.js';

export const P_SPEED = 260, P_GRAVITY = 1200, P_JUMP_V = -560, P_BOUNCE_V = -320, P_TERM_VY = 800;
export const HOP_V = P_JUMP_V * 0.85; // levitation hop: shorter than a ground jump
export const BOOTS_TIME = 10, BOOT_JUMP_MULT = 1.6; // bounce boots: 10 s, 1.6× jump
export const MAGNET_TIME = 8; // magnet: 8 s of gem attraction
export const HURT_INVULN = 1.5; // invulnerability window after any hit
export const P_W = 28, P_H = 36, BIG_W = 40, BIG_H = 50, BIG_JUMP_V = P_JUMP_V * 1.35;
export const COYOTE = 0.08, JBUF = 0.12, JUMP_CUT = -180;

// carry: permanent acquisitions from the previous level (big, bow),
// passed when advancing; a fresh start or death-restart carries nothing.
export function createPlayer(lvl, carry = {}) {
  const big = !!carry.big;
  const w = big ? BIG_W : P_W, h = big ? BIG_H : P_H;
  return {
    x: 60, y: lvl.groundY - h, w, h,
    safeX: 60, safeY: lvl.groundY - h, // respawn point: last spot stood on
    vx: 0, vy: 0,
    onGround: false,
    facing: 1,
    solidToBoxes: true,
    hp: 3,
    invuln: 0,
    dead: false,
    sx: 1, sy: 1, // squash & stretch
    coyote: 0, jbuf: 0, jumpHeld: false, cuttable: false,
    hasBow: !!lvl.startItems?.includes('bow') || !!carry.hasBow, fireCd: 0, // level 2 starts with the bow
    big,
    maxHp: carry.maxHp ?? 3, // heart cap: permanent for the run
    boots: 0, // bounce boots timer (s); never carried across levels
    magnet: 0, // gem attraction timer (s); never carried across levels
    stars: 0, // star arrows in reserve; never carried across levels
    hops: 0, // levitation air-jumps left; never carried across levels
    hopFx: 0, // wing shimmer timer (s); visual only
    shield: 0, // mirror shield: fireball reflects left; never carried
    won: false,
  };
}

// Shared one-hit damage: knockback, invulnerability, death check.
// Returns true if the hit landed (false while dead or invulnerable).
export function hurtPlayer(p, cam, fx) {
  if (p.dead || p.invuln > 0) return false;
  p.hp -= 1;
  p.invuln = HURT_INVULN;
  p.vy = -250;
  p.cuttable = false;
  fx.play('hurt');
  burst(p.x + p.w / 2, p.y + p.h / 2, FX.hurt);
  shake(cam, 8, 0.3);
  if (p.hp <= 0) { p.dead = true; fx.play('die'); }
  return true;
}

export function updatePlayer(player, inp, lvl, cam, dt, fx) {
  if (player.dead || player.won) return;
  player.invuln = Math.max(0, player.invuln - dt);
  player.coyote = player.onGround ? COYOTE : Math.max(0, player.coyote - dt);
  if (inp.jump && !player.jumpHeld) player.jbuf = JBUF; // buffer the press
  player.jumpHeld = inp.jump;
  player.jbuf = Math.max(0, player.jbuf - dt);
  player.vx = (inp.right ? P_SPEED : 0) - (inp.left ? P_SPEED : 0);
  if (player.vx !== 0) player.facing = Math.sign(player.vx);
  player.fireCd = Math.max(0, player.fireCd - dt);
  player.boots = Math.max(0, player.boots - dt);
  player.magnet = Math.max(0, player.magnet - dt);
  player.hopFx = Math.max(0, player.hopFx - dt);
  if (inp.fire && player.hasBow && player.fireCd <= 0) { // unlimited arrows
    if (player.stars > 0) { player.stars--; fireStarArrow(player); } // stars first
    else fireArrow(player);
    player.fireCd = FIRE_CD;
    fx.play('fire');
  }
  if (player.jbuf > 0 && player.coyote > 0) {
    const base = player.big ? BIG_JUMP_V : P_JUMP_V;
    player.vy = player.boots > 0 ? base * BOOT_JUMP_MULT : base; // bounce boots
    player.jbuf = 0; player.coyote = 0; player.cuttable = true;
    player.sy = 1.25; player.sx = 0.8; // stretch upward
    if (player.boots > 0) burst(player.x + player.w / 2, player.y + player.h, FX.boots); // sparkle
    fx.play('jump');
  } else if (player.jbuf > 0 && player.hops > 0) {
    // levitation hop: a press that can't start a ground/coyote jump
    player.hops -= 1;
    player.vy = HOP_V;
    player.jbuf = 0; player.cuttable = true;
    player.sy = 1.25; player.sx = 0.8; // stretch upward
    player.hopFx = 0.35;
    burst(player.x + player.w / 2, player.y + player.h, FX.hopPuff); // cloud puff
    fx.play('hop');
  }
  if (!inp.jump && player.cuttable && player.vy < JUMP_CUT) player.vy = JUMP_CUT; // variable height
  const prevVy = player.vy;
  player.vy = Math.min(player.vy + P_GRAVITY * dt, P_TERM_VY);
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = Math.max(0, Math.min(player.x, lvl.width - player.w));
  const surface = resolveGroundCollision(player, lvl, dt);
  if (player.onGround) { player.safeX = player.x; player.safeY = player.y; } // respawn point
  if (player.onGround && prevVy > 350) { // hard landing: squash + dust
    player.sy = 0.7; player.sx = 1.3;
    burst(player.x + player.w / 2, player.y + player.h, FX.landing);
    fx.play('land');
  }
  if (surface && surface.kind === 'box') {
    surface.broken = true;
    player.vy = P_BOUNCE_V; // hop off the broken box
    player.cuttable = false;
    spawnLoot(surface);
    fx.play('box');
    burst(surface.x + surface.w / 2, surface.y + surface.h / 2, FX.boxBreak);
    shake(cam, 4, 0.15);
  }
  player.sx += (1 - player.sx) * Math.min(1, dt * 14); // ease back to rest
  player.sy += (1 - player.sy) * Math.min(1, dt * 14);
  if (player.y > lvl.height) { // fell in a pit: 1 damage, respawn at last safe spot
    player.hp -= 1;
    player.cuttable = false;
    if (player.hp <= 0) { player.dead = true; shake(cam, 10, 0.4); fx.play('die'); }
    else {
      fx.play('hurt');
      player.invuln = HURT_INVULN;
      player.x = player.safeX;
      player.y = player.safeY;
      player.vx = 0;
      player.vy = 0;
    }
  }
}
