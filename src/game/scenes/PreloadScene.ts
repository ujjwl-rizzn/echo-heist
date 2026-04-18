import Phaser from "phaser";
import { COLORS, SCENE_KEYS } from "../constants";

export class PreloadScene extends Phaser.Scene {
  constructor() { super(SCENE_KEYS.PRELOAD); }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#060914");

    /* glow ring */
    const glow = this.add.circle(width/2, height*0.3, 100, COLORS.player, 0.07);
    this.tweens.add({ targets:glow, alpha:{from:0.04,to:0.14}, scale:{from:0.9,to:1.1}, duration:900, yoyo:true, repeat:-1 });

    this.add.text(width/2, height*0.22, "ECHO HEIST", {
      fontFamily:"Chakra Petch,sans-serif", fontSize:"42px", color:"#eef8ff"
    }).setOrigin(0.5);

    this.add.text(width/2, height*0.3, "Initialising ghost threads...", {
      fontFamily:"Space Grotesk,sans-serif", fontSize:"16px", color:"#8ba5bf"
    }).setOrigin(0.5);

    const bw = 300;
    this.add.rectangle(width/2, height*0.52, bw, 12, 0xffffff, 0.06);
    const fill = this.add.rectangle(width/2 - bw/2, height*0.52, 0, 12, COLORS.player, 0.92).setOrigin(0, 0.5);

    const p = { v:0 };
    this.tweens.add({ targets:p, v:1, duration:720,
      onUpdate: () => { fill.displayWidth = bw * p.v; },
      onComplete: () => this.scene.start(SCENE_KEYS.MENU)
    });
  }
}
