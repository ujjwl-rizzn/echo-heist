import Phaser from 'phaser';
import { GAMEPLAY } from '../constants';
import type { SkinDefinition } from '../types';

export interface PlayerStepResult {
  didDash: boolean;
  shotDirection: Phaser.Math.Vector2 | null;
}

export type DamageResult = 'ignored' | 'shielded' | 'hurt' | 'dead';

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  health = GAMEPLAY.playerMaxHealth;
  maxHealth = GAMEPLAY.playerMaxHealth;
  shieldCharges = 0;
  dashCharge = GAMEPLAY.dashChargeMax;

  private fireCooldownMs = 0;
  private invulnerabilityMs = 0;
  private dashTimeMs = 0;
  private magnetTimeMs = 0;
  private readonly dashVector = new Phaser.Math.Vector2(0, -1);
  private readonly lastDirection = new Phaser.Math.Vector2(0, -1);

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(60);
    this.setDisplaySize(46, 46);
    this.body.setCircle(18, 5, 5);
    this.body.setDamping(true);
    this.body.setDrag(0.001, 0.001);
    this.body.setMaxVelocity(GAMEPLAY.playerDashSpeed, GAMEPLAY.playerDashSpeed);
    this.body.setAllowGravity(false);
  }

  applySkin(skin: SkinDefinition): void {
    this.setTint(skin.accent, skin.secondary, skin.accent, skin.secondary);
  }

  resetState(x: number, y: number): void {
    this.setActive(true).setVisible(true);
    this.enableBody(false, x, y, true, true);
    this.health = GAMEPLAY.playerMaxHealth;
    this.shieldCharges = 0;
    this.dashCharge = GAMEPLAY.dashChargeMax;
    this.fireCooldownMs = 0;
    this.invulnerabilityMs = 0;
    this.dashTimeMs = 0;
    this.magnetTimeMs = 0;
    this.lastDirection.set(0, -1);
    this.dashVector.set(0, -1);
    this.setScale(1);
    this.setAlpha(1);
    this.body.setVelocity(0, 0);
  }

  step(
    dt: number,
    movement: Phaser.Math.Vector2,
    dashRequested: boolean,
    aimTarget: Phaser.Math.Vector2 | null,
  ): PlayerStepResult {
    this.fireCooldownMs = Math.max(0, this.fireCooldownMs - dt);
    this.invulnerabilityMs = Math.max(0, this.invulnerabilityMs - dt);
    this.magnetTimeMs = Math.max(0, this.magnetTimeMs - dt);
    this.dashCharge = Math.min(
      GAMEPLAY.dashChargeMax,
      this.dashCharge + GAMEPLAY.dashChargePassivePerSecond * (dt / 1000),
    );

    let didDash = false;
    if (dashRequested && !this.isDashing() && this.dashCharge >= GAMEPLAY.dashChargeMax) {
      this.startDash(movement.lengthSq() > 0 ? movement : this.lastDirection);
      didDash = true;
    }

    if (movement.lengthSq() > 0.0025) {
      this.lastDirection.copy(movement).normalize();
    }

    if (this.isDashing()) {
      this.dashTimeMs = Math.max(0, this.dashTimeMs - dt);
      this.body.setVelocity(
        this.dashVector.x * GAMEPLAY.playerDashSpeed,
        this.dashVector.y * GAMEPLAY.playerDashSpeed,
      );
    } else {
      const targetVelocityX = movement.x * GAMEPLAY.playerSpeed;
      const targetVelocityY = movement.y * GAMEPLAY.playerSpeed;
      const easing = 1 - Math.pow(0.002, dt / 1000);

      this.body.setVelocity(
        Phaser.Math.Linear(this.body.velocity.x, targetVelocityX, easing),
        Phaser.Math.Linear(this.body.velocity.y, targetVelocityY, easing),
      );
    }

    this.updateLook();

    let shotDirection: Phaser.Math.Vector2 | null = null;
    if (aimTarget && this.fireCooldownMs <= 0) {
      this.fireCooldownMs = GAMEPLAY.playerFireRateMs;
      shotDirection = aimTarget.clone().normalize();
    }

    return {
      didDash,
      shotDirection,
    };
  }

  addDashCharge(amount: number): void {
    this.dashCharge = Math.min(GAMEPLAY.dashChargeMax, this.dashCharge + amount);
  }

  activateMagnet(): void {
    this.magnetTimeMs = GAMEPLAY.magnetDurationMs;
  }

  hasMagnet(): boolean {
    return this.magnetTimeMs > 0;
  }

  isDashing(): boolean {
    return this.dashTimeMs > 0;
  }

  isInvulnerable(): boolean {
    return this.isDashing() || this.invulnerabilityMs > 0;
  }

  grantShield(charges = 1): void {
    this.shieldCharges += charges;
  }

  takeDamage(): DamageResult {
    if (this.isInvulnerable()) {
      return 'ignored';
    }

    this.invulnerabilityMs = GAMEPLAY.playerInvulnerabilityMs;

    if (this.shieldCharges > 0) {
      this.shieldCharges -= 1;
      return 'shielded';
    }

    this.health -= 1;
    if (this.health <= 0) {
      this.health = 0;
      return 'dead';
    }

    return 'hurt';
  }

  private startDash(direction: Phaser.Math.Vector2): void {
    const dashDirection = direction.lengthSq() > 0 ? direction.clone().normalize() : this.lastDirection.clone();

    this.dashVector.copy(dashDirection);
    this.lastDirection.copy(dashDirection);
    this.dashCharge = 0;
    this.dashTimeMs = GAMEPLAY.playerDashDurationMs;
    this.invulnerabilityMs = GAMEPLAY.playerDashDurationMs + 80;
  }

  private updateLook(): void {
    const moveAngle = this.body.velocity.lengthSq() > 50 ? this.body.velocity.angle() : this.lastDirection.angle();
    this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, moveAngle + Math.PI / 2, 0.18);

    if (this.isDashing()) {
      this.setScale(1.12);
      this.setAlpha(1);
      return;
    }

    const pulse = this.invulnerabilityMs > 0 ? (Math.sin(performance.now() * 0.04) + 1) * 0.2 + 0.6 : 1;
    this.setScale(1);
    this.setAlpha(pulse);
  }
}
