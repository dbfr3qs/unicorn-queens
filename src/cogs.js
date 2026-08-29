// The three cogs of the Blackmire (level 6): pickup logic only. Picking
// one up sets lvl.cogs[i].taken (+50 score, the relic chime, sparkle).
// The sequential chain is enforced by the hiding spots (M3): a cog's
// `visible` can only be set through its own reveal, and reveals 2 and 3
// need sockets 0 and 1. Installing a cog into a socket happens in the
// winch beats' onOpens (level data); this module also decays the nest's
// unravelT (M3's thread-puff).
import { burst } from './particles.js';
import { FX } from './effects.js';
import { addScore } from './loot.js';
import { P_BOUNCE_V } from './player.js';

// The dialogue `when`s: how many sockets are filled.
export function cogsSet(lvl) {
  return (lvl.winch?.sockets ?? []).filter(Boolean).length;
}

// Pop the egg sac: the weaver's cog floats where the sac was, the
// thread puffs. Called from both pop routes (arrow, cogs.js stomp).
export function popSac(lvl, fx) {
  const sac = lvl.sac;
  if (!sac || sac.popped) return;
  sac.popped = true;
  lvl.cogs[2].visible = true; // the weaver's cog floats at the pop point
  fx.play('pop');
  burst(sac.x + sac.w / 2, sac.y + sac.h / 2, FX.webPuff);
}

export function updateCogs(lvl, p, dt, fx) {
  if (!lvl.cogs) return;
  const nest = lvl.nest;
  if (nest && nest.unravelT > 0) nest.unravelT = Math.max(0, nest.unravelT - dt);
  // The egg sac: a real drop (vy > 50) on it pops it. Walking or
  // standing on the dais can overlap the sac without popping it.
  const sac = lvl.sac;
  if (sac && sac.present && !sac.popped && !p.dead &&
      p.x < sac.x + sac.w && p.x + p.w > sac.x &&
      p.y < sac.y + sac.h && p.y + p.h > sac.y &&
      p.vy > 50) {
    popSac(lvl, fx);
    p.vy = P_BOUNCE_V; // hop off the sac
  }
  for (const c of lvl.cogs) {
    if (c.taken || !c.visible) continue;
    if (!p.dead &&
        p.x < c.x + c.w && p.x + p.w > c.x &&
        p.y < c.y + c.h && p.y + p.h > c.y) {
      c.taken = true;
      addScore(50);
      fx.play('relic');
      burst(c.x + c.w / 2, c.y + c.h / 2, FX.relic);
    }
  }
}
