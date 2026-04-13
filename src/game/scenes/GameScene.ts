import Phaser from "phaser";
import {
  ALERT_FLASH_MS,
  COLORS,
  DETECTION_COOLDOWN_MS,
  ECHO_DURATION_MS,
  ECHO_SAMPLE_MS,
  HACK_DURATION_MS,
  INTERACT_DISTANCE,
  PLAYER_HITBOX_SIZE,
  PLAYER_SPEED,
  SCENE_KEYS,
  STEALTH_SPEED
} from "../constants";
import { COSMETIC_THEMES } from "../data/cosmetics";
import { InputManager } from "../managers/InputManager";
import type {
  CameraData,
  ChannelState,
  CollectibleData,
  DoorData,
  EchoSample,
  GuardData,
  HudState,
  LaserData,
  LevelDefinition,
  LevelResult,
  Point,
  PressurePlateData,
  Rect,
  SwitchData,
  TerminalData
} from "../types";
import { getServices } from "../utils/services";

interface RuntimeDoor {
  data: DoorData;
  shape: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  timerBack: Phaser.GameObjects.Rectangle;
  timerFill: Phaser.GameObjects.Rectangle;
}

interface RuntimePlate {
  data: PressurePlateData;
  shape: Phaser.GameObjects.Rectangle;
}

interface RuntimeSwitch {
  data: SwitchData;
  shape: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface RuntimeTerminal {
  data: TerminalData;
  shape: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  progress: Phaser.GameObjects.Rectangle;
  activeHack: { remainingMs: number; actor: "player" | "echo" } | null;
}

interface RuntimeCollectible {
  data: CollectibleData;
  shape: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  taken: boolean;
}

interface RuntimeGuard {
  data: GuardData;
  sprite: Phaser.GameObjects.Image;
  cone: Phaser.GameObjects.Graphics;
  patrolIndex: number;
  faceAngle: number;
  investigateTarget: Point | null;
  investigateTimer: number;
  searchAnchorAngle: number;
  searchClock: number;
}

interface RuntimeCamera {
  data: CameraData;
  sprite: Phaser.GameObjects.Image;
  cone: Phaser.GameObjects.Graphics;
  currentAngle: number;
}

interface RuntimeLaser {
  data: LaserData;
  beam: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Rectangle;
}

interface ActiveEcho {
  sprite: Phaser.GameObjects.Image;
  trail: Phaser.GameObjects.Graphics;
  samples: EchoSample[];
  elapsedMs: number;
  firedSamples: Set<number>;
}

interface RuntimeNoisePulse {
  ring: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  lifeMs: number;
  totalMs: number;
  maxScale: number;
}

const bodyRect = (x: number, y: number, size = PLAYER_HITBOX_SIZE): Rect => ({
  x: x - size / 2,
  y: y - size / 2,
  w: size,
  h: size
});

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const pointDistance = (a: Point, b: Point): number => Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);

const normalize = (value: Phaser.Math.Vector2): Phaser.Math.Vector2 => {
  if (value.lengthSq() === 0) {
    return value;
  }
  return value.normalize();
};

export class GameScene extends Phaser.Scene {
  private level!: LevelDefinition;
  private inputManager!: InputManager;

  private player!: Phaser.GameObjects.Image;
  private core!: Phaser.GameObjects.Image;
  private coreHalo!: Phaser.GameObjects.Arc;
  private exitGlow!: Phaser.GameObjects.Rectangle;
  private exitZone!: Phaser.GameObjects.Rectangle;
  private alarmFlash!: Phaser.GameObjects.Rectangle;
  private logicOverlay!: Phaser.GameObjects.Graphics;
  private objectiveOverlay!: Phaser.GameObjects.Graphics;
  private recordingTrail!: Phaser.GameObjects.Graphics;
  private hintLabel!: Phaser.GameObjects.Text;
  private bannerTitle!: Phaser.GameObjects.Text;
  private bannerSubtitle!: Phaser.GameObjects.Text;
  private ambientLines: Phaser.GameObjects.Rectangle[] = [];

  private doors: RuntimeDoor[] = [];
  private plates: RuntimePlate[] = [];
  private switches: RuntimeSwitch[] = [];
  private terminals: RuntimeTerminal[] = [];
  private collectibles: RuntimeCollectible[] = [];
  private guards: RuntimeGuard[] = [];
  private cameraSensors: RuntimeCamera[] = [];
  private lasers: RuntimeLaser[] = [];

  private persistentChannels: ChannelState = {};
  private channelTimers: Record<string, number> = {};
  private channels: ChannelState = {};
  private closedDoorRects: Rect[] = [];
  private pulsePlateContacts = new Set<string>();

  private playerPosition = new Phaser.Math.Vector2();
  private playerMoveAccumulator = 0;
  private sampleAccumulator = 0;
  private hudAccumulator = 0;
  private detectionCooldown = 0;
  private alarmFlashTimer = 0;
  private runTimeMs = 0;
  private detections = 0;
  private credits = 0;
  private echoesUsed = 0;
  private exposureLevel = 0;
  private exposureSource = "";
  private exposureGain = 0;
  private coreCollected = false;
  private interactionHint = "";
  private roomState: "active" | "compromised" | "complete" = "active";
  private stateTimer = 0;
  private bannerTimer = 0;
  private tutorialBeat = -1;
  private pendingRecordedInteract = false;
  private recordedSamples: EchoSample[] = [];
  private activeEcho: ActiveEcho | null = null;
  private noisePulses: RuntimeNoisePulse[] = [];
  private resumeHandler?: () => void;

  constructor() {
    super(SCENE_KEYS.GAME);
  }

  create(data: { levelId?: string } | undefined): void {
    const { audioManager, levelManager, saveManager, uiManager } = getServices(this);
    const levelId = data?.levelId ?? "tutorial-split";
    this.level = levelManager.getLevelById(levelId);

    const settings = saveManager.getSettings();
    const theme = COSMETIC_THEMES.find((entry) => entry.id === settings.selectedTheme) ?? COSMETIC_THEMES[0];
    audioManager.applySettings(settings);
    audioManager.setMusicMode("stealth");
    void audioManager.prime();
    uiManager.applySettings(settings);

    uiManager.clearScreen();
    uiManager.clearHud();

    this.inputManager = new InputManager(this, settings);
    this.scale.setGameSize(this.level.world.width, this.level.world.height);
    this.cameras.main.setBounds(0, 0, this.level.world.width, this.level.world.height);
    this.cameras.main.setBackgroundColor("#050611");

    this.playerPosition.set(this.level.spawn.x, this.level.spawn.y);
    this.persistentChannels = { ...this.level.initialChannels };
    this.channelTimers = {};
    this.channels = { ...this.level.initialChannels };
    this.roomState = "active";
    this.stateTimer = 0;
    this.tutorialBeat = -1;
    this.noisePulses = [];

    this.drawBackground(theme.accentHex);
    this.createWorld(theme.accentHex);
    this.refreshDoorState();
    this.showBanner(
      this.level.name,
      this.level.tutorial
        ? `${this.level.payload.name}: ${this.level.payload.description} Press Q to deploy the echo and E to interact.`
        : `${this.level.brief} Target: ${this.level.payload.name}.`,
      4800
    );
    this.refreshHud();

    this.resumeHandler = () => {
      const resumedSettings = saveManager.getSettings();
      audioManager.applySettings(resumedSettings);
      uiManager.applySettings(resumedSettings);
      this.inputManager.updateSettings(resumedSettings);
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.resumeHandler) {
        this.events.off(Phaser.Scenes.Events.RESUME, this.resumeHandler);
      }
      this.inputManager.destroy();
      uiManager.clearHud();
      this.destroyEcho();
      this.destroyNoisePulses();
    });
    this.events.off(Phaser.Scenes.Events.RESUME, this.resumeHandler);
    this.events.on(Phaser.Scenes.Events.RESUME, this.resumeHandler);
  }

  update(_time: number, delta: number): void {
    const { audioManager } = getServices(this);
    const dt = Math.min(delta, 33);

    this.sampleAccumulator += dt;
    this.hudAccumulator += dt;
    this.detectionCooldown = Math.max(0, this.detectionCooldown - dt);
    this.alarmFlashTimer = Math.max(0, this.alarmFlashTimer - dt);
    this.alarmFlash.setAlpha(this.alarmFlashTimer > 0 ? 0.16 : 0);
    this.updateBanner(dt);

    if (this.roomState === "compromised") {
      this.stateTimer = Math.max(0, this.stateTimer - dt);
      this.updateCoreAndExit();
      this.updateHints();
      this.animateBackground(dt);

      if (this.hudAccumulator >= 120) {
        this.refreshHud();
        this.hudAccumulator = 0;
      }

      if (this.stateTimer <= 0) {
        this.scene.start(SCENE_KEYS.GAME, { levelId: this.level.id });
      }
      return;
    }

    if (this.inputManager.consumePause()) {
      audioManager.playUi();
      this.scene.launch(SCENE_KEYS.PAUSE, { levelId: this.level.id });
      this.scene.pause();
      return;
    }

    if (this.inputManager.consumeRestart()) {
      audioManager.playUi();
      this.scene.start(SCENE_KEYS.GAME, { levelId: this.level.id });
      return;
    }

    this.runTimeMs += dt;
    this.exposureGain = 0;
    this.exposureSource = "";

    const moveVector = this.inputManager.getMovement();
    const stealth = this.inputManager.isStealthHeld();
    const moveSpeed = stealth ? STEALTH_SPEED : PLAYER_SPEED;
    const deltaMove = normalize(moveVector).scale(moveSpeed * (dt / 1000));
    this.movePlayer(deltaMove.x, deltaMove.y);

    if (moveVector.lengthSq() > 0) {
      this.playerMoveAccumulator += dt;
      if (this.playerMoveAccumulator >= (stealth ? 300 : 190)) {
        audioManager.playFootstep(stealth ? 0.8 : 1);
        if (!stealth && !this.level.tutorial) {
          this.emitNoise({ x: this.playerPosition.x, y: this.playerPosition.y }, 132, "player");
        }
        this.playerMoveAccumulator = 0;
      }
    } else {
      this.playerMoveAccumulator = 0;
    }

    if (this.inputManager.consumeInteract()) {
      this.pendingRecordedInteract = true;
      this.tryInteract(this.playerPosition, "player");
    }

    if (this.inputManager.consumeEcho() && this.recordedSamples.length >= 3) {
      audioManager.playEcho();
      this.deployEcho();
    }

    this.recordEchoSample();
    this.renderRecordingTrail();
    this.updateEcho(dt);
    this.updateNoisePulses(dt);
    this.updateChannelTimers(dt);
    this.updateChannels();
    this.renderLogicOverlay();
    this.updateTerminals(dt);
    this.updateGuards(dt);
    this.updateCameras();
    this.updateLasers();
    this.updateExposure(dt);
    this.updateCollectibles();
    this.updateCoreAndExit();
    this.updateDoorIndicators();
    this.renderObjectiveOverlay();
    this.updateHints();
    this.updateTutorialBeat();
    this.animateBackground(dt);

    if (this.hudAccumulator >= 120) {
      this.refreshHud();
      this.hudAccumulator = 0;
    }
  }

  private drawBackground(accent: number): void {
    const { width, height } = this.level.world;
    this.add.rectangle(width / 2, height / 2, width, height, 0x050611, 1).setDepth(-30);

    const grid = this.add.graphics().setDepth(-25);
    grid.lineStyle(1, 0x15304d, 0.35);
    for (let x = 64; x < width; x += 64) {
      grid.lineBetween(x, 0, x, height);
    }
    for (let y = 64; y < height; y += 64) {
      grid.lineBetween(0, y, width, y);
    }

    for (let index = 0; index < 10; index += 1) {
      const line = this.add.rectangle(
        Phaser.Math.Between(40, width - 40),
        Phaser.Math.Between(40, height - 40),
        Phaser.Math.Between(120, 240),
        2,
        Phaser.Math.RND.pick([accent, COLORS.laser]),
        0.16
      );
      line.setAngle(Phaser.Math.Between(-30, 30)).setDepth(-20);
      this.ambientLines.push(line);
    }
  }

  private createWorld(accent: number): void {
    const settings = getServices(this).saveManager.getSettings();

    this.player = this.add.image(this.playerPosition.x, this.playerPosition.y, "player").setTint(accent).setDepth(20);
    this.coreHalo = this.add.circle(this.level.core.x, this.level.core.y, 40, COLORS.core, 0.12).setDepth(14);
    this.core = this.add.image(this.level.core.x, this.level.core.y, "core").setDepth(16);
    this.exitGlow = this.add
      .rectangle(
        this.level.exit.x + this.level.exit.w / 2,
        this.level.exit.y + this.level.exit.h / 2,
        this.level.exit.w + 16,
        this.level.exit.h + 16,
        COLORS.success,
        0.08
      )
      .setDepth(5);
    this.exitZone = this.add
      .rectangle(
        this.level.exit.x + this.level.exit.w / 2,
        this.level.exit.y + this.level.exit.h / 2,
        this.level.exit.w,
        this.level.exit.h,
        COLORS.success,
        0.12
      )
      .setStrokeStyle(2, COLORS.success, 0.9)
      .setDepth(6);
    this.exitGlow.setAlpha(this.coreCollected ? 0.16 : 0.08);
    this.exitZone.setAlpha(this.coreCollected ? 0.22 : 0.12);

    this.level.walls.forEach((wall, index) => {
      this.renderWall(wall, accent, index);
    });

    this.doors = this.level.doors.map((door) => {
      const shape = this.add
        .rectangle(door.x + door.w / 2, door.y + door.h / 2, door.w, door.h, COLORS.panelSoft, 0.95)
        .setStrokeStyle(2, COLORS.player, 0.85)
        .setDepth(11);
      const glow = this.add
        .rectangle(door.x + door.w / 2, door.y + door.h / 2, door.w + 10, door.h + 10, COLORS.player, 0.08)
        .setDepth(10);
      const labelY = door.y - 22;
      const label = this.add
        .text(door.x + door.w / 2, labelY, "", {
          fontFamily: "Chakra Petch, sans-serif",
          fontSize: "11px",
          color: "#c8f8ff",
          fontStyle: "700"
        })
        .setOrigin(0.5, 1)
        .setDepth(12)
        .setAlpha(0);
      const timerBack = this.add
        .rectangle(door.x + door.w / 2, labelY + 8, Math.max(38, door.w + 12), 5, 0x04111e, 0.88)
        .setDepth(12)
        .setAlpha(0);
      const timerFill = this.add
        .rectangle(door.x + door.w / 2 - Math.max(38, door.w + 12) / 2, labelY + 8, 0, 5, COLORS.success, 0.92)
        .setOrigin(0, 0.5)
        .setDepth(13)
        .setAlpha(0);
      return { data: door, shape, glow, label, timerBack, timerFill };
    });

    this.plates = this.level.plates.map((plate) => ({
      data: plate,
      shape: this.add
        .rectangle(plate.x + plate.w / 2, plate.y + plate.h / 2, plate.w, plate.h, COLORS.player, 0.16)
        .setStrokeStyle(2, COLORS.player, 0.5)
        .setDepth(8)
    }));

    this.switches = this.level.switches.map((entry) => ({
      data: entry,
      shape: this.add.rectangle(entry.x, entry.y, 44, 44, COLORS.warning, 0.16).setStrokeStyle(2, COLORS.warning, 0.8).setDepth(8),
      label: this.add.text(entry.x, entry.y + 40, entry.label, {
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: "12px",
        color: "#8da3bc"
      }).setOrigin(0.5, 0).setDepth(8)
    }));

    this.terminals = this.level.terminals.map((entry) => {
      const shape = this.add
        .rectangle(entry.x, entry.y, 54, 44, COLORS.player, 0.14)
        .setStrokeStyle(2, COLORS.player, 0.8)
        .setDepth(8);
      const label = this.add.text(entry.x, entry.y + 38, entry.label, {
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: "12px",
        color: "#8da3bc"
      }).setOrigin(0.5, 0).setDepth(8);
      const progress = this.add.rectangle(entry.x - 24, entry.y + 30, 0, 6, COLORS.player, 0.9).setOrigin(0, 0.5).setDepth(8);
      return { data: entry, shape, label, progress, activeHack: null };
    });

    this.collectibles = this.level.collectibles.map((entry) => ({
      data: entry,
      glow: this.add.circle(entry.x, entry.y, 18, COLORS.warning, 0.14).setDepth(8),
      shape: this.add.circle(entry.x, entry.y, 10, COLORS.warning, 0.95).setStrokeStyle(2, 0xffffff, 0.35).setDepth(9),
      taken: false
    }));

    this.guards = this.level.guards.map((entry) => ({
      data: entry,
      sprite: this.add.image(entry.x, entry.y, "guard").setDepth(15),
      cone: this.add.graphics().setDepth(7),
      patrolIndex: 1 % Math.max(1, entry.patrol.length),
      faceAngle: -Math.PI / 2,
      investigateTarget: null,
      investigateTimer: 0,
      searchAnchorAngle: -Math.PI / 2,
      searchClock: 0
    }));

    this.cameraSensors = this.level.cameras.map((entry) => ({
      data: entry,
      sprite: this.add.image(entry.x, entry.y, "camera").setDepth(14),
      cone: this.add.graphics().setDepth(7),
      currentAngle: Phaser.Math.DegToRad(entry.baseAngle)
    }));

    this.lasers = this.level.lasers.map((entry) => {
      const horizontal = entry.orientation === "horizontal";
      const width = horizontal ? entry.length : 8;
      const height = horizontal ? 8 : entry.length;
      return {
        data: entry,
        glow: this.add.rectangle(entry.x, entry.y, width + 10, height + 10, COLORS.laser, 0.06).setDepth(5),
        beam: this.add.rectangle(entry.x, entry.y, width, height, COLORS.laser, 0.84).setDepth(6)
      };
    });

    this.logicOverlay = this.add.graphics().setDepth(4);
    this.objectiveOverlay = this.add.graphics().setDepth(15);
    this.recordingTrail = this.add.graphics().setDepth(17);

    this.hintLabel = this.add
      .text(this.level.world.width / 2, this.level.world.height - 18, "", {
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: "14px",
        color: "#eef8ff",
        align: "center",
        wordWrap: { width: Math.min(680, this.level.world.width - 160), useAdvancedWrap: true },
        backgroundColor: "rgba(6, 12, 24, 0.82)",
        padding: { x: 16, y: 10 }
      })
      .setOrigin(0.5, 1)
      .setDepth(40)
      .setAlpha(0);

    this.bannerTitle = this.add
      .text(this.level.world.width / 2, 24, "", {
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: "18px",
        color: "#eef8ff",
        fontStyle: "700",
        align: "center"
      })
      .setOrigin(0.5, 0)
      .setDepth(45);

    this.bannerSubtitle = this.add
      .text(this.level.world.width / 2, 50, "", {
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: "13px",
        color: "#9cc9ff",
        align: "center",
        wordWrap: { width: 620, useAdvancedWrap: true }
      })
      .setOrigin(0.5, 0)
      .setDepth(45);

    this.alarmFlash = this.add
      .rectangle(
        this.level.world.width / 2,
        this.level.world.height / 2,
        this.level.world.width,
        this.level.world.height,
        COLORS.danger,
        settings.reducedMotion ? 0.06 : 0.14
      )
      .setDepth(50)
      .setAlpha(0);
  }

  private movePlayer(deltaX: number, deltaY: number): void {
    const next = this.moveBody(this.playerPosition.x, this.playerPosition.y, deltaX, deltaY);
    this.playerPosition.set(next.x, next.y);
    this.player.setPosition(this.playerPosition.x, this.playerPosition.y);
  }

  private moveBody(currentX: number, currentY: number, deltaX: number, deltaY: number, size = PLAYER_HITBOX_SIZE): Point {
    let nextX = currentX + deltaX;
    const half = size / 2;
    const blockers = this.getBlockingRects();

    const rectX = bodyRect(nextX, currentY, size);
    blockers.forEach((blocker) => {
      if (!overlaps(rectX, blocker)) {
        return;
      }
      if (deltaX > 0) {
        nextX = blocker.x - half;
      } else if (deltaX < 0) {
        nextX = blocker.x + blocker.w + half;
      }
    });

    let nextY = currentY + deltaY;
    const rectY = bodyRect(nextX, nextY, size);
    blockers.forEach((blocker) => {
      if (!overlaps(rectY, blocker)) {
        return;
      }
      if (deltaY > 0) {
        nextY = blocker.y - half;
      } else if (deltaY < 0) {
        nextY = blocker.y + blocker.h + half;
      }
    });

    return {
      x: Phaser.Math.Clamp(nextX, half, this.level.world.width - half),
      y: Phaser.Math.Clamp(nextY, half, this.level.world.height - half)
    };
  }

  private recordEchoSample(): void {
    while (this.sampleAccumulator >= ECHO_SAMPLE_MS) {
      this.sampleAccumulator -= ECHO_SAMPLE_MS;
      this.recordedSamples.push({
        x: this.playerPosition.x,
        y: this.playerPosition.y,
        t: this.runTimeMs,
        interact: this.pendingRecordedInteract
      });
      this.pendingRecordedInteract = false;
    }

    const cutoff = this.runTimeMs - ECHO_DURATION_MS;
    this.recordedSamples = this.recordedSamples.filter((sample) => sample.t >= cutoff);
  }

  private deployEcho(): void {
    this.destroyEcho();

    const earliest = this.recordedSamples[0]?.t ?? this.runTimeMs;
    const samples = this.recordedSamples.map((sample) => ({
      ...sample,
      t: sample.t - earliest
    }));

    const sprite = this.add.image(samples[0]?.x ?? this.playerPosition.x, samples[0]?.y ?? this.playerPosition.y, "echo").setDepth(18);
    const trail = this.add.graphics().setDepth(17);
    this.activeEcho = {
      sprite,
      trail,
      samples,
      elapsedMs: 0,
      firedSamples: new Set<number>()
    };
    this.echoesUsed += 1;
    this.emitNoise({ x: sprite.x, y: sprite.y }, 148, "echo");
  }

  private updateEcho(delta: number): void {
    const { audioManager } = getServices(this);
    if (!this.activeEcho) {
      return;
    }

    const echo = this.activeEcho;
    echo.elapsedMs += delta;
    const totalDuration = echo.samples[echo.samples.length - 1]?.t ?? 0;
    if (echo.elapsedMs > totalDuration) {
      this.destroyEcho();
      return;
    }

    const current = this.getInterpolatedEchoPosition(echo.samples, echo.elapsedMs);
    echo.sprite.setPosition(current.x, current.y);
    echo.trail.clear();
    echo.trail.lineStyle(3, COLORS.echo, 0.55);
    echo.trail.beginPath();
    echo.samples.forEach((sample, index) => {
      if (index === 0) {
        echo.trail.moveTo(sample.x, sample.y);
      } else {
        echo.trail.lineTo(sample.x, sample.y);
      }
    });
    echo.trail.strokePath();

    echo.samples.forEach((sample, index) => {
      if (sample.interact && sample.t <= echo.elapsedMs && !echo.firedSamples.has(index)) {
        echo.firedSamples.add(index);
        this.tryInteract({ x: current.x, y: current.y }, "echo");
        this.emitNoise({ x: current.x, y: current.y }, 164, "echo");
        audioManager.playHack();
      }
    });
  }

  private destroyEcho(): void {
    this.activeEcho?.sprite.destroy();
    this.activeEcho?.trail.destroy();
    this.activeEcho = null;
  }

  private destroyNoisePulses(): void {
    this.noisePulses.forEach((pulse) => {
      pulse.ring.destroy();
      pulse.glow.destroy();
    });
    this.noisePulses = [];
  }

  private renderRecordingTrail(): void {
    this.recordingTrail.clear();
    if (this.recordedSamples.length < 2) {
      return;
    }

    const first = this.recordedSamples[0]!;
    const last = this.recordedSamples[this.recordedSamples.length - 1]!;
    const charge = Phaser.Math.Clamp((last.t - first.t) / ECHO_DURATION_MS, 0, 1);

    this.recordingTrail.lineStyle(2, COLORS.player, 0.14 + charge * 0.18);
    this.recordingTrail.beginPath();
    this.recordedSamples.forEach((sample, index) => {
      if (index === 0) {
        this.recordingTrail.moveTo(sample.x, sample.y);
      } else {
        this.recordingTrail.lineTo(sample.x, sample.y);
      }
    });
    this.recordingTrail.strokePath();

    this.recordingTrail.fillStyle(COLORS.player, 0.18);
    this.recordingTrail.fillCircle(first.x, first.y, 5);
    this.recordingTrail.fillStyle(COLORS.player, 0.32 + charge * 0.24);
    this.recordingTrail.fillCircle(last.x, last.y, 7);
  }

  private emitNoise(point: Point, radius: number, actor: "player" | "echo" | "system"): void {
    const color = actor === "echo" ? COLORS.echo : actor === "system" ? COLORS.warning : COLORS.player;
    const ring = this.add.circle(point.x, point.y, 12, color, 0).setStrokeStyle(2, color, 0.34).setDepth(19);
    const glow = this.add.circle(point.x, point.y, 12, color, 0.08).setDepth(18);
    this.noisePulses.push({
      ring,
      glow,
      lifeMs: 520,
      totalMs: 520,
      maxScale: Math.max(1.6, radius / 12)
    });

    this.guards.forEach((guard) => {
      const distance = Phaser.Math.Distance.Between(guard.sprite.x, guard.sprite.y, point.x, point.y);
      if (distance > radius || this.isVisionBlocked({ x: guard.sprite.x, y: guard.sprite.y }, point)) {
        return;
      }

      const heardPoint = {
        x: point.x + Phaser.Math.Between(-18, 18),
        y: point.y + Phaser.Math.Between(-18, 18)
      };
      guard.investigateTarget = heardPoint;
      guard.investigateTimer = Math.max(guard.investigateTimer, actor === "echo" ? 1650 : 1350);
      guard.searchAnchorAngle = Phaser.Math.Angle.Between(guard.sprite.x, guard.sprite.y, heardPoint.x, heardPoint.y);
      guard.searchClock = 0;
    });
  }

  private updateNoisePulses(delta: number): void {
    this.noisePulses = this.noisePulses.filter((pulse) => {
      pulse.lifeMs -= delta;
      if (pulse.lifeMs <= 0) {
        pulse.ring.destroy();
        pulse.glow.destroy();
        return false;
      }

      const progress = 1 - pulse.lifeMs / pulse.totalMs;
      const scale = 1 + (pulse.maxScale - 1) * progress;
      pulse.ring.setScale(scale).setAlpha((1 - progress) * 0.74);
      pulse.glow.setScale(scale * 0.56).setAlpha((1 - progress) * 0.18);
      return true;
    });
  }

  private renderLogicOverlay(): void {
    this.logicOverlay.clear();
    const phase = Math.floor(this.runTimeMs / 180) % 2;
    const controllers = [
      ...this.plates.map((plate) => ({
        channel: plate.data.channel,
        point: { x: plate.data.x + plate.data.w / 2, y: plate.data.y + plate.data.h / 2 },
        color: COLORS.player
      })),
      ...this.switches.map((entry) => ({
        channel: entry.data.channel,
        point: { x: entry.data.x, y: entry.data.y },
        color: COLORS.warning
      })),
      ...this.terminals.map((entry) => ({
        channel: entry.data.channel,
        point: { x: entry.data.x, y: entry.data.y },
        color: COLORS.player
      }))
    ];

    controllers.forEach((controller) => {
      const targets = this.getChannelTargets(controller.channel);
      if (targets.length === 0) {
        return;
      }

      const active = Boolean(this.channels[controller.channel]);
      const color = active ? COLORS.success : controller.color;
      const alpha = active ? 0.42 : 0.18;

      this.logicOverlay.fillStyle(color, active ? 0.24 : 0.12);
      this.logicOverlay.fillCircle(controller.point.x, controller.point.y, active ? 8 : 6);

      targets.forEach((target) => {
        this.drawDataLink(controller.point, target, color, alpha, phase);
        this.logicOverlay.fillStyle(color, active ? 0.22 : 0.1);
        this.logicOverlay.fillCircle(target.x, target.y, active ? 7 : 5);
      });
    });
  }

  private renderObjectiveOverlay(): void {
    this.objectiveOverlay.clear();
    const pulse = 0.48 + (Math.sin(this.runTimeMs * 0.008) + 1) * 0.14;

    if (this.exposureLevel > 0.12) {
      const bracketColor = this.exposureLevel > 0.65 ? COLORS.danger : COLORS.warning;
      const radius = 14 + this.exposureLevel * 10;
      this.objectiveOverlay.lineStyle(2, bracketColor, 0.42 + this.exposureLevel * 0.3);
      this.objectiveOverlay.strokeCircle(this.playerPosition.x, this.playerPosition.y, radius);
      this.objectiveOverlay.lineStyle(1, bracketColor, 0.22 + this.exposureLevel * 0.22);
      this.objectiveOverlay.strokeCircle(this.playerPosition.x, this.playerPosition.y, radius + 10);
    }

    if (this.level.tutorial) {
      const tutorialStage = this.getTutorialStage();
      if (tutorialStage === 0) {
        const plate = this.plates.find((entry) => entry.data.channel === "door-alpha");
        const door = this.doors.find((entry) => entry.data.channel === "door-alpha");
        const camera = this.cameraSensors.find((entry) => entry.data.channel === "door-alpha");
        if (plate) {
          this.drawObjectivePulse(
            { x: plate.data.x + plate.data.w / 2, y: plate.data.y + plate.data.h / 2 },
            COLORS.player,
            34,
            pulse
          );
        }
        if (door) {
          this.drawObjectivePulse(
            { x: door.data.x + door.data.w / 2, y: door.data.y + door.data.h / 2 },
            COLORS.success,
            30,
            pulse * 0.92
          );
        }
        if (camera) {
          this.drawObjectivePulse(
            { x: camera.data.x, y: camera.data.y },
            COLORS.warning,
            26,
            pulse * 0.8
          );
        }
        return;
      }
    }

    if (!this.coreCollected) {
      this.drawObjectivePulse(this.level.core, COLORS.core, 34, pulse);
      return;
    }

    this.drawObjectivePulse(
      { x: this.level.exit.x + this.level.exit.w / 2, y: this.level.exit.y + this.level.exit.h / 2 },
      COLORS.success,
      40,
      pulse
    );
  }

  private getInterpolatedEchoPosition(samples: EchoSample[], timeMs: number): Point {
    if (samples.length === 0) {
      return { x: this.playerPosition.x, y: this.playerPosition.y };
    }

    let nextIndex = samples.findIndex((sample) => sample.t >= timeMs);
    if (nextIndex <= 0) {
      return { x: samples[0].x, y: samples[0].y };
    }
    if (nextIndex === -1) {
      const last = samples[samples.length - 1]!;
      return { x: last.x, y: last.y };
    }

    const previous = samples[nextIndex - 1]!;
    const next = samples[nextIndex]!;
    const total = Math.max(1, next.t - previous.t);
    const alpha = (timeMs - previous.t) / total;
    return {
      x: Phaser.Math.Linear(previous.x, next.x, alpha),
      y: Phaser.Math.Linear(previous.y, next.y, alpha)
    };
  }

  private updateChannels(): void {
    const nextChannels: ChannelState = { ...this.persistentChannels };
    const playerRect = bodyRect(this.playerPosition.x, this.playerPosition.y);
    const echoRect = this.activeEcho ? bodyRect(this.activeEcho.sprite.x, this.activeEcho.sprite.y) : null;

    this.plates.forEach((plate) => {
      const playerActive = overlaps(playerRect, plate.data);
      const echoActive = echoRect ? overlaps(echoRect, plate.data) : false;
      const active = playerActive || echoActive;
      const plateKey = plate.data.id;
      const mode = plate.data.mode ?? "hold";
      if (mode === "pulse") {
        if (active && !this.pulsePlateContacts.has(plateKey)) {
          this.armTimedChannel(plate.data.channel);
          this.pulsePlateContacts.add(plateKey);
        } else if (!active) {
          this.pulsePlateContacts.delete(plateKey);
        }
      } else if (mode === "echo") {
        nextChannels[plate.data.channel] = echoActive || nextChannels[plate.data.channel] === true;
        if (echoActive && !this.pulsePlateContacts.has(plateKey)) {
          this.armTimedChannel(plate.data.channel);
          this.pulsePlateContacts.add(plateKey);
        } else if (!echoActive) {
          this.pulsePlateContacts.delete(plateKey);
        }
      } else {
        nextChannels[plate.data.channel] = active || nextChannels[plate.data.channel] === true;
      }
      const primedByPlayerOnly = mode === "echo" && playerActive && !echoActive;
      const fillColor = primedByPlayerOnly ? COLORS.warning : COLORS.player;
      const fillAlpha = active ? 0.28 : nextChannels[plate.data.channel] ? 0.2 : 0.12;
      plate.shape.setFillStyle(fillColor, fillAlpha);
      plate.shape.setStrokeStyle(2, fillColor, active ? 0.78 : 0.5);
    });

    Object.entries(this.channelTimers).forEach(([channel, remaining]) => {
      if (remaining > 0) {
        nextChannels[channel] = true;
      }
    });

    this.channels = nextChannels;
    this.refreshDoorState();
  }

  private updateChannelTimers(delta: number): void {
    Object.keys(this.channelTimers).forEach((channel) => {
      this.channelTimers[channel] = Math.max(0, this.channelTimers[channel]! - delta);
      if (this.channelTimers[channel] <= 0) {
        delete this.channelTimers[channel];
      }
    });
  }

  private armTimedChannel(channel: string, duration = this.getBreachWindowMs()): void {
    if (duration <= 0) {
      this.persistentChannels[channel] = true;
      return;
    }
    this.channelTimers[channel] = duration;
  }

  private getBreachWindowMs(): number {
    return this.level.breachWindowMs ?? Math.max(4600, 9200 - this.level.order * 520);
  }

  private refreshDoorState(): void {
    this.closedDoorRects = [];
    this.doors.forEach((door) => {
      const open = Boolean(this.channels[door.data.channel]);
      door.shape.setAlpha(open ? 0.18 : 0.95);
      door.glow.setAlpha(open ? 0.03 : 0.08);
      door.shape.setStrokeStyle(2, open ? COLORS.success : COLORS.player, 0.85);
      if (!open) {
        this.closedDoorRects.push(door.data);
      }
    });
  }

  private updateDoorIndicators(): void {
    const fullWindow = this.getBreachWindowMs();
    this.doors.forEach((door) => {
      const remaining = this.channelTimers[door.data.channel] ?? 0;
      const showTimer = remaining > 0;
      const width = Math.max(38, door.data.w + 12);
      door.timerBack.setAlpha(showTimer ? 0.82 : 0);
      door.timerFill.setAlpha(showTimer ? 1 : 0);
      door.label.setAlpha(showTimer ? 0.95 : 0);
      if (!showTimer) {
        door.timerFill.displayWidth = 0;
        door.label.setText("");
        return;
      }
      door.label.setText(`${(remaining / 1000).toFixed(1)}s`);
      door.timerFill.displayWidth = width * Phaser.Math.Clamp(remaining / fullWindow, 0, 1);
      const tint = remaining < 2200 ? COLORS.warning : COLORS.success;
      door.timerFill.setFillStyle(tint, 0.92);
    });
  }

  private updateTerminals(delta: number): void {
    const { audioManager } = getServices(this);
    this.terminals.forEach((terminal) => {
      if (!terminal.activeHack) {
        terminal.progress.displayWidth = 0;
        return;
      }

      terminal.activeHack.remainingMs -= delta;
      const total = Math.max(terminal.data.hackTimeMs, HACK_DURATION_MS);
      const progress = Phaser.Math.Clamp(1 - terminal.activeHack.remainingMs / total, 0, 1);
      terminal.progress.displayWidth = 48 * progress;

      if (terminal.activeHack.remainingMs <= 0) {
        terminal.activeHack = null;
        terminal.progress.displayWidth = 0;
        this.armTimedChannel(terminal.data.channel);
        terminal.shape.setFillStyle(COLORS.success, 0.2);
        this.emitNoise({ x: terminal.data.x, y: terminal.data.y }, 154, "system");
        audioManager.playHack();
      }
    });
  }

  private updateGuards(delta: number): void {
    const playerPoint = { x: this.playerPosition.x, y: this.playerPosition.y };
    const echoPoint = this.activeEcho ? { x: this.activeEcho.sprite.x, y: this.activeEcho.sprite.y } : null;
    const lockdownSpeed = this.coreCollected ? 1.14 : 1;

    this.guards.forEach((guard) => {
      const seesPlayer = this.canSeeTarget(guard.sprite, guard.faceAngle, guard.data.visionRange, guard.data.visionAngle, playerPoint);
      const seesEcho =
        !seesPlayer &&
        !!echoPoint &&
        this.canSeeTarget(guard.sprite, guard.faceAngle, guard.data.visionRange, guard.data.visionAngle, echoPoint);

      if (seesPlayer) {
        this.registerExposure("SENTRY LOCK", 1);
        guard.investigateTarget = { ...playerPoint };
        guard.investigateTimer = 1300;
        guard.searchAnchorAngle = Phaser.Math.Angle.Between(guard.sprite.x, guard.sprite.y, playerPoint.x, playerPoint.y);
        guard.searchClock = 0;
      } else if (seesEcho && echoPoint) {
        guard.investigateTarget = { ...echoPoint };
        guard.investigateTimer = 1100;
        guard.searchAnchorAngle = Phaser.Math.Angle.Between(guard.sprite.x, guard.sprite.y, echoPoint.x, echoPoint.y);
        guard.searchClock = 0;
      }

      if (guard.investigateTimer > 0 && guard.investigateTarget) {
        guard.investigateTimer -= delta;
        const destination = guard.investigateTarget;
        const vector = new Phaser.Math.Vector2(destination.x - guard.sprite.x, destination.y - guard.sprite.y);
        if (vector.lengthSq() > 36) {
          vector.normalize().scale(guard.data.speed * lockdownSpeed * 1.18 * (delta / 1000));
          const next = this.moveBody(guard.sprite.x, guard.sprite.y, vector.x, vector.y);
          guard.sprite.setPosition(next.x, next.y);
          guard.faceAngle = vector.angle();
          guard.searchAnchorAngle = guard.faceAngle;
        } else {
          guard.searchClock += delta * 0.0052;
          guard.faceAngle = guard.searchAnchorAngle + Math.sin(guard.searchClock) * 0.52;
        }
      } else {
        const patrolTarget = guard.data.patrol[guard.patrolIndex] ?? { x: guard.data.x, y: guard.data.y };
        const vector = new Phaser.Math.Vector2(patrolTarget.x - guard.sprite.x, patrolTarget.y - guard.sprite.y);
        if (vector.lengthSq() < 36) {
          guard.patrolIndex = (guard.patrolIndex + 1) % guard.data.patrol.length;
        } else {
          vector.normalize().scale(guard.data.speed * lockdownSpeed * (delta / 1000));
          const next = this.moveBody(guard.sprite.x, guard.sprite.y, vector.x, vector.y);
          guard.sprite.setPosition(next.x, next.y);
          guard.faceAngle = vector.angle();
        }
      }

      guard.sprite.setTint(seesPlayer ? COLORS.danger : guard.investigateTimer > 0 ? COLORS.warning : COLORS.guard);
      guard.sprite.setRotation(guard.faceAngle + Math.PI / 2);
      const coneColor = seesPlayer ? COLORS.danger : seesEcho ? COLORS.warning : COLORS.guard;
      this.drawVisionCone(guard.cone, guard.sprite.x, guard.sprite.y, guard.faceAngle, guard.data.visionRange, guard.data.visionAngle, coneColor);
    });
  }

  private updateCameras(): void {
    const playerPoint = { x: this.playerPosition.x, y: this.playerPosition.y };
    const echoPoint = this.activeEcho ? { x: this.activeEcho.sprite.x, y: this.activeEcho.sprite.y } : null;
    const lockdownSpeed = this.coreCollected ? 1.16 : 1;

    this.cameraSensors.forEach((camera) => {
      const channelActive = camera.data.channel ? Boolean(this.channels[camera.data.channel]) : true;
      const enabled = camera.data.channel
        ? camera.data.activeWhen === "inactive"
          ? !channelActive
          : channelActive
        : true;

      camera.currentAngle =
        Phaser.Math.DegToRad(camera.data.baseAngle) +
        Math.sin(this.runTimeMs * 0.001 * camera.data.speed * lockdownSpeed) * Phaser.Math.DegToRad(camera.data.sweep);

      const seesPlayer =
        enabled && this.canSeeTarget(camera.sprite, camera.currentAngle, camera.data.range, Phaser.Math.DegToRad(38), playerPoint);
      const seesEcho =
        enabled &&
        !seesPlayer &&
        !!echoPoint &&
        this.canSeeTarget(camera.sprite, camera.currentAngle, camera.data.range, Phaser.Math.DegToRad(38), echoPoint);

      camera.sprite.setTint(!enabled ? COLORS.muted : seesPlayer ? COLORS.danger : seesEcho ? COLORS.warning : COLORS.camera);
      camera.sprite.setRotation(camera.currentAngle + Math.PI / 2);
      if (seesPlayer) {
        this.registerExposure("OPTIC TRACE", 1.18);
      }

      camera.cone.clear();
      if (enabled) {
        const coneColor = seesPlayer ? COLORS.danger : seesEcho ? COLORS.warning : COLORS.camera;
        this.drawVisionCone(camera.cone, camera.sprite.x, camera.sprite.y, camera.currentAngle, camera.data.range, Phaser.Math.DegToRad(38), coneColor);
      }
    });
  }

  private updateLasers(): void {
    const player = bodyRect(this.playerPosition.x, this.playerPosition.y);
    this.lasers.forEach((laser) => {
      const active = this.isLaserActive(laser.data);
      laser.beam.setVisible(active);
      laser.glow.setVisible(active);
      if (!active) {
        return;
      }

      const horizontal = laser.data.orientation === "horizontal";
      const beamRect: Rect = {
        x: laser.data.x - (horizontal ? laser.data.length / 2 : 5),
        y: laser.data.y - (horizontal ? 5 : laser.data.length / 2),
        w: horizontal ? laser.data.length : 10,
        h: horizontal ? 10 : laser.data.length
      };
      if (overlaps(player, beamRect)) {
        this.triggerDetection();
      }
    });
  }

  private registerExposure(source: string, gain: number): void {
    if (gain >= this.exposureGain) {
      this.exposureGain = gain;
      this.exposureSource = source;
    }
  }

  private updateExposure(delta: number): void {
    if (this.roomState !== "active") {
      return;
    }

    if (this.exposureGain > 0) {
      const lockMs = this.exposureGain >= 1.1 ? 340 : 460;
      this.exposureLevel = Math.min(1, this.exposureLevel + (delta / lockMs) * this.exposureGain);
    } else {
      this.exposureLevel = Math.max(0, this.exposureLevel - delta / 540);
      if (this.exposureLevel === 0) {
        this.exposureSource = "";
      }
    }

    if (this.exposureLevel >= 1) {
      this.triggerDetection();
      this.exposureLevel = 0;
      this.exposureGain = 0;
      this.exposureSource = "";
    }
  }

  private updateCollectibles(): void {
    const { audioManager } = getServices(this);
    this.collectibles.forEach((collectible) => {
      if (collectible.taken) {
        return;
      }
      const pulse = 0.92 + (Math.sin(this.runTimeMs * 0.007 + collectible.data.x * 0.01) + 1) * 0.08;
      collectible.shape.setScale(pulse);
      collectible.glow.setScale(0.92 + pulse * 0.18);
      if (pointDistance(collectible.data, this.playerPosition) <= 20) {
        collectible.taken = true;
        collectible.shape.destroy();
        collectible.glow.destroy();
        this.credits += collectible.data.value;
        audioManager.playUi();
        const rewardLabel = this.add
          .text(collectible.data.x, collectible.data.y - 6, `+${collectible.data.value}`, {
            fontFamily: "Chakra Petch, sans-serif",
            fontSize: "15px",
            color: "#ffd76f",
            fontStyle: "700"
          })
          .setOrigin(0.5, 0.5)
          .setDepth(26);
        this.tweens.add({
          targets: rewardLabel,
          y: collectible.data.y - 30,
          alpha: 0,
          duration: 520,
          onComplete: () => rewardLabel.destroy()
        });
      }
    });
  }

  private updateCoreAndExit(): void {
    const nearCore = !this.coreCollected && pointDistance(this.level.core, this.playerPosition) <= INTERACT_DISTANCE;
    const nearExit = this.coreCollected && overlaps(bodyRect(this.playerPosition.x, this.playerPosition.y), this.level.exit);
    const pulse = 0.08 + Math.sin(this.runTimeMs * 0.008) * 0.03;
    const haloPulse = 1 + Math.sin(this.runTimeMs * 0.0056) * 0.08;
    const coreFloat = Math.sin(this.runTimeMs * 0.004) * 2.4;

    this.core.setY(this.level.core.y + coreFloat);
    this.coreHalo.setY(this.level.core.y + coreFloat);
    this.core.setScale(nearCore ? 1.08 : 1);
    this.core.setAlpha(this.coreCollected ? 0.4 : nearCore ? 0.98 : 0.88);
    this.coreHalo.setAlpha(this.coreCollected ? 0.04 : nearCore ? 0.2 : 0.12);
    this.coreHalo.setScale(nearCore ? haloPulse * 1.12 : haloPulse);
    this.exitGlow.setAlpha(this.coreCollected ? 0.16 + pulse : 0.08);
    this.exitZone.setAlpha(this.coreCollected ? (nearExit ? 0.34 : 0.22) : 0.12);
    this.exitZone.setStrokeStyle(2, this.coreCollected ? COLORS.success : COLORS.muted, this.coreCollected ? 0.95 : 0.45);
  }

  private updateHints(): void {
    const hint = this.findInteractionHint();
    this.interactionHint = hint;
    if (!hint) {
      this.hintLabel.setText("").setAlpha(0);
      return;
    }

    this.hintLabel.setText(hint).setAlpha(0.92);
  }

  private findInteractionHint(): string {
    if (this.roomState === "compromised") {
      return "Alarm triggered. Room rebooting...";
    }

    if (this.level.tutorial && !this.coreCollected && !this.channels["door-alpha"]) {
      const plate = this.plates.find((entry) => entry.data.channel === "door-alpha");
      const playerOnPlate = plate ? overlaps(bodyRect(this.playerPosition.x, this.playerPosition.y), plate.data) : false;
      if (this.activeEcho) {
        return `Echo is holding the relay and blinding the watcher. Cross now, use the pillar to break the sentry's line, and press E to steal ${this.level.payload.name}.`;
      }
      if (playerOnPlate) {
        return "The relay is keyed to echoes only. Step off, then deploy the recorded loop so your clone holds the plate for you.";
      }
      if (this.recordedSamples.length < 12) {
        return "Charge a short loop, end it on the cyan plate, then press Q to deploy the echo.";
      }
      return "The cyan plate opens the relay and blinds the watcher, but only when the echo is standing on it. Leave your clone there, cross fast, then use the pillar before committing to the theft.";
    }

    if (!this.coreCollected && pointDistance(this.playerPosition, this.level.core) <= INTERACT_DISTANCE) {
      return `${this.level.payload.name} is in reach. Press E to steal it.`;
    }

    if (this.coreCollected && overlaps(bodyRect(this.playerPosition.x, this.playerPosition.y), this.level.exit)) {
      return "Exit ready. Press E to exfil.";
    }

    if (this.exposureLevel > 0.2 && this.exposureSource) {
      return `${this.exposureSource} at ${Math.round(this.exposureLevel * 100)}%. Break line of sight now.`;
    }

    const activeBreach = this.getActiveBreachLabel();
    if (activeBreach) {
      return this.coreCollected
        ? `${activeBreach}. Get back through before the facility relocks.`
        : `${activeBreach}. Steal fast and beat the lockdown.`;
    }

    const point = { x: this.playerPosition.x, y: this.playerPosition.y };
    const nearbySwitch = this.switches.find((entry) => pointDistance(point, entry.data) <= INTERACT_DISTANCE);
    if (nearbySwitch) {
      return `${nearbySwitch.data.label}. Press E.`;
    }

    const nearbyTerminal = this.terminals.find((entry) => pointDistance(point, entry.data) <= INTERACT_DISTANCE);
    if (nearbyTerminal) {
      return `${nearbyTerminal.data.label}. Interact to start hacking.`;
    }

    if (!this.coreCollected) {
      return this.level.tip;
    }

    return `${this.level.payload.name} secured. Get back to the exit clean.`;
  }

  private tryInteract(point: Point, actor: "player" | "echo"): void {
    const { audioManager } = getServices(this);

    if (actor === "player" && !this.coreCollected && pointDistance(point, this.level.core) <= INTERACT_DISTANCE) {
      this.collectCore();
      audioManager.playHack();
      return;
    }

    if (actor === "player" && this.coreCollected && overlaps(bodyRect(point.x, point.y), this.level.exit)) {
      this.completeLevel();
      return;
    }

    const nearbySwitch = this.switches.find((entry) => pointDistance(point, entry.data) <= INTERACT_DISTANCE);
    if (nearbySwitch) {
      this.armTimedChannel(nearbySwitch.data.channel);
      nearbySwitch.shape.setFillStyle(COLORS.success, 0.2);
      this.emitNoise({ x: nearbySwitch.data.x, y: nearbySwitch.data.y }, actor === "echo" ? 150 : 132, actor);
      audioManager.playDoor();
      return;
    }

    const nearbyTerminal = this.terminals.find((entry) => pointDistance(point, entry.data) <= INTERACT_DISTANCE);
    if (nearbyTerminal && !nearbyTerminal.activeHack) {
      nearbyTerminal.activeHack = {
        remainingMs: nearbyTerminal.data.hackTimeMs || HACK_DURATION_MS,
        actor
      };
      nearbyTerminal.shape.setFillStyle(COLORS.warning, 0.22);
      this.emitNoise({ x: nearbyTerminal.data.x, y: nearbyTerminal.data.y }, actor === "echo" ? 168 : 146, actor);
      audioManager.playHack();
    }
  }

  private triggerDetection(): void {
    const { audioManager } = getServices(this);
    if (this.detectionCooldown > 0 || this.roomState !== "active") {
      return;
    }
    this.detectionCooldown = DETECTION_COOLDOWN_MS;
    this.detections += 1;
    this.roomState = "compromised";
    this.stateTimer = 900;
    this.alarmFlashTimer = ALERT_FLASH_MS;
    this.destroyEcho();
    audioManager.setMusicMode("alarm");
    this.showBanner("COMPROMISED", "The facility clocked the real you. Room reboot in progress.", 900);
    this.cameras.main.shake(140, 0.004);
    audioManager.playDetect();
  }

  private refreshHud(): void {
    const { uiManager, saveManager, audioManager } = getServices(this);
    const elapsedSeconds = this.runTimeMs / 1000;
    const bufferDuration =
      this.recordedSamples.length > 1 ? this.recordedSamples[this.recordedSamples.length - 1]!.t - this.recordedSamples[0]!.t : 0;

    const hudState: HudState = {
      levelLabel: this.level.name,
      timeLabel: `${elapsedSeconds.toFixed(1)}s`,
      detections: this.detections,
      objective: this.getObjectiveLabel(),
      echoCharge: Phaser.Math.Clamp(bufferDuration / ECHO_DURATION_MS, 0, 1),
      credits: this.credits,
      interactionHint: this.interactionHint,
      breachLabel: this.getActiveBreachLabel(),
      traceLabel: this.exposureLevel > 0 ? `${this.exposureSource || "TRACE"} ${Math.round(this.exposureLevel * 100)}%` : ""
    };

    uiManager.renderHud(hudState, () => {
      audioManager.playUi();
      this.scene.launch(SCENE_KEYS.PAUSE, { levelId: this.level.id });
      this.scene.pause();
    });

    uiManager.applySettings(saveManager.getSettings());
  }

  private completeLevel(): void {
    if (this.roomState !== "active") {
      return;
    }

    this.roomState = "complete";
    const { saveManager, levelManager, audioManager } = getServices(this);
    const nextLevelId = levelManager.getNextLevelId(this.level.id);
    const timeSeconds = this.runTimeMs / 1000;
    const rank = this.getRank(timeSeconds, this.detections);
    const breakdown = [
      { label: "Contract base", value: 2500 },
      { label: "Recovered credits", value: this.credits * 4 },
      { label: "Ghost bonus", value: this.detections === 0 ? 260 : 0 },
      { label: "Tempo pressure", value: -Math.round(timeSeconds * 16) },
      { label: "Alert penalty", value: -this.detections * 180 },
      { label: "Echo overspend", value: -Math.max(0, this.echoesUsed - this.level.parEchoes) * 70 }
    ];
    const score = Math.max(400, breakdown.reduce((total, item) => total + item.value, 0));

    const result: LevelResult = {
      levelId: this.level.id,
      levelName: this.level.name,
      payloadName: this.level.payload.name,
      payloadDescription: this.level.payload.description,
      timeMs: Math.round(this.runTimeMs),
      detections: this.detections,
      credits: this.credits,
      echoesUsed: this.echoesUsed,
      score,
      scoreBreakdown: breakdown,
      rank,
      nextLevelId
    };

    saveManager.recordResult(result, this.level.order);
    audioManager.setMusicMode("result");
    audioManager.playSuccess();
    this.scene.start(SCENE_KEYS.RESULTS, { result });
  }

  private getActiveBreachLabel(): string {
    const activeTimers = Object.values(this.channelTimers);
    if (activeTimers.length === 0) {
      return "";
    }
    const nextClose = Math.min(...activeTimers);
    return `Relock in ${(nextClose / 1000).toFixed(1)}s`;
  }

  private getRank(timeSeconds: number, detections: number): LevelResult["rank"] {
    if (detections === 0 && timeSeconds <= this.level.timeTargets.s) {
      return "S";
    }
    if (detections <= 1 && timeSeconds <= this.level.timeTargets.a) {
      return "A";
    }
    if (detections <= 3 && timeSeconds <= this.level.timeTargets.b) {
      return "B";
    }
    return "C";
  }

  private refreshExtractionWindow(): void {
    const extractionChannels = this.getLockdownChannels();
    const returnWindow = Math.max(3200, Math.round(this.getBreachWindowMs() * 0.72));

    extractionChannels.forEach((channel) => {
      const current = this.channelTimers[channel] ?? 0;
      this.armTimedChannel(channel, Math.max(current, returnWindow));
    });

    this.showBanner(
      "CORE SECURED",
      `Extraction clock started. The facility relocks in ${(returnWindow / 1000).toFixed(1)}s. Redeploy the echo and run.`,
      2600
    );
  }

  private getLockdownChannels(): string[] {
    const channels = new Set<string>();
    this.level.doors.forEach((door) => channels.add(door.channel));
    this.level.lasers.forEach((laser) => {
      if (laser.channel) {
        channels.add(laser.channel);
      }
    });
    this.level.cameras.forEach((camera) => {
      if (camera.channel) {
        channels.add(camera.channel);
      }
    });
    return [...channels];
  }

  private getBlockingRects(): Rect[] {
    return [...this.level.walls, ...this.closedDoorRects];
  }

  private renderWall(wall: Rect, accent: number, index: number): void {
    const centerX = wall.x + wall.w / 2;
    const centerY = wall.y + wall.h / 2;
    const horizontal = wall.w >= wall.h;
    const innerWidth = Math.max(16, wall.w - 18);
    const innerHeight = Math.max(16, wall.h - 18);

    this.add.rectangle(centerX + 5, centerY + 7, wall.w + 22, wall.h + 22, 0x02050d, 0.34).setDepth(8);
    this.add.rectangle(centerX, centerY, wall.w + 18, wall.h + 18, accent, 0.045).setDepth(9);
    this.add.rectangle(centerX, centerY, wall.w + 8, wall.h + 8, 0x091221, 0.96).setDepth(10);
    this.add
      .rectangle(centerX, centerY, wall.w, wall.h, 0x132741, 1)
      .setStrokeStyle(2, 0x6eb8ff, 0.28)
      .setDepth(12);
    this.add
      .rectangle(centerX, centerY, innerWidth, innerHeight, 0x0b1729, 0.74)
      .setStrokeStyle(1, 0xffffff, 0.04)
      .setDepth(13);

    const stripe = this.add.graphics().setDepth(14);
    stripe.lineStyle(3, accent, 0.22);
    if (horizontal) {
      stripe.lineBetween(wall.x + 18, wall.y + 10, wall.x + wall.w - 18, wall.y + 10);
      stripe.lineStyle(1, 0xffffff, 0.05);
      stripe.lineBetween(wall.x + 18, wall.y + wall.h - 12, wall.x + wall.w - 18, wall.y + wall.h - 12);
    } else {
      stripe.lineBetween(wall.x + 10, wall.y + 18, wall.x + 10, wall.y + wall.h - 18);
      stripe.lineStyle(1, 0xffffff, 0.05);
      stripe.lineBetween(wall.x + wall.w - 12, wall.y + 18, wall.x + wall.w - 12, wall.y + wall.h - 18);
    }

    const nodeCount = Phaser.Math.Clamp(Math.round((horizontal ? wall.w : wall.h) / 180), 1, 3);
    for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex += 1) {
      const ratio = nodeCount === 1 ? 0.5 : nodeIndex / (nodeCount - 1);
      const nodeX = horizontal ? Phaser.Math.Linear(wall.x + 20, wall.x + wall.w - 20, ratio) : centerX;
      const nodeY = horizontal ? centerY : Phaser.Math.Linear(wall.y + 20, wall.y + wall.h - 20, ratio);
      const width = horizontal ? 20 : 12;
      const height = horizontal ? 12 : 20;
      const tint = nodeIndex % 2 === index % 2 ? accent : 0xb6e4ff;
      this.add
        .rectangle(nodeX, nodeY, width, height, tint, 0.34)
        .setStrokeStyle(1, 0xffffff, 0.08)
        .setDepth(14);
    }
  }

  private collectCore(): void {
    if (this.coreCollected) {
      return;
    }

    this.coreCollected = true;
    this.core.setTint(COLORS.success);
    this.core.setAlpha(0.4);
    this.coreHalo.setAlpha(0.08);
    this.emitNoise({ x: this.level.core.x, y: this.level.core.y }, 236, "system");
    this.refreshExtractionWindow();
    this.showBanner(
      "PAYLOAD SECURED",
      `${this.level.payload.name} is live. ${this.level.payload.description} Extraction clock started. Redeploy the echo and get out.`,
      2800
    );
    this.cameras.main.shake(120, 0.0022);
    this.cameras.main.flash(160, 120, 255, 220, false);
  }

  private getObjectiveLabel(): string {
    if (this.roomState === "compromised") {
      return "Alarm triggered";
    }

    if (this.level.tutorial) {
      const tutorialStage = this.getTutorialStage();
      if (tutorialStage === 0) {
        return "Step 1 // Echo-breach the relay";
      }
      if (tutorialStage === 1) {
        return `Step 2 // Steal ${this.level.payload.name}`;
      }
      return `Step 3 // Exfil with ${this.level.payload.name}`;
    }

    if (!this.coreCollected) {
      return `Steal ${this.level.payload.name}`;
    }

    if (this.getActiveBreachLabel()) {
      return `Extract ${this.level.payload.name}`;
    }

    return `Exfil with ${this.level.payload.name}`;
  }

  private showBanner(title: string, subtitle: string, durationMs: number): void {
    this.bannerTitle.setText(title);
    this.bannerSubtitle.setText(subtitle);
    this.bannerTitle.setAlpha(1);
    this.bannerSubtitle.setAlpha(0.95);
    this.bannerTimer = durationMs;
  }

  private updateBanner(delta: number): void {
    if (this.bannerTimer <= 0) {
      this.bannerTitle.setAlpha(0);
      this.bannerSubtitle.setAlpha(0);
      return;
    }

    this.bannerTimer = Math.max(0, this.bannerTimer - delta);
    const alpha = this.bannerTimer > 900 ? 1 : Phaser.Math.Clamp(this.bannerTimer / 900, 0, 1);
    this.bannerTitle.setAlpha(alpha);
    this.bannerSubtitle.setAlpha(alpha * 0.92);
  }

  private updateTutorialBeat(): void {
    if (!this.level.tutorial || this.roomState !== "active") {
      return;
    }

    const stage = this.getTutorialStage();
    if (stage === this.tutorialBeat) {
      return;
    }

    this.tutorialBeat = stage;
    if (stage === 0) {
      this.showBanner(
        "STEP 1 // PRINT THE LOOP",
        "End your recording on the cyan plate. Only the echo can hold the relay long enough to crack the breach and blind the watcher.",
        3000
      );
      return;
    }

    if (stage === 1) {
      this.showBanner(
        "STEP 2 // COMMIT",
        `The breach clock is running. Cross while the camera is blind, use the pillar to break the sentry's line, then steal ${this.level.payload.name}.`,
        2800
      );
      return;
    }

    this.showBanner("STEP 3 // VANISH", `Payload lifted. The gate is hot again. Get ${this.level.payload.name} out clean.`, 2400);
  }

  private getTutorialStage(): number {
    if (!this.channels["door-alpha"]) {
      return 0;
    }
    if (!this.coreCollected) {
      return 1;
    }
    return 2;
  }

  private getChannelTargets(channel: string): Point[] {
    return [
      ...this.level.doors
        .filter((entry) => entry.channel === channel)
        .map((entry) => ({ x: entry.x + entry.w / 2, y: entry.y + entry.h / 2 })),
      ...this.level.lasers.filter((entry) => entry.channel === channel).map((entry) => ({ x: entry.x, y: entry.y })),
      ...this.level.cameras.filter((entry) => entry.channel === channel).map((entry) => ({ x: entry.x, y: entry.y }))
    ];
  }

  private drawDataLink(from: Point, to: Point, color: number, alpha: number, phase: number): void {
    const distance = pointDistance(from, to);
    const segments = Math.max(3, Math.floor(distance / 34));
    for (let index = 0; index < segments; index += 1) {
      if ((index + phase) % 2 !== 0) {
        continue;
      }
      const startT = index / segments;
      const endT = Math.min(1, (index + 0.75) / segments);
      const startX = Phaser.Math.Linear(from.x, to.x, startT);
      const startY = Phaser.Math.Linear(from.y, to.y, startT);
      const endX = Phaser.Math.Linear(from.x, to.x, endT);
      const endY = Phaser.Math.Linear(from.y, to.y, endT);
      this.logicOverlay.lineStyle(2, color, alpha);
      this.logicOverlay.lineBetween(startX, startY, endX, endY);
    }
  }

  private drawObjectivePulse(center: Point, color: number, radius: number, alpha: number): void {
    this.objectiveOverlay.lineStyle(2, color, 0.34 + alpha * 0.18);
    this.objectiveOverlay.strokeCircle(center.x, center.y, radius);
    this.objectiveOverlay.lineStyle(1, color, 0.18 + alpha * 0.12);
    this.objectiveOverlay.strokeCircle(center.x, center.y, radius + 12);
    this.objectiveOverlay.fillStyle(color, 0.12 + alpha * 0.12);
    this.objectiveOverlay.fillCircle(center.x, center.y, 9);
  }

  private drawVisionCone(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    angle: number,
    range: number,
    spread: number,
    color: number
  ): void {
    graphics.clear();
    graphics.fillStyle(color, 0.09);
    graphics.beginPath();
    graphics.moveTo(x, y);
    graphics.lineTo(x + Math.cos(angle - spread / 2) * range, y + Math.sin(angle - spread / 2) * range);
    graphics.lineTo(x + Math.cos(angle + spread / 2) * range, y + Math.sin(angle + spread / 2) * range);
    graphics.closePath();
    graphics.fillPath();
    graphics.lineStyle(1, color, 0.26);
    graphics.strokePath();
  }

  private canSeeTarget(
    originObject: Phaser.GameObjects.Image,
    angle: number,
    range: number,
    spread: number,
    target: Point
  ): boolean {
    const distance = Phaser.Math.Distance.Between(originObject.x, originObject.y, target.x, target.y);
    if (distance > range) {
      return false;
    }

    const targetAngle = Phaser.Math.Angle.Between(originObject.x, originObject.y, target.x, target.y);
    const angleDelta = Phaser.Math.Angle.Wrap(targetAngle - angle);
    if (Math.abs(angleDelta) > spread / 2) {
      return false;
    }

    return !this.isVisionBlocked({ x: originObject.x, y: originObject.y }, target);
  }

  private isVisionBlocked(origin: Point, target: Point): boolean {
    const blockers = this.getBlockingRects();
    const distance = pointDistance(origin, target);
    const sampleCount = Math.max(8, Math.ceil(distance / 14));
    for (let step = 1; step <= sampleCount; step += 1) {
      const t = step / sampleCount;
      const x = Phaser.Math.Linear(origin.x, target.x, t);
      const y = Phaser.Math.Linear(origin.y, target.y, t);
      const pointRect = { x: x - 2, y: y - 2, w: 4, h: 4 };
      if (blockers.some((rect) => overlaps(pointRect, rect))) {
        return true;
      }
    }
    return false;
  }

  private isLaserActive(laser: LaserData): boolean {
    let active = true;
    if (laser.channel) {
      const channelActive = Boolean(this.channels[laser.channel]);
      active = laser.activeWhen === "inactive" ? !channelActive : channelActive;
    }

    if (active && laser.cycle) {
      const total = laser.cycle.onMs + laser.cycle.offMs;
      const offset = laser.cycle.offsetMs ?? 0;
      const localTime = (this.runTimeMs + offset) % total;
      active = localTime < laser.cycle.onMs;
    }

    return active;
  }

  private animateBackground(delta: number): void {
    this.ambientLines.forEach((line, index) => {
      line.alpha = 0.08 + (Math.sin(this.runTimeMs * 0.0016 + index) + 1) * 0.06;
      line.rotation += delta * 0.00001 * (index % 2 === 0 ? 1 : -1);
    });
  }
}
