import Phaser from "phaser";
import { TOUCH_DEAD_ZONE, TOUCH_JOYSTICK_RADIUS } from "../constants";
import type { SettingsData } from "../types";

export class InputManager {
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly controlsRoot: HTMLElement;
  private touchVisible = false;
  private touchPointerId: number | null = null;
  private touchOrigin = new Phaser.Math.Vector2();
  private touchVector = new Phaser.Math.Vector2();
  private interactQueued = false;
  private echoQueued = false;
  private pauseQueued = false;
  private restartQueued = false;
  private stealthHeld = false;
  private pointerMoveHandler?: (event: PointerEvent) => void;
  private pointerUpHandler?: (event: PointerEvent) => void;

  constructor(private readonly scene: Phaser.Scene, settings: SettingsData) {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is required.");
    }

    this.keys = keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE,E,ENTER,Q,ESC,R") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;

    const root = document.getElementById("ui-controls-layer");
    if (!root) {
      throw new Error("Touch controls root not found.");
    }
    this.controlsRoot = root;
    this.setTouchVisibility(this.shouldUseTouch(settings));
  }

  getMovement(): Phaser.Math.Vector2 {
    const vector = new Phaser.Math.Vector2(0, 0);
    if (this.keys.A.isDown || this.keys.LEFT.isDown) {
      vector.x -= 1;
    }
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) {
      vector.x += 1;
    }
    if (this.keys.W.isDown || this.keys.UP.isDown) {
      vector.y -= 1;
    }
    if (this.keys.S.isDown || this.keys.DOWN.isDown) {
      vector.y += 1;
    }

    if (vector.lengthSq() > 0) {
      vector.normalize();
    }

    if (this.touchVector.lengthSq() > 0) {
      return this.touchVector.clone();
    }

    return vector;
  }

  consumeInteract(): boolean {
    const pressed =
      Phaser.Input.Keyboard.JustDown(this.keys.E) ||
      Phaser.Input.Keyboard.JustDown(this.keys.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.keys.ENTER) ||
      this.interactQueued;

    this.interactQueued = false;
    return pressed;
  }

  consumeEcho(): boolean {
    const pressed = Phaser.Input.Keyboard.JustDown(this.keys.Q) || this.echoQueued;
    this.echoQueued = false;
    return pressed;
  }

  consumePause(): boolean {
    const pressed = Phaser.Input.Keyboard.JustDown(this.keys.ESC) || this.pauseQueued;
    this.pauseQueued = false;
    return pressed;
  }

  consumeRestart(): boolean {
    const pressed = Phaser.Input.Keyboard.JustDown(this.keys.R) || this.restartQueued;
    this.restartQueued = false;
    return pressed;
  }

  isStealthHeld(): boolean {
    return this.keys.SHIFT.isDown || this.stealthHeld;
  }

  updateSettings(settings: SettingsData): void {
    this.setTouchVisibility(this.shouldUseTouch(settings));
  }

  destroy(): void {
    this.controlsRoot.innerHTML = "";
    if (this.pointerMoveHandler) {
      window.removeEventListener("pointermove", this.pointerMoveHandler);
    }
    if (this.pointerUpHandler) {
      window.removeEventListener("pointerup", this.pointerUpHandler);
      window.removeEventListener("pointercancel", this.pointerUpHandler);
    }
  }

  private shouldUseTouch(settings: SettingsData): boolean {
    if (settings.touchControls === "on") {
      return true;
    }
    if (settings.touchControls === "off") {
      return false;
    }
    return window.matchMedia("(pointer: coarse)").matches;
  }

  private setTouchVisibility(visible: boolean): void {
    if (visible === this.touchVisible) {
      return;
    }

    this.touchVisible = visible;
    this.controlsRoot.innerHTML = "";
    this.touchVector.set(0, 0);
    this.touchPointerId = null;

    if (!visible) {
      return;
    }

    const shell = document.createElement("div");
    shell.className = "touch-shell";

    const joystick = document.createElement("div");
    joystick.className = "touch-joystick";
    const knob = document.createElement("div");
    knob.className = "touch-joystick-knob";
    joystick.appendChild(knob);

    const actions = document.createElement("div");
    actions.className = "touch-actions";
    actions.append(
      this.makeButton("Hack", "primary", () => {
        this.interactQueued = true;
      }),
      this.makeButton("Echo", "secondary", () => {
        this.echoQueued = true;
      }),
      this.makeButton("Stealth", "", () => undefined, true),
      this.makeButton("Pause", "", () => {
        this.pauseQueued = true;
      })
    );

    const stealthButton = actions.children[2] as HTMLButtonElement;
    stealthButton.addEventListener("pointerdown", () => {
      this.stealthHeld = true;
    });
    const releaseStealth = () => {
      this.stealthHeld = false;
    };
    stealthButton.addEventListener("pointerup", releaseStealth);
    stealthButton.addEventListener("pointercancel", releaseStealth);
    stealthButton.addEventListener("pointerleave", releaseStealth);

    joystick.addEventListener("pointerdown", (event) => {
      this.touchPointerId = event.pointerId;
      this.touchOrigin.set(event.clientX, event.clientY);
      this.touchVector.set(0, 0);
      joystick.setPointerCapture(event.pointerId);
    });

    this.pointerMoveHandler = (event: PointerEvent) => {
      if (event.pointerId !== this.touchPointerId) {
        return;
      }

      const dx = event.clientX - this.touchOrigin.x;
      const dy = event.clientY - this.touchOrigin.y;
      const vector = new Phaser.Math.Vector2(dx, dy);
      const length = Math.min(vector.length(), TOUCH_JOYSTICK_RADIUS);
      if (length < TOUCH_DEAD_ZONE) {
        this.touchVector.set(0, 0);
        knob.style.transform = "translate(0px, 0px)";
        return;
      }

      vector.normalize().scale(length);
      knob.style.transform = `translate(${vector.x}px, ${vector.y}px)`;
      this.touchVector.set(vector.x / TOUCH_JOYSTICK_RADIUS, vector.y / TOUCH_JOYSTICK_RADIUS);
      if (this.touchVector.lengthSq() > 1) {
        this.touchVector.normalize();
      }
    };

    this.pointerUpHandler = (event: PointerEvent) => {
      if (event.pointerId !== this.touchPointerId) {
        return;
      }
      this.touchPointerId = null;
      this.touchVector.set(0, 0);
      knob.style.transform = "translate(0px, 0px)";
    };

    window.addEventListener("pointermove", this.pointerMoveHandler);
    window.addEventListener("pointerup", this.pointerUpHandler);
    window.addEventListener("pointercancel", this.pointerUpHandler);

    shell.append(joystick, actions);
    this.controlsRoot.appendChild(shell);
  }

  private makeButton(
    label: string,
    tone: string,
    onPress: () => void,
    hold = false
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `touch-button ${tone}`.trim();
    button.textContent = label;
    const handler = () => onPress();
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      handler();
    });

    if (!hold) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
      });
    }

    return button;
  }
}
