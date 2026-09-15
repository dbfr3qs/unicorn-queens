// Level 7 — "The Peak": the storm-bent summit the mist gate carried the
// player up to. Wind cycles off a pure time function (M2), ice patches
// slide (M2), the old sigil sleeps in an ice block and opens the iron
// gate (M3), the spire holds the cauldron, the bound spirits, and a
// porthole where the caged King gives the tactical beat (M5), and above
// the clouds the wizard rides his pig — a two-stage fight (M6) whose
// death releases everything and lights the rainbow (M7). All
// sigil/cage/wind/ending state lives in this data; the M2–M7
// subsystems read and mutate it.
export function createLevel7(viewH = 600) {
  const groundY = viewH - 40;
  return {
    width: 6300,
    height: viewH,
    groundY,
    // no startItems: bow + flight are carried (LEVELS[6].carry for a
    // fresh ?level=7 boot)
    zones: [
      { x0: 0, x1: 3600, kind: 'snowfield' }, // no gate: the snowfield from the first step
      { x0: 3600, x1: 5400, kind: 'spire' },
      { x0: 5400, x1: 6300, kind: 'throne' },
    ],
    lava: [ // pits (falling in = 1 damage + respawn, the house pit rule)
      { x: 1400, w: 150, crevasse: true }, // crevasse 1 (the ice run-up in front)
      { x: 2400, w: 150, crevasse: true }, // crevasse 2 (the ice bridge crossing)
      { x: 3900, w: 150, cauldron: true }, // the cauldron pit (dais mid-pit)
    ],
    ground: [
      { x: 0, w: 1250, kind: 'snow', y: groundY }, // snowfield west
      { x: 1250, w: 150, kind: 'ice', y: groundY }, // crevasse-1 run-up (the teach)
      { x: 1550, w: 700, kind: 'snow', y: groundY }, // snowfield mid
      { x: 2250, w: 150, kind: 'ice', y: groundY }, // bridge run-up
      { x: 2550, w: 1050, kind: 'snow', y: groundY }, // snowfield east (to the spire)
      { x: 3600, w: 300, kind: 'stone', y: groundY }, // the spire mouth
      { x: 4050, w: 1350, kind: 'stone', y: groundY }, // the spire interior
      { x: 5400, w: 900, kind: 'snow', y: groundY }, // the throne arena
    ],
    platforms: [
      { x: 2400, y: groundY - 6, w: 150, kind: 'ice' }, // the ice bridge (comfort, not the gate)
      { x: 3925, y: groundY - 6, w: 60, kind: 'dais' }, // the cauldron dais (hop-hop)
      { x: 5990, y: groundY - 40, w: 130, kind: 'dais' }, // the King's cage dais
    ],
    boxes: [
      { x: 550, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'bow' }, // safety bow
      { x: 750, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'gem' },
      { x: 1200, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'boots' }, // pre-ice comfort window
      { x: 1700, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'star' },
      { x: 2200, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
      { x: 2700, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'magnet' },
      { x: 3200, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', mystery: true },
      { x: 4300, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'gem' },
      { x: 4700, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
      { x: 5050, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'star' },
      { x: 5350, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'shield' }, // reflected bolts hit the rune
      { x: 5900, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' }, // in the arena
    ],
    // Two doors (the first multi-door level): the iron gate opens remotely
    // from the sigil (M3); the throne gate is unopenable by anything — the
    // trigger band's flare dissolves it when the player first approaches
    // (M5).
    doors: [
      { x: 3600, y: 0, w: 40, h: groundY, state: 'locked', openT: 0, kind: 'irongate', wall: 'wall_spire' }, // wall: the sheet its jambs are drawn from
      { x: 5400, y: 0, w: 40, h: groundY, state: 'locked', openT: 0, kind: 'thronegate', wall: 'wall_spire' },
    ],
    // The throne gate's trigger band (M5 consumes): first entry flares +
    // dissolves the gate and wakes the wizard.
    throneTrigger: { x: 5280, y: 0, w: 120, h: groundY },
    // The sigil key chain (M3): the ice block (arrow-only wake) and the
    // sigil inside it (pickup = +50, the relic pattern, opens the iron gate).
    sigilBlock: { x: 3090, y: groundY - 76, w: 56, h: 56, state: 'intact', shatterT: 0 },
    sigil: { x: 3112, y: groundY - 16, w: 16, h: 16, visible: false, taken: false },
    // The King's cage on the dais (M7 opens it): the door swings on openT.
    cage: { x: 5998, y: groundY - 114, w: 64, h: 74, open: false, openT: 0 },
    // The wind (M2): phase is a pure function of level time; the fields
    // below let updateWind play the one-shot gust sfx per cycle.
    wind: { phase: 'calm', lastPhase: 'calm' },
    // The throne gate's dissolve (M5 sets; the M6 boss reads it to wake).
    throneGateOpen: false,
    // The released pig (M7): null until the wizard dies.
    pig: null,
    // The ending one-shot (M7).
    ending7: { started: false },
    // No pearl: the rainbow replaces the pearl+arch pair (L5 precedent —
    // the story, not a seal, ends the level's chain).
    exit: { x: 6220, y: 430, w: 60, h: 130, locked: true, kind: 'rainbow' },
    dialogs: [
      {
        id: 'l7-intro',
        x: 40, y: groundY - 140, w: 200, h: 140, // the spawn band: the player starts inside
        beats: [{
          id: 'l7-intro',
          lines: [
            { speaker: 'The Unicorn Queen', text: 'The Peak. I did not want to come here.' },
            { speaker: 'The Unicorn Queen', text: 'The wind knows me. The ice remembers. That is all.' },
            { speaker: 'The Unicorn Queen', text: 'Find what fell from the sky. The spire will open for it.' },
          ],
        }],
      },
      {
        id: 'l7-king',
        x: 4380, y: groundY - 140, w: 240, h: 140, // the porthole band
        beats: [{
          id: 'l7-king',
          lines: [
            { speaker: 'The Unicorn King', text: '(through the porthole) I am sorry. I could not carry you out of that storm.' },
            { speaker: 'The Unicorn King', text: 'Free me and I will wait no longer. The rainbow is ready — it only needs its storm broken.' },
          ],
        }],
      },
      {
        id: 'l7-king-end',
        x: 5900, y: groundY - 140, w: 300, h: 140, // the open cage: the King speaks once the storm breaks
        beats: [{
          id: 'l7-king-end',
          when: game => game.enemies.some(e => e.kind === 'wizardboss' && e.dead), // the beat waits for the release
          onOpen: g => { g.level.exit.locked = false; }, // his word lights the rainbow (release cannot: the stage-2 camp overlaps the exit rect)
          lines: [
            { speaker: 'The Unicorn King', text: 'You did it. I am… free. The storm breaks.' },
            { speaker: 'The Unicorn King', text: 'Thank you. The rainbow is open — walk through, and the Sky Citadel is yours.' },
          ],
        }],
      },
    ], // M7: the ending beat joins this list
    roster: [
      { kind: 'hare', x: 800, minX: 700, maxX: 1100 },
      { kind: 'hare', x: 1750, minX: 1650, maxX: 2050 },
      { kind: 'hare', x: 2900, minX: 2800, maxX: 3200 },
      { kind: 'hare', x: 3300, minX: 3250, maxX: 3550 },
      { kind: 'wraith', x: 1100, y: 420 },
      { kind: 'wraith', x: 2100, y: 410 },
      { kind: 'wraith', x: 3000, y: 430 },
      { kind: 'wraith', x: 5550, y: 420, bound: true },
      { kind: 'wraith', x: 5950, y: 430, bound: true },
      { kind: 'wizardboss', x: 6500, minX: 5500, maxX: 6200, sleeping: true }, // off-screen east; wakes on the throne gate
    ],
  };
}
