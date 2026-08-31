// The released war-pig (level 7, M7): when the wizard dies the pig
// stands where the fight ended, shakes off the snow (stand, 0.5 s),
// then walks west at 40 px/s. Past the arena edge (x < 5450) it walks
// off the level's business — lvl.pig goes back to null. Release, not a
// kill: the creature is the boss's, not the enemy's.
export function updatePig(lvl, dt, fx) {
  const pig = lvl.pig;
  if (!pig) return;
  if (pig.state === 'stand') {
    pig.t -= dt;
    if (pig.t <= 0) pig.state = 'walk';
  } else if (pig.state === 'walk') {
    pig.x -= 40 * dt; // west, back down the mountain
    if (pig.x < 5450) { pig.state = 'gone'; lvl.pig = null; }
  }
}
