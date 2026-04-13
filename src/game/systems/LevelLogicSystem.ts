import type { LevelDefinition } from "../types";

export class LevelLogicSystem {
  private readonly channels = new Map<string, boolean>();
  private readonly collectedShards = new Set<string>();
  private coreCollected = false;

  constructor(private readonly level: LevelDefinition) {
    Object.entries(level.initialChannels ?? {}).forEach(([key, value]) => {
      this.channels.set(key, value);
    });
  }

  getChannel(name?: string): boolean {
    if (!name) {
      return false;
    }
    return this.channels.get(name) ?? false;
  }

  setChannel(name: string, value: boolean): void {
    this.channels.set(name, value);
  }

  toggleChannel(name: string): boolean {
    const value = !this.getChannel(name);
    this.channels.set(name, value);
    return value;
  }

  hasCore(): boolean {
    return this.coreCollected;
  }

  collectCore(): void {
    this.coreCollected = true;
  }

  collectShard(id: string): boolean {
    if (this.collectedShards.has(id)) {
      return false;
    }
    this.collectedShards.add(id);
    return true;
  }

  getCollectedCount(): number {
    return this.collectedShards.size;
  }

  isExitReady(): boolean {
    return this.level.exit.requiresCore === false ? true : this.coreCollected;
  }

  getObjectiveText(): string {
    if (!this.coreCollected) {
      return "Scout, sync an echo, and steal the data core.";
    }

    return "Data core secured. Reach the exit gate.";
  }
}
