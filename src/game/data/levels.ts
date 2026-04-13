import type { LevelDefinition, Point, Rect } from "../types";

const point = (x: number, y: number): Point => ({ x, y });
const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });
const sharedWorld = { width: 1280, height: 720 };

export const levels: LevelDefinition[] = [
  {
    id: "tutorial-split",
    order: 0,
    tutorial: true,
    name: "Tutorial // First Theft",
    brief:
      "Helix Ark is about to erase a witness memory seed from the district archive. Print a loop, let the echo hold the relay, slip past the blinded camera, bait the sentry with a ghost burst if he pins you, steal the seed, and get back out before the floor relocks.",
    tip:
      "This relay only accepts the echo. End your recording on the cyan plate, deploy the clone, cross the watched lane, then use the cover pillar. If the sentry locks your lane, a fresh echo burst can spoof him for a couple seconds.",
    payload: {
      name: "Witness Seed K-13",
      description: "A living testimony lattice that proves the archive purge was staged."
    },
    requiresBreach: true,
    breachWindowMs: 8600,
    world: sharedWorld,
    spawn: point(150, 360),
    walls: [
      rect(0, 0, 286, 238),
      rect(0, 486, 286, 234),
      rect(324, 0, 432, 228),
      rect(324, 492, 432, 228),
      rect(756, 0, 524, 198),
      rect(756, 520, 524, 200),
      rect(940, 198, 120, 136),
      rect(940, 454, 120, 66),
      rect(1110, 244, 58, 176)
    ],
    doors: [{ id: "door-alpha", x: 286, y: 238, w: 38, h: 248, channel: "door-alpha" }],
    guards: [
      {
        id: "guard-tutorial",
        x: 1086,
        y: 386,
        patrol: [point(1086, 286), point(1086, 470)],
        speed: 74,
        visionRange: 188,
        visionAngle: Math.PI / 3.2
      }
    ],
    cameras: [
      {
        id: "camera-tutorial",
        x: 542,
        y: 214,
        baseAngle: 90,
        sweep: 32,
        speed: 1.02,
        range: 286,
        channel: "door-alpha",
        activeWhen: "inactive"
      }
    ],
    lasers: [],
    plates: [{ id: "plate-alpha", x: 154, y: 402, w: 84, h: 84, channel: "door-alpha", mode: "echo" }],
    switches: [],
    terminals: [],
    collectibles: [
      { id: "credit-0", x: 828, y: 254, value: 60 },
      { id: "credit-1", x: 1160, y: 474, value: 90 }
    ],
    core: point(1214, 332),
    exit: { x: 66, y: 300, w: 58, h: 120, requiresCore: true },
    initialChannels: { "door-alpha": false },
    timeTargets: { s: 38, a: 56, b: 82 },
    parEchoes: 1
  },
  {
    id: "silent-switch",
    order: 1,
    name: "01 // Silent Switch",
    brief:
      "The transit board buried a commuter kill-list in a sealed switchyard. Arm the bridge from the pocket, slip the optic lane, use sound to misdirect the patrol, grab the list, and beat the relock before the yard seals.",
    tip:
      "Use the switch to open the bridge, but do not sprint blindly. Noise can drag the sentry off the line you want to use.",
    payload: {
      name: "Transit Kill List",
      description: "A route ledger showing which passengers were marked to disappear during the next blackout commute."
    },
    requiresBreach: true,
    breachWindowMs: 7600,
    world: sharedWorld,
    spawn: point(150, 382),
    walls: [
      rect(0, 0, 306, 238),
      rect(0, 482, 306, 238),
      rect(392, 0, 288, 236),
      rect(392, 484, 288, 236),
      rect(754, 0, 164, 180),
      rect(754, 404, 164, 316),
      rect(1028, 0, 252, 228),
      rect(1028, 476, 252, 244)
    ],
    doors: [{ id: "bridge", x: 306, y: 238, w: 86, h: 244, channel: "bridge" }],
    guards: [
      {
        id: "guard-1",
        x: 1098,
        y: 344,
        patrol: [point(1022, 344), point(1188, 344)],
        speed: 94,
        visionRange: 224,
        visionAngle: Math.PI / 2.85
      }
    ],
    cameras: [
      {
        id: "camera-0",
        x: 842,
        y: 176,
        baseAngle: 90,
        sweep: 46,
        speed: 1.08,
        range: 272
      }
    ],
    lasers: [],
    plates: [],
    switches: [{ id: "switch-bridge", x: 186, y: 430, channel: "bridge", label: "Arm bridge" }],
    terminals: [],
    collectibles: [
      { id: "credit-2", x: 598, y: 442, value: 70 },
      { id: "credit-3", x: 1188, y: 266, value: 90 }
    ],
    core: point(1142, 344),
    exit: { x: 66, y: 300, w: 58, h: 120, requiresCore: true },
    initialChannels: { bridge: false },
    timeTargets: { s: 44, a: 64, b: 90 },
    parEchoes: 1
  },
  {
    id: "ghost-relay",
    order: 2,
    name: "02 // Ghost Relay",
    brief:
      "A proxy choir key is locked behind a relay door and a hush laser. Leave the echo on the plate, hack the hush line inside the breach window, slip the guard box, and use the clone to keep attention off your real path.",
    tip:
      "The echo buys the door. Your job is to make the inside lane safe fast enough to use that opening twice without leaving a loud trail.",
    payload: {
      name: "Proxy Choir Key",
      description: "An authentication shard that can wake archived voices Helix marked as disposable."
    },
    requiresBreach: true,
    breachWindowMs: 7000,
    world: sharedWorld,
    spawn: point(148, 330),
    walls: [
      rect(0, 0, 282, 218),
      rect(0, 418, 282, 302),
      rect(346, 0, 94, 286),
      rect(346, 434, 94, 286),
      rect(520, 0, 220, 180),
      rect(520, 502, 220, 218),
      rect(830, 0, 108, 250),
      rect(830, 390, 108, 330),
      rect(1014, 0, 266, 182),
      rect(1014, 508, 266, 212)
    ],
    doors: [{ id: "relay-door", x: 282, y: 218, w: 64, h: 200, channel: "relay-door" }],
    guards: [
      {
        id: "guard-2",
        x: 1110,
        y: 348,
        patrol: [point(1070, 268), point(1184, 268), point(1184, 430), point(1070, 430)],
        speed: 94,
        visionRange: 228,
        visionAngle: Math.PI / 2.75
      }
    ],
    cameras: [],
    lasers: [
      {
        id: "laser-relay",
        x: 972,
        y: 344,
        length: 222,
        orientation: "vertical",
        channel: "laser-hush",
        activeWhen: "inactive"
      }
    ],
    plates: [{ id: "plate-relay", x: 156, y: 288, w: 82, h: 82, channel: "relay-door", mode: "echo" }],
    switches: [],
    terminals: [
      {
        id: "term-0",
        x: 646,
        y: 466,
        channel: "laser-hush",
        label: "Hush laser spine",
        mode: "toggle",
        hackTimeMs: 860
      }
    ],
    collectibles: [
      { id: "credit-4", x: 586, y: 232, value: 60 },
      { id: "credit-5", x: 1146, y: 232, value: 100 }
    ],
    core: point(1144, 344),
    exit: { x: 66, y: 270, w: 58, h: 120, requiresCore: true },
    initialChannels: { "relay-door": false, "laser-hush": false },
    timeTargets: { s: 52, a: 72, b: 96 },
    parEchoes: 2
  },
  {
    id: "optic-bloom",
    order: 3,
    name: "03 // Optic Bloom",
    brief:
      "The optics division hid its bloom index behind a hack-gated lane. Crack the vault relay while the camera owns the middle corridor, then cut through before the lock cycles back.",
    tip:
      "Start the hack when the camera turns away. Once the lane is open, commit and keep moving.",
    payload: {
      name: "Bloom Index",
      description: "A predictive model showing which neighborhoods will lose light, water, and network access next."
    },
    breachWindowMs: 7200,
    world: sharedWorld,
    spawn: point(136, 560),
    walls: [rect(382, 98, 42, 486), rect(732, 112, 38, 156), rect(732, 392, 38, 192)],
    doors: [{ id: "vault-lane", x: 742, y: 270, w: 20, h: 122, channel: "vault-lane" }],
    guards: [],
    cameras: [
      {
        id: "camera-1",
        x: 586,
        y: 352,
        baseAngle: 0,
        sweep: 76,
        speed: 1.2,
        range: 300,
        channel: "vault-lane",
        activeWhen: "inactive"
      }
    ],
    lasers: [],
    plates: [],
    switches: [],
    terminals: [
      {
        id: "term-1",
        x: 218,
        y: 594,
        channel: "vault-lane",
        label: "Hack vault relay",
        mode: "toggle",
        hackTimeMs: 900
      }
    ],
    collectibles: [{ id: "credit-6", x: 610, y: 146, value: 80 }],
    core: point(1088, 196),
    exit: { x: 66, y: 534, w: 58, h: 120, requiresCore: true },
    initialChannels: { "vault-lane": false },
    timeTargets: { s: 56, a: 78, b: 104 },
    parEchoes: 2
  },
  {
    id: "crossfade",
    order: 4,
    name: "04 // Crossfade",
    brief:
      "Two security channels guard a ledger Helix uses to swap identities between debtors and ghosts. Let the echo hold one lane while you hush the other, then take the ledger clean.",
    tip:
      "This room wants both bodies working at once: echo on one task, you on the other.",
    payload: {
      name: "Crossfade Ledger",
      description: "A remapping file used to overwrite legal identities and bury the original record."
    },
    breachWindowMs: 6600,
    world: sharedWorld,
    spawn: point(126, 560),
    walls: [rect(420, 98, 40, 206), rect(420, 416, 40, 206), rect(826, 98, 40, 206), rect(826, 416, 40, 206)],
    doors: [{ id: "cross-door", x: 430, y: 316, w: 20, h: 106, channel: "cross-door" }],
    guards: [
      {
        id: "guard-3",
        x: 676,
        y: 206,
        patrol: [point(676, 206), point(676, 514)],
        speed: 94,
        visionRange: 214,
        visionAngle: Math.PI / 2.8
      }
    ],
    cameras: [],
    lasers: [
      {
        id: "laser-cross",
        x: 1030,
        y: 360,
        length: 220,
        orientation: "vertical",
        channel: "laser-hush",
        activeWhen: "inactive"
      }
    ],
    plates: [
      { id: "plate-cross", x: 154, y: 516, w: 82, h: 82, channel: "cross-door", mode: "echo" },
      { id: "plate-hush", x: 912, y: 110, w: 82, h: 82, channel: "laser-hush" }
    ],
    switches: [],
    terminals: [],
    collectibles: [{ id: "credit-7", x: 620, y: 566, value: 90 }],
    core: point(1124, 362),
    exit: { x: 66, y: 534, w: 58, h: 120, requiresCore: true },
    initialChannels: { "cross-door": false, "laser-hush": false },
    timeTargets: { s: 58, a: 82, b: 110 },
    parEchoes: 1
  },
  {
    id: "parallax-vault",
    order: 5,
    name: "05 // Parallax Vault",
    brief:
      "A blackfile proving Helix staged the district riots is locked behind floodlights, patrol bait, and a hacked vault door. Use the echo to pull eyes away, then take the blackfile.",
    tip:
      "The echo is safer bait than you are. Spend it to move the guard away from the terminal.",
    payload: {
      name: "Parallax Blackfile",
      description: "An internal incident brief proving the riots were simulated to justify the surveillance rollout."
    },
    breachWindowMs: 6100,
    world: sharedWorld,
    spawn: point(132, 566),
    walls: [rect(290, 136, 38, 466), rect(612, 136, 38, 224), rect(612, 456, 38, 146), rect(914, 98, 38, 504)],
    doors: [{ id: "parallax-door", x: 622, y: 364, w: 20, h: 98, channel: "parallax-door" }],
    guards: [
      {
        id: "guard-4",
        x: 470,
        y: 548,
        patrol: [
          point(470, 548),
          point(470, 408),
          point(780, 408),
          point(780, 176),
          point(780, 408),
          point(780, 520),
          point(780, 408),
          point(470, 408),
          point(470, 548)
        ],
        speed: 98,
        visionRange: 232,
        visionAngle: Math.PI / 2.7
      }
    ],
    cameras: [
      {
        id: "camera-2",
        x: 936,
        y: 352,
        baseAngle: 180,
        sweep: 56,
        speed: 1.12,
        range: 240,
        channel: "parallax-door",
        activeWhen: "inactive"
      }
    ],
    lasers: [
      {
        id: "laser-parallax",
        x: 1096,
        y: 224,
        length: 170,
        orientation: "horizontal",
        channel: "aux-light",
        activeWhen: "inactive",
        cycle: { onMs: 1200, offMs: 900 }
      }
    ],
    plates: [],
    switches: [{ id: "switch-parallax", x: 186, y: 610, channel: "aux-light", label: "Cut floodlights" }],
    terminals: [
      {
        id: "term-2",
        x: 508,
        y: 590,
        channel: "parallax-door",
        label: "Hack vault lock",
        mode: "toggle",
        hackTimeMs: 950
      }
    ],
    collectibles: [
      { id: "credit-8", x: 718, y: 548, value: 70 },
      { id: "credit-9", x: 1130, y: 506, value: 110 }
    ],
    core: point(1122, 160),
    exit: { x: 66, y: 534, w: 58, h: 120, requiresCore: true },
    initialChannels: { "parallax-door": false, "aux-light": false },
    timeTargets: { s: 62, a: 88, b: 116 },
    parEchoes: 2
  },
  {
    id: "redline-garden",
    order: 6,
    name: "06 // Redline Garden",
    brief:
      "The garden controller holds the redline map Helix uses to decide which blocks get abandoned. Beat layered patrols, staggered lasers, and the optic veil to steal it clean.",
    tip:
      "Tight recordings help more than long ones. Clean rhythm beats panic here.",
    payload: {
      name: "Redline Map",
      description: "A zoning model that marks who gets power, medicine, and patrol protection after the next lockdown."
    },
    breachWindowMs: 5700,
    world: sharedWorld,
    spawn: point(128, 360),
    walls: [rect(322, 118, 38, 182), rect(322, 420, 38, 182), rect(624, 220, 38, 280), rect(946, 118, 38, 182), rect(946, 420, 38, 182)],
    doors: [],
    guards: [
      {
        id: "guard-5",
        x: 470,
        y: 170,
        patrol: [point(470, 170), point(470, 550)],
        speed: 100,
        visionRange: 226,
        visionAngle: Math.PI / 2.7
      },
      {
        id: "guard-6",
        x: 1086,
        y: 544,
        patrol: [point(1086, 544), point(1086, 182)],
        speed: 96,
        visionRange: 220,
        visionAngle: Math.PI / 2.8
      }
    ],
    cameras: [
      {
        id: "camera-3",
        x: 648,
        y: 102,
        baseAngle: 90,
        sweep: 52,
        speed: 1.32,
        range: 260,
        channel: "garden-hush",
        activeWhen: "inactive"
      }
    ],
    lasers: [
      {
        id: "laser-garden-a",
        x: 810,
        y: 252,
        length: 236,
        orientation: "horizontal",
        channel: "garden-shield",
        activeWhen: "inactive",
        cycle: { onMs: 1500, offMs: 850 }
      },
      {
        id: "laser-garden-b",
        x: 810,
        y: 470,
        length: 236,
        orientation: "horizontal",
        cycle: { onMs: 980, offMs: 700, offsetMs: 420 }
      }
    ],
    plates: [{ id: "plate-garden", x: 156, y: 518, w: 82, h: 82, channel: "garden-shield" }],
    switches: [],
    terminals: [
      {
        id: "term-3",
        x: 1180,
        y: 606,
        channel: "garden-hush",
        label: "Sync alarm veil",
        mode: "toggle",
        hackTimeMs: 820
      }
    ],
    collectibles: [
      { id: "credit-10", x: 620, y: 614, value: 60 },
      { id: "credit-11", x: 1146, y: 124, value: 120 }
    ],
    core: point(1142, 360),
    exit: { x: 66, y: 300, w: 58, h: 120, requiresCore: true },
    initialChannels: { "garden-shield": false, "garden-hush": false },
    timeTargets: { s: 68, a: 94, b: 122 },
    parEchoes: 2
  },
  {
    id: "grand-theft-echo",
    order: 7,
    name: "07 // Grand Theft Echo",
    brief:
      "The last vault holds the Eidolon Charter: Helix's master plan for rewriting who counts as human inside the city stack. Split tasks, bait patrols, steal clean, and leave nothing but your ghost.",
    tip:
      "Use the echo deliberately. In the final room, one clean deployment is stronger than two messy ones.",
    payload: {
      name: "Eidolon Charter",
      description: "The master overwrite model that defines whose memories survive the city's next reset."
    },
    breachWindowMs: 5200,
    world: sharedWorld,
    spawn: point(122, 566),
    walls: [rect(284, 120, 40, 460), rect(566, 120, 40, 220), rect(566, 442, 40, 138), rect(872, 120, 40, 220), rect(872, 442, 40, 138)],
    doors: [
      { id: "final-gate", x: 576, y: 344, w: 20, h: 96, channel: "final-gate" },
      { id: "final-vault", x: 882, y: 344, w: 20, h: 96, channel: "final-vault" }
    ],
    guards: [
      {
        id: "guard-7",
        x: 430,
        y: 188,
        patrol: [point(430, 188), point(430, 542)],
        speed: 102,
        visionRange: 230,
        visionAngle: Math.PI / 2.7
      },
      {
        id: "guard-8",
        x: 1048,
        y: 542,
        patrol: [point(1048, 542), point(1048, 178)],
        speed: 98,
        visionRange: 224,
        visionAngle: Math.PI / 2.8
      }
    ],
    cameras: [
      {
        id: "camera-4",
        x: 888,
        y: 112,
        baseAngle: 90,
        sweep: 58,
        speed: 1.4,
        range: 252,
        channel: "final-vault",
        activeWhen: "inactive"
      }
    ],
    lasers: [
      {
        id: "laser-final-a",
        x: 740,
        y: 244,
        length: 176,
        orientation: "horizontal",
        channel: "aux-final",
        activeWhen: "inactive"
      },
      {
        id: "laser-final-b",
        x: 1112,
        y: 262,
        length: 176,
        orientation: "horizontal",
        cycle: { onMs: 1120, offMs: 700 }
      }
    ],
    plates: [{ id: "plate-final", x: 148, y: 518, w: 82, h: 82, channel: "final-gate", mode: "echo" }],
    switches: [{ id: "switch-final", x: 704, y: 570, channel: "aux-final", label: "Prime lane" }],
    terminals: [
      {
        id: "term-4",
        x: 642,
        y: 164,
        channel: "final-vault",
        label: "Hack vault relay",
        mode: "toggle",
        hackTimeMs: 980
      }
    ],
    collectibles: [
      { id: "credit-12", x: 500, y: 548, value: 80 },
      { id: "credit-13", x: 1160, y: 520, value: 140 }
    ],
    core: point(1144, 172),
    exit: { x: 66, y: 534, w: 58, h: 120, requiresCore: true },
    initialChannels: { "final-gate": false, "final-vault": false, "aux-final": false },
    timeTargets: { s: 74, a: 100, b: 128 },
    parEchoes: 2
  }
];
