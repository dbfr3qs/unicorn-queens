// The opening: how the King was taken. Played once, on a fresh start, on
// level 5's forest — the wood the two of them are walking in when the
// sorcerer arrives — with the game's own sprites, and skipped by any key.
//
// The scene is a pure function of its clock, like the level-9 ending: pose(t)
// says where everyone is and what is being said at time t, and the cues are
// one-shots that fire as the clock passes them (a sound, a shake, a burst).
// Nothing here is random, so the intro can be stepped in a test and drawn
// in a snapshot. The game underneath is level 1, already built by startGame:
// the intro only borrows the frame, and lets go of it when it is done.
import { game, startGame } from './game.js';
import { createLevel5 } from './levels/level5.js';
import { LEVELS } from './levels/index.js';
import { setTrack } from './music.js';
import { burst, updateParticles } from './particles.js';
import { shake } from './camera.js';
import { FX } from './effects.js';

export const INTRO_LENGTH = 19; // s, to the cut into level 1
export const CAM_X = 653; // the left edge of the wood in frame, held still: 920 ± 267 at the render's zoom
const GY = 560; // groundY at the 600 px view the game runs at

// The captions, in the order they are said. Each stays up until the next
// one, or until `until`.
export const LINES = [
  { at: 0.8, until: 2.6, speaker: 'The Unicorn King', text: 'A fine morning for the wood, my queen.' },
  { at: 2.6, until: 4.6, speaker: 'Unicorn Queen', text: 'The realm is quiet. I could get used to quiet.' },
  { at: 5.4, until: 7.6, speaker: 'The Sorcerer', text: 'Quiet? The realm is mine now, little queen — every hall, every hearth, every throne.' },
  { at: 7.6, until: 9.0, speaker: 'The Unicorn King', text: 'You will answer for that, sorcerer.' },
  { at: 11.2, until: 13.2, speaker: 'The Sorcerer', text: 'Come and fetch him, then — if you can climb that high.' },
  { at: 13.4, until: 15.4, speaker: 'Unicorn Queen', text: 'Hold on, my love. I am coming.' },
];

// The one-shots. `fx` is the sound spy in tests and the real mixer in play.
export const CUES = [
  { at: 4.4, sfx: 'cast' }, // the sorcerer arrives
  { at: 4.9, shake: [3, 0.2] },
  { at: 9.35, sfx: 'deflect', burst: [1040, GY - 40, 'mageSpark'] }, // the King's charge meets his ward
  { at: 9.6, sfx: 'thud', shake: [4, 0.25] }, // and is thrown back
  { at: 10.4, sfx: 'boss' }, // the grab
  { at: 10.4, burst: [1010, GY - 50, 'cast'] },
  { at: 15.2, sfx: 'seal' }, // the cut
];

const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
const ramp = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const ease = k => k * k * (3 - 2 * k);

// Where everyone is at time t. Positions are world x and the y of the feet.
export function pose(t) {
  const walk = ramp(t, 0, 4.4); // the stroll, until the sky darkens
  const queen = { x: lerp(760, 900, walk), y: GY, face: 1, bob: walk < 1 ? Math.sin(t * 8) * 2 : 0, visible: true };
  const king = { x: lerp(830, 970, walk), y: GY, face: 1, bob: walk < 1 ? Math.sin(t * 8 + 1) * 2 : 0, visible: true };
  const wizard = { x: 1080, y: GY - 120, face: -1, visible: t >= 4.4, glow: 0 };

  if (t >= 4.4) { // the sorcerer sweeps in from the high east and settles
    const k = ease(ramp(t, 4.4, 5.0));
    wizard.x = lerp(1500, 1080, k);
    wizard.y = lerp(120, GY - 120, k);
    wizard.glow = 0.5 + 0.5 * Math.sin(t * 6);
  }
  if (t >= 9.0) { // the scuffle: the King charges, meets the ward, is thrown back
    if (t < 9.35) king.x = lerp(970, 1040, ramp(t, 9.0, 9.35));
    else if (t < 9.9) { king.x = lerp(1040, 985, ease(ramp(t, 9.35, 9.9))); king.y = GY - 40 * Math.sin(Math.PI * ramp(t, 9.35, 9.9)); }
    else king.x = 985;
    king.bob = 0;
  }
  if (t >= 10.4) { // the grab: the sorcerer drops onto him and both go up and away
    const down = ease(ramp(t, 10.4, 10.9));
    const up = ease(ramp(t, 10.9, 13.4));
    wizard.x = lerp(1080, 1010, down);
    wizard.y = lerp(GY - 120, GY - 70, down);
    if (t >= 10.9) {
      king.x = wizard.x = lerp(1010, 1420, up);
      king.y = wizard.y = lerp(GY, -120, up);
      wizard.y -= 46; // he rides above the one he is carrying
      king.face = -1; // hauled backwards
      king.visible = wizard.visible = up < 1;
    }
  }
  if (t >= 10.9) { // the Queen runs after them, and can only stop
    const run = ease(ramp(t, 10.9, 12.0));
    queen.x = lerp(900, 985, run);
    queen.bob = run < 1 ? Math.sin(t * 14) * 3 : 0;
  }
  return {
    queen, king, wizard,
    caption: LINES.find(l => t >= l.at && t < l.until) ?? null,
    fadeIn: 1 - ramp(t, 0, 1.0), // black over the scene, lifting
    fadeOut: ramp(t, 15.2, 16.4), // black over the scene, falling
    card: ramp(t, 16.4, 17.2) * (1 - ramp(t, 18.4, INTRO_LENGTH)), // the title, in and out again
    dark: t >= 4.4 ? Math.min(0.35, ramp(t, 4.4, 5.4) * 0.35) : 0, // the wood dims when he comes
  };
}

// Level 5's world is the backdrop, built once per intro so its dressing
// (the seeded trees, the flowers) is exactly the level's. Camera held.
export function startIntro(viewH) {
  startGame(viewH, 0); // level 1 waits underneath, untouched, for the cut
  game.intro = {
    t: 0, cue: 0,
    level: createLevel5(viewH),
    camera: { x: CAM_X, shake: 0, mag: 0 },
  };
  setTrack(LEVELS[4].name); // the forest's music, for the forest
}

export function endIntro() {
  if (!game.intro) return;
  game.intro = null;
  setTrack(LEVELS[game.levelIndex].name); // back to level 1's, which startGame had cued
  // The key that skipped it must not also be a jump: the same rule as the
  // restart key (main.js). A held key releases and presses again to jump.
  game.player.jumpHeld = true;
}

export function updateIntro(dt, fx) {
  const it = game.intro;
  if (!it) return;
  it.t += dt;
  for (; it.cue < CUES.length && CUES[it.cue].at <= it.t; it.cue++) {
    const c = CUES[it.cue];
    if (c.sfx) fx.play(c.sfx);
    if (c.shake) shake(it.camera, c.shake[0], c.shake[1]);
    if (c.burst) burst(c.burst[0], c.burst[1], FX[c.burst[2]]);
  }
  updateParticles(dt);
  if (it.camera.shake > 0) {
    it.camera.shake = Math.max(0, it.camera.shake - dt);
    if (it.camera.shake === 0) it.camera.mag = 0;
  }
  if (it.t >= INTRO_LENGTH) endIntro();
}
