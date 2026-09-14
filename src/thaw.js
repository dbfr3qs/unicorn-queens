// Level 9's thaw: the state machine behind the whole level.
//
// Three sun seeds, three hearths, three frost seals. Planting a seed in its
// hearth lights a ring of fire, and every one of the level's readouts is a
// pure function of the same two numbers — `thaws` (how many are lit) and `t`
// (how long the level has been thawing):
//
//   the sky      steps one palette toward dawn, lerped over SKY_LERP
//   the hall     loses a quarter of its frost film
//   the drone    rises a semitone-ish (humPitch)
//   the floor    melts in a RING_RADIUS circle: ice -> thaw (M4 makes it grip)
//   the seal     cracks, melts, and opens — the way east
//
// One honest accumulator, advanced only here; everything that draws reads it.
// The dialogue freeze stops `t` for free, so the world stays frozen while a
// beat is open — which is exactly right for this level.
import { burst } from './particles.js';
import { FX } from './effects.js';

export const RING_RADIUS = 140, RING_MELT = 1.5, SKY_LERP = 1.5,
  IGNITE_FLAME = 0.8,
  HUM_PERIOD = 2.0, CREAK_PERIOD = 7.0,
  DOOR_CRACK = 0.5, DOOR_MELT = 1.2,
  PATCH_LIFE = 6.0, PATCH_FADE = 1.0,
  POP_LATCH = 0.5,
  BRAZIERS = [950, 2600, 4400];

// The hearth's footprint on the floor: standing in it plants the seed. 48x56
// on the ground line, matching the world pass's frame.
export const brazierRect = (k, groundY = 560) => ({ x: BRAZIERS[k], y: groundY - 56, w: 48, h: 56 });

// The drone: 55 Hz times 1.06 per thaw, hearths and boss wounds alike, so the
// level's pitch rises the whole way through and never resets.
export const humPitch = lvl => Math.pow(1.06, lvl.thaw.thaws + lvl.thaw.bossThaws);

// The strict "plant me here" cue: hearth k glows warm only when it is the
// FIRST unlit hearth and the player is actually carrying its seed. Anything
// looser and three braziers glint at once and the cue means nothing.
export function brazierGlints(lvl, k) {
  const th = lvl.thaw;
  if (th.rings[k].lit) return false;
  for (let i = 0; i < k; i++) if (!th.rings[i].lit) return false;
  return (lvl.relics ?? []).some(r => r.id === 'seed' + (k + 1) && r.taken && !r.planted);
}

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function updateThaw(lvl, p, dt, fx) {
  const th = lvl.thaw;
  if (lvl.ending9?.started) return; // M7: the ending owns the world's clock
  th.t += dt;
  // the sky chases the thaw count rather than snapping to it: the ring is
  // still melting while the sky is still moving, so one ignition reads as one
  // continuous event instead of three simultaneous state changes
  th.skyT += clamp(th.thaws - th.skyT, -dt / SKY_LERP, dt / SKY_LERP);
  if (th.t - th.lastHum >= HUM_PERIOD) { th.lastHum = th.t; fx.play('hum', humPitch(lvl)); }
  if (th.t - th.lastCreak >= CREAK_PERIOD && th.thaws < 3) { th.lastCreak = th.t; fx.play('creak'); }
  for (const r of th.rings) {
    if (!r.lit) continue;
    r.igniteT = Math.min(1, r.igniteT + dt / IGNITE_FLAME); // the flame rises
    r.t = Math.min(1, r.t + dt / RING_MELT); // the floor under it melts
  }
  if (lvl.fountain?.shattered) lvl.fountain.t += dt; // the halves falling away
  advanceMercy(lvl, dt, fx);
  for (const pc of lvl.frostPatches) pc.t += dt; // M3 creates them
  if (lvl.frostPatches.length) {
    lvl.frostPatches = lvl.frostPatches.filter(pc => pc.t < PATCH_LIFE);
  }
  if (th.popT > 0) th.popT = Math.max(0, th.popT - dt);
  if (p.dead) return;
  for (let k = 0; k < 3; k++) { // planting: standing on the hearth is the key turn
    if (th.rings[k].lit) continue;
    if (!overlaps(p, brazierRect(k, lvl.groundY))) continue;
    const seed = (lvl.relics ?? []).find(r => r.id === 'seed' + (k + 1) && r.taken && !r.planted);
    if (seed) { igniteBrazier(lvl, k, fx); continue; }
    // carrying seeds, but not this one: a soft pop, latched so standing there
    // does not machine-gun it
    if ((lvl.relics ?? []).some(r => r.taken && !r.planted) && th.popT <= 0) {
      th.popT = POP_LATCH;
      fx.play('pop');
    }
  }
}

export function igniteBrazier(lvl, k, fx) {
  const th = lvl.thaw;
  const seed = lvl.relics.find(r => r.id === 'seed' + (k + 1));
  if (seed) seed.planted = true;
  const ring = th.rings[k];
  ring.lit = true;
  ring.igniteT = 0;
  ring.t = 0;
  th.thaws += 1;
  const door = lvl.doors[k];
  if (door) { door.state = 'cracking'; door.openT = 0; }
  fx.play('crack'); // the ice flame breaks
  fx.play('fire'); // and a real one comes up through it
  fx.play('fire');
  burst(BRAZIERS[k] + 24, lvl.groundY - 30, FX.iceShard);
  releaseCreature(lvl, k, fx);
}

// A frost patch: new ice the boss made, laid over whatever is underneath.
// Patches never stack — a second one within 40 px of an existing centre just
// refreshes its clock, so a golem cannot carpet the floor.
export function frostPatch(lvl, x, w) {
  if (!lvl.frostPatches) return;
  const cx = x + w / 2;
  const hit = lvl.frostPatches.find(pc => Math.abs(pc.x + pc.w / 2 - cx) < 40);
  if (hit) { hit.t = 0; return; }
  lvl.frostPatches.push({ x, w, t: 0 });
}

// ---------------------------------------------------------------------------
// The mercy beats.
//
// Each hearth frees something the winter caught, and none of them is a reward
// you can spend: a hare runs home, a wraith goes out like a held breath, a
// frozen scholar drips for a second and stays frozen. They are the level
// telling you what the fires are for, in the only language a frozen world
// has. No collision, no damage, no score — decoration that moves.
export const HARE_CRACK = 0.5, HARE_SHAKE = 0.5, HARE_RUN = 50, HARE_HOME = 1600,
  WRAITH_FADE = 1.0, DRIP_TIME = 1.0,
  ROBIN_WAIT = 0.5, ROBIN_THAW = 0.5, ROBIN_FLY = 1.5;

export function releaseCreature(lvl, k, fx) {
  if (k === 0 && lvl.frozenHare?.state === 'frozen') {
    lvl.frozenHare.state = 'releasing';
    lvl.frozenHare.t = 0;
  } else if (k === 1 && lvl.frozenWraith?.state === 'frozen') {
    lvl.frozenWraith.state = 'releasing';
    lvl.frozenWraith.t = 0;
  } else if (k === 2) {
    // hearth C frees nothing: the hall's people are the Queen's to release,
    // and the scholar's one second of dripping is the promise of it
    const scholar = (lvl.hallFigures ?? []).find(f => f.kind === 'scholar');
    if (scholar && scholar.state === 'frozen') { scholar.state = 'drip'; scholar.t = 0; }
    fx.play('melt', 0.5);
  }
}

// Every beat is a clock and a state, advanced here and drawn from `t` — the
// same shape as the hearth rings, so nothing in the world pass has to know
// what time it is.
function advanceMercy(lvl, dt, fx) {
  const hare = lvl.frozenHare;
  if (hare && hare.state !== 'frozen' && hare.state !== 'gone') {
    hare.t += dt;
    if (hare.state === 'releasing') {
      if (!hare.cracked && hare.t >= 0.3) { hare.cracked = true; fx.play('crack'); burst(hare.x + 28, hare.y + 28, FX.iceShard); }
      if (hare.t >= HARE_CRACK + HARE_SHAKE) { hare.state = 'running'; hare.t = 0; }
    } else if (hare.state === 'running') {
      hare.x += HARE_RUN * dt;
      if (hare.x > HARE_HOME) { hare.state = 'fading'; hare.t = 0; }
    } else if (hare.state === 'fading' && hare.t >= 0.3) {
      hare.state = 'gone';
    }
  }
  const wr = lvl.frozenWraith;
  if (wr && wr.state !== 'frozen' && wr.state !== 'gone') {
    wr.t += dt;
    if (wr.state === 'releasing') { // it does not run: it simply stops being held
      fx.play('grant');
      burst(wr.x + 28, wr.y + 28, FX.relic);
      wr.state = 'fading';
      wr.t = 0;
    } else if (wr.t >= WRAITH_FADE) {
      wr.state = 'gone';
    }
  }
  const bird = lvl.frozenBird;
  if (bird && bird.state !== 'frozen' && bird.state !== 'gone') {
    bird.t += dt;
    // the arrow's own mercy: nobody lit a fire for the robin
    if (bird.state === 'shattered' && bird.t >= ROBIN_WAIT) { bird.state = 'thawing'; bird.t = 0; }
    else if (bird.state === 'thawing' && bird.t >= ROBIN_THAW) { bird.state = 'flying'; bird.t = 0; }
    else if (bird.state === 'flying' && bird.t >= ROBIN_FLY) { bird.state = 'gone'; }
  }
  for (const f of lvl.hallFigures ?? []) { // the 1 s pre-taste, then frozen again
    if (f.state !== 'drip') continue;
    f.t += dt;
    if (f.t >= DRIP_TIME) { f.state = 'frozen'; f.t = 0; }
  }
}
