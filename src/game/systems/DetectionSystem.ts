import Phaser from "phaser";
import { DETECTION } from "../constants";
import { CameraSensor } from "../entities/CameraSensor";
import { Guard } from "../entities/Guard";
import { LaserGate } from "../entities/LaserGate";
import { Player } from "../entities/Player";
import type { RectLike, Vector2Like } from "../types";
import { angleWrap, lineIntersectsRect } from "../utils/math";

interface DetectionUpdateArgs {
  timeMs: number;
  player: Player;
  guards: Guard[];
  cameras: CameraSensor[];
  lasers: LaserGate[];
  echoPosition?: Vector2Like;
  occluders: RectLike[];
  onPlayerDetected: () => void;
}

export class DetectionSystem {
  private nextDetectionAllowedMs = 0;

  update(args: DetectionUpdateArgs): void {
    const playerPosition = { x: args.player.x, y: args.player.y };
    const visibility = args.player.isStealth() ? 0.72 : 1;

    args.guards.forEach((guard) => {
      if (
        this.canSeeTarget(
          guard.getVisionOrigin(),
          guard.getFacingAngle(),
          guard.getVisionRange() * visibility,
          guard.getVisionHalfAngle(),
          playerPosition,
          args.occluders
        )
      ) {
        guard.setChaseTarget(playerPosition);
        this.raiseDetection(args.timeMs, args.onPlayerDetected);
      } else if (
        args.echoPosition &&
        this.canSeeTarget(
          guard.getVisionOrigin(),
          guard.getFacingAngle(),
          guard.getVisionRange(),
          guard.getVisionHalfAngle(),
          args.echoPosition,
          args.occluders
        )
      ) {
        guard.setInvestigateTarget(args.echoPosition);
      }
    });

    args.cameras.forEach((camera) => {
      if (!camera.isActive()) {
        return;
      }

      if (
        this.canSeeTarget(
          camera.getVisionOrigin(),
          camera.getAngle(),
          camera.getRange() * visibility,
          Phaser.Math.DegToRad(18),
          playerPosition,
          args.occluders
        )
      ) {
        this.raiseDetection(args.timeMs, args.onPlayerDetected);
      }
    });

    args.lasers.forEach((laser) => {
      if (laser.contains(playerPosition)) {
        this.raiseDetection(args.timeMs, args.onPlayerDetected);
      }
    });
  }

  private raiseDetection(timeMs: number, onPlayerDetected: () => void): void {
    if (timeMs < this.nextDetectionAllowedMs) {
      return;
    }

    this.nextDetectionAllowedMs = timeMs + DETECTION.ALARM_MS * 0.28;
    onPlayerDetected();
  }

  private canSeeTarget(
    origin: Vector2Like,
    facingAngle: number,
    range: number,
    halfAngle: number,
    target: Vector2Like,
    occluders: RectLike[]
  ): boolean {
    const distance = Phaser.Math.Distance.Between(origin.x, origin.y, target.x, target.y);
    if (distance > range) {
      return false;
    }

    const angleToTarget = Phaser.Math.Angle.Between(origin.x, origin.y, target.x, target.y);
    if (Math.abs(angleWrap(angleToTarget - facingAngle)) > halfAngle) {
      return false;
    }

    return !occluders.some((rect) => lineIntersectsRect(origin, target, rect));
  }
}
