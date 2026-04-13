import Phaser from "phaser";
import type { EchoAction, EchoRecording } from "../types";
import { lerp } from "../utils/math";

export class EchoClone extends Phaser.GameObjects.Sprite {
  private elapsed = 0;
  private snapshotIndex = 0;
  private actionIndex = 0;
  private finished = false;

  constructor(scene: Phaser.Scene, private readonly recording: EchoRecording) {
    const start = recording.snapshots[0];
    super(scene, start.x, start.y, "echo");
    scene.add.existing(this);
    this.setDepth(28);
    this.setBlendMode(Phaser.BlendModes.ADD);
    this.setAlpha(0.9);
  }

  updateReplay(deltaMs: number): EchoAction[] {
    if (this.finished) {
      return [];
    }

    this.elapsed += deltaMs;
    const firedActions: EchoAction[] = [];

    while (
      this.actionIndex < this.recording.actions.length &&
      this.recording.actions[this.actionIndex].time <= this.elapsed
    ) {
      firedActions.push(this.recording.actions[this.actionIndex]);
      this.actionIndex += 1;
    }

    const snapshots = this.recording.snapshots;
    while (
      this.snapshotIndex < snapshots.length - 2 &&
      snapshots[this.snapshotIndex + 1].time <= this.elapsed
    ) {
      this.snapshotIndex += 1;
    }

    const current = snapshots[this.snapshotIndex];
    const next = snapshots[Math.min(this.snapshotIndex + 1, snapshots.length - 1)];
    const span = Math.max(1, next.time - current.time);
    const alpha = Phaser.Math.Clamp((this.elapsed - current.time) / span, 0, 1);

    this.x = lerp(current.x, next.x, alpha);
    this.y = lerp(current.y, next.y, alpha);
    this.rotation = Math.atan2(next.y - current.y, next.x - current.x) + Math.PI / 2;
    this.scale = current.stealth ? 0.88 : 1;
    this.alpha = current.stealth ? 0.58 : 0.88;

    if (this.elapsed >= this.recording.duration) {
      this.finished = true;
    }

    return firedActions;
  }

  isFinished(): boolean {
    return this.finished;
  }
}
