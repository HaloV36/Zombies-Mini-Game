import * as THREE from 'three';

export const SIDE_ROOM = { west: -40, east: -16, north: -12, south: 12, doorZ: 5, doorHalfWidth: 3 };

// Route through both sides of the open alley before pursuing inside the other room.
// Staying on this line until clear prevents corners catching the zombie capsule.
export function pursuitTarget(from: THREE.Vector3, target: THREE.Vector3) {
  const fromAnnex = from.x < -16;
  const targetAnnex = target.x < -16;
  const clearOfDivider = fromAnnex ? from.x <= -17.6 : from.x >= -14.4;
  if (fromAnnex === targetAnnex && clearOfDivider) return target;
  if (fromAnnex === targetAnnex && Math.abs(target.z - 5) < 1.5) return target;
  const entering = targetAnnex;
  const approachX = entering ? -13 : -19;
  const exitX = entering ? -19 : -13;
  const beforeDoor = entering ? from.x > -14 : from.x < -18;
  if (beforeDoor && Math.abs(from.z - 5) > 0.7) return new THREE.Vector3(approachX, target.y, 5);
  return new THREE.Vector3(exitX, target.y, 5);
}
