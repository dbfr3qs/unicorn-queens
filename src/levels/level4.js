// Level 4 — "The Dragon's Layer": the deepest layer of the castle so far.
// A damp, moss-eaten warren over green sludge, a treasure vault, and a
// dragon hall where the exit is a hole in the ceiling, reachable only with
// the witch's flight spell. All shaft/portcullis state lives in this data;
// the door/shaft modules read and mutate it. Bats (K3) and the dragon (K4)
// join the roster in their phases.
export function createLevel4(viewH = 600) {
  const groundY = viewH - 40;
  return {
    width: 4800,
    height: viewH,
    groundY,
    // no startItems: the bow (and the flight spell) are carried from level 3
    zones: [
      { x0: 0, x1: 3550, kind: 'deep' },
      { x0: 3550, x1: 4800, kind: 'deep-hall' },
    ],
    lava: [ // green sludge pits (recolor of the lava render; fall = respawn)
      { x: 600, w: 100, sludge: true },
      { x: 1800, w: 800, sludge: true }, // the gauntlet
    ],
    ground: [
      { x: 0, w: 600, kind: 'ground', y: groundY },
      { x: 700, w: 1100, kind: 'ground', y: groundY },
      { x: 2600, w: 2200, kind: 'ground', y: groundY }, // vault floor + hall
    ],
    platforms: [ // gauntlet zigzag: rise ≤ 70 px, 90 px gaps — jump or flight
      { x: 1800, y: groundY - 110, w: 90, kind: 'platform' },
      { x: 1980, y: groundY - 180, w: 90, kind: 'platform' },
      { x: 2160, y: groundY - 110, w: 90, kind: 'platform' },
      { x: 2340, y: groundY - 180, w: 90, kind: 'platform' },
      { x: 2500, y: groundY - 110, w: 90, kind: 'platform' },
    ],
    boxes: [
      { x: 450, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'bow' }, // safety bow #1: arms an early first pass
      { x: 800, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'gem' },
      { x: 1050, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'sunbeam' },
      { x: 1300, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', mystery: true },
      { x: 1550, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'star' },
      { x: 1750, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
      // Safety bow #2: a death-restart drops the carried bow (only maxHp and
      // flight survive a restart), which would soft-lock the dragon
      // (arrow-only damage). On the ground path before the portcullis,
      // breakable by stomp — so every restart can re-arm before the boss.
      { x: 2650, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'bow' },
      { x: 2850, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'lantern' },
      { x: 3000, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'grow' },
      // Secret crate: built into the vault wall — wood against stone, high,
      // slightly out of line with the brick courses. A standing jump
      // clears it (130 apex vs 120 top); it breaks with a jump-arrow
      // fired at mid-jump, or an arrow from flight at its height.
      // A duplicate heartcap pays out a gem (existing behaviour).
      { x: 3150, y: groundY - 120, w: 36, h: 36, broken: false, kind: 'box', drop: 'heartcap' },
      { x: 3250, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'magnet' },
      { x: 3400, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', mystery: true },
      { x: 3700, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'shield' }, // hall boon, visible on the approach
      { x: 4650, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
    ],
    // Keyless full-height portcullis: auto-opens on approach and drops shut
    // behind the player — commit to the dragon.
    door: { x: 3550, y: 0, w: 40, h: groundY, state: 'locked', noKey: true, openT: 0, closeT: 0, wall: 'wall_deep' },
    // The shaft: a hole in the ceiling. Sealed until the pearl beat:
    // dragon dies -> pearl here -> pickup -> gate retracts -> fly up.
    shaft: { x: 4150, y: 0, w: 100, h: 70, state: 'sealed', openT: 0 },
    exit: { x: 4150, y: 0, w: 100, h: 70, locked: true },
    pearl: {
      x: 4050, y: groundY - 60, w: 20, h: 20,
      visible: false, taken: false,
      showWhen: enemies => enemies.some(e => e.kind === 'dragon' && e.dead), // the dragon (K4)
    },
    roster: [
      { kind: 'zombie', x: 250, minX: 180, maxX: 420 },
      { kind: 'zombie', x: 950, minX: 850, maxX: 1150 },
      { kind: 'zombie', x: 1350, minX: 1250, maxX: 1550 },
      { kind: 'ghost', x: 1150, y: 250 },
      { kind: 'ghost', x: 2300, y: 260 }, // hangs over the gauntlet
      { kind: 'zombie', x: 3350, minX: 3250, maxX: 3450 },
      { kind: 'bat', x: 700, y: 280, minX: 500, maxX: 900 },
      { kind: 'bat', x: 1450, y: 260, minX: 1250, maxX: 1650 },
      { kind: 'bat', x: 2150, y: 240, minX: 1900, maxX: 2500 }, // over the gauntlet
      { kind: 'bat', x: 2800, y: 260, minX: 2650, maxX: 3000 },
      { kind: 'dragon', x: 4150, y: 200, minX: 3700, maxX: 4600 }, // the boss: hover band 140-260
    ],
  };
}
