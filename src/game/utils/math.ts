import Phaser from 'phaser';

export function clamp(value: number, min: number, max: number): number {
  return Phaser.Math.Clamp(value, min, max);
}

export function lerp(start: number, end: number, amount: number): number {
  return Phaser.Math.Linear(start, end, amount);
}

export function pulse(time: number, speed: number, min: number, max: number): number {
  const alpha = (Math.sin(time * speed) + 1) * 0.5;
  return lerp(min, max, alpha);
}

export function formatScore(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function randomSpawnPoint(
  width: number,
  height: number,
  padding: number,
): Phaser.Math.Vector2 {
  const edge = Phaser.Math.Between(0, 3);

  if (edge === 0) {
    return new Phaser.Math.Vector2(Phaser.Math.Between(-padding, width + padding), -padding);
  }

  if (edge === 1) {
    return new Phaser.Math.Vector2(width + padding, Phaser.Math.Between(-padding, height + padding));
  }

  if (edge === 2) {
    return new Phaser.Math.Vector2(Phaser.Math.Between(-padding, width + padding), height + padding);
  }

  return new Phaser.Math.Vector2(-padding, Phaser.Math.Between(-padding, height + padding));
}

export function weightedPick<T>(entries: Array<{ value: T; weight: number }>): T {
  if (entries.length === 0) {
    throw new Error('weightedPick requires at least one entry');
  }

  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  const roll = Math.random() * total;
  let cursor = 0;

  for (const entry of entries) {
    cursor += Math.max(0, entry.weight);
    if (roll <= cursor) {
      return entry.value;
    }
  }

  return entries[entries.length - 1]?.value ?? entries[0].value;
}
