// Level 2 — "The Bridge & The Castle": bridge with moat gaps, the stone
// gate, interior rooms with a chasm, and the boss hall with the mage,
// the pearl, and the staircase-down exit.
export function createLevel2(viewH = 600) {
  const groundY = viewH - 40;
  return {
    width: 3600,
    height: viewH,
    groundY,
    startItems: ['bow'],
    zones: [
      { x0: 0, x1: 900, kind: 'outdoor' },
      { x0: 900, x1: 2700, kind: 'interior' },
      { x0: 2700, x1: 3600, kind: 'hall' },
    ],
    moats: [
      { x: 380, w: 80 },
      { x: 640, w: 80 },
    ],
    gate: { x: 880, w: 80 },
    ground: [
      // bridge deck (planks) with two moat gaps
      { x: 0, w: 380, kind: 'plank', y: groundY },
      { x: 460, w: 180, kind: 'plank', y: groundY },
      { x: 720, w: 180, kind: 'plank', y: groundY },
      // interior: room 1, chasm (1900-1980), room 2
      { x: 900, w: 1000, kind: 'ground', y: groundY },
      { x: 1980, w: 720, kind: 'ground', y: groundY },
      // boss hall floor, then four 20px steps down to the exit
      { x: 2700, w: 750, kind: 'ground', y: groundY },
      { x: 3450, w: 30, kind: 'ground', y: groundY + 20 },
      { x: 3480, w: 30, kind: 'ground', y: groundY + 40 },
      { x: 3510, w: 30, kind: 'ground', y: groundY + 60 },
      { x: 3540, w: 60, kind: 'ground', y: groundY + 80 },
    ],
    platforms: [
      { x: 1150, y: groundY - 200, w: 140, kind: 'platform' },
      { x: 1350, y: groundY - 280, w: 120, kind: 'platform' },
      { x: 1880, y: groundY - 180, w: 120, kind: 'platform' }, // hop over the chasm
      { x: 2100, y: groundY - 140, w: 130, kind: 'platform' },
      { x: 2300, y: groundY - 220, w: 130, kind: 'platform' },
      { x: 2500, y: groundY - 130, w: 130, kind: 'platform' },
    ],
    boxes: [
      { x: 200, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box' },
      { x: 560, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'gem' },
      { x: 1050, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'sunbeam' }, // room 1, before the chasm
      { x: 1160, y: groundY - 236, w: 36, h: 36, broken: false, kind: 'box', drop: 'grow' }, // on the 1150 platform
      { x: 1350, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'lantern' }, // room 1, among the ghosts
      { x: 1500, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', mystery: true }, // room 1, wildcard
      { x: 1600, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'star' }, // room 1
      { x: 1750, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'boots' }, // before the chasm
      { x: 1810, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'hops' }, // chasm is its intended use
      { x: 2050, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'magnet' }, // room 2
      { x: 2300, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'star' }, // room 2
      { x: 2420, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
      { x: 2620, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'lantern' }, // among the ghosts
      { x: 2730, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'shield' }, // boss hall, visible on the approach
      { x: 2800, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heartcap' }, // boss hall boon
    ],
    pearl: {
      x: 3340, y: groundY - 60, w: 20, h: 20,
      visible: false, taken: false,
      showWhen: enemies => enemies.some(e => e.kind === 'mage' && e.dead),
    },
    exit: { x: 3500, y: groundY - 10, w: 100, h: 95, locked: true },
    roster: [
      { kind: 'zombie', x: 1200, minX: 1100, maxX: 1400 },
      { kind: 'ghost', x: 1250, y: 240 },
      { kind: 'zombie', x: 2150, minX: 2100, maxX: 2300 },
      { kind: 'ghost', x: 2200, y: 220 },
      { kind: 'ghost', x: 2550, y: 260 },
      { kind: 'zombie', x: 2560, minX: 2500, maxX: 2650 },
      { kind: 'mage', x: 3250, minX: 2760, maxX: 3380 }, // boss arena: stays on the hall floor
    ],
  };
}
