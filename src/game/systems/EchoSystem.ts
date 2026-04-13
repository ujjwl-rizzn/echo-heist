import Phaser from "phaser";
import { ECHO } from "../constants";
import { EchoClone } from "../entities/EchoClone";
import type { EchoAction, EchoRecording, EchoSnapshot } from "../types";
import { Player } from "../entities/Player";

export class EchoSystem {
  private readonly snapshots: EchoSnapshot[] = [];
  private readonly actions: EchoAction[] = [];
  private clone?: EchoClone;
  private elapsedMs = 0;
  private sampleAccumulator = 0;
  private cooldownRemaining = 0;
  private uses = 0;

  update(
    deltaMs: number,
    player: Player,
    onCloneInteract: (x: number, y: number) => void
  ): void {
    this.elapsedMs += deltaMs;
    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - deltaMs);
    this.sampleAccumulator += deltaMs;

    while (this.sampleAccumulator >= ECHO.SAMPLE_MS) {
      this.snapshots.push({
        time: this.elapsedMs,
        x: player.x,
        y: player.y,
        stealth: player.isStealth()
      });
      this.sampleAccumulator -= ECHO.SAMPLE_MS;
    }

    this.pruneBuffer();

    if (this.clone) {
      const actions = this.clone.updateReplay(deltaMs);
      actions.forEach(() => onCloneInteract(this.clone?.x ?? 0, this.clone?.y ?? 0));

      if (this.clone.isFinished()) {
        this.clone.destroy();
        this.clone = undefined;
      }
    }
  }

  recordInteract(): void {
    this.actions.push({
      time: this.elapsedMs,
      type: "interact"
    });
    this.pruneBuffer();
  }

  deploy(scene: Phaser.Scene): boolean {
    if (this.cooldownRemaining > 0 || this.clone || this.snapshots.length < 2) {
      return false;
    }

    const duration = this.snapshots[this.snapshots.length - 1].time - this.snapshots[0].time;
    if (duration < ECHO.MIN_RECORD_MS) {
      return false;
    }

    const startTime = this.snapshots[0].time;
    const recording: EchoRecording = {
      startedAt: startTime,
      duration,
      snapshots: this.snapshots.map((entry) => ({
        ...entry,
        time: entry.time - startTime
      })),
      actions: this.actions
        .filter((entry) => entry.time >= startTime)
        .map((entry) => ({ ...entry, time: entry.time - startTime }))
    };

    this.clone = new EchoClone(scene, recording);
    this.cooldownRemaining = ECHO.COOLDOWN_MS;
    this.snapshots.length = 0;
    this.actions.length = 0;
    this.sampleAccumulator = 0;
    this.uses += 1;
    return true;
  }

  getCharge(): number {
    const recordCharge = Math.min(1, this.getRecordedDuration() / ECHO.BUFFER_MS);
    const cooldownCharge =
      this.cooldownRemaining <= 0 ? 1 : 1 - this.cooldownRemaining / ECHO.COOLDOWN_MS;
    return Math.min(recordCharge, cooldownCharge);
  }

  isReady(): boolean {
    return (
      !this.clone &&
      this.cooldownRemaining <= 0 &&
      this.getRecordedDuration() >= ECHO.MIN_RECORD_MS
    );
  }

  getClone(): EchoClone | undefined {
    return this.clone;
  }

  getUses(): number {
    return this.uses;
  }

  private getRecordedDuration(): number {
    if (this.snapshots.length < 2) {
      return 0;
    }
    return this.snapshots[this.snapshots.length - 1].time - this.snapshots[0].time;
  }

  private pruneBuffer(): void {
    const minTime = this.elapsedMs - ECHO.BUFFER_MS;
    while (this.snapshots.length > 0 && this.snapshots[0].time < minTime) {
      this.snapshots.shift();
    }
    while (this.actions.length > 0 && this.actions[0].time < minTime) {
      this.actions.shift();
    }
  }
}
