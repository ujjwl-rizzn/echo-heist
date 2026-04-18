export type Rank = "S" | "A" | "B" | "C";
export type TouchMode = "auto" | "on" | "off";
export type ChannelState = Record<string, boolean>;

export interface Point { x: number; y: number }
export interface Rect  { x: number; y: number; w: number; h: number }

export interface GuardData {
  id: string; x: number; y: number;
  patrol: Point[]; speed: number;
  visionRange: number; visionAngle: number;
}

export interface CameraData {
  id: string; x: number; y: number;
  baseAngle: number; sweep: number; speed: number; range: number;
  channel?: string; activeWhen?: "active" | "inactive";
}

export interface LaserCycle { onMs: number; offMs: number; offsetMs?: number }

export interface LaserData {
  id: string; x: number; y: number;
  length: number; orientation: "horizontal" | "vertical";
  channel?: string; activeWhen?: "active" | "inactive";
  cycle?: LaserCycle;
}

export interface DoorData extends Rect {
  id: string; channel: string;
}

export interface PressurePlateData extends Rect {
  id: string; channel: string;
  mode?: "hold" | "pulse" | "echo";
}

export interface SwitchData {
  id: string; x: number; y: number;
  channel: string; label: string;
}

export interface TerminalData {
  id: string; x: number; y: number;
  channel: string; label: string;
  mode: "toggle" | "set";
  hackTimeMs: number;
}

export interface CollectibleData {
  id: string; x: number; y: number; value: number;
}

export interface ExitData extends Rect { requiresCore: boolean }

export interface TimeTargets { s: number; a: number; b: number }

export interface PayloadData { name: string; description: string }

export interface LevelDefinition {
  id: string; order: number; name: string;
  brief: string; tip: string;
  payload: PayloadData;
  tutorial?: boolean;
  requiresBreach?: boolean;
  breachWindowMs?: number;
  world: { width: number; height: number };
  spawn: Point;
  walls: Rect[];
  doors: DoorData[];
  guards: GuardData[];
  cameras: CameraData[];
  lasers: LaserData[];
  plates: PressurePlateData[];
  switches: SwitchData[];
  terminals: TerminalData[];
  collectibles: CollectibleData[];
  core: Point;
  exit: ExitData;
  initialChannels: ChannelState;
  timeTargets: TimeTargets;
  parEchoes: number;
}

export interface CosmeticTheme {
  id: string; name: string;
  accent: string; accentHex: number; secondary: string;
}

export interface SettingsData {
  masterVolume: number; musicVolume: number; sfxVolume: number;
  reducedMotion: boolean; showScanlines: boolean;
  touchControls: TouchMode; selectedTheme: string;
}

export interface RewardMeta {
  totalClaims: number; totalCreditsEarned: number;
  lastSponsorDropAt: number | null;
}

export interface LevelBest {
  completed: boolean; bestTimeMs: number | null; bestRank: Rank | null;
}

export interface SaveData {
  version: number; unlockedLevelOrder: number; totalCredits: number;
  levels: Record<string, LevelBest>;
  settings: SettingsData; rewardMeta: RewardMeta;
}

export interface HudState {
  levelLabel: string; timeLabel: string;
  detections: number; objective: string;
  echoCharge: number; credits: number;
  interactionHint: string; breachLabel: string; traceLabel: string;
}

export interface ScoreBreakdownItem { label: string; value: number }

export interface LevelResult {
  levelId: string; levelName: string;
  payloadName: string; payloadDescription: string;
  timeMs: number; detections: number;
  credits: number; echoesUsed: number;
  score: number; scoreBreakdown: ScoreBreakdownItem[];
  rank: Rank; nextLevelId: string | null;
}

export interface RewardPanelData {
  eyebrow: string; title: string; copy: string;
  buttonLabel: string; note: string; disabled?: boolean;
}

export interface NoticeData { tone: "info" | "success" | "warning"; text: string }

export interface RewardClaimResult {
  status: "granted" | "cancelled" | "unavailable" | "error";
  creditsGranted: number; totalCredits: number;
  message: string; providerLabel: string;
}

export interface EchoSample extends Point { t: number; interact: boolean }

export interface LevelCardData {
  id: string; order: number; name: string; brief: string;
  locked: boolean; bestRank: Rank | null; bestTimeMs: number | null;
}

export interface MainMenuHandlers {
  onPlay: () => void; onLevels: () => void;
  onHow: () => void; onSettings: () => void;
  onSponsorDrop?: () => void;
}

export interface HowToPlayHandlers { onBack: () => void; onTutorial: () => void }

export interface PauseHandlers {
  onResume: () => void; onRetry: () => void;
  onSettings: () => void; onMenu: () => void;
}

export interface ResultHandlers {
  onRetry: () => void; onNext: (() => void) | null;
  onMenu: () => void; onLevels: () => void;
  onSponsorBoost?: () => void;
}

export interface SettingsHandlers {
  onBack: () => void; onSave: (s: SettingsData) => void;
}

import type { AudioManager }     from "./managers/AudioManager";
import type { LevelManager }     from "./managers/LevelManager";
import type { RewardedAdManager } from "./managers/RewardedAdManager";
import type { SaveManager }      from "./managers/SaveManager";
import type { UIManager }        from "./managers/UIManager";

export interface Services {
  saveManager:   SaveManager;
  audioManager:  AudioManager;
  levelManager:  LevelManager;
  rewardManager: RewardedAdManager;
  uiManager:     UIManager;
}
