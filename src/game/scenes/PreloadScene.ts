import Phaser from "phaser";
import { COLORS, SCENE_KEYS } from "../constants";

export class PreloadScene extends Phaser.Scene {
  private redraw?: () => void;

  constructor() { super(SCENE_KEYS.PRELOAD); }

  create(): void {
    let glow: Phaser.GameObjects.Arc;
    let title: Phaser.GameObjects.Text;
    let subtitle: Phaser.GameObjects.Text;
    let barBack: Phaser.GameObjects.Rectangle;
    let fill: Phaser.GameObjects.Rectangle;
    const bw = 300;

    this.redraw = () => {
      const { width, height } = this.scale;
      this.cameras.main.setBackgroundColor("#060914");
      glow.setPosition(width/2, height*0.3);
      title.setPosition(width/2, height*0.22);
      subtitle.setPosition(width/2, height*0.3);
      barBack.setPosition(width/2, height*0.52);
      fill.setPosition(width/2 - bw/2, height*0.52);
    };

    glow = this.add.circle(0, 0, 100, COLORS.player, 0.07);
    this.tweens.add({ targets:glow, alpha:{from:0.04,to:0.14}, scale:{from:0.9,to:1.1}, duration:900, yoyo:true, repeat:-1 });

    title = this.add.text(0, 0, "ECHO HEIST", {
      fontFamily:"Chakra Petch,sans-serif", fontSize:"42px", color:"#eef8ff"
    }).setOrigin(0.5);

    subtitle = this.add.text(0, 0, "Initialising ghost threads...", {
      fontFamily:"Space Grotesk,sans-serif", fontSize:"16px", color:"#8ba5bf"
    }).setOrigin(0.5);

    barBack = this.add.rectangle(0, 0, bw, 12, 0xffffff, 0.06);
    fill = this.add.rectangle(0, 0, 0, 12, COLORS.player, 0.92).setOrigin(0, 0.5);
    this.redraw();
    this.scale.on("resize", this.redraw, this);

    const p = { v:0 };
    this.tweens.add({ targets:p, v:1, duration:720,
      onUpdate: () => { fill.displayWidth = bw * p.v; },
      onComplete: () => this.scene.start(SCENE_KEYS.MENU)
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.redraw) this.scale.off("resize", this.redraw, this);
      this.redraw = undefined;
    });
  }
}
