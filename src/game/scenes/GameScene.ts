import Phaser from "phaser";
import {
  ALARM_DURATION_MS, ALERT_FLASH_MS, COLORS,
  DETECTION_COOLDOWN_MS, ECHO_DURATION_MS,
  ECHO_MIN_RECORD_MS, ECHO_SAMPLE_MS, GUARD_INVESTIGATE_MS,
  GUARD_JAM_MS, HACK_DURATION_MS, INTERACT_DISTANCE,
  PLAYER_HITBOX_SIZE, PLAYER_SPEED, SCENE_KEYS, STEALTH_SPEED
} from "../constants";
import { COSMETIC_THEMES } from "../data/cosmetics";
import { InputManager } from "../managers/InputManager";
import type {
  CameraData, ChannelState, CollectibleData, DoorData, EchoSample,
  GuardData, HudState, LaserData, LevelDefinition, LevelResult,
  Point, PressurePlateData, Rect, ScoreBreakdownItem, SwitchData, TerminalData
} from "../types";
import { getServices } from "../utils/services";

/* ─── geometry helpers ────────────────────────────────────────────────────── */
const bodyRect = (x: number, y: number, s = PLAYER_HITBOX_SIZE): Rect =>
  ({ x: x - s/2, y: y - s/2, w: s, h: s });

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;

const dist = (a: Point, b: Point) => Math.hypot(a.x-b.x, a.y-b.y);

/* Liang-Barsky segment vs AABB — returns true if segment cuts through rect */
const segHitsRect = (p: Point, q: Point, r: Rect): boolean => {
  const dx = q.x-p.x, dy = q.y-p.y;
  const t: [number,number] = [0,1];
  const clip = (d: number, n: number): boolean => {
    if (Math.abs(d) < 1e-9) return n <= 0;
    const tk = n/d;
    if (d < 0) { if (tk > t[1]) return false; if (tk > t[0]) t[0] = tk; }
    else        { if (tk < t[0]) return false; if (tk < t[1]) t[1] = tk; }
    return true;
  };
  return clip(dx, r.x-p.x) && clip(-dx, p.x-(r.x+r.w)) &&
         clip(dy, r.y-p.y) && clip(-dy, p.y-(r.y+r.h));
};

/* ─── runtime types ───────────────────────────────────────────────────────── */
interface RDoor {
  data: DoorData;
  shape: Phaser.GameObjects.Rectangle;
  glow:  Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  timerBack: Phaser.GameObjects.Rectangle;
  timerFill: Phaser.GameObjects.Rectangle;
}
interface RPlate    { data: PressurePlateData; shape: Phaser.GameObjects.Rectangle; }
interface RSwitch   { data: SwitchData;        shape: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; }
interface RTerminal { data: TerminalData;      shape: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; progress: Phaser.GameObjects.Rectangle; hack: { msLeft: number }|null; }
interface RPickup   { data: CollectibleData;   shape: Phaser.GameObjects.Arc; glow: Phaser.GameObjects.Arc; taken: boolean; }
interface RGuard {
  data: GuardData;
  sprite: Phaser.GameObjects.Image;
  cone:   Phaser.GameObjects.Graphics;
  patrolIdx: number;
  angle: number;
  investigateTarget: Point|null;
  investigateMs: number;
  searchClock: number;
  jamMs: number;
}
/* NOTE: named 'camSensors' to avoid overriding Phaser.Scene.cameras */
interface RCamera {
  data: CameraData;
  body:  Phaser.GameObjects.Arc;
  eye:   Phaser.GameObjects.Arc;
  cone:  Phaser.GameObjects.Graphics;
  angle: number;
}
interface RLaser { data: LaserData; beam: Phaser.GameObjects.Rectangle; glow: Phaser.GameObjects.Rectangle; }
interface Echo   { sprite: Phaser.GameObjects.Image; trail: Phaser.GameObjects.Graphics; samples: EchoSample[]; ms: number; fired: Set<number>; }
interface Pulse  { ring: Phaser.GameObjects.Arc; lifeMs: number; totalMs: number; maxScale: number; }

export class GameScene extends Phaser.Scene {
  private level!:        LevelDefinition;
  private inputMgr!:     InputManager;
  private accentHex: number = COLORS.player;

  /* game objects */
  private player!:       Phaser.GameObjects.Image;
  private playerGlow!:   Phaser.GameObjects.Arc;
  private coreImg!:      Phaser.GameObjects.Image;
  private coreHalo!:     Phaser.GameObjects.Arc;
  private exitGlow!:     Phaser.GameObjects.Rectangle;
  private exitZone!:     Phaser.GameObjects.Rectangle;
  private alarmFlash!:   Phaser.GameObjects.Rectangle;
  private logicOvl!:     Phaser.GameObjects.Graphics;
  private objOvl!:       Phaser.GameObjects.Graphics;
  private recTrail!:     Phaser.GameObjects.Graphics;
  private hintLbl!:      Phaser.GameObjects.Text;
  private bannerTxt!:    Phaser.GameObjects.Text;
  private ambLines:      Phaser.GameObjects.Rectangle[] = [];

  /* entity lists */
  private doors:      RDoor[]     = [];
  private plates:     RPlate[]    = [];
  private switches:   RSwitch[]   = [];
  private terminals:  RTerminal[] = [];
  private pickups:    RPickup[]   = [];
  private guards:     RGuard[]    = [];
  private camSensors: RCamera[]   = []; /* NOT this.cameras — that's Phaser's camera manager */
  private lasers:     RLaser[]    = [];

  /* state */
  private pos =            new Phaser.Math.Vector2();
  private persistCh:       ChannelState = {};
  private chTimers:        Record<string,number> = {};
  private channels:        ChannelState = {};
  private wallRects:       Rect[] = [];
  private closedDoors:     Rect[] = [];
  private plateContacts =  new Set<string>();
  private runMs =          0;
  private moveAcc =        0;
  private sampleAcc =      0;
  private hudAcc =         0;
  private detectCooldown = 0;
  private alarmFlashMs =   0;
  private alarmMusicMs =   0;
  private detections =     0;
  private credits =        0;
  private echoUses =       0;
  private exposureLevel =  0;
  private exposureSrc =    "";
  private exposureGain =   0;
  private coreGot =        false;
  private hint =           "";
  private pendingInteract= false;
  private recorded:        EchoSample[] = [];
  private echo:            Echo|null = null;
  private pulses:          Pulse[] = [];
  private state:           "active"|"compromised"|"complete" = "active";
  private stateMs =        0;
  private bannerTimer =    0;

  constructor() { super(SCENE_KEYS.GAME); }

  /* ── lifecycle ─────────────────────────────────────────────────────────── */
  create(data: {levelId?:string}|undefined): void {
    const { audioManager, levelManager, saveManager, uiManager } = getServices(this);
    const id  = data?.levelId ?? "tutorial-split";
    this.level = levelManager.getLevelById(id);
    const set  = saveManager.getSettings();
    const theme= COSMETIC_THEMES.find(t=>t.id===set.selectedTheme) ?? COSMETIC_THEMES[0]!;
    this.accentHex = theme.accentHex;

    audioManager.applySettings(set);
    audioManager.setMusicMode("stealth");
    void audioManager.prime();
    uiManager.applySettings(set);
    uiManager.clearScreen();
    uiManager.clearHud();

    this.inputMgr = new InputManager(this, set);

    /* reset all state */
    this.pos.set(this.level.spawn.x, this.level.spawn.y);
    this.persistCh   = { ...this.level.initialChannels };
    this.chTimers    = {};
    this.channels    = { ...this.level.initialChannels };
    this.wallRects   = [];
    this.closedDoors = [];
    this.state       = "active";
    this.runMs       = 0;
    this.detections  = 0;
    this.credits     = 0;
    this.echoUses    = 0;
    this.exposureLevel=0;
    this.coreGot     = false;
    this.stateMs     = 0;
    this.pulses      = [];
    this.recorded    = [];
    this.echo        = null;
    this.plateContacts= new Set();
    this.sampleAcc   = 0;
    this.hudAcc      = 0;
    this.moveAcc     = 0;
    this.detectCooldown  = 0;
    this.alarmFlashMs    = 0;
    this.alarmMusicMs    = 0;
    this.pendingInteract = false;
    this.ambLines        = [];

    /* Phaser camera setup — use this.cameras.main (Phaser built-in) */
    this.cameras.main.setBounds(0,0,this.level.world.width,this.level.world.height);
    this.cameras.main.setBackgroundColor("#050611");
    this.cameras.main.fadeIn(240,0,0,0);

    this.buildBackground();
    this.buildWorld();
    this.refreshDoors();
    this.showBanner(`${this.level.name}\n${this.level.brief}`, 5000);
    this.refreshHud();

    /* resume after pause */
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      const s = saveManager.getSettings();
      audioManager.applySettings(s);
      uiManager.applySettings(s);
      this.inputMgr.updateSettings(s);
      audioManager.setMusicMode("stealth");
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputMgr.destroy();
      uiManager.clearHud();
      this.killEcho();
      this.pulses.forEach(p=>p.ring.destroy());
      this.pulses = [];
    });
  }

  /* ── main loop ─────────────────────────────────────────────────────────── */
  update(_t: number, delta: number): void {
    const dt = Math.min(delta, 40);
    this.sampleAcc += dt;
    this.hudAcc    += dt;
    this.detectCooldown  = Math.max(0, this.detectCooldown - dt);
    this.alarmFlashMs    = Math.max(0, this.alarmFlashMs   - dt);
    this.alarmMusicMs    = Math.max(0, this.alarmMusicMs   - dt);
    this.alarmFlash.setAlpha(this.alarmFlashMs > 0 ? 0.18 : 0);
    this.tickBanner(dt);
    this.tickAmbient(dt);

    if (this.alarmMusicMs <= 0 && this.state === "active")
      getServices(this).audioManager.setMusicMode("stealth");

    /* compromised — count down then restart */
    if (this.state === "compromised") {
      this.stateMs = Math.max(0, this.stateMs - dt);
      this.tickCoreExit();
      if (this.hudAcc >= 120) { this.refreshHud(); this.hudAcc = 0; }
      if (this.stateMs <= 0) this.scene.start(SCENE_KEYS.GAME, { levelId:this.level.id });
      return;
    }

    const { audioManager } = getServices(this);

    if (this.inputMgr.consumePause()) {
      audioManager.playUi();
      this.scene.launch(SCENE_KEYS.PAUSE, { levelId:this.level.id });
      this.scene.pause();
      return;
    }
    if (this.inputMgr.consumeRestart()) {
      audioManager.playUi();
      this.scene.start(SCENE_KEYS.GAME, { levelId:this.level.id });
      return;
    }

    this.runMs += dt;
    this.exposureGain = 0;
    this.exposureSrc  = "";

    /* movement */
    const move    = this.inputMgr.getMovement();
    const stealth = this.inputMgr.isStealthHeld();
    const speed   = stealth ? STEALTH_SPEED : PLAYER_SPEED;
    if (move.lengthSq() > 0) {
      const mv = move.clone().normalize().scale(speed * (dt/1000));
      this.movePlayer(mv.x, mv.y);
      this.moveAcc += dt;
      if (this.moveAcc >= (stealth ? 310 : 190)) {
        audioManager.playFootstep(stealth ? 0.8 : 1);
        if (!stealth) this.spawnNoise(this.pos, 130, "player");
        this.moveAcc = 0;
      }
    } else {
      this.moveAcc = 0;
    }

    /* interact: record for echo, then handle */
    const interactPressed = this.inputMgr.consumeInteract();
    if (interactPressed) {
      this.pendingInteract = true;
      this.handleInteract(this.pos, "player");
    }

    /* echo deploy */
    if (this.inputMgr.consumeEcho()) {
      const dur = this.recorded.length > 1
        ? this.recorded[this.recorded.length-1]!.t - this.recorded[0]!.t : 0;
      if (dur >= ECHO_MIN_RECORD_MS) {
        audioManager.playEcho();
        this.deployEcho();
      }
    }

    /* systems */
    this.tickEchoRecord();
    this.drawRecordTrail();
    this.tickEcho(dt);
    this.tickPulses(dt);
    this.tickChTimers(dt);
    this.tickChannels();
    this.tickTerminals(dt);
    this.tickGuards(dt);
    this.tickCameras();
    this.tickLasers();
    this.tickExposure(dt);
    this.tickPickups();
    this.tickCoreExit();
    this.tickDoorBars();
    this.drawLogicOverlay();
    this.drawObjOverlay();
    this.tickHints();

    if (this.hudAcc >= 120) { this.refreshHud(); this.hudAcc = 0; }
  }

  /* ── world build ───────────────────────────────────────────────────────── */
  private buildBackground(): void {
    const {width,height} = this.level.world;
    this.add.rectangle(width/2,height/2,width,height,COLORS.bg,1).setDepth(-30);
    const grid = this.add.graphics().setDepth(-25);
    grid.lineStyle(1,0x0e2236,0.4);
    for (let x=64;x<width;x+=64) grid.lineBetween(x,0,x,height);
    for (let y=64;y<height;y+=64) grid.lineBetween(0,y,width,y);
    for (let i=0;i<8;i++) {
      const l = this.add.rectangle(
        Phaser.Math.Between(60,width-60), Phaser.Math.Between(60,height-60),
        Phaser.Math.Between(80,200),2,
        Phaser.Math.RND.pick([this.accentHex,COLORS.laser]),0.1
      ).setAngle(Phaser.Math.Between(-30,30)).setDepth(-20);
      this.ambLines.push(l);
    }
  }

  private tickAmbient(_dt: number): void {
    const t = this.runMs*0.001;
    this.ambLines.forEach((l,i)=>l.setAlpha(0.06+(Math.sin(t+i*0.8)+1)*0.05));
  }

  private buildWorld(): void {
    const {width,height} = this.level.world;

    /* walls */
    this.level.walls.forEach(w=>{
      const cx=w.x+w.w/2, cy=w.y+w.h/2;
      this.add.rectangle(cx,cy,w.w+8,w.h+8,this.accentHex,0.04).setDepth(2);
      this.add.rectangle(cx,cy,w.w,w.h,COLORS.wall,0.98).setDepth(3);
      this.wallRects.push({...w});
    });

    /* exit */
    const ex=this.level.exit, ecx=ex.x+ex.w/2, ecy=ex.y+ex.h/2;
    this.exitGlow = this.add.rectangle(ecx,ecy,ex.w+16,ex.h+16,COLORS.success,0.08).setDepth(4);
    this.exitZone = this.add.rectangle(ecx,ecy,ex.w,ex.h,COLORS.success,0.12)
      .setStrokeStyle(2,COLORS.success,0.9).setDepth(5);

    /* core */
    this.coreHalo = this.add.circle(this.level.core.x,this.level.core.y,36,COLORS.core,0.12).setDepth(12);
    this.coreImg  = this.add.image(this.level.core.x,this.level.core.y,"core").setDepth(14);

    /* player */
    this.playerGlow = this.add.circle(this.pos.x,this.pos.y,24,this.accentHex,0.1).setDepth(18);
    this.player     = this.add.image(this.pos.x,this.pos.y,"player").setTint(this.accentHex).setDepth(20);

    /* doors */
    this.doors = this.level.doors.map(d=>{
      const cx=d.x+d.w/2, cy=d.y+d.h/2, tw=Math.max(38,d.w+12);
      const glow  = this.add.rectangle(cx,cy,d.w+10,d.h+10,COLORS.player,0.08).setDepth(8);
      const shape = this.add.rectangle(cx,cy,d.w,d.h,COLORS.panelSoft,0.95)
        .setStrokeStyle(2,COLORS.player,0.85).setDepth(9);
      const label = this.add.text(cx,d.y-22,"",{fontFamily:"Chakra Petch,sans-serif",fontSize:"11px",color:"#c8f8ff",fontStyle:"700"})
        .setOrigin(0.5,1).setDepth(10).setAlpha(0);
      const timerBack = this.add.rectangle(cx,d.y-14,tw,5,0x04111e,0.88).setDepth(10).setAlpha(0);
      const timerFill = this.add.rectangle(cx-tw/2,d.y-14,0,5,COLORS.success,0.92).setOrigin(0,0.5).setDepth(11).setAlpha(0);
      return {data:d,shape,glow,label,timerBack,timerFill};
    });

    /* plates */
    this.plates = this.level.plates.map(p=>({
      data:p,
      shape:this.add.rectangle(p.x+p.w/2,p.y+p.h/2,p.w,p.h,COLORS.player,0.15)
        .setStrokeStyle(2,COLORS.player,0.5).setDepth(7)
    }));

    /* switches */
    this.switches = this.level.switches.map(s=>({
      data:s,
      shape:this.add.rectangle(s.x,s.y,46,46,COLORS.warning,0.16).setStrokeStyle(2,COLORS.warning,0.8).setDepth(7),
      label:this.add.text(s.x,s.y+40,s.label,{fontFamily:"Space Grotesk,sans-serif",fontSize:"11px",color:"#8da3bc"}).setOrigin(0.5,0).setDepth(7)
    }));

    /* terminals */
    this.terminals = this.level.terminals.map(t=>({
      data:t,
      shape:this.add.rectangle(t.x,t.y,56,46,COLORS.player,0.14).setStrokeStyle(2,COLORS.player,0.8).setDepth(7),
      label:this.add.text(t.x,t.y+38,t.label,{fontFamily:"Space Grotesk,sans-serif",fontSize:"11px",color:"#8da3bc"}).setOrigin(0.5,0).setDepth(7),
      progress:this.add.rectangle(t.x-24,t.y+30,0,6,COLORS.player,0.9).setOrigin(0,0.5).setDepth(8),
      hack:null
    }));

    /* pickups */
    this.pickups = this.level.collectibles.map(c=>({
      data:c,
      glow: this.add.circle(c.x,c.y,18,COLORS.warning,0.14).setDepth(7),
      shape:this.add.circle(c.x,c.y,10,COLORS.warning,0.95).setStrokeStyle(2,0xffffff,0.3).setDepth(8),
      taken:false
    }));

    /* guards */
    this.guards = this.level.guards.map(g=>({
      data:g,
      sprite:this.add.image(g.x,g.y,"guard").setDepth(15),
      cone:  this.add.graphics().setDepth(6),
      patrolIdx:1 % Math.max(1,g.patrol.length),
      angle:-Math.PI/2,
      investigateTarget:null,
      investigateMs:0,
      searchClock:0,
      jamMs:0
    }));

    /* camera sensors — stored in camSensors, NOT this.cameras */
    this.camSensors = this.level.cameras.map(c=>({
      data:c,
      body: this.add.circle(c.x,c.y,18,0x0f2237,0.95).setDepth(13),
      eye:  this.add.circle(c.x,c.y,7,COLORS.camera,0.95).setDepth(14),
      cone: this.add.graphics().setDepth(6),
      angle:Phaser.Math.DegToRad(c.baseAngle)
    }));

    /* lasers */
    this.lasers = this.level.lasers.map(l=>{
      const hz=l.orientation==="horizontal", lw=hz?l.length:8, lh=hz?8:l.length;
      return {
        data:l,
        glow:this.add.rectangle(l.x,l.y,lw+10,lh+10,COLORS.laser,0.1).setDepth(5),
        beam:this.add.rectangle(l.x,l.y,lw,lh,COLORS.laser,0.88).setDepth(6)
      };
    });

    /* overlays */
    this.logicOvl = this.add.graphics().setDepth(4);
    this.objOvl   = this.add.graphics().setDepth(16);
    this.recTrail = this.add.graphics().setDepth(17);

    /* hint label at bottom */
    this.hintLbl = this.add.text(width/2,height-14,"",{
      fontFamily:"Space Grotesk,sans-serif",fontSize:"14px",color:"#eef8ff",align:"center",
      backgroundColor:"rgba(5,8,20,0.84)",padding:{x:18,y:10},
      wordWrap:{width:Math.min(680,width-120),useAdvancedWrap:true}
    }).setOrigin(0.5,1).setDepth(40).setAlpha(0);

    /* brief banner at top */
    this.bannerTxt = this.add.text(width/2,26,"",{
      fontFamily:"Chakra Petch,sans-serif",fontSize:"14px",color:"#9cc9ff",
      align:"center",wordWrap:{width:640,useAdvancedWrap:true}
    }).setOrigin(0.5,0).setDepth(45).setAlpha(0);

    /* alarm screen flash */
    this.alarmFlash = this.add.rectangle(width/2,height/2,width,height,COLORS.danger,0.18)
      .setDepth(50).setAlpha(0);
  }

  /* ── movement & collision ─────────────────────────────────────────────── */
  private movePlayer(dx: number, dy: number): void {
    const n = this.slideMove(this.pos.x,this.pos.y,dx,dy);
    this.pos.set(n.x,n.y);
    this.player.setPosition(n.x,n.y);
    this.playerGlow.setPosition(n.x,n.y);
    this.updatePlayerVisual();
  }

  private updatePlayerVisual(): void {
    const stealth = this.inputMgr.isStealthHeld();
    const dur = this.recorded.length > 1
      ? this.recorded[this.recorded.length-1]!.t - this.recorded[0]!.t : 0;
    const echoReady = dur >= 400 && !this.echo;
    /* stealth: player dims and glow shrinks */
    this.player.setAlpha(stealth ? 0.55 : 1);
    /* echo ready: subtle pulse on player glow */
    const glowAlpha = stealth ? 0.04 : echoReady ? 0.18 + Math.sin(this.runMs * 0.012) * 0.08 : 0.1;
    this.playerGlow.setAlpha(glowAlpha);
    this.playerGlow.setScale(stealth ? 0.7 : echoReady ? 1.15 : 1);
  }

  private slideMove(cx: number, cy: number, dx: number, dy: number, s=PLAYER_HITBOX_SIZE): Point {
    const half=s/2, block=this.allBlockers();
    let nx=cx+dx;
    block.forEach(b=>{ if(overlaps(bodyRect(nx,cy,s),b)) nx=dx>0?b.x-half:b.x+b.w+half; });
    let ny=cy+dy;
    block.forEach(b=>{ if(overlaps(bodyRect(nx,ny,s),b)) ny=dy>0?b.y-half:b.y+b.h+half; });
    return {
      x:Phaser.Math.Clamp(nx,half,this.level.world.width-half),
      y:Phaser.Math.Clamp(ny,half,this.level.world.height-half)
    };
  }

  private allBlockers(): Rect[] { return [...this.wallRects,...this.closedDoors]; }

  /* ── occlusion ────────────────────────────────────────────────────────── */
  private occluders(): Rect[] {
    return [
      ...this.wallRects,
      ...this.doors.filter(d=>!this.isDoorOpen(d)).map(d=>d.data as Rect)
    ];
  }

  private occluded(from: Point, to: Point, occ: Rect[]): boolean {
    return occ.some(r=>segHitsRect(from,to,r));
  }

  private canSee(origin: Point, face: number, range: number, half: number, target: Point, occ: Rect[]): boolean {
    if (dist(origin,target)>range) return false;
    let diff = Math.atan2(target.y-origin.y,target.x-origin.x) - face;
    while(diff> Math.PI) diff-=Math.PI*2;
    while(diff<-Math.PI) diff+=Math.PI*2;
    if (Math.abs(diff)>half) return false;
    return !this.occluded(origin,target,occ);
  }

  /* ── echo system ──────────────────────────────────────────────────────── */
  private tickEchoRecord(): void {
    while(this.sampleAcc>=ECHO_SAMPLE_MS) {
      this.sampleAcc -= ECHO_SAMPLE_MS;
      this.recorded.push({x:this.pos.x,y:this.pos.y,t:this.runMs,interact:this.pendingInteract});
      this.pendingInteract=false;
    }
    const cut=this.runMs-ECHO_DURATION_MS;
    this.recorded=this.recorded.filter(s=>s.t>=cut);
  }

  private deployEcho(): void {
    this.killEcho();
    const t0=this.recorded[0]!.t;
    const samples=this.recorded.map(s=>({...s,t:s.t-t0}));
    const sprite=this.add.image(samples[0]!.x,samples[0]!.y,"echo").setTint(COLORS.echo).setDepth(18);
    const trail =this.add.graphics().setDepth(17);
    this.echo={sprite,trail,samples,ms:0,fired:new Set()};
    this.echoUses++;
    this.spawnNoise({x:sprite.x,y:sprite.y},210,"echo");
  }

  private tickEcho(dt: number): void {
    if(!this.echo) return;
    const e=this.echo;
    e.ms+=dt;
    const total=e.samples[e.samples.length-1]?.t??0;
    if(e.ms>total){this.killEcho();return;}

    const cur=this.echoLerp(e.samples,e.ms);
    e.sprite.setPosition(cur.x,cur.y);

    e.trail.clear();
    e.trail.lineStyle(2,COLORS.echo,0.4);
    e.trail.beginPath();
    e.samples.forEach((s,i)=>i===0?e.trail.moveTo(s.x,s.y):e.trail.lineTo(s.x,s.y));
    e.trail.strokePath();

    e.samples.forEach((s,i)=>{
      if(s.interact&&s.t<=e.ms&&!e.fired.has(i)){
        e.fired.add(i);
        this.handleInteract({x:cur.x,y:cur.y},"echo");
        this.spawnNoise({x:cur.x,y:cur.y},164,"echo");
        getServices(this).audioManager.playHack();
      }
    });
  }

  private killEcho(): void {
    this.echo?.sprite.destroy();
    this.echo?.trail.destroy();
    this.echo=null;
  }

  private echoLerp(s: EchoSample[], t: number): Point {
    if(!s.length) return {x:this.pos.x,y:this.pos.y};
    let ni=s.findIndex(x=>x.t>=t);
    if(ni<=0) return {x:s[0]!.x,y:s[0]!.y};
    if(ni===-1){const l=s[s.length-1]!;return{x:l.x,y:l.y};}
    const a=s[ni-1]!,b=s[ni]!,f=(t-a.t)/Math.max(1,b.t-a.t);
    return{x:Phaser.Math.Linear(a.x,b.x,f),y:Phaser.Math.Linear(a.y,b.y,f)};
  }

  private drawRecordTrail(): void {
    this.recTrail.clear();
    if(this.recorded.length<2) return;
    const first=this.recorded[0]!,last=this.recorded[this.recorded.length-1]!;
    const charge=Phaser.Math.Clamp((last.t-first.t)/ECHO_DURATION_MS,0,1);
    this.recTrail.lineStyle(2,COLORS.player,0.1+charge*0.14);
    this.recTrail.beginPath();
    this.recorded.forEach((s,i)=>i===0?this.recTrail.moveTo(s.x,s.y):this.recTrail.lineTo(s.x,s.y));
    this.recTrail.strokePath();
    this.recTrail.fillStyle(COLORS.player,0.1);  this.recTrail.fillCircle(first.x,first.y,4);
    this.recTrail.fillStyle(COLORS.player,0.26+charge*0.22); this.recTrail.fillCircle(last.x,last.y,6);
  }

  /* ── noise ────────────────────────────────────────────────────────────── */
  private spawnNoise(pt: Point, radius: number, actor: "player"|"echo"|"system"): void {
    const col=actor==="echo"?COLORS.echo:actor==="system"?COLORS.warning:COLORS.player;
    const ring=this.add.circle(pt.x,pt.y,10,col,0).setStrokeStyle(2,col,0.28).setDepth(19);
    this.pulses.push({ring,lifeMs:480,totalMs:480,maxScale:Math.max(1.5,radius/10)});

    const occ=this.occluders();
    this.guards.forEach(g=>{
      if(dist({x:g.sprite.x,y:g.sprite.y},pt)>radius) return;
      if(this.occluded({x:g.sprite.x,y:g.sprite.y},pt,occ)) return;
      const jit={x:pt.x+Phaser.Math.Between(-14,14),y:pt.y+Phaser.Math.Between(-14,14)};
      g.investigateTarget=jit;
      g.investigateMs=Math.max(g.investigateMs,actor==="echo"?GUARD_JAM_MS:GUARD_INVESTIGATE_MS);
      g.searchClock=0;
      if(actor==="echo") g.jamMs=Math.max(g.jamMs,GUARD_JAM_MS);
    });
  }

  private tickPulses(dt: number): void {
    this.pulses=this.pulses.filter(p=>{
      p.lifeMs-=dt;
      if(p.lifeMs<=0){p.ring.destroy();return false;}
      const prog=1-p.lifeMs/p.totalMs;
      p.ring.setScale(1+(p.maxScale-1)*prog).setAlpha((1-prog)*0.7);
      return true;
    });
  }

  /* ── channels & doors ─────────────────────────────────────────────────── */
  private tickChannels(): void {
    const next:ChannelState={...this.persistCh};
    const pr=bodyRect(this.pos.x,this.pos.y);
    const er=this.echo?bodyRect(this.echo.sprite.x,this.echo.sprite.y):null;

    this.plates.forEach(pl=>{
      const pOn=overlaps(pr,pl.data), eOn=er?overlaps(er,pl.data):false;
      const on=pOn||eOn, mode=pl.data.mode??"hold", key=pl.data.id;
      if(mode==="echo"){
        next[pl.data.channel]=eOn||!!next[pl.data.channel];
        if(eOn&&!this.plateContacts.has(key)){this.armCh(pl.data.channel);this.plateContacts.add(key);}
        else if(!eOn) this.plateContacts.delete(key);
      } else if(mode==="pulse"){
        if(on&&!this.plateContacts.has(key)){this.armCh(pl.data.channel);this.plateContacts.add(key);}
        else if(!on) this.plateContacts.delete(key);
      } else {
        next[pl.data.channel]=on||!!next[pl.data.channel];
      }
      const col=mode==="echo"&&pOn&&!eOn?COLORS.warning:COLORS.player;
      pl.shape.setFillStyle(col,on?0.28:(next[pl.data.channel]?0.18:0.12));
      pl.shape.setStrokeStyle(2,col,on?0.8:0.5);
    });

    Object.entries(this.chTimers).forEach(([ch,rem])=>{if(rem>0)next[ch]=true;});
    this.channels=next;
    this.refreshDoors();
  }

  private tickChTimers(dt: number): void {
    for(const ch of Object.keys(this.chTimers)){
      this.chTimers[ch]=Math.max(0,this.chTimers[ch]!-dt);
      if(this.chTimers[ch]===0) delete this.chTimers[ch];
    }
  }

  private armCh(ch: string, dur?: number): void {
    const d=dur??(this.level.breachWindowMs??Math.max(4600,9200-this.level.order*520));
    if(d<=0){this.persistCh[ch]=true;return;}
    this.chTimers[ch]=d;
  }

  private refreshDoors(): void {
    this.closedDoors=[];
    this.doors.forEach(d=>{
      const open=!!this.channels[d.data.channel];
      d.shape.setAlpha(open?0.18:0.95);
      d.glow.setAlpha(open?0.04:0.08);
      d.shape.setStrokeStyle(2,open?COLORS.success:COLORS.player,0.85);
      if(!open) this.closedDoors.push(d.data);
    });
  }

  private isDoorOpen(d: RDoor): boolean { return !!this.channels[d.data.channel]; }

  private tickDoorBars(): void {
    const full=this.level.breachWindowMs??Math.max(4600,9200-this.level.order*520);
    this.doors.forEach(d=>{
      const rem=this.chTimers[d.data.channel]??0, show=rem>0, tw=Math.max(38,d.data.w+12);
      d.timerBack.setAlpha(show?0.82:0); d.timerFill.setAlpha(show?1:0); d.label.setAlpha(show?0.9:0);
      if(!show){d.timerFill.displayWidth=0;d.label.setText("");return;}
      d.label.setText(`${(rem/1000).toFixed(1)}s`);
      d.timerFill.displayWidth=tw*Phaser.Math.Clamp(rem/full,0,1);
      d.timerFill.setFillStyle(rem<2000?COLORS.warning:COLORS.success,0.92);
    });
  }

  /* ── terminals ────────────────────────────────────────────────────────── */
  private tickTerminals(dt: number): void {
    this.terminals.forEach(t=>{
      if(!t.hack){t.progress.displayWidth=0;return;}
      t.hack.msLeft-=dt;
      t.progress.displayWidth=48*Phaser.Math.Clamp(1-t.hack.msLeft/(t.data.hackTimeMs||HACK_DURATION_MS),0,1);
      if(t.hack.msLeft<=0){
        t.hack=null; t.progress.displayWidth=0;
        this.armCh(t.data.channel);
        t.shape.setFillStyle(COLORS.success,0.2);
        this.spawnNoise({x:t.data.x,y:t.data.y},150,"system");
        getServices(this).audioManager.playHack();
      }
    });
  }

  /* ── guards ───────────────────────────────────────────────────────────── */
  private tickGuards(dt: number): void {
    const pp:Point={x:this.pos.x,y:this.pos.y};
    const ep:Point|null=this.echo?{x:this.echo.sprite.x,y:this.echo.sprite.y}:null;
    const occ=this.occluders(), boost=this.coreGot?1.12:1;

    this.guards.forEach(g=>{
      g.jamMs         =Math.max(0,g.jamMs-dt);
      g.investigateMs =Math.max(0,g.investigateMs-dt);
      const jammed=g.jamMs>0;

      const seesEcho  =!!ep&&this.canSee({x:g.sprite.x,y:g.sprite.y},g.angle,g.data.visionRange,g.data.visionAngle/2,ep,occ);
      const seesPlayer=!jammed&&this.canSee({x:g.sprite.x,y:g.sprite.y},g.angle,g.data.visionRange,g.data.visionAngle/2,pp,occ);

      if(seesPlayer){
        this.registerExposure("SENTRY LOCK",1);
        g.investigateTarget={...pp}; g.investigateMs=1400; g.searchClock=0;
      } else if(seesEcho&&ep){
        g.jamMs=Math.max(g.jamMs,GUARD_JAM_MS);
        g.investigateTarget={...ep}; g.investigateMs=Math.max(g.investigateMs,GUARD_JAM_MS); g.searchClock=0;
      }

      if(g.investigateMs>0&&g.investigateTarget){
        const tgt=g.investigateTarget, dx=tgt.x-g.sprite.x, dy=tgt.y-g.sprite.y;
        const d2=dx*dx+dy*dy;
        if(d2>36){
          const mag=Math.sqrt(d2), spd=g.data.speed*boost*(jammed?1.3:1.15);
          const nx=this.slideMove(g.sprite.x,g.sprite.y,(dx/mag)*spd*(dt/1000),(dy/mag)*spd*(dt/1000));
          g.sprite.setPosition(nx.x,nx.y); g.angle=Math.atan2(dy,dx);
        } else {
          g.searchClock+=dt*0.005;
          g.angle=Math.atan2(tgt.y-g.sprite.y,tgt.x-g.sprite.x)+Math.sin(g.searchClock)*0.5;
        }
      } else {
        const pat=g.data.patrol[g.patrolIdx]??{x:g.data.x,y:g.data.y};
        const dx=pat.x-g.sprite.x, dy=pat.y-g.sprite.y, d2=dx*dx+dy*dy;
        if(d2<36) g.patrolIdx=(g.patrolIdx+1)%g.data.patrol.length;
        else {
          const mag=Math.sqrt(d2), spd=g.data.speed*boost;
          const nx=this.slideMove(g.sprite.x,g.sprite.y,(dx/mag)*spd*(dt/1000),(dy/mag)*spd*(dt/1000));
          g.sprite.setPosition(nx.x,nx.y); g.angle=Math.atan2(dy,dx);
        }
      }

      const tint=seesPlayer?COLORS.danger:jammed?COLORS.echo:g.investigateMs>0?COLORS.warning:COLORS.guard;
      g.sprite.setTint(tint).setRotation(g.angle+Math.PI/2);
      const coneCol=seesPlayer?COLORS.danger:jammed?COLORS.echo:seesEcho?COLORS.warning:COLORS.guard;
      this.drawCone(g.cone,g.sprite.x,g.sprite.y,g.angle,g.data.visionRange,g.data.visionAngle/2,coneCol);
    });
  }

  /* ── cameras ──────────────────────────────────────────────────────────── */
  private tickCameras(): void {
    const pp:Point={x:this.pos.x,y:this.pos.y};
    const ep:Point|null=this.echo?{x:this.echo.sprite.x,y:this.echo.sprite.y}:null;
    const occ=this.occluders(), boost=this.coreGot?1.15:1;
    const CAM_HALF=Phaser.Math.DegToRad(22);

    this.camSensors.forEach(c=>{
      const chOn=c.data.channel?!!this.channels[c.data.channel]:true;
      const enabled=c.data.channel?(c.data.activeWhen==="inactive"?!chOn:chOn):true;
      c.angle=Phaser.Math.DegToRad(c.data.baseAngle)+
        Math.sin(this.runMs*0.001*c.data.speed*boost)*Phaser.Math.DegToRad(c.data.sweep);

      const seesP=enabled&&this.canSee({x:c.data.x,y:c.data.y},c.angle,c.data.range,CAM_HALF,pp,occ);
      const seesE=enabled&&!seesP&&!!ep&&this.canSee({x:c.data.x,y:c.data.y},c.angle,c.data.range,CAM_HALF,ep,occ);
      if(seesP) this.registerExposure("OPTIC TRACE",1.18);

      const eyeCol=!enabled?COLORS.muted:seesP?COLORS.danger:seesE?COLORS.warning:COLORS.camera;
      c.eye.setFillStyle(eyeCol,enabled?0.95:0.5);
      c.cone.clear();
      if(enabled) this.drawCone(c.cone,c.data.x,c.data.y,c.angle,c.data.range,CAM_HALF,
        seesP?COLORS.danger:seesE?COLORS.warning:COLORS.camera);
    });
  }

  /* ── lasers ───────────────────────────────────────────────────────────── */
  private tickLasers(): void {
    const pr=bodyRect(this.pos.x,this.pos.y);
    this.lasers.forEach(l=>{
      const chOk =l.data.channel?(l.data.activeWhen==="inactive"?!this.channels[l.data.channel]:!!this.channels[l.data.channel]):true;
      const cyc  =l.data.cycle;
      const cycOk=cyc?((this.runMs+(cyc.offsetMs??0))%(cyc.onMs+cyc.offMs))<cyc.onMs:true;
      const on   =chOk&&cycOk;
      l.beam.setAlpha(on?0.9:0.1); l.glow.setAlpha(on?0.22:0.04);
      if(!on) return;
      const hz=l.data.orientation==="horizontal";
      const br:Rect={x:l.data.x-(hz?l.data.length/2:5),y:l.data.y-(hz?5:l.data.length/2),w:hz?l.data.length:10,h:hz?10:l.data.length};
      if(overlaps(pr,br)) this.triggerDetection();
    });
  }

  /* ── exposure / detection ─────────────────────────────────────────────── */
  private registerExposure(src: string, gain: number): void {
    if(gain>=this.exposureGain){this.exposureGain=gain;this.exposureSrc=src;}
  }

  private tickExposure(dt: number): void {
    if(this.state!=="active") return;
    if(this.exposureGain>0){
      const lockMs=this.exposureGain>=1.1?340:460;
      this.exposureLevel=Math.min(1,this.exposureLevel+(dt/lockMs)*this.exposureGain);
    } else {
      this.exposureLevel=Math.max(0,this.exposureLevel-dt/520);
      if(this.exposureLevel===0) this.exposureSrc="";
    }
    if(this.exposureLevel>=1){this.triggerDetection();this.exposureLevel=0;this.exposureGain=0;this.exposureSrc="";}
  }

  private triggerDetection(): void {
    if(this.detectCooldown>0||this.state!=="active") return;
    this.detectCooldown  = DETECTION_COOLDOWN_MS;
    this.alarmFlashMs    = ALERT_FLASH_MS;
    this.alarmMusicMs    = ALARM_DURATION_MS+1200;
    this.detections++;
    this.state   = "compromised";
    this.stateMs = ALARM_DURATION_MS;
    this.killEcho();
    getServices(this).audioManager.setMusicMode("alarm");
    getServices(this).audioManager.playAlarm();
    this.cameras.main.shake(150,0.004);
    this.cameras.main.flash(100,255,80,110,false);
    this.showBanner("DETECTED — Room resetting...",ALARM_DURATION_MS);
  }

  /* ── pickups ──────────────────────────────────────────────────────────── */
  private tickPickups(): void {
    const {audioManager}=getServices(this);
    this.pickups.forEach(c=>{
      if(c.taken) return;
      const pulse=0.92+(Math.sin(this.runMs*0.007+c.data.x*0.01)+1)*0.08;
      c.shape.setScale(pulse); c.glow.setScale(0.9+pulse*0.16);
      if(dist(c.data,this.pos)<=22){
        c.taken=true; c.shape.destroy(); c.glow.destroy();
        this.credits+=c.data.value; audioManager.playPickup();
        const lbl=this.add.text(c.data.x,c.data.y-6,`+${c.data.value}`,
          {fontFamily:"Chakra Petch,sans-serif",fontSize:"15px",color:"#ffd76f",fontStyle:"700"}).setOrigin(0.5).setDepth(26);
        this.tweens.add({targets:lbl,y:c.data.y-32,alpha:0,duration:500,onComplete:()=>lbl.destroy()});
      }
    });
  }

  /* ── core & exit ──────────────────────────────────────────────────────── */
  private tickCoreExit(): void {
    const nearCore=!this.coreGot&&dist(this.level.core,this.pos)<=INTERACT_DISTANCE;
    const nearExit=this.coreGot&&overlaps(bodyRect(this.pos.x,this.pos.y),this.level.exit);
    const pulse=0.08+Math.sin(this.runMs*0.008)*0.03;
    const hPulse=1+Math.sin(this.runMs*0.006)*0.08;
    const floatY=Math.sin(this.runMs*0.004)*2.4;

    this.coreImg.setY(this.level.core.y+floatY);
    this.coreHalo.setY(this.level.core.y+floatY);
    this.coreImg.setAlpha(this.coreGot?0.3:nearCore?0.98:0.86);
    this.coreHalo.setAlpha(this.coreGot?0.04:nearCore?0.22:0.12);
    this.coreHalo.setScale(nearCore?hPulse*1.1:hPulse);
    this.exitGlow.setAlpha(this.coreGot?0.16+pulse:0.08);
    this.exitZone.setAlpha(this.coreGot?(nearExit?0.36:0.22):0.12);
    this.exitZone.setStrokeStyle(2,this.coreGot?COLORS.success:COLORS.muted,this.coreGot?0.95:0.4);

    if(nearExit&&this.state==="active") this.finishLevel();
  }

  private collectCore(): void {
    const {audioManager}=getServices(this);
    this.coreGot=true;
    this.coreImg.setAlpha(0.3); this.coreHalo.setAlpha(0.04);
    audioManager.playSuccess();
    this.cameras.main.flash(180,154,255,214,false);
    this.showBanner(`${this.level.payload.name} secured — reach the exit.`,3200);
  }

  /* ── interaction ──────────────────────────────────────────────────────── */
  private handleInteract(pt: Point, actor: "player"|"echo"): void {
    const {audioManager}=getServices(this);

    /* core pickup (player only) */
    if(actor==="player"&&!this.coreGot&&dist(pt,this.level.core)<=INTERACT_DISTANCE){
      this.collectCore(); return;
    }

    /* switch */
    const sw=this.switches.find(s=>dist(pt,s.data)<=INTERACT_DISTANCE);
    if(sw){
      this.armCh(sw.data.channel);
      sw.shape.setFillStyle(COLORS.success,0.22);
      this.spawnNoise({x:sw.data.x,y:sw.data.y},actor==="echo"?148:128,actor);
      audioManager.playDoor(); return;
    }

    /* terminal */
    const tm=this.terminals.find(t=>dist(pt,t.data)<=INTERACT_DISTANCE&&!t.hack);
    if(tm){
      tm.hack={msLeft:tm.data.hackTimeMs||HACK_DURATION_MS};
      tm.shape.setFillStyle(COLORS.warning,0.22);
      this.spawnNoise({x:tm.data.x,y:tm.data.y},actor==="echo"?164:142,actor);
      audioManager.playHack();
    }
  }

  /* ── hints ────────────────────────────────────────────────────────────── */
  private tickHints(): void {
    const h=this.buildHint();
    this.hint=h;
    if(!h){this.hintLbl.setText("").setAlpha(0);return;}
    this.hintLbl.setText(h).setAlpha(0.92);
  }

  private buildHint(): string {
    if(this.state==="compromised") return "Detected. Room is resetting...";

    if(this.level.tutorial&&!this.coreGot&&!this.channels["door-alpha"]){
      if(this.echo) return "Echo is holding the relay. Cross now — the camera is blind.";
      const pr=bodyRect(this.pos.x,this.pos.y);
      const pl=this.plates.find(p=>p.data.channel==="door-alpha");
      if(pl&&overlaps(pr,pl.data)) return "You're on the plate, but only the echo can hold this relay. Step off, then press Q to deploy.";
      if(this.recorded.length<12) return "Move to record a loop, then press Q to deploy the echo.";
      return "End your loop on the cyan plate and press Q. Your clone holds the relay while you cross.";
    }

    if(!this.coreGot&&dist(this.pos,this.level.core)<=INTERACT_DISTANCE)
      return `${this.level.payload.name} in range. Press E to steal it.`;

    if(this.coreGot&&overlaps(bodyRect(this.pos.x,this.pos.y),this.level.exit))
      return "Exit gate open — move into it to escape.";

    if(this.exposureLevel>0.22&&this.exposureSrc)
      return `${this.exposureSrc} — ${Math.round(this.exposureLevel*100)}%. Break line of sight now.`;

    const sw=this.switches.find(s=>dist(this.pos,s.data)<=INTERACT_DISTANCE);
    if(sw) return `${sw.data.label}. Press E.`;

    const tm=this.terminals.find(t=>dist(this.pos,t.data)<=INTERACT_DISTANCE);
    if(tm) return `${tm.data.label}. Press E to hack.`;

    const rem=Object.entries(this.chTimers).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])[0];
    if(rem) return this.coreGot?`Breach: ${(rem[1]/1000).toFixed(1)}s — get out.`:`Breach open: ${(rem[1]/1000).toFixed(1)}s — move fast.`;

    if(!this.coreGot) return this.level.tip;
    return `${this.level.payload.name} secured. Get to the exit gate.`;
  }

  /* ── overlays ─────────────────────────────────────────────────────────── */
  private drawLogicOverlay(): void {
    this.logicOvl.clear();
    const phase=Math.floor(this.runMs/200)%2;
    const ctrls=[
      ...this.plates.map(p=>({ch:p.data.channel,pt:{x:p.data.x+p.data.w/2,y:p.data.y+p.data.h/2},col:COLORS.player})),
      ...this.switches.map(s=>({ch:s.data.channel,pt:{x:s.data.x,y:s.data.y},col:COLORS.warning})),
      ...this.terminals.map(t=>({ch:t.data.channel,pt:{x:t.data.x,y:t.data.y},col:COLORS.player}))
    ];
    ctrls.forEach(c=>{
      const tgts=this.chTargetPts(c.ch); if(!tgts.length) return;
      const active=!!this.channels[c.ch], col=active?COLORS.success:c.col, a=active?0.38:0.15;
      this.logicOvl.fillStyle(col,a*0.6); this.logicOvl.fillCircle(c.pt.x,c.pt.y,active?8:5);
      tgts.forEach(tp=>{
        this.drawDash(c.pt,tp,col,a,phase);
        this.logicOvl.fillStyle(col,a*0.5); this.logicOvl.fillCircle(tp.x,tp.y,active?6:4);
      });
    });
  }

  private drawObjOverlay(): void {
    this.objOvl.clear();
    const pulse=0.44+(Math.sin(this.runMs*0.008)+1)*0.14;
    if(this.exposureLevel>0.1){
      const bc=this.exposureLevel>0.6?COLORS.danger:COLORS.warning, r=14+this.exposureLevel*10;
      this.objOvl.lineStyle(2,bc,0.38+this.exposureLevel*0.3); this.objOvl.strokeCircle(this.pos.x,this.pos.y,r);
    }
    if(!this.coreGot){this.drawPulse(this.level.core,COLORS.core,32,pulse);return;}
    const ec=this.level.exit;
    this.drawPulse({x:ec.x+ec.w/2,y:ec.y+ec.h/2},COLORS.success,38,pulse);
  }

  /* ── HUD ──────────────────────────────────────────────────────────────── */
  private refreshHud(): void {
    const {uiManager,audioManager}=getServices(this);
    const dur=this.recorded.length>1?this.recorded[this.recorded.length-1]!.t-this.recorded[0]!.t:0;
    const hud:HudState={
      levelLabel:this.level.name, timeLabel:`${(this.runMs/1000).toFixed(1)}s`,
      detections:this.detections, objective:this.coreGot?"Reach the exit gate.":this.level.tip,
      echoCharge:Phaser.Math.Clamp(dur/ECHO_DURATION_MS,0,1),
      credits:this.credits, interactionHint:this.hint,
      breachLabel:this.breachLabel(), traceLabel:this.exposureLevel>0?`${this.exposureSrc||"TRACE"} ${Math.round(this.exposureLevel*100)}%`:""
    };
    uiManager.renderHud(hud,()=>{
      audioManager.playUi();
      this.scene.launch(SCENE_KEYS.PAUSE,{levelId:this.level.id});
      this.scene.pause();
    });
  }

  private breachLabel(): string {
    const e=Object.entries(this.chTimers).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])[0];
    return e?`BREACH ${(e[1]/1000).toFixed(1)}s`:"";
  }

  /* ── level complete ───────────────────────────────────────────────────── */
  private finishLevel(): void {
    if(this.state!=="active") return;
    this.state="complete";
    const {saveManager,levelManager,audioManager}=getServices(this);
    const nextId=levelManager.getNextLevelId(this.level.id);
    const ms=Math.round(this.runMs), sec=ms/1000;
    const rank=this.calcRank(sec,this.detections);
    const bd:ScoreBreakdownItem[]=[
      {label:"Contract base",     value:2500},
      {label:"Recovered credits", value:this.credits*4},
      {label:"Ghost bonus",       value:this.detections===0?280:0},
      {label:"Echo economy",      value:Math.max(0,(this.level.parEchoes+1-this.echoUses))*80},
      {label:"Tempo pressure",    value:-Math.round(sec*16)},
      {label:"Alert penalty",     value:-this.detections*180}
    ];
    const score=Math.max(400,bd.reduce((a,b)=>a+b.value,0));
    const result:LevelResult={
      levelId:this.level.id,levelName:this.level.name,
      payloadName:this.level.payload.name,payloadDescription:this.level.payload.description,
      timeMs:ms,detections:this.detections,credits:this.credits,echoesUsed:this.echoUses,
      score,scoreBreakdown:bd,rank,nextLevelId:nextId
    };
    saveManager.recordResult(result,this.level.order);
    audioManager.playSuccess();
    this.cameras.main.fadeOut(240,0,0,0);
    this.time.delayedCall(260,()=>this.scene.start(SCENE_KEYS.RESULTS,{result}));
  }

  private calcRank(sec: number, det: number): import("../types").Rank {
    const t=this.level.timeTargets;
    if(sec<=t.s&&det===0) return "S";
    if(sec<=t.a&&det<=1)  return "A";
    if(sec<=t.b&&det<=2)  return "B";
    return "C";
  }

  /* ── banner ───────────────────────────────────────────────────────────── */
  private showBanner(text: string, ms: number): void {
    this.bannerTxt.setText(text).setAlpha(0.96);
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer=window.setTimeout(()=>{
      this.tweens.add({targets:this.bannerTxt,alpha:0,duration:600});
    },ms);
  }
  private tickBanner(_dt: number): void { /* managed by setTimeout+tween */ }

  /* ── draw helpers ─────────────────────────────────────────────────────── */
  private drawCone(g: Phaser.GameObjects.Graphics, ox: number, oy: number, angle: number, range: number, half: number, col: number): void {
    g.clear();
    g.fillStyle(col,0.09); g.lineStyle(1,col,0.22);
    g.beginPath(); g.moveTo(ox,oy);
    const steps=10;
    for(let i=0;i<=steps;i++){const a=angle-half+(i/steps)*half*2;g.lineTo(ox+Math.cos(a)*range,oy+Math.sin(a)*range);}
    g.closePath(); g.fillPath(); g.strokePath();
  }

  private drawPulse(pt: Point, col: number, r: number, a: number): void {
    this.objOvl.lineStyle(2,col,a); this.objOvl.strokeCircle(pt.x,pt.y,r);
    this.objOvl.lineStyle(1,col,a*0.5); this.objOvl.strokeCircle(pt.x,pt.y,r+7);
  }

  private drawDash(a: Point, b: Point, col: number, alpha: number, phase: number): void {
    const d=dist(a,b), steps=Math.floor(d/16);
    for(let i=0;i<steps;i++){
      if((i+phase)%2!==0) continue;
      const t0=i/steps, t1=Math.min(1,(i+0.7)/steps);
      this.logicOvl.lineStyle(1,col,alpha);
      this.logicOvl.lineBetween(
        Phaser.Math.Linear(a.x,b.x,t0),Phaser.Math.Linear(a.y,b.y,t0),
        Phaser.Math.Linear(a.x,b.x,t1),Phaser.Math.Linear(a.y,b.y,t1)
      );
    }
  }

  private chTargetPts(ch: string): Point[] {
    const pts:Point[]=[];
    this.doors.forEach(d=>{if(d.data.channel===ch)pts.push({x:d.data.x+d.data.w/2,y:d.data.y+d.data.h/2});});
    this.lasers.forEach(l=>{if(l.data.channel===ch)pts.push({x:l.data.x,y:l.data.y});});
    this.camSensors.forEach(c=>{if(c.data.channel===ch)pts.push({x:c.data.x,y:c.data.y});});
    return pts;
  }
}
