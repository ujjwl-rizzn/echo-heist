import { SAVE_VERSION, STORAGE_KEY } from "../constants";
import { defaultSettings } from "../data/settings";
import type { LevelBest, LevelResult, RewardMeta, SaveData, SettingsData } from "../types";

export class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  getData(): SaveData {
    return JSON.parse(JSON.stringify(this.data)) as SaveData;
  }

  getSettings(): SettingsData {
    return { ...this.data.settings };
  }

  getRewardMeta(): RewardMeta {
    return { ...this.data.rewardMeta };
  }

  updateSettings(next: SettingsData): void {
    this.data.settings = { ...next };
    this.persist();
  }

  getLevelBest(levelId: string): LevelBest {
    return { ...(this.data.levels[levelId] ?? this.createEmptyBest()) };
  }

  isLevelUnlocked(order: number): boolean {
    return order <= this.data.unlockedLevelOrder;
  }

  recordResult(result: LevelResult, levelOrder: number): void {
    const existing = this.data.levels[result.levelId] ?? this.createEmptyBest();
    const bestTimeMs =
      existing.bestTimeMs === null ? result.timeMs : Math.min(existing.bestTimeMs, result.timeMs);

    const bestRank =
      existing.bestRank === null
        ? result.rank
        : this.compareRanks(result.rank, existing.bestRank) < 0
          ? result.rank
          : existing.bestRank;

    this.data.levels[result.levelId] = {
      completed: true,
      bestTimeMs,
      bestRank
    };

    this.data.totalCredits += result.credits;
    this.data.unlockedLevelOrder = Math.max(this.data.unlockedLevelOrder, levelOrder + 1);
    this.persist();
  }

  grantRewardedCredits(amount: number, source: "menu-drop" | "result-boost", claimedAt = Date.now()): number {
    this.data.totalCredits += amount;
    this.data.rewardMeta.totalClaims += 1;
    this.data.rewardMeta.totalCreditsEarned += amount;
    if (source === "menu-drop") {
      this.data.rewardMeta.lastSponsorDropAt = claimedAt;
    }
    this.persist();
    return this.data.totalCredits;
  }

  private load(): SaveData {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return this.createFresh();
      }

      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (parsed.version !== SAVE_VERSION) {
        return this.createFresh();
      }

      return {
        version: SAVE_VERSION,
        unlockedLevelOrder: parsed.unlockedLevelOrder ?? 0,
        totalCredits: parsed.totalCredits ?? 0,
        levels: parsed.levels ?? {},
        settings: {
          ...defaultSettings,
          ...(parsed.settings ?? {})
        },
        rewardMeta: {
          totalClaims: parsed.rewardMeta?.totalClaims ?? 0,
          totalCreditsEarned: parsed.rewardMeta?.totalCreditsEarned ?? 0,
          lastSponsorDropAt: parsed.rewardMeta?.lastSponsorDropAt ?? null
        }
      };
    } catch {
      return this.createFresh();
    }
  }

  private createFresh(): SaveData {
    return {
      version: SAVE_VERSION,
      unlockedLevelOrder: 0,
      totalCredits: 0,
      levels: {},
      settings: { ...defaultSettings },
      rewardMeta: {
        totalClaims: 0,
        totalCreditsEarned: 0,
        lastSponsorDropAt: null
      }
    };
  }

  private createEmptyBest(): LevelBest {
    return {
      completed: false,
      bestTimeMs: null,
      bestRank: null
    };
  }

  private compareRanks(a: LevelResult["rank"], b: LevelResult["rank"]): number {
    const order = ["S", "A", "B", "C"];
    return order.indexOf(a) - order.indexOf(b);
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore storage failures to keep the game playable in privacy-restricted browsers.
    }
  }
}
