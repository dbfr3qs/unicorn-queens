// Level 5 — "The Enchanted Forest": out of the castle gate and into the
// first daytime level. Find the three hidden relics of the realm and bring
// them to the Unicorn Queen in the glade; her story unlocks the mist gate
// at the wood's east edge. All relic/bush/queen/mistgate state lives in
// this data; relics.js, the queen's dialogue beats, and mistgate.js read
// and mutate it. Bees join the roster in M5.
export function createLevel5(viewH = 600) {
  const groundY = viewH - 40;
  return {
    width: 5600,
    height: viewH,
    groundY,
    // no startItems: the bow (and the flight spell) are carried from level 4
    zones: [
      { x0: 0, x1: 500, kind: 'gate' },
      { x0: 500, x1: 5600, kind: 'forest' },
    ],
    lava: [ // water gaps (recolor of the lava render; falling in = respawn)
      { x: 2650, w: 600, water: true }, // the pond
      { x: 4200, w: 100, water: true }, // the stream
    ],
    ground: [
      { x: 0, w: 500, kind: 'stone', y: groundY }, // the castle courtyard
      { x: 500, w: 2150, kind: 'ground', y: groundY },
      { x: 3250, w: 950, kind: 'ground', y: groundY },
      { x: 4300, w: 1300, kind: 'ground', y: groundY },
    ],
    platforms: [
      { x: 800, y: groundY - 110, w: 110, kind: 'branch' }, // canopy introduction
      { x: 1010, y: groundY - 190, w: 100, kind: 'branch' },
      { x: 2120, y: groundY - 110, w: 90, kind: 'branch' }, // hollow tree, hop 1
      { x: 2250, y: groundY - 220, w: 90, kind: 'branch' }, // hollow tree, hop 2 (into the hollow)
      { x: 2700, y: groundY - 6, w: 70, kind: 'lily' }, // pond crossing
      { x: 2850, y: groundY - 6, w: 70, kind: 'lily' },
      { x: 3000, y: groundY - 6, w: 70, kind: 'lily' },
      { x: 3150, y: groundY - 6, w: 70, kind: 'lily' },
      { x: 2940, y: groundY - 170, w: 60, kind: 'lily' }, // the lone high pad: flight or boots
      { x: 4195, y: groundY - 14, w: 110, kind: 'log' }, // over the stream
      { x: 3800, y: groundY - 120, w: 100, kind: 'branch' }, // deep woods canopy
      { x: 4650, y: groundY - 110, w: 110, kind: 'branch' },
      { x: 4900, y: groundY - 190, w: 100, kind: 'branch' },
    ],
    boxes: [
      // Safety bow: a death-restart drops the carried bow (only maxHp and
      // flight survive), which would soft-lock the horseshoe (arrow-only).
      // On the ground path past the arch, stomp-breakable — every restart
      // re-arms before the secret (level 3/4 decision-12 pattern).
      { x: 540, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'bow' },
      { x: 900, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'gem' },
      { x: 1500, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'sunbeam' },
      { x: 1700, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', mystery: true },
      { x: 2500, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'star' },
      { x: 3600, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' }, // the glade
      { x: 3900, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'boots' }, // the acorn's second route
      { x: 4450, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', mystery: true },
      { x: 4650, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'hops' },
      { x: 5100, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'magnet' },
      { x: 5300, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' }, // the send-off
    ],
    // The three relics of the realm (M2). The horseshoe is hidden in the
    // bush (visible only once it is shot); the sapphire and the acorn are
    // in plain sight but out of reach (hollow tree / floating lily pad).
    relics: [
      { id: 'horseshoe', x: 1160, y: groundY - 28, w: 16, h: 16, taken: false, visible: false },
      { id: 'sapphire', x: 2322, y: 286, w: 16, h: 16, taken: false, visible: true },
      { id: 'acorn', x: 2956, y: 374, w: 16, h: 16, taken: false, visible: true },
    ],
    // The bush hiding the horseshoe (M2): an arrow through it rustles the
    // leaves and the relic becomes visible and pickable.
    bushes: [
      { x: 1122, y: groundY - 30, w: 56, h: 30, relicId: 'horseshoe', state: 'hiding', rustleT: 0 },
    ],
    // The final boss (M3): non-combat. Her beats report the relic count;
    // with all three she tells the story (onOpen unlocks the exit).
    queen: { x: 3480, y: groundY - 72, w: 48, h: 72, toldStory: false },
    // The mist gate at the east edge (M4): locked until the story is told.
    mistgate: { x: 5450, y: 400, w: 100, h: 160, openT: 0 },
    exit: { x: 5470, y: 430, w: 60, h: 130, locked: true },
    dialogs: [], // the intro + queen beats land with M3
    roster: [ // bees join in M5
      { kind: 'slime', x: 700, minX: 600, maxX: 950 },
      { kind: 'slime', x: 1400, minX: 1300, maxX: 1700 },
      { kind: 'slime', x: 2050, minX: 1950, maxX: 2300 },
      { kind: 'slime', x: 4100, minX: 4000, maxX: 4190 },
      { kind: 'slime', x: 4700, minX: 4600, maxX: 4900 },
      { kind: 'slime', x: 5150, minX: 5050, maxX: 5350 },
    ],
  };
}
