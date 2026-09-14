// The ending (level 9, and the game).
//
// It begins the moment the Frost Queen's light starts to rise — not when the
// last arrow lands — so the horn and the beam play over the last of her.
// Input is locked for the whole thing; the scene keeps rendering and moving,
// and only Space is live, at the card.
//
// One clock (`t`) and one phase name. Everything the ending draws is a pure
// read of those two, so the beam's position, the level's healing and the
// card's fade are all functions of time and never of their own state.
import { openDialogue, isDialogueOpen } from './dialogue.js';

export const HORN_WALK = 1.0, HORN_HOP = 0.4, HORN_RAISE = 0.8;
export const HORN_END = HORN_WALK + HORN_HOP + HORN_RAISE; // 2.2
export const BEAM_TIME = 3.0, THAW_STAGE = 4.0, CARD_FADE = 1.5;
export const KING_END_X = 5580, KING_DAIS_Y = 520;
export const FIGURE_FADE = 2.0;

// How far the beam has swept, in world x. Before the beam it is behind the
// level; after it, past the end — so "has the beam reached x" is one compare
// everywhere.
export function beamX(e) {
  if (!e || e.t < HORN_END) return -1;
  return ((e.t - HORN_END) / BEAM_TIME) * 6000;
}

export function makeEnding9() {
  return { started: false, t: 0, phase: 'horn', card: false, cardT: 0 };
}

export function updateEnding(game, dt, fx) {
  const lvl = game.level, e = lvl.ending9;
  if (!e || !e.started) return;
  if (isDialogueOpen()) return; // the house freeze: the scene waits, the box talks
  e.t += dt;

  if (e.phase === 'horn') {
    moveKing(lvl, e);
    if (e.t >= HORN_END) { e.phase = 'beam'; fx.play('sunbeam'); }
    return;
  }

  advanceHealing(lvl, e, dt); // the dissolves outlive the sweep that started them

  if (e.phase === 'beam') {
    lvl.king.state = 'beam';
    healLevel(lvl, e, fx);
    // The beats wait for the level to actually finish healing, not for a
    // fixed count: a two-second dissolve started by the tail of a
    // three-second sweep ends after any number picked in advance, and the
    // Queen's last words must not open over a hall that is still emptying.
    if (e.t >= HORN_END + THAW_STAGE && stagingDone(lvl, e)) {
      e.phase = 'queenBeat';
      openDialogue([
        { speaker: 'The Frost Queen', text: 'The plague was a century gone. I froze the world to stop a ghost.' },
        { speaker: 'The Frost Queen', text: 'It is warm again, little queen. Let it stay warm.' },
      ]);
      fx.play('dialog');
    }
    return;
  }

  if (e.phase === 'queenBeat') { // the box has just closed
    e.phase = 'kingBeat';
    openDialogue([
      { speaker: 'The Unicorn King', text: 'The realm thaws. The winter is done.' },
      { speaker: 'The Unicorn King', text: 'Walk home, little queen. The realm is yours to keep — warm.' },
    ]);
    fx.play('dialog');
    return;
  }

  if (e.phase === 'kingBeat') { e.phase = 'card'; e.card = true; e.cardT = 0; return; }

  if (e.phase === 'card') e.cardT = Math.min(CARD_FADE, e.cardT + dt);
}

// He walks the last 280 px, hops the dais rim, and raises the horn. No sound
// of his own: the horn IS the beam's sound, and it comes a beat later.
function moveKing(lvl, e) {
  const k = lvl.king;
  if (e.t < HORN_WALK) {
    k.state = 'walk';
    k.x = 5300 + (KING_END_X - 5300) * (e.t / HORN_WALK);
  } else if (e.t < HORN_WALK + HORN_HOP) {
    const h = (e.t - HORN_WALK) / HORN_HOP;
    k.state = 'walk';
    k.x = KING_END_X;
    // a small arc up onto the dais, landing on its top
    k.y = lvl.groundY - (lvl.groundY - KING_DAIS_Y) * h - Math.sin(h * Math.PI) * 14;
  } else {
    k.state = 'raise';
    k.x = KING_END_X;
    k.y = KING_DAIS_Y;
  }
}

// The level heals behind the beam. Every one of these is idempotent and keyed
// to the beam's x, so a frame that runs twice changes nothing and a frame
// that is skipped is caught by the next one.
function healLevel(lvl, e, fx) {
  const bx = beamX(e);
  for (const f of lvl.hallFountains ?? []) {
    if (f.state === 'frozen' && bx >= f.x) { f.state = 'flowing'; f.t = 0; fx.play('splash'); }
  }
  if (!e.wave && bx >= 2500) { e.wave = true; fx.play('splash'); fx.play('rumble'); }
  // The five people go one after another because the beam reaches them one
  // after another — they stand 150 to 450 px apart, which at the sweep's
  // speed is the stagger. No extra offset: the level already spaced them.
  for (const f of lvl.hallFigures ?? []) {
    if (f.state === 'dissolving' || f.state === 'gone') continue;
    if (bx < f.x) continue;
    f.state = 'dissolving';
    f.t = 0;
    fx.play('grant');
  }
  if (!e.robin && bx >= 5200) e.robin = { t: 0 }; // the first warm colour is a bird
  lvl.frostPatches = []; // her weather goes with her
}

// Has the level finished healing? Everything the beam started has to have
// finished before the last words are said over it.
function stagingDone(lvl, e) {
  if ((lvl.hallFigures ?? []).some(f => f.state !== 'gone')) return false;
  if ((lvl.hallFountains ?? []).some(f => f.state === 'frozen')) return false;
  return !!e.robin && e.robin.t >= 1.5; // and the bird is on the rim
}

// A two-second dissolve started by a three-second sweep outlives it, so the
// clocks the beam starts are advanced from the ending's own clock rather than
// from the phase that lit them.
function advanceHealing(lvl, e, dt) {
  for (const f of lvl.hallFigures ?? []) {
    if (f.state !== 'dissolving') continue;
    f.t += dt;
    if (f.t >= FIGURE_FADE) f.state = 'gone';
  }
  for (const f of lvl.hallFountains ?? []) if (f.state === 'flowing') f.t += dt;
  if (e.robin) e.robin.t += dt;
}

// Space at the card: a true new game — level 1, no carry, nothing kept.
export function cardReady(lvl) {
  return !!lvl?.ending9?.card && lvl.ending9.cardT >= CARD_FADE;
}
