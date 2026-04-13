import type { LevelDefinition, LevelResult, LevelRunStats, Rank } from "../types";

export class ScoreSystem {
  static createResult(
    level: LevelDefinition,
    clearTimeMs: number,
    stats: LevelRunStats,
    nextLevelId?: string
  ): LevelResult {
    const safeTimeBonus = Math.max(0, Math.round((level.timeTargets.b * 1000 - clearTimeMs) / 12));
    const stealthBonus = Math.max(0, 320 - stats.detections * 130);
    const echoBonus = Math.max(0, (level.parEchoes + 1 - stats.echoUses) * 80);
    const pickupBonus = stats.collectibles * 110;
    const bonusScore = safeTimeBonus + stealthBonus + echoBonus + pickupBonus;
    const totalScore = 1000 + bonusScore;

    let rank: Rank = "C";
    if (clearTimeMs <= level.timeTargets.s * 1000 && stats.detections === 0) {
      rank = "S";
    } else if (clearTimeMs <= level.timeTargets.a * 1000 && stats.detections <= 1) {
      rank = "A";
    } else if (clearTimeMs <= level.timeTargets.b * 1000 && stats.detections <= 2) {
      rank = "B";
    }

    const creditsEarned = { S: 320, A: 240, B: 170, C: 110 }[rank] + stats.collectibles * 30;

    return {
      levelId: level.id,
      levelName: level.name,
      clearTimeMs,
      detections: stats.detections,
      echoUses: stats.echoUses,
      collectibles: stats.collectibles,
      bonusScore,
      totalScore,
      creditsEarned,
      rank,
      nextLevelId
    };
  }
}
