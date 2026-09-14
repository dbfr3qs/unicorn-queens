// Level 9 — "The Frozen Throne": the glacier the Sky Citadel's shaft dropped
// the player onto, and the ice palace at the end of it. Three sun seeds wake
// three hearths (M2); each hearth thaws a ring of floor, steps the sky toward
// dawn, and melts one frost seal. The thaw releases what the winter caught —
// a hare, a wraith, a robin (M3) — and the King walks east with the player
// (M3) to the throne, where the Frost Queen has held the winter for a century
// (M4–M6). Her release ends the game (M7): no goal line, no exit rect, only
// the ending state.
//
// All thaw / seal / mercy / ending state lives in this data; the M2–M7
// subsystems read and mutate it.
import { makeEnding9 } from '../ending9.js';

export function createLevel9(viewH = 600) {
  const groundY = viewH - 40;
  return {
    width: 6000,
    height: viewH,
    groundY,
    // no startItems: bow + flight are carried (LEVELS[8].carry for a fresh
    // ?level=9 boot)
    //
    // Zone kinds are prefixed `frost` where the obvious name is taken: level 7
    // already owns `throne` (drawPeakZone) and level 2 owns `hall` (drawStone),
    // and the zone dispatch is a flat kind match with no level context.
    zones: [
      { x0: 0, x1: 1600, kind: 'glacier' },
      { x0: 1600, x1: 3800, kind: 'palace' },
      { x0: 3800, x1: 5200, kind: 'frosthall' },
      { x0: 5200, x1: 6000, kind: 'frostthrone' },
    ],
    lava: [ // pits (falling in = 1 damage + respawn, the house pit rule)
      { x: 1400, w: 150, crevasse: true }, // crevasse 1 (plain-jumpable)
      { x: 3200, w: 250, crevasse: true }, // the frostfall gap (slide / bridges / flight)
    ],
    ground: [
      { x: 0, w: 1400, kind: 'ice', y: groundY }, // the glacier rim
      { x: 1550, w: 1650, kind: 'ice', y: groundY }, // the courtyard + the wave
      { x: 3450, w: 350, kind: 'ice', y: groundY }, // the antechamber run-out
      { x: 3800, w: 1400, kind: 'stone', y: groundY }, // the hall (its frost film is the zone pass)
      // the arena is ice except for the King's pad: the only footing in the
      // room that does not slide, and it is where he is standing
      { x: 5200, w: 75, kind: 'ice', y: groundY },
      { x: 5275, w: 65, kind: 'stone', y: groundY }, // the King's pad
      { x: 5340, w: 660, kind: 'ice', y: groundY }, // the arena floor
    ],
    platforms: [
      { x: 620, y: groundY - 24, w: 120, kind: 'dais' }, // the fountain pedestal
      { x: 2250, y: groundY - 50, w: 80, kind: 'ice' }, // wave shelf 1
      { x: 2330, y: groundY - 105, w: 80, kind: 'ice' }, // wave shelf 2
      { x: 2420, y: groundY - 160, w: 70, kind: 'ice' }, // the crest ledge, seed 2's seat
      { x: 3240, y: groundY - 6, w: 40, kind: 'ice' }, // frostfall bridge 1
      { x: 3380, y: groundY - 6, w: 40, kind: 'ice' }, // frostfall bridge 2
      { x: 4230, y: groundY - 124, w: 60, kind: 'ice' }, // the bird's shelf
      { x: 5620, y: groundY - 40, w: 160, kind: 'dais' }, // the throne dais
    ],
    boxes: [
      { x: 300, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'bow' }, // safety bow
      { x: 800, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'gem' },
      { x: 1200, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'boots' }, // the grip teach
      { x: 1800, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'gem' },
      { x: 2300, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'star' }, // the wave's base
      { x: 2900, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
      { x: 3150, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'boots' }, // the run-up comfort
      { x: 3500, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', mystery: true },
      { x: 3950, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'gem' },
      { x: 4700, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'star' },
      { x: 5050, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
      { x: 5400, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' }, // the arena boon
    ],
    // The three frost seals: solid from frame 1, one per zone boundary. Each
    // one is opened by its own hearth — lighting ring k puts door k into
    // 'cracking', and door.js melts it from there. The world pass draws them
    // from the THAW state, not the door state, so a seal looks sealed exactly
    // while its hearth is dark.
    doors: [
      { x: 1600, y: 0, w: 40, h: groundY, state: 'locked', openT: 0, kind: 'frostseal' },
      { x: 3800, y: 0, w: 40, h: groundY, state: 'locked', openT: 0, kind: 'frostseal' },
      { x: 5200, y: 0, w: 40, h: groundY, state: 'locked', openT: 0, kind: 'frostseal' },
    ],
    // The three sun seeds are relics (the L5 shape + `planted`): pickup is
    // updateRelics unchanged (+50, the chime, the sparkle). Positions are the
    // post-reveal seats — seed 1 falls onto the pedestal top when the fountain
    // shatters, seed 3 onto the bird's shelf.
    relics: [
      { id: 'seed1', x: 642, y: 520, w: 16, h: 16, taken: false, planted: false, visible: false },
      { id: 'seed2', x: 2445, y: 384, w: 16, h: 16, taken: false, planted: false, visible: true },
      { id: 'seed3', x: 4242, y: 420, w: 16, h: 16, taken: false, planted: false, visible: false },
    ],
    // The thaw clock (M2 advances it): one honest accumulator, every read pure.
    thaw: {
      t: 0, thaws: 0, skyT: 0, bossThaws: 0,
      rings: [
        { x: 950, lit: false, igniteT: 0, t: 0 },
        { x: 2600, lit: false, igniteT: 0, t: 0 },
        { x: 4400, lit: false, igniteT: 0, t: 0 },
      ],
      lastHum: 0, lastCreak: 0, popT: 0,
    },
    frostPatches: [], // M3: the golem's spit leaves them; M4 they slide
    // World-pass decoration. Every one of these is frozen in M1 and its own
    // milestone gives it motion; the state is here from the start so the draw
    // never has to ask whether a field exists.
    // 124 tall, not 100: it has to reach the floor line, because an arrow
    // leaves the bow at chest height (groundY - 24) and a column that stops at
    // the pedestal top sits exactly on the edge of that shot
    fountain: { x: 630, y: groundY - 124, w: 40, h: 124, shattered: false, t: 0 },
    frozenHare: { x: 880, y: groundY - 56, w: 56, h: 56, state: 'frozen', t: 0 }, // hearth A's mercy
    frozenWraith: { x: 2750, y: groundY - 56, w: 56, h: 56, state: 'frozen', t: 0 }, // hearth B's mercy
    frozenBird: { x: 4232, y: groundY - 180, w: 56, h: 56, state: 'frozen', t: 0 }, // seed 3's block, on the shelf
    hallFigures: [ // matte blue-ice silhouettes; world pass, no collision
      { x: 4050, kind: 'guard', state: 'frozen', t: 0 },
      { x: 4200, kind: 'scholar', state: 'frozen', t: 0 }, // drips at hearth C
      { x: 4650, kind: 'couple', state: 'frozen', t: 0 },
      { x: 4750, kind: 'child', state: 'frozen', t: 0 }, // drips at the Queen's 8 hp
      { x: 4900, kind: 'attendant', state: 'frozen', t: 0 },
    ],
    hallFountains: [{ x: 4100, state: 'frozen', t: 0 }, { x: 4600, state: 'frozen', t: 0 }],
    // The King walks with the player (M3); level-owned, like level 7's pig —
    // no collision, no damage, no input.
    king: { x: 60, y: groundY, w: 28, h: 44, state: 'walk', t: 0 },
    // The ending state, and the only ending this level has: no exit rect, no
    // goal line, no pearl. reachedExit's guard makes a level with neither safe.
    ending9: makeEnding9(),
    dialogs: [
      {
        id: 'l9-intro',
        x: 0, y: groundY - 140, w: 200, h: 140, // the spawn band: the player starts inside it
        beats: [{
          id: 'l9-intro',
          // He has been the story's object since level 5 — kidnapped, caged on
          // the Peak, a silhouette on the citadel's rim — and this is the first
          // time he is simply here, beside you. The first line says who he is
          // and why, for anyone who arrives without the earlier levels in mind.
          lines: [
            { speaker: 'The Unicorn King', text: 'I am the Unicorn King — you broke my cage on the Peak, and I came down the shaft behind you.' },
            { speaker: 'The Unicorn King', text: 'This is the palace of the one who froze my realm. Three fires slept here when she came.' },
            { speaker: 'The Unicorn King', text: 'Wake them, and the ice will tell you the way. I will meet you at her throne.' },
          ],
        }],
      },
      {
        id: 'l9-gate',
        x: 5250, y: groundY - 140, w: 150, h: 140, // just inside the throne door
        beats: [{
          id: 'l9-gate',
          // she speaks only once the level is warm: walking in with two hearths
          // lit finds her still frozen, and nothing happens
          when: game => game.level.thaw.thaws === 3,
          // the unfreezing starts as the box opens and plays behind the second
          // line — at a reading pace the shell shatters while she is still
          // talking, so the entrance is a scene and not a cutscene
          onOpen: g => { g.level.queenUnfreeze = { t: 0, boss: false }; },
          lines: [
            { speaker: 'The Frost Queen', text: 'A hundred years I held the winter. A hundred years the ice held me.' },
            { speaker: 'The Frost Queen', text: 'You have lit my fires and broken my seals. Then stand, little queen — and feel what a century of winter costs.' },
          ],
        }],
      },
    ], // M7: the ending's last two
    roster: [
      // The sprites' anchors are the centres of their drift envelopes; the
      // seeded amplitudes (30-50 px across) keep each one inside its own
      // stretch of the level rather than wandering into the next.
      { kind: 'sprite', x: 2150, y: 400 },
      { kind: 'sprite', x: 2850, y: 380 },
      { kind: 'sprite', x: 4300, y: 360 },
      { kind: 'sprite', x: 4900, y: 380 },
      // the courtyard golem fights on open ice; the antechamber one patrols
      // past the frozen guard, which has no collision to get in its way
      { kind: 'golem', x: 2000, band: [1900, 2150] },
      { kind: 'golem', x: 4050, band: [3900, 4200] },
      // She is on the throne in the same rect the world pass has been drawing
      // her frozen pose in, so the decoration becoming an enemy does not pop.
      { kind: 'queenboss', x: 5672, y: 400, sleeping: true },
    ],
  };
}
