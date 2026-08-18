// Camera: smoothed follow with clamping, plus screen-shake state.
// Pure module: no DOM globals (viewport width and level are passed in).

export function createCamera() {
  return { x: 0, shake: 0, mag: 0 };
}

export function updateCamera(camera, player, lvl, viewW, dt) {
  const target = player.x + player.w / 2 - viewW / 2;
  const t = 1 - Math.exp(-dt * 8); // frame-rate independent ease
  camera.x += (target - camera.x) * t;
  camera.x = Math.max(0, Math.min(camera.x, lvl.width - viewW));
}

export function shake(cam, mag, dur) {
  cam.mag = Math.max(cam.mag, mag);
  cam.shake = Math.max(cam.shake, dur);
}
