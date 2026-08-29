// Level 6 — "The Blackmire": below the peak the mist gate spat the player
// out into the wizard's shadowed swamp. Three cogs (heron, adder, weaver)
// are hidden in the nest web, the mud vent, and the egg sac; each one
// must be turned into the Old Winch, which lowers the bridge and melts
// the web wall guarding the spider hollow and the Weaver Queen. All
// cog/winches/vent/sac/bridge state lives in this data; cogs.js, the
// winch dialogue beats, and the M3–M7 subsystems read and mutate it.
import { cogsSet } from '../cogs.js';
export function createLevel6(viewH = 600) {
  const groundY = viewH - 40;
  return {
    width: 6800,
    height: viewH,
    groundY,
    // no startItems: bow + flight are carried from level 5 (the test jump
    // grants them via LEVELS[5].carry)
    zones: [
      // miregate extends to 500: the wall's east stone (420–500) must sit
      // inside a zone, and a zone's sky is painted clipped to the zone's
      // own span — stone past the edge would be overpainted by the mire sky
      { x0: 0, x1: 500, kind: 'miregate' },
      { x0: 500, x1: 3800, kind: 'mire' },
      { x0: 3800, x1: 6800, kind: 'mire-deep' },
    ],
    lava: [ // water gaps (falling in = respawn, the L5 pond rule)
      { x: 1100, w: 350, water: true }, // the log pool
      { x: 1900, w: 400, water: true }, // the vent pool
      { x: 5500, w: 300, water: true }, // the bridge pit
    ],
    ground: [
      { x: 0, w: 500, kind: 'stone', y: groundY }, // the gate passage (under the wall, to the east stone)
      { x: 500, w: 600, kind: 'ground', y: groundY }, // heron grove
      { x: 1450, w: 450, kind: 'ground', y: groundY }, // the lily bank
      { x: 2300, w: 3200, kind: 'ground', y: groundY }, // marsh east + winch temple
      { x: 5800, w: 1000, kind: 'ground', y: groundY }, // the spider hollow
    ],
    platforms: [
      // the root chain up into the cypress: each hop ≤ 120 px (130 apex)
      { x: 780, y: groundY - 120, w: 90, kind: 'root' },
      { x: 900, y: groundY - 210, w: 90, kind: 'root' },
      { x: 1010, y: groundY - 310, w: 90, kind: 'root' },
      // the heron's nest, directly above root 3's west edge: reached by an
      // in-place short hop (a full jump overshoots it even vertically)
      { x: 1010, y: groundY - 390, w: 60, kind: 'nest' },
      // the log pool crossing
      { x: 1150, y: groundY - 6, w: 80, kind: 'log' },
      { x: 1310, y: groundY - 6, w: 80, kind: 'log' },
      // the vent pool crossing (lily pads read as swamp pads)
      { x: 1950, y: groundY - 6, w: 70, kind: 'lily' },
      { x: 2210, y: groundY - 6, w: 70, kind: 'lily' },
      // the altar dais (egg sac) and the boss altar (pearl)
      { x: 4250, y: groundY - 40, w: 150, kind: 'altar' },
      { x: 6400, y: groundY - 40, w: 120, kind: 'altar' },
      // the bridge span: non-solid (hidden) until the winch lowers it
      { x: 5500, y: groundY - 6, w: 300, kind: 'bridge', hidden: true },
    ],
    boxes: [
      // Safety bow: a death-restart drops the carried bow (only maxHp and
      // flight survive) — the nest web and the vent are arrow-only, so a
      // restart must re-arm before them. On the ground path, stomp-break.
      { x: 500, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'bow' },
      { x: 750, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'gem' },
      { x: 1180, y: groundY - 42, w: 36, h: 36, broken: false, kind: 'box', drop: 'star' }, // on the log
      { x: 1650, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
      { x: 2400, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'magnet' },
      { x: 3000, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'sunbeam' },
      { x: 3400, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'boots' },
      { x: 4000, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'hops' },
      { x: 4450, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', mystery: true },
      { x: 5200, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'bow' },
      { x: 5350, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
      { x: 5950, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
    ],
    // The three cogs (M2). Each is hidden by its hiding spot (M3) and
    // installed by a winch beat's onOpen (M2). `stage` = the socket it
    // fills: the sequential chain gates the reveals through the sockets.
    cogs: [
      { id: 'heron', x: 1022, y: groundY - 406, w: 16, h: 16, taken: false, visible: false, installed: false, stage: 0 },
      { id: 'adder', x: 2092, y: 490, w: 16, h: 16, taken: false, visible: false, installed: false, stage: 1 },
      { id: 'weaver', x: 4310, y: 504, w: 16, h: 16, taken: false, visible: false, installed: false, stage: 2 },
    ],
    // The Old Winch: three sockets (one per cog), the wheel turns only
    // after the last cog is installed.
    winch: { x: 4900, sockets: [false, false, false], turning: false },
    // The heron's nest web (cog 0's hiding spot): an arrow unravels it.
    nest: { x: 1010, y: groundY - 390, w: 60, h: 24, state: 'webbed', unravelT: 0 },
    // The mud vent (cog 1's hiding spot): dormant until socket 0 fills;
    // then a bubble rises on a 10 s cycle, shootable once it surfaces.
    vent: { x: 2100, active: false, activated: false, popped: false, t: 0, bubbleY: groundY },
    // The egg sac (cog 2's hiding spot): appears when socket 1 fills;
    // a real drop-stomp (or an arrow) pops it on the dais.
    sac: { x: 4310, y: groundY - 64, w: 28, h: 24, present: false, popped: false },
    // The bridge over the pit: raised (slab) until the winch's last cog.
    bridge: { x: 5500, y: groundY - 6, w: 300, state: 'raised', lowerT: 0 },
    // The web wall at the hollow's mouth: solid while locked, melts (never
    // re-seals) when the winch opens it.
    door: { x: 5800, y: 0, w: 40, h: groundY, state: 'locked', openT: 0, kind: 'webwall' },
    // The pearl on the boss altar: appears when the Weaver Queen dies.
    pearl: {
      x: 6440, y: 504, w: 16, h: 16, visible: false, taken: false,
      showWhen: enemies => enemies.some(e => e.kind === 'spiderboss' && e.dead),
    },
    exit: { x: 6680, y: 430, w: 60, h: 130, locked: true },
    dialogs: [
      {
        id: 'intro',
        x: 40, y: groundY - 140, w: 200, h: 140, // the spawn band: the player starts inside
        beats: [{
          id: 'l6-intro',
          lines: [
            { speaker: 'The Old Winch', text: 'The mist gate spat you out below the peak, into the Blackmire.' },
            { speaker: 'The Old Winch', text: "The wizard's shadow blackened this swamp. The pass to his hollow is sealed in web." },
            { speaker: 'The Old Winch', text: "My wheel is dead. Three cogs will wake it: the heron's, the adder's, the weaver's." },
          ],
        }],
      },
      {
        id: 'winch',
        x: 4780, y: groundY - 140, w: 300, h: 140, // the winch approach zone
        beats: [
          {
            id: 'w0',
            repeat: true,
            when: g => cogsSet(g.level) === 0 && !g.level.cogs[0].taken,
            lines: [
              { speaker: 'The Old Winch', text: 'Three empty sockets, champion. The runes show the order.' },
              { speaker: 'The Old Winch', text: "The heron's cog sleeps in the webbed nest up the great cypress. Arrows unravel web." },
            ],
          },
          {
            id: 'w1', // once: installs the heron's cog, wakes the vent
            when: g => !g.level.winch.sockets[0] && g.level.cogs[0].taken,
            onOpen: (g, f) => {
              g.level.winch.sockets[0] = true;
              g.level.cogs[0].installed = true;
              g.level.vent.active = true; // the mud in the east wakes
              f.play('gear');
            },
            lines: [{ speaker: 'The Old Winch', text: "The heron's cog turns. Somewhere east, the mud begins to burble." }],
          },
          {
            id: 'w2',
            repeat: true,
            when: g => cogsSet(g.level) === 1 && !g.level.cogs[1].taken,
            lines: [{ speaker: 'The Old Winch', text: 'One more. The burbling pool east of the lily bank: wait for the bubble to surface, then shoot it.' }],
          },
          {
            id: 'w3', // once: installs the adder's cog, the sac appears
            when: g => !g.level.winch.sockets[1] && g.level.cogs[1].taken,
            onOpen: (g, f) => {
              g.level.winch.sockets[1] = true;
              g.level.cogs[1].installed = true;
              g.level.sac.present = true; // something takes to the altar
              f.play('gear');
              f.play('spin');
            },
            lines: [{ speaker: 'The Old Winch', text: "The adder's cog turns. The altar in the fern grove is no longer empty — and its guardian stirs." }],
          },
          {
            id: 'w4',
            repeat: true,
            when: g => cogsSet(g.level) === 2 && !g.level.cogs[2].taken,
            lines: [{ speaker: 'The Old Winch', text: "The last cog: the weaver's, in the egg sac on the altar. Drop on it — or shoot it." }],
          },
          {
            id: 'w5', // once: the wheel wakes, the bridge falls, the wall melts
            when: g => !g.level.winch.sockets[2] && g.level.cogs[2].taken,
            onOpen: (g, f) => {
              g.level.winch.sockets[2] = true;
              g.level.cogs[2].installed = true;
              g.level.winch.turning = true;
              g.level.bridge.state = 'lowering';
              g.level.bridge.lowerT = 1.2;
              g.level.door.state = 'opening';
              g.level.door.openT = 1.5; // the web wall melts (WEB_DOOR_OPEN)
              f.play('rumble');
              f.play('creak');
              f.play('spin');
              f.play('seal');
            },
            lines: [{ speaker: 'The Old Winch', text: 'The wheel wakes. The bridge falls, the web melts — go, and face the Weaver Queen.' }],
          },
        ],
      },
    ],
    roster: [
      { kind: 'snake', x: 650, minX: 500, maxX: 1050 },
      { kind: 'snake', x: 1600, minX: 1500, maxX: 1900 },
      { kind: 'snake', x: 2500, minX: 2400, maxX: 3100 },
      { kind: 'snake', x: 3300, minX: 3200, maxX: 3600 },
      { kind: 'snake', x: 4100, minX: 4000, maxX: 4450 },
      { kind: 'adder', x: 4150, minX: 3550, maxX: 4450, sleeping: true },
      { kind: 'spider', x: 800, y: 410 },
      { kind: 'spider', x: 1850, y: 410 },
      { kind: 'spider', x: 2250, y: 410 },
      { kind: 'spider', x: 2900, y: 410 },
      { kind: 'spider', x: 3750, y: 410 },
      { kind: 'spider', x: 4400, y: 410 },
    { kind: 'spiderboss', x: 6100, minX: 5900, maxX: 6650 },
    ],
  };
}
