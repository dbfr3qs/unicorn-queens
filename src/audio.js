// WebAudio sound effects: lazily-created context, beeps per game event.
// Safe to import in Node (no context is created until initAudio()).

let audioCtx = null;
export let muted = false;

export function toggleMuted() {
  muted = !muted;
}

export function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (globalThis.AudioContext || globalThis.webkitAudioContext)(); } catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
    // iOS additionally wants a sound started inside the gesture before it
    // will treat the context as unlocked: one silent sample does it.
    try {
      const src = audioCtx.createBufferSource();
      src.buffer = audioCtx.createBuffer(1, 1, 22050);
      src.connect(audioCtx.destination);
      src.start(0);
    } catch { /* not a browser that minds */ }
  }
}

// True when the context exists but the browser is still holding it shut:
// an unlock was attempted without a real gesture — a controller press is
// the usual way, since the pad's synthetic key events are not "activation"
// — so the HUD can ask for a click. False before any attempt and after one
// that worked.
export function audioSuspended() {
  return !!audioCtx && audioCtx.state === 'suspended';
}

function beep(freq, endFreq, dur, type, vol, delay) {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime + (delay || 0);
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type || 'square';
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
  g.gain.setValueAtTime(vol || 0.2, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function sfx(name, arg) {
  const mul = arg ?? 1; // pitch multiplier (the Great Clock chime: -6% per mainspring cut)
  switch (name) {
    case 'jump':  beep(300, 560, 0.12, 'square', 0.12); break;
    case 'stomp': beep(220, 70, 0.15, 'triangle', 0.3); break;
    case 'box':   beep(160, 55, 0.12, 'square', 0.25); break;
    case 'gem':   beep(880, 1500, 0.1, 'sine', 0.2); break;
    case 'heart': beep(520, 880, 0.12, 'sine', 0.22); break;
    case 'heartcap': [520, 880, 1320].forEach((f, i) => beep(f, f, 0.14, 'sine', 0.22, i * 0.08)); break;
    case 'hurt':  beep(320, 90, 0.22, 'sawtooth', 0.25); break;
    case 'land':  beep(120, 55, 0.06, 'triangle', 0.15); break;
    case 'die':   beep(400, 70, 0.4, 'sawtooth', 0.25); break;
    case 'fire':  beep(700, 300, 0.07, 'square', 0.1); break;
    case 'thwack': beep(600, 100, 0.1, 'square', 0.18); break;
    case 'bow':   beep(440, 660, 0.15, 'triangle', 0.25); break;
    case 'boots': [330, 440, 660].forEach((f, i) => beep(f, f, 0.09, 'triangle', 0.16, i * 0.07)); break;
    case 'magnet': beep(600, 1200, 0.15, 'sine', 0.18); break;
    case 'sunbeam': [784, 1047, 1568].forEach((f, i) => beep(f, f, 0.18, 'sine', 0.2, i * 0.06)); break;
    case 'star': beep(880, 1760, 0.14, 'triangle', 0.16); beep(1320, 2637, 0.16, 'sine', 0.12, 0.05); break;
    case 'hop': beep(320, 640, 0.09, 'sine', 0.15); break;
    case 'reflect': beep(1400, 700, 0.09, 'square', 0.1); break;
    case 'lantern': beep(520, 1040, 0.18, 'triangle', 0.12); break;
    case 'grow':  beep(220, 660, 0.22, 'triangle', 0.3); break;
    case 'win':   [523, 659, 784, 1047].forEach((f, i) => beep(f, f, 0.12, 'square', 0.18, i * 0.09)); break;
    case 'fireball': beep(280, 140, 0.18, 'sawtooth', 0.1); break;
    case 'fizzle': beep(180, 60, 0.12, 'triangle', 0.08); break;
    case 'boss': beep(140, 40, 0.5, 'sawtooth', 0.25); break;
    case 'growl': beep(70, 20, 0.6, 'sawtooth', 0.3); beep(50, 18, 0.7, 'square', 0.15, 0.05); break; // the Weaver Queen: the dragon death an octave down
    case 'spit': beep(300, 150, 0.15, 'sine', 0.18); break; // the Queen's wet whoosh
    case 'bossHit': beep(200, 55, 0.22, 'sawtooth', 0.24); break;
    case 'roar': beep(90, 180, 0.5, 'sawtooth', 0.22); beep(60, 120, 0.5, 'square', 0.12); break;
    case 'breath': beep(300, 80, 0.9, 'sawtooth', 0.2); beep(150, 60, 0.9, 'square', 0.14); break;
    case 'pearl': [1318, 1760].forEach((f, i) => beep(f, f, 0.14, 'sine', 0.2, i * 0.09)); break;
    case 'seal': beep(160, 35, 0.45, 'square', 0.28); beep(900, 250, 0.08, 'square', 0.1, 0.03); break;
    case 'gate': [392, 587].forEach((f, i) => beep(f, f, 0.22, 'sine', 0.2, i * 0.14)); break;
    case 'cast': [523, 784, 1047].forEach((f, i) => beep(f, f, 0.12, 'sine', 0.16, i * 0.06)); break;
    case 'whoosh': beep(260, 520, 0.22, 'sine', 0.05); break;
    case 'flightEnd': beep(240, 90, 0.18, 'triangle', 0.12); break;
    case 'key': [1047, 1568].forEach((f, i) => beep(f, f, 0.12, 'sine', 0.18, i * 0.07)); break;
    case 'relic': [1318, 1976].forEach((f, i) => beep(f, f, 0.12, 'sine', 0.2, i * 0.07)); break; // the key, one step brighter
    case 'rustle': beep(170, 90, 0.05, 'square', 0.12); beep(200, 110, 0.05, 'square', 0.12, 0.06); break; // two quick low blips
    case 'buzz': beep(140, 110, 0.07, 'square', 0.14); beep(150, 120, 0.07, 'square', 0.14, 0.08); break; // low square wobble, two beeps
    case 'clank': beep(160, 55, 0.25, 'square', 0.28); beep(90, 40, 0.18, 'square', 0.14, 0.06); break;
    case 'grant': [587, 880, 1175].forEach((f, i) => beep(f, f, 0.14, 'sine', 0.2, i * 0.08)); break;
    case 'gear': beep(120, 80, 0.08, 'square', 0.3); beep(90, 60, 0.08, 'square', 0.28, 0.1); break; // the winch: two low clunks
    case 'spin': beep(300, 900, 0.25, 'sine', 0.15); break; // the wheel catching speed
    case 'creak': beep(200, 90, 0.3, 'sawtooth', 0.12); beep(180, 80, 0.3, 'sawtooth', 0.1, 0.32); break; // the bridge lowering
    case 'pop': beep(500, 900, 0.05, 'square', 0.2); beep(120, 60, 0.08, 'triangle', 0.25, 0.02); break; // the bubble/sac pops
    case 'puff': beep(100, 140, 0.09, 'sine', 0.12); beep(120, 90, 0.1, 'sine', 0.1, 0.09); break; // thread puffs away
    case 'gust': beep(140, 60, 0.6, 'sawtooth', 0.12); break; // the peak wind: one low howl per cycle
    case 'snort': beep(200, 90, 0.2, 'square', 0.2); break; // the war-pig's snort (the swoop tell + the cone)
    case 'rainbow': [523, 659, 784, 1047].forEach((f, i) => beep(f, f, 0.2, 'sine', 0.18, i * 0.09)); beep(1319, 2093, 0.5, 'sine', 0.1, 0.36); break; // the rainbow lights: the game's first good chord
    case 'slither': beep(600, 900, 0.15, 'square', 0.12); break; // the snake's hiss-trill
    case 'rumble': beep(70, 35, 0.8, 'sawtooth', 0.25); beep(50, 25, 0.9, 'square', 0.15, 0.1); break;
    case 'thud': beep(90, 40, 0.2, 'triangle', 0.35); break;
    case 'clatter': beep(300, 120, 0.15, 'square', 0.18); beep(200, 80, 0.12, 'square', 0.12, 0.05); break;
    case 'crack': beep(180, 60, 0.12, 'square', 0.3); beep(900, 400, 0.04, 'square', 0.08); break; // brick cracking
    case 'crumble': beep(90, 30, 0.5, 'sawtooth', 0.3); beep(55, 25, 0.6, 'square', 0.2, 0.12); beep(240, 90, 0.15, 'square', 0.16, 0.25); break; // wall section falling in
    case 'deflect': beep(700, 1100, 0.12, 'square', 0.18); break; // metal ping off the shield
    case 'chime': beep(880 * mul, 440 * mul, 0.5, 'sine', 0.18); beep(110 * mul, 110 * mul, 0.8, 'triangle', 0.08, 0.05); break; // the Great Clock: the bell + the low drone
    case 'chimeFar': beep(880 * mul, 440 * mul, 0.35, 'sine', 0.1); break; // the chime, heard out on the skybridge
    case 'spring': beep(1200, 300, 0.25, 'square', 0.2); break; // a mainspring cut free
    case 'toll': beep(140, 70, 1.6, 'sine', 0.3); break; // the clock's last beat (the Warden's rest)
    case 'flap': beep(250, 800, 0.09, 'triangle', 0.12); break; // bat swoop start: quiet whoosh
    case 'hum': beep(55 * mul, 55 * mul, 1.8, 'sine', 0.05); break; // level 9's drone: a quiet beat every 2 s, a step higher per thaw
    case 'melt': beep(660, 220, 1.8, 'sine', 0.14); break; // the level's name, made audible
    case 'splash': beep(180, 900, 0.18, 'sine', 0.14); beep(1200, 400, 0.12, 'triangle', 0.1, 0.06); break; // water again
    case 'dialog': beep(740, 980, 0.05, 'square', 0.06); break;
  }
}

// Default fx context: wires game logic to the WebAudio backend.
// Logic modules receive an fx object and call fx.play(name);
// tests can pass a recorder instead.
export const fx = { play: sfx };
