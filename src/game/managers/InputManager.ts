import Phaser from "phaser";
import { TOUCH_DEAD_ZONE, TOUCH_JOYSTICK_RADIUS } from "../constants";
import type { SettingsData } from "../types";

export class InputManager {
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly controlsRoot: HTMLElement;
  private touchVisible = false;
  private touchPointerId: number | null = null;
  private touchOrigin   = new Phaser.Math.Vector2();
  private touchVector   = new Phaser.Math.Vector2();
  private interactQ  = false;
  private echoQ      = false;
  private pauseQ     = false;
  private restartQ   = false;
  private stealthHeld = false;
  private ptrMove?: (e: PointerEvent) => void;
  private ptrUp?:   (e: PointerEvent) => void;

  constructor(scene: Phaser.Scene, settings: SettingsData) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error("Keyboard unavailable.");
    this.keys = kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE,E,ENTER,Q,ESC,R") as Record<string, Phaser.Input.Keyboard.Key>;
    const root = document.getElementById("ui-controls-layer");
    if (!root) throw new Error("Controls root missing.");
    this.controlsRoot = root;
    this.setTouch(this.wantsTouch(settings));
  }

  getMovement(): Phaser.Math.Vector2 {
    const v = new Phaser.Math.Vector2();
    if (this.keys.A!.isDown || this.keys.LEFT!.isDown)  v.x -= 1;
    if (this.keys.D!.isDown || this.keys.RIGHT!.isDown) v.x += 1;
    if (this.keys.W!.isDown || this.keys.UP!.isDown)    v.y -= 1;
    if (this.keys.S!.isDown || this.keys.DOWN!.isDown)  v.y += 1;
    if (v.lengthSq() > 0) v.normalize();
    return this.touchVector.lengthSq() > 0 ? this.touchVector.clone() : v;
  }

  consumeInteract(): boolean {
    const p = Phaser.Input.Keyboard.JustDown(this.keys.E!) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE!) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER!) || this.interactQ;
    this.interactQ = false; return p;
  }
  consumeEcho():    boolean { const p = Phaser.Input.Keyboard.JustDown(this.keys.Q!)   || this.echoQ;    this.echoQ    = false; return p; }
  consumePause():   boolean { const p = Phaser.Input.Keyboard.JustDown(this.keys.ESC!) || this.pauseQ;   this.pauseQ   = false; return p; }
  consumeRestart(): boolean { const p = Phaser.Input.Keyboard.JustDown(this.keys.R!)   || this.restartQ; this.restartQ = false; return p; }
  isStealthHeld():  boolean { return this.keys.SHIFT!.isDown || this.stealthHeld; }

  updateSettings(s: SettingsData): void { this.setTouch(this.wantsTouch(s)); }

  destroy(): void {
    this.controlsRoot.innerHTML = "";
    if (this.ptrMove) window.removeEventListener("pointermove",   this.ptrMove);
    if (this.ptrUp)   { window.removeEventListener("pointerup",     this.ptrUp); window.removeEventListener("pointercancel", this.ptrUp); }
  }

  private wantsTouch(s: SettingsData): boolean {
    if (s.touchControls === "on")  return true;
    if (s.touchControls === "off") return false;
    return window.matchMedia("(pointer: coarse)").matches;
  }

  private setTouch(visible: boolean): void {
    if (visible === this.touchVisible) return;
    this.touchVisible = visible;
    this.controlsRoot.innerHTML = "";
    this.touchVector.set(0,0); this.touchPointerId = null;
    if (!visible) return;

    const shell    = mk("div", "touch-shell");
    const joystick = mk("div", "touch-joystick");
    const knob     = mk("div", "touch-joystick-knob");
    joystick.appendChild(knob);

    const actions = mk("div", "touch-actions");
    actions.append(
      this.mkBtn("Hack",   "primary",   () => { this.interactQ = true; }),
      this.mkBtn("Echo",   "secondary", () => { this.echoQ     = true; }),
      this.mkBtn("Stealth","",          () => undefined, true),
      this.mkBtn("Pause",  "",          () => { this.pauseQ    = true; })
    );

    const stealthBtn = actions.children[2] as HTMLButtonElement;
    stealthBtn.addEventListener("pointerdown",  () => { this.stealthHeld = true; });
    const releaseS = () => { this.stealthHeld = false; };
    stealthBtn.addEventListener("pointerup",     releaseS);
    stealthBtn.addEventListener("pointercancel", releaseS);
    stealthBtn.addEventListener("pointerleave",  releaseS);

    joystick.addEventListener("pointerdown", e => {
      this.touchPointerId = e.pointerId;
      this.touchOrigin.set(e.clientX, e.clientY);
      this.touchVector.set(0,0);
      joystick.setPointerCapture(e.pointerId);
    });

    this.ptrMove = (e: PointerEvent) => {
      if (e.pointerId !== this.touchPointerId) return;
      const dx = e.clientX - this.touchOrigin.x, dy = e.clientY - this.touchOrigin.y;
      const v  = new Phaser.Math.Vector2(dx, dy);
      const len = Math.min(v.length(), TOUCH_JOYSTICK_RADIUS);
      if (len < TOUCH_DEAD_ZONE) { this.touchVector.set(0,0); knob.style.transform = ""; return; }
      v.normalize().scale(len);
      knob.style.transform = `translate(${v.x}px,${v.y}px)`;
      this.touchVector.set(v.x / TOUCH_JOYSTICK_RADIUS, v.y / TOUCH_JOYSTICK_RADIUS);
      if (this.touchVector.lengthSq() > 1) this.touchVector.normalize();
    };
    this.ptrUp = (e: PointerEvent) => {
      if (e.pointerId !== this.touchPointerId) return;
      this.touchPointerId = null; this.touchVector.set(0,0);
      knob.style.transform = "";
    };
    window.addEventListener("pointermove",   this.ptrMove);
    window.addEventListener("pointerup",     this.ptrUp);
    window.addEventListener("pointercancel", this.ptrUp);

    shell.append(joystick, actions);
    this.controlsRoot.appendChild(shell);
  }

  private mkBtn(label: string, tone: string, onPress: () => void, hold = false): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button"; b.className = `touch-button ${tone}`.trim(); b.textContent = label;
    b.addEventListener("pointerdown", e => { e.preventDefault(); onPress(); });
    if (!hold) b.addEventListener("click", e => e.preventDefault());
    return b;
  }
}

function mk(tag: string, cls: string): HTMLDivElement {
  const e = document.createElement(tag) as HTMLDivElement;
  e.className = cls; return e;
}
