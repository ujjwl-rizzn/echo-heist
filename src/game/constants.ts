export const STORAGE_KEY = "echo-heist.save";
export const SAVE_VERSION = 1;

export const WORLD = {
  WIDTH: 1280,
  HEIGHT: 720
} as const;

export const SCENE_KEYS = {
  BOOT: "boot",
  PRELOAD: "preload",
  MENU: "menu",
  LEVEL_SELECT: "level-select",
  TUTORIAL: "tutorial",
  GAME: "game",
  PAUSE: "pause",
  RESULTS: "results",
  SETTINGS: "settings"
} as const;

export const COLORS = {
  bg: 0x050611,
  panel: 0x0a1120,
  panelSoft: 0x13223a,
  wall: 0x16263f,
  wallEdge: 0x315078,
  player: 0x7ef6ff,
  echo: 0x6f9dff,
  guard: 0xff648e,
  camera: 0xffd76f,
  laser: 0xff4c68,
  core: 0x9affd6,
  exit: 0x78ff8d,
  text: 0xf2fbff,
  muted: 0x8da3bc,
  danger: 0xff526e,
  success: 0x78ff8d,
  warning: 0xffd76f
} as const;

export const PLAYER_SIZE = 22;
export const PLAYER_HITBOX_SIZE = 18;
export const PLAYER_SPEED = 238;
export const STEALTH_SPEED = 152;
export const ECHO_DURATION_MS = 4200;
export const ECHO_SAMPLE_MS = 90;
export const INTERACT_DISTANCE = 62;
export const HACK_DURATION_MS = 900;
export const ALERT_FLASH_MS = 420;
export const DETECTION_COOLDOWN_MS = 850;
export const TOUCH_JOYSTICK_RADIUS = 58;
export const TOUCH_DEAD_ZONE = 10;

export const RANK_ORDER = ["S", "A", "B", "C"] as const;
