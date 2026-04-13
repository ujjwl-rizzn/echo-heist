import { PLAYER } from "../constants";
import type { Vector2Like } from "../types";
import { distanceBetween } from "../utils/math";
import { DoorSwitch } from "../entities/DoorSwitch";
import { Terminal } from "../entities/Terminal";

export class InteractionSystem {
  constructor(
    private readonly switches: DoorSwitch[],
    private readonly terminals: Terminal[]
  ) {}

  getPrompt(position: Vector2Like): string {
    const target = this.findClosest(position);
    return target?.prompt ?? "Stay unseen. Echo can replay your last route.";
  }

  triggerNearest(position: Vector2Like, now: number): boolean {
    const target = this.findClosest(position);
    if (!target) {
      return false;
    }

    if (target.type === "switch") {
      target.ref.interact();
    } else {
      target.ref.startHack(now);
    }

    return true;
  }

  private findClosest(position: Vector2Like):
    | { type: "switch"; ref: DoorSwitch; prompt: string; distance: number }
    | { type: "terminal"; ref: Terminal; prompt: string; distance: number }
    | undefined {
    const candidates: Array<
      | { type: "switch"; ref: DoorSwitch; prompt: string; distance: number }
      | { type: "terminal"; ref: Terminal; prompt: string; distance: number }
    > = [];

    this.switches.forEach((entry) => {
      if (entry.canInteract(position, PLAYER.INTERACT_RANGE)) {
        candidates.push({
          type: "switch",
          ref: entry,
          prompt: entry.getPrompt(),
          distance: distanceBetween(position, entry.getPosition())
        });
      }
    });

    this.terminals.forEach((entry) => {
      if (entry.canInteract(position, PLAYER.INTERACT_RANGE)) {
        candidates.push({
          type: "terminal",
          ref: entry,
          prompt: entry.getPrompt(),
          distance: distanceBetween(position, entry.getPosition())
        });
      }
    });

    candidates.sort((a, b) => a.distance - b.distance);
    return candidates[0];
  }
}
