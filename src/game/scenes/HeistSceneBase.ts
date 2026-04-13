import Phaser from "phaser";
import { DETECTION, SCENE_KEYS } from "../constants";
import { CameraSensor } from "../entities/CameraSensor";
import { CreditShard } from "../entities/CreditShard";
import { DataCore } from "../entities/DataCore";
import { Door } from "../entities/Door";
import { DoorSwitch } from "../entities/DoorSwitch";
import { Guard } from "../entities/Guard";
import { LaserGate } from "../entities/LaserGate";
import { Player } from "../entities/Player";
import { PressurePlate } from "../entities/PressurePlate";
import { Terminal } from "../entities/Terminal";
import { LevelLogicSystem } from "../systems/LevelLogicSystem";
import { InteractionSystem } from "../systems/InteractionSystem";
import { DetectionSystem } from "../systems/DetectionSystem";
import { EchoSystem } from "../systems/EchoSystem";
import { ScoreSystem } from "../systems/ScoreSystem";
import type { HudState, LevelDefinition, RectLike, Services, Vector2Like } from "../types";
import { createRoomBackdrop } from "../utils/backdrop";
import { getServices } from "../utils/services";
import { pointInRect, secondsToClock } from "../utils/math";

interface HeistSceneData {
  levelId?: string;
}

export abstract class HeistSceneBase extends Phaser.Scene {
  protected level!: LevelDefinition;
  protected services!: Services;

  private player!: Player;
  private guards: Guard[] = [];
  private camerasList: CameraSensor[] = [];
  private lasers: LaserGate[] = [];
  private doors: Door[] = [];
  private plates: PressurePlate[] = [];
  private switches: DoorSwitch[] = [];
  private terminals: Terminal[] = [];
  private shards: CreditShard[] = [];
  private core!: DataCore;
  private logic!: LevelLogicSystem;
  private interaction!: InteractionSystem;
  private detection!: DetectionSystem;
  private echoSystem!: EchoSystem;
  private wallRects: RectLike[] = [];
  private wallBlockers: Phaser.GameObjects.Rectangle[] = [];
  private exitGlow?: Phaser.GameObjects.Rectangle;
  private exitFill?: Phaser.GameObjects.Rectangle;
  private elapsedMs = 0;
  private footstepCooldownMs = 0;
  private detections = 0;
  private alarmTimerMs = 0;
  private coreCollectedFxPlayed = false;
  private shuttingDown = false;

  protected constructor(key: string) {
    super(key);
  }

  init(data: HeistSceneData): void {
    this.level = getServices(this).levelManager.getLevelById(data.levelId ?? this.getDefaultLevelId());
  }

  create(): void {
    this.services = getServices(this);
    const { inputManager, uiManager, saveManager } = this.services;
    const settings = saveManager.getSettings();

    this.elapsedMs = 0;
    this.footstepCooldownMs = 0;
    this.detections = 0;
    this.alarmTimerMs = 0;
    this.coreCollectedFxPlayed = false;
    this.shuttingDown = false;

    createRoomBackdrop(this, this.level.world.width, this.level.world.height, settings.reducedMotion);
    this.physics.world.setBounds(0, 0, this.level.world.width, this.level.world.height);
    this.cameras.main.fadeIn(260, 0, 0, 0);

    this.logic = new LevelLogicSystem(this.level);
    this.detection = new DetectionSystem();
    this.echoSystem = new EchoSystem();

    this.createWalls();
    this.createExitZone();
    this.createEntities();
    this.player = new Player(this, this.level.spawn.x, this.level.spawn.y);
    this.player.setDepth(30);
    this.createColliders();

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    inputManager.setInGameControlsVisible(true);
    uiManager.showHud(this.getHudState(""), {
      onPause: () => this.openPause()
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.services.inputManager.setInGameControlsVisible(true);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.shutdownScene();
    });
  }

  update(_time: number, delta: number): void {
    if (this.shuttingDown) {
      return;
    }

    this.elapsedMs += delta;
    this.footstepCooldownMs = Math.max(0, this.footstepCooldownMs - delta);
    this.alarmTimerMs = Math.max(0, this.alarmTimerMs - delta);

    this.handleInput(delta);
    this.updatePlates();
    this.updateTerminals();
    this.updateDoors();
    this.updateSecurity();
    this.updateCollections();
    this.updateExitState();
    this.updateHud();
  }

  protected abstract getDefaultLevelId(): string;

  private createWalls(): void {
    this.level.walls.forEach((wall) => {
      const centerX = wall.x + wall.w / 2;
      const centerY = wall.y + wall.h / 2;
      this.add.rectangle(centerX, centerY, wall.w + 12, wall.h + 12, 0x7ef6ff, 0.05);
      this.add.rectangle(centerX, centerY, wall.w, wall.h, 0x0b1729, 0.98);

      const blocker = this.add.rectangle(centerX, centerY, wall.w, wall.h, 0x000000, 0);
      this.physics.add.existing(blocker, true);
      this.wallRects.push({ ...wall });
      this.wallBlockers.push(blocker);
    });
  }

  private createExitZone(): void {
    const exit = this.level.exit;
    const centerX = exit.x + exit.w / 2;
    const centerY = exit.y + exit.h / 2;
    this.exitGlow = this.add
      .rectangle(centerX, centerY, exit.w + 20, exit.h + 20, 0xff3a88, 0.08)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.exitFill = this.add.rectangle(centerX, centerY, exit.w, exit.h, 0x152235, 0.65);
  }

  private createEntities(): void {
    this.doors = this.level.doors.map((data) => new Door(this, data));
    this.plates = this.level.plates.map((data) => new PressurePlate(this, data));
    this.switches = this.level.switches.map(
      (data) =>
        new DoorSwitch(this, data, (value) => {
          this.logic.setChannel(data.channel, value);
          this.services.audioManager.playDoor(value);
        })
    );
    this.terminals = this.level.terminals.map(
      (data) =>
        new Terminal(this, data, (value) => {
          this.logic.setChannel(data.channel, value);
        })
    );
    this.guards = this.level.guards.map((data) => new Guard(this, data));
    this.camerasList = this.level.cameras.map((data) => new CameraSensor(this, data));
    this.lasers = this.level.lasers.map((data) => new LaserGate(this, data));
    this.shards = this.level.collectibles.map((data) => new CreditShard(this, data));
    this.core = new DataCore(this, this.level.core);

    this.interaction = new InteractionSystem(this.switches, this.terminals);
  }

  private createColliders(): void {
    const bindBody = (actor: Phaser.Physics.Arcade.Sprite): void => {
      this.wallBlockers.forEach((wall) => {
        this.physics.add.collider(actor, wall);
      });
      this.doors.forEach((door) => {
        this.physics.add.collider(actor, door.getBlocker());
      });
    };

    this.guards.forEach((guard) => bindBody(guard));
    bindBody(this.player);
  }

  private handleInput(delta: number): void {
    const { inputManager, audioManager, saveManager } = this.services;

    if (inputManager.consumeAction("pause")) {
      this.openPause();
      return;
    }

    if (inputManager.consumeAction("restart")) {
      this.scene.restart({ levelId: this.level.id });
      return;
    }

    this.player.setStealth(inputManager.isStealthHeld());
    const move = inputManager.getMoveVector();
    const moved = this.player.move(move);

    if (moved && this.footstepCooldownMs <= 0) {
      audioManager.playFootstep(this.player.isStealth());
      this.footstepCooldownMs = this.player.isStealth() ? 320 : 220;
    }

    if (inputManager.consumeAction("interact")) {
      if (this.interaction.triggerNearest({ x: this.player.x, y: this.player.y }, this.time.now)) {
        this.echoSystem.recordInteract();
        audioManager.playHack();
      }
    }

    if (inputManager.consumeAction("echo") && this.echoSystem.deploy(this)) {
      audioManager.playEcho();
      if (!saveManager.getSettings().reducedMotion) {
        this.cameras.main.flash(180, 126, 246, 255, false);
      }
    }

    this.echoSystem.update(delta, this.player, (x, y) => {
      this.interaction.triggerNearest({ x, y }, this.time.now);
    });
  }

  private updatePlates(): void {
    const clone = this.echoSystem.getClone();
    const clonePosition = clone ? { x: clone.x, y: clone.y } : undefined;

    this.plates.forEach((plate) => {
      const active =
        plate.contains({ x: this.player.x, y: this.player.y }) ||
        (clonePosition ? plate.contains(clonePosition) : false);
      plate.setActive(active);
      this.logic.setChannel(plate.channel, active);
    });
  }

  private updateTerminals(): void {
    this.terminals.forEach((terminal) => {
      if (terminal.update(this.time.now)) {
        this.services.audioManager.playHack();
      }
    });
  }

  private updateDoors(): void {
    this.doors.forEach((door) => {
      const shouldOpen = door.shouldBeOpen(this.logic.getChannel(door.channel));
      const wasOpen = door.isOpen();
      door.setOpen(shouldOpen);
      if (wasOpen !== shouldOpen) {
        this.services.audioManager.playDoor(shouldOpen);
      }
    });
  }

  private updateSecurity(): void {
    this.guards.forEach((guard) => guard.updateGuard(this.game.loop.delta));
    this.level.cameras.forEach((cameraData, index) => {
      const camera = this.camerasList[index];
      camera.update(this.time.now, this.logic.getChannel(cameraData.channel));
    });

    this.level.lasers.forEach((laserData, index) => {
      this.lasers[index].update(this.time.now, this.logic.getChannel(laserData.channel));
    });

    const occluders = this.getOccluders();
    const clone = this.echoSystem.getClone();
    this.detection.update({
      timeMs: this.time.now,
      player: this.player,
      guards: this.guards,
      cameras: this.camerasList,
      lasers: this.lasers,
      echoPosition: clone ? { x: clone.x, y: clone.y } : undefined,
      occluders,
      onPlayerDetected: () => this.raiseAlarm()
    });

    this.services.audioManager.setAlarmMix(this.alarmTimerMs / DETECTION.ALARM_MS);
  }

  private updateCollections(): void {
    if (!this.logic.hasCore()) {
      const corePos = this.core.getPosition();
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, corePos.x, corePos.y) < 36) {
        this.logic.collectCore();
        this.core.collect();
        this.services.audioManager.playPickup();
      }
    }

    this.shards.forEach((shard) => {
      if (shard.isCollected()) {
        return;
      }

      const pos = shard.getPosition();
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, pos.x, pos.y) < 30) {
        shard.collect();
        if (this.logic.collectShard(shard.id)) {
          this.services.audioManager.playPickup();
        }
      }
    });
  }

  private updateExitState(): void {
    const ready = this.logic.isExitReady();
    if (this.exitFill && this.exitGlow) {
      this.exitFill.setFillStyle(ready ? 0x123c36 : 0x152235, ready ? 0.85 : 0.65);
      this.exitGlow.setFillStyle(ready ? 0x71ffb7 : 0xff3a88, ready ? 0.18 : 0.08);
    }

    if (ready && !this.coreCollectedFxPlayed) {
      this.coreCollectedFxPlayed = true;
      this.services.audioManager.playDoor(true);
    }

    if (
      ready &&
      pointInRect({ x: this.player.x, y: this.player.y }, this.level.exit) &&
      !this.shuttingDown
    ) {
      this.finishLevel();
    }
  }

  private updateHud(): void {
    this.services.uiManager.updateHud(
      this.getHudState(this.interaction.getPrompt({ x: this.player.x, y: this.player.y }))
    );
  }

  private getHudState(prompt: string): HudState {
    const objective = this.logic.hasCore() ? "Escape through the exit gate." : this.level.tip;
    return {
      levelName: this.level.name,
      timerText: secondsToClock(Math.floor(this.elapsedMs / 1000)),
      detections: this.detections,
      objective,
      echoCharge: this.echoSystem.getCharge(),
      echoReady: this.echoSystem.isReady(),
      prompt
    };
  }

  private openPause(): void {
    this.services.inputManager.setInGameControlsVisible(false);
    this.scene.launch(SCENE_KEYS.PAUSE, {
      parentKey: String(this.sys.settings.key),
      levelId: this.level.id
    });
    this.scene.pause();
  }

  private raiseAlarm(): void {
    this.detections += 1;
    this.alarmTimerMs = DETECTION.ALARM_MS;
    this.services.uiManager.flashAlarm();
    this.services.audioManager.playAlarm();

    if (!this.services.saveManager.getSettings().reducedMotion) {
      this.cameras.main.shake(160, 0.0024);
      this.cameras.main.flash(120, 255, 85, 110, false);
    }
  }

  private getOccluders(): RectLike[] {
    return [
      ...this.wallRects,
      ...this.doors.filter((door) => !door.isOpen()).map((door) => door.getOccluderRect())
    ];
  }

  private finishLevel(): void {
    this.shuttingDown = true;
    this.services.inputManager.setInGameControlsVisible(false);

    const clearTimeMs = Math.round(this.elapsedMs);
    const nextLevelId = this.services.levelManager.getNextLevelId(this.level.id);
    const result = ScoreSystem.createResult(
      this.level,
      clearTimeMs,
      {
        detections: this.detections,
        echoUses: this.echoSystem.getUses(),
        collectibles: this.logic.getCollectedCount(),
        alarmMoments: this.detections
      },
      nextLevelId
    );

    this.services.saveManager.awardCredits(result.creditsEarned);
    this.services.saveManager.recordLevelResult(
      this.level.id,
      result.rank,
      clearTimeMs,
      Math.min(this.level.order + 2, this.services.levelManager.getLevels().length)
    );
    this.services.audioManager.playComplete();
    this.cameras.main.fadeOut(240, 0, 0, 0);
    this.time.delayedCall(250, () => {
      this.scene.start(SCENE_KEYS.RESULTS, { result });
    });
  }

  private shutdownScene(): void {
    this.shuttingDown = true;
    this.services.uiManager.clearHud();
    this.services.inputManager.setInGameControlsVisible(false);
  }
}
