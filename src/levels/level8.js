// Level 8 — "The Sky Citadel": the brass-and-starlight keep the rainbow
// tail climbs into. One global clock (the Great Clock, M2) moves every
// machine on the beat: the gear platform, the bookcase wall, the pendulum
// bridge. Three mainsprings (M3) keep it wound — sever them and the beat
// stretches, the gears slow, the light dims. The Warden (M6) is wound to
// keep the queen out; his death is a rest, not a kill (M7): the pearl
// falls from the astrolabe, the trapdoor over the cloud shaft drops, and
// the level ends in a flight dive. All clock/spring/ending state lives in
// this data; the M2–M7 subsystems read and mutate it.
import { clockCuts } from '../clock.js'; // the beat `when` gates read the live cut count

export function createLevel8(viewH = 600) {
  const groundY = viewH - 40;
  return {
    width: 6000,
    height: viewH,
    groundY,
    // no startItems: bow + flight are carried (LEVELS[7].carry for a
    // fresh ?level=8 boot)
    zones: [
      { x0: 0, x1: 600, kind: 'skybridge' },
      { x0: 600, x1: 3300, kind: 'citadel' },
      { x0: 3300, x1: 4600, kind: 'citadel-deep' },
      { x0: 4600, x1: 6000, kind: 'observatory' },
    ],
    lava: [ // pits (falling in = 1 damage + respawn, the house pit rule)
      { x: 1700, w: 150, kind: 'grate' }, // the gear crossing
      { x: 2200, w: 150, kind: 'grate' }, // before the library
      { x: 2900, w: 150, kind: 'grate' }, // before the hub
      { x: 3800, w: 400, kind: 'grate' }, // the pendulum bridge crossing
      { x: 5820, w: 120, kind: 'shaft' }, // the cloud shaft (the flight-only exit)
    ],
    ground: [
      { x: 0, w: 1700, kind: 'stone', y: groundY }, // island + gate hall
      { x: 1850, w: 350, kind: 'stone', y: groundY }, // past the gear crossing
      { x: 2350, w: 550, kind: 'stone', y: groundY }, // library floor
      { x: 3050, w: 750, kind: 'stone', y: groundY }, // hub + atrium
      { x: 4200, w: 1620, kind: 'stone', y: groundY }, // observatory deck
      { x: 5940, w: 60, kind: 'stone', y: groundY }, // the rim
    ],
    platforms: [
      { x: 1700, y: groundY - 6, w: 60, kind: 'gear' }, // M2 slides it between slots 1700 <-> 1770
      { x: 1380, y: 450, w: 90, kind: 'shelf' }, // spring-1 shelf 1
      { x: 1470, y: 360, w: 90, kind: 'shelf' }, // spring-1 shelf 2
      { x: 2260, y: groundY - 6, w: 70, kind: 'shelf' }, // bookcase top (west of the wall)
      { x: 2600, y: groundY - 24, w: 60, kind: 'shelf' }, // the spring-2 dais (under the panel)
      { x: 2960, y: groundY - 6, w: 70, kind: 'shelf' }, // bookcase top (east of the wall)
      { x: 3830, y: groundY - 6, w: 70, kind: 'pend' }, // bridge left
      { x: 4100, y: groundY - 6, w: 70, kind: 'pend' }, // bridge right (200 px gap)
      { x: 4650, y: 480, w: 60, kind: 'pend' }, // rim ledge (the deck's west end)
      { x: 5430, y: 520, w: 60, kind: 'pedestal' }, // the astrolabe plinth
      { x: 5820, y: groundY - 6, w: 120, kind: 'trapdoor' }, // lid over the shaft (M5 drops it)
    ],
    // The three mainsprings (M3 severs them, by touch or arrow): each cut
    // +50, lengthens the clock's period, slows the gears, dims the light.
    springs: [
      { x: 1510, y: 334, w: 20, h: 20, cut: false }, // above the second shelf
      { x: 2620, y: groundY - 44, w: 20, h: 20, cut: false }, // on the dais, under the panel
      { x: 4050, y: 460, w: 20, h: 20, cut: false }, // the brass hook over the bridge gap
    ],
    boxes: [
      { x: 550, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'bow' }, // safety bow
      { x: 800, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'gem' },
      { x: 1300, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'star' },
      { x: 1800, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' }, // the gear-slot pickup (over the grate)
      { x: 2300, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'boots' }, // the shelf pickup (over the grate)
      { x: 2800, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'magnet' },
      { x: 3200, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', mystery: true },
      { x: 3700, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'gem' },
      { x: 4200, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
      { x: 4700, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'star' },
      { x: 5050, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'shield' },
      { x: 5600, y: groundY - 36, w: 36, h: 36, broken: false, kind: 'box', drop: 'heart' },
    ],
    // M5 unseals the gear door on the third cut. The bookcase wall (2520–2760)
    // The bookcase wall's bays (2520–2600, 2720–2760) are scenery only — they
    // are the 3D bookshelves on either *side* of the door, drawn by the world
    // pass, not solid side-walls: a solid west bay would block the player's
    // east path before they could reach the panel opening (deviation 17).
    // Only the sliding panel is the wall's door; the clock flips it between
    // locked and open on each chime.
    doors: [
      { x: 4900, y: 0, w: 40, h: groundY, state: 'locked', openT: 0, kind: 'geardoor' },
      { x: 2600, y: 0, w: 120, h: groundY, state: 'locked', openT: 0, kind: 'shelfpanel' }, // the sliding panel (the clock drives it)
    ],
    // The Great Clock (M2 starts ticking; M1 draws it static at t = 1.0,
    // no chime pulse, the panel drawn open).
    clock: { t: 1.0, period: 6.0, chimeCount: 0, stopped: false, gearRot: 0 },
    // The bookcase panel's no-crush hold (M2) and the shaft lid (M5/M7).
    shelfPanel: { held: false },
    trapdoor: { open: false },
    // The King's silhouette on the rim (M7 steps it onto the rim when the
    // pearl is taken).
    kingSil: { present: false },
    // The pearl on the astrolabe: appears when the Warden has fully
    // rested (dead AND his dyingT run down — M6 fills that in).
    pearl: {
      x: 5450, y: 504, w: 16, h: 16, visible: false, taken: false,
      showWhen: enemies => enemies.some(
        e => e.kind === 'warden' && e.dead && (e.dyingT ?? 0) <= 0),
    },
    // Under the trapdoor lid: a flier through the shaft wins (reachedExit);
    // a walker takes the pit rule. The flight-only exit, as geometry.
    exit: { x: 5820, y: groundY, w: 120, h: 100, locked: true },
    // M3: intro (spawn, the Warden's omen) + the Great Clock's hub beats
    // (c0 repeats at 0 cuts, c1/c2 voice the winding-down, each once).
    dialogs: [
      {
        id: 'l8-intro',
        x: 40, y: groundY - 140, w: 200, h: 140, // the spawn band: the player starts inside
        beats: [{
          id: 'l8-intro',
          lines: [
            { speaker: 'The Warden', text: 'YOU WALK THE CITADEL. THE ANCHOR IS WOUND DOWN. THREE SPRINGS LIE CUT LOOSE.' },
            { speaker: 'The Warden', text: 'I KEEP THE HEARTBEAT. I AM STILL WOUND.' },
          ],
        }],
      },
      {
        id: 'l8-hub',
        x: 3550, y: groundY - 140, w: 300, h: 140, // the clock-hub band, in front of the face
        beats: [
          {
            id: 'l8-hub-0', repeat: true, when: g => clockCuts(g.level) === 0,
            lines: [
              { speaker: 'The Great Clock', text: 'THE HEARTBEAT FADES. THREE SPRINGS LIE CUT LOOSE — THE QUEEN’S HANDS, OR HER WARDEN’S. I CANNOT TELL.' },
              { speaker: 'The Great Clock', text: 'THE FIRST SLEEPS HIGH IN THE GATE HALL. THE SECOND BEHIND THE LIBRARY SHELF — THE SHELF OPENS WITH THE CHIME. THE THIRD IN MY OWN SWEEP.' },
            ],
          },
          {
            id: 'l8-hub-1', when: g => clockCuts(g.level) === 1,
            lines: [{ speaker: 'The Great Clock', text: 'ONE SPRING ANSWERS. THE HUM DROPS. THE LIGHT DIMS. THE HEARTBEAT SLOWS.' }],
          },
          {
            id: 'l8-hub-2', when: g => clockCuts(g.level) === 2,
            lines: [{ speaker: 'The Great Clock', text: 'TWO. THE PENDULUM STRETCHES ITS SWING. SOON THE CITADEL SLEEPS — AND SO DO I.' }],
          },
        ],
      },
    ], // M5: the arena beat; M7: the shaft lip join this list
    // M4: the Sentinels + the clockwork moths; M6: the Warden.
    roster: [],
  };
}
