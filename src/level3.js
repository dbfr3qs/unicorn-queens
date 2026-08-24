// Level 3 — "The Undercroft": a brown-brick dungeon with torches, four
// lava fissures, a hidden key, the witch's jail cell, the troll's door,
// and a sealed staircase down. All key-chain state lives in this data
// (key/cell/door/dialogs); the P3-P7 modules read and mutate it.
export function createLevel3(viewH = 600) {
  const groundY = viewH - 40;
  return {
    width: 4400,
    height: viewH,
    groundY,
    // no startItems: the bow (and any later boons) are carried from level 2
    zones: [
      { x0: 0, x1: 3550, kind: 'dungeon' },
      { x0: 3550, x1: 4400, kind: 'dungeon-hall' },
    ],
    lava: [ // marks the four ground gaps; render only (falling in = respawn)
      { x: 600, w: 100 },
      { x: 1550, w: 100 },
      { x: 2850, w: 100 },
      { x: 3250, w: 100 },
    ],
    ground: [
      { x: 0, w: 600, kind: 'ground', y: groundY },
      { x: 700, w: 850, kind: 'ground', y: groundY },
      { x: 1650, w: 1200, kind: 'ground', y: groundY },
      { x: 2950, w: 300, kind: 'ground', y: groundY },
      { x: 3350, w: 900, kind: 'ground', y: groundY }, // hall floor
      // staircase down at the end (level 2 pattern), sealed until the pearl
      { x: 4250, w: 30, kind: 'ground', y: groundY + 20 },
      { x: 4280, w: 30, kind: 'ground', y: groundY + 40 },
      { x: 4310, w: 30, kind: 'ground', y: groundY + 60 },
      { x: 4340, w: 60, kind: 'ground', y: groundY + 80 },
    ],
    platforms: [
      { x: 480, y: groundY - 140, w: 110, kind: 'platform' }, // over fissure 1
      { x: 1460, y: groundY - 120, w: 100, kind: 'platform' }, // west lip, key chain hop 1
      { x: 1600, y: groundY - 240, w: 90, kind: 'platform' }, // nook ledge, hop 2 (above fissure 2)
      { x: 2800, y: groundY - 110, w: 110, kind: 'platform' }, // over fissure 3
      { x: 3100, y: groundY - 140, w: 120, kind: 'platform' }, // staggered
      { x: 3300, y: groundY - 110, w: 110, kind: 'platform' }, // over fissure 4
    ],
    boxes: [
      { x: 300, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'gem' },
      { x: 520, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'sunbeam' },
      { x: 760, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'boots' },
      { x: 1100, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', mystery: true },
      { x: 1750, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'star' },
      { x: 2050, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
      { x: 2400, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'lantern' },
      { x: 2600, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'hops' },
      { x: 2750, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', mystery: true },
      { x: 3050, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'grow' },
      { x: 3450, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'magnet' },
      { x: 3700, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'shield' }, // visible on the approach
      { x: 4150, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heartcap' }, // hall boon
    ],
    marker: { x: 1480, y: groundY - 200, w: 20, h: 20, glintT: 0 }, // points at the alcove right
    key: { x: 1620, y: groundY - 256, w: 16, h: 16, taken: false }, // rests on the nook ledge
    cell: {
      x: 2100, y: groundY - 100, w: 70, h: 100,
      open: false, opening: false, unlockT: 0,
      witch: 'inside', wx: 2115, wy: groundY - 32, wvy: 0,
      wanderT: 0, fadeT: 0, puffT: 0,
    },
    door: { x: 3550, y: 0, w: 40, h: groundY, state: 'locked', openT: 0, closeT: 0 }, // full height
    pearl: {
      x: 4210, y: groundY - 60, w: 20, h: 20,
      visible: false, taken: false,
      showWhen: enemies => enemies.some(e => e.kind === 'troll' && e.dead),
    },
    exit: { x: 4300, y: groundY - 10, w: 100, h: 95, locked: true },
    dialogs: [
      {
        id: 'cell-hint',
        x: 2040, y: groundY - 140, w: 130, h: 140, // = the cell's approach zone
        beats: [{
          id: 'witch-hint',
          repeat: true, // re-fires on every approach until the key is found
          when: g => !g.level.key.taken,
          lines: [
            { speaker: 'Witch', text: 'Guards locked me here for curing their king.' },
            { speaker: 'Witch', text: 'A secret key hides to the west - above the fire.' },
          ],
        }],
      },
    ],
    roster: [
      { kind: 'zombie', x: 250, minX: 180, maxX: 420 },
      { kind: 'zombie', x: 900, minX: 800, maxX: 1100 },
      { kind: 'ghost', x: 1300, y: 240 },
      { kind: 'zombie', x: 2000, minX: 1900, maxX: 2100 },
      { kind: 'ghost', x: 2250, y: 230 },
      { kind: 'zombie', x: 2700, minX: 2600, maxX: 2800 },
      { kind: 'ghost', x: 2950, y: 250 },
      { kind: 'zombie', x: 3100, minX: 3000, maxX: 3200 },
      { kind: 'ghost', x: 3300, y: 230 },
      { kind: 'zombie', x: 3450, minX: 3400, maxX: 3520 },
      { kind: 'troll', x: 3950, minX: 3660, maxX: 4180 }, // boss
    ],
  };
}
