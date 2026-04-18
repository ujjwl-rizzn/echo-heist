import { SAVE_VERSION, STORAGE_KEY } from "../constants";
import { defaultSettings } from "../data/settings";
import type { LevelBest, LevelResult, RewardMeta, SaveData, SettingsData } from "../types";

export class SaveManager {
  private data: SaveData;

  constructor() { this.data = this.load(); }

  getData():        SaveData     { return JSON.parse(JSON.stringify(this.data)) as SaveData; }
  getSettings():    SettingsData { return { ...this.data.settings }; }
  getRewardMeta():  RewardMeta   { return { ...this.data.rewardMeta }; }

  updateSettings(next: SettingsData): void { this.data.settings = { ...next }; this.persist(); }

  getLevelBest(levelId: string): LevelBest {
    return { ...(this.data.levels[levelId] ?? this.emptyBest()) };
  }

  isLevelUnlocked(order: number): boolean { return order <= this.data.unlockedLevelOrder; }

  recordResult(result: LevelResult, levelOrder: number): void {
    const prev = this.data.levels[result.levelId] ?? this.emptyBest();
    const bestMs   = prev.bestTimeMs === null ? result.timeMs : Math.min(prev.bestTimeMs, result.timeMs);
    const bestRank = prev.bestRank  === null ? result.rank  : this.betterRank(result.rank, prev.bestRank);
    this.data.levels[result.levelId] = { completed: true, bestTimeMs: bestMs, bestRank };
    this.data.totalCredits       += result.credits;
    this.data.unlockedLevelOrder  = Math.max(this.data.unlockedLevelOrder, levelOrder + 1);
    this.persist();
  }

  grantRewardedCredits(amount: number, source: "menu-drop" | "result-boost", at = Date.now()): number {
    this.data.totalCredits += amount;
    this.data.rewardMeta.totalClaims++;
    this.data.rewardMeta.totalCreditsEarned += amount;
    if (source === "menu-drop") this.data.rewardMeta.lastSponsorDropAt = at;
    this.persist();
    return this.data.totalCredits;
  }

  private load(): SaveData {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.fresh();
      const p = JSON.parse(raw) as Partial<SaveData>;
      if (p.version !== SAVE_VERSION) return this.fresh();
      return {
        version: SAVE_VERSION,
        unlockedLevelOrder: p.unlockedLevelOrder ?? 0,
        totalCredits:       p.totalCredits ?? 0,
        levels:             p.levels ?? {},
        settings: { ...defaultSettings, ...(p.settings ?? {}) },
        rewardMeta: {
          totalClaims:        p.rewardMeta?.totalClaims        ?? 0,
          totalCreditsEarned: p.rewardMeta?.totalCreditsEarned ?? 0,
          lastSponsorDropAt:  p.rewardMeta?.lastSponsorDropAt  ?? null
        }
      };
    } catch { return this.fresh(); }
  }

  private fresh(): SaveData {
    return {
      version: SAVE_VERSION, unlockedLevelOrder: 0, totalCredits: 0,
      levels: {}, settings: { ...defaultSettings },
      rewardMeta: { totalClaims: 0, totalCreditsEarned: 0, lastSponsorDropAt: null }
    };
  }

  private emptyBest(): LevelBest { return { completed: false, bestTimeMs: null, bestRank: null }; }

  private betterRank(a: LevelResult["rank"], b: LevelResult["rank"]): LevelResult["rank"] {
    return ["S","A","B","C"].indexOf(a) < ["S","A","B","C"].indexOf(b) ? a : b;
  }

  private persist(): void {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }
}
