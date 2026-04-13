import { levels } from "../src/game/data/levels.ts";

const PLAYER_HITBOX_SIZE = 18;
const CORE_INTERACT_SIZE = 62;

const bodyRect = (x, y, size = PLAYER_HITBOX_SIZE) => ({
  x: x - size / 2,
  y: y - size / 2,
  w: size,
  h: size
});

const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const pathExists = (level, start, goalRect, openChannels = []) => {
  const closedDoors = level.doors.filter((door) => !openChannels.includes(door.channel));
  const blockers = [...level.walls, ...closedDoors];
  const step = 8;
  const margin = PLAYER_HITBOX_SIZE / 2;
  const queue = [[start.x, start.y]];
  const visited = new Set([`${Math.round(start.x / step)}:${Math.round(start.y / step)}`]);
  const directions = [
    [step, 0],
    [-step, 0],
    [0, step],
    [0, -step]
  ];

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    if (overlaps(bodyRect(x, y), goalRect)) {
      return true;
    }

    for (const [dx, dy] of directions) {
      const nextX = x + dx;
      const nextY = y + dy;

      if (
        nextX < margin ||
        nextY < margin ||
        nextX > level.world.width - margin ||
        nextY > level.world.height - margin
      ) {
        continue;
      }

      const rect = bodyRect(nextX, nextY);
      if (blockers.some((blocker) => overlaps(rect, blocker))) {
        continue;
      }

      const key = `${Math.round(nextX / step)}:${Math.round(nextY / step)}`;
      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      queue.push([nextX, nextY]);
    }
  }

  return false;
};

const failures = [];

for (const level of levels) {
  const openChannels = [...new Set(level.doors.map((door) => door.channel))];
  const initialOpenChannels = Object.entries(level.initialChannels)
    .filter(([, active]) => active)
    .map(([channel]) => channel);
  const coreRect = {
    x: level.core.x - CORE_INTERACT_SIZE / 2,
    y: level.core.y - CORE_INTERACT_SIZE / 2,
    w: CORE_INTERACT_SIZE,
    h: CORE_INTERACT_SIZE
  };

  const canReachCore = pathExists(level, level.spawn, coreRect, openChannels);
  const canReachExit = pathExists(level, level.core, level.exit, openChannels);
  const canSkipBreach = level.requiresBreach ? pathExists(level, level.spawn, coreRect, initialOpenChannels) : false;

  if (!canReachCore || !canReachExit || canSkipBreach) {
    failures.push({
      levelId: level.id,
      canReachCore,
      canReachExit,
      canSkipBreach
    });
  }
}

if (failures.length > 0) {
  console.error("Level validation failed:");
  failures.forEach((failure) => console.error(`- ${failure.levelId}:`, failure));
  process.exit(1);
}

console.log(`Validated ${levels.length} levels. Basic traversal is possible in every room.`);
