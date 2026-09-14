// The Unicorn King walks the last level with you (level 9).
//
// He is level-owned, not an enemy: no collision, no damage, no input, no
// roster entry — the level-7 pig's pattern. He is the horn the ending needs
// in the room where it is needed, and until then he is company: the only warm
// light in a frozen palace, always a little ahead, always waiting at a seal
// you have not opened yet.
//
// His walk is monotonic east. Backtrack and he does not follow you back — he
// stops where he is and waits, which reads as patience rather than as a
// tether, and keeps the whole thing to about ten lines of state.
import { fireKingArrow } from './arrows.js';

export const KING_SPEED = 200, KING_LEAD = 100, KING_STAND_X = 5300,
  KING_SEAL_GAP = 50, KING_PAUSE = 0.5;

// His bow. He is company, not a turret: one arrow every KING_FIRE_CD at the
// nearest thing ahead of him within KING_RANGE — never behind him (he faces
// east and does not turn), never the Queen (her fight is the player's), and
// never once he has taken his place inside the throne door.
export const KING_RANGE = 340, KING_FIRE_CD = 2.4, KING_FIRE_SETTLE = 1.2;

// The first live enemy east of him and inside range, nearest first.
function kingTarget(k, enemies) {
  let best = null, bestD = Infinity;
  for (const e of enemies ?? []) {
    if (e.dead || e.sleeping || e.kind === 'queenboss') continue;
    const d = e.x - (k.x + k.w);
    if (d < 0 || d > KING_RANGE) continue;
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

// A shot if one is due and there is something to shoot. Runs before the walk
// so a target that steps into range is answered the frame it does; the
// cooldown starts at KING_FIRE_SETTLE so he does not open the level firing.
function kingShoot(k, enemies, dt, fx) {
  k.fireCd = Math.max(0, (k.fireCd ?? KING_FIRE_SETTLE) - dt);
  if (k.fireCd > 0) return;
  const e = kingTarget(k, enemies);
  if (!e) return;
  fireKingArrow(k, e.y + e.h / 2);
  fx?.play?.('fire');
  k.fireCd = KING_FIRE_CD;
}

// The seal he cannot pass: the first one still in the player's way.
function blockingSeal(lvl) {
  for (const d of lvl.doors ?? []) {
    if (d.kind === 'frostseal' && d.state !== 'open') return d;
  }
  return null;
}

export function updateKing(lvl, p, dt, fx, enemies) {
  const k = lvl.king;
  if (!k || lvl.ending9?.started) return; // the ending drives him instead (M7)
  k.t += dt;
  if (k.state === 'stand') return; // terminal until the ending
  kingShoot(k, enemies, dt, fx);
  // Never past the player's shoulder, never past a seal that is still shut,
  // never past the throne door. Whichever of those is nearest is where he is
  // going; if it is behind him he simply stops, because he does not go back.
  const seal = blockingSeal(lvl);
  const sealStop = seal ? seal.x - KING_SEAL_GAP : Infinity;
  const target = Math.min(p.x + KING_LEAD, sealStop, KING_STAND_X);
  if (k.state === 'wait') {
    if (k.x >= sealStop - 0.5) return; // the door he is waiting on is still shut
    k.pauseT = (k.pauseT ?? KING_PAUSE) - dt; // a beat to take the open way in
    if (k.pauseT > 0) return;
    k.pauseT = undefined;
    k.state = 'walk';
    return;
  }
  if (target <= k.x) return; // the player is behind him: he waits where he is
  k.x = Math.min(target, k.x + KING_SPEED * dt);
  if (k.x >= KING_STAND_X - 0.5) { // inside the throne room, facing her
    k.x = KING_STAND_X;
    k.state = 'stand';
    fx?.play?.('land');
  } else if (k.x >= sealStop - 0.5) {
    k.state = 'wait';
  }
}
