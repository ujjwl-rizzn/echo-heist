import { levels } from "../data/levels";
import type { LevelDefinition } from "../types";

export class LevelManager {
  getLevels(): LevelDefinition[] {
    return JSON.parse(JSON.stringify(levels)) as LevelDefinition[];
  }

  getLevelById(levelId: string): LevelDefinition {
    const level = levels.find((entry) => entry.id === levelId);
    if (!level) {
      throw new Error(`Unknown level: ${levelId}`);
    }
    return JSON.parse(JSON.stringify(level)) as LevelDefinition;
  }

  getStartLevelId(): string {
    return levels[0]?.id ?? "";
  }

  getNextLevelId(levelId: string): string | null {
    const index = levels.findIndex((entry) => entry.id === levelId);
    if (index < 0 || index >= levels.length - 1) {
      return null;
    }
    return levels[index + 1]?.id ?? null;
  }
}
