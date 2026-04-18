import { levels } from "../data/levels";
import type { LevelDefinition } from "../types";

export class LevelManager {
  getLevels(): LevelDefinition[] { return JSON.parse(JSON.stringify(levels)) as LevelDefinition[]; }
  getLevelById(id: string): LevelDefinition {
    const lv = levels.find(l => l.id === id);
    if (!lv) throw new Error(`Unknown level: ${id}`);
    return JSON.parse(JSON.stringify(lv)) as LevelDefinition;
  }
  getStartLevelId(): string { return levels[0]?.id ?? ""; }
  getNextLevelId(id: string): string | null {
    const i = levels.findIndex(l => l.id === id);
    if (i < 0 || i >= levels.length - 1) return null;
    return levels[i + 1]?.id ?? null;
  }
}
